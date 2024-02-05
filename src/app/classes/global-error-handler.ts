import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import getServer from "src/server";
import { ContextService } from "../context.service";


@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  constructor(private router: Router, private zone: NgZone, private context: ContextService) { console.log(router) }

  handleError(error: any): void {
    console.log("Handling global error")
    /* Catching modus operandi login errors, most likely token missing or expired. Redirect to login page */
    if (getServer().type === "modus-operandi") {
      if (error.rejection instanceof HttpErrorResponse) {
        if (error.rejection.status === 401 || error.rejection.status === 403) {
          this.zone.run(() => {
            console.log("Unauthorized. Redirecting to login page")
            this.router.navigate(["/login"])
          })
          return
        }
      }
    }

    this.context.raiseError(error)
  }

}