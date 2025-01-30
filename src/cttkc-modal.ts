import { ButtonComponent, Modal, Setting } from 'obsidian';
import { CTTKCPlugin } from './cttkc-plugin';
import { handleCalendar } from './handle-calendar';
import { StatusCode } from './status';

export class CTTKCModal extends Modal {
	private plugin: CTTKCPlugin;
	private options: {
		calendarUrl: string;
		tasksPrefix: string;
		startDate: string;
		endDate: string;
	};
	private statusSetting: Setting;
	private submitButton: ButtonComponent;

	constructor(plugin: CTTKCPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	private validateInputs() {
		if (!this.options.calendarUrl) {
			this.plugin.status.update(StatusCode.validationError, 'Calendar url is required');
		} else if (!this.options.startDate) {
			this.plugin.status.update(StatusCode.validationError, 'Start date is required');
		} else if (!this.options.endDate) {
			this.plugin.status.update(StatusCode.validationError, 'End date is required');
		} else if (this.options.startDate >= this.options.endDate) {
			this.plugin.status.update(StatusCode.validationError, 'Start date should be earlier than end date');
		} else {
			this.plugin.status.update(StatusCode.ready, 'Ready to calculate');
		}
	}

	// It have to be arrow func as it needs context and passed as arg by link
	private onStatusUpdate = (code: StatusCode, message: string) => {
		this.statusSetting.setHeading().setName(message);
		if ([StatusCode.validationError, StatusCode.loadingData, StatusCode.processingData].includes(code)) {
			this.submitButton.setDisabled(true);
		} else {
			this.submitButton.setDisabled(false);
		}
	}

	onOpen() {
		this.setTitle('CTTKC: calculate');

		this.options = {
			calendarUrl: this.plugin.settings.calendarUrl,
			tasksPrefix: this.plugin.settings.tasksPrefix,
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
						this.plugin.status.update(StatusCode.loadingData, 'Loading...');
						this.plugin.status.update(StatusCode.processingData, 'Processing...');
						await handleCalendar(this.plugin, this.options);
						this.plugin.status.update(StatusCode.processed, 'Processed');
					});
			});

		this.plugin.status.addStatusUpdateListener(this.onStatusUpdate);

		this.validateInputs();
	}

	onClose() {
		this.plugin.status.removeStatusUpdateListener(this.onStatusUpdate);

		this.containerEl.empty();

		console.log('Modal closed');
	}
}