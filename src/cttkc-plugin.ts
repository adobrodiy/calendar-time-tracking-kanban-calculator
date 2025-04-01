import { Plugin } from 'obsidian';
import { ISettings } from './settings.interface';
import { CTTKCModal } from './cttkc-modal';
import { SettingTab } from './setting-tab';
import { Status, StatusCode } from './status';
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
	// This adds a status bar item to the bottom of the app.
	// Does not work on mobile apps.
	private _statusBar: HTMLElement;

	async onload() {
		debug('onload() is started');

		this.status = new Status();
		this.status.addStatusUpdateCheckFailureListener(this.onStatusUpdateCheckFailure);
		this.status.addStatusUpdateListener(this.onStatusUpdate);
		this._statusBar = this.addStatusBarItem();

		debug('onload() loading settings...');
		await this.loadSettings();

		debug('onload() adding elements...');

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

	onunload() {
		this.status.removeStatusUpdateCheckFailureListener(this.onStatusUpdateCheckFailure);
		this.status.removeStatusUpdateListener(this.onStatusUpdate);
	}

	async loadSettings() {
		debug('loadSettings() is called');
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		debug('saveSettings() is called');
		await this.saveData(this.settings);
	}

	// It have to be arrow func as it needs context and passed as arg by link
	private onStatusUpdateCheckFailure = async (oldCode: StatusCode, newCode: StatusCode) => {	
		// We can throw a error there to stop status transition
		debug(`Unexpected plugin status transition from ${oldCode} to ${newCode}. It can be an issue`);
	}

	// It have to be arrow func as it needs context and passed as arg by link
	private onStatusUpdate = async (code: StatusCode) => {
		debug(`onStatusUpdate() is called with code ${code}`);
		if (code === StatusCode.loadingData) {
			this._statusBar.setText('loading...');
		} else if (code === StatusCode.processingData) {
			this._statusBar.setText('processing...');
		} else if (code === StatusCode.error) {
			this._statusBar.setText('failed');
			setTimeout(() => {
				if (this._statusBar.getText() === 'failed') {
					this._statusBar?.setText('');
				}
			}, 3000);
		} else {
			this._statusBar.setText('');
		}
	}
}