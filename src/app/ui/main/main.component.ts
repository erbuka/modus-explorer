import { Component, OnInit } from '@angular/core';
import { ContextService, ConfigLocale } from 'src/app/context.service';
import { Item } from 'src/app/types/item';
import { LocationRouterService } from 'src/app/location-router.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  locales: ConfigLocale[] = null;
  item: Item = null;

  constructor(public context: ContextService, private router: LocationRouterService) { }

  ngOnInit(): void {

    this.locales = this.context.getLocales();

    this.router.subscribe(v => {

      this.context.getItem(v.path, false).subscribe({
        next: item => this.item = item,
        error: (e) => {
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
  }

}
