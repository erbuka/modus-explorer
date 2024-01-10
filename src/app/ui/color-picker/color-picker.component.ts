import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Observable, Subject } from 'rxjs';

let NEXT_ID = 0
const COLOR_HEX_REGEX = /^#?([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})$/;

function parseHexColor(str: string) {
  const matches = str.match(COLOR_HEX_REGEX)

  if (matches) {
    return {
      r: matches[1],
      g: matches[2],
      b: matches[3],
      a: matches[4]
    }
  } else {
    return {
      r: "00",
      g: "00",
      b: "00",
      a: "ff"
    }
  }

}


@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: ColorPickerComponent }],
})
export class ColorPickerComponent implements OnInit, MatFormFieldControl<string> {

  private _value: string;

  @Input() set value(v: string) {
    const color = parseHexColor(v)
    this._value = `#${color.r}${color.g}${color.b}${color.a}`
  };

  get value() { return this._value }

  @Output() valueChange: EventEmitter<string> = new EventEmitter()

  constructor() { }


  ngOnInit(): void {
  }

  onColorChange(colorStr: string) {
    const val = `${colorStr}${this.value.substring(this.value.length - 2)}`
    this.valueChange.emit(val)
  }

  onAlphaChange(value: number) {
    const val = `${this.colorValue}${(Math.floor(value * 255)).toString(16)}`
    this.valueChange.emit(val)
  }

  get alphaValue() { return parseInt(this.value.substring(this._value.length - 2), 16) / 255 }
  get colorValue() { return this.value.substring(0, 7) }


  // MatFormFieldControl
  stateChanges: Subject<void> = new Subject();
  
  id: string = `color-picker-${NEXT_ID++}`
  placeholder: string = null
  ngControl: NgControl | AbstractControlDirective = null;

  focused: boolean = false
  empty: boolean = false
  shouldLabelFloat: boolean = true
  required: boolean = false
  disabled: boolean = false
  errorState: boolean = false
  setDescribedByIds(ids: string[]): void {}
  onContainerClick(event: MouseEvent): void {}

}
