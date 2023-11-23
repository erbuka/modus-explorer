import { Component, OnInit, ViewChild, ElementRef, forwardRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { ContextService } from 'src/app/context.service';
import { Item } from 'src/app/types/item';
import { ConfigLocale } from 'src/app/types/config';
import { State, StateData } from 'src/app/classes/state';
import { ContentProviderService } from 'src/app/content-provider.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  providers: [{ provide: State, useExisting: forwardRef(() => MainComponent) }]
})
export class MainComponent extends State implements OnInit {


  @ViewChild("appContent", { read: ElementRef }) appContentElmt: ElementRef;

  locales: ConfigLocale[] = null;
  item: Item = null;
  showMobileMenu: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router, private location: Location, private contentProvider: ContentProviderService, public context: ContextService, private snackBar: MatSnackBar) {
    super();
  }

  saveState(data: StateData): void {
    //this.router.saveState(data);
  }

  getState(): StateData {
    //return this.router.getState();
    return null;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  nextLocale(): void {
    const index = this.locales.findIndex(x => x.id === this.context.getCurrentLocale().id);
    const nextIndex = (index + 1) % this.locales.length;
    this.context.setCurrentLocale(this.locales[nextIndex].id, true);
  }

  ngOnInit(): void {

    this.locales = this.context.getLocales();

    this.route.paramMap.subscribe({
      next: async params => {
        try {
          this.item = await this.contentProvider.getItem(params.get("id"));
          this.resetContentScrollTop()
        }
        catch (e) {
          this.router.navigate(['/not-found'], { replaceUrl: true });
        }
      }
    })

  }

  async saveItem() {
    const saveFn = this.context.editorSaveClick.value;
    if (saveFn) {
      try {
        await saveFn();
        this.snackBar.open("Item saved!");
      }
      catch (e) {
        console.error(e);
        this.snackBar.open("An error has occurred", null, { panelClass: "text-danger" });
      }
    }
  }

  toggleEditorMode(): void {
    this.context.editorMode.next(!this.context.editorMode.value)
  }

  goHome(): void {
    this.router.navigate([this.context.config.entry]);
  }

  goBack(): void {
    this.location.back();
  }

  goUp(): void {
    //this.router.navigate(this.router.resolve("..", this.item));
    throw new Error("Not implemented")
  }

  resetContentScrollTop(): void {
    if (this.appContentElmt != null) {
      this.appContentElmt.nativeElement.scrollTop = 0;
    }
  }

}
