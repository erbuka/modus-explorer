import { Component, Inject } from '@angular/core';
import { ContextService } from './context.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(public context: ContextService, @Inject(DOCUMENT) private document: Document) {
    // Disable pinch zoom on touch windows touch screens
    document.addEventListener("wheel", (evt: WheelEvent) => {
      if (evt.ctrlKey)
        evt.preventDefault();
    }, { passive: false });
  }
}
