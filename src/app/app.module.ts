import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER, ErrorHandler } from '@angular/core';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
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
import { MatSelectModule } from '@angular/material/select';
import { MAT_TABS_CONFIG, MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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

import { LinkDirective } from './link.directive';
import { EmbedComponent } from './ui/slideshow/embed/embed.component';

import { initialize } from './init';
import { JsonValidator } from './json-validator.service';
import { LocationRouterService } from './location-router.service';
import { ContextService } from './context.service';
import { ContentProviderService, LocalContentProviderService } from './content-provider.service';
import { AppRoutingModule } from './app-ruoting.module';
import { NotFoundComponent } from './ui/not-found/not-found.component';
import { FileInputComponent } from './ui/file-input/file-input.component';
import { FileDropDirective } from './file-drop.directive';
import { ItemInputComponent } from './ui/item-input/item-input.component';
import { EditorModeGuard } from './editor-mode.guard';
import { ColorPickerComponent } from './ui/color-picker/color-picker.component';
import { ConfigEditorComponent } from './ui/config-editor/config-editor.component';
import { LoginComponent } from './ui/login/login.component';
import { Router } from '@angular/router';
import { GlobalErrorHandler } from './classes/global-error-handler';
import { GlobalLoadingComponent } from './ui/global-loading/global-loading.component';
import { ModusOperandiFilePickerComponent } from './ui/file-input/modus-operandi-file-picker/modus-operandi-file-picker.component';
import { JsonViewerComponent } from './ui/json-viewer/json-viewer.component';



@NgModule({
  declarations: [
    AppComponent,
    BlockListComponent,
    BgImageDirective,
    FileDropDirective,
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
    NotFoundComponent,
    FileInputComponent,
    ItemInputComponent,
    ColorPickerComponent,
    ConfigEditorComponent,
    LoginComponent,
    GlobalLoadingComponent,
    ModusOperandiFilePickerComponent,
    JsonViewerComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    FormsModule,
    HammerModule,
    DragDropModule,

    AppRoutingModule,

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
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  providers: [
    EditorModeGuard,
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: "outline", floatLabel: "always" } },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } },
    { provide: MAT_CHECKBOX_DEFAULT_OPTIONS, useValue: { color: "primary" } },
    { provide: MAT_TABS_CONFIG, useValue: { animationDuration: "0" } },
    { provide: APP_BASE_HREF, useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(), deps: [PlatformLocation] },
    // FIXME: commentato, per adesso non sembra servire
    //{ provide: APP_INITIALIZER, useFactory: initialize, multi: true, deps: [ContentProviderService, ContextService, JsonValidator] },
    { provide: ContentProviderService, useFactory: ContentProviderService.factory, deps: [ContextService, HttpClient, JsonValidator, Router] },
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
