import { Pipe, PipeTransform } from '@angular/core';
import { LocationRouterService } from './location-router.service';

@Pipe({
  name: 'cnUrl'
})
export class UrlPipe implements PipeTransform {

  constructor(private router: LocationRouterService) { }

  transform(value: any, ...args: any[]): any {
    return value ? this.router.resolve(value, args[0]) : null;
  }

}
