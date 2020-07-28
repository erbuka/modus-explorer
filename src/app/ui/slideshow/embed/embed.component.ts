import { Component, OnInit, SkipSelf, Input, forwardRef } from '@angular/core';
import { Item } from 'src/app/types/item';
import { State, StateData } from 'src/app/classes/state';

@Component({
  selector: 'app-embed',
  templateUrl: './embed.component.html',
  styleUrls: ['./embed.component.scss'],
  providers: [{ provide: State, useExisting: forwardRef(() => EmbedComponent) }]
})
export class EmbedComponent extends State implements OnInit {

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
