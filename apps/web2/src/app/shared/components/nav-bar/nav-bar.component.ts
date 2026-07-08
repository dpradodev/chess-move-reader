import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';

interface NavItem {
  label: string;
  path: string;
  /** Route prefixes that should light this item up -- "Analizar" covers both scan and analyzing. */
  activeOn: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Analizar', path: '/scan', activeOn: ['/scan', '/analyzing'] },
  { label: 'Partidas', path: '/archive', activeOn: ['/archive'] },
];

/**
 * Ported from design/src/app/App.tsx (NavBar). Shown on every authenticated screen
 * (scan/analyzing/editor/archive) via ShellComponent -- never on /auth. Active state
 * is driven by the real router URL (design's version just compared a `screen` enum
 * it already had in memory; here that same signal is derived from NavigationEnd).
 */
@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, BrandLogoComponent],
  template: `
    <nav class="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div class="flex h-14 items-center px-4 sm:px-6">
        <a routerLink="/scan" class="mr-auto cursor-pointer sm:mr-8">
          <app-brand-logo size="sm" />
        </a>

        <!-- Desktop nav -->
        <div class="hidden flex-1 items-center gap-1 sm:flex">
          @for (item of items; track item.path) {
            <a
              [routerLink]="item.path"
              class="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-all duration-150"
              [class]="isActive(item) ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'"
            >
              @if (item.label === 'Analizar') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
                </svg>
              } @else {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                </svg>
              }
              {{ item.label }}
            </a>
          }
        </div>

        <!-- Desktop user -->
        <div class="hidden items-center gap-3 sm:flex">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <div class="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/20">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span>{{ user()?.name ?? 'Invitado' }}</span>
          </div>
          <button
            type="button"
            (click)="logout()"
            class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            title="Cerrar sesión"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        <!-- Mobile hamburger -->
        <button
          type="button"
          (click)="toggleMenu()"
          class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground sm:hidden"
          aria-label="Menú"
        >
          @if (menuOpen()) {
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
          } @else {
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="9.25" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="13.5" width="16" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          }
        </button>
      </div>

      <!-- Mobile dropdown -->
      @if (menuOpen()) {
        <div class="border-t border-border bg-card/95 backdrop-blur-sm sm:hidden">
          <div class="flex flex-col gap-1 p-3">
            @for (item of items; track item.path) {
              <a
                [routerLink]="item.path"
                (click)="closeMenu()"
                class="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-150"
                [class]="isActive(item) ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'"
              >
                @if (item.label === 'Analizar') {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
                  </svg>
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                  </svg>
                }
                {{ item.label === 'Analizar' ? 'Analizar planilla' : 'Mis partidas' }}
              </a>
            }
            <div class="my-1 h-px bg-border"></div>
            <div class="flex items-center justify-between px-4 py-2">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <div class="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/20">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                {{ user()?.name ?? 'Invitado' }}
              </div>
              <button
                type="button"
                (click)="logout()"
                class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Salir
              </button>
            </div>
          </div>
        </div>
      }
    </nav>
  `,
})
export class NavBarComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly items = NAV_ITEMS;
  readonly user = this.auth.user;
  readonly menuOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  isActive(item: NavItem): boolean {
    return item.activeOn.some(prefix => this.url().startsWith(prefix));
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
    this.router.navigateByUrl('/auth');
  }
}
