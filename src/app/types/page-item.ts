import { ItemBase } from './item';

export interface PageItem extends ItemBase {
    type: "page";
    template: string;               // Nome del template da utilizzare
    internalData: object,
    modusOperandiRecordId?: string;     // Record di modus operandi associato 
    data?: any;                     // Dati da passare al template
}
