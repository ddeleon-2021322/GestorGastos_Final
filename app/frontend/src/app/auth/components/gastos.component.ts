import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface CategoriaGasto {
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
export class GastosComponent implements OnInit {
  usuario = { nombre: 'Usuario', email: 'usuario@email.com' };
  fechaHoy: string = '';
  totalGastos: number = 0;
  totalIngresos: number = 0;

  transacciones: TransaccionGasto[] = [];
  categorias: CategoriaGasto[] = [];
  tendencia: BarraTendencia[] = [];
  fondoDonut: string = 'conic-gradient(#e5e7eb 0% 100%)';

  mostrarModalGasto: boolean = false;
  nuevoGasto = { titulo: '', monto: 0, categoria: '' };

  private isBrowser: boolean;
  private apiUrlGastos = 'http://localhost:3000/api/gastos';
  private apiUrlIngresos = 'http://localhost:3000/api/ingresos';

  private readonly coloresGastos: string[] = ['#C38C28', '#00193C', '#056E4B'];

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
      this.cargarGastos();
    }
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
        if (Array.isArray(data)) {
          this.totalIngresos = data.reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
        } else if (data && data.total !== undefined) {
          this.totalIngresos = Number(data.total) || 0;
        }
      },
      error: (err) => console.error('Error al consultar ingresos:', err)
    });
  }

  cargarGastos(): void {
    this.http.get<any>(this.apiUrlGastos, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => {
        this.totalGastos = Number(data.total) || 0;
        this.transacciones = data.transacciones || [];
        this.procesarCategorias();
        this.procesarTendencia();
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

  guardarGasto(): void {
    const montoGasto = Number(this.nuevoGasto.monto);
    if (!this.nuevoGasto.titulo || montoGasto <= 0) return;

    const saldoDisponible = this.totalIngresos - this.totalGastos;

    if (montoGasto > saldoDisponible) {
      alert(`No puedes gastar más de lo que tienes ingresado.\nSaldo disponible: Q ${saldoDisponible.toFixed(2)}`);
      return;
    }

    const payload = {
      titulo: this.nuevoGasto.titulo,
      monto: montoGasto,
      categoria: this.nuevoGasto.categoria || 'Otros'
    };

    this.http.post(this.apiUrlGastos, payload, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        this.mostrarModalGasto = false;
        this.nuevoGasto = { titulo: '', monto: 0, categoria: '' };
        this.cargarGastos();
        this.cargarIngresos();
      },
      error: (err) => {
        const mensaje = err.error?.message || 'Error al procesar el gasto';
        alert(mensaje);
      }
    });
  }

  private procesarCategorias(): void {
    if (this.totalGastos === 0 || this.transacciones.length === 0) {
      this.categorias = [];
      this.fondoDonut = 'conic-gradient(#e5e7eb 0% 100%)';
      return;
    }

    const mapa: { [key: string]: number } = {};
    for (const t of this.transacciones) {
      const cat = (t.categoria && t.categoria.trim() !== '') ? t.categoria.trim() : (t.titulo || 'Otros');
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
        porcentaje: Math.round((monto / this.totalGastos) * 100),
        porcentajeDona: Math.round((monto / totalTop3) * 100),
        color: this.coloresGastos[index]
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

  private procesarTendencia(): void {
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

    this.tendencia = resultado.map((r) => {
      const pct = (r.montoNum / maxMonto) * 80;
      let texto = 'Q 0';
      if (r.montoNum >= 1000) {
        const k = r.montoNum / 1000;
        texto = `Q ${k % 1 === 0 ? k : k.toFixed(1)}k`;
      } else if (r.montoNum > 0) {
        texto = `Q ${r.montoNum}`;
      }

      return {
        mes: r.mes,
        valorTexto: texto,
        fechaTexto: r.fechaTexto,
        altura: `${Math.max(6, Math.round(pct))}%`
      };
    });
  }

  cerrarSesion(): void {
    if (this.isBrowser) {
      localStorage.removeItem('miToken');
      this.router.navigate(['/login']);
    }
  }
}