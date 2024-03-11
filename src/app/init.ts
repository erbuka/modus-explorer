import { JsonValidator } from "./json-validator.service";
import { ContextService } from './context.service';
import { ContentProviderService } from './content-provider.service';


export function initialize(contentProvider: ContentProviderService, context: ContextService, jsonValidator: JsonValidator): () => Promise<any> {

  return async () => {
    console.log("App initializer is running...");
  }
}