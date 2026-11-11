export interface SessaoUtilizador {
  utilizador: string;
  nome: string;
  cargo: string;
  em: string;
  lembrar: boolean;
}

export const CHAVE_SESSAO_UTILIZADOR = 'safelab.autenticacao.v1';

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave) ?? sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function carregarSessao(): SessaoUtilizador | null {
  const bruto = ler(CHAVE_SESSAO_UTILIZADOR);
  if (!bruto) return null;
  try {
    const sessao = JSON.parse(bruto) as SessaoUtilizador;
    if (sessao.utilizador && sessao.nome) return sessao;
    return null;
  } catch {
    return null;
  }
}

export function guardarSessao(sessao: SessaoUtilizador): void {
  try {
    if (sessao.lembrar) {
      localStorage.setItem(CHAVE_SESSAO_UTILIZADOR, JSON.stringify(sessao));
      sessionStorage.removeItem(CHAVE_SESSAO_UTILIZADOR);
    } else {
      sessionStorage.setItem(CHAVE_SESSAO_UTILIZADOR, JSON.stringify(sessao));
      localStorage.removeItem(CHAVE_SESSAO_UTILIZADOR);
    }
  } catch {
    return;
  }
}

export function terminarSessaoLocal(): void {
  try {
    localStorage.removeItem(CHAVE_SESSAO_UTILIZADOR);
    sessionStorage.removeItem(CHAVE_SESSAO_UTILIZADOR);
  } catch {
    return;
  }
}
