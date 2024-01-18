import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router'; // CLI imports router
import { MainComponent } from './ui/main/main.component';
import { NotFoundComponent } from './ui/not-found/not-found.component';

import { EditorModeGuard } from './editor-mode.guard';

const routes: Routes = [
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