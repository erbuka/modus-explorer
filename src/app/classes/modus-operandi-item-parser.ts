import { Item, LocalizedText } from "../types/item";
import { BlockListItem } from "../types/block-list-item";
import { ModusOperandiServerType } from "../types/config";

export abstract class ModusOperandiItemParser {
  abstract parse(data): Promise<Item>;
}


export namespace V1 {

  type StringValues = LocalizedText[];
  type NumberValues = { value: string }[];
  type InternalValues = { id: string }[];
  type FileValues = {
    id: string,
    thumbnail: string,
    deepZoom: any
  }[]

  type FieldType = "string" | "internal" | "number" | "file" | "group"

  type FieldCommonProps = {
    id: string,
    title: string,
    type: FieldType,
    multiple?: boolean
  }

  type InternalField = FieldCommonProps & {
    type: "internal"
    values: InternalValues | InternalValues[]
  }

  type TextField = FieldCommonProps & {
    type: "string",
    values: StringValues | StringValues[]
  }

  type NumberField = FieldCommonProps & {
    type: "number",
    values: NumberValues | NumberValues[]
  }

  type FileField = FieldCommonProps & {
    type: "file",
    values: FileValues | FileValues[]
  }

  type GroupField = FieldCommonProps & {
    type: "group",
    values: ModusOperandiRecordField[]
  }

  type ModusOperandiRecordField = (TextField | GroupField | FileField | InternalField | NumberField)

  type ModusOperandiRecord = {
    type: "group",
    objectType: string,
    values: ModusOperandiRecordField[],
  }



  class ModusOperandiHelper {
    constructor(private record: ModusOperandiRecord | GroupField | TextField | FileField | InternalField | NumberField) { }

    get objectType() {
      return this.record['objectType'] || null;
    }

    get type() { return this.record.type; }

    value(idx: number = 0) {
      if (this.record.type !== "group") {
        return this.record.values[idx];
      }
      return null;
    }

    groupSize() {
      if (this.record.type === "group") return this.record.values.map(field => field.values.length).reduce((prev, curr) => prev > curr ? prev : curr, 0);
      else throw new Error(`Not a group`)
    }

    field(titleOrId: string) {
      if (this.record.type === "group") {
        const t = this.record.values.find(x => x.title === titleOrId || x.id === titleOrId)
        if (!t)
          throw new Error(`Cannot find field: ${titleOrId} in ${JSON.stringify(this.record)}`)
        return new ModusOperandiHelper(t);
      } else return null;
    }

  }

  function range(max: number) {
    return new Array(max).fill(null).map((_, i) => i)
  }



  export class Parser extends ModusOperandiItemParser {

    constructor(private serverType: ModusOperandiServerType) {
      super();
    }

    private parseField(o: any): ModusOperandiRecordField {

      const data: any[] = o.data;
      const values: any[] = o.values;

      const MAPPED_TYPES = new Map<string, FieldType>([
        ["text", "string"],
        ["string", "string"],
        ["richtext", "string"],
        ["number", "number"],
        ["group", "group"],
        ["file", "file"],
        ["internal", "internal"]
      ])

      if (o === null)
        return null

      if (!MAPPED_TYPES.has(o.type))
        throw new Error(`Undefined item type(${o.type}): ${JSON.stringify(o)}`)

      const ret: ModusOperandiRecordField = {
        id: o.id,
        type: MAPPED_TYPES.get(o.type), // TODO: review types
        title: o.title,
        multiple: o.validators?.multiple || false,
        values: o.type === "group" ?
          data[0].map(fieldData => this.parseField(fieldData)) :
          [...values]
      }

      if (ret.type === "group" && !ret.multiple) {
        // For groups that are not multiple, I want to coerce values
        ret.values.forEach(field => field.values = (field.values?.[0] as any) || null);
      }

      return ret;

    }

    private decodeObject(o: any): ModusOperandiRecord {
      const record: ModusOperandiRecord = {
        type: "group",
        objectType: o.data.modelType,
        values: o.data.fields.map(fieldData => this.parseField(fieldData))
      };
      return record;
    }

    async parse(data: any): Promise<Item> {
      const decoded = this.decodeObject(data);
      const helper = new ModusOperandiHelper(decoded);

      console.log(data);

      if (helper.objectType === "ME_BlockList") {

        /*
          Struttura: 
            {
              "Options" : {
                "ItemWidth *" : string
                "ItemAspectRatio *" : string
              },
              "Links" : {
                "Title": string,
                "Link" : internal,
                "Image" : file 
              }[]
            }
        */

        const options = helper.field("Options");
        const links = helper.field("Links");

        const result: BlockListItem = {
          type: "block-list",
          options: {
            itemWidth: options.field("ItemWidth *").value()['it'],
            itemAspectRatio: parseFloat(options.field("ItemAspectRatio *").value()['it'])
          },
          title: helper.field("object-title").value() as LocalizedText,
          links: range(links.groupSize()).map(idx => {
            return {
              href: links.field("Link").value(idx)?.[0]['id'],
              title: links.field("Title *").value(idx)[0],
              image: `${this.serverType.baseUrl}${links.field("Image").value(idx)?.[0]['thumbnail']}`
            };
          })
        }

        return result;
      }

    }
  }

}
