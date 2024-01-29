import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Item, LocalizedText } from './types/item';

import { LocationRouterService } from './location-router.service';
import { JsonValidator } from './json-validator.service';
import { ContextService, ITEM_SCHEMA } from './context.service';
import { ModusOperandiServerType } from './types/config';
import { computeHash } from './classes/utility';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject, Subject } from 'rxjs';

export const SS_LOGIN_DATA_ID = "cn-mo-login-data";

type ModusOperandiLoginData = {
  token: string,
  userId: string
}

export type ItemRef = {
  id: string,
  title?: LocalizedText
}

export abstract class ContentProviderService {

  async storeFile(data: ArrayBuffer, extension: string, item?: Item) {
    const hash = await computeHash(data);
    return this.putFile(`${hash}.${extension}`, data, item);
  }

  abstract putFile(fileName: string, data: ArrayBuffer, item?: Item): Promise<{ fileUrl: string }>

  abstract listItems(): Promise<ItemRef[]>;
  abstract storeItem(item: Item): Promise<{ id: string }>;
  abstract getItem(id: string): Promise<Item>;

  /* TODO: remove router */
  static factory(context: ContextService, router: LocationRouterService, httpClient: HttpClient, jsonValidator: JsonValidator): ContentProviderService {

    const type = context.server.type;

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

  async putFile(fileName: string, data: ArrayBuffer, item?: Item): Promise<{ fileUrl: string }> {

    const formData = new FormData();

    formData.append("file", new Blob([data]), fileName);

    if (item)
      formData.append("itemId", item.id);

    return this.httpClient.post<{ fileUrl: string }>("/files", formData, {
      headers: {
        "enc-type": "multipart/form-data"
      }
    }).toPromise()
  }


  async listItems(): Promise<{ id: string; }[]> {
    return this.httpClient.get<{ id: string; }[]>("/items").toPromise();
  }

  async storeItem(item: Item): Promise<{ id: string; }> {
    return this.httpClient.post<{ id: string; }>("/items", item).toPromise();
  }

  async getItem(id: string): Promise<Item> {


    let item = await this.httpClient.get<Item>(`assets/items/${id}/item.json`, {
      responseType: "json",
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).toPromise()

    let valid = this.jsonValidator.validate(ITEM_SCHEMA, item);

    if (!valid) {
      this.context.raiseError(`Some errors occured during schema validation (${id}):<br> ${this.jsonValidator.getErrors().reduce((prev, e) => prev + `- JSON${e.dataPath} ${e.message}<br>`, "")}`)
    }

    item.id = id;
    return item;

  }
}


type ModusOperandiFileProps = {
  id: string,
  type: "folder" | "file",
  extension: "string"
  deepZoom: any,
  thumbnail: string,
  view: string
}

@Injectable()
export class ModusOperandiContentProviderService extends ContentProviderService {

  private itemListNeedsUpdate: boolean = true
  private itemsList: { id: string; }[]
  private server: ModusOperandiServerType

  constructor(private context: ContextService, private httpClient: HttpClient) {
    super();
    this.server = context.server as ModusOperandiServerType;
  }

  async putFile(fileName: string, data: ArrayBuffer, item?: Item): Promise<{ fileUrl: string }> {
    const folder = await this.createOrGetFolder(this.server.baseFolderId, "files")
    const result = await this.uploadFile(folder.id, fileName, data)
    return { fileUrl: result.view }
  }

  async listItems(): Promise<{ id: string; }[]> {

    if (this.itemListNeedsUpdate) {
      const itemsFolder = await this.createOrGetFolder(this.server.baseFolderId, "items")
      this.itemsList = await this.listFiles(itemsFolder.id)
      this.itemListNeedsUpdate = false
    }
    return [...this.itemsList]
  }

  async storeItem(item: Item): Promise<{ id: string; }> {

    if (item.id) {
      // TODO: Update file

      const fileContents = JSON.stringify(item);
      console.log(fileContents);
      const result = await this.updateFile(item.id, new TextEncoder().encode(fileContents))
      console.log(`Update file with id ${result.id}`)
    } else {
      const fileName = `${uuidv4()}.json`
      const itemsFolder = await this.createOrGetFolder(this.server.baseFolderId, "items")
      const fileResponse = await this.uploadFile(itemsFolder.id, fileName, new TextEncoder().encode(JSON.stringify(item)))

      this.itemListNeedsUpdate = true

      console.log(`Stored new item with id ${fileResponse.id}`)

      return { id: fileResponse.id }
    }


  }

  async getItem(id: string): Promise<Item> {
    const data = await this.downloadFile(id)
    const itemData: Item = JSON.parse(new TextDecoder("utf-8").decode(data))
    itemData.id = id
    return itemData
  }

  private getUrl(uri: string) {
    // TODO: join with slashes
    return `${this.server.baseUrl}${uri}`
  }

  private async listFiles(parentId: string, name?: string): Promise<ModusOperandiFileProps[]> {
    /*
    https://modus.culturanuova.com/api/file-service/files?lang=it&folder={{baseFolder}}&name=items
    Authorization: {{token}}
    */
    const params = new URLSearchParams({
      folder: parentId,
    })

    const loginData = await this.getLoginData()
    const url = this.getUrl(`api/file-service/files?${params.toString()}`)

    const response = await this.httpClient.get<any>(url, {
      headers: { Authorization: loginData.token }
    }).toPromise()

    return name ? response.data.files.filter(f => f.name === name) : response.data.files

    /*
    https://modus.culturanuova.com/api/file-service/files?lang=it&folder={{baseFolder}}&name=items
  */
  }

  private async createOrGetFolder(parentId: string, name: string): Promise<ModusOperandiFileProps> {
    // POST https://modus.culturanuova.com/api/file-service/files/createFolder
    // Content-Type: application/x-www-form-urlencoded; charset=UTF-8
    // Authorization: {{token}}
    // 
    // parent={{baseFolder}}&name=test

    const loginData = await this.getLoginData()


    // Check if the folder exists first
    const files = await this.listFiles(parentId, name)

    if (files.length > 0) {
      console.log(`Folder ${name} already exists under ${parentId}`)
      return files[0]
    }

    // Create the folder if it doesn't exist
    const url = this.getUrl(`api/file-service/files/createFolder`)

    const data = new FormData()
    data.append("parent", parentId)
    data.append("name", name)

    const response = await this.httpClient.post<any>(url, data, {
      headers: {
        Authorization: loginData.token
      }
    }).toPromise()

    console.log(`Created folder ${name} under ${parentId}`)

    return response.data.files[0]

  }

  private async updateFile(fileId: string, contents: ArrayBuffer): Promise<ModusOperandiFileProps> {

    /*
      POST https://modus.culturanuova.com/api/file-service/files/upload/{{id}}
      Authorization: {{token}}
    */

    const loginData = await this.getLoginData()
    const url = this.getUrl(`api/file-service/files/upload/${fileId}`)

    const data = new FormData()
    data.append("file", new Blob([contents]))

    const response = await this.httpClient.post<any>(url, data, {
      headers: {
        Authorization: loginData.token,
        "enc-type": "multipart/form-data"
      }
    }).toPromise()

    return response.data.files[0]
  }

  private async uploadFile(parentId: string, name: string, contents: ArrayBuffer): Promise<ModusOperandiFileProps> {
    const loginData = await this.getLoginData()
    const url = this.getUrl(`api/file-service/files/uploads`)

    const data = new FormData()

    data.append("parent", parentId)
    data.append("file[]", new Blob([contents]), name)

    const response = await this.httpClient.post<any>(url, data, {
      headers: {
        Authorization: loginData.token,
        "enc-type": "multipart/form-data"
      }
    }).toPromise()

    return response.data.files[0]

  }

  private async downloadFile(fileId: string) {
    const loginData = await this.getLoginData()
    const url = this.getUrl(`api/file-service/files/download/d/${fileId}`)
    return this.httpClient.get(url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: loginData.token,

      }
    }).toPromise()
  }

  private async getLoginData(): Promise<ModusOperandiLoginData> {

    let data = JSON.parse(localStorage.getItem(SS_LOGIN_DATA_ID))
    if (data)
      return data;

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

        return loginData
      }
      catch (e) {
        console.error(e.error)
      }
    }

  }

}


