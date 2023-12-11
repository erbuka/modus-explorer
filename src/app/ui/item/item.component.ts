import { Component, OnInit, Input, forwardRef, SkipSelf, ViewChild } from '@angular/core';
import { Item } from 'src/app/types/item';
import { State, StateData } from 'src/app/classes/state';


export interface ItemSave {
  save(): Promise<any>
}

@Component({
  selector: 'app-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.scss'],
  providers: [{ provide: State, useExisting: forwardRef(() => ItemComponent) }]
})
export class ItemComponent extends State implements OnInit, ItemSave {

  @ViewChild("concreteItem", { static: false }) concreteItem: ItemSave;

  @Input() item: Item;

  constructor(@SkipSelf() private state: State) { super(); }

  save() {
    //debugger
    return this.concreteItem.save()
  }

  saveState(data: StateData): void {
    this.state.saveState(data);
  }

  getState(): StateData {
    return this.state.getState();
  }

  ngOnInit() {
  }

}
