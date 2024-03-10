import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-json-viewer',
  templateUrl: './json-viewer.component.html',
  styleUrls: ['./json-viewer.component.scss']
})
export class JsonViewerComponent implements OnInit {

  private _data: any

  isObject: boolean;
  isArray: boolean;
  isOther: boolean;
  isExpandable: boolean

  expanded: boolean = false


  @Input() path: string = ""

  @Input() set data(data: any) {
    this._data = data;
    this.isArray = Array.isArray(data)
    this.isObject = !this.isArray && typeof data === "object"
    this.isOther = !(this.isObject || this.isArray)
    this.isExpandable = this.isObject || this.isArray
  }

  get data() { return this._data; }

  constructor(private snackbar: MatSnackBar) { }

  copyPath(key?: string | number) {
    if (key !== undefined) {
      key = typeof key === "number" ? key : `"${key}"`
      const value = `${this.path}[${key}]`
      navigator.clipboard.writeText(value)
    } else navigator.clipboard.writeText(this.path)
    this.snackbar.open("Copied to clipboard!")
  }


  ngOnInit(): void {
  }

}
