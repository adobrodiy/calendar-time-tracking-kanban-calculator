import { PluginSettingTab, Setting } from 'obsidian';
import { CTTKCPlugin } from './cttkc-plugin';
import { FolderSuggest } from './folder-suggest';
import debugFactory from 'debug';

const debug = debugFactory('CTTKC:SettingTab');

export class SettingTab extends PluginSettingTab {
  plugin: CTTKCPlugin;

  constructor(plugin: CTTKCPlugin) {
    debug('constructor is called');
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    debug('display() is called');
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

    new Setting(containerEl)
      .setName('Tasks directory')
      .addText((text) => {
        text
        .setPlaceholder('Choose your tasks directory')
        .setValue(this.plugin.settings.tasksDirectory);

        new FolderSuggest(this.app, text.inputEl)
          .onChange(async (value) => {
            this.plugin.settings.tasksDirectory = value;
            await this.plugin.saveSettings();
          });
      });    
  }
}