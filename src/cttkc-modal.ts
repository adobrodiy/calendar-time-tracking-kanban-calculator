import { ButtonComponent, Modal, Setting, TFolder, requestUrl, Notice } from 'obsidian';
import { CTTKCPlugin } from './cttkc-plugin';
import { handleCalendarData } from './handle-calendar';
import { StatusCode } from './status';
import { FolderSuggest } from './folder-suggest';
import debugFactory from 'debug';
import { RedNotice } from './red-notice';

const debug = debugFactory('CTTKC:Modal');

interface ICTTKCModalOptions {
	calendarUrl: string;
	tasksPrefix: string;
	tasksDirectory: string;
	startDate: string;
	endDate: string;
}

export class CTTKCModal extends Modal {
	private plugin: CTTKCPlugin;
	private options: ICTTKCModalOptions;
	private folder: TFolder;
	private statusSetting: Setting;
	private submitButton: ButtonComponent;
	private startDateSetting: Setting;
	private endDateSetting: Setting;

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
		} else if (this.options.startDate > this.options.endDate) {
			this.plugin.status.update(StatusCode.validationError, 'Start date should be earlier than end date');
		} else {
			const folder = this.plugin.app.vault.getFolderByPath(this.options.tasksDirectory);
			if (!folder) {
				this.plugin.status.update(StatusCode.validationError, 'Tasks directory is not correct dir path');
			} else if (!folder.children.length) {
				this.plugin.status.update(StatusCode.validationError, 'Tasks notes are not found');
			} else {
				this.folder = folder;
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

		let onChange: (prop: keyof ICTTKCModalOptions) => (value: string) => void;
		onChange = (prop) => (value) => {
			this.options[prop] = value;
			this.validateInputs()
		};

		new Setting(this.contentEl)
			.setName('Calendar url')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your calendar url')
				.setValue(this.plugin.settings.calendarUrl)
				.onChange(onChange('calendarUrl')));

		new Setting(this.contentEl)
			.setName('Tasks prefix')
			.addText(text => text
				.setPlaceholder('Enter your tasks prefix')
				.setValue(this.plugin.settings.tasksPrefix)
				.onChange(onChange('tasksPrefix')));
		
		// Seems standart html file picker does not work well with directories
		new Setting(this.contentEl)
			.setName('Tasks directory')
			.addText((text) => {
				text
					.setPlaceholder('Choose your tasks directory')
					.setValue(this.plugin.settings.tasksDirectory);

				new FolderSuggest(this.app, text.inputEl)
					.onChange(onChange('tasksDirectory'));
			});
		
		new Setting(this.contentEl)
			.setClass('dates-buttons-cont')
			.addButton(btn => {
				btn
					.setButtonText('Today')
					.onClick(this.onDatesBtnClick('today'));
			})
			.addButton(btn => {
				btn
					.setButtonText('Yesterday')
					.onClick(this.onDatesBtnClick('yesterday'));
			})
			.addButton(btn => {
				btn
					.setButtonText('Since Monday')
					.onClick(this.onDatesBtnClick('sinceMonday'));
			});
			

		this.startDateSetting = new Setting(this.contentEl)
			.setName('Start date')
			.addText(text => {
				text
					.setPlaceholder('Choose start date')
					.setValue('')
					.onChange(onChange('startDate'));
				text.inputEl.setAttribute('type', 'date');
				text.inputEl.setAttribute('id', 'cttkc-start-date-input');
			});

		this.endDateSetting = new Setting(this.contentEl)
			.setName('End date')
			.addText(text => {
				text
					.setPlaceholder('Choose end date')
					.setValue('')
					.onChange(onChange('endDate'));
				text.inputEl.setAttribute('type', 'date');
				text.inputEl.setAttribute('id', 'cttkc-end-date-input');
			});

		this.statusSetting = new Setting(this.contentEl)
			.addButton((btn) => {
				this.submitButton = btn;
				btn
					.setButtonText('Submit')
					.setCta()
					.onClick(() => this.submit());
			});

		this.plugin.status.addStatusUpdateListener(this.onStatusUpdate);

		this.validateInputs();
	}

	onClose() {
		debug('onClose() is called');

		this.plugin.status.removeStatusUpdateListener(this.onStatusUpdate);

		this.containerEl.empty();
	}

	private onDatesBtnClick(ctxDate: 'today'|'yesterday'|'sinceMonday') {
		return () => {
			debug('onDatesBtnClick() is called', ctxDate);
			const startDateInput: HTMLInputElement | null = this.startDateSetting?.controlEl.querySelector('input#cttkc-start-date-input') || null;
			const endDateInput: HTMLInputElement | null = this.endDateSetting?.controlEl.querySelector('input#cttkc-end-date-input') || null;
			let startDate: Date, endDate: Date;
			if (ctxDate === 'today') {
				startDate = new Date();
				endDate = startDate;
			} else if (ctxDate === 'yesterday') {
				startDate = new Date();
				startDate.setDate(startDate.getDate() - 1);
				endDate = startDate;
			} else if (ctxDate === 'sinceMonday') {
				startDate = new Date();
				while (startDate.getDay() !== 1) {
					startDate.setDate(startDate.getDate() - 1);
				}
				endDate = new Date();
			} else {
				debug('onDatesBtnClick() icorrect ctxDate', ctxDate);
				startDate = new Date();
				endDate = startDate;
				new RedNotice('Something went wrong');
			}
			const startYearStr = startDate.getFullYear();
			const startMonthStr = (1 + startDate.getMonth()).toString().padStart(2, '0');
			const startDateStr = startDate.getDate().toString().padStart(2, '0');
			const startStr = `${startYearStr}-${startMonthStr}-${startDateStr}`;
			const endYearStr = endDate.getFullYear();
			const endMonthStr = (1 + endDate.getMonth()).toString().padStart(2, '0');
			const endDateStr = endDate.getDate().toString().padStart(2, '0');
			const endStr = `${endYearStr}-${endMonthStr}-${endDateStr}`;
			if (startDateInput) {
				startDateInput.value = startStr;
				this.options['startDate'] = startStr;
			} else {
				debug('onDatesBtnClick() cannot find startDateInput', ctxDate);
				new RedNotice('Something went wrong');
			}
			if (endDateInput) {
				endDateInput.value = endStr;
				this.options['endDate'] = endStr;
			} else {
				debug('onDatesBtnClick() cannot find endDateInput', ctxDate);
				new RedNotice('Something went wrong');
			}
			if (startDateInput || endDateInput) {
				this.validateInputs();
			}
		};
	}

	private async submit() {
		debug('submit()', this.options);
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
					folder: this.folder as TFolder
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
			debug('submit() failed', error);
		}
	}
}