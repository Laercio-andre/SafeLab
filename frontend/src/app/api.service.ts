import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export type EstadoEquipamento = 'NO_LABORATORIO' | 'FORA_DO_LABORATORIO' | 'EM_MANUTENCAO';
export type Cargo = 'ADMIN' | 'COORDENADOR' | 'SEGURANCA' | 'DOCENTE' | 'TECNICO';
export interface Equipamento { id: number; tagRfid: string; nome: string; numeroSerie: string; descricao?: string; laboratorio: string; estado: EstadoEquipamento; criadoEm: string; }
export interface Funcionario { id: number; tagRfid: string; nome: string; email: string; telefone?: string; cargo: Cargo | string; activo: boolean; criadoEm: string; }
export interface Evento { id: number; tagLida: string; portaId: string; tipo: string; resultado: 'AUTORIZADO' | 'ALARME' | 'TAG_DESCONHECIDA'; equipamento?: Equipamento; funcionario?: Funcionario; observacao?: string; ocorridoEm: string; }
export interface Resumo { alarmes24h: number; totalEventos: number; horaServidor: string; }
export interface LeituraResponse { eventoId: number; resultado: string; tipo: string; mensagem: string; portaId: string; ocorridoEm: string; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly env = (globalThis as { env?: { API_URL?: string; MOCK_API?: boolean } }).env ?? {};
  private readonly base = (this.env.API_URL || 'http://localhost:8080') + '/api';
  readonly mock = this.env.MOCK_API !== false;
  private nextId = 100;
  private mockEquipamentos: Equipamento[] = [
    { id: 1, tagRfid: 'E20034118802', nome: 'Microscópio Óptico BX43', numeroSerie: 'BX43-2024-018', laboratorio: 'Laboratório de Biologia', estado: 'NO_LABORATORIO', criadoEm: '2026-10-12T08:30:00Z' },
    { id: 2, tagRfid: 'E20034118819', nome: 'Centrifugadora 5424R', numeroSerie: '5424R-8812', laboratorio: 'Laboratório de Química', estado: 'FORA_DO_LABORATORIO', criadoEm: '2026-10-15T10:15:00Z' },
    { id: 3, tagRfid: 'E20034118827', nome: 'Espectrofotómetro UV-Vis', numeroSerie: 'UV-1800-031', laboratorio: 'Laboratório de Química', estado: 'EM_MANUTENCAO', criadoEm: '2026-10-21T14:00:00Z' }
  ];
  private mockFuncionarios: Funcionario[] = [
    { id: 1, tagRfid: 'A1B2C3D4', nome: 'Dra. Mariana Costa', email: 'mariana.costa@safelab.pt', telefone: '+351 910 000 101', cargo: 'DOCENTE', activo: true, criadoEm: '2026-09-04T09:00:00Z' },
    { id: 2, tagRfid: 'A1B2C3E8', nome: 'Carlos Mendes', email: 'carlos.mendes@safelab.pt', telefone: '+351 910 000 102', cargo: 'TECNICO', activo: true, criadoEm: '2026-09-08T09:00:00Z' },
    { id: 3, tagRfid: 'A1B2C3F1', nome: 'Ana Ribeiro', email: 'ana.ribeiro@safelab.pt', cargo: 'COORDENADOR', activo: true, criadoEm: '2026-09-14T09:00:00Z' }
  ];
  private readonly mockEventos: Evento[] = [
    { id: 1, tagLida: 'A1B2C3D4', portaId: 'PORTA_LAB1', tipo: 'ENTRADA', resultado: 'AUTORIZADO', funcionario: this.mockFuncionarios[0], ocorridoEm: '2026-11-09T18:42:00Z' },
    { id: 2, tagLida: 'E20034118802', portaId: 'PORTA_LAB1', tipo: 'SAIDA', resultado: 'AUTORIZADO', equipamento: this.mockEquipamentos[0], ocorridoEm: '2026-11-09T17:18:00Z' },
    { id: 3, tagLida: 'FF009988', portaId: 'PORTA_LAB2', tipo: 'ENTRADA', resultado: 'ALARME', observacao: 'Tag desconhecida detectada', ocorridoEm: '2026-11-09T16:05:00Z' }
  ];
  equipamentos(): Observable<Equipamento[]> { return this.mock ? of(this.mockEquipamentos) : this.http.get<Equipamento[]>(`${this.base}/equipamentos`); }
  criarEquipamento(value: object): Observable<Equipamento> {
    if (!this.mock) return this.http.post<Equipamento>(`${this.base}/equipamentos`, value);
    const item = { ...(value as Partial<Equipamento>), id: this.nextId++, estado: 'NO_LABORATORIO', criadoEm: new Date().toISOString() } as Equipamento;
    this.mockEquipamentos = [...this.mockEquipamentos, item]; return of(item);
  }
  atualizarEquipamento(id: number, value: object): Observable<Equipamento> {
    if (!this.mock) return this.http.put<Equipamento>(`${this.base}/equipamentos/${id}`, value);
    const current = this.mockEquipamentos.find(item => item.id === id);
    if (!current) return of(value as Equipamento);
    const updated = { ...current, ...value, id } as Equipamento;
    this.mockEquipamentos = this.mockEquipamentos.map(item => item.id === id ? updated : item);
    return of(updated);
  }
  removerEquipamento(id: number): Observable<void> { if (this.mock) { this.mockEquipamentos = this.mockEquipamentos.filter(item => item.id !== id); return of(void 0); } return this.http.delete<void>(`${this.base}/equipamentos/${id}`); }
  funcionarios(): Observable<Funcionario[]> { return this.mock ? of(this.mockFuncionarios) : this.http.get<Funcionario[]>(`${this.base}/funcionarios`); }
  criarFuncionario(value: object): Observable<Funcionario> {
    if (!this.mock) return this.http.post<Funcionario>(`${this.base}/funcionarios`, value);
    const item = { ...(value as Partial<Funcionario>), id: this.nextId++, activo: true, criadoEm: new Date().toISOString() } as Funcionario;
    this.mockFuncionarios = [...this.mockFuncionarios, item]; return of(item);
  }
  removerFuncionario(id: number): Observable<void> { if (this.mock) { this.mockFuncionarios = this.mockFuncionarios.filter(item => item.id !== id); return of(void 0); } return this.http.delete<void>(`${this.base}/funcionarios/${id}`); }
  eventos(): Observable<Evento[]> { return this.mock ? of(this.mockEventos) : this.http.get<Evento[]>(`${this.base}/eventos`); }
  alarmes(): Observable<Evento[]> { return this.mock ? of(this.mockEventos.filter(event => event.resultado === 'ALARME')) : this.http.get<Evento[]>(`${this.base}/eventos/alarmes`); }
  resumo(): Observable<Resumo> { return this.mock ? of({ alarmes24h: 1, totalEventos: 18, horaServidor: new Date().toISOString() }) : this.http.get<Resumo>(`${this.base}/eventos/resumo`); }
  leitura(tagRfid: string, portaId: string): Observable<LeituraResponse> {
    if (!this.mock) return this.http.post<LeituraResponse>(`${this.base}/leituras`, { tagRfid, portaId });
    const known = [...this.mockFuncionarios, ...this.mockEquipamentos].some(item => item.tagRfid === tagRfid);
    return of({ eventoId: this.nextId++, resultado: known ? 'AUTORIZADO' : 'ALARME', tipo: 'ENTRADA', mensagem: known ? 'Tag autorizada' : 'Tag desconhecida', portaId, ocorridoEm: new Date().toISOString() });
  }
}
