import { ENTER } from '@angular/cdk/keycodes';
import { Component, OnInit } from '@angular/core';
import { MatChipInputEvent, MatChipSelectionChange } from '@angular/material/chips';
import { Router } from '@angular/router';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';
import { Config, ConfigLocaleId } from 'src/app/types/config';
import { getAllLocales } from 'src/app/types/locales';

declare function structuredClone(value: any, options?: StructuredSerializeOptions): any;

@Component({
  selector: 'app-config-editor',
  templateUrl: './config-editor.component.html',
  styleUrls: ['./config-editor.component.scss']
})
export class ConfigEditorComponent implements OnInit {

  separatorKeysCodes = [ENTER]

  allLocales: ConfigLocaleId[]

  config: Config

  constructor(private context: ContextService, private contentProvider: ContentProviderService, private router: Router) { }

  async initialize() {
    const config = await this.contentProvider.getConfig()
    await this.context.initialize(config)
    this.config = structuredClone(this.context.config)
    this.allLocales = getAllLocales()
  }

  ngOnInit() {
    this.initialize();
  }

  async save() {
    try {
      await this.contentProvider.saveConfig(this.config)
      await this.router.navigate(["/", this.config.entry.id])
      location.reload()
    }
    catch (e) {
      this.context.raiseError(e)
    }
  }

  addHeaderLink() {
    this.config.headerLinks.push({
      title: "Link",
      link: null
    })
  }

  removeLocale(id: ConfigLocaleId) {
    this.config.internationalization.locales = this.config.internationalization.locales.filter(locId => locId !== id)
  }

  addLocale(evt: MatChipInputEvent) {
    const value = evt.value as ConfigLocaleId;
    const locales = this.config.internationalization.locales

    if (this.allLocales.includes(value) && !locales.includes(value)) {
      this.config.internationalization.locales = [...locales, value]
      evt.chipInput.clear()

      if (this.config.internationalization.locales.length === 1)
        this.config.internationalization.defaultLocale = value

    }


  }

  onLocaleSelected(evt: MatChipSelectionChange) {
    console.log(this.config.internationalization.locales)
  }

}
