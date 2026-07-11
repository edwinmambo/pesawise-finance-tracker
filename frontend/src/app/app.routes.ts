import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent) },
      { path: 'transactions', loadComponent: () => import('./features/transactions/transactions').then((m) => m.TransactionsComponent) },
      { path: 'budgets', loadComponent: () => import('./features/budgets/budgets').then((m) => m.BudgetsComponent) },
      { path: 'calendar', loadComponent: () => import('./features/calendar/calendar').then((m) => m.CalendarComponent) },
      { path: 'loans', loadComponent: () => import('./features/loans/loans').then((m) => m.LoansComponent) },
      { path: 'savings', loadComponent: () => import('./features/savings/savings').then((m) => m.SavingsComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports').then((m) => m.ReportsComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
