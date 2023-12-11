import { Injectable } from "@angular/core"
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot } from "@angular/router"
import { ContextService } from "./context.service"
import { MatSnackBar } from "@angular/material/snack-bar"

@Injectable()
export class EditorModeGuard implements CanActivate {
  constructor(private context: ContextService, private snackBar: MatSnackBar) { }
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (this.context.editorMode.value) {
      this.snackBar.open("Can't navigate while Editor Mode is active")
      return false
    }
    return true
  }
}