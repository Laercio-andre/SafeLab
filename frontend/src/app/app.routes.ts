import { Routes } from '@angular/router';
import { loginGuard, permissaoGuard, sessaoGuard } from './sessao.guard';

export const routes: Routes = [
  { path: 'login', canActivate: [loginGuard], data: { pagina: 'login' }, title: 'SafeLab · Início de sessão' },
  {
    path: '',
    canActivate: [sessaoGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', data: { pagina: 'dashboard' }, title: 'SafeLab · Dashboard' },
      { path: 'movimentos', canActivate: [permissaoGuard], data: { pagina: 'movimentos', permissao: 'movimentos.ver' }, title: 'SafeLab · Movimentos' },
      { path: 'alarmes', canActivate: [permissaoGuard], data: { pagina: 'alarmes', permissao: 'alarmes.ver' }, title: 'SafeLab · Alarmes' },
      { path: 'equipamentos', canActivate: [permissaoGuard], data: { pagina: 'equipamentos', permissao: 'equipamentos.ver' }, title: 'SafeLab · Equipamentos' },
      { path: 'utilizadores', canActivate: [permissaoGuard], data: { pagina: 'utilizadores', permissao: 'utilizadores.ver' }, title: 'SafeLab · Utilizadores' },
      { path: 'perfis', canActivate: [permissaoGuard], data: { pagina: 'perfis', permissao: 'perfis.ver' }, title: 'SafeLab · Perfis e Acesso' },
      { path: 'arduino', canActivate: [permissaoGuard], data: { pagina: 'arduino', permissao: 'arduino.aceder' }, title: 'SafeLab · Arduino / Serial' },
      { path: 'notificacoes', data: { pagina: 'notificacoes' }, title: 'SafeLab · Notificações' },
      { path: 'configuracoes', canActivate: [permissaoGuard], data: { pagina: 'configuracoes', permissao: 'configuracoes.aceder' }, title: 'SafeLab · Configurações' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
