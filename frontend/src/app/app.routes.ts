import { Routes } from '@angular/router';
import { loginGuard, sessaoGuard } from './sessao.guard';

export const routes: Routes = [
  { path: 'login', canActivate: [loginGuard], data: { pagina: 'login' }, title: 'SafeLab · Início de sessão' },
  {
    path: '',
    canActivate: [sessaoGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', data: { pagina: 'dashboard' }, title: 'SafeLab · Dashboard' },
      { path: 'movimentos', data: { pagina: 'movimentos' }, title: 'SafeLab · Movimentos' },
      { path: 'alarmes', data: { pagina: 'alarmes' }, title: 'SafeLab · Alarmes' },
      { path: 'equipamentos', data: { pagina: 'equipamentos' }, title: 'SafeLab · Equipamentos' },
      { path: 'utilizadores', data: { pagina: 'utilizadores' }, title: 'SafeLab · Utilizadores' },
      { path: 'perfis', data: { pagina: 'perfis' }, title: 'SafeLab · Perfis e Acesso' },
      { path: 'arduino', data: { pagina: 'arduino' }, title: 'SafeLab · Arduino / Serial' },
      { path: 'notificacoes', data: { pagina: 'notificacoes' }, title: 'SafeLab · Notificações' },
      { path: 'configuracoes', data: { pagina: 'configuracoes' }, title: 'SafeLab · Configurações' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
