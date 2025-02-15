// import { CTTKCPlugin } from './cttkc-plugin';
import debugFactory from 'debug';

const debug = debugFactory('CTTKC:Status');

export enum StatusCode {
  ready = 'ready',
  validationError = 'validationError',
  error = 'error',
  loadingData = 'loadingData',
  processingData = 'processingData',
  processed = 'processed'
}

interface IOnStatusUpdate {
  (code: StatusCode, message: string): void|Promise<void>;
}
interface IOnCheckUpdateFailure {
  (oldCode: StatusCode, newCode: StatusCode): void;
}

export class Status {
  private _code = StatusCode.ready;
  private _message = 'Ready';
  // private _plugin: CTTKCPlugin;
  private _onStatusUpdateListeners: IOnStatusUpdate[] = [];
  private _onCheckUpdateFailure: IOnCheckUpdateFailure;

  constructor(onCheckUpdateFailure: IOnCheckUpdateFailure) {
    debug('constructor is called');
    this._onCheckUpdateFailure = onCheckUpdateFailure;
  }

  update(code: StatusCode, message: string) {
    debug('update() is called', code, message);
    this.checkUpdate(code);
    this._code = code;
    this._message = message;
    Promise.all(
      this._onStatusUpdateListeners.map((listener) => listener(code, message))
    );
  }

  addStatusUpdateListener(listener: IOnStatusUpdate) {
    debug('addStatusUpdateListener() is called');
    this._onStatusUpdateListeners.push(listener);
  }

  removeStatusUpdateListener(listener: IOnStatusUpdate) {
    debug('removeStatusUpdateListener() is called');
    this._onStatusUpdateListeners = this._onStatusUpdateListeners.filter((l) => l !== listener);
  }

  get code(): StatusCode {
    return this._code;
  }

  get message(): string {
    return this._message;
  }

  private checkUpdate(code:StatusCode) {
    debug('checkUpdate() is called', code);
    if (
      // ready cannot have loadingData and processingData as prev statuses
      (code === StatusCode.ready && [StatusCode.loadingData, StatusCode.processingData].includes(this._code))
      // validationError cannot have loadingData and processingData as prev statuses
      || (code === StatusCode.validationError && [StatusCode.loadingData, StatusCode.processingData].includes(this._code))
      // error can have any previous status
      // loadingData cannot have validationError and processingData as prev statuses
      || (code === StatusCode.loadingData && [StatusCode.validationError, StatusCode.processingData].includes(this._code))
      // processingData can have only loadingData as previous status
      || (code === StatusCode.processingData && this._code !== StatusCode.loadingData)
      // processed can have only processingData as previous status
      || (code === StatusCode.processed && this._code !== StatusCode.processingData)
    ) {
      debug('checkUpdate() check is failed', code);
      this._onCheckUpdateFailure(this._code, code);
    }
  }
}