import { Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from 'rxjs';
import { ContentProviderService, ItemRef } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';

@Component({
  selector: 'app-item-input',
  templateUrl: './item-input.component.html',
  styleUrls: ['./item-input.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: ItemInputComponent }]
})
export class ItemInputComponent implements OnInit, OnDestroy, MatFormFieldControl<string> {

  private _value: string;
  private get inputElement() { return this.filterInput.nativeElement as HTMLInputElement }

  @ViewChild("filterInput", { static: true, read: ElementRef }) filterInput: ElementRef;

  @Input() set value(itemId: string) {
    this._value = itemId;
    this.stateChanges.next();
  }
  get value() { 
    return this._value; 
  }
  @Output() valueChange: EventEmitter<string> = new EventEmitter();

  items: ItemRef[] = [];
  filteredItems: ItemRef[] = [];

  constructor(public context: ContextService, private contentProvider: ContentProviderService) { }

  get selectedItem(): ItemRef | "#INVALID_REF#" {
    if (!this.value)
      return null;
    const item = this.items.find(item => item.id === this.value);
    return item ? item : "#INVALID_REF#";
  }

  onOptionSelected(evt: MatAutocompleteSelectedEvent) {
    const itemId = evt.option.value;
    this.inputElement.value = "";
    this.valueChange.emit(itemId);
  }

  filterItems() {
    let str = this.inputElement.value.trim().toLowerCase();

    if (!str) {
      this.filteredItems = [...this.items];
      return;
    }

    this.filteredItems = this.items.filter(item => {
      const filterStr = `${item.id}-${this.context.translate(item.title || "")}`.toLowerCase();
      return filterStr.includes(str);
    })

  }

  ngOnInit(): void {
    this.contentProvider.listItems()
      .then(items => {
        this.items = items;
        console.log(items)
        this.filterItems();
      })
      .catch(e => this.context.raiseError(e));
  }

  ngOnDestroy(): void {
    this.stateChanges.complete();
  }

  // MatFormFieldControl
  static nextId = 0;

  stateChanges = new Subject<void>();
  @HostBinding() id = `item-input-${ItemInputComponent.nextId++}`;

  private _placeholder: string = "Search...";
  @Input() get placeholder() { return this._placeholder; }
  set placeholder(plh) {
    this._placeholder = plh;
    this.stateChanges.next();
  }

  ngControl = null;
  focused: false;
  get empty() { return !!this.value; }
  shouldLabelFloat = true;
  required: boolean = false;
  disabled: boolean = false;
  onContainerClick(event: MouseEvent): void { this.inputElement.focus(); }
  errorState: boolean = false;
  setDescribedByIds(ids: string[]): void { }

}
