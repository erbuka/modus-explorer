import { Component, OnInit, Input, EventEmitter, Output, ViewChild } from '@angular/core';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from 'rxjs';
import { Vector3 } from 'three';

let nextId: number = 1;

@Component({
  selector: 'app-vector-input',
  templateUrl: './vector-input.component.html',
  styleUrls: ['./vector-input.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: VectorInputComponent }]
})
export class VectorInputComponent implements OnInit, MatFormFieldControl<Vector3> {

  private _data: Vector3 = new Vector3()

  @Input() set data(v: Vector3) { this._data = v; }
  get data() { return this._data; }

  @Output() dataChange: EventEmitter<Vector3> = new EventEmitter();

  constructor() { }

  ngOnInit(): void { }

  updateData(coords: { x?: string, y?: string, z?: string }): void {
    for (let axis in coords)
      this.data[axis] = parseFloat(coords[axis]) || 0;
    this.dataChange.emit(this.data.clone());
    this.stateChanges.next();
  }

  // MatFormFieldControl
  get value() { return this.data; }
  set value(v: Vector3) {
    this.data = v.clone()
    this.stateChanges.next()
  }
  stateChanges: Subject<void> = new Subject();

  id = `vector-input-${nextId++}`
  placeholder: string;

  ngControl: NgControl | AbstractControlDirective = null;

  focused: boolean = false;
  empty: boolean = false;
  shouldLabelFloat: boolean = true;

  required: boolean = false;
  disabled: boolean = false;

  errorState: boolean = false;

  setDescribedByIds(ids: string[]): void { };
  onContainerClick(event: MouseEvent): void { }

}
