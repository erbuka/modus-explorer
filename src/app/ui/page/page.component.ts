import { Component, OnInit, Input, TemplateRef, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import { PageItem } from 'src/app/types/page-item';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent implements OnChanges {

  @ViewChild("defaultTmpl", { static:true, read: TemplateRef }) defaultTmpl: TemplateRef<any>

  @Input() item: PageItem = null;

  template: TemplateRef<any> = null;
  templateContext: any;

  constructor(private context: ContextService) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.template = this.context.getTemplate(this.item.template) || this.defaultTmpl;
    this.templateContext = { $implicit: this.item.data, item: this.item };
  }



}
