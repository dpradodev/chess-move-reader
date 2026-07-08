import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { SpinnerComponent } from '../../shared/components/ui/spinner/spinner.component';

type AuthMode = 'login' | 'register';

/** Ported from design/src/app/App.tsx (AuthScreen). Auth itself is mocked for now — see AuthService. */
@Component({
  selector: 'app-auth-page',
  imports: [FormsModule, BrandLogoComponent, SpinnerComponent],
  template: `
    <div
      class="relative flex min-h-dvh items-center justify-center p-4"
      style="background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,168,67,0.08) 0%, transparent 60%), var(--background); font-family: var(--font-body)"
    >
      <!-- Decorative board pattern -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.025]"
        style="background-image: repeating-conic-gradient(var(--primary) 0% 25%, transparent 0% 50%); background-size: 64px 64px"
      ></div>

      <div class="relative w-full max-w-sm">
        <!-- Logo -->
        <div class="mb-8 flex flex-col items-center gap-4">
          <div class="flex flex-col items-center gap-1">
            <app-brand-logo size="lg" />
            <p class="text-sm text-muted-foreground">Registra y analiza tus partidas</p>
          </div>
        </div>

        <!-- Card -->
        <div class="rounded-xl border border-border bg-card p-6 shadow-2xl">
          <!-- Tabs -->
          <div class="mb-6 flex gap-1 rounded-lg bg-muted p-1">
            <button type="button" (click)="setMode('login')" [class]="tabClass('login')">
              Iniciar sesión
            </button>
            <button type="button" (click)="setMode('register')" [class]="tabClass('register')">
              Registrarse
            </button>
          </div>

          <form (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            @if (mode() === 'register') {
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  name="name"
                  [(ngModel)]="name"
                  class="rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
            }
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                class="rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contraseña</label>
              <input
                type="password"
                name="password"
                [(ngModel)]="password"
                class="rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            @if (error(); as message) {
              <p class="text-xs text-destructive">{{ message }}</p>
            }

            <button
              type="submit"
              [disabled]="loading()"
              class="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              @if (loading()) {
                <app-spinner size="sm" />
                Entrando…
              } @else {
                {{ mode() === 'login' ? 'Entrar' : 'Crear cuenta' }}
              }
            </button>
          </form>
        </div>

        <p class="mt-4 text-center text-xs text-muted-foreground">
          Al continuar aceptas los términos de uso y la política de privacidad.
        </p>
      </div>
    </div>
  `,
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = signal<AuthMode>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Pre-filled the same way the Figma prototype does, purely for demo convenience.
  name = '';
  email = 'magnus@chess.com';
  password = '••••••••';

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  tabClass(mode: AuthMode): string {
    const base = 'flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200';
    const active =
      this.mode() === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground';
    return `${base} ${active}`;
  }

  onSubmit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    const request$ =
      this.mode() === 'login'
        ? this.auth.login(this.email, this.password)
        : this.auth.register(this.name, this.email, this.password);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/scan');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo iniciar sesión. Inténtalo de nuevo.');
      },
    });
  }
}
