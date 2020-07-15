import { Component, OnInit, Input, forwardRef, SkipSelf } from '@angular/core';
import { Item } from 'src/app/types/item';
import { State, StateData } from 'src/app/classes/state';

@Component({
  selector: 'app-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.scss'],
  providers: [{ provide: State, useExisting: forwardRef(() => ItemComponent) }]
})
export class ItemComponent extends State implements OnInit {

  @Input() item: Item;

  constructor(@SkipSelf() private state: State) { super(); }

  saveState(data: StateData): void {
    this.state.saveState(data);
  }

  getState():StateData {
    return this.state.getState();
  }

  ngOnInit() {
  }

}
