import { Directive, ElementRef, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { ContextService } from './context.service';


export type DroppedFile = {
  file: File;
  data: ArrayBuffer;
}

@Directive({
  selector: '[appFileDrop]'
})
export class FileDropDirective {
  constructor(private el: ElementRef, private context: ContextService) { }

  @Input() appFileDropMultiple: boolean | string = false;
  @Input() appFileDropFilter: RegExp | string = /^.*$/;
  @Output("appFileDrop") appFileDropEvent: EventEmitter<DroppedFile> = new EventEmitter();

  @HostListener("dragover", ["$event"])
  onDragOver(evt: DragEvent) {
    evt.preventDefault();
  }

  @HostListener("drop", ["$event"])
  onDrop(evt: DragEvent) {
    evt.preventDefault();

    let files = evt.dataTransfer.files;

    if (files.length > 0) {
      if (this.appFileDropMultiple && this.appFileDropMultiple !== "false") {
        for (let i = 0; i < files.length; i++)
          this.fireFileDrop(files[i]);
      } else {
        this.fireFileDrop(files[0]);
      }
    }
  }

  fireFileDrop(f: File) {

    let filter = typeof this.appFileDropFilter === "string" ? new RegExp(this.appFileDropFilter) : this.appFileDropFilter;

    if (filter.test(f.name)) {
      let reader = new FileReader();

      reader.addEventListener("load", (evt) => {
        this.appFileDropEvent.emit({
          file: f,
          data: reader.result as ArrayBuffer
        });
      });

      reader.readAsArrayBuffer(f)

    } else {
      this.context.raiseError("Invalid file type");
    }
  }
}
