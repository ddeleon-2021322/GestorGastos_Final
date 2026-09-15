import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface MovimientoUnificado {
  id?: number;
  tipo: 'ingreso' | 'gasto';
  titulo: string;
  categoria: string;
  subcategoria: string;
  monto: number;
  fecha: string;
}

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './movimientos.component.html',
  styleUrls: ['./movimientos.component.css']
})
export class MovimientosComponent implements OnInit {
  usuario = { nombre: 'Usuario', email: 'usuario@email.com' };
  fechaHoy: string = '';
  periodoTexto: string = '';

  totalEntradas: number = 0;
  totalSalidas: number = 0;
  balanceNeto: number = 0;

  movimientos: MovimientoUnificado[] = [];

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
      this.establecerFechas();
      this.cargarBitacora();
    }
  }

  private establecerFechas(): void {
    const d = new Date();
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    this.fechaHoy = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    this.periodoTexto = `${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('miToken') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  cargarBitacora(): void {
    const headers = this.getAuthHeaders();

    forkJoin({
      ingresos: this.http.get<any>(this.apiUrlIngresos, { headers }),
      gastos: this.http.get<any>(this.apiUrlGastos, { headers })
    }).subscribe({
      next: ({ ingresos, gastos }) => {
        this.totalEntradas = Number(ingresos.total) || 0;
        this.totalSalidas = Number(gastos.total) || 0;
        this.balanceNeto = this.totalEntradas - this.totalSalidas;

        const listaIngresos: MovimientoUnificado[] = (ingresos.transacciones || []).map((t: any) => ({
          id: t.id,
          tipo: 'ingreso',
          titulo: t.titulo || 'Ingreso',
          categoria: t.categoria || t.titulo || 'General',
          subcategoria: t.categoria || 'Ingreso',
          monto: Number(t.monto),
          fecha: t.fecha
        }));

        const listaGastos: MovimientoUnificado[] = (gastos.transacciones || []).map((t: any) => ({
          id: t.id,
          tipo: 'gasto',
          titulo: t.titulo || 'Gasto',
          categoria: t.categoria || 'General',
          subcategoria: t.categoria || 'Egreso',
          monto: Number(t.monto),
          fecha: t.fecha
        }));

        this.movimientos = [...listaIngresos, ...listaGastos].sort((a, b) => {
          return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
        });

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

  obtenerIcono(categoria: string, tipo: string): string {
    const cat = (categoria || '').toLowerCase();
    if (cat.includes('salario') || cat.includes('sueldo')) return '🏛️';
    if (cat.includes('super') || cat.includes('alimento') || cat.includes('comida')) return '🛒';
    if (cat.includes('transporte') || cat.includes('uber') || cat.includes('gasolina')) return '🚗';
    if (cat.includes('ocio') || cat.includes('cine') || cat.includes('restaurante')) return '🎬';
    if (cat.includes('compra') || cat.includes('devolucion')) return '🛍️';
    if (cat.includes('freelance') || cat.includes('proyecto')) return '💼';
    return tipo === 'ingreso' ? '💰' : '📄';
  }

  cerrarSesion(): void {
    if (this.isBrowser) {
      localStorage.removeItem('miToken');
      this.router.navigate(['/login']);
    }
  }
}