import { Injectable, Inject } from '@angular/core';
import { Location, APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Item } from './types/item';
import { HttpClient } from '@angular/common/http';

export type LocationRoute = {
  path: string;
  params: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class LocationRouterService extends BehaviorSubject<LocationRoute> {

  constructor(private location: Location, @Inject(APP_BASE_HREF) private baseHref: string, @Inject(DOCUMENT) private document: Document) {
    super(null);
    this.location.onUrlChange((url, state) => this.update());
    this.update();
  }

  isRoot(): boolean {
    return this.value.path === this.baseHref;
  }

  back(): void {
    this.location.back();
  }

  navigate(uri: string, replace: boolean = false): void {
    
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
    this.next(this.parseLocation(this.location.path()));
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

  private parseLocation(uri: string): LocationRoute {

    let [path, queryString] = this.normalize(uri).split("?");

    let params = {};

    if (queryString) {
      for (let p of queryString.split("&")) {
        let [key, val] = p.split("=");
        params[key] = val;
      }
    }

    let result = {
      path: path,
      params: params
    }

    return result;

  }




}
