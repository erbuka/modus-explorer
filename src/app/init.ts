import { JsonValidator } from "./json-validator.service";
import { ContextService } from './context.service';
import { ContentProviderService } from './content-provider.service';
import { Config } from './types/config';

const CONFIG_SCHEMA = require('./types/config-schema.json')


export function initialize(contentProvider: ContentProviderService, context: ContextService, jsonValidator: JsonValidator): () => Promise<any> {

  return async () => {
/*
    console.log("Initializing...")

    try {
      const config = await contentProvider.getConfig()
      if (!jsonValidator.validate(CONFIG_SCHEMA, config)) {
        throw new Error("Config file doesn't validate against the schema");
      }
      await context.initialize(config)
    }
    catch (e) {
      await context.initialize(Object.assign({}, DEFAULT_CONFIG))
    }
*/
  }
}