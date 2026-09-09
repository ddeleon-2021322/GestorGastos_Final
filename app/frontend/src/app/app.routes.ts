import { Routes } from '@angular/router';
import { LoginComponent } from './auth/components/login.component';
import { RegisterComponent } from './auth/components/register.component';
import { GestorComponent } from './auth/components/gestor.component'; 
import { IngresosComponent } from './auth/components/ingresos.component';
import { GastosComponent } from './auth/components/gastos.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'gestor', component: GestorComponent }, 
  { path: 'ingresos', component: IngresosComponent },
  { path: 'gastos', component: GastosComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];