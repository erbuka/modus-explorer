import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule, MAT_CHECKBOX_DEFAULT_OPTIONS } from '@angular/material/checkbox';
import { MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AppComponent } from './app.component';
import { BlockListComponent } from './ui/block-list/block-list.component';
import { BgImageDirective } from './ui/bg-image.directive';
import { PageComponent } from './ui/page/page.component';
import { TemplatesComponent } from './templates/templates.component';
import { TemplateDefDirective } from './template-def.directive';
import { UrlPipe } from './url.pipe';
import { ItemComponent } from './ui/item/item.component';
import { SlideshowComponent } from './ui/slideshow/slideshow.component';
import { MainComponent } from './ui/main/main.component';
import { LeafletDeepZoomComponent } from './ui/deep-zoom/leaflet-deep-zoom/leaflet-deep-zoom.component';
import { ThreeViewerComponent } from './ui/three-viewer/three-viewer.component';
import { NavigatorComponent } from './ui/deep-zoom/navigator/navigator.component';
import { LocalizedTextPipe } from './localized-text.pipe';
import { VectorInputComponent } from './ui/three-viewer/vector-input/vector-input.component';
import { DialogsComponent } from './ui/dialogs/dialogs.component';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { EditableLocalizedTextComponent } from './ui/editable-localized-text/editable-localized-text.component';
import { MaterialEditorComponent } from './ui/three-viewer/material-editor/material-editor.component';
import { PinLayerEditorComponent } from './ui/three-viewer/pin-layer-editor/pin-layer-editor.component';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { LinkDirective } from './link.directive';
import { EmbedComponent } from './ui/slideshow/embed/embed.component';



@NgModule({
  declarations: [
    AppComponent,
    BlockListComponent,
    BgImageDirective,
    PageComponent,
    TemplatesComponent,
    TemplateDefDirective,
    UrlPipe,
    ItemComponent,
    SlideshowComponent,
    MainComponent,
    LeafletDeepZoomComponent,
    NavigatorComponent,
    LocalizedTextPipe,
    ThreeViewerComponent,
    VectorInputComponent,
    DialogsComponent,
    EditableLocalizedTextComponent,
    MaterialEditorComponent,
    PinLayerEditorComponent,
    LinkDirective,
    EmbedComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    FormsModule,
    HammerModule,
    DragDropModule,

    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSliderModule,
    MatMenuModule,
    MatToolbarModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: "outline", floatLabel: "always" } },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } },
    { provide: MAT_CHECKBOX_DEFAULT_OPTIONS, useValue: { color: "primary" } },
    { provide: APP_BASE_HREF, useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(), deps: [PlatformLocation] }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
