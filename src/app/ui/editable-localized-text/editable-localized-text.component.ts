import { Component, OnInit, Output, Input, EventEmitter, HostListener, HostBinding } from '@angular/core';
import { LocalizedText } from 'src/app/types/item';
import { ContextService } from 'src/app/context.service';
import { MatFormFieldControl } from '@angular/material/form-field';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { Observable, Subject } from 'rxjs';


@Component({
  selector: 'app-editable-localized-text',
  templateUrl: './editable-localized-text.component.html',
  styleUrls: ['./editable-localized-text.component.scss'],
  providers: [
    { provide: MatFormFieldControl, useExisting: EditableLocalizedTextComponent }
  ]
})
export class EditableLocalizedTextComponent implements OnInit, MatFormFieldControl<LocalizedText> {

  private static _nextId = 1;

  private _data: LocalizedText;

  @Input() set data(d: LocalizedText) { this._data = d || ""; }
  get data() { return this._data; }

  @Output() dataChange: EventEmitter<LocalizedText> = new EventEmitter();

  @Input() set multiline(v: string | boolean) {
    this._multiline = typeof v === "boolean" ? v : (v === "false" ? false : true);
  }

  private _multiline: boolean = false;

  stateChanges = new Subject<void>();

  set value(value: LocalizedText) {
    this.data = value;
    this.dataChange.emit(value);
    this.stateChanges.next();
  }

  get value(): LocalizedText { return this.data; }
  @HostBinding("id") id = `EditableLocalizedTextComponent-${EditableLocalizedTextComponent._nextId++}`

  constructor(private context: ContextService) { }


  placeholder = "Placeholder";
  ngControl: NgControl | AbstractControlDirective = null;
  focused = false;

  get empty() {
    if (typeof this.data === "string")
      return this.data.length > 0;
    else
      return this.data[this.context.getCurrentLocale().id].length > 0
  }

  shouldLabelFloat: boolean = true;
  required: boolean = false;
  disabled: boolean = false;
  errorState: boolean = false;

  setDescribedByIds(ids: string[]): void {
    //throw new Error('Method not implemented.');
  }
  onContainerClick(evt: MouseEvent): void {
    this.editText(evt);
  }

  ngOnInit(): void {
  }

  @HostListener("click", ["$event"])
  async editText(evt: MouseEvent): Promise<void> {
    evt.stopPropagation();
    try {
      let newText = await this.context.editText(this.data, this._multiline);
      this.dataChange.emit(newText);
    }
    catch (e) { }
  }


}
