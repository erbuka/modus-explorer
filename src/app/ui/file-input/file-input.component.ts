import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { DroppedFile } from 'src/app/file-drop.directive';
import { Item } from 'src/app/types/item';

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent implements OnInit {


  @Input() item: Item;
  @Input() url: string;
  @Output() urlChange: EventEmitter<string> = new EventEmitter();

  constructor(private contentProvider: ContentProviderService, private context: ContextService) { }

  ngOnInit(): void {
  }

  onFileDrop(df: DroppedFile) {
    this.contentProvider.storeFile(df.file.name, df.data, this.item)
      .then(({ fileUrl }) => this.urlChange.emit(fileUrl))
      .catch(e => this.context.raiseError(e));
  }

}
