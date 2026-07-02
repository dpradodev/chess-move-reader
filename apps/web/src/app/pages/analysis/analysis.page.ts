import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChessBoardComponent } from '../../features/chess-board/components/chess-board/chess-board.component';
import { MoveSheetComponent } from '../../features/move-sheet/components/move-sheet/move-sheet.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-analysis-page',
  imports: [ChessBoardComponent, MoveSheetComponent, ButtonComponent],
  template: `
    <div class="flex h-dvh flex-col bg-[#fdf6e8]">

      <!-- Header -->
      <header class="flex shrink-0 items-center border-b border-[#d4b0bc] bg-[#f5edda] px-4 py-3">
        <div class="flex flex-1 justify-start">
          <app-button variant="ghost" size="sm" (clicked)="goBack()">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </app-button>
        </div>
        <h1 class="text-base font-semibold text-[#2a1820] sm:text-xl">Chess Move Reader</h1>
        <div class="flex-1"></div>
      </header>

      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">

        <!-- Board section -->
        <section
          class="flex shrink-0 flex-col items-center justify-start px-4 pb-2 pt-4
                 lg:flex-1 lg:justify-center lg:px-6 lg:py-6"
          aria-label="Tablero"
        >
          <app-chess-board />
        </section>

        <!-- Divider mobile -->
        <div class="mx-4 border-t border-[#d4b0bc] lg:hidden"></div>

        <!-- Move sheet -->
        <aside
          class="mx-4 mb-4 mt-2 flex h-[45vh] min-h-0 flex-col overflow-hidden rounded-xl border border-[#d4b0bc]
                 lg:h-auto lg:my-6 lg:mr-6 lg:ml-0 lg:w-72"
          aria-label="Planilla de movimientos"
        >
          @defer {
            <app-move-sheet />
          } @placeholder {
            <div class="p-4 text-sm text-[#a07888]">Cargando planilla...</div>
          }
        </aside>

      </div>
    </div>
  `,
})
export class AnalysisPage {
  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigate(['/']);
  }
}
