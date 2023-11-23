import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, Input, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { BlockListItem, BlockListItemLink } from 'src/app/types/block-list-item';


@Component({
  selector: 'app-block-list',
  templateUrl: './block-list.component.html',
  styleUrls: ['./block-list.component.scss']
})
export class BlockListComponent implements OnInit, OnDestroy {

  @ViewChild("editBlockDialogTmpl", { static: true, read: TemplateRef }) editBlockDialogTmpl: TemplateRef<any>;

  @Input() item: BlockListItem = null;

  constructor(public context: ContextService, private dialog: MatDialog, private contentProvider: ContentProviderService) { }

  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  ngOnInit() {
    this.context.editorSaveClick.next(() => this.saveItem())
  }

  saveItem() {
    return this.contentProvider.storeItem(this.item);
  }

  editLink(link: BlockListItemLink) {
    this.dialog.open(this.editBlockDialogTmpl, {
      data: { link },
      width: "768px"
    })
  }

  addLink(idx?: number) {
    idx = typeof idx !== 'number' ? this.item.links.length : idx;
    const newLink: BlockListItemLink = {
      itemId: "",
      title: "Title",
      image: ""
    }
    this.item.links.splice(idx, 0, newLink);
    this.editLink(newLink);
  }

  onLinkDropped(drop: CdkDragDrop<any[]>) {
    moveItemInArray(this.item.links, drop.previousIndex, drop.currentIndex);
  }

}
