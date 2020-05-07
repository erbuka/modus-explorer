import { PageItem } from './page-item';
import { DeepZoomItem } from './deep-zoom-item';
import { BlockListItem } from './block-list-item';
import { SlideshowItem } from './slideshow-item';
import { ThreeViewerItem } from './three-viewer-item';

export interface ItemBase {
  type: string;
  uri?: string;
}

export type LocalizedText = string | { [locale: string]: string }

export type Item = PageItem | DeepZoomItem | BlockListItem | SlideshowItem | ThreeViewerItem;