import { PageItem } from './page-item';
import { DeepZoomItem } from './deep-zoom-item';
import { BlockListItem } from './block-list-item';
import { SlideshowItem } from './slideshow-item';
import { ThreeViewerItem } from './three-viewer-item';

export type ItemLink = {
  id:string;
  queryParams: { [key: string]: string };
}

export interface ItemBase {
  version?: number;
  type: string;
  title?: LocalizedText;
  id?: string;
}

export type LocalizedText = string | { [locale: string]: string }

export type Item = PageItem | DeepZoomItem | BlockListItem | SlideshowItem | ThreeViewerItem;