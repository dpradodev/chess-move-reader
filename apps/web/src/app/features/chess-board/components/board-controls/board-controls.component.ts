import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-board-controls',
  template: `
    <div class="flex items-center rounded-2xl border border-[#d4b0bc] bg-[#f5edda] p-1 gap-0.5">

      <!-- Ir al inicio -->
      <button
        (click)="goStart.emit()"
        [disabled]="atStart()"
        class="flex h-10 w-10 items-center justify-center rounded-xl text-[#7a4a58] transition-colors
               hover:bg-[#f0d8dc] hover:text-[#8a3a4e] active:bg-[#e8c8d0]
               disabled:opacity-25 disabled:cursor-not-allowed"
        title="Inicio" aria-label="Ir al inicio"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>

      <!-- Retroceder -->
      <button
        (click)="stepBack.emit()"
        [disabled]="atStart()"
        class="flex h-10 w-10 items-center justify-center rounded-xl text-[#7a4a58] transition-colors
               hover:bg-[#f0d8dc] hover:text-[#8a3a4e] active:bg-[#e8c8d0]
               disabled:opacity-25 disabled:cursor-not-allowed"
        title="Retroceder" aria-label="Retroceder un movimiento"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Label -->
      <span class="flex-1 text-center text-sm font-medium tabular-nums text-[#2a1820] px-1 select-none">
        {{ label() }}
      </span>

      <!-- Avanzar -->
      <button
        (click)="stepForward.emit()"
        [disabled]="atEnd()"
        class="flex h-10 w-10 items-center justify-center rounded-xl text-[#7a4a58] transition-colors
               hover:bg-[#f0d8dc] hover:text-[#8a3a4e] active:bg-[#e8c8d0]
               disabled:opacity-25 disabled:cursor-not-allowed"
        title="Avanzar" aria-label="Avanzar un movimiento"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Ir al final -->
      <button
        (click)="goEnd.emit()"
        [disabled]="atEnd()"
        class="flex h-10 w-10 items-center justify-center rounded-xl text-[#7a4a58] transition-colors
               hover:bg-[#f0d8dc] hover:text-[#8a3a4e] active:bg-[#e8c8d0]
               disabled:opacity-25 disabled:cursor-not-allowed"
        title="Final" aria-label="Ir al final"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Voltear tablero -->
      <button
        (click)="flip.emit()"
        class="flex h-10 w-10 items-center justify-center rounded-xl text-[#7a4a58] transition-colors
               hover:bg-[#f0d8dc] hover:text-[#8a3a4e] active:bg-[#e8c8d0]"
        title="Voltear tablero" aria-label="Voltear tablero"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-5.36M20 15a9 9 0 01-14.13 5.36" />
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
