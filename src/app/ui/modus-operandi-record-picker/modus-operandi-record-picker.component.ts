import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { ContentProviderService, ModusOperandiContentProviderService, ModusOperandiRecordProps, ModusOperandiUserGroup } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';

@Component({
  selector: 'app-modus-operandi-record-picker',
  templateUrl: './modus-operandi-record-picker.component.html',
  styleUrls: ['./modus-operandi-record-picker.component.scss']
})
export class ModusOperandiRecordPickerComponent implements OnInit {

  @Input() multiple: boolean = false

  records: ModusOperandiRecordProps[] = []
  currentPath: ModusOperandiRecordProps[] = []
  currentGroup: BehaviorSubject<ModusOperandiUserGroup> = new BehaviorSubject(null);
  groups: ModusOperandiUserGroup[] = []

  private moContentProvider: ModusOperandiContentProviderService

  get path() { return "/" + this.currentPath.map(folder => folder.name).join("/") }

  constructor(contentProvider: ContentProviderService, private context: ContextService, public dialogRef: MatDialogRef<ModusOperandiRecordPickerComponent>) {
    this.moContentProvider = contentProvider as ModusOperandiContentProviderService
  }

  goUp() {
    if (this.currentPath.length > 0) {
      this.currentPath.pop()
      this.reloadRecordList()
    }
  }

  async onGroupChanged(group: ModusOperandiUserGroup) {
    if (group !== null) {
      this.currentPath = []
      await this.reloadRecordList()
    }
  }

  async reloadRecordList() {
    const catalogId = this.currentPath.length === 0 ? null : this.currentPath[this.currentPath.length - 1].id
    const records = await this.moContentProvider.listRecords({ groupId: this.currentGroup.value.id, catalogId: catalogId })
    this.records = records
    console.log(this.records)
  }

  onFileDoubleClick(r: ModusOperandiRecordProps) {
    if (r.type === "folder") {
      this.currentPath = [...this.currentPath, r]
      this.reloadRecordList()
    } else {
      if (this.dialogRef)
        this.dialogRef.close([r])
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
