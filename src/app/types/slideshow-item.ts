import { ItemBase, ItemLink, LocalizedText } from './item';

export type SlideShowItemMode = "normal" | "simple";  // Modalità normale/semplice


export type SlideShowItemSlide = {
  previewImage: string,       // Miniatura
  type: "image" | "item" | "video",
  title?: LocalizedText,      // Titolo
  image?: string,
  video?: string,
  /** @deprecated */
  itemId?: string,
  itemLink?: ItemLink,      // Link a un altro item
}

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