import { ButtonComponent, Modal, Setting, TFolder, requestUrl, Notice } from 'obsidian';
import { CTTKCPlugin } from './cttkc-plugin';
import { handleCalendarData } from './handle-calendar';
import { StatusCode } from './status';
import { FolderSuggest } from './folder-suggest';
import debugFactory from 'debug';
import { RedNotice } from './red-notice';

const debug = debugFactory('CTTKC:Modal');

export class CTTKCModal extends Modal {
	private plugin: CTTKCPlugin;
	private options: {
		calendarUrl: string;
		tasksPrefix: string;
		tasksDirectory: string;
		startDate: string;
		endDate: string;
		folder?: TFolder;
	};
	private statusSetting: Setting;
	private submitButton: ButtonComponent;

	constructor(plugin: CTTKCPlugin) {
		debug('Modal constructor is called');
		super(plugin.app);
		this.plugin = plugin;
	}

	private validateInputs() {
		debug('validateInputs() is called');
		if (!this.options.calendarUrl) {
			this.plugin.status.update(StatusCode.validationError, 'Calendar url is required');
		} else if (!this.options.tasksDirectory) {
			this.plugin.status.update(StatusCode.validationError, 'Tasks directory is required');
		} else if (!this.plugin.app.vault.getFolderByPath(this.options.tasksDirectory)) {
			this.plugin.status.update(StatusCode.validationError, 'Tasks directory is not correct dir path');
		} else if (!this.options.startDate) {
			this.plugin.status.update(StatusCode.validationError, 'Start date is required');
		} else if (!this.options.endDate) {
			this.plugin.status.update(StatusCode.validationError, 'End date is required');
		} else if (this.options.startDate >= this.options.endDate) {
			this.plugin.status.update(StatusCode.validationError, 'Start date should be earlier than end date');
		} else {
			const folder = this.plugin.app.vault.getFolderByPath(this.options.tasksDirectory);
			if (!folder) {
				this.plugin.status.update(StatusCode.validationError, 'Tasks directory is not correct dir path');
			} else if (!folder.children.length) {
				this.plugin.status.update(StatusCode.validationError, 'Tasks notes are not found');
			} else {
				this.options.folder = folder;
				this.plugin.status.update(StatusCode.ready, 'Ready to calculate');
			}
		}
	}

	// It have to be arrow func as it needs context and passed as arg by link
	private onStatusUpdate = (code: StatusCode, message: string) => {
		debug('onStatusUpdate() is called');
		this.statusSetting.setHeading().setName(message);
		if ([StatusCode.validationError, StatusCode.loadingData, StatusCode.processingData].includes(code)) {
			debug('onStatusUpdate() submit is disabled');
			this.submitButton.setDisabled(true);
		} else {
			debug('onStatusUpdate() submit is enabled');
			this.submitButton.setDisabled(false);
		}
	}

	onOpen() {
		debug('onOpen() is called');
		this.setTitle('CTTKC: calculate');

		this.options = {
			calendarUrl: this.plugin.settings.calendarUrl,
			tasksPrefix: this.plugin.settings.tasksPrefix,
			tasksDirectory: this.plugin.settings.tasksDirectory,
			startDate: '',
			endDate: ''
		};

		new Setting(this.contentEl)
			.setName('Calendar url')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your calendar url')
				.setValue(this.plugin.settings.calendarUrl)
				.onChange(async (value) => {
					this.options.calendarUrl = value;
					this.validateInputs();
				}));

		new Setting(this.contentEl)
			.setName('Tasks prefix')
			.addText(text => text
				.setPlaceholder('Enter your tasks prefix')
				.setValue(this.plugin.settings.tasksPrefix)
				.onChange(async (value) => {
					this.options.tasksPrefix = value;
					this.validateInputs();
				}));
		
		// Seems standart html file picker does not work well with directories
		new Setting(this.contentEl)
			.setName('Tasks directory')
			.addText((text) => {
				text
					.setPlaceholder('Choose your tasks directory')
					.setValue(this.plugin.settings.tasksDirectory);

				new FolderSuggest(this.app, text.inputEl)
					.onChange((value) => {
						this.options.tasksDirectory = value;
						this.validateInputs();
					});
			});
		
		new Setting(this.contentEl)
			.setClass('dates-buttons-cont')
			.addButton(btn => {
				btn.setButtonText('Today');
			})
			.addButton(btn => {
				btn.setButtonText('Yesterday');
			})
			.addButton(btn => {
				btn.setButtonText('Since Monday');
			});
			

		new Setting(this.contentEl)
			.setName('Start date')
			.addText(text => {
				text
					.setPlaceholder('Choose start date')
					.setValue('')
					.onChange(async (value) => {
						this.options.startDate = value;
						this.validateInputs();
					});
				text.inputEl.setAttribute('type', 'date');
			});

		new Setting(this.contentEl)
			.setName('End date')
			.addText(text => {
				text
					.setPlaceholder('Choose end date')
					.setValue('')
					.onChange(async (value) => {
						this.options.endDate = value;
						this.validateInputs();
					});
				text.inputEl.setAttribute('type', 'date');
			});

		this.statusSetting = new Setting(this.contentEl)
			.addButton((btn) => {
				this.submitButton = btn;
				btn
					.setButtonText('Submit')
					.setCta()
					.onClick(async () => {
						// this.close();
						debug('submit.onClick()', this.options);
						// onSubmit(name);
						this.plugin.status.update(StatusCode.loadingData, 'Loading...');
						let error, data = '';
						try {
							data = (await requestUrl(this.options.calendarUrl)).text;
						} catch(e) {
							error = e;
							this.plugin.status.update(StatusCode.error, 'Loading data failed');
							new RedNotice('Loading data failed');
						}
						
						if (!error) {
							this.plugin.status.update(StatusCode.processingData, 'Processing...');
							try {
								await handleCalendarData({
									plugin: this.plugin,
									data,
									...this.options,
									folder: this.options.folder as TFolder
								});
							} catch (e) {
								error = e;
								this.plugin.status.update(StatusCode.error, 'Processing data failed');
								new RedNotice('Processing data failed');
							}							
						}

						if (!error) {
							this.plugin.status.update(StatusCode.processed, 'Processed');
							new Notice('Tasks notes are successfully processed');
						} else {
							debug('submit.onClick() failed', error);
						}						
					});
			});

		this.plugin.status.addStatusUpdateListener(this.onStatusUpdate);

		this.validateInputs();
	}

	onClose() {
		debug('onClose() is called');

		this.plugin.status.removeStatusUpdateListener(this.onStatusUpdate);

		this.containerEl.empty();
	}
}