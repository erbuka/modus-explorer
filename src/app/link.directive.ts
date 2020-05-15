import { Directive, Input, HostListener, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { LocationRouterService } from './location-router.service';

@Directive({
  selector: '[cnLink]'
})
export class LinkDirective implements OnInit {

  @Input("cnLink") link: string;

  constructor(private locationRouter: LocationRouterService, private elementRef: ElementRef, private renderer: Renderer2) { }

  ngOnInit() {
    if (this.elementRef.nativeElement instanceof HTMLAnchorElement) {
      this.renderer.setAttribute(this.elementRef.nativeElement, "href", this.link);
    }
  }


  @HostListener("click")
  onClick() {
    this.locationRouter.navigate(this.link);
  }


}
