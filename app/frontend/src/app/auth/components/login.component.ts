import { Component, OnInit, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  credentials = {
    email: '',
    password: ''
  };

  errorMessage: string = '';

  private readonly googleClientId = '266991149058-v26eck7vomtdjh72gdvdnt7preb4qi42.apps.googleusercontent.com';

  constructor(
    private router: Router,
    private http: HttpClient,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarBotonGoogle();
    }
  }

  cargarBotonGoogle(): void {
    const interval = setInterval(() => {
      const botonContenedor = document.getElementById('google-btn');

      if (typeof google !== 'undefined' && botonContenedor) {
        clearInterval(interval);

        google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: (res: any) => this.alCompletarGoogle(res)
        });

        google.accounts.id.renderButton(
          botonContenedor,
          { 
            theme: 'outline', 
            size: 'large', 
            width: 320, 
            text: 'signin_with', 
            shape: 'pill' 
          }
        );
      }
    }, 100);
  }

  alCompletarGoogle(response: any): void {
    this.ngZone.run(() => {
      console.log('Google token recibido, enviando al backend...');
      this.http.post<any>('http://localhost:3000/api/auth/google', { credential: response.credential })
        .subscribe({
          next: (res) => {
            localStorage.setItem('miToken', res.token);
            this.router.navigate(['/gestor']);
          },
          error: (err) => {
            console.error('Error en login Google:', err);
            this.errorMessage = err.error?.message || 'Error al autenticar con Google';
          }
        });
    });
  }

  onLogin(): void {
    this.ngZone.run(() => {
      console.log('Enviando credenciales normales:', this.credentials);
      this.http.post<any>('http://localhost:3000/api/auth/login', this.credentials)
        .subscribe({
          next: (res) => {
            localStorage.setItem('miToken', res.token);
            this.router.navigate(['/gestor']);
          },
          error: (err) => {
            console.error('Error en login normal:', err);
            this.errorMessage = err.error?.message || 'Correo o contraseña incorrectos';
          }
        });
    });
  }
}