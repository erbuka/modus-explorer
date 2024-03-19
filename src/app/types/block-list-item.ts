import { ItemBase, ItemLink, LocalizedText } from './item';

export type BlockListItemLink = {                        // Lista dei link
    /**
     * @deprecated
     */
    itemId?: string,             // Percorso link      

    itemLink?: ItemLink,            // Percorso link

    title: LocalizedText,       // Titolo visualizzato
    image: string               // Percorso immagine
}

export interface BlockListItem extends ItemBase {
    type: "block-list";             // Tipo dell'elemento, sempre "block-list"
    options: {                      // Opzioni
        itemWidth: string,          // Lunghezza CSS dell'elemento (pixel, em, ...)
        itemAspectRatio: number     // Aspect ratio
    },
    links: BlockListItemLink[]
}