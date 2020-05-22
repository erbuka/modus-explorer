import { LocalizedText } from './item';

export interface ConfigLocale {
    id: string;
    flagIcon?: string;
    description: string;
}

export interface Config {
    title: LocalizedText;
    backgroundImage: string;
    entry: string;
    headerTemplate?: string;
    internationalization?: {
        defaultLocale: string,
        locales: ConfigLocale[]
    }
}