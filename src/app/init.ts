import { HttpClient } from '@angular/common/http';
import { JsonValidator } from "./json-validator.service";
import { LocationRouterService } from "./location-router.service";
import { Config, ServerType } from './types/config';
import { ContextService, SS_LOCALE_ID_KEY } from './context.service';

const CONFIG_SCHEMA = require('./types/config-schema.json')
const SERVER_SCHEMA = require('./types/server-schema.json')

export function initialize( context: ContextService, httpClient: HttpClient, jsonValidator: JsonValidator): () => Promise<any> {

  return async () => {

    const server = await httpClient.get<ServerType>("assets/server.json").toPromise()

    if (!jsonValidator.validate(SERVER_SCHEMA, server)) {
      throw new Error(`Server file doesn't validate against the schema: ${JSON.stringify(jsonValidator.getErrors())}`);
    }

    const config = await httpClient.get<Config>("assets/config.json").toPromise();

    if (!jsonValidator.validate(CONFIG_SCHEMA, config)) {
      throw new Error("Config file doesn't validate against the schema");
    }

    console.log("Configuration loaded");

    context.server = server;
    context.config = config;

    if (config.internationalization) {
      try {
        context.setCurrentLocale(sessionStorage.getItem(SS_LOCALE_ID_KEY));
      }
      catch (e) {
        context.setCurrentLocale(config.internationalization.defaultLocale);
      }
    }
  }
}