import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router'; // CLI imports router
import { MainComponent } from './ui/main/main.component';
import { NotFoundComponent } from './ui/not-found/not-found.component';

const routes: Routes = [
  {
    path: "not-found",
    pathMatch: "full",
    component: NotFoundComponent,
  },
  {
    path: "",
    pathMatch: "full",
    component: MainComponent
  },
  {
    path: ":id",
    component: MainComponent
  }
]; // sets up routes constant where you define your routes

// configures NgModule imports and exports
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }