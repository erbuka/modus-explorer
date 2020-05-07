import { Directive, Input, HostListener } from '@angular/core';
import { LocationRouterService } from './location-router.service';

@Directive({
  selector: '[cnLink]'
})
export class LinkDirective {

  @Input("cnLink") link: string;

  constructor(private locationRouter: LocationRouterService) { }

  @HostListener("click")
  onClick() {
    this.locationRouter.navigate(this.link);
  }


}
