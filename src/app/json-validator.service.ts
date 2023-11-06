import { Injectable } from '@angular/core';
import * as ajv from 'ajv';
import { Ajv } from 'ajv';

@Injectable({
  providedIn: 'root'
})
export class JsonValidator {
  private validator: Ajv;

  constructor() {
    this.validator = new ajv();
  }
  
  validate(schema: string | object, data: any) {
    return this.validator.validate(schema, data);
  }

  getErrors() {
    return this.validator.errors;
  }

}