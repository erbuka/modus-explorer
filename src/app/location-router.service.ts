import { Injectable, Inject, Query } from '@angular/core';
import { Location, APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Item } from './types/item';
import { HttpClient } from '@angular/common/http';
import { StateData } from './classes/state';

type QueryParams = { [key: string]: any };

type LocationRoute = {
  url: string,
  path: string,
  queryString: string
}

@Injectable({
  providedIn: 'root'
})
export class LocationRouterService {
  url: BehaviorSubject<string> = new BehaviorSubject(null);
  path: BehaviorSubject<string> = new BehaviorSubject(null);
  queryString: BehaviorSubject<string> = new BehaviorSubject(null);
  queryParams: BehaviorSubject<QueryParams> = new BehaviorSubject(null);
  locked: boolean = false;

  constructor(private location: Location, @Inject(APP_BASE_HREF) private baseHref: string, @Inject(DOCUMENT) private document: Document) {
    this.location.onUrlChange((url, state) => this.update());
    this.update();
    console.log(`Base Href is '${baseHref}'`)
  }

  isRoot(): boolean {
    return this.path.value === this.baseHref;
  }

  getState(): StateData | null {
    let state = this.location.getState();
    return state || null;
  }

  saveState(data: StateData): void {
    this.location.replaceState(this.path.value, this.queryString.value, data);
    //console.log("LocationRouter.saveState()", this.location.getState());
  }

  back(): void {
    if(this.locked)
      return;

    this.location.back();
  }

  navigate(uri: string, replace: boolean = false): void {

    if(this.locked)
      return;

    uri = this.normalize(uri);

    if (this.isExternal(uri)) {
      this.document.location.href = uri;
    } else {
      replace ? this.location.replaceState(uri) : this.location.go(uri);
    }
  }

  normalize(uri: string): string {

    if (this.isExternal(uri)) {
      return uri;
    } else {
      return uri.startsWith(this.baseHref) ? uri : this.join(this.baseHref, uri);
    }

  }

  update() {
    let newLoc = this.parseLocation(this.location.path());

    if (newLoc.url !== this.url.value)
      this.url.next(newLoc.url);

    if (newLoc.path !== this.path.value)
      this.path.next(newLoc.path);

    if (newLoc.queryString !== this.queryString.value) {

      let queryString = newLoc.queryString;
      let params: QueryParams = {};

      for (let p of queryString.split("&")) {
        let [key, val] = p.split("=");
        params[key] = val;
      }

      this.queryString.next(newLoc.queryString);
      this.queryParams.next(params);

    }

  }

  join(...pieces: string[]): string {
    let result = "";
    for (let p of pieces)
      result = Location.joinWithSlash(result, p);
    return result;
  }

  isExternal(uri: string): boolean {
    return (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("blob:"));
  }

  isNormalized(uri: string): boolean {
    return uri.startsWith(this.baseHref);
  }

  resolve(uri: string, item: Item): string {
    if (this.isExternal(uri))
      return uri;


    if (uri.startsWith(".") || uri.startsWith("..")) {

      if (!this.isNormalized(item.uri)) {
        console.error("LocationRouterService.resolve(): item url must be normalized");
        return null;
      }

      let pieces = item.uri.split("/").filter(v => v.trim().length > 0);
      if (this.baseHref !== "/")
        pieces.shift();

      for (let p of uri.split("/").filter(v => v.trim().length > 0)) {
        switch (p) {
          case "..":
            pieces.pop();
            break;
          case ".":
            break;
          default:
            pieces.push(p);

        }
      }

      uri = this.join(...pieces);
    }

    return this.normalize(uri);

  }

  private parseLocation(url: string): LocationRoute {

    let [path, queryString] = this.normalize(url).split("?");

    let result = {
      url: url,
      path: path,
      queryString: queryString ? queryString : ""
    }

    return result;

  }




}
