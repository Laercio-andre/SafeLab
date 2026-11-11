import { AfterViewInit, Component, ElementRef, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessaoUtilizador } from './autenticacao';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="login-page">
      <section class="login-card" aria-labelledby="login-titulo">
        <div class="login-brand">
          <div class="shield" aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></div>
          <span>SafeLab RFID</span>
        </div>
        <h1 id="login-titulo">Centro de Controlo</h1>
        <p class="login-sub">Inicie sessão para aceder à gestão de património e acessos laboratoriais.</p>

        <form class="login-form" (ngSubmit)="submeter()" novalidate>
          <div class="login-field">
            <label for="login-utilizador">Utilizador</label>
            <input #campoUtilizador id="login-utilizador" name="utilizador" type="text" [(ngModel)]="utilizador" autocomplete="username" required placeholder="nome.utilizador">
          </div>

          <div class="login-field">
            <label for="login-palavra-passe">Palavra-passe</label>
            <div class="login-pass">
              <input id="login-palavra-passe" name="palavraPasse" [type]="mostrarPasse() ? 'text' : 'password'" [(ngModel)]="palavraPasse" autocomplete="current-password" required placeholder="••••••••">
              <button type="button" (click)="alternarPasse()" [attr.aria-pressed]="mostrarPasse()" [attr.aria-label]="mostrarPasse() ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'">
                <i class="fa-solid" [class.fa-eye]="!mostrarPasse()" [class.fa-eye-slash]="mostrarPasse()" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div class="login-row">
            <label class="login-remember"><input type="checkbox" name="lembrar" [(ngModel)]="lembrar"> Manter sessão iniciada</label>
          </div>

          @if (erro()) {
            <p class="login-error" role="alert"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {{ erro() }}</p>
          }

          <button class="primary login-submit" type="submit" [disabled]="processando()">
            @if (processando()) { <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> A verificar... }
            @else { Iniciar sessão }
          </button>
        </form>

        <p class="login-hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Modo demonstração: qualquer utilizador com palavra-passe de 4 ou mais caracteres é aceite. A validação real será feita na fase de backend.</p>
      </section>
    </main>
  `
})
export class LoginComponent implements AfterViewInit {
  readonly entrar = output<SessaoUtilizador>();

  @ViewChild('campoUtilizador') private campoUtilizador?: ElementRef<HTMLInputElement>;

  utilizador = '';
  palavraPasse = '';
  lembrar = true;
  readonly mostrarPasse = signal(false);
  readonly processando = signal(false);
  readonly erro = signal('');

  ngAfterViewInit(): void {
    setTimeout(() => this.campoUtilizador?.nativeElement.focus());
  }

  alternarPasse(): void {
    this.mostrarPasse.update(atual => !atual);
  }

  submeter(): void {
    this.erro.set('');
    const utilizador = this.utilizador.trim();
    if (!utilizador) {
      this.erro.set('Introduza o nome de utilizador.');
      return;
    }
    if (this.palavraPasse.length < 4) {
      this.erro.set('A palavra-passe deve ter pelo menos 4 caracteres.');
      return;
    }
    this.processando.set(true);
    setTimeout(() => {
      this.processando.set(false);
      this.entrar.emit({
        utilizador,
        nome: this.normalizarNome(utilizador),
        cargo: 'ADMIN',
        em: new Date().toISOString(),
        lembrar: this.lembrar
      });
    }, 400);
  }

  private normalizarNome(utilizador: string): string {
    const base = utilizador.includes('@') ? utilizador.split('@')[0] : utilizador;
    return base
      .split(/[._-]+/)
      .filter(Boolean)
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(' ') || utilizador;
  }
}
