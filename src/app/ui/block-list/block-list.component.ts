import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, Input, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { BlockListItem, BlockListItemLink } from 'src/app/types/block-list-item';
import { ItemSave } from '../item/item.component';


type BlockListEditorMode = {
  selectedLink: BlockListItemLink,
  items: Promise<{ id: string }[]>
}

@Component({
  selector: 'app-block-list',
  templateUrl: './block-list.component.html',
  styleUrls: ['./block-list.component.scss']
})
export class BlockListComponent implements OnInit, ItemSave {

  editorMode: BlockListEditorMode = {
    selectedLink: null,
    items: null
  }

  @ViewChild("editBlockDialogTmpl", { static: true, read: TemplateRef }) editBlockDialogTmpl: TemplateRef<any>;

  @Input() item: BlockListItem = null;

  constructor(public context: ContextService, private contentProvider: ContentProviderService) { }

  ngOnInit() {
    //this.context.editorSaveClick.next(() => this.saveItem())
    this.editorMode.items = this.contentProvider.listItems();
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
      itemId: "",
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
