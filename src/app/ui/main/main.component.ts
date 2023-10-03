import { Component, OnInit, ViewChild, ElementRef, AfterContentInit, forwardRef } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import { Item } from 'src/app/types/item';
import { LocationRouterService } from 'src/app/location-router.service';
import { ConfigLocale } from 'src/app/types/config';
import { State, StateData } from 'src/app/classes/state';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  providers: [{ provide: State, useExisting: forwardRef(() => MainComponent) }]
})
export class MainComponent extends State implements OnInit {


  @ViewChild("appContent", { read: ElementRef }) appContentElmt: ElementRef;

  locales: ConfigLocale[] = null;
  item: Item = null;
  showMobileMenu: boolean = false;

  constructor(public context: ContextService, private router: LocationRouterService) {
    super();
  }

  saveState(data: StateData): void {
    this.router.saveState(data);
  }

  getState(): StateData {
    return this.router.getState();
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

    this.router.path.subscribe(v => {

      this.context.getItem(v, false).subscribe({
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

  resetContentScrollTop(): void {
    if (this.appContentElmt != null) {
      this.appContentElmt.nativeElement.scrollTop = 0;
    }
  }

}
