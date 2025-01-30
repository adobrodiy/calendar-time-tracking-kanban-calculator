import { ButtonComponent, Modal, Setting } from 'obsidian';
import { CTTKCPlugin } from './cttkc-plugin';
import { handleCalendar } from './handle-calendar';

export class CTTKCModal extends Modal {
	private plugin: CTTKCPlugin;
	private options: {
		calendarUrl: string;
		tasksPrefix: string;
		startDate: string;
		endDate: string;
	};
	private status: {
		code: string;
		message: string;
	};
	private statusSetting: Setting;
	private submitButton: ButtonComponent;

	constructor(plugin: CTTKCPlugin) {
		super(plugin.app);
		this.plugin = plugin;

		this.setTitle('CTTKC: calculate');

		this.options = {
			calendarUrl: plugin.settings.calendarUrl,
			tasksPrefix: plugin.settings.tasksPrefix,
			startDate: '',
			endDate: ''
		};

		new Setting(this.contentEl)
			.setName('Calendar url')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your calendar url')
				.setValue(plugin.settings.calendarUrl)
				.onChange(async (value) => {
					this.options.calendarUrl = value;
					this.validateInputs();
					this.updateStatus();
				}));

		new Setting(this.contentEl)
			.setName('Tasks prefix')
			.addText(text => text
				.setPlaceholder('Enter your tasks prefix')
				.setValue(plugin.settings.tasksPrefix)
				.onChange(async (value) => {
					this.options.tasksPrefix = value;
					this.validateInputs();
					this.updateStatus();
				}));

		new Setting(this.contentEl)
			.setName('Start date')
			.addText(text => {
				text
					.setPlaceholder('Choose start date')
					.setValue('')
					.onChange(async (value) => {
						this.options.startDate = value;
						console.log('options', this.options);
						this.validateInputs();
						this.updateStatus();
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
						console.log('options', this.options);
						this.validateInputs();
						this.updateStatus();
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
						console.log('options', this.options);
						// onSubmit(name);
						this.status = {
							code: 'loading',
							message: 'Loading...'
						};
						this.updateStatus();
						await handleCalendar(plugin, this.options);
						this.status = {
							code: 'loaded',
							message: 'Loaded'
						};
						this.updateStatus();
					});
			});

		this.validateInputs();
		this.updateStatus();
	}

	private validateInputs() {
		if (!this.options.calendarUrl) {
			this.status = {
				code: 'error',
				message: 'Calendar url is required'
			};
		} else if (!this.options.startDate) {
			this.status = {
				code: 'error',
				message: 'Start date is required'
			};
		} else if (!this.options.endDate) {
			this.status = {
				code: 'error',
				message: 'End date is required'
			};
		} else if (this.options.startDate >= this.options.endDate) {
			this.status = {
				code: 'error',
				message: 'Start date should be earlier than end date'
			};
		} else {
			this.status = {
				code: 'ok',
				message: 'Ready to calculate'
			};
		}
	}
	private updateStatus() {
		this.statusSetting.setHeading().setName(this.status.message);
		if (['error', 'loading'].includes(this.status.code)) {
			this.submitButton.setDisabled(true);
		} else if (['ok', 'loaded'].includes(this.status.code)) {
			this.submitButton.setDisabled(false);
		}
		
	}

	onOpen() {
		const {contentEl} = this;
		// contentEl.setText('Woah!');

		console.log('Modal opened');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();

		console.log('Modal closed');
	}
}