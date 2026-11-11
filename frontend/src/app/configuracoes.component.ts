import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cargo, Evento } from './api.service';
import {
  Alteracao,
  aplicarDefinicoes,
  carregarAuditoria,
  carregarDefinicoes,
  CHAVE_SECCAO,
  DEFINICOES_PADRAO,
  Definicoes,
  diferencaDefinicoes,
  EVENTO_DEFINICOES,
  EVENTO_SECCAO,
  FUSOS,
  formatarDataHora,
  guardarDefinicoes,
  limparAuditoria,
  obterSessaoLocal,
  registarAuditoria,
  RegistoAuditoria
} from './definicoes';
import { focar, prenderTab } from './foco';
import type { Page } from './tipos';

type Secao = 'conta' | 'seguranca' | 'notificacoes' | 'sistema' | 'dispositivos' | 'auditoria' | 'ajuda' | 'avancado';
type CampoNotificacoes = keyof Definicoes['notificacoes'];
type CampoSistema = keyof Definicoes['sistema'];
type Confirmacao = 'repor' | 'limpar-historico';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h2>Configurações</h2>
        <p>Conta, preferências e ambiente do SafeLab</p>
      </div>
      <span class="badge info-badge">Guardado neste navegador</span>
    </section>

    <div class="settings-layout">
      <nav class="settings-nav" aria-label="Secções das configurações">
        @for (item of secoes; track item.id) {
          <button type="button" [class.active]="seccao() === item.id" [attr.aria-current]="seccao() === item.id ? 'page' : null" (click)="abrirSecao(item.id)">
            <i class="fa-solid" [ngClass]="item.icone" aria-hidden="true"></i><span>{{ item.rotulo }}</span>
          </button>
        }
      </nav>

      <div class="settings-body" id="seccao-config" tabindex="-1">
        @switch (seccao()) {
          @case ('conta') {
            <section class="panel settings-panel" aria-label="Conta e perfil">
              <div class="panel-head">
                <h2>Conta e perfil</h2>
                @if (sujo()) { <span class="badge warn">Por guardar</span> } @else { <span class="badge good">Atualizado</span> }
              </div>
              <form class="settings-form" (ngSubmit)="guardarConta()">
                <div class="form-grid">
                  <label>Nome *<input name="nome" [(ngModel)]="rascunho.conta.nome" (input)="marcarAlteracao()" required autocomplete="name"></label>
                  <label>Email *<input name="email" type="email" [(ngModel)]="rascunho.conta.email" (input)="marcarAlteracao()" required autocomplete="email"></label>
                  <label>Cargo<select name="cargo" [(ngModel)]="rascunho.conta.cargo" (ngModelChange)="marcarAlteracao()">@for (c of cargos; track c) { <option [value]="c">{{ c }}</option> }</select></label>
                  <label>Telefone<input name="telefone" type="tel" [(ngModel)]="rascunho.conta.telefone" (input)="marcarAlteracao()" autocomplete="tel"></label>
                </div>
                <div class="settings-actions">
                  <button class="primary" type="submit" [disabled]="!sujo()">Guardar alterações</button>
                  <button class="outline" type="button" [disabled]="!sujo()" (click)="reporConta()">Repor</button>
                </div>
              </form>
              <div class="hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>Perfil local deste navegador. A ligação à conta real e a alteração de palavra-passe ficam para a fase de backend.</span></div>
            </section>

            <section class="panel settings-panel" aria-label="Palavra-passe">
              <div class="panel-head">
                <h2>Palavra-passe</h2>
                <span class="badge pending">Requer backend</span>
              </div>
              <div class="settings-form">
                <div class="form-grid">
                  <label>Palavra-passe atual<input type="password" autocomplete="current-password" disabled></label>
                  <label>Nova palavra-passe<input type="password" autocomplete="new-password" disabled></label>
                </div>
                <div class="hint"><i class="fa-solid fa-lock" aria-hidden="true"></i><span>A autenticação e a política de palavras-passe serão implementadas na fase de backend.</span></div>
              </div>
            </section>
          }

          @case ('seguranca') {
            <section class="panel settings-panel" aria-label="Segurança">
              <div class="panel-head">
                <h2>Segurança</h2>
                <span class="badge pending">Parcialmente disponível</span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Sessão neste navegador</b>
                  <small>Iniciada em {{ formatar(sessao.inicio) }}</small>
                </div>
                <span class="setting-control"><span class="badge mono">{{ sessao.id }}</span></span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Autenticação de dois fatores</b>
                  <small>Código adicional no início de sessão.</small>
                </div>
                <span class="setting-control"><span class="badge pending">Requer backend</span></span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Sessões em outros dispositivos</b>
                  <small>Terminar sessões iniciadas noutros computadores ou telemóveis.</small>
                </div>
                <span class="setting-control"><span class="badge pending">Requer backend</span></span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Chaves de API</b>
                  <small>Credenciais para integrações externas.</small>
                </div>
                <span class="setting-control"><span class="badge pending">Requer backend</span></span>
              </div>
              <div class="hint"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Enquanto não existir backend, a sessão local identifica apenas este navegador e não substitui um início de sessão autenticado.</span></div>
            </section>
          }

          @case ('notificacoes') {
            <section class="panel settings-panel" aria-label="Notificações">
              <div class="panel-head">
                <h2>Notificações</h2>
                <span class="badge good">Aplicado de imediato</span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Alarmes por email</b>
                  <small>Enviar um email sempre que um alarme é detetado.</small>
                </div>
                <label class="setting-control"><input type="checkbox" [ngModel]="rascunho.notificacoes.alarmesNovos" (ngModelChange)="atualizarNotificacao('alarmesNovos', $event)"><span class="switch-label">{{ rascunho.notificacoes.alarmesNovos ? 'Ativo' : 'Inativo' }}</span></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Resumo diário</b>
                  <small>Resumo de movimentos e alarmes no final do dia.</small>
                </div>
                <label class="setting-control"><input type="checkbox" [ngModel]="rascunho.notificacoes.resumoDiario" (ngModelChange)="atualizarNotificacao('resumoDiario', $event)"><span class="switch-label">{{ rascunho.notificacoes.resumoDiario ? 'Ativo' : 'Inativo' }}</span></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Som ao detetar alarme</b>
                  <small>Sinal sonoro na aplicação quando existe uma leitura não autorizada.</small>
                </div>
                <label class="setting-control"><input type="checkbox" [ngModel]="rascunho.notificacoes.somAlarme" (ngModelChange)="atualizarNotificacao('somAlarme', $event)"><span class="switch-label">{{ rascunho.notificacoes.somAlarme ? 'Ativo' : 'Inativo' }}</span></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Limiar de alarmes</b>
                  <small>Número de alarmes por dia que acionam uma alerta de prioridade.</small>
                </div>
                <label class="setting-control"><input #limiar type="number" min="1" max="50" [ngModel]="rascunho.notificacoes.limiarAlarmes" (change)="atualizarNotificacao('limiarAlarmes', +limiar.value)" aria-label="Limiar de alarmes por dia"></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Horário de silêncio</b>
                  <small>Sem alertas sonoros entre estas horas.</small>
                </div>
                <span class="setting-control">
                  <input #silencioInicio type="time" [ngModel]="rascunho.notificacoes.silencioInicio" (change)="atualizarNotificacao('silencioInicio', silencioInicio.value)" aria-label="Início do horário de silêncio">
                  <input #silencioFim type="time" [ngModel]="rascunho.notificacoes.silencioFim" (change)="atualizarNotificacao('silencioFim', silencioFim.value)" aria-label="Fim do horário de silêncio">
                </span>
              </div>
              <div class="hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>As preferências ficam guardadas neste navegador e serão enviadas ao servidor na fase de backend.</span></div>
            </section>
          }

          @case ('sistema') {
            <section class="panel settings-panel" aria-label="Sistema">
              <div class="panel-head">
                <h2>Sistema</h2>
                <span class="badge good">Aplicado de imediato</span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Idioma</b>
                  <small>Idioma da interface.</small>
                </div>
                <label class="setting-control"><select aria-label="Idioma da interface" [ngModel]="idioma"><option value="pt-PT">Português (pt-PT)</option><option value="en" disabled>English (em breve)</option></select></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Fuso horário</b>
                  <small>Usado no relógio e nas datas da aplicação.</small>
                </div>
                <label class="setting-control"><select aria-label="Fuso horário" [ngModel]="rascunho.sistema.fuso" (ngModelChange)="atualizarSistema('fuso', $event)">@for (f of FUSOS; track f.valor) { <option [value]="f.valor">{{ f.rotulo }}</option> }</select></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Formato de hora</b>
                  <small>Relógio do topo do ecrã.</small>
                </div>
                <label class="setting-control"><select aria-label="Formato de hora" [ngModel]="rascunho.sistema.formatoHora" (ngModelChange)="atualizarSistema('formatoHora', $event)"><option value="24h">24 horas</option><option value="12h">12 horas</option></select></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Densidade das tabelas</b>
                  <small>Espaçamento das linhas em tabelas e listas.</small>
                </div>
                <label class="setting-control"><select aria-label="Densidade das tabelas" [ngModel]="rascunho.sistema.densidade" (ngModelChange)="atualizarSistema('densidade', $event)"><option value="confortavel">Confortável</option><option value="compacta">Compacta</option></select></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Animações</b>
                  <small>Transições e efeitos de movimento da interface.</small>
                </div>
                <label class="setting-control"><input type="checkbox" [ngModel]="rascunho.sistema.animacoes" (ngModelChange)="atualizarSistema('animacoes', $event)"><span class="switch-label">{{ rascunho.sistema.animacoes ? 'Ativas' : 'Desativadas' }}</span></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Tema</b>
                  <small>O modo escuro exige refatoração dos tokens de cor.</small>
                </div>
                <label class="setting-control"><select aria-label="Tema da aplicação" [ngModel]="rascunho.sistema.tema" (ngModelChange)="atualizarSistema('tema', $event)"><option value="claro">Claro</option><option value="escuro" disabled>Escuro (em breve)</option></select></label>
              </div>
              <div class="hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>As alterações são aplicadas de imediato e ficam registadas no histórico.</span></div>
            </section>
          }

          @case ('dispositivos') {
            <section class="panel settings-panel" aria-label="Leitores e portas">
              <div class="panel-head">
                <h2>Leitores e portas</h2>
                <span class="status-chip" [class.on]="arduinoLigado()"><i class="fa-solid" [class.fa-circle-check]="arduinoLigado()" [class.fa-circle-xmark]="!arduinoLigado()" aria-hidden="true"></i> {{ arduinoLigado() ? 'Ligado' : 'Desligado' }}</span>
              </div>
              <div class="settings-form">
                <div class="protocol">
                  <b><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Protocolo esperado (Arduino)</b>
                  <code>RFID:&lt;TAG_ID&gt;:&lt;PORTA_ID&gt;</code>
                  <code>Ex.: RFID:E20034118802:PORTA_LAB1</code>
                </div>
                <div class="kv">
                  @for (porta of portas(); track porta[0]) {
                    <div><span>{{ porta[0] }}</span><b>{{ porta[1] }} leitura(s)</b></div>
                  } @empty {
                    <div><span>Portas detetadas</span><b>Sem leituras registadas</b></div>
                  }
                </div>
                <div class="setting-row">
                  <div class="setting-copy">
                    <b>Mapeamento porta-laboratório</b>
                    <small>Associação de cada porta a um laboratório e respetivos leitores.</small>
                  </div>
                  <span class="setting-control"><span class="badge pending">Requer backend</span></span>
                </div>
                <div class="settings-actions">
                  <button class="outline" type="button" (click)="navegar.emit('arduino')"><i class="fa-solid fa-microchip" aria-hidden="true"></i> Abrir Arduino / Serial</button>
                </div>
              </div>
            </section>
          }

          @case ('auditoria') {
            <section class="panel settings-panel" aria-label="Histórico de alterações">
              <div class="panel-head">
                <h2>Histórico de alterações</h2>
                <span class="panel-meta">{{ auditoria().length }} registo(s)</span>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr><th>Data</th><th>Secção</th><th>Ação</th><th>Detalhe</th></tr>
                  </thead>
                  <tbody>
                    @for (registo of auditoria(); track registo.id) {
                      <tr>
                        <td class="mono">{{ formatar(registo.em) }}</td>
                        <td>{{ registo.secao }}</td>
                        <td><b>{{ registo.acao }}</b></td>
                        <td>{{ registo.detalhe }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="empty-cell">Sem alterações registadas neste navegador</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="settings-actions">
                <button class="outline" type="button" [disabled]="!auditoria().length" (click)="exportarAuditoria()"><i class="fa-solid fa-download" aria-hidden="true"></i> Exportar CSV</button>
                <button class="outline" type="button" [disabled]="!auditoria().length" (click)="pedirConfirmacao('limpar-historico')"><i class="fa-solid fa-trash" aria-hidden="true"></i> Limpar histórico</button>
              </div>
            </section>
          }

          @case ('ajuda') {
            <section class="panel settings-panel" aria-label="Ajuda e ambiente">
              <div class="panel-head">
                <h2>Ajuda e ambiente</h2>
                @if (ambienteDemo) { <span class="badge warn">Demonstração</span> } @else { <span class="badge good">Ligado ao backend</span> }
              </div>
              <div class="kv">
                <div><span>Versão da aplicação</span><b>{{ versaoApp }}</b></div>
                <div><span>Ambiente</span><b>{{ ambienteDemo ? 'Demonstração (dados de exemplo)' : 'Ligado ao backend' }}</b></div>
                <div><span>Idioma</span><b>Português (pt-PT)</b></div>
                <div><span>Fuso horário</span><b>{{ rascunho.sistema.fuso }}</b></div>
                <div><span>Última alteração local</span><b>{{ auditoria().length ? formatar(auditoria()[0].em) : '—' }}</b></div>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Fechar menus e diálogos</b>
                  <small>Tecla Escape fecha notificações, diálogos e a barra lateral em ecrãs pequenos.</small>
                </div>
                <span class="setting-control"><span class="badge info-badge">Teclado</span></span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Saltar para o conteúdo</b>
                  <small>O primeiro elemento focável do teclado leva diretamente ao conteúdo da página.</small>
                </div>
                <span class="setting-control"><span class="badge info-badge">Teclado</span></span>
              </div>
              <div class="hint"><i class="fa-solid fa-circle-question" aria-hidden="true"></i><span>Canais de suporte e contactos administrativos serão configurados na fase de backend.</span></div>
            </section>
          }

          @case ('avancado') {
            <section class="panel settings-panel" aria-label="Avançado">
              <div class="panel-head">
                <h2>Avançado</h2>
                <span class="badge pending">Dados locais</span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Exportar definições</b>
                  <small>Cria um ficheiro JSON com as preferências deste navegador.</small>
                </div>
                <span class="setting-control"><button class="outline" type="button" (click)="exportarDefinicoes()"><i class="fa-solid fa-download" aria-hidden="true"></i> Exportar</button></span>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Importar definições</b>
                  <small>Substitui as preferências atuais a partir de um ficheiro JSON.</small>
                </div>
                <label class="outline file-btn">Importar<input class="sr-only" type="file" accept="application/json,.json" aria-label="Importar definições de um ficheiro JSON" (change)="importarFicheiro($event)"></label>
              </div>
              <div class="setting-row">
                <div class="setting-copy">
                  <b>Repor valores por omissão</b>
                  <small>Apaga as preferências guardadas neste navegador.</small>
                </div>
                <span class="setting-control"><button class="danger" type="button" (click)="pedirConfirmacao('repor')"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Repor</button></span>
              </div>
              <div class="hint"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>Estas ações afetam apenas o navegador atual. Exporte as definições antes de limpar.</span></div>
            </section>
          }
        }
      </div>
    </div>

    @if (confirmacao(); as acao) {
      <section class="confirm-backdrop" role="presentation" (click)="fecharConfirmacao()">
        <section class="confirm-dialog config-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmar-configuracoes-titulo" tabindex="-1" (click)="$event.stopPropagation()" (keydown)="travarTab($event, '.config-dialog')">
          <div class="confirm-icon"><i class="fa-solid" [class.fa-rotate-left]="acao === 'repor'" [class.fa-trash]="acao !== 'repor'" aria-hidden="true"></i></div>
          <h2 id="confirmar-configuracoes-titulo">{{ acao === 'repor' ? 'Repor valores por omissão?' : 'Limpar histórico?' }}</h2>
          <p>{{ acao === 'repor' ? 'As definições guardadas neste navegador serão apagadas e o SafeLab volta aos valores originais.' : 'Os registos de alterações serão apagados deste navegador.' }}</p>
          <div class="confirm-actions">
            <button class="outline" type="button" (click)="fecharConfirmacao()">Cancelar</button>
            <button class="danger" type="button" (click)="executarConfirmacao()">{{ acao === 'repor' ? 'Repor definições' : 'Limpar histórico' }}</button>
          </div>
        </section>
      </section>
    }
  `
})
export class ConfiguracoesComponent {
  readonly eventos = input<Evento[]>([]);
  readonly arduinoLigado = input(false);
  readonly notificar = output<{ titulo: string; texto: string }>();
  readonly navegar = output<Page>();

  readonly secoes: { id: Secao; rotulo: string; icone: string }[] = [
    { id: 'conta', rotulo: 'Conta', icone: 'fa-user' },
    { id: 'seguranca', rotulo: 'Segurança', icone: 'fa-shield-halved' },
    { id: 'notificacoes', rotulo: 'Notificações', icone: 'fa-bell' },
    { id: 'sistema', rotulo: 'Sistema', icone: 'fa-sliders' },
    { id: 'dispositivos', rotulo: 'Leitores', icone: 'fa-microchip' },
    { id: 'auditoria', rotulo: 'Histórico', icone: 'fa-clock-rotate-left' },
    { id: 'ajuda', rotulo: 'Ajuda', icone: 'fa-circle-question' },
    { id: 'avancado', rotulo: 'Avançado', icone: 'fa-ellipsis' }
  ];

  readonly cargos: Cargo[] = ['ADMIN', 'COORDENADOR', 'SEGURANCA', 'DOCENTE', 'TECNICO'];
  readonly FUSOS = FUSOS;
  readonly idioma = 'pt-PT';
  readonly versaoApp = '0.1.0';
  readonly ambienteDemo = ((globalThis as { env?: { MOCK_API?: boolean } }).env?.MOCK_API) !== false;
  readonly sessao = obterSessaoLocal();

  readonly seccao = signal<Secao>('conta');
  readonly confirmacao = signal<Confirmacao | null>(null);
  readonly auditoria = signal<RegistoAuditoria[]>(carregarAuditoria());
  readonly versao = signal(0);
  readonly salvo = signal<Definicoes>(carregarDefinicoes());
  rascunho: Definicoes = structuredClone(this.salvo());

  readonly sujo = computed(() => {
    this.versao();
    return diferencaDefinicoes(this.salvo(), this.rascunho).some(alteracao => alteracao.secao === 'Conta');
  });

  readonly portas = computed(() => {
    const contagem = new Map<string, number>();
    for (const evento of this.eventos()) contagem.set(evento.portaId, (contagem.get(evento.portaId) ?? 0) + 1);
    return Array.from(contagem.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  });

  private gatilho: HTMLElement | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    try {
      const pendente = sessionStorage.getItem(CHAVE_SECCAO);
      if (pendente) {
        this.seccao.set(this.secaoValida(pendente) ? (pendente as Secao) : 'conta');
        sessionStorage.removeItem(CHAVE_SECCAO);
      }
    } catch {
      this.seccao.set('conta');
    }
    const ouvinte = (evento: Event): void => {
      const detalhe = (evento as CustomEvent).detail;
      if (typeof detalhe === 'string' && this.secaoValida(detalhe)) this.seccao.set(detalhe as Secao);
    };
    document.addEventListener(EVENTO_SECCAO, ouvinte);
    this.destroyRef.onDestroy(() => document.removeEventListener(EVENTO_SECCAO, ouvinte));
  }

  abrirSecao(sec: Secao): void {
    if (this.seccao() === sec) return;
    this.seccao.set(sec);
    focar(document.getElementById('seccao-config'));
  }

  marcarAlteracao(): void {
    this.versao.update(valor => valor + 1);
  }

  guardarConta(): void {
    const alteracoes = diferencaDefinicoes(this.salvo(), this.rascunho).filter(alteracao => alteracao.secao === 'Conta');
    if (!alteracoes.length) return;
    if (!this.rascunho.conta.nome.trim() || !this.rascunho.conta.email.trim()) {
      this.notificar.emit({ titulo: 'Dados em falta', texto: 'Preencha o nome e o email antes de guardar.' });
      return;
    }
    this.persistir(alteracoes, 'Conta', 'Conta atualizada');
  }

  reporConta(): void {
    this.rascunho.conta = structuredClone(this.salvo().conta);
    this.marcarAlteracao();
  }

  atualizarNotificacao(campo: CampoNotificacoes, valor: unknown): void {
    let novo = valor;
    if (campo === 'limiarAlarmes') {
      const numero = Number(valor);
      novo = Number.isFinite(numero) && numero > 0 ? Math.min(50, Math.round(numero)) : DEFINICOES_PADRAO.notificacoes.limiarAlarmes;
    }
    (this.rascunho.notificacoes as unknown as Record<string, unknown>)[campo] = novo;
    this.guardarGrupo('Notificações', 'Preferências de notificação atualizadas');
  }

  atualizarSistema(campo: CampoSistema, valor: unknown): void {
    (this.rascunho.sistema as unknown as Record<string, unknown>)[campo] = valor;
    this.guardarGrupo('Sistema', 'Definições de sistema atualizadas');
  }

  formatar(iso: string): string {
    return formatarDataHora(this.rascunho, iso);
  }

  exportarDefinicoes(): void {
    const conteudo = JSON.stringify(this.salvo(), null, 2);
    const ligacao = document.createElement('a');
    ligacao.href = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
    ligacao.download = 'safelab-definicoes.json';
    ligacao.click();
    URL.revokeObjectURL(ligacao.href);
    this.auditoria.set(registarAuditoria('Avançado', 'Exportação', 'Definições exportadas em JSON'));
    this.notificar.emit({ titulo: 'Definições exportadas', texto: 'Ficheiro safelab-definicoes.json criado.' });
  }

  importarFicheiro(evento: Event): void {
    const alvo = evento.target as HTMLInputElement;
    const ficheiro = alvo.files?.[0];
    alvo.value = '';
    if (!ficheiro) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(String(leitor.result)) as Partial<Definicoes>;
        if (!dados || typeof dados !== 'object' || (!dados.conta && !dados.notificacoes && !dados.sistema)) {
          this.notificar.emit({ titulo: 'Ficheiro inválido', texto: 'O ficheiro não contém definições válidas do SafeLab.' });
          return;
        }
        const importadas: Definicoes = {
          conta: { ...DEFINICOES_PADRAO.conta, ...(dados.conta ?? {}) },
          notificacoes: { ...DEFINICOES_PADRAO.notificacoes, ...(dados.notificacoes ?? {}) },
          sistema: { ...DEFINICOES_PADRAO.sistema, ...(dados.sistema ?? {}) }
        };
        const alteracoes = diferencaDefinicoes(this.salvo(), importadas);
        this.rascunho = structuredClone(importadas);
        if (!alteracoes.length) {
          this.marcarAlteracao();
          this.notificar.emit({ titulo: 'Importação concluída', texto: 'O ficheiro corresponde às definições atuais.' });
          return;
        }
        this.persistir(alteracoes, 'Avançado', 'Definições importadas');
      } catch {
        this.notificar.emit({ titulo: 'Ficheiro inválido', texto: 'Não foi possível ler o ficheiro selecionado.' });
      }
    };
    leitor.readAsText(ficheiro);
  }

  exportarAuditoria(): void {
    const linhas = this.auditoria().map(registo => [formatarDataHora(this.rascunho, registo.em), registo.secao, registo.acao, registo.detalhe].map(valor => `"${String(valor).replace(/"/g, '""')}"`).join(';'));
    const conteudo = [['Data;Secção;Ação;Detalhe', ...linhas].join('\n')];
    const ligacao = document.createElement('a');
    ligacao.href = URL.createObjectURL(new Blob(conteudo, { type: 'text/csv;charset=utf-8' }));
    ligacao.download = 'safelab-historico-definicoes.csv';
    ligacao.click();
    URL.revokeObjectURL(ligacao.href);
    this.notificar.emit({ titulo: 'Histórico exportado', texto: 'Ficheiro safelab-historico-definicoes.csv criado.' });
  }

  pedirConfirmacao(acao: Confirmacao): void {
    this.gatilho = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.confirmacao.set(acao);
    setTimeout(() => focar(document.querySelector('.settings-body .confirm-dialog')));
  }

  fecharConfirmacao(): void {
    if (!this.confirmacao()) return;
    this.confirmacao.set(null);
    focar(this.gatilho);
    this.gatilho = null;
  }

  executarConfirmacao(): void {
    const acao = this.confirmacao();
    if (acao === 'repor') {
      this.rascunho = structuredClone(DEFINICOES_PADRAO);
      const alteracoes = diferencaDefinicoes(this.salvo(), this.rascunho);
      if (alteracoes.length) {
        this.persistir(alteracoes, 'Avançado', 'Valores por omissão repostos');
      } else {
        this.marcarAlteracao();
        this.notificar.emit({ titulo: 'Valores por omissão', texto: 'As definições já se encontram nos valores originais.' });
      }
    } else if (acao === 'limpar-historico') {
      limparAuditoria();
      this.auditoria.set([]);
      this.notificar.emit({ titulo: 'Histórico limpo', texto: 'Os registos de alterações foram apagados deste navegador.' });
    }
    this.fecharConfirmacao();
  }

  travarTab(evento: KeyboardEvent, seletor: string): void {
    prenderTab(evento, document.querySelector(seletor));
  }

  @HostListener('document:keydown.escape')
  fecharPorEscape(): void {
    this.fecharConfirmacao();
  }

  private guardarGrupo(secao: 'Notificações' | 'Sistema', acao: string): void {
    const alteracoes = diferencaDefinicoes(this.salvo(), this.rascunho).filter(alteracao => alteracao.secao === secao);
    if (!alteracoes.length) return;
    this.persistir(alteracoes, secao, acao);
  }

  private persistir(alteracoes: Alteracao[], secao: string, acao: string): void {
    guardarDefinicoes(this.rascunho);
    this.salvo.set(structuredClone(this.rascunho));
    this.marcarAlteracao();
    aplicarDefinicoes(this.rascunho);
    const detalhe = alteracoes.length
      ? alteracoes.map(alteracao => `${alteracao.campo}: ${alteracao.anterior} → ${alteracao.novo}`).join(' · ')
      : 'Sem alterações face às definições atuais';
    this.auditoria.set(registarAuditoria(secao, acao, detalhe));
    document.dispatchEvent(new CustomEvent(EVENTO_DEFINICOES));
    this.notificar.emit({ titulo: acao, texto: detalhe });
  }

  private secaoValida(valor: string): boolean {
    return this.secoes.some(sec => sec.id === valor);
  }
}
