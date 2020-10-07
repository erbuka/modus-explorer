import { ItemBase } from './item';

export interface PageItem extends ItemBase {
    type: "page";
    template: string;       // Nome del template da utilizzare
    data?: any;             // Dati da passare al template
}
