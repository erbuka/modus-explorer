import { Component, OnInit, Input } from '@angular/core';
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



@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.scss'],
  animations: [
    trigger('slideAnimation', [
      transition(':increment',
        group([
          query(":enter", [
            style({ transform: "translateX(100%)" }),
            animate("0.25s", style({ transform: "translateX(0)" }))
          ]),
          query(":leave", [
            animate("0.25s", style({ transform: "translateX(-100%)" }))
          ], { optional: true }),
        ])
      ),
      transition(':decrement',
        group([
          query(":enter", [
            style({ transform: "translateX(-100%)" }),
            animate("0.25s", style({ transform: "translateX(0)" }))
          ]),
          query(":leave", [
            animate("0.25s", style({ transform: "translateX(100%)" }))
          ], { optional: true }),
        ])
      )
    ])
  ]
})
export class SlideshowComponent implements OnInit {

  @Input() item: SlideshowItem = null;

  currentSlideIndex: number = null;
  slideItemsCache: Item[] = null;

  constructor(private context: ContextService, private router: LocationRouterService) { }

  ngOnInit() {

    this.slideItemsCache = new Array<Item>(this.item.slides.length);
    this.slideItemsCache.fill(null, 0, this.slideItemsCache.length);

    this.router.subscribe(route => {

      if (route.params["s"]) {

        let slideIndex = parseInt(route.params["s"]);

        if (slideIndex >= 0) {

          this.currentSlideIndex = slideIndex;

          if (this.item.slides[slideIndex].href && this.slideItemsCache[slideIndex] === null) {
            let url = this.router.resolve(this.item.slides[slideIndex].href, this.item);
            this.context.getItem(url).subscribe(item => this.slideItemsCache[slideIndex] = item);
          }

        }

      } else {
        this.currentSlideIndex = null;
      }
    });
  }

  clearSlide(): void {
    this.router.navigate(this.item.uri);
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
    this.router.navigate(`${this.item.uri}?s=${idx}`);
  }

  getSlidesForGroup(groupName: string) {
    return this.item.slides.filter(s => s.group === groupName);
  }

  getSlideGroup(s:number):SlideShowItemGroup {
    return this.item.groups.find(x => x.name === this.item.slides[s].group);
  }

  trackByIdx(idx: number): number {
    return idx;
  }

}
