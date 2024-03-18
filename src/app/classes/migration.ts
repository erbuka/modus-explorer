import { Item } from "../types/item";
import { Config } from "../types/config";


type Patch<T> = {
  version: number,
  up: (item: T) => void
}

const ITEM_PATCHES: Patch<Item>[] = [
  {
    version: 1,
    up: (item: Item) => {
      if (item.type === "block-list") {
        for (const link of item.links) {
          if (link.itemId) {
            link.itemLink = {
              id: link.itemId,
              queryParams: {}
            }
          }
          delete link.itemId;
        }
      } else if (item.type === "deep-zoom") {
        for (const layer of item.layers) {
          if (layer.type === "vector") {
            for (const shape of layer.shapes) {
              if (shape.itemId) {
                shape.itemLink = {
                  id: shape.itemId,
                  queryParams: {}
                }
              }
              delete shape.itemId;
            }
          }
        }
      } else if (item.type === "slideshow") {
        for (const group of item.groups) {
          for (const slide of group.slides) {
            if (slide.itemId) {
              slide.itemLink = {
                id: slide.itemId,
                queryParams: {}
              }
            }
            delete slide.itemId;
          }
        }
      } else if (item.type === "3d") {
        if (item.pins) {
          for (let pin of item.pins) {
            if (pin.itemId) {
              pin.itemLink = {
                id: pin.itemId,
                queryParams: {}
              }
            }
            delete pin.itemId;
          }
        }

      }
    }
  }
].sort((a, b) => a.version - b.version);  // Sort migrations by version ascending

const LATEST_ITEM_VERSION = ITEM_PATCHES[ITEM_PATCHES.length - 1].version + 1;


const CONFIG_PATCHES: Patch<Config>[] = [
  {
    version: 1,
    up: (config: Config) => {

      config.entry = {
        id: config.entry as any,
        queryParams: {}
      }

      for (const link of config.headerLinks) {
        link.link = {
          id: link.itemId,
          queryParams: {}
        }
        delete link.itemId;
      }

    }
  }
].sort((a, b) => a.version - b.version);  // Sort migrations by version ascending
const LATEST_CONFIG_VERSION = CONFIG_PATCHES[CONFIG_PATCHES.length - 1].version + 1;


class Migration<T extends { version?: number }> {

  constructor(private latestVersion: number, private patches: Patch<T>[]) { }

  migrate(item: T) {
    if (item.version === undefined) {
      item.version = 1;
    }

    const initialVersion = item.version;

    for (const migration of this.patches) {
      if (item.version === migration.version) {
        migration.up(item);
        item.version++;
      }
    }

    return item.version > initialVersion;

  }

  isUpdated(item: T) { return item.version === this.latestVersion }
  getLatestVersion() { return this.latestVersion }
}

export const itemMigration = new Migration<Item>(LATEST_ITEM_VERSION, ITEM_PATCHES)
export const configMigration = new Migration<Config>(LATEST_CONFIG_VERSION, CONFIG_PATCHES)