import { Component, OnInit, Input, forwardRef, SkipSelf, OnDestroy } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import {
  trigger,
  style,
  animate,
  transition,
  query,
  group
} from '@angular/animations';
import { Item } from 'src/app/types/item';
import { SlideshowItem, SlideShowItemGroup, SlideShowItemSlide } from 'src/app/types/slideshow-item';
import { LocationRouterService } from 'src/app/location-router.service';
import { State, StateData } from 'src/app/classes/state';
import { Subscription } from 'rxjs';
import { ContentProviderService } from 'src/app/content-provider.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { Location } from '@angular/common';

type Styles = { [key: string]: string | number };

const createSlideAnimation = function (normal: Styles, next: Styles, previous: Styles) {

  const time = "0.25s";

  return [
    transition(':increment',
      group([
        query(":enter", [
          style(next),
          animate(time, style(normal))
        ]),
        query(":leave", [
          animate(time, style(previous))
        ], { optional: true }),
      ])
    ),
    transition(':decrement',
      group([
        query(":enter", [
          style(previous),
          animate(time, style(normal))
        ]),
        query(":leave", [
          animate(time, style(next))
        ], { optional: true }),
      ])
    )
  ]
}


@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.scss'],
  providers: [{ provide: State, useExisting: forwardRef(() => SlideshowComponent) }],
  animations: [
    trigger('slideAnimation', createSlideAnimation({ transform: "translateX(0)" }, { transform: "translateX(100%)" }, { transform: "translateX(-100%)" })),
    trigger('fadeAnimation', createSlideAnimation(
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(30%)" },
      { opacity: 0, transform: "translateX(-30%)" }
    ))
  ]
})
export class SlideshowComponent extends State implements OnInit, OnDestroy {

  @Input() item: SlideshowItem = null;

  currentSlideIndex: number = null;
  allSlides: SlideShowItemSlide[] = [];
  slideCount: number = 0;
  slideItemsCache: Item[] = null;
  subscription: Subscription = null;

  get simpleMode(): boolean {
    return this.item.options.mode === "simple";
  }


  constructor(private location: Location, private snackBar: MatSnackBar, private route: ActivatedRoute,
    private contentProvider: ContentProviderService, public context: ContextService, private router: Router, @SkipSelf() private state: State) {
    super();
  }

  saveState(data: StateData): void {
    // TODO: this has to be reimplmented
    this.state.saveState(data);
  }

  getState(): StateData {
    // TODO: this has to be reimplmented
    return this.state.getState();
  }

  saveItem() {
    this.contentProvider.storeItem(this.item)
      .then(() => this.snackBar.open("Item Saved!"))
      .catch(error => this.context.raiseError(error));
  }

  ngOnInit() {
    this.context.editorSaveClick.next(this.saveItem.bind(this));
    this.reload();

    this.subscription = this.route.queryParamMap.subscribe({
      next: params => {
        const slideIdx = parseInt(params.get("s"));

        // slideIdx could be NaN
        this.currentSlideIndex = slideIdx || null;

        if (!isNaN(slideIdx)) {
          this.currentSlideIndex = slideIdx;
          const slide = this.allSlides[slideIdx];
          if (slide.type === "item" && this.slideItemsCache[slideIdx] === null) {
            this.contentProvider.getItem(slide.itemId).then(item => this.slideItemsCache[slideIdx] = item)
          }
        }
      }
    })
  }


  ngOnDestroy() {
    this.subscription.unsubscribe();
  }



  reload() {
    // Reloads helper variables
    this.allSlides = this.item.groups.map(grp => grp.slides).reduce((p, c) => [...p, ...c], []);
    this.slideCount = this.allSlides.length;
    this.slideItemsCache = new Array<Item>(this.slideCount);
    this.slideItemsCache.fill(null);
  }

  clearSlide(): void {

    this.router.navigate(["/", this.item.id]);
  }

  nextSlide(): void {
    let idx = Math.min(this.currentSlideIndex + 1, this.slideCount - 1);
    this.gotoSlide(idx, true);
  }


  previousSlide(): void {
    let idx = Math.max(0, this.currentSlideIndex - 1);
    this.gotoSlide(idx, true);
  }

  gotoSlide(s: number | object, replaceUrl: boolean = false): void {
    let idx = typeof s === "number" ? s : this.allSlides.findIndex(x => x === s);
    this.router.navigate(["/", this.item.id], {
      queryParamsHandling: "merge",
      queryParams: {
        s: idx
      }
    })
  }

  getSlideGroup(idx: number): SlideShowItemGroup {
    return this.item.groups.find(grp => grp.slides.includes(this.allSlides[idx]));
  }

  trackByIdx(idx: number): number {
    return idx;
  }

}
