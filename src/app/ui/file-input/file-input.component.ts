import { Component, OnInit, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { DroppedFile } from 'src/app/file-drop.directive';
import { Item } from 'src/app/types/item';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';


type FileInputContentType = "image" | "video" | "unknown"

const CONTENT_TYPE_MAPPINGS: { [key in FileInputContentType]?: RegExp } = {
  "image": /^image\/.*$/,
  "video": /^video\/.*$/,
}

function getFileInputContentType(contentType: string): FileInputContentType {
  contentType = contentType || "";
  for (let [key, regex] of Object.entries(CONTENT_TYPE_MAPPINGS)) {
    if (contentType.match(regex))
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

  @Input() item: Item;

  contentType: FileInputContentType = "unknown";

  private _url: string;

  @Input() set url(u: string) {
    this._url = u;
    if (this.url) {
      this.httpClient.head(this.url, { observe: "response" }).subscribe({
        next: resp => this.contentType = getFileInputContentType(resp.headers.get("content-type")),
        error: e => this.context.raiseError(e)
      })
    }
  }

  get url() { return this._url }

  @Output() urlChange: EventEmitter<string> = new EventEmitter();

  constructor(private httpClient: HttpClient, private contentProvider: ContentProviderService, private context: ContextService) { }



  ngOnInit(): void {
  }

  onFileDrop(df: DroppedFile) {
    const extension = df.file.name.split(".")[1];
    this.contentProvider.storeFile(df.data, extension, this.item)
      .then(({ fileUrl }) => {
        this.urlChange.emit(fileUrl)
        this.stateChanges.next()
      })
      .catch(e => this.context.raiseError(e));
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
