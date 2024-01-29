import { ConfigLocale, ConfigLocaleId } from "./config";

const IT: ConfigLocale = {
  id: "it",
  description: "Italiano",
  flagIcon: "assets/images/it.png",
  translations: {
    inches: "pollici",
    centimeters: "centimetri",
    layers: "livelli",
    back: "indietro",
    up: "su",
    home: "home"
  }
}

const EN: ConfigLocale = {
  "id": "en",
  "flagIcon": "assets/images/en.png",
  "description": "English"
}

export function getLocale(id: ConfigLocaleId) {
  switch (id) {
    case "it": return Object.assign({}, IT)
    case "en": return Object.assign({}, EN)
    default:
      throw new Error(`Locale not found: ${id}`)
  }
}