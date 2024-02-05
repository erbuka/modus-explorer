import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router'; // CLI imports router
import { MainComponent } from './ui/main/main.component';

import { EditorModeGuard } from './editor-mode.guard';
import { ConfigEditorComponent } from './ui/config-editor/config-editor.component';
import { LoginComponent } from './ui/login/login.component';

const routes: Routes = [
  {
    path: "login",
    pathMatch: "full",
    component: LoginComponent
  },
  {
    path: "config",
    pathMatch: "full",
    component: ConfigEditorComponent
  },
  {
    path: "",
    pathMatch: "full",
    component: MainComponent,
  },
  {
    path: ":id",
    component: MainComponent,
    canActivate: [EditorModeGuard]
  }
]; // sets up routes constant where you define your routes

// configures NgModule imports and exports
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }