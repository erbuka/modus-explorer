import { Injectable, TemplateRef, EventEmitter, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable, BehaviorSubject } from 'rxjs';

import { Item, LocalizedText } from './types/item';
import { LocationRouterService } from './location-router.service';
import { ConfigLocale, Config, ServerType } from './types/config';
import { DOCUMENT } from '@angular/common';
import { JsonValidator } from './json-validator.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

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

  _currentLocale: ConfigLocale;

  server: ServerType = null;
  config: Config = null;

  templates: Map<string, TemplateRef<any>> = new Map();

  editorMode: BehaviorSubject<boolean> = new BehaviorSubject(false);

  onModusOperandiLogin: EventEmitter<ModusOperandiLoginEvent> = new EventEmitter();
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

  getLocales(): ConfigLocale[] {
    if (!this.config.internationalization)
      return [];

    return this.config.internationalization.locales;
  }

  setCurrentLocale(localeId: string, reload: boolean = false) {

    this._currentLocale = null;

    if (!this.config.internationalization)
      throw new Error("No locales have been configured");

    let loc = this.config.internationalization.locales.find(loc => loc.id === localeId);

    if (!loc)
      throw new Error(`Locale not found: ${localeId}`);

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

  modusOperandiLogin(): Promise<ModusOperandiLoginForm> {
    return new Promise<ModusOperandiLoginForm>((resolve, reject) => {
      this.onModusOperandiLogin.emit({
        confirm: (data: ModusOperandiLoginForm) => resolve(data)
      })
    })
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
