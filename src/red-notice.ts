import { Notice } from 'obsidian';

export class RedNotice extends Notice {
  constructor(...args: ConstructorParameters<typeof Notice>) {
    super(...args);
    this.noticeEl.parentElement?.addClass('red-notice');
  }
}