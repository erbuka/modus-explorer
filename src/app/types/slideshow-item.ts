import { ItemBase, LocalizedText } from './item';

export type SlideShowItemMode = "normal" | "simple";  // Modalità normale/semplice

// Gruppo di slide
export interface SlideShowItemGroup {
  name: string;                 // Node univoco del gruppo
  title: LocalizedText;         // Titolo
  description?: LocalizedText;  // Descrizione
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
  slides: {                     // Slides
    group: string,              // Gruppo di appartenenza (deve concidere col campo "name" del gruppo)
    previewImage: string,       // Miniatura
    image?: string,             // Immagine
    title?: LocalizedText,      // Titolo
    itemId?: string,              // Link ad un altro elemento
    video?: string,             // Link a video
  }[]
}