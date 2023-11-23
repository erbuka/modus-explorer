import { Component, OnInit, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Observable } from 'rxjs';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { DroppedFile } from 'src/app/file-drop.directive';
import { Item } from 'src/app/types/item';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: FileInputComponent }]
})
export class FileInputComponent implements OnInit, MatFormFieldControl<string> {

  static nextId = 1;

  @Input() item: Item;
  @Input() url: string;
  @Output() urlChange: EventEmitter<string> = new EventEmitter();

  constructor(private contentProvider: ContentProviderService, private context: ContextService) { }



  ngOnInit(): void {
  }

  onFileDrop(df: DroppedFile) {
    this.contentProvider.storeFile(df.file.name, df.data, this.item)
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
