import { Component, input, output } from '@angular/core';

/**
 * Restyled for ChessKeeper's dark/gold theme: individually bordered icon buttons
 * (matches the button convention already used on scan/auth) instead of apps/web's
 * grouped rounded-2xl pill. Icon paths follow lucide's skip-back/chevron/skip-forward
 * glyphs, mirroring design/src/app/App.tsx's EditorScreen nav controls.
 */
@Component({
  selector: 'app-board-controls',
  template: `
    <div class="flex items-center gap-2">
      <button
        type="button"
        (click)="goStart.emit()"
        [disabled]="atStart()"
        class="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        title="Inicio" aria-label="Ir al inicio"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="19 20 9 12 19 4 19 20" />
          <line x1="5" y1="19" x2="5" y2="5" />
        </svg>
      </button>

      <button
        type="button"
        (click)="stepBack.emit()"
        [disabled]="atStart()"
        class="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        title="Anterior" aria-label="Retroceder un movimiento"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span
        class="min-w-20 rounded-lg bg-secondary px-4 py-2 text-center text-sm text-muted-foreground"
        style="font-family: var(--font-notation)"
      >
        {{ label() }}
      </span>

      <button
        type="button"
        (click)="stepForward.emit()"
        [disabled]="atEnd()"
        class="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        title="Siguiente" aria-label="Avanzar un movimiento"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button
        type="button"
        (click)="goEnd.emit()"
        [disabled]="atEnd()"
        class="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        title="Final" aria-label="Ir al final"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 4 15 12 5 20 5 4" />
          <line x1="19" y1="5" x2="19" y2="19" />
        </svg>
      </button>

      <button
        type="button"
        (click)="flip.emit()"
        class="rounded-lg border border-border p-2 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
        title="Voltear tablero" aria-label="Voltear tablero"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-5.36M20 15a9 9 0 01-14.13 5.36" />
        </svg>
      </button>
    </div>
  `,
})
export class BoardControlsComponent {
  readonly atStart = input(true);
  readonly atEnd = input(true);
  readonly label = input('Posición inicial');

  readonly goStart = output<void>();
  readonly stepBack = output<void>();
  readonly stepForward = output<void>();
  readonly goEnd = output<void>();
  readonly flip = output<void>();
}
