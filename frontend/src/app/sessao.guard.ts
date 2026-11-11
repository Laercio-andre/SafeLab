import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { carregarSessao } from './autenticacao';
import { temPermissao } from './permissoes';
import type { PermissaoId } from './permissoes';

export const sessaoGuard: CanActivateFn = () => {
  if (carregarSessao()) return true;
  return inject(Router).createUrlTree(['/login']);
};

export const loginGuard: CanActivateFn = () => {
  if (carregarSessao()) return inject(Router).createUrlTree(['/dashboard']);
  return true;
};

export const permissaoGuard: CanActivateFn = rota => {
  const sessao = carregarSessao();
  const permissao = rota.data?.['permissao'] as PermissaoId | undefined;
  if (sessao && (!permissao || temPermissao(sessao.cargo, permissao))) return true;
  return inject(Router).createUrlTree(['/dashboard']);
};
