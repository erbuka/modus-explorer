import { Injectable, TemplateRef, EventEmitter, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable, BehaviorSubject } from 'rxjs';

import { Item, LocalizedText } from './types/item';
import { LocationRouterService } from './location-router.service';
import { ConfigLocale, Config } from './types/config';
import { DOCUMENT } from '@angular/common';
import { JsonValidator } from './json-validator.service';

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

  _currentLocale: ConfigLocale;

  config: Config = null;

  templates: Map<string, TemplateRef<any>> = new Map();

  onModusOperandiLogin: EventEmitter<ModusOperandiLoginEvent> = new EventEmitter();
  onTextEdit: EventEmitter<TextEditEvent> = new EventEmitter();
  onFileChoose: EventEmitter<FileChooserEvent> = new EventEmitter();
  onError: EventEmitter<ErrorEvent> = new EventEmitter();

  constructor(private jsonValidator: JsonValidator, private httpClient: HttpClient, private router: LocationRouterService, @Inject(DOCUMENT) private document: Document) { }

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

  /**
   * @deprecated
   * @param uri 
   * @param handleError 
   * @returns 
   */
  /*
    getItem(uri: string, handleError: boolean = true): Observable<Item> {
  
      uri = this.router.normalize(uri);
  
      let obs = this.httpClient.get<any>(this.router.join(uri, "item.json"), {
        responseType: "json",
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
  
      obs = obs.pipe(tap((v: Item) => {
        let valid = this.jsonValidator.validate(ITEM_SCHEMA, v);
  
        if (!valid) {
          this.raiseError({
            description: `Some errors occured during schema validation (${uri}):<br> ${this.jsonValidator.getErrors().reduce((prev, e) => prev + `- JSON${e.dataPath} ${e.message}<br>`, "")
              }`
          })
        }
  
      }));
  
      if (handleError) {
        obs = obs.pipe(tap(x => x, e => {
          this.raiseError({ description: e.message })
        }));
      }
  
  
      obs = obs.pipe(
        map((x: Item) => {
          x.uri = uri;
          return x;
        })
      );
  
      return obs;
    }
  */
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

  raiseError(err: ErrorEvent): void {
    console.error(err);
    this.onError.emit(err);
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
