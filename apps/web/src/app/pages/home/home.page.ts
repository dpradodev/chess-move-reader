import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UploadZoneComponent } from '../../features/image-upload/components/upload-zone/upload-zone.component';
import { ImagePreviewComponent } from '../../features/image-upload/components/image-preview/image-preview.component';
import { GameStateService } from '../../core/services/game-state.service';
import { ChessOcrService } from '../../core/services/chess-ocr.service';

@Component({
  selector: 'app-home-page',
  imports: [UploadZoneComponent, ImagePreviewComponent],
  template: `
    <div class="min-h-screen bg-[#fdf6e8]">
      <header class="flex shrink-0 items-center border-b border-[#d4b0bc] bg-[#f5edda] px-4 py-3">
        <div class="flex-1"></div>
        <h1 class="text-base font-semibold text-[#2a1820] sm:text-xl">Chess Move Reader</h1>
        <div class="flex-1"></div>
      </header>

      <main class="mx-auto max-w-2xl px-6 py-10">
        <div class="mb-8 text-center">
          <h2 class="text-2xl font-bold text-[#2a1820]">Sube tu planilla</h2>
          <p class="mt-2 text-sm text-[#a07888]">
            Sube una foto de tu planilla de ajedrez y detectaremos los movimientos automáticamente.
          </p>
        </div>

        @if (gameState.sourceImage(); as imageUrl) {
          <app-image-preview
            [imageUrl]="imageUrl"
            [status]="gameState.ocrStatus()"
            (analyze)="onAnalyze()"
            (changeImage)="onChangeImage()"
          />
          @if (gameState.ocrStatus() === 'error') {
            <p class="mt-3 text-center text-sm text-red-600">
              No se pudo analizar la imagen. Inténtalo de nuevo.
            </p>
          }
        } @else {
          <app-upload-zone (imageSelected)="onImageSelected($event)" />
        }
      </main>
    </div>
  `,
})
export class HomePage {
  protected readonly gameState = inject(GameStateService);
  private readonly ocrService = inject(ChessOcrService);
  private readonly router = inject(Router);

  onImageSelected(dataUrl: string): void {
    this.gameState.setSourceImage(dataUrl);
  }

  onChangeImage(): void {
    this.gameState.reset();
  }

  onAnalyze(): void {
    const image = this.gameState.sourceImage();
    if (!image) return;

    this.gameState.setOcrStatus('processing');

    this.ocrService.analyze(image).subscribe({
      next: (moves) => {
        this.gameState.loadOcrMoves(moves);
        this.router.navigate(['/analysis']);
      },
      error: () => this.gameState.setOcrStatus('error'),
    });
  }
}
