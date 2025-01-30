import { App, PluginSettingTab, Setting} from 'obsidian';
import { CTTKCPlugin } from './cttkc-plugin';

export class SettingTab extends PluginSettingTab {
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