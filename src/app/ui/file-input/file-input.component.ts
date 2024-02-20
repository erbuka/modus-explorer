import { Component, OnInit, Input, Output, EventEmitter, HostBinding, ViewChild, TemplateRef } from '@angular/core';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { ContentProviderService, ModusOperandiContentProviderService, ModusOperandiFileProps, ModusOperandiImageSource } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { DroppedFile } from 'src/app/file-drop.directive';
import { Item } from 'src/app/types/item';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import getServer from 'src/server';
import { MatDialog } from '@angular/material/dialog';
import { ModusOperandiFileFilter, ModusOperandiFilePickerComponent } from './modus-operandi-file-picker/modus-operandi-file-picker.component';


type FileInputContentType = "image" | "video" | "unknown"

const MO_CONTENT_TYPE_FILTERS: { [key in FileInputContentType]?: ModusOperandiFileFilter } = {
  "image": file => file.type === "file" && !(file.deepZoom?.deepZoom) && ["jpg", "jpeg", "png"].includes(file.extension.toLowerCase()),
  "video": file => file.type === "file" && !(file.deepZoom?.deepZoom) && ["mp4"].includes(file.extension.toLowerCase()),
  "unknown": file => file.type === "file" && !(file.deepZoom?.deepZoom)
}

const CONTENT_TYPE_MAPPINGS: { [key in FileInputContentType]?: RegExp } = {
  "image": /^image\/.*$/,
  "video": /^video\/.*$/,
  "unknown": /^.*$/,
}

const EXT_TYPE_MAPPING: { [key: string]: FileInputContentType } = {
  "jpg": "image",
  "jpeg": "image",
  "png": "image",
  "mp4": "video",
}

function getTypeFromExtenstion(ext: string): FileInputContentType {
  return ext in EXT_TYPE_MAPPING ?
    EXT_TYPE_MAPPING[ext] : "unknown"
}

function getTypeFromMimeType(mimeType: string): FileInputContentType {
  mimeType = mimeType || "";
  for (let [key, regex] of Object.entries(CONTENT_TYPE_MAPPINGS)) {
    if (mimeType.match(regex))
      return key as FileInputContentType;
  }
  return "unknown";
}



@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: FileInputComponent }]
})
export class FileInputComponent implements OnInit, MatFormFieldControl<string> {

  static nextId = 1;

  @ViewChild("imageSourceDialogTmpl", { static: true, read: TemplateRef }) imageSourceDialogTmpl;

  @Input() item: Item;
  @Input() contentTypeFilter: FileInputContentType = "unknown"

  contentType: FileInputContentType = "unknown";
  isModusOperandi: boolean = false;



  @Input() set url(u: string) {
    this._url = u;
    if (this.url) {
      this.getContentType(this.url)
        .then(type => this.contentType = type)
        .catch(e => this.context.raiseError(e))
    }
  }

  get url() { return this._url }

  @Output() urlChange: EventEmitter<string> = new EventEmitter();

  private _url: string;

  constructor(private httpClient: HttpClient, private contentProvider: ContentProviderService, private context: ContextService, private dialog: MatDialog) {
    this.isModusOperandi = getServer().type === "modus-operandi";
  }

  async getContentType(url: string) {
    const resp = await fetch(url, { method: "get" })
    return getTypeFromMimeType(resp.headers.get("content-type"))
  }


  async chooseImageSource(): Promise<ModusOperandiImageSource> {

    return new Promise(resolve => {
      const ref = this.dialog.open(this.imageSourceDialogTmpl, {
        hasBackdrop: false,
        width: "256px",
        data: {
          value: "gallery"
        }
      })
      ref.afterClosed().subscribe({ next: result => resolve(result) })
    })

  }

  ngOnInit(): void { }

  onFileDrop(df: DroppedFile) {

    const extension = df.file.name.match(/^.*\.(.+)$/)

    const mapping = CONTENT_TYPE_MAPPINGS[this.contentTypeFilter]

    if(!df.file.type.match(mapping)) {
      this.context.raiseError(`Mime type not allowed: ${df.file.name}`)      
      return
    }

    this.context.startLoading()
    this.contentProvider.storeFile(df.data, extension ? extension[1] : "bin", this.item)
      .then(({ fileUrl }) => {
        this.urlChange.emit(fileUrl)
        this.stateChanges.next()
      })
      .catch(e => this.context.raiseError(e))
      .finally(() => this.context.stopLoading())
  }

  modusOperandiFilePicker() {
    const ref = this.dialog.open(ModusOperandiFilePickerComponent, {
      position: {
        top: "100px"
      },
      width: "90%",
      maxWidth: "1280px"
    })

    const instance = ref.componentInstance

    instance.fileFilter = MO_CONTENT_TYPE_FILTERS[this.contentTypeFilter]

    ref.afterClosed().subscribe({
      next: async (result: ModusOperandiFileProps[]) => {

        const moContentProvider = this.contentProvider as ModusOperandiContentProviderService 

        if (!result) return

        try {
          const file = result[0]
          const type = getTypeFromExtenstion(file.extension.toLowerCase())

          if (type === "image") {
            const sourceType = await this.chooseImageSource();
            const url = await moContentProvider.getImageUrl(file, sourceType)
            this.urlChange.emit(url)
          } else {
            const url = await moContentProvider.getFileUrl(file)
            this.urlChange.emit(url)
          }

          this.stateChanges.next()

        }
        catch (e) { }
      }
    })
  }


  // Interface MatFormFieldControl

  get value() { return this.url; }

  stateChanges = new Subject<void>()
  @HostBinding("id") id: string = `app-file-input-${FileInputComponent.nextId++}`

  placeholder: string = "";
  ngControl: NgControl | AbstractControlDirective = null;
  focused: boolean = false;

  get empty(): boolean { return !!this.url }
  shouldLabelFloat: boolean = true;
  required: boolean = false;
  disabled: boolean = false;
  errorState: boolean = false;

  setDescribedByIds(ids: string[]): void { }
  onContainerClick(event: MouseEvent): void { }

}
