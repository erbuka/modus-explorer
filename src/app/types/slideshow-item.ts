import { ItemBase, LocalizedText } from './item';

export type SlideShowItemMode = "normal" | "simple";

export interface SlideShowItemGroup {
  name: string;
  title: LocalizedText;
  description?: LocalizedText;
}

export interface SlideshowItem extends ItemBase {
  type: "slideshow",
  options: {
    mode?: SlideShowItemMode,
    itemWidth: string,
    itemAspectRatio: number
  },
  groups: SlideShowItemGroup[],
  slides: {
    group: string,
    previewImage: string,
    image?: string,
    title?: LocalizedText,
    href?: string,
    video?: string,
  }[]
}