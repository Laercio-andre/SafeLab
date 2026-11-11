import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { carregarSessao } from './autenticacao';

export const sessaoGuard: CanActivateFn = () => {
  if (carregarSessao()) return true;
  return inject(Router).createUrlTree(['/login']);
};

export const loginGuard: CanActivateFn = () => {
  if (carregarSessao()) return inject(Router).createUrlTree(['/dashboard']);
  return true;
};
