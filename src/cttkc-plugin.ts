import { Notice, Plugin } from 'obsidian';
import { ISettings } from './settings.interface';
import { CTTKCModal } from './cttkc-modal';
import { SettingTab } from './setting-tab';
import { Status } from './status';
import debugFactory from 'debug';

const debug = debugFactory('CTTKC:Plugin');

const DEFAULT_SETTINGS: ISettings = {
	calendarUrl: '',
	tasksPrefix: '',
	tasksDirectory: ''
}

export class CTTKCPlugin extends Plugin {
	settings: ISettings;
  status: Status;

	async onload() {
		debug('onload() is started');

    this.status = new Status((oldCode, newCode) => {
      // We can throw a error there to stop status transition
			debug(`Unexpected plugin status transition from ${oldCode} to ${newCode}. It can be an issue`);
    });

		debug('onload() loading settings...');
		await this.loadSettings();

		debug('onload() adding elements...')
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
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this));

		debug('onload() is finished');
	}

	async loadSettings() {
		debug('loadSettings() is called');
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		debug('saveSettings() is called');
		await this.saveData(this.settings);
	}
}