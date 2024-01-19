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
import { State, StateData } from 'src/app/classes/state';
import { Subscription } from 'rxjs';
import { ContentProviderService } from 'src/app/content-provider.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { skip } from 'rxjs/operators';
import { ItemSave } from '../item/item.component';

type Styles = { [key: string]: string | number };

type SlideShowEditorMode = {
  selectedGroup: SlideShowItemGroup,
  selectedSlide: SlideShowItemSlide,
}

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
export class SlideshowComponent extends State implements OnInit, OnDestroy, ItemSave {

  @Input() item: SlideshowItem = null;

  editorMode: SlideShowEditorMode = {
    selectedGroup: null,
    selectedSlide: null
  }

  currentSlideIndex: number = null;
  allSlides: SlideShowItemSlide[] = [];
  slideCount: number = 0;
  slideItemsCache: Map<string, Promise<Item>> = new Map();
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

  save() {
    return this.contentProvider.storeItem(this.item);
  }

  ngOnInit() {
    this.reload();

    this.subscription = this.context.editorMode
      .pipe(skip(1))
      .subscribe({
        next: v => v === false ? this.reload() : undefined
      })

    this.route.queryParamMap.subscribe({
      next: params => {
        const slideIdx = parseInt(params.get("s"));

        // slideIdx could be NaN
        this.currentSlideIndex = slideIdx || null;

        if (!isNaN(slideIdx))
          this.currentSlideIndex = slideIdx;
        
      }
    })

  }

  getCachedItem(slide: SlideShowItemSlide): Promise<Item> {
    if (slide.type === "item") {
      if (!this.slideItemsCache.has(slide.itemId)) {
        this.slideItemsCache.set(slide.itemId, this.contentProvider.getItem(slide.itemId))
      }
      return this.slideItemsCache.get(slide.itemId);
    }
    return null;
  }


  ngOnDestroy() {
    this.subscription.unsubscribe();
  }



  reload() {
    // Reloads helper variables
    this.allSlides = this.item.groups.map(grp => grp.slides).reduce((p, c) => [...p, ...c], []);
    this.slideCount = this.allSlides.length;
    this.slideItemsCache = new Map();
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

  addSlide(grp: SlideShowItemGroup) {

    const slide: SlideShowItemSlide = {
      type: "image",
      title: "New Slide",
      previewImage: ""
    }
    grp.slides = [...grp.slides, slide];
    this.selectSlide(slide);
  }

  addGroup() {
    const grp: SlideShowItemGroup = {
      name: "group-name",
      title: "Group Title",
      slides: []
    }
    this.item.groups = [...this.item.groups, grp];
    this.selectGroup(grp);
  }

  deleteGroup(grp: SlideShowItemGroup) {
    this.item.groups = this.item.groups.filter(g => g !== grp);

    if (this.editorMode.selectedGroup === grp)
      this.editorMode.selectedGroup = null;

  }

  deleteSlide(grp: SlideShowItemGroup, slide: SlideShowItemSlide) {
    grp.slides = grp.slides.filter(s => s !== slide);

    if (this.editorMode.selectedSlide === slide)
      this.editorMode.selectedSlide = null;

  }

  selectGroup(grp: SlideShowItemGroup) {
    this.editorMode.selectedGroup = grp
    this.editorMode.selectedSlide = null
  }

  selectSlide(slide: SlideShowItemSlide) {
    this.editorMode.selectedGroup = null
    this.editorMode.selectedSlide = slide
  }

  onGroupDrop(evt: CdkDragDrop<void>) {
    moveItemInArray(this.item.groups, evt.previousIndex, evt.currentIndex)
  }

  onSlideDrop(evt: CdkDragDrop<SlideShowItemGroup>) {
    if (evt.container === evt.previousContainer) {
      moveItemInArray(evt.container.data.slides, evt.previousIndex, evt.currentIndex)
    } else {
      throw "Fuck off";
    }

  }

}
