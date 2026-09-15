import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class InactividadService {
  readonly TIEMPO_INACTIVIDAD: string = '2m';

  private temporizador: any = null;
  private isBrowser: boolean;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private parsearTiempo(tiempo: string): number {
    const match = tiempo.trim().match(/^(\d+)\s*([smhd])$/i);

    if (!match) {
      console.warn(`[Inactividad] Formato "${tiempo}" no reconocido. Usando 15s por defecto.`);
      return 15 * 1000;
    }

    const cantidad = parseInt(match[1], 10);
    const unidad = match[2].toLowerCase();

    switch (unidad) {
      case 's': return cantidad * 1000;                  
      case 'm': return cantidad * 60 * 1000;             
      case 'h': return cantidad * 60 * 60 * 1000;        
      case 'd': return cantidad * 24 * 60 * 60 * 1000;  
      default:  return 15 * 1000;
    }
  }

  iniciarVigilancia(): void {
    if (!this.isBrowser) return;

    const ms = this.parsearTiempo(this.TIEMPO_INACTIVIDAD);
    console.log(`[Inactividad] Vigilando: ${this.TIEMPO_INACTIVIDAD} (${ms} ms)`);

    this.reiniciarReloj();

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    this.ngZone.runOutsideAngular(() => {
      eventos.forEach(evento => {
        window.addEventListener(evento, () => this.reiniciarReloj(), { passive: true });
      });
    });
  }

  private reiniciarReloj(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
    }

    const duracionMs = this.parsearTiempo(this.TIEMPO_INACTIVIDAD);

    this.temporizador = setTimeout(() => {
      this.ejecutarCierre();
    }, duracionMs);
  }

  private ejecutarCierre(): void {
    console.warn('[Inactividad] Tiempo cumplido sin acciones.');
    localStorage.clear();

    this.ngZone.run(() => {
      alert(`Sesión cerrada por inactividad (${this.TIEMPO_INACTIVIDAD} sin acciones).`);
      this.router.navigate(['/login']);
    });
  }

  detenerVigilancia(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}