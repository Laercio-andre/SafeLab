export type FormatoHora = '24h' | '12h';
export type Densidade = 'compacta' | 'confortavel';
export type Tema = 'claro' | 'escuro';

export interface Definicoes {
  conta: { nome: string; email: string; cargo: string; telefone: string };
  notificacoes: { alarmesNovos: boolean; resumoDiario: boolean; somAlarme: boolean; limiarAlarmes: number; silencioInicio: string; silencioFim: string };
  sistema: { fuso: string; formatoHora: FormatoHora; densidade: Densidade; animacoes: boolean; tema: Tema };
}

export interface Alteracao { secao: string; campo: string; anterior: string; novo: string; }
export interface RegistoAuditoria { id: string; em: string; secao: string; acao: string; detalhe: string; }
export interface SessaoLocal { id: string; inicio: string; }

export const CHAVE_DEFINICOES = 'safelab.definicoes.v1';
export const CHAVE_AUDITORIA = 'safelab.auditoria.v1';
export const CHAVE_SESSAO = 'safelab.sessao.v1';
export const CHAVE_SECCAO = 'safelab.seccao-config';
export const EVENTO_DEFINICOES = 'safelab:definicoes';
export const EVENTO_SECCAO = 'safelab:seccao-config';

export const FUSOS = [
  { valor: 'Africa/Luanda', rotulo: 'Luanda (UTC+1)' },
  { valor: 'Europe/Lisbon', rotulo: 'Lisboa (UTC+0)' },
  { valor: 'UTC', rotulo: 'UTC' }
];

export const DEFINICOES_PADRAO: Definicoes = {
  conta: { nome: 'Administrador', email: 'admin@safelab.pt', cargo: 'ADMIN', telefone: '' },
  notificacoes: { alarmesNovos: true, resumoDiario: false, somAlarme: true, limiarAlarmes: 3, silencioInicio: '22:00', silencioFim: '07:00' },
  sistema: { fuso: 'Africa/Luanda', formatoHora: '24h', densidade: 'confortavel', animacoes: true, tema: 'claro' }
};

const GRUPOS: { secao: string; grupo: 'conta' | 'notificacoes' | 'sistema'; campos: [string, string][] }[] = [
  { secao: 'Conta', grupo: 'conta', campos: [['nome', 'Nome'], ['email', 'Email'], ['cargo', 'Cargo'], ['telefone', 'Telefone']] },
  { secao: 'Notificações', grupo: 'notificacoes', campos: [['alarmesNovos', 'Alarmes por email'], ['resumoDiario', 'Resumo diário'], ['somAlarme', 'Sons de alarme'], ['limiarAlarmes', 'Limiar de alarmes'], ['silencioInicio', 'Início do silêncio'], ['silencioFim', 'Fim do silêncio']] },
  { secao: 'Sistema', grupo: 'sistema', campos: [['fuso', 'Fuso horário'], ['formatoHora', 'Formato de hora'], ['densidade', 'Densidade'], ['animacoes', 'Animações'], ['tema', 'Tema']] }
];

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function escrever(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    return;
  }
}

function remover(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    return;
  }
}

function texto(valor: unknown): string {
  if (valor === true) return 'Sim';
  if (valor === false) return 'Não';
  if (valor === '' || valor === null || valor === undefined) return '—';
  return String(valor);
}

export function carregarDefinicoes(): Definicoes {
  const bruto = ler(CHAVE_DEFINICOES);
  if (!bruto) return structuredClone(DEFINICOES_PADRAO);
  try {
    const guardadas = JSON.parse(bruto) as Partial<Definicoes>;
    return {
      conta: { ...DEFINICOES_PADRAO.conta, ...(guardadas.conta ?? {}) },
      notificacoes: { ...DEFINICOES_PADRAO.notificacoes, ...(guardadas.notificacoes ?? {}) },
      sistema: { ...DEFINICOES_PADRAO.sistema, ...(guardadas.sistema ?? {}) }
    };
  } catch {
    return structuredClone(DEFINICOES_PADRAO);
  }
}

export function guardarDefinicoes(definicoes: Definicoes): void {
  escrever(CHAVE_DEFINICOES, JSON.stringify(definicoes));
}

export function reporDefinicoes(): void {
  remover(CHAVE_DEFINICOES);
}

export function aplicarDefinicoes(definicoes: Definicoes): void {
  const raiz = document.documentElement;
  raiz.classList.toggle('densidade-compacta', definicoes.sistema.densidade === 'compacta');
  raiz.classList.toggle('sem-animacoes', definicoes.sistema.animacoes === false);
}

export function formatarRelogio(definicoes: Definicoes, data: Date): string {
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: definicoes.sistema.formatoHora === '12h',
      timeZone: definicoes.sistema.fuso
    }).format(data);
  } catch {
    return data.toLocaleTimeString('pt-PT');
  }
}

export function formatarDataHora(definicoes: Definicoes, iso: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: definicoes.sistema.fuso
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString('pt-PT');
  }
}

export function diferencaDefinicoes(antigas: Definicoes, novas: Definicoes): Alteracao[] {
  const antigasGravadas = antigas as unknown as Record<string, Record<string, unknown>>;
  const novasGravadas = novas as unknown as Record<string, Record<string, unknown>>;
  const alteracoes: Alteracao[] = [];
  for (const grupo of GRUPOS) {
    for (const [campo, rotulo] of grupo.campos) {
      const anterior = texto(antigasGravadas[grupo.grupo][campo]);
      const novo = texto(novasGravadas[grupo.grupo][campo]);
      if (anterior !== novo) alteracoes.push({ secao: grupo.secao, campo: rotulo, anterior, novo });
    }
  }
  return alteracoes;
}

export function carregarAuditoria(): RegistoAuditoria[] {
  const bruto = ler(CHAVE_AUDITORIA);
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto) as RegistoAuditoria[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function registarAuditoria(secao: string, acao: string, detalhe: string): RegistoAuditoria[] {
  const entrada: RegistoAuditoria = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    em: new Date().toISOString(),
    secao,
    acao,
    detalhe
  };
  const atualizada = [entrada, ...carregarAuditoria()].slice(0, 100);
  escrever(CHAVE_AUDITORIA, JSON.stringify(atualizada));
  return atualizada;
}

export function limparAuditoria(): void {
  remover(CHAVE_AUDITORIA);
}

export function obterSessaoLocal(): SessaoLocal {
  const guardada = ler(CHAVE_SESSAO);
  if (guardada) {
    try {
      const sessao = JSON.parse(guardada) as SessaoLocal;
      if (sessao.id && sessao.inicio) return sessao;
    } catch {
      return criarSessaoLocal();
    }
  }
  return criarSessaoLocal();
}

function criarSessaoLocal(): SessaoLocal {
  const sessao: SessaoLocal = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    inicio: new Date().toISOString()
  };
  escrever(CHAVE_SESSAO, JSON.stringify(sessao));
  return sessao;
}
