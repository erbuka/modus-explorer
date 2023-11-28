import { HttpClient } from '@angular/common/http';
import { JsonValidator } from "./json-validator.service";
import { LocationRouterService } from "./location-router.service";
import { Config } from './types/config';
import { ContextService, SS_LOCALE_ID_KEY } from './context.service';

const CONFIG_SCHEMA = require('./types/config-schema.json');

export function initialize(context: ContextService, router: LocationRouterService, httpClient: HttpClient, jsonValidator: JsonValidator): () => Promise<any> {

  return async () => {

    const config = await httpClient.get<Config>(router.normalize("assets/config.json")).toPromise();

    if (!jsonValidator.validate(CONFIG_SCHEMA, config)) {
      throw new Error("Config file doesn't validate against the schema");
    }

    context.config = config;

    if (config.internationalization) {
      try {
        context.setCurrentLocale(sessionStorage.getItem(SS_LOCALE_ID_KEY));
      }
      catch (e) {
        context.setCurrentLocale(context.config.internationalization.defaultLocale);
      }
    }
  }
}