import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactividadService } from './auth/services/inactividad.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class App implements OnInit {
  constructor(private inactividadService: InactividadService) {}

  ngOnInit(): void {
    this.inactividadService.iniciarVigilancia();
  }
}

export { App as AppComponent };