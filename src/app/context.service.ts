import { Injectable, TemplateRef, EventEmitter } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { LocalizedText } from './types/item';
import { ConfigLocale, Config, ServerType, ConfigLocaleId } from './types/config';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { getLocale } from './types/locales';

export const ITEM_SCHEMA = require('./types/item-schema.json');

export const SS_LOCALE_ID_KEY = "cn-locale-id";

export type FileChooserConfig = {
  accept: string,
  type: "arraybuffer",
}

export type FileChooserResult = {
  data: string | ArrayBuffer,
  file: File
};

export type FileChooserEvent = {
  config: FileChooserConfig,
  resolve: (data: FileChooserResult) => void,
  reject: () => void
}

export type ModusOperandiLoginForm = {
  username: string,
  password: string
}


export type ErrorEvent = {
  description: string;
}

export type ModusOperandiLoginEvent = {
  confirm: (data: ModusOperandiLoginForm) => void;
}

export type TextEditEvent = {
  text: LocalizedText;
  multiline: boolean;
  resolve: (data: LocalizedText) => void,
  reject: () => void
}

@Injectable({
  providedIn: 'root'
})
export class ContextService {

  private _editorMode: boolean = false;

  _loading = 0;
  _currentLocale: ConfigLocale;
  _locales: ConfigLocale[];

  config: Config = null;

  templates: Map<string, TemplateRef<any>> = new Map();

  editorMode: BehaviorSubject<boolean> = new BehaviorSubject(false);

  onTextEdit: EventEmitter<TextEditEvent> = new EventEmitter();
  onFileChoose: EventEmitter<FileChooserEvent> = new EventEmitter();
  onError: EventEmitter<ErrorEvent> = new EventEmitter();

  constructor(private router: Router, private snackBar: MatSnackBar) {


    // TODO: this is not correct: if only the query parameters change, this thing should not be reset.
    // Removed for now, and handled this on the main component
    /*
    this.router.events.subscribe({
      next: evt => {
        if (evt instanceof NavigationEnd) {
          this.editorSaveClick.next(null);
        }
      }
    });
    */
  }


  startLoading(): void { this._loading++ }
  stopLoading(): void { this._loading = Math.max(0, this._loading - 1) }

  get loading(): boolean { return this._loading > 0 }

  async initialize(config: Config) {
    this.config = config;
    this._locales = this.config.internationalization.locales.map(id => getLocale(id))
    try {
      this.setCurrentLocale(sessionStorage.getItem(SS_LOCALE_ID_KEY) as ConfigLocaleId);
    }
    catch (e) {
      this.setCurrentLocale(config.internationalization.defaultLocale);
    }
  }

  translate(text: LocalizedText) {
    let locale = this.getCurrentLocale();
    if (typeof text === "object" && locale) {
      let translation = text[locale.id];
      return translation ? translation : `Translation not found for locale "${locale.id}"`;
    } else if (typeof text === "string") {
      if (locale?.translations?.[text])
        return locale.translations[text];
      return text;
    } else {
      return `Invalid text type: ${typeof text}`;
    }
  }

  getLocales(): ConfigLocale[] { return this._locales }

  setCurrentLocale(localeId: ConfigLocaleId, reload: boolean = false) {

    this._currentLocale = null;
    let loc = getLocale(localeId)
    sessionStorage.setItem(SS_LOCALE_ID_KEY, loc.id);
    this._currentLocale = loc;

    if (reload)
      location.reload();

  }

  getCurrentLocale(): ConfigLocale {
    return this._currentLocale;
  }

  getTemplate(name: string): TemplateRef<any> {
    return this.templates.get(name);
  }

  registerTemplate(name: string, ref: TemplateRef<any>) {
    this.templates.set(name, ref);
  }


  editText(text: LocalizedText, multiline: boolean = false): Promise<LocalizedText> {
    let textCopy = typeof text === "string" ? text : Object.assign({}, text);

    return new Promise((resolve, reject) => {
      this.onTextEdit.emit({
        text: textCopy,
        multiline: multiline,
        resolve: resolve,
        reject: reject
      })
    });

  }

  fileChooser(config?: { type?: "arraybuffer", accept?: string }): Promise<FileChooserResult>;
  fileChooser(config?: Partial<FileChooserConfig>): Promise<FileChooserResult> {

    let cfg: FileChooserConfig = {
      type: "arraybuffer",
      accept: ".*"
    };


    if (config) {
      Object.assign(cfg, config);
    }

    return new Promise<FileChooserResult>((resolve, reject) => {
      this.onFileChoose.emit({
        config: cfg,
        resolve: resolve,
        reject: reject
      });
    });

  }

  raiseError(err: any): void {
    console.error(err);
    this.snackBar.open(`An error occurred. Check the console`, null, { panelClass: "text-danger" });
    //this.onError.emit(err);
  }

  assign<T, X, Y>(t: T, x: X, y: Y): T & X & Y;
  assign(t: any, ...sources: any): any {
    return Object.assign(t, ...sources.map(x =>
      Object.entries(x)
        .filter(([key, val]) => val !== undefined)
        .reduce((obj, [key, val]) => { obj[key] = val; return obj; }, {})
    ))
  };

}
