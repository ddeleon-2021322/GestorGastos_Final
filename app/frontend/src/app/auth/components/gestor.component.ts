import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface Movimiento {
  tipo: 'ingreso' | 'gasto';
  titulo: string;
  monto: number;
  fecha: string;
}

@Component({
  selector: 'app-gestor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gestor.component.html',
  styleUrls: ['./gestor.component.css']
})
export class GestorComponent implements OnInit {
  usuario = { nombre: 'Usuario', email: 'usuario@email.com' };

  totalIngresos: number = 0;
  totalGastos: number = 0;
  balance: number = 0;

  porcentajeIngresos: number = 100;
  porcentajeGastos: number = 0;
  fondoDonut: string = 'conic-gradient(#056E4B 0% 100%)';

  movimientosRecientes: Movimiento[] = [];

  private isBrowser: boolean;
  private apiUrlIngresos = 'http://localhost:3000/api/ingresos';
  private apiUrlGastos = 'http://localhost:3000/api/gastos';

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
      this.cargarDatosDashboard();
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('miToken') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  cargarDatosDashboard(): void {
    const headers = this.getAuthHeaders();

    forkJoin({
      ingresos: this.http.get<any>(this.apiUrlIngresos, { headers }),
      gastos: this.http.get<any>(this.apiUrlGastos, { headers })
    }).subscribe({
      next: ({ ingresos, gastos }) => {
        this.totalIngresos = Number(ingresos.total) || 0;
        this.totalGastos = Number(gastos.total) || 0;
        this.balance = this.totalIngresos - this.totalGastos;

        const totalMovido = this.totalIngresos + this.totalGastos;
        if (totalMovido > 0) {
          this.porcentajeIngresos = Math.round((this.totalIngresos / totalMovido) * 100);
          this.porcentajeGastos = 100 - this.porcentajeIngresos;
          this.fondoDonut = `conic-gradient(#056E4B 0% ${this.porcentajeIngresos}%, #D7B46F ${this.porcentajeIngresos}% 100%)`;
        } else {
          this.porcentajeIngresos = 0;
          this.porcentajeGastos = 0;
          this.fondoDonut = 'conic-gradient(#e2e8f0 0% 100%)';
        }

        const listaIngresos: Movimiento[] = (ingresos.transacciones || []).map((t: any) => ({
          tipo: 'ingreso',
          titulo: t.titulo,
          monto: Number(t.monto),
          fecha: t.fecha
        }));

        const listaGastos: Movimiento[] = (gastos.transacciones || []).map((t: any) => ({
          tipo: 'gasto',
          titulo: t.titulo,
          monto: Number(t.monto),
          fecha: t.fecha
        }));

        this.movimientosRecientes = [...listaIngresos, ...listaGastos]
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .slice(0, 5);

        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem('miToken');
          this.router.navigate(['/login']);
        }
      }
    });
  }

  cerrarSesion(): void {
    if (this.isBrowser) {
      localStorage.removeItem('miToken');
      this.router.navigate(['/login']);
    }
  }
}