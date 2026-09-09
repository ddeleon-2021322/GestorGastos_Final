import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface CategoriaGasto {
  nombre: string;
  monto: number;
  porcentaje: number;
  color: string;
}

interface BarraTendencia {
  mes: string;
  valorTexto: string;
  fechaTexto: string;
  altura: string;
}

interface TransaccionGasto {
  id?: number;
  categoria: string;
  titulo: string;
  monto: number;
  fecha: string;
}

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.css']
})
export class GastosComponent implements OnInit, OnDestroy {
  readonly TIEMPO_INACTIVIDAD = '2m';

  usuario = { nombre: 'Usuario', email: '' };
  fechaHoy: string = '';
  totalGastos: number = 0;
  
  transacciones: TransaccionGasto[] = [];
  categorias: CategoriaGasto[] = [];
  tendencia: BarraTendencia[] = [];
  fondoDonut: string = 'conic-gradient(#e5e7eb 0% 100%)';

  mostrarModalGasto: boolean = false;
  nuevoGasto = { titulo: '', monto: 0, categoria: '' };

  private isBrowser: boolean;
  private temporizador: any;
  private apiUrlGastos = 'http://localhost:3000/api/gastos';

  private readonly paletaColores: string[] = [
    '#C38C28',
    '#056E4B',
    '#00193C',
    '#8C5A2B',
    '#2D5A43',
    '#5C4018',
    '#334E68'
  ];

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
      this.establecerFechaActual();
      this.cargarGastos();
    }
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
  }

  private establecerFechaActual(): void {
    const d = new Date();
    this.fechaHoy = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('miToken') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  cargarGastos(): void {
    this.http.get<any>(this.apiUrlGastos, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => {
        this.totalGastos = Number(data.total) || 0;
        this.transacciones = data.transacciones || [];
        
        this.procesarCategoriasDinamicas();
        this.procesarTendenciaSemestral();
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

  private procesarCategoriasDinamicas(): void {
    if (this.totalGastos === 0 || this.transacciones.length === 0) {
      this.categorias = [];
      this.fondoDonut = 'conic-gradient(#e5e7eb 0% 100%)';
      return;
    }

    const mapa: { [key: string]: number } = {};
    for (const t of this.transacciones) {
      const cat = (t.categoria && t.categoria.trim() !== '') ? t.categoria.trim() : 'General';
      mapa[cat] = (mapa[cat] || 0) + Number(t.monto);
    }

    const llavesOrdenadas = Object.keys(mapa).sort((a, b) => mapa[b] - mapa[a]);

    this.categorias = llavesOrdenadas.map((nombre, index) => {
      const monto = mapa[nombre];
      const porcentaje = Math.round((monto / this.totalGastos) * 100);
      return {
        nombre,
        monto,
        porcentaje,
        color: this.paletaColores[index % this.paletaColores.length]
      };
    });

    let acumulado = 0;
    const gradientes: string[] = [];
    for (const c of this.categorias) {
      const inicio = acumulado;
      acumulado += c.porcentaje;
      gradientes.push(`${c.color} ${inicio}% ${acumulado}%`);
    }

    if (acumulado < 100 && gradientes.length > 0) {
      gradientes.push(`#e5e7eb ${acumulado}% 100%`);
    }

    this.fondoDonut = `conic-gradient(${gradientes.join(', ')})`;
  }

  private procesarTendenciaSemestral(): void {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ahora = new Date();
    const resultado: { mes: string; fechaTexto: string; montoNum: number }[] = [];

    // Cálculo dinámico de los últimos 6 meses hacia atrás
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mIdx = ref.getMonth();
      const aNum = ref.getFullYear();

      const totalMes = this.transacciones
        .filter((t) => {
          const f = new Date(t.fecha);
          return f.getMonth() === mIdx && f.getFullYear() === aNum;
        })
        .reduce((sum, curr) => sum + Number(curr.monto), 0);

      resultado.push({
        mes: meses[mIdx],
        fechaTexto: `01/${(mIdx + 1).toString().padStart(2, '0')}/${aNum}`,
        montoNum: totalMes
      });
    }

    const maxMonto = Math.max(...resultado.map((r) => r.montoNum), 1);

    this.tendencia = resultado.map((r) => {
      const pct = (r.montoNum / maxMonto) * 85;
      return {
        mes: r.mes,
        valorTexto: `Q ${r.montoNum.toLocaleString('es-GT', { minimumFractionDigits: 0 })}`,
        fechaTexto: r.fechaTexto,
        altura: `${Math.max(12, Math.round(pct))}%`
      };
    });
  }

  guardarGasto(): void {
    if (!this.nuevoGasto.titulo || this.nuevoGasto.monto <= 0) return;

    this.http.post(this.apiUrlGastos, this.nuevoGasto, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        this.mostrarModalGasto = false;
        this.nuevoGasto = { titulo: '', monto: 0, categoria: '' };
        this.cargarGastos();
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