import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { ApiService, Cargo, Equipamento, Evento, Funcionario } from './api.service';
import { SerialService } from './serial.service';
import { ConfiguracoesComponent } from './configuracoes.component';
import { LoginComponent } from './login.component';
import { carregarSessao, guardarSessao, SessaoUtilizador, terminarSessaoLocal } from './autenticacao';
import { aplicarDefinicoes, carregarDefinicoes, CHAVE_SECCAO, Definicoes, EVENTO_DEFINICOES, EVENTO_SECCAO, formatarRelogio } from './definicoes';
import { focar, prenderTab, soltarFundo, travarFundo } from './foco';
import type { Page } from './tipos';

type AlarmFilter = 'all' | 'pending' | 'acknowledged';
type EquipmentSort = 'nome' | 'laboratorio' | 'estado' | 'tagRfid';
interface NavItem { id: Page; label: string; icon: string; badge?: () => number; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfiguracoesComponent, LoginComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (sessao()) {
  <button class="skip-link" type="button" (click)="focarConteudo()">Saltar para o conteúdo</button>
  <aside class="sidebar" [class.expanded]="sidebarOpen()">
    <button class="collapse" (click)="sidebarOpen.set(!sidebarOpen())" [attr.aria-expanded]="sidebarOpen()" [attr.aria-label]="sidebarOpen() ? 'Recolher menu' : 'Expandir menu'"><i class="fa-solid" [class.fa-chevron-left]="sidebarOpen()" [class.fa-chevron-right]="!sidebarOpen()" aria-hidden="true"></i></button>
    <div class="brand"><div class="shield" aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></div><span>SafeLab</span></div>
    @for (group of navGroups; track group.label) {
      <div class="nav-group"><div class="nav-label">{{ group.label }}</div>
        @for (item of group.items; track item.id) {
          <button class="nav-item" [class.active]="page() === item.id" [attr.aria-current]="page() === item.id ? 'page' : null" (click)="navigate(item.id)">
            <i class="fa-solid" [ngClass]="item.icon" aria-hidden="true"></i><span class="nav-text">{{ item.label }}</span>
            @if (item.badge && item.badge() > 0) { <span class="nav-badge">{{ item.badge() }}</span> }
          </button>
        }
      </div>
    }
    <div class="user"><div class="avatar">{{ iniciais() }}</div><div class="user-copy"><b>{{ sessao()?.nome }}</b><small>{{ cargoLabel() }}</small></div><button class="link user-logout" type="button" (click)="terminarSessao()" aria-label="Terminar sessão"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i></button></div>
  </aside>
  <button class="sidebar-scrim" (click)="sidebarOpen.set(false)" aria-label="Fechar menu"></button>
  <main class="main" id="conteudo" tabindex="-1" [class.sidebar-expanded]="sidebarOpen()">
    @if (offline()) { <div class="offline" role="alert"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Sem ligação ao servidor — os dados podem estar desatualizados <button class="link" (click)="refresh()">Tentar novamente</button></div> }
    @if (api.mock) { <div class="demo-banner"><i class="fa-solid fa-flask" aria-hidden="true"></i> Modo demonstração — os dados apresentados são fictícios e não representam o sistema real.</div> }
    <header class="topbar"><div class="topbar-context"><nav class="breadcrumbs" aria-label="Breadcrumb"><button (click)="navigate('dashboard')">SafeLab</button><span aria-hidden="true">/</span><span aria-current="page">{{ pageTitle() }}</span></nav><h1>{{ pageTitle() }}</h1><span>{{ pageSubtitle() }}</span></div><div class="top-actions">
      @if (page() === 'dashboard') { <label class="global-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input placeholder="Pesquisar equipamentos e utilizadores..." aria-label="Pesquisar equipamentos e utilizadores" [ngModel]="pesquisaGlobalValor()" (ngModelChange)="pesquisaGlobalValor.set($event)" (keyup.enter)="pesquisarGlobal()"></label> }
      <div class="topbar-status"><span class="utility-status" title="Idioma: Português (pt-PT)">PT</span><button class="utility-status help" type="button" (click)="abrirAjuda()" aria-label="Abrir ajuda e suporte"><i class="fa-solid fa-circle-question" aria-hidden="true"></i></button><button class="serial-pill" [class.connected]="serial.connected()" [class.disconnected]="!serial.connected()" (click)="navigate('arduino')" [attr.aria-label]="serial.connected() ? 'Arduino ligado, abrir ligação serial' : 'Arduino desligado, abrir ligação serial'"><i class="fa-solid fa-microchip" aria-hidden="true"></i><span>{{ serial.connected() ? 'Arduino ligado' : 'Arduino desligado' }}</span></button><time [attr.datetime]="nowIso()">{{ clock() }}</time><span class="sync-state" [class.offline]="offline()"><i class="fa-solid" [class.fa-circle-check]="!offline()" [class.fa-triangle-exclamation]="offline()" aria-hidden="true"></i>{{ syncLabel() }}</span></div><div class="topbar-actions"><button class="outline" (click)="refresh()" [disabled]="loading()" aria-label="Actualizar dados"><i class="fa-solid fa-arrows-rotate" [class.fa-spin]="loading()" aria-hidden="true"></i> <span>{{ loading() ? 'A actualizar...' : 'Actualizar' }}</span></button><button class="bell" type="button" (click)="alternarNotificacoes($event)" [attr.aria-expanded]="notificationsOpen()" [attr.aria-label]="notificationsOpen() ? 'Fechar notificações' : 'Abrir notificações'"><i class="fa-solid fa-bell" aria-hidden="true"></i> @if (notifications().length) { <em>{{ notifications().length }}</em> }</button><div class="top-avatar" [attr.aria-label]="'Sessão iniciada como ' + (sessao()?.nome ?? '')">{{ iniciais() }}</div></div>
    </div></header>
    @if (notificationsOpen()) { <section class="notification-pop" role="dialog" aria-label="Notificações" (keydown)="travarTab($event, '.notification-pop')"><div class="notification-head"><b>Notificações</b>    <button class="close" type="button" (click)="fecharNotificacoes()" aria-label="Fechar notificações"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>@if (!notifications().length) { <p>Sem notificações</p> } @for (note of notifications(); track note.id) { <p><strong>{{ note.title }}</strong><br><span>{{ note.body }}</span></p> }</section> }
    <div class="content">
      @if (loading()) { <div class="loading-state" role="status" aria-live="polite"><span></span><span></span><span></span><b>A sincronizar dados</b></div> }
      @switch (page()) {
        @case ('dashboard') { <ng-container *ngTemplateOutlet="dashboard"></ng-container> }
        @case ('equipamentos') { <ng-container *ngTemplateOutlet="equipmentPage"></ng-container> }
        @case ('utilizadores') { <ng-container *ngTemplateOutlet="userPage"></ng-container> }
        @case ('movimentos') { <ng-container *ngTemplateOutlet="movimentos"></ng-container> }
        @case ('alarmes') { <ng-container *ngTemplateOutlet="alarmPage"></ng-container> }
        @case ('arduino') { <ng-container *ngTemplateOutlet="arduino"></ng-container> }
        @case ('configuracoes') { <app-configuracoes [eventos]="eventos()" [arduinoLigado]="serial.connected()" (notificar)="notify($event.titulo, $event.texto)" (navegar)="navigate($event)"></app-configuracoes> }
        @default { <ng-container *ngTemplateOutlet="placeholder"></ng-container> }
      }
    </div>
    @if (toasts().length) { <div class="toasts" role="status" aria-live="polite">@for (toast of toasts(); track toast.id) { <div class="toast" [class.erro]="toast.tipo === 'erro'"><b>{{ toast.titulo }}</b><p>{{ toast.texto }}</p></div> }</div> }
  </main>

  <ng-template #dashboard>
    <section class="dashboard-intro"><div><p class="eyebrow">CENTRO DE CONTROLO · {{ clock() }}</p><h2>{{ saudacao() }}, {{ nomeCurto() }}</h2><p>Resumo operacional do seu património e acessos laboratoriais.</p></div><button class="primary" (click)="novoRegisto()"><i class="fa-solid fa-plus" aria-hidden="true"></i> Novo registo</button></section>
    <div class="stats">
      <article class="stat featured"><div><span>Equipamentos</span><strong>{{ equipamentos().length }}</strong><small>{{ labs().length }} laboratórios</small></div></article>
      <article class="stat"><div><span>Utilizadores ativos</span><strong>{{ utilizadoresAtivos() }}</strong><small>{{ funcionarios().length }} registados</small></div></article>
      <article class="stat"><div><span>Alarmes</span><strong>{{ alarmes().length }}</strong><small [class.negative]="alarmesPendentes() > 0">{{ alarmesPendentes() > 0 ? alarmesPendentes() + ' por tratar' : 'Sem pendentes' }}</small></div></article>
      <article class="stat"><div><span>Movimentos registados</span><strong>{{ eventos().length }}</strong><small>{{ alarmes().length }} com alarme</small></div></article>
    </div>
    <section class="profile-section"><div class="section-title"><div><p class="eyebrow">ENTIDADES AUTORIZADAS</p><h2>Perfis em destaque</h2></div><button class="link" (click)="navigate('utilizadores')">Ver utilizadores <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div><div class="profile-grid">
      @for (user of funcionarios().slice(0, 4); track user.id) { <article class="profile-card"><div class="profile-avatar">{{ user.nome.charAt(0) }}</div><div class="profile-copy"><b>{{ user.nome }}</b><span>{{ user.cargo }}</span><small>{{ user.tagRfid }}</small></div><span class="profile-status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Activo</span></article> }
      @empty { <div class="empty">Sem utilizadores registados <button class="link" (click)="abrirFormUtilizador()">Registar o primeiro utilizador <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div> }
    </div></section>
    <div class="insight-grid"><section class="panel summary-card"><div class="panel-head"><div><p class="eyebrow">PATRIMÓNIO</p><h2>Saúde do inventário</h2></div></div><div class="summary-score"><strong>{{ coberturaRfid() }}<span>%</span></strong><div><b>Cobertura RFID</b><p>Partilha de equipamentos com tag RFID registada no inventário.</p></div></div><div class="summary-list"><div><span>No laboratório</span><b>{{ availableEquipment() }}</b></div><div><span>Em manutenção</span><b>{{ maintenanceEquipment() }}</b></div><div><span>Fora do laboratório</span><b>{{ foraLaboratorio() }}</b></div></div><button class="primary" (click)="navigate('equipamentos')"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> Abrir inventário</button></section>
      <section class="panel activity-chart"><div class="panel-head"><div><p class="eyebrow">ACTIVIDADE</p><h2>Movimentos nos últimos 7 dias</h2></div><span class="panel-meta">{{ activityTotal() }} eventos</span></div><div class="chart" role="img" [attr.aria-label]="'Eventos por dia nos últimos sete dias: ' + activityTotal() + ' no total'">@for (bar of bars(); track $index) {<div [attr.title]="activityValues()[$index] + ' eventos — ' + diasAtividade()[$index].data"><i [class.today]="$index === 6" [class.zero]="activityValues()[$index] === 0" [style.height.%]="bar"></i><small>{{ diasAtividade()[$index].rotulo }}</small></div>}</div><div class="chart-legend"><span><i></i> Total de movimentos</span><b>Últimos 7 dias</b></div></section></div>
    <div class="lower-grid"><section class="panel table-panel"><div class="panel-head"><div><p class="eyebrow">MONITORIZAÇÃO</p><h2>Alarmes recentes</h2></div><button class="link" (click)="navigate('alarmes')">Ver todos <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div><div class="filter-pills"><button [class.active]="alarmFilter() === 'all'" [attr.aria-pressed]="alarmFilter() === 'all'" (click)="alarmFilter.set('all')">Todos <b>{{ alarmes().length }}</b></button><button [class.active]="alarmFilter() === 'pending'" [attr.aria-pressed]="alarmFilter() === 'pending'" (click)="alarmFilter.set('pending')">Por tratar</button><button [class.active]="alarmFilter() === 'acknowledged'" [attr.aria-pressed]="alarmFilter() === 'acknowledged'" (click)="alarmFilter.set('acknowledged')">Reconhecidos</button></div><div class="table-wrap"><table><thead><tr><th>Identificador</th><th>Porta</th><th>Estado</th><th>Hora</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>@for (event of dashboardAlarms().slice(0, 5); track event.id) { <tr><td><b class="mono">{{ event.tagLida }}</b><small>{{ event.observacao || 'Leitura não autorizada' }}</small></td><td>{{ event.portaId }}</td><td><span class="badge bad">{{ isAcknowledged(event) ? 'RECONHECIDO' : 'ALARME' }}</span></td><td>{{ formatDate(event.ocorridoEm) }}</td><td><button class="table-action" (click)="acknowledgeAlarm(event)" [disabled]="isAcknowledged(event)">{{ isAcknowledged(event) ? 'Tratado' : 'Reconhecer' }}</button></td></tr>} @empty {<tr><td colspan="5" class="empty-cell">Sem alarmes recentes</td></tr>}</tbody></table></div></section>
      <aside class="panel recent-panel"><div class="panel-head"><div><p class="eyebrow">TEMPO REAL</p><h2>Actividade recente</h2></div><span class="live" [class.paused]="offline()"><i class="fa-solid fa-circle" aria-hidden="true"></i> {{ offline() ? 'Offline' : 'Live' }}</span></div>@for (event of eventos().slice(0, 4); track event.id) { <div class="recent-item"><div class="recent-avatar" [class.alert]="event.resultado === 'ALARME'"><i class="fa-solid" [class.fa-triangle-exclamation]="event.resultado === 'ALARME'" [class.fa-check]="event.resultado !== 'ALARME'" aria-hidden="true"></i></div><div><b>{{ event.observacao || event.resultado }}</b><p>{{ event.tagLida }} · {{ event.portaId }}</p></div><time>{{ formatDate(event.ocorridoEm) }}</time></div> } @empty { <div class="empty">Sem actividade</div> }</aside>
    </div>
  </ng-template>

  <ng-template #equipmentPage><section class="page-head"><div><h2>Equipamentos</h2><p>Inventário e património registado</p></div><button class="primary" (click)="openEquipmentForm()"><i class="fa-solid fa-plus" aria-hidden="true"></i> Registar equipamento</button></section>
    @if (equipmentForm()) { <section class="panel form-panel"><div class="panel-head"><h2>{{ editingEquipmentId() ? 'Editar equipamento' : 'Novo equipamento' }}</h2><button class="close" type="button" (click)="closeEquipmentForm()" aria-label="Fechar formulário de equipamento"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><form (ngSubmit)="saveEquipment()"><div class="form-grid"><label>Tag RFID *<input name="tagRfid" [(ngModel)]="newEquipment.tagRfid" required></label><label>Nome *<input name="nome" [(ngModel)]="newEquipment.nome" required></label><label>Número de série *<input name="numeroSerie" [(ngModel)]="newEquipment.numeroSerie" required></label><label>Laboratório *<input name="laboratorio" [(ngModel)]="newEquipment.laboratorio" required></label><label>Estado *<select name="estado" [(ngModel)]="newEquipment.estado" required><option value="NO_LABORATORIO">No laboratório</option><option value="FORA_DO_LABORATORIO">Fora do laboratório</option><option value="EM_MANUTENCAO">Em manutenção</option></select></label><label class="wide">Descrição<input name="descricao" [(ngModel)]="newEquipment.descricao"></label></div><button class="primary" type="submit">{{ editingEquipmentId() ? 'Guardar alterações' : 'Guardar equipamento' }}</button></form></section> }
    @if (equipmentDeleteTarget() || batchDeleteTarget().length) { <section class="confirm-backdrop" role="presentation" (click)="closeDeleteDialog()"><section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-equipment-title" tabindex="-1" (click)="$event.stopPropagation()" (keydown)="travarTab($event, '.confirm-dialog')"><div class="confirm-icon"><i class="fa-solid fa-trash" aria-hidden="true"></i></div><h2 id="delete-equipment-title">Remover {{ batchDeleteTarget().length ? 'equipamentos' : 'equipamento' }}?</h2><p>{{ batchDeleteTarget().length ? 'Esta ação irá remover ' + batchDeleteTarget().length + ' equipamentos do inventário.' : 'Esta ação irá remover ' + equipmentDeleteTarget()?.nome + ' do inventário.' }}</p><div class="confirm-actions"><button class="outline" type="button" (click)="closeDeleteDialog()">Cancelar</button><button class="danger" type="button" (click)="batchDeleteTarget().length ? confirmBatchRemove() : confirmRemoveEquipment()">Remover {{ batchDeleteTarget().length ? 'selecionados' : 'equipamento' }}</button></div></section></section> }
    <section class="panel"><div class="toolbar equipment-toolbar"><div class="equipment-search"><label for="equipment-search">Pesquisar equipamentos</label><input id="equipment-search" placeholder="Nome ou tag RFID..." aria-label="Pesquisar equipamentos" [ngModel]="equipmentSearchValue()" (ngModelChange)="equipmentSearchValue.set($event)"></div><label class="equipment-filter">Estado<select aria-label="Filtrar por estado" [ngModel]="equipmentStatusFilter()" (ngModelChange)="equipmentStatusFilter.set($event)"><option value="all">Todos os estados</option><option value="NO_LABORATORIO">No laboratório</option><option value="FORA_DO_LABORATORIO">Fora do laboratório</option><option value="EM_MANUTENCAO">Em manutenção</option></select></label><label class="equipment-filter">Laboratório<select aria-label="Filtrar por laboratório" [ngModel]="equipmentLabFilter()" (ngModelChange)="equipmentLabFilter.set($event)"><option value="all">Todos os laboratórios</option>@for (lab of equipmentLabs(); track lab) {<option [value]="lab">{{ lab }}</option>}</select></label><label class="equipment-filter">Ordenar<select aria-label="Ordenar equipamentos" [ngModel]="equipmentSort()" (ngModelChange)="equipmentSort.set($event)"><option value="nome">Nome</option><option value="laboratorio">Laboratório</option><option value="estado">Estado</option><option value="tagRfid">Tag RFID</option></select></label><span>{{ filteredEquipamentos().length }} de {{ equipamentos().length }} registos</span></div>@if (selectedEquipmentIds().length) { <div class="batch-toolbar" role="toolbar" aria-label="Ações em lote"><strong>{{ selectedEquipmentIds().length }} selecionado(s)</strong><label>Alterar estado<select aria-label="Estado para ação em lote" [ngModel]="batchStatus()" (ngModelChange)="batchStatus.set($event)"><option value="NO_LABORATORIO">No laboratório</option><option value="FORA_DO_LABORATORIO">Fora do laboratório</option><option value="EM_MANUTENCAO">Em manutenção</option></select></label><button class="primary" type="button" (click)="applyBatchStatus()"><i class="fa-solid fa-check" aria-hidden="true"></i> Aplicar estado</button><button class="danger" type="button" (click)="openBatchDelete()"><i class="fa-solid fa-trash" aria-hidden="true"></i> Remover selecionados</button><button class="outline" type="button" (click)="clearSelection()">Limpar seleção</button></div> } @if (loading() && !equipamentos().length) { <div class="equipment-skeleton" role="status" aria-label="A carregar equipamentos"><span></span><span></span><span></span></div> } @else { <div class="table-wrap equipment-table"><table><thead><tr><th><input type="checkbox" aria-label="Selecionar todos os equipamentos visíveis" [checked]="allVisibleSelected()" (change)="toggleAllVisible()"></th><th>Equipamento</th><th>Tag RFID</th><th>Laboratório</th><th>Estado</th><th>Ações</th></tr></thead><tbody>@for (item of filteredEquipamentos(); track item.id) {<tr><td><input type="checkbox" [attr.aria-label]="'Selecionar ' + item.nome" [checked]="isSelected(item.id)" (change)="toggleSelection(item.id)"></td><td><b>{{ item.nome }}</b><small>{{ item.numeroSerie }}</small></td><td class="mono">{{ item.tagRfid }}</td><td>{{ item.laboratorio }}</td><td><span class="badge" [class.good]="item.estado === 'NO_LABORATORIO'" [class.warn]="item.estado === 'EM_MANUTENCAO'">{{ estadoLabel(item.estado) }}</span></td><td class="row-actions"><button class="icon-btn action-text" type="button" (click)="openEditEquipment(item)" [attr.aria-label]="'Editar ' + item.nome"><i class="fa-solid fa-pen" aria-hidden="true"></i><span>Editar</span></button><button class="icon-btn danger-text action-text" type="button" (click)="removeEquipment(item)" [attr.aria-label]="'Remover ' + item.nome"><i class="fa-solid fa-trash" aria-hidden="true"></i><span>Remover</span></button></td></tr>} @empty {<tr><td colspan="6" class="empty-cell"><i class="fa-solid fa-box-open" aria-hidden="true"></i><span>Sem equipamentos encontrados</span><button class="link" (click)="openEquipmentForm()">Registar equipamento <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></td></tr>}</tbody></table></div><div class="equipment-mobile-list">@for (item of filteredEquipamentos(); track item.id) {<article class="equipment-mobile-card"><div class="equipment-mobile-head"><label class="select-equipment"><input type="checkbox" [attr.aria-label]="'Selecionar ' + item.nome" [checked]="isSelected(item.id)" (change)="toggleSelection(item.id)"><span>Selecionar</span></label><span class="badge" [class.good]="item.estado === 'NO_LABORATORIO'" [class.warn]="item.estado === 'EM_MANUTENCAO'">{{ estadoLabel(item.estado) }}</span></div><div><b>{{ item.nome }}</b><small>{{ item.numeroSerie }}</small></div><dl><div><dt>Tag RFID</dt><dd class="mono">{{ item.tagRfid }}</dd></div><div><dt>Laboratório</dt><dd>{{ item.laboratorio }}</dd></div></dl><div class="equipment-mobile-actions"><button class="outline action-text" type="button" (click)="openEditEquipment(item)"><i class="fa-solid fa-pen" aria-hidden="true"></i> Editar</button><button class="danger action-text" type="button" (click)="removeEquipment(item)"><i class="fa-solid fa-trash" aria-hidden="true"></i> Remover</button></div></article>} @empty {<div class="mobile-empty"><i class="fa-solid fa-box-open" aria-hidden="true"></i><b>Sem equipamentos encontrados</b><button class="link" (click)="openEquipmentForm()">Registar equipamento</button></div>}</div> }</section>
  </ng-template>

  <ng-template #userPage><section class="page-head"><div><h2>Utilizadores</h2><p>Funcionários com acesso RFID ao laboratório</p></div><button class="primary" (click)="alternarFormUtilizador()"><i class="fa-solid fa-plus" aria-hidden="true"></i> Registar funcionário</button></section>
    @if (userForm()) {<section class="panel form-panel"><div class="panel-head"><h2>Novo funcionário</h2>    <button class="close" (click)="fecharFormUtilizador()" aria-label="Fechar formulário de funcionário"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><form (ngSubmit)="saveUser()"><div class="form-grid"><label>Tag RFID *<input name="tagRfid" [(ngModel)]="newUser.tagRfid" required></label><label>Nome *<input name="nome" [(ngModel)]="newUser.nome" required></label><label>Email *<input name="email" type="email" [(ngModel)]="newUser.email" required></label><label>Telefone<input name="telefone" [(ngModel)]="newUser.telefone"></label><label>Cargo *<select name="cargo" [(ngModel)]="newUser.cargo"><option value="ADMIN">ADMIN</option><option value="COORDENADOR">COORDENADOR</option><option value="SEGURANCA">SEGURANCA</option><option value="DOCENTE">DOCENTE</option><option value="TECNICO">TECNICO</option></select></label></div><button class="primary" type="submit">Guardar funcionário</button></form></section>}
    <section class="panel"><div class="toolbar"><label class="sr-only" for="user-search">Pesquisar utilizadores</label><input id="user-search" placeholder="Pesquisar utilizadores..." aria-label="Pesquisar utilizadores" [ngModel]="userSearchValue()" (ngModelChange)="userSearchValue.set($event)"><span>{{ filteredFuncionarios().length }} registos</span></div><div class="table-wrap"><table><thead><tr><th>Utilizador</th><th>Tag RFID</th><th>Cargo</th><th>Email</th><th></th></tr></thead><tbody>@for (user of filteredFuncionarios(); track user.id) {<tr><td><b>{{ user.nome }}</b></td><td class="mono">{{ user.tagRfid }}</td><td><span class="badge info-badge">{{ user.cargo }}</span></td><td>{{ user.email }}</td><td><button class="icon-btn danger-text" (click)="removeUser(user)" [attr.aria-label]="'Remover ' + user.nome"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></td></tr>} @empty {<tr><td colspan="5" class="empty-cell">Sem utilizadores registados <button class="link" (click)="abrirFormUtilizador()">Registar o primeiro utilizador <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></td></tr>}</tbody></table></div></section>
    @if (confirmarUtilizador(); as utilizador) { <section class="confirm-backdrop" role="presentation" (click)="fecharConfirmacaoUtilizador()"><section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" tabindex="-1" (click)="$event.stopPropagation()" (keydown)="travarTab($event, '.confirm-dialog')"><div class="confirm-icon"><i class="fa-solid fa-trash" aria-hidden="true"></i></div><h2 id="delete-user-title">Remover utilizador?</h2><p>{{ utilizador.nome }} deixa de ter acesso RFID ao laboratório. Esta ação não pode ser anulada.</p><div class="confirm-actions"><button class="outline" type="button" (click)="fecharConfirmacaoUtilizador()">Cancelar</button><button class="danger" type="button" (click)="confirmarRemocaoUtilizador()">Remover utilizador</button></div></section></section> }
  </ng-template>

  <ng-template #movimentos><ng-container *ngTemplateOutlet="eventPage; context: {title: 'Movimentos', subtitle: 'Histórico de entradas e saídas'}"></ng-container></ng-template>
  <ng-template #alarmPage><ng-container *ngTemplateOutlet="eventPage; context: {title: 'Alarmes', subtitle: 'Incidentes que requerem atenção'}"></ng-container></ng-template>
  <ng-template #eventPage let-title="title" let-subtitle="subtitle"><section class="page-head"><div><h2>{{ title }}</h2><p>{{ subtitle }}</p></div><button class="outline" (click)="exportEvents()"><i class="fa-solid fa-download" aria-hidden="true"></i> Exportar CSV</button></section><section class="panel"><div class="table-wrap"><table><thead><tr><th>Tag</th><th>Porta</th><th>Tipo</th><th>Resultado</th><th>Data/Hora</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>@for (event of (page() === 'alarmes' ? alarmes() : eventos()); track event.id) {<tr><td class="mono">{{ event.tagLida }}</td><td>{{ event.portaId }}</td><td>{{ event.tipo }}</td><td><span class="badge" [class.bad]="event.resultado === 'ALARME'" [class.good]="event.resultado === 'AUTORIZADO'">{{ isAcknowledged(event) ? 'RECONHECIDO' : event.resultado }}</span></td><td>{{ formatDate(event.ocorridoEm) }}</td><td>@if (event.resultado === 'ALARME') {<button class="table-action" (click)="acknowledgeAlarm(event)" [disabled]="isAcknowledged(event)">{{ isAcknowledged(event) ? 'Tratado' : 'Reconhecer' }}</button>}</td></tr>} @empty {<tr><td colspan="6" class="empty-cell">{{ offline() ? 'Não foi possível carregar os dados' : 'Sem movimentos registados' }}</td></tr>}</tbody></table></div></section></ng-template>

  <ng-template #arduino><section class="page-head"><div><h2>Arduino / Serial</h2><p>Leitor RFID e consola de comunicação</p></div><span class="status-chip" [class.on]="serial.connected()"><i class="fa-solid" [class.fa-circle-check]="serial.connected()" [class.fa-circle-xmark]="!serial.connected()" aria-hidden="true"></i> {{ serial.connected() ? 'Ligado' : 'Desligado' }}</span></section><div class="serial-grid"><section class="panel serial-control"><div class="panel-head"><h2><i class="fa-solid fa-plug" aria-hidden="true"></i> Ligação serial</h2></div><label>Baud Rate<select [(ngModel)]="baudRate"><option [ngValue]="9600">9600</option><option [ngValue]="115200">115200</option></select></label><div class="serial-buttons">@if (!serial.connected()) {<button class="primary" (click)="connectSerial()"><i class="fa-solid fa-plug" aria-hidden="true"></i> Ligar</button>} @else {<button class="danger" (click)="disconnectSerial()"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i> Desligar</button>}</div><div class="protocol"><b><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Protocolo esperado (Arduino)</b><code>RFID:&lt;TAG_ID&gt;:&lt;PORTA_ID&gt;</code><code>Ex: RFID:E20034118802:PORTA_LAB1</code></div></section><section class="panel"><div class="panel-head"><h2><i class="fa-solid fa-terminal" aria-hidden="true"></i> Consola Serial</h2><button class="link" (click)="serial.lines.set([])">Limpar</button></div><div class="console">@for (line of serial.lines(); track $index) {<div><time>{{ line.time }}</time><span [class]="line.type">{{ line.text }}</span></div>}</div><div class="send"><input placeholder="Enviar comando manual..." aria-label="Enviar comando manual" [(ngModel)]="serialCommand" (keyup.enter)="sendSerial()"><button class="outline" (click)="sendSerial()" aria-label="Enviar comando"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></div></section></div></ng-template>
  <ng-template #placeholder><section class="empty-page"><div><i class="fa-solid fa-layer-group" aria-hidden="true"></i></div><h2>{{ pageTitle() }}</h2><p>Este módulo ainda não está disponível e está previsto para uma fase posterior de desenvolvimento.</p><button class="outline" type="button" (click)="navigate('dashboard')">Voltar ao Dashboard</button></section></ng-template>
  } @else {
  <app-login (entrar)="iniciarSessao($event)" />
  }
  `,
  styles: []
})
export class AppComponent {
  readonly api = inject(ApiService); readonly serial = inject(SerialService); readonly router = inject(Router);
  readonly sessao = signal<SessaoUtilizador | null>(carregarSessao());
  readonly page = signal<Page>('dashboard'); readonly sidebarOpen = signal(true); readonly offline = signal(false); readonly loading = signal(false); readonly notificationsOpen = signal(false); readonly acknowledgedAlarms = signal<number[]>([]);
  readonly lastSync = signal<Date | null>(null);
  readonly definicoes = signal<Definicoes>(carregarDefinicoes());
  readonly confirmarUtilizador = signal<Funcionario | null>(null);
  readonly toasts = signal<{ id: number; titulo: string; texto: string; tipo: 'info' | 'erro' }[]>([]);
  private gatilho: HTMLElement | null = null;
  private proximoToast = 1;
  readonly clock = signal('00:00:00'); readonly equipamentos = signal<Equipamento[]>([]); readonly funcionarios = signal<Funcionario[]>([]); readonly eventos = signal<Evento[]>([]); readonly alarmes = signal<Evento[]>([]); readonly resumo = signal<{alarmes24h:number;totalEventos:number;horaServidor:string}|null>(null); readonly notifications = signal<{id:number;title:string;body:string;time:string}[]>([]);
  readonly equipmentForm = signal(false); readonly userForm = signal(false); readonly alarmFilter = signal<AlarmFilter>('all'); readonly editingEquipmentId = signal<number | null>(null); readonly equipmentDeleteTarget = signal<Equipamento | null>(null); readonly batchDeleteTarget = signal<Equipamento[]>([]); readonly selectedEquipmentIds = signal<number[]>([]); readonly batchStatus = signal<Equipamento['estado']>('NO_LABORATORIO'); readonly equipmentStatusFilter = signal<Equipamento['estado'] | 'all'>('all'); readonly equipmentLabFilter = signal<string | 'all'>('all'); readonly equipmentSort = signal<EquipmentSort>('nome');
  readonly newEquipment: Partial<Equipamento> = { tagRfid:'', nome:'', numeroSerie:'', laboratorio:'', descricao:'', estado:'NO_LABORATORIO' }; readonly newUser: Partial<Funcionario> = {tagRfid:'',nome:'',email:'',telefone:'',cargo:'DOCENTE'};
  readonly equipmentSearchValue = signal(''); readonly userSearchValue = signal(''); readonly pesquisaGlobalValor = signal(''); baudRate = 115200; serialCommand = '';
  readonly equipmentLabs = computed(() => Array.from(new Set(this.equipamentos().map(x => x.laboratorio))).sort((a, b) => a.localeCompare(b)));
  readonly filteredEquipamentos = computed(() => this.equipamentos().filter(x => (this.equipmentStatusFilter() === 'all' || x.estado === this.equipmentStatusFilter()) && (this.equipmentLabFilter() === 'all' || x.laboratorio === this.equipmentLabFilter()) && (x.nome.toLowerCase().includes(this.equipmentSearchValue().toLowerCase()) || x.tagRfid.toLowerCase().includes(this.equipmentSearchValue().toLowerCase()))).sort((a,b) => a[this.equipmentSort()].localeCompare(b[this.equipmentSort()])));
  readonly filteredFuncionarios = computed(() => this.funcionarios().filter(x => x.nome.toLowerCase().includes(this.userSearchValue().toLowerCase()) || x.email.toLowerCase().includes(this.userSearchValue().toLowerCase())));
  readonly availableEquipment = computed(() => this.equipamentos().filter(item => item.estado === 'NO_LABORATORIO').length);
  readonly maintenanceEquipment = computed(() => this.equipamentos().filter(item => item.estado === 'EM_MANUTENCAO').length);
  readonly foraLaboratorio = computed(() => this.equipamentos().filter(item => item.estado === 'FORA_DO_LABORATORIO').length);
  readonly utilizadoresAtivos = computed(() => this.funcionarios().filter(item => item.activo).length);
  readonly alarmesPendentes = computed(() => this.alarmes().filter(event => !this.isAcknowledged(event)).length);
  readonly coberturaRfid = computed(() => this.equipamentos().length ? Math.round(this.equipamentos().filter(item => item.tagRfid.trim()).length / this.equipamentos().length * 100) : 0);
  readonly dashboardAlarms = computed(() => this.alarmes().filter(event => this.alarmFilter() === 'all' || (this.alarmFilter() === 'acknowledged' ? this.isAcknowledged(event) : !this.isAcknowledged(event))));
  readonly labs = computed(() => Array.from(new Set(this.equipamentos().map(x => x.laboratorio))).map(name => ({name, count:this.equipamentos().filter(x=>x.laboratorio===name).length, percent:Math.min(100, this.equipamentos().filter(x=>x.laboratorio===name).length*20)})));
  readonly diasAtividade = computed(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const rotulos = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return Array.from({ length: 7 }, (_, index) => {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - (6 - index));
      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 1);
      const total = this.eventos().filter(evento => { const momento = new Date(evento.ocorridoEm).getTime(); return momento >= inicio.getTime() && momento < fim.getTime(); }).length;
      return { rotulo: rotulos[inicio.getDay()], data: `${String(inicio.getDate()).padStart(2, '0')}/${String(inicio.getMonth() + 1).padStart(2, '0')}`, total };
    });
  });
  readonly activityValues = computed(() => this.diasAtividade().map(dia => dia.total));
  readonly activityTotal = computed(() => this.activityValues().reduce((sum, value) => sum + value, 0));
  readonly bars = computed(() => { const values = this.activityValues(); const max = Math.max(...values, 1); return values.map(value => value === 0 ? 0 : Math.max(8, Math.round(value / max * 95))); });
  readonly navGroups: {label:string;items:NavItem[]}[] = [{label:'Principal',items:[{id:'dashboard',label:'Dashboard',icon:'fa-house'},{id:'movimentos',label:'Movimentos',icon:'fa-right-left',badge:()=>this.eventos().length},{id:'alarmes',label:'Alarmes',icon:'fa-triangle-exclamation',badge:()=>this.alarmes().length}]},{label:'Registos',items:[{id:'equipamentos',label:'Equipamentos',icon:'fa-boxes-stacked'},{id:'utilizadores',label:'Utilizadores',icon:'fa-users'},{id:'perfis',label:'Perfis & Acesso',icon:'fa-user-shield'}]},{label:'Sistema',items:[{id:'arduino',label:'Arduino / Serial',icon:'fa-microchip'},{id:'notificacoes',label:'Notificações',icon:'fa-bell'},{id:'configuracoes',label:'Configurações',icon:'fa-gear'}]}];
  readonly iniciais = computed(() => (this.sessao()?.nome || '?').trim().split(/\s+/).map(parte => parte.charAt(0)).slice(0, 2).join('').toUpperCase());
  readonly nomeCurto = computed(() => (this.sessao()?.nome || '').trim().split(/\s+/)[0] || 'Utilizador');
  readonly cargoLabel = computed(() => ({ ADMIN: 'Administrador', COORDENADOR: 'Coordenador', SEGURANCA: 'Segurança', DOCENTE: 'Docente', TECNICO: 'Técnico' } as Record<string, string>)[this.sessao()?.cargo ?? ''] ?? this.sessao()?.cargo ?? '');
  readonly saudacao = computed(() => { const hora = new Date().getHours(); return hora < 12 ? 'Bom dia' : hora < 19 ? 'Boa tarde' : 'Boa noite'; });
  constructor() {
    if (window.innerWidth <= 1100) this.sidebarOpen.set(false);
    aplicarDefinicoes(this.definicoes());
    setInterval(() => this.clock.set(formatarRelogio(this.definicoes(), new Date())), 1000);
    document.addEventListener(EVENTO_DEFINICOES, this.atualizarDefinicoes);
    this.serial.onRfid = (tag, porta) => this.readTag(tag, porta);
    this.page.set(this.pageFromPath(this.router.url));
    this.router.events.subscribe(evento => {
      if (!(evento instanceof NavigationEnd)) return;
      this.page.set(this.pageFromPath(evento.urlAfterRedirects));
      if (this.sessao()) setTimeout(() => this.focarConteudo());
    });
    window.addEventListener('resize', () => this.sidebarOpen.set(window.innerWidth > 1100));
    this.refresh();
  }

  private readonly atualizarDefinicoes = (): void => this.definicoes.set(carregarDefinicoes());

  focarConteudo(): void {
    focar(document.getElementById('conteudo'));
  }

  alternarNotificacoes(evento: Event): void {
    if (this.notificationsOpen()) {
      this.fecharNotificacoes();
      return;
    }
    this.gatilho = evento.currentTarget instanceof HTMLElement ? evento.currentTarget : null;
    this.notificationsOpen.set(true);
    setTimeout(() => focar(document.querySelector('.notification-pop .close')));
  }

  fecharNotificacoes(): void {
    if (!this.notificationsOpen()) return;
    this.notificationsOpen.set(false);
    this.restaurarFoco();
  }

  travarTab(evento: KeyboardEvent, seletor: string): void {
    prenderTab(evento, document.querySelector(seletor));
  }

  abrirAjuda(): void {
    try {
      sessionStorage.setItem(CHAVE_SECCAO, 'ajuda');
    } catch {
      this.navigate('configuracoes');
      return;
    }
    document.dispatchEvent(new CustomEvent(EVENTO_SECCAO, { detail: 'ajuda' }));
    this.navigate('configuracoes');
  }

  private restaurarFoco(): void {
    const alvo = this.gatilho;
    this.gatilho = null;
    if (alvo && alvo.isConnected) alvo.focus();
  }

  private focarDialogo(): void {
    setTimeout(() => { travarFundo(); focar(document.querySelector('.confirm-dialog')); });
  }
  @HostListener('document:keydown.escape')
  closeOverlays(): void {
    const dialogoAberto = !!this.equipmentDeleteTarget() || this.batchDeleteTarget().length > 0 || !!this.confirmarUtilizador();
    const algumAberto = this.notificationsOpen() || dialogoAberto || this.equipmentForm() || this.userForm();
    this.fecharNotificacoes();
    this.closeDeleteDialog();
    this.confirmarUtilizador.set(null);
    if (this.equipmentForm()) this.closeEquipmentForm();
    if (this.userForm()) this.fecharFormUtilizador();
    if (window.innerWidth <= 700) this.sidebarOpen.set(false);
    if (dialogoAberto) soltarFundo();
    if (algumAberto) this.restaurarFoco();
  }

  @HostListener('document:click', ['$event'])
  fecharNotificacoesPorClique(evento: MouseEvent): void {
    if (!this.notificationsOpen()) return;
    const alvo = evento.target instanceof Element ? evento.target : null;
    if (alvo?.closest('.notification-pop') || alvo?.closest('.bell')) return;
    this.fecharNotificacoes();
  }
  pageTitle = computed(() => ({dashboard:'Dashboard',movimentos:'Movimentos',alarmes:'Alarmes',equipamentos:'Equipamentos',utilizadores:'Utilizadores',perfis:'Perfis & Acesso',arduino:'Arduino / Serial',notificacoes:'Notificações',configuracoes:'Configurações'}[this.page()])); pageSubtitle = computed(() => this.page() === 'dashboard' ? 'Visão geral do sistema' : 'SafeLab · Gestão de Património e Controlo de Acesso');
  navigate(page: Page): void { this.closeOverlays(); void this.router.navigate([page]); this.focarConteudo(); }
  private pageFromPath(url: string): Page {
    const candidate = url.replace(/^\/+/, '').split(/[/?#]/)[0] as Page;
    return this.navGroups.some(group => group.items.some(item => item.id === candidate)) ? candidate : 'dashboard';
  }
  iniciarSessao(sessao: SessaoUtilizador): void {
    guardarSessao(sessao);
    this.sessao.set(sessao);
    void this.router.navigate(['/dashboard']);
  }
  terminarSessao(): void {
    this.closeOverlays();
    terminarSessaoLocal();
    this.sessao.set(null);
    void this.router.navigate(['/login']);
  }
  novoRegisto(): void {
    this.navigate('equipamentos');
    this.openEquipmentForm();
  }
  pesquisarGlobal(): void {
    const termo = this.pesquisaGlobalValor().trim();
    if (!termo) return;
    const alvo = termo.toLowerCase();
    if (this.equipamentos().some(item => item.nome.toLowerCase().includes(alvo) || item.tagRfid.toLowerCase().includes(alvo) || item.numeroSerie.toLowerCase().includes(alvo))) {
      this.equipmentSearchValue.set(termo);
      this.pesquisaGlobalValor.set('');
      this.navigate('equipamentos');
      return;
    }
    if (this.funcionarios().some(item => item.nome.toLowerCase().includes(alvo) || item.email.toLowerCase().includes(alvo) || item.tagRfid.toLowerCase().includes(alvo))) {
      this.userSearchValue.set(termo);
      this.pesquisaGlobalValor.set('');
      this.navigate('utilizadores');
      return;
    }
    this.pesquisaGlobalValor.set('');
    this.notify('Pesquisa sem resultados', `Nenhum equipamento ou utilizador corresponde a "${termo}".`);
  }
  refresh(): void {
    this.loading.set(true);
    let completed = 0;
    const done = (): void => { completed += 1; if (completed === 5) { this.loading.set(false); this.lastSync.set(new Date()); if (!failed) this.offline.set(false); } };
    let failed = false;
    const markFailure = (): void => { failed = true; this.offline.set(true); done(); };
    this.api.equipamentos().subscribe({next:v=>this.equipamentos.set(v),error:markFailure,complete:done});
    this.api.funcionarios().subscribe({next:v=>this.funcionarios.set(v),error:markFailure,complete:done});
    this.api.eventos().subscribe({next:v=>this.eventos.set(v),error:markFailure,complete:done});
    this.api.alarmes().subscribe({next:v=>this.alarmes.set(v),error:markFailure,complete:done});
    this.api.resumo().subscribe({next:v=>this.resumo.set(v),error:markFailure,complete:done});
  }
  openEquipmentForm(): void { this.gatilho = document.activeElement instanceof HTMLElement ? document.activeElement : null; this.editingEquipmentId.set(null); Object.assign(this.newEquipment, {tagRfid:'',nome:'',numeroSerie:'',laboratorio:'',descricao:'',estado:'NO_LABORATORIO'}); this.equipmentForm.set(true); }
  closeEquipmentForm(): void { if (!this.equipmentForm()) return; this.equipmentForm.set(false); this.editingEquipmentId.set(null); soltarFundo(); this.restaurarFoco(); }
  openEditEquipment(item: Equipamento): void { this.gatilho = document.activeElement instanceof HTMLElement ? document.activeElement : null; this.editingEquipmentId.set(item.id); Object.assign(this.newEquipment, item); this.equipmentForm.set(true); }
  abrirFormUtilizador(): void { this.gatilho = document.activeElement instanceof HTMLElement ? document.activeElement : null; this.userForm.set(true); }
  fecharFormUtilizador(): void { if (!this.userForm()) return; this.userForm.set(false); this.restaurarFoco(); }
  alternarFormUtilizador(): void { if (this.userForm()) this.fecharFormUtilizador(); else this.abrirFormUtilizador(); }
  saveEquipment(): void { const request = this.editingEquipmentId() ? this.api.atualizarEquipamento(this.editingEquipmentId()!, this.newEquipment) : this.api.criarEquipamento(this.newEquipment); request.subscribe({next:()=>{const editing = this.editingEquipmentId(); this.closeEquipmentForm(); this.notify(editing ? 'Equipamento actualizado' : 'Equipamento registado', `${this.newEquipment.nome} foi ${editing ? 'actualizado' : 'adicionado'} no inventário`); this.refresh()},error:e=>this.notify('Erro ao guardar',e.error?.message || 'Não foi possível guardar o equipamento')}); }
  saveUser(): void { this.api.criarFuncionario(this.newUser).subscribe({next:()=>{this.fecharFormUtilizador();this.notify('Funcionário registado', `${this.newUser.nome} foi adicionado aos utilizadores`);this.refresh()},error:e=>this.notify('Erro ao guardar',e.error?.message || 'Não foi possível registar o funcionário')}); }
  removeEquipment(item: Equipamento): void { this.gatilho = document.activeElement instanceof HTMLElement ? document.activeElement : null; this.equipmentDeleteTarget.set(item); this.focarDialogo(); }
  closeDeleteDialog(): void { const aberto = !!this.equipmentDeleteTarget() || this.batchDeleteTarget().length > 0; this.equipmentDeleteTarget.set(null); this.batchDeleteTarget.set([]); if (aberto) { soltarFundo(); this.restaurarFoco(); } }
  confirmRemoveEquipment(): void { const item = this.equipmentDeleteTarget(); if (!item) return; this.closeDeleteDialog(); this.api.removerEquipamento(item.id).subscribe({next:()=>{this.notify('Equipamento removido', `${item.nome} foi removido do inventário`);this.refresh()},error:e=>this.notify('Erro ao remover',e.message)}); }
  isSelected(id: number): boolean { return this.selectedEquipmentIds().includes(id); }
  allVisibleSelected(): boolean { const visible = this.filteredEquipamentos(); return visible.length > 0 && visible.every(item => this.isSelected(item.id)); }
  toggleSelection(id: number): void { this.selectedEquipmentIds.update(ids => ids.includes(id) ? ids.filter(itemId => itemId !== id) : [...ids, id]); }
  toggleAllVisible(): void { const visibleIds = this.filteredEquipamentos().map(item => item.id); this.selectedEquipmentIds.update(ids => this.allVisibleSelected() ? ids.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...ids, ...visibleIds]))); }
  clearSelection(): void { this.selectedEquipmentIds.set([]); }
  openBatchDelete(): void { const selected = this.equipamentos().filter(item => this.selectedEquipmentIds().includes(item.id)); if (selected.length) { this.gatilho = document.activeElement instanceof HTMLElement ? document.activeElement : null; this.batchDeleteTarget.set(selected); this.focarDialogo(); } }
  applyBatchStatus(): void { const selectedIds = this.selectedEquipmentIds(); if (!selectedIds.length) return; const status = this.batchStatus(); this.equipamentos.update(items => items.map(item => selectedIds.includes(item.id) ? {...item, estado: status} : item)); this.notify('Estado actualizado', `${selectedIds.length} equipamentos foram atualizados`); this.clearSelection(); }
  confirmBatchRemove(): void { const selected = this.batchDeleteTarget(); if (!selected.length) return; this.closeDeleteDialog(); this.equipamentos.update(items => items.filter(item => !selected.some(target => target.id === item.id))); this.clearSelection(); this.notify('Equipamentos removidos', `${selected.length} equipamentos foram removidos do inventário`); }
  removeUser(item: Funcionario): void { this.gatilho = document.activeElement instanceof HTMLElement ? document.activeElement : null; this.confirmarUtilizador.set(item); this.focarDialogo(); }
  fecharConfirmacaoUtilizador(): void { if (!this.confirmarUtilizador()) return; this.confirmarUtilizador.set(null); soltarFundo(); this.restaurarFoco(); }
  confirmarRemocaoUtilizador(): void { const item = this.confirmarUtilizador(); if (!item) return; this.fecharConfirmacaoUtilizador(); this.api.removerFuncionario(item.id).subscribe({next:()=>{this.notify('Utilizador removido', `${item.nome} foi removido do sistema`);this.refresh()},error:e=>this.notify('Erro ao remover',e.message)}); }
  connectSerial(): void { this.serial.connect(this.baudRate).catch(e=>this.notify('Erro de ligação',e.message)); }
  disconnectSerial(): void { this.serial.disconnect().catch(e=>this.notify('Erro ao desligar',e.message)); }
  sendSerial(): void { if (!this.serialCommand.trim()) return; this.serial.send(this.serialCommand.trim()).then(()=>this.serialCommand='').catch(e=>this.notify('Arduino',e.message)); }
  readTag(tag: string, porta: string): void { this.api.leitura(tag, porta).subscribe({next:r=>{if(r.resultado==='ALARME') this.notify('ALARME',r.mensagem,'erro'); this.refresh()},error:e=>this.notify('Erro API',e.message)}); }
  notify(title:string, body:string, tipo: 'info' | 'erro' = 'info'): void {
    const id = this.proximoToast++;
    this.notifications.update(n=>[{id,title,body,time:new Date().toLocaleTimeString('pt-AO')},...n].slice(0,20));
    this.toasts.update(lista => [...lista, { id, titulo: title, texto: body, tipo }]);
    setTimeout(() => this.toasts.update(lista => lista.filter(toast => toast.id !== id)), 6000);
  }
  nowIso(): string { return new Date().toISOString(); }
  syncLabel(): string {
    if (this.offline()) return 'Offline';
    if (!this.lastSync()) return 'A sincronizar';
    return this.api.mock ? `Demo · ${this.formatDate(this.lastSync()!.toISOString())}` : `Sincronizado · ${this.formatDate(this.lastSync()!.toISOString())}`;
  }
  isAcknowledged(event: Evento): boolean { return this.acknowledgedAlarms().includes(event.id); }
  acknowledgeAlarm(event: Evento): void {
    if (this.isAcknowledged(event)) return;
    this.acknowledgedAlarms.update(ids => [...ids, event.id]);
    this.notify('Alarme reconhecido', `${event.tagLida} · ${event.portaId}`);
  }
  formatDate(date:string): string { return date ? new Date(date).toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'}) : '—'; }
  estadoLabel(state:string): string { return ({NO_LABORATORIO:'No laboratório',FORA_DO_LABORATORIO:'Fora do laboratório',EM_MANUTENCAO:'Em manutenção'} as Record<string,string>)[state] || state; }
  exportEvents(): void { const events = this.page() === 'alarmes' ? this.alarmes() : this.eventos(); const rows = events.map(e=>[e.tagLida,e.portaId,e.tipo,e.resultado,e.ocorridoEm].join(';')); const blob = new Blob([['Tag;Porta;Tipo;Resultado;Data/Hora',...rows].join('\\n')],{type:'text/csv'}); const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${this.page()}.csv`;link.click();URL.revokeObjectURL(link.href); }
}
