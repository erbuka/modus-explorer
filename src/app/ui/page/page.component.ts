import { Component, OnInit, Input, TemplateRef, OnChanges, SimpleChanges, ViewChild, OnDestroy } from '@angular/core';
import { ContentProviderService, ModusOperandiContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { PageItem } from 'src/app/types/page-item';
import getServer from 'src/server';
import { ItemSave } from '../item/item.component';
import { structuredClone } from 'src/app/classes/utility';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent implements OnInit, OnDestroy, OnChanges, ItemSave {

  @ViewChild("defaultTmpl", { static: true, read: TemplateRef }) defaultTmpl: TemplateRef<any>
  @ViewChild("dataViewTmpl", { static: true, read: TemplateRef }) dataViewTmpl: TemplateRef<any>

  @Input() item: PageItem = null;


  data: any;

  isModusOperandi = getServer().type === "modus-operandi"

  templateNames: string[] = []
  template: TemplateRef<any> = null;
  templateContext: any;

  private _subscription: Subscription;

  constructor(public context: ContextService, private contentProvider: ContentProviderService, private dialog: MatDialog) { }


  async save(): Promise<any> {
    await this.contentProvider.storeItem({
      type: "page",
      id: this.item.id,
      title: this.item.title,
      template: this.item.template,
      internalData: this.item.internalData,
      modusOperandiRecordId: this.item.modusOperandiRecordId
    })
  }

  ngOnInit(): void {
    this.templateNames = this.context.getTemplateNames()

    this._subscription = this.context.editorMode.pipe(skip(1)).subscribe({
      next: v => {
        if (v === false)
          this.reload()
      }
    })

  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe()
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['item'] && this.item) {
      await this.reload()
    }
  }

  private async reload() {

    // TODO: Should use the real structuredClone when available
    this.data = structuredClone(this.item.internalData)

    if (this.isModusOperandi && this.item.modusOperandiRecordId) {
      const moContentProvider = this.contentProvider as ModusOperandiContentProviderService
      const moData = await moContentProvider.getRecord(this.item.modusOperandiRecordId)
      const parsedData = moContentProvider.parseRecordData(moData)
      Object.assign(this.data, parsedData)
    }

    this.template = this.context.getTemplate(this.item.template) || this.defaultTmpl;
    this.templateContext = { $implicit: this.data, item: this.item };
  }

  onInternalDataInput(evt: InputEvent) {
    const target = evt.target as HTMLTextAreaElement
    try {
      const data = JSON.parse(target.value)
      if(typeof data === "object")
        this.item.internalData = data
    }
    catch (e) {}
  }

  viewData() {
    this.dialog.open(this.dataViewTmpl, { 
      data: this.data,
      width: "80%",
      height: "80%",
      minWidth: "1024px",
      minHeight: "768px"
    })
  }

}
