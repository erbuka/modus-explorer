import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContentProviderService, ModusOperandiContentProviderService, ModusOperandiLoginData } from 'src/app/content-provider.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  username: string = "";
  password: string = "";
  error: string = "";

  constructor(private contentProvider: ContentProviderService, private router: Router) { }

  ngOnInit(): void { }

  async login() {
    const moContentProvider = this.contentProvider as ModusOperandiContentProviderService
    try {
      await moContentProvider.login(this.username, this.password)
      this.router.navigate(["/"])
    }
    catch (e) {
      this.error = e.error.message
    }
  }

}
