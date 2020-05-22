import { Component, OnInit, ViewChild, ElementRef, AfterContentInit } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import { Item } from 'src/app/types/item';
import { LocationRouterService } from 'src/app/location-router.service';
import { ConfigLocale } from 'src/app/types/config';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  @ViewChild("appContent", { read: ElementRef }) appContentElmt: ElementRef;

  locales: ConfigLocale[] = null;
  item: Item = null;

  constructor(public context: ContextService, private router: LocationRouterService) { }

  ngOnInit(): void {

    this.locales = this.context.getLocales();

    this.router.subscribe(v => {

      this.context.getItem(v.path, false).subscribe({
        next: item => {
          this.item = item;
          this.resetContentScrollTop();
        }, error: (e) => {
          this.router.navigate(this.context.config.entry, true);
          console.error(e.message);
        }
      })
    });

  }

  goHome(): void {
    this.router.navigate("/");
  }

  goBack(): void {
    this.router.back();
  }

  goUp(): void {
    this.router.navigate(this.router.resolve("..", this.item));
  }

  resetContentScrollTop():void {
    if(this.appContentElmt != null) {
      this.appContentElmt.nativeElement.scrollTop = 0;
    }
  }

}
