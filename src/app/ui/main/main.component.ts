import { Component, OnInit, ViewChild, ElementRef, forwardRef, TemplateRef } from '@angular/core';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Location } from '@angular/common';

import { ContextService } from 'src/app/context.service';
import { Item } from 'src/app/types/item';
import { ConfigLocale } from 'src/app/types/config';
import { State, StateData } from 'src/app/classes/state';
import { ContentProviderService } from 'src/app/content-provider.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import { BlockListItem } from 'src/app/types/block-list-item';
import { SlideshowItem } from 'src/app/types/slideshow-item';
import { ItemComponent } from '../item/item.component';
import { ThreeViewerItem } from 'src/app/types/three-viewer-item';
import { DeepZoomItem } from 'src/app/types/deep-zoom-item';


const DEFAULT_3D: ThreeViewerItem = {
  type: "3d",
  camera: {
    position: [0, 5, -10],
    lookAt: [0, 0, 0],
    controls: {
      type: "orbit",
      maxDistance: 100,
      minDistance: 1,
      rotationSpeed: 1,
      zoomStep: 1,
    }
  }
}

const DEFAULT_BLOCK_LIST: BlockListItem = {
  type: "block-list",
  links: [],
  options: {
    itemWidth: "20rem",
    itemAspectRatio: 1
  }
}

const DEFAULT_SLIDESHOW: SlideshowItem = {
  groups: [],
  options: {
    itemAspectRatio: 1.5,
    itemWidth: "20rem",
    mode: "normal"
  },
  type: "slideshow"
}

const DEFAULT_DEEPZOOM: DeepZoomItem = {
  type: "deep-zoom",
  layers: [],
  layerGroups: [],
  options: {
    viewport: {
      dpi: 300,
      width: 4096,
      height: 4096
    },
    minimapImage: null
  }
}


const DEFAULT_ITEMS: { [type in Item['type']]?: Item } = {
  "block-list": DEFAULT_BLOCK_LIST,
  "slideshow": DEFAULT_SLIDESHOW,
  "deep-zoom": DEFAULT_DEEPZOOM,
  "3d": DEFAULT_3D,
  "page": null,
}


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  providers: [{ provide: State, useExisting: forwardRef(() => MainComponent) }]
})
export class MainComponent extends State implements OnInit {


  @ViewChild("currentItem", { static: false, read: ItemComponent }) currentItemComponent: ItemComponent;
  @ViewChild("newItemDialogTmpl", { read: TemplateRef, static: true }) newItemDialogTmpl;
  @ViewChild("appContent", { read: ElementRef }) appContentElmt: ElementRef;

  notFound: boolean = false;
  savedState: StateData = null;
  locales: ConfigLocale[] = null;
  item: Item = null;
  showMobileMenu: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router, private location: Location, private contentProvider: ContentProviderService, public context: ContextService, private snackBar: MatSnackBar, private dialog: MatDialog) {
    super();
  }

  // TODO: fine for now, I'm disabling it because it is not the best for performance
  saveState(data: StateData): void {
    return;
    this.router.navigate([], {
      queryParams: { state: btoa(JSON.stringify(data)) },
      queryParamsHandling: "merge",
      replaceUrl: true
    });
  }

  getState(): StateData {
    return null;
    return this.savedState;
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

    this.route.queryParamMap.subscribe({
      next: params => {
        if (params.has("state")) {
          const state = JSON.parse(atob(params.get("state")))
          this.savedState = state
        } else {
          this.savedState = null
        }
      }
    });

    this.route.paramMap.subscribe({
      next: async params => {

        const itemId = params.get("id");

        if (!itemId) {
          this.router.navigate(["/", this.context.config.entry])
          return;
        }

        try {
          this.item = await this.contentProvider.getItem(itemId)
          this.notFound = false
          this.resetContentScrollTop()
        }
        catch (e) {
          console.log("Ciao")
          this.notFound = true
        }
      }
    })

  }

  newItem() {
    const ref = this.dialog.open(this.newItemDialogTmpl, {
      width: "512px",
      data: {
        submit: (form: NgForm) => {
          if (form.valid) {
            const { title, type }: { title: string, type: Item['type'] } = form.value;
            const defaultValue = DEFAULT_ITEMS[type];
            this.contentProvider.storeItem(Object.assign({ title }, defaultValue))
              .then(({ id }) => {
                ref.close()
                this.router.navigate(['/', id])
              })
              .catch(e => this.context.raiseError(e))
          }
        }
      }
    })
  }

  async saveItem() {
    try {
      await this.currentItemComponent.save()
      this.snackBar.open("Item saved!")
    }
    catch (e) { this.context.raiseError(e) }
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

  resetContentScrollTop(): void {
    if (this.appContentElmt != null) {
      this.appContentElmt.nativeElement.scrollTop = 0;
    }
  }

  private parseLocation(url: string) {
    let [path, queryString] = url.split("?");
    return {
      url: url,
      path: path,
      queryString: queryString ? queryString : ""
    }
  }

}
