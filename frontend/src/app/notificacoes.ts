export type CategoriaNotificacao = 'alarme' | 'sistema';

export interface Notificacao {
  id: number;
  titulo: string;
  corpo: string;
  quando: string;
  lida: boolean;
  categoria: CategoriaNotificacao;
}

export const CHAVE_NOTIFICACOES = 'safelab.notificacoes.v1';

export function carregarNotificacoes(): Notificacao[] {
  try {
    const bruto = localStorage.getItem(CHAVE_NOTIFICACOES);
    if (!bruto) return [];
    const lista: unknown = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista.filter((item): item is Notificacao =>
      !!item && typeof item === 'object' && typeof (item as Notificacao).id === 'number' && typeof (item as Notificacao).titulo === 'string');
  } catch {
    return [];
  }
}

export function guardarNotificacoes(notificacoes: Notificacao[]): void {
  try {
    localStorage.setItem(CHAVE_NOTIFICACOES, JSON.stringify(notificacoes));
  } catch {
    return;
  }
}
