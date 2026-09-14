import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface CategoriaIngreso {
  nombre: string;
  monto: number;
  porcentaje: number;
  porcentajeDona: number;
  color: string;
}

interface BarraTendencia {
  mes: string;
  valorTexto: string;
  fechaTexto: string;
  altura: string;
  color: string;
}

interface TransaccionIngreso {
  id?: number;
  categoria: string;
  titulo: string;
  monto: number;
  fecha: string;
}

@Component({
  selector: 'app-ingresos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ingresos.component.html',
  styleUrls: ['./ingresos.component.css']
})
export class IngresosComponent implements OnInit, OnDestroy {
  readonly TIEMPO_INACTIVIDAD = '2m';

  usuario = { nombre: 'Usuario', email: 'usuario@email.com' };
  fechaHoy: string = '';
  totalIngresos: number = 0;

  transacciones: TransaccionIngreso[] = [];
  categorias: CategoriaIngreso[] = [];
  tendencia: BarraTendencia[] = [];
  fondoDonut: string = 'conic-gradient(#e5e7eb 0% 100%)';

  mostrarModalIngreso: boolean = false;
  nuevoIngreso = { titulo: '', monto: 0, categoria: '' };

  private isBrowser: boolean;
  private temporizador: any;
  private apiUrlIngresos = 'http://localhost:3000/api/ingresos';

  private readonly coloresLogo: string[] = [
    '#056E4B',
    '#00193C',
    '#C38C28'
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
      this.cargarIngresos();
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

  cargarIngresos(): void {
    this.http.get<any>(this.apiUrlIngresos, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => {
        this.totalIngresos = Number(data.total) || 0;
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
    if (this.totalIngresos === 0 || this.transacciones.length === 0) {
      this.categorias = [];
      this.fondoDonut = 'conic-gradient(#e5e7eb 0% 100%)';
      return;
    }

    const mapa: { [key: string]: number } = {};
    for (const t of this.transacciones) {
      const cat = (t.categoria && t.categoria.trim() !== '') 
        ? t.categoria.trim() 
        : (t.titulo && t.titulo.trim() !== '' ? t.titulo.trim() : 'General');

      mapa[cat] = (mapa[cat] || 0) + Number(t.monto);
    }

    const top3Nombres = Object.keys(mapa)
      .sort((a, b) => mapa[b] - mapa[a])
      .slice(0, 3);

    const totalTop3 = top3Nombres.reduce((sum, nom) => sum + mapa[nom], 0);

    this.categorias = top3Nombres.map((nombre, index) => {
      const monto = mapa[nombre];
      return {
        nombre,
        monto,
        porcentaje: Math.round((monto / this.totalIngresos) * 100),
        porcentajeDona: Math.round((monto / totalTop3) * 100),
        color: this.coloresLogo[index]
      };
    });

    let acumulado = 0;
    const gradientes: string[] = [];

    this.categorias.forEach((c, index) => {
      const inicio = acumulado;
      const fin = (index === this.categorias.length - 1) ? 100 : acumulado + c.porcentajeDona;
      acumulado = fin;
      gradientes.push(`${c.color} ${inicio}% ${fin}%`);
    });

    this.fondoDonut = `conic-gradient(${gradientes.join(', ')})`;
  }

  private procesarTendenciaSemestral(): void {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ahora = new Date();
    const resultado: { mes: string; fechaTexto: string; montoNum: number }[] = [];

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

    this.tendencia = resultado.map((r, index) => {
      const pct = (r.montoNum / maxMonto) * 80;
      let texto = 'Q 0';
      if (r.montoNum >= 1000) {
        const k = r.montoNum / 1000;
        texto = `Q ${k % 1 === 0 ? k : k.toFixed(1)}k`;
      } else if (r.montoNum > 0) {
        texto = `Q ${r.montoNum}`;
      }

      const coloresBarra = ['#75B8A7', '#62AC9A', '#4FA08D', '#3D9480', '#2E8572', '#1B6A58'];

      return {
        mes: r.mes,
        valorTexto: texto,
        fechaTexto: r.fechaTexto,
        altura: `${Math.max(6, Math.round(pct))}%`,
        color: coloresBarra[index % coloresBarra.length]
      };
    });
  }

  guardarIngreso(): void {
    if (!this.nuevoIngreso.titulo || Number(this.nuevoIngreso.monto) <= 0) return;

    const payload = {
      titulo: this.nuevoIngreso.titulo,
      monto: Number(this.nuevoIngreso.monto),
      categoria: this.nuevoIngreso.categoria || 'General'
    };

    this.http.post(this.apiUrlIngresos, payload, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        this.mostrarModalIngreso = false;
        this.nuevoIngreso = { titulo: '', monto: 0, categoria: '' };
        this.cargarIngresos();
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