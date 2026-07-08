import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisService } from '../../core/services/analysis.service';

/** Ported from design/src/app/App.tsx (ScanScreen). The analysis call is mocked -- see AnalysisService. */
@Component({
  selector: 'app-scan-page',
  template: `
    <div
      class="flex min-h-full flex-col items-center justify-center gap-8 bg-background p-6"
      style="font-family: var(--font-body)"
    >
      <div class="text-center">
        <h2 class="mb-1 text-2xl font-bold text-foreground" style="font-family: var(--font-display)">
          Analizar planilla
        </h2>
        <p class="text-sm text-muted-foreground">Sube una foto de la planilla o usa la cámara</p>
      </div>

      <!-- Drop zone -->
      <div
        (dragover)="onDragOver($event)"
        (dragleave)="dragOver.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        [class]="
          'group relative flex h-72 w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ' +
          (dragOver()
            ? 'scale-[1.01] border-primary bg-primary/8'
            : 'border-border hover:border-primary/50 hover:bg-white/2')
        "
      >
        @if (preview(); as img) {
          <img [src]="img" alt="Preview planilla" class="absolute inset-0 h-full w-full object-cover" />
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
            <div class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-primary">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="text-sm font-medium text-foreground">Imagen cargada</p>
            <p class="text-xs text-muted-foreground">Click para cambiar</p>
          </div>
        } @else {
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary transition-colors group-hover:border-primary/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              class="text-muted-foreground transition-colors group-hover:text-primary">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-foreground">Arrastra o haz clic para subir</p>
            <p class="mt-1 text-xs text-muted-foreground">PNG, JPG, HEIC hasta 10 MB</p>
          </div>
        }
        <input
          #fileInput
          type="file"
          accept="image/*"
          class="hidden"
          (change)="onFileInput($event)"
        />
      </div>

      <!-- Divider -->
      <div class="flex w-full max-w-lg items-center gap-4">
        <div class="h-px flex-1 bg-border"></div>
        <span class="text-xs text-muted-foreground">o</span>
        <div class="h-px flex-1 bg-border"></div>
      </div>

      <!-- Camera button -->
      <button
        type="button"
        (click)="fileInput.click()"
        class="flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm text-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-primary">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Usar cámara
      </button>

      <!-- Analyze CTA -->
      <button
        type="button"
        (click)="onAnalyze()"
        [class]="
          'flex items-center gap-3 rounded-xl px-8 py-3.5 text-sm font-bold transition-all duration-200 ' +
          'bg-primary text-primary-foreground shadow-lg shadow-primary/20 ' +
          'hover:scale-[1.02] hover:bg-primary/90 hover:shadow-primary/30 active:scale-[0.98] ' +
          (!preview() || submitting() ? 'pointer-events-none cursor-not-allowed opacity-40' : '')
        "
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke-width="2" />
          <line x1="3" y1="12" x2="21" y2="12" stroke-width="2" />
        </svg>
        Analizar planilla
      </button>

      <!-- Demo shortcut -->
      @if (!preview()) {
        <button
          type="button"
          (click)="onDemoShortcut()"
          class="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-primary"
        >
          Continuar sin planilla
        </button>
      }
    </div>
  `,
})
export class ScanPage {
  @ViewChild('fileInput') private readonly fileInputRef?: ElementRef<HTMLInputElement>;

  private readonly analysis = inject(AnalysisService);
  private readonly router = inject(Router);

  readonly dragOver = signal(false);
  readonly preview = signal<string | null>(null);
  readonly submitting = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) this.readFile(file);
  }

  onFileInput(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.readFile(file);
  }

  onAnalyze(): void {
    const image = this.preview();
    if (!image) return;
    this.startAnalysis(image);
  }

  /** No hay planilla que analizar, así que se salta el análisis y la pantalla de
   * carga por completo -- el editor arranca con una partida en blanco. */
  onDemoShortcut(): void {
    this.router.navigateByUrl('/editor');
  }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) this.preview.set(result);
    };
    reader.readAsDataURL(file);
  }

  private startAnalysis(image: string): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.analysis.createAnalysis(image).subscribe({
      next: ({ id }) => this.router.navigate(['/analyzing'], { queryParams: { id } }),
      error: () => this.submitting.set(false),
    });
  }
}
