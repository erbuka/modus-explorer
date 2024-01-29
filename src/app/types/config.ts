import { LocalizedText } from './item';

export interface ConfigLocale {
	id: ConfigLocaleId;                     			// "it", "en", ...
	flagIcon?: string;              							// Link per icona bandiera 
	description: string;            							// "Italiano", "English", ...
	translations?: { [key: string]: string } 			// Traduzioni testi statici	
}

export type LocalServerType = { type: "local" }

export type ModusOperandiServerType = {
	type: "modus-operandi",
	baseUrl: string,
}

export type ServerType = LocalServerType | ModusOperandiServerType;

export type ConfigLocaleId = "it" | "en"

export interface Config {
	title: LocalizedText;           // Titolo applicazione
	backgroundImage?: string;        // Immagine di sfondo
	entry: string;                  // Link alla homepage
	headerTemplate?: string;        // Template grafico per testata
	headerLinks?: {
		title: LocalizedText,
		itemId: string
	}[]
	internationalization: {        					// Parametri internazionalizzazione
		defaultLocale: ConfigLocaleId,      	// Lingua di default, es "it"
		locales: ConfigLocaleId[],     					// Lingue disponibili
	}
}