import { ItemBase, LocalizedText } from './item';

export interface SlideShowItemGroup {
  name: string;
  title: LocalizedText;
  description?: LocalizedText;
}

export interface SlideshowItem extends ItemBase {
  type: "slideshow",
  options: {
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