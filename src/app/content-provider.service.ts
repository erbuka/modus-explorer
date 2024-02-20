import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { Item, LocalizedText } from './types/item';

import { JsonValidator } from './json-validator.service';
import { ContextService, ITEM_SCHEMA } from './context.service';
import { Config, ModusOperandiServerType } from './types/config';
import { computeHash } from './classes/utility';
import { v4 as uuidv4 } from 'uuid';
import getServer from 'src/server';
import { Router } from '@angular/router';

export const SS_LOGIN_DATA_ID = "cn-mo-login-data";



export type ItemRef = {
  id: string,
  title?: LocalizedText
}

export abstract class ContentProviderService {

  async storeFile(data: ArrayBuffer, extension: string, item?: Item) {
    const hash = await computeHash(data);
    return this.putFile(`${hash}.${extension}`, data, item);
  }

  abstract saveConfig(config: Config): Promise<void>

  abstract getConfig(): Promise<Config>;

  abstract putFile(fileName: string, data: ArrayBuffer, item?: Item): Promise<{ fileUrl: string }>

  abstract listItems(): Promise<ItemRef[]>;
  abstract storeItem(item: Item): Promise<{ id: string }>;
  abstract getItem(id: string): Promise<Item>;

  static factory(context: ContextService, httpClient: HttpClient, jsonValidator: JsonValidator, router: Router): ContentProviderService {

    const type = getServer().type

    switch (type) {
      case 'local': return new LocalContentProviderService(jsonValidator, httpClient, context);
      case 'modus-operandi': return new ModusOperandiContentProviderService(context, httpClient, router);
      default: throw new Error(`Unsupported server type: ${type}`)
    }

  }
}

@Injectable()
export class LocalContentProviderService extends ContentProviderService {



  constructor(private jsonValidator: JsonValidator, private httpClient: HttpClient, private context: ContextService) {
    super();
  }

  async saveConfig(config: Config): Promise<void> {
    await this.httpClient.post<void>("/config", config).toPromise()
  }

