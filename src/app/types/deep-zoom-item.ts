import { ItemBase, LocalizedText } from './item';

export type DeepZoomItemLayerType = 'deep-image' | 'vector'

// Definizione di una figura geometrica generica
export interface DeepZoomItemShape {
  type: string;               // Tipo, "polygon"
  title?: LocalizedText;      // Titolo
  description?: LocalizedText; // Descrizione
  itemId?: string;              // Link al click
  drawAttributes: {           // Parametri per il rendering            
    stroke: boolean;        // Disegnare il bordo?
    fill: boolean;          // Riempiere l'interno?           
    strokeColor?: string;   // Colore CSS per bordo
    fillColor?: string;     // Colore CSS per interno
  }
}

// Definizione di un poligono
export interface DeepZoomItemPolygon extends DeepZoomItemShape {
  type: "polygon";
  points: [number, number][]; // Lista delle coordinate [x, y] che definiscono il poligono. 
}

// Layer generico deepzoom
export interface DeepZoomItemLayer {
  type: string;               // Tipo, "deep-image" o "vector"
  id: string;                 // Id univoco              
  minZoom?: number;           // Zoom minimo
  maxZoom?: number;           // Zoom massimo
  title?: LocalizedText;      // Titolo
  opacity?: number;           // Opacità, default 1.0
  opacityControl?: boolean;   // Visualizzare controllo opacità?      
  visible?: boolean;          // Il layer è visibile?          
  previewImage?: string;      // Miniatura
  color?: string;             // Colore miniatura
}

// Layer di tipo immagine
export interface DeepZoomItemDeepImageLayer extends DeepZoomItemLayer {
  type: "deep-image";
  imageFormat: "jpg" | "jpeg" | "png";        // Estenzione dei file delle immagini
  imageSrc: string;                           // Cartella sorgente da dove reperire le immagini
  width: number;                              // Larghezza in pixel
  height: number;                             // Altezza in pixel
  tileSize: number;                           // Dimensione dei tile
  tileOverlap: number;                        // Overlap dei tile
}

// Layer di vettoriale
export interface DeepZoomItemVectorLayer extends DeepZoomItemLayer {
  type: "vector";
  shapes: DeepZoomItemPolygon[]; // Lista delle figure geometriche
}

export type DeepZoomItemLayerGroup = {             // Raggruppamenti di layer
  id: string;               // Nome univoco del gruppo
  exclusive: boolean;       // Questo layer è esclusivo?
  title?: LocalizedText;    // Titolo del gruppo
  layers: string[]          // Lista dei nomi univoci dei layer         
}

// Elemento deepzoom
export interface DeepZoomItem extends ItemBase {
  type: "deep-zoom";
  options: {                      // Opzioni
    viewport: {                   // Definizione della viewport
      dpi: number,                // Dots-per-inch
      width: number,              // Lunghezza       
      height: number              // Altezza
    },
    disableMinimap?: boolean,   // Disabilita navigazione
    disableLayers?: boolean,    // Disabilita menu layout
    showLayers?: boolean,       // Menu layer aperto
    minimapImage?: string        // Miniatura per radar
  },
  layers: (DeepZoomItemDeepImageLayer | DeepZoomItemVectorLayer)[],   // Lista dei layer
  layerGroups?: DeepZoomItemLayerGroup[]
}

