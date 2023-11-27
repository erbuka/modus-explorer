import { ItemBase, LocalizedText } from './item';

export type SlideShowItemMode = "normal" | "simple";  // Modalità normale/semplice

export type SlideShowItemSlideImage = {
  type: "image",
  image: string
}

export type SlideShowItemSlideItem = {
  type: "item",
  itemId: string
}

export type SlideShowItemSlideVideo = {
  type: "video",
  video: string
}

export type SlideShowItemSlide = {
  previewImage: string,       // Miniatura
  type: "image" | "item" | "video",
  title?: LocalizedText,      // Titolo
} & (SlideShowItemSlideImage | SlideShowItemSlideItem | SlideShowItemSlideVideo)

// Gruppo di slide
export type SlideShowItemGroup = {
  name: string;                 // Node univoco del gruppo
  title: LocalizedText;         // Titolo
  description?: LocalizedText;  // Descrizione
  slides: SlideShowItemSlide[]
}

// Schema slideshow
export interface SlideshowItem extends ItemBase {
  type: "slideshow",            // Tipo
  options: {                    // Opzioni  
    mode: SlideShowItemMode,   // Modalità, default "normal"
    itemWidth: string,          // Lunghezza blocchi
    itemAspectRatio: number     // Aspect ratio dei blocchi
  },
  groups: SlideShowItemGroup[], // Gruppi di slide
}