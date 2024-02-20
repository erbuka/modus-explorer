import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Subject } from 'rxjs';
import { ContentProviderService, ModusOperandiContentProviderService, ModusOperandiFileProps, ModusOperandiUserGroup } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';

export type ModusOperandiFileFilter = (file: ModusOperandiFileProps) => boolean

@Component({
  selector: 'app-modus-operandi-file-picker',
  templateUrl: './modus-operandi-file-picker.component.html',
  styleUrls: ['./modus-operandi-file-picker.component.scss']
})
export class ModusOperandiFilePickerComponent implements OnInit {

  @Input() fileFilter: ModusOperandiFileFilter = () => true

  files: ModusOperandiFileProps[] = []
  currentPath: ModusOperandiFileProps[] = []
  currentGroup: BehaviorSubject<ModusOperandiUserGroup> = new BehaviorSubject(null);
  groups: ModusOperandiUserGroup[] = []

  private moContentProvider: ModusOperandiContentProviderService

  get path() { return "/" + this.currentPath.map(folder => folder.name).join("/") }

  constructor(contentProvider: ContentProviderService, private context: ContextService, public dialogRef: MatDialogRef<ModusOperandiFilePickerComponent>) {
    this.moContentProvider = contentProvider as ModusOperandiContentProviderService
  }

  goUp() {
    if (this.currentPath.length > 0) {
      this.currentPath.pop()
      this.reloadFilesList()
    }
  }

  async onGroupChanged(group: ModusOperandiUserGroup) {
    if (group !== null) {
      this.currentPath = []
      await this.reloadFilesList()
    }
  }

  async reloadFilesList() {
    const folderId = this.currentPath.length === 0 ? null : this.currentPath[this.currentPath.length - 1].id
    const files = await this.moContentProvider.listFiles(folderId, { group: this.currentGroup.value.id })
    console.log(files)
    this.files = files.filter(f => f.type === "folder" || this.fileFilter(f))
  }

  onFileDoubleClick(f: ModusOperandiFileProps) {
    if (f.type === "folder") {
      this.currentPath = [...this.currentPath, f]
      this.reloadFilesList()
    } else {
      if (this.dialogRef)
        this.dialogRef.close([f])
    }
  }

  ngOnInit(): void {

    this.currentGroup.subscribe({
      next: this.onGroupChanged.bind(this)
    })

    this.moContentProvider.listGroups()
      .then(groups => {
        this.groups = groups
        this.currentGroup.next(groups[0])
      })
      .catch(e => this.context.raiseError(e))


  }

}
