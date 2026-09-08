import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-gestor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gestor.component.html',
  styleUrls: ['./gestor.component.css']
})
export class GestorComponent implements OnInit, OnDestroy {
  readonly TIEMPO_INACTIVIDAD = '2m';

  usuario = { nombre: 'Usuario', email: 'usuario@email.com' };
  
  resumen = { ingresos: 0, gastos: 0, balance: 0 };
  movimientos: any[] = [];
  
  porcentajeIngresos: number = 0;
  porcentajeGastos: number = 0;
  fondoDonut: string = 'conic-gradient(#e5e7eb 0% 100%)';

  private temporizador: any;
  private isBrowser: boolean;
  private apiUrlIngresos = 'http://localhost:3000/api/ingresos';

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const token = localStorage.getItem('miToken');
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }
      this.reiniciarTemporizador();
      this.cargarDatos();
    }
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('miToken') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  cargarDatos(): void {
    this.http.get<any>(this.apiUrlIngresos, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => {
        this.resumen.ingresos = Number(data.total) || 0;
        this.resumen.balance = this.resumen.ingresos - this.resumen.gastos;

        this.movimientos = (data.transacciones || []).slice(0, 5).map((t: any) => ({
          titulo: t.titulo,
          monto: Number(t.monto),
          tipo: 'ingreso',
          fecha: t.fecha
        }));

        this.actualizarGrafica();
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          this.expulsarPorInactividad();
        }
      }
    });
  }

  private actualizarGrafica(): void {
    const totalMovimientos = this.resumen.ingresos + this.resumen.gastos;

    if (totalMovimientos === 0) {
      this.fondoDonut = 'conic-gradient(#e5e7eb 0% 100%)';
      this.porcentajeIngresos = 0;
      this.porcentajeGastos = 0;
      return;
    }

    this.porcentajeIngresos = Math.round((this.resumen.ingresos / totalMovimientos) * 100);
    this.porcentajeGastos = Math.round((this.resumen.gastos / totalMovimientos) * 100);
    this.fondoDonut = `conic-gradient(#106b4e 0% ${this.porcentajeIngresos}%, #c5a365 ${this.porcentajeIngresos}% 100%)`;
  }

  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:click')
  @HostListener('window:scroll')
  reiniciarTemporizador(): void {
    if (!this.isBrowser) return;
    if (this.temporizador) clearTimeout(this.temporizador);

    const ms = this.convertirAMilisegundos(this.TIEMPO_INACTIVIDAD);
    this.temporizador = setTimeout(() => this.expulsarPorInactividad(), ms);
  }

  private convertirAMilisegundos(tiempo: string): number {
    const unidad = tiempo.slice(-1);
    const valor = parseInt(tiempo.slice(0, -1), 10);
    if (unidad === 's') return valor * 1000;
    if (unidad === 'm') return valor * 60 * 1000;
    if (unidad === 'h') return valor * 60 * 60 * 1000;
    return valor * 1000;
  }

  private expulsarPorInactividad(): void {
    if (this.isBrowser) {
      localStorage.removeItem('miToken');
      alert('Su sesión ha expirado por inactividad.');
      this.router.navigate(['/login']);
    }
  }

  cerrarSesion(): void {
    if (this.isBrowser) {
      localStorage.removeItem('miToken');
      this.router.navigate(['/login']);
    }
  }
}