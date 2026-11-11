export type PermissaoId =
  | 'equipamentos.ver'
  | 'equipamentos.criar'
  | 'equipamentos.remover'
  | 'equipamentos.lote'
  | 'utilizadores.ver'
  | 'utilizadores.gerir'
  | 'movimentos.ver'
  | 'movimentos.exportar'
  | 'alarmes.ver'
  | 'alarmes.reconhecer'
  | 'perfis.ver'
  | 'perfis.gerir'
  | 'notificacoes.gerir'
  | 'arduino.aceder'
  | 'configuracoes.aceder';

export interface RegraPermissao {
  id: PermissaoId;
  label: string;
  grupo: string;
}

export interface RegraCargo {
  id: string;
  label: string;
}

export const CARGOS: RegraCargo[] = [
  { id: 'ADMIN', label: 'Administrador' },
  { id: 'COORDENADOR', label: 'Coordenador' },
  { id: 'SEGURANCA', label: 'Segurança' },
  { id: 'DOCENTE', label: 'Docente' },
  { id: 'TECNICO', label: 'Técnico' },
];

export const PERMISSOES: RegraPermissao[] = [
  { id: 'equipamentos.ver', label: 'Consultar o inventário', grupo: 'Património' },
  { id: 'equipamentos.criar', label: 'Criar e editar equipamentos', grupo: 'Património' },
  { id: 'equipamentos.remover', label: 'Remover equipamentos', grupo: 'Património' },
  { id: 'equipamentos.lote', label: 'Alterar estado em lote', grupo: 'Património' },
  { id: 'utilizadores.ver', label: 'Consultar utilizadores', grupo: 'Utilizadores' },
  { id: 'utilizadores.gerir', label: 'Registar e remover utilizadores', grupo: 'Utilizadores' },
  { id: 'movimentos.ver', label: 'Consultar movimentos', grupo: 'Movimentos e alarmes' },
  { id: 'movimentos.exportar', label: 'Exportar movimentos em CSV', grupo: 'Movimentos e alarmes' },
  { id: 'alarmes.ver', label: 'Consultar alarmes', grupo: 'Movimentos e alarmes' },
  { id: 'alarmes.reconhecer', label: 'Reconhecer alarmes', grupo: 'Movimentos e alarmes' },
  { id: 'perfis.ver', label: 'Consultar a matriz de permissões', grupo: 'Perfis e sistema' },
  { id: 'perfis.gerir', label: 'Alterar a matriz de permissões', grupo: 'Perfis e sistema' },
  { id: 'notificacoes.gerir', label: 'Gerir as suas notificações', grupo: 'Perfis e sistema' },
  { id: 'arduino.aceder', label: 'Aceder a Arduino / Serial', grupo: 'Perfis e sistema' },
  { id: 'configuracoes.aceder', label: 'Aceder a Configurações', grupo: 'Perfis e sistema' },
];

const MATRIZ: Record<PermissaoId, readonly string[]> = {
  'equipamentos.ver': ['ADMIN', 'COORDENADOR', 'SEGURANCA', 'DOCENTE', 'TECNICO'],
  'equipamentos.criar': ['ADMIN', 'COORDENADOR', 'TECNICO'],
  'equipamentos.remover': ['ADMIN', 'COORDENADOR'],
  'equipamentos.lote': ['ADMIN', 'COORDENADOR', 'TECNICO'],
  'utilizadores.ver': ['ADMIN', 'COORDENADOR', 'SEGURANCA', 'TECNICO'],
  'utilizadores.gerir': ['ADMIN', 'COORDENADOR'],
  'movimentos.ver': ['ADMIN', 'COORDENADOR', 'SEGURANCA', 'DOCENTE', 'TECNICO'],
  'movimentos.exportar': ['ADMIN', 'COORDENADOR', 'SEGURANCA'],
  'alarmes.ver': ['ADMIN', 'COORDENADOR', 'SEGURANCA', 'DOCENTE', 'TECNICO'],
  'alarmes.reconhecer': ['ADMIN', 'COORDENADOR', 'SEGURANCA'],
  'perfis.ver': ['ADMIN', 'COORDENADOR'],
  'perfis.gerir': ['ADMIN'],
  'notificacoes.gerir': ['ADMIN', 'COORDENADOR', 'SEGURANCA', 'DOCENTE', 'TECNICO'],
  'arduino.aceder': ['ADMIN', 'COORDENADOR', 'SEGURANCA', 'TECNICO'],
  'configuracoes.aceder': ['ADMIN', 'COORDENADOR'],
};

export function temPermissao(cargo: string | null | undefined, permissao: PermissaoId): boolean {
  if (!cargo) return false;
  return MATRIZ[permissao].includes(cargo);
}
