import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'iota'
})
export class IotaPipe implements PipeTransform {

  transform(value: number, ...args: unknown[]): number[] {
    return Array.from({ length: value }, (_, i) => i);
  }

}
