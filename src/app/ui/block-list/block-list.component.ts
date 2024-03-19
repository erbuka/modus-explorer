import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, Input, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { BlockListItem, BlockListItemLink } from 'src/app/types/block-list-item';
import { ItemSave } from '../item/item.component';
import { skip } from 'rxjs/operators';
import { Subscription } from 'rxjs';


type BlockListEditorMode = {
  selectedLink: BlockListItemLink,
  items: Promise<{ id: string }[]>
}

@Component({
  selector: 'app-block-list',
  templateUrl: './block-list.component.html',
  styleUrls: ['./block-list.component.scss']
})
export class BlockListComponent implements OnInit, OnDestroy, ItemSave {

  editorMode: BlockListEditorMode = {
    selectedLink: null,
    items: null
  }

  private _subscription: Subscription;

  @ViewChild("editBlockDialogTmpl", { static: true, read: TemplateRef }) editBlockDialogTmpl: TemplateRef<any>;

  @Input() item: BlockListItem = null;

  constructor(public context: ContextService, private contentProvider: ContentProviderService) { }


  ngOnInit() {
    //this.context.editorSaveClick.next(() => this.saveItem())

    this._subscription = this.context.editorMode.pipe(skip(1)).subscribe({
      next: value => {
        if (value === false)
          this.editorMode.selectedLink = null
      }
    })

  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe()
  }

  save() {
    return this.contentProvider.storeItem(this.item);
  }


  deleteLink(idx: number) {
    const link = this.item.links[idx];
    this.item.links.splice(idx, 1);

    if (this.editorMode.selectedLink === link)
      this.editorMode.selectedLink = null;

  }


  addLink(idx?: number) {
    idx = typeof idx !== 'number' ? this.item.links.length : idx;
    const newLink: BlockListItemLink = {
      title: "Title",
      image: ""
    }
    this.item.links.splice(idx, 0, newLink);
    this.editorMode.selectedLink = newLink;
  }

  onLinkDropped(drop: CdkDragDrop<any[]>) {
    moveItemInArray(this.item.links, drop.previousIndex, drop.currentIndex);
  }

}
