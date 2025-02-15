import { AbstractInputSuggest, App, TFolder } from 'obsidian';
import debugFactory from 'debug';

const debug = debugFactory('CTTKC:FolderSuggest');

type OnChangeCb = (val: string) => void;

// https://forum.obsidian.md/t/how-to-make-file-location-selector-for-plugins-settings-page/95325/3
export class FolderSuggest extends AbstractInputSuggest<string> {
  private inputEl: HTMLInputElement;
  private path: string;
  private onChangeCbs: OnChangeCb[] = [];

  constructor(app: App, inputEl: HTMLInputElement) {
      debug('constructor is called');
      super(app, inputEl);
      this.inputEl = inputEl;
      this.path = this.getValue();

      this.onSelect((value) => {
        debug('onSelect() cb is called');
        this.setValue(value);
        this.path = value;
        this.inputEl.dispatchEvent(new Event('input'));
      });

      this.inputEl.addEventListener('input', (evt: InputEvent) => {
        debug('input eventListener is called');
        if (evt.inputType === 'insertText') {
            this.setValue(this.path);
        } else {
            this.path = this.getValue();
            this.onChangeCbs.forEach((cb) => {
                cb(this.path);
            })
        }
      });
  }

    getSuggestions(inputStr: string): string[] {
        debug('getSuggestions() is called', inputStr);
        if (inputStr === '') {
            inputStr = '/';
        }
        if (inputStr.length > 1 && inputStr.startsWith('/')) {
            inputStr = inputStr.slice(1);
        }

        const folder = this.app.vault.getFolderByPath(inputStr);
        if (folder && folder instanceof TFolder) {
            return folder.children.filter((c) => {
                return c instanceof TFolder;
            }).sort().map((f) => f.path);
        }
        return [];
    }

    renderSuggestion(path: string, el: HTMLElement): void {
        el.createEl("div", { text: path.split('/').slice(-1)[0] });
    }

    onChange(cb: OnChangeCb) {
        this.onChangeCbs.push(cb);
    }
}