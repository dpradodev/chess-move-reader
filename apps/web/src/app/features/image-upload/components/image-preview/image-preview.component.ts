import { Component, input, output } from '@angular/core';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { OcrStatus } from '../../../../core/models/game.model';

@Component({
  selector: 'app-image-preview',
  imports: [SpinnerComponent, ButtonComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div class="relative overflow-hidden rounded-xl border border-[#d4b0bc] bg-[#f5edda]">
        <img
          [src]="imageUrl()"
          alt="Planilla de ajedrez"
          class="mx-auto max-h-96 w-full object-contain"
        />
        @if (status() === 'processing') {
          <div class="absolute inset-0 flex items-center justify-center bg-white/70">
            <div class="flex flex-col items-center gap-3">
              <app-spinner size="lg" />
              <p class="text-sm font-medium text-gray-700">Analizando imagen...</p>
            </div>
          </div>
        }
      </div>

      <div class="flex gap-3">
        <app-button variant="secondary" (clicked)="changeImage.emit()">
          Cambiar imagen
        </app-button>
        <app-button
          variant="primary"
          [fullWidth]="true"
          [disabled]="status() === 'processing'"
          (clicked)="analyze.emit()"
        >
          @if (status() === 'processing') {
            <app-spinner size="sm" />
            Analizando...
          } @else {
            Analizar planilla
          }
        </app-button>
      </div>
    </div>
  `,
})
export class ImagePreviewComponent {
  readonly imageUrl = input.required<string>();
  readonly status = input<OcrStatus>('idle');

  readonly analyze = output<void>();
  readonly changeImage = output<void>();
}
