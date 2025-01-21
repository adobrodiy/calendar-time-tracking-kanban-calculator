import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from 'obsidian';
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
			name: 'CTTKC: calculate',
			callback: () => {
				// new CTTKCModal(this.app).open();
				loadCalendar(this);
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
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
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

async function loadCalendar(plugin: CTTKCPlugin) {
	console.log('Started loading calendar');

	const taskPrefix = plugin.settings.tasksPrefix;
	const calendarUrl = plugin.settings.calendarUrl;
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
	// // const now = new Date();
	// // const weekAgo = new Date();
	// // weekAgo.setDate(weekAgo.getDate() - 7);
	const { events } = icalExpander.between(new Date('2024-12-23T00:00:00.000Z'), new Date('2024-12-29T00:00:00.000Z'));
	// const events = icalExpander.between(new Date('2024-12-23T00:00:00.000Z'), new Date('2024-12-29T00:00:00.000Z'));
	// console.log('events', events);

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