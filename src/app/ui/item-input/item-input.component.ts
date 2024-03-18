import { Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { NgControl, AbstractControlDirective } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from 'rxjs';
import { structuredClone } from 'src/app/classes/utility';
import { ContentProviderService, ItemRef } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { ItemLink } from 'src/app/types/item';

@Component({
  selector: 'app-item-input',
  templateUrl: './item-input.component.html',
  styleUrls: ['./item-input.component.scss'],
  providers: [{ provide: MatFormFieldControl, useExisting: ItemInputComponent }]
})
export class ItemInputComponent implements OnInit, OnDestroy, MatFormFieldControl<ItemLink> {

  private _value: ItemLink = { id: null, queryParams: {} }
  private get inputElement() { return this.filterInput.nativeElement as HTMLInputElement }

  @ViewChild("paramsEditor", { static: true, read: TemplateRef }) paramsEditor: TemplateRef<any>;
  @ViewChild("filterInput", { static: true, read: ElementRef }) filterInput: ElementRef;

  @Input() set value(link: ItemLink) {
    this._value = link ? structuredClone(link) : null;
    this.stateChanges.next()
  }

  get value() {
    return this._value;
  }

  @Output() valueChange: EventEmitter<ItemLink> = new EventEmitter();

  items: ItemRef[] = [];
  filteredItems: ItemRef[] = [];

  constructor(public context: ContextService, private contentProvider: ContentProviderService, private dialog: MatDialog) { }

  get selectedItem(): ItemRef | "#INVALID_REF#" {
    if (!this.value?.id)
      return null;
    const item = this.items.find(item => item.id === this.value.id);
    return item ? item : "#INVALID_REF#";
  }

  onOptionSelected(evt: MatAutocompleteSelectedEvent) {
    const itemId = evt.option.value;
    this.inputElement.value = "";
    this.valueChange.emit({
      id: itemId,
      queryParams: this.value?.queryParams || {}
    });
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

  addParam(params: { [key: string]: string }) {
    const key = `key${Object.entries(params).length + 1}`
    params[key] = "value";
  }

  editParams() {

    const paramsData = Object.entries(this.value?.queryParams || {}).map(([key, value]) => ({ key, value }));

    const dialogRef = this.dialog.open(this.paramsEditor, {
      data: paramsData,
      maxWidth: "80%",
      width: "512px"
    });

    dialogRef.afterClosed().subscribe((result: { key: string, value: string }[]) => {
      if (result) {
        this.valueChange.emit({
          id: this.value?.id,
          queryParams: paramsData.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
          }, {})
        });
      }
    });
  }

  ngOnInit(): void {
    this.contentProvider.listItems()
      .then(items => {
        this.items = items
        this.filterItems()
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
  onContainerClick(event: MouseEvent): void { }
  errorState: boolean = false;
  setDescribedByIds(ids: string[]): void { }

}
