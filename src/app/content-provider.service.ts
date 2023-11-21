import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Item } from './types/item';

import { LocationRouterService } from './location-router.service';
import { JsonValidator } from './json-validator.service';
import { ContextService, ITEM_SCHEMA } from './context.service';
import { ModusOperandiServerType } from './types/config';
import { V1 } from './classes/modus-operandi-item-parser';

export const SS_LOGIN_DATA_ID = "cn-mo-login-data";

type ModusOperandiLoginData = {
  token: string,
  userId: string
}

export abstract class ContentProviderService {
  abstract getItem(uri: string): Promise<Item>;

  static factory(context: ContextService, router: LocationRouterService, httpClient: HttpClient, jsonValidator: JsonValidator): ContentProviderService {

    const type = context.config.serverType.type;

    switch (type) {
      case 'local': return new LocalContentProviderService(router, jsonValidator, httpClient, context);
      case 'modus-operandi': return new ModusOperandiContentProviderService(context, httpClient);
      default: throw new Error(`Unsupported server type: ${type}`)
    }

  }
}

@Injectable()
export class LocalContentProviderService extends ContentProviderService {

  constructor(private router: LocationRouterService, private jsonValidator: JsonValidator, private httpClient: HttpClient, private context: ContextService) {
    super();
  }

  async getItem(uri: string): Promise<Item> {

    uri = this.router.normalize(uri);

    let item = await this.httpClient.get<Item>(this.router.join(uri, "item.json"), {
      responseType: "json",
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).toPromise()

    let valid = this.jsonValidator.validate(ITEM_SCHEMA, item);

    if (!valid) {
      this.context.raiseError({
        description: `Some errors occured during schema validation (${uri}):<br> ${this.jsonValidator.getErrors().reduce((prev, e) => prev + `- JSON${e.dataPath} ${e.message}<br>`, "")
          }`
      })
    }

    item.uri = uri;
    return item;

  }
}



@Injectable()
export class ModusOperandiContentProviderService extends ContentProviderService {

  private server: ModusOperandiServerType;


  constructor(private context: ContextService, private httpClient: HttpClient) {
    super();
    this.server = context.config.serverType as ModusOperandiServerType;
  }

  private getUrl(uri: string) {
    return `${this.server.baseUrl}${uri}`
  }

  async doLogin(): Promise<void> {

    let done = false;

    while (!done) {
      const loginForm = await this.context.modusOperandiLogin();

      const data = new FormData();
      data.append("username", loginForm.username);
      data.append("password", loginForm.password);

      try {
        const loginData = await this.httpClient.post<ModusOperandiLoginData>(this.getUrl(`/api/auth-service/auth`), data, {
          headers: {
            'enctype': 'multipart/form-data'
          },
        }).toPromise();

        localStorage.setItem(SS_LOGIN_DATA_ID, JSON.stringify(loginData));

        done = true;
      }
      catch (e) {
        console.error(e.error)
      }
    }

  }


  async getItem(uri: string): Promise<Item> {

    const loginData: ModusOperandiLoginData = JSON.parse(localStorage.getItem(SS_LOGIN_DATA_ID)) || {
      token: "",
      userId: ""
    };

    try {
      const itemData = await this.httpClient.get<any>(this.getUrl(`/api/dataaccess-service/records/record/${uri}`), {
        headers: {
          "Authorization": loginData.token
        }
      }).toPromise();

      return new V1.Parser(this.server).parse(itemData);
    }
    catch (e) {
      if (e.status === 401) {
        await this.doLogin();
        return this.getItem(uri);
      }
      else throw e;
    }
  }
}

