import { LocalizedText } from './item';

export interface ConfigLocale {
	id: string;                     // "it", "en", ...
	flagIcon?: string;              // Link per icona bandiera 
	description: string;            // "Italiano", "English", ...
	translations?: { [key: string]: string } // Traduzioni testi statici

}

export interface Config {
	title: LocalizedText;           // Titolo applicazione
	backgroundImage: string;        // Immagine di sfondo
	entry: string;                  // Link alla homepage
	headerTemplate?: string;        // Template grafico per testata
	internationalization?: {        // Parametri internazionalizzazione
		defaultLocale: string,      // Lingua di default, es "it"
		locales: ConfigLocale[],     // Lingue disponibili
	}
}