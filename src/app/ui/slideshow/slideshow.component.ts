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
import { SlideshowItem, SlideShowItemGroup } from 'src/app/types/slideshow-item';
import { LocationRouterService } from 'src/app/location-router.service';
import { State, StateData } from 'src/app/classes/state';
import { Subscription } from 'rxjs';
import { ContentProviderService } from 'src/app/content-provider.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  slideItemsCache: Item[] = null;
  subscription: Subscription = null;

  constructor(private snackBar: MatSnackBar, private contentProvider: ContentProviderService, public context: ContextService, private router: LocationRouterService, @SkipSelf() private state: State) {
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

    this.slideItemsCache = new Array<Item>(this.item.slides.length);
    this.slideItemsCache.fill(null, 0, this.slideItemsCache.length);

    this.subscription = this.router.queryParams.subscribe(params => {

      if (params["s"]) {

        let slideIndex = parseInt(params["s"]);

        if (slideIndex >= 0) {

          this.currentSlideIndex = slideIndex;

          if (this.item.slides[slideIndex].itemId && this.slideItemsCache[slideIndex] === null) {
            this.contentProvider.getItem(this.item.slides[slideIndex].itemId).then(item => this.slideItemsCache[slideIndex] = item)
          }

        }

      } else {
        this.currentSlideIndex = this.simpleMode ? 0 : null;
      }
    });
  }


  ngOnDestroy() {
    if (this.subscription)
      this.subscription.unsubscribe();
  }

  get simpleMode(): boolean {
    return this.item.options.mode === "simple";
  }

  clearSlide(): void {
    this.router.navigate(this.item.id);
  }

  nextSlide(): void {
    let idx = Math.min(this.currentSlideIndex + 1, this.item.slides.length - 1);
    this.gotoSlide(idx, true);
  }


  previousSlide(): void {
    let idx = Math.max(0, this.currentSlideIndex - 1);
    this.gotoSlide(idx, true);
  }

  gotoSlide(s: number | object, replaceUrl: boolean = false): void {
    let idx = typeof s === "number" ? s : this.item.slides.findIndex(x => x === s);
    this.router.navigate(`${this.item.id}?s=${idx}`);
  }

  getSlidesForGroup(groupName: string) {
    return this.item.slides.filter(s => s.group === groupName);
  }

  getSlideGroup(s: number): SlideShowItemGroup {
    return this.item.groups.find(x => x.name === this.item.slides[s].group);
  }

  trackByIdx(idx: number): number {
    return idx;
  }

}
