import { App, ButtonComponent, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
import IcalExpander from 'ical-expander';

interface Settings {
	calendarUrl: string;
	tasksPrefix: string;
}

const DEFAULT_SETTINGS: Settings = {
	calendarUrl: '',
	tasksPrefix: ''
}

export default class CTTKCPlugin extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'CTTKC Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app.
		// Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('CTTKC');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'cttkc-open-calculate-modal',
			name: 'calculate',
			callback: () => {
				new CTTKCModal(this).open();
				// loadCalendar(this);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CTTKCModal extends Modal {
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
						await loadCalendar(plugin, this.options);
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

class SettingTab extends PluginSettingTab {
	plugin: CTTKCPlugin;

	constructor(app: App, plugin: CTTKCPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Calendar url')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your calendar url')
				.setValue(this.plugin.settings.calendarUrl)
				.onChange(async (value) => {
					this.plugin.settings.calendarUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Tasks prefix')
			.addText(text => text
				.setPlaceholder('Enter your tasks prefix')
				.setValue(this.plugin.settings.tasksPrefix)
				.onChange(async (value) => {
					this.plugin.settings.tasksPrefix = value;
					await this.plugin.saveSettings();
				}));
	}
}

async function loadCalendar(plugin: CTTKCPlugin, options: {
	calendarUrl: string;
	tasksPrefix: string;
	startDate: string;
	endDate: string;
}) {
	console.log('Started loading calendar');

	const taskPrefix = options.tasksPrefix;
	const calendarUrl = options.calendarUrl;
	if (!calendarUrl) {
		console.log('Calendar url have to be configured');
		return false;
	}

	const app = plugin.app;

	const folder = app.vault.getFolderByPath('tasks');
	if (!folder) {
		console.log('Folder is not found');
		return false;
	}
	if (!folder.children.length) {
		console.log('Tasks notes are not found');
		return false;
	}

	const data = (await requestUrl(calendarUrl)).text;
	const icalExpander: IcalExpander = await (new Promise((resolve) => { resolve(new IcalExpander({
		ics: data,
		maxIterations: 0
	})); }));
	const { events } = icalExpander.between(new Date(`${options.startDate}T00:00:00.000`), new Date(`${options.endDate}T00:00:00.000`));

	const eventAggData: {
		[key: string]: {
			duration: number;
		}
	} = {};
	events.forEach((event) => {
		if (event?.component?.jCal?.[0] !== 'vevent') {
			return false;
		}
		const propsArray = event?.component?.jCal?.[1];
		if (!Array.isArray(propsArray)) {
			return false;
		}
		const props: {
			start: string;
			end: string;
			summary: string;
		} = {} as typeof props;
		propsArray.forEach((prop) => {
			if (!Array.isArray(prop)) {
				return false;
			}
			if (prop[0] === 'dtstart') {
				props.start = prop[3]
			}
			if (prop[0] === 'dtend') {
				props.end = prop[3]
			}
			if (prop[0] === 'summary') {
				props.summary = prop[3]
			}
		});
		if (!props.summary || !props.start || !props.end) {
			return false;
		}
		const tokens = props.summary.split(/\s+/).filter((t) => t.startsWith(taskPrefix));
		tokens.forEach((t) => {
			eventAggData[t] = eventAggData[t] || {};
			const duration = (new Date(props.end)).getTime() - (new Date(props.start)).getTime();
			eventAggData[t].duration = (eventAggData[t].duration || 0) + duration;
		})
	});
	console.log('agg', JSON.stringify(eventAggData));

	folder.children.forEach((note: TFile) => {
		const data = eventAggData[`${taskPrefix}${note.basename}`];
		if (!data || !data.duration) {
			console.log(`No data found for ${note.basename}`);
			return false;
		}
		app.fileManager.processFrontMatter(note as TFile, (frontmatter) => {
			const totalMinutes = Math.floor(data.duration / 60000)
			const hours = Math.floor(totalMinutes / 60);
			const minutes = totalMinutes % 60;
			const hoursStr = hours ? `${hours}h ` : '';
			frontmatter.duration = `${hoursStr}${minutes}m`;
		});
		console.log(`${note.basename} is updated`);
	});
}