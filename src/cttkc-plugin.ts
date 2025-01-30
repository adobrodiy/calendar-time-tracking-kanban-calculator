import { Notice, Plugin } from 'obsidian';
import { ISettings } from './settings.interface';
import { CTTKCModal } from './cttkc-modal';
import { SettingTab } from './setting-tab';

const DEFAULT_SETTINGS: ISettings = {
	calendarUrl: '',
	tasksPrefix: ''
}

export class CTTKCPlugin extends Plugin {
	settings: ISettings;

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