  async getConfig(): Promise<Config> {
    return await this.httpClient.get<Config>("assets/config.json").toPromise();
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

export type ModusOperandiImageSource = "thumbnail" | "gallery" | "source"

export type ModusOperandiLoginData = {
  token: string,
  userId: string
}

export type ModusOperandiUserGroup = {
  id: string,
  name: string
}

export type ModusOperandiInfoFile = {
  mimeType: string,
  deepZoom?: {
    name: string,
    description: string,
    width: number,
    height: number,
    dpi: number,
    layers: {
      id: string,
      name: string,
      description: string,
      path: string,                         // ex "/root.{f}/{f}....", manca "https://{dominio}/content"
      width: number,
      height: number,
      dpi: number,
      overlap: number,
      tileSize: number,
      extension: "jpg" | "jpeg" | "png",
      index: number
    }[]
  }
}

export type ModusOperandiFileProps = {
  id: string,
  type: "folder" | "file" | "DeepZoomLink",
  name: string,
  extension: "string"
  deepZoom: any,
  thumbnail: string,
  view: string
}

@Injectable()
export class ModusOperandiContentProviderService extends ContentProviderService {

  private itemListNeedsUpdate: boolean = true
  private itemsList: ItemRef[]
  private server: ModusOperandiServerType

  constructor(private context: ContextService, private httpClient: HttpClient, private router: Router) {
    super();
    this.server = getServer() as ModusOperandiServerType;
  }


  async listGroups(): Promise<ModusOperandiUserGroup[]> {
    const loginData = await this.getLoginData()

    const url = this.getUrl(`/api/auth-service/users/profile/${loginData.userId}`)

    const userData = await this.httpClient.get<any>(url, {
      headers: {
        Authorization: loginData.token
      }
    }).toPromise()

    return Object.entries(userData.data.groups).map(([_, gdata]: [string, any]) => {
      return {
        id: gdata.id,
        name: gdata.name,
      }
    })

  }

  async login(username: string, password: string) {
    const data = new FormData();
    data.append("username", username.trim());
    data.append("password", password.trim());

    const loginData = await this.httpClient.post<ModusOperandiLoginData>(this.getUrl(`/api/auth-service/auth`), data, {
      headers: {
        'enctype': 'multipart/form-data'
      },
    }).toPromise();

    localStorage.setItem(SS_LOGIN_DATA_ID, JSON.stringify(loginData));

  }

  async getFileUrl(fileProps: ModusOperandiFileProps) {
    return this.getUrl(new URL(fileProps.view).pathname)
  }

  async getImageUrl(fileProps: ModusOperandiFileProps, sourceType: ModusOperandiImageSource) {
    switch (sourceType) {
      case "thumbnail": return this.getUrl(`/api/file-service/files/thumb/${fileProps.id}`)
      case "gallery": return this.getUrl(`/api/file-service/files/gallery/${fileProps.id}`)
      case "source": return this.getFileUrl(fileProps)
    }
  }

  async saveConfig(config: Config): Promise<void> {
    const data = new TextEncoder().encode(JSON.stringify(config))
    const result = await this.uploadFile(this.server.baseFolderId, "config.json", data)
  }

  async getConfig(): Promise<Config> {
    const files = await this.listFiles(this.server.baseFolderId, { name: "config" })

    if (files.length === 1) {
      const contents = new TextDecoder().decode(await this.downloadFile(files[0].id))
      return JSON.parse(contents)
    }

    throw new Error('Config not found')
  }

  async putFile(fileName: string, data: ArrayBuffer, item?: Item): Promise<{ fileUrl: string }> {
    const folder = await this.createOrGetFolder(this.server.baseFolderId, "files")
    const result = await this.uploadFile(folder.id, fileName, data)
    const fileInfo = await this.listFiles(folder.id, { name: result.name })
    return { fileUrl: this.getUrl(new URL(fileInfo[0].view).pathname) }
  }

  async listItems(): Promise<{ id: string; }[]> {

    if (this.itemListNeedsUpdate) {
      const itemsFolder = await this.createOrGetFolder(this.server.baseFolderId, "items")
      this.itemsList = await this.listFiles(itemsFolder.id)

      const decoder = new TextDecoder("utf-8")
      const promises = this.itemsList.map(item => {
        const promise = this.downloadFile(item.id)
        promise.then(data => {
          const itemData: Item = JSON.parse(decoder.decode(data))
          item.title = itemData.title
        })
        return promise
      })

      await Promise.all(promises)

      this.itemListNeedsUpdate = false

    }
    return [...this.itemsList]
  }

  async storeItem(item: Item): Promise<{ id: string; }> {

    if (item.id) {
      const fileContents = JSON.stringify(item);
      const result = await this.updateFile(item.id, new TextEncoder().encode(fileContents))

      console.log(`Update file with id ${result.id}`)
      this.itemListNeedsUpdate = true

      return { id: result.id }

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

  getUrl(path: string) {

    // Check the uri for common mistakes
    // 1. double slashes
    path = path.replace("//", "/")

    // Join the url with the server base
    let url = new URL(path, this.server.baseUrl)
    return url.href
  }

  async infoFile({ id }: { id: string }): Promise<ModusOperandiInfoFile> {
    const loginData = await this.getLoginData()
    const url = this.getUrl(`api/file-service/files/${id}`)

    const result = await this.httpClient.get<any>(url, {
      headers: {
        Authorization: loginData.token
      }
    }).toPromise()

    return result.data

  }

  async listFiles(parentId: string, options: { name?: string, group?: string } = {}): Promise<ModusOperandiFileProps[]> {
    /*
    https://modus.culturanuova.com/api/file-service/files?lang=it&folder={{baseFolder}}&name=items
    Authorization: {{token}}
    */

    const params = new URLSearchParams({
      folder: parentId,
    })

    if (options.group)
      params.append("group", options.group)

    const loginData = await this.getLoginData()
    const url = this.getUrl(`api/file-service/files?${params.toString()}`)

    this.context.startLoading()

    return new Promise<ModusOperandiFileProps[]>((resolve, reject) => {
      this.httpClient.get<any>(url, { headers: { Authorization: loginData.token } }).subscribe({
        next: value => {
          const result: ModusOperandiFileProps[] = options.name ? value.data.files.filter(f => f.name === options.name) : value.data.files

          result.forEach(file => {
            if (file.thumbnail)
              file.thumbnail = this.getUrl(file.thumbnail)
          })

          resolve(result)
        },
        error: e => reject(e)
      })
    }).finally(() => this.context.stopLoading())

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
    const files = await this.listFiles(parentId, { name })

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

    this.context.startLoading()

    return new Promise<ModusOperandiFileProps>((resolve, reject) => {
      this.httpClient.post<any>(url, data, {
        headers: {
          Authorization: loginData.token,
          "enc-type": "multipart/form-data"
        }
      }).subscribe({
        next: response => resolve(response.data.files[0]),
        error: e => reject(e)
      })
    }).finally(() => this.context.stopLoading())

  }

  private async uploadFile(parentId: string, name: string, contents: ArrayBuffer): Promise<ModusOperandiFileProps> {
    const loginData = await this.getLoginData()
    const url = this.getUrl(`api/file-service/files/uploads`)

    const data = new FormData()

    data.append("parent", parentId)
    data.append("file[]", new Blob([contents]), name)

    this.context.startLoading()

    return new Promise<ModusOperandiFileProps>((resolve, reject) => {
      this.httpClient.post<any>(url, data, {
        headers: {
          Authorization: loginData.token,
          "enc-type": "multipart/form-data"
        }
      }).subscribe({
        next: response => resolve(response.data.files[0]),
        error: e => reject(e)
      })
    }).finally(() => this.context.stopLoading())

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
    if (data) return data;
    else return { userId: "USER", token: "NOT_LOGGED" }
  }

}


