import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-upload-zone',
  template: `
    <div
      class="flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed border-[#d4b0bc] bg-[#f5edda] p-10 transition-colors hover:border-[#b85c6e] hover:bg-[#fce8ec]"
      [class.border-[#b85c6e]]="isDragging()"
      [class.bg-[#fce8ec]]="isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragging.set(false)"
      (drop)="onDrop($event)"
    >
      <div class="flex flex-col items-center gap-2 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-[#b85c6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-sm font-medium text-[#2a1820]">Arrastra una imagen o selecciona una opción</p>
        <p class="text-xs text-[#a07888]">PNG, JPG, WEBP hasta 10 MB</p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row">
        <label class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#b85c6e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#a04d5e]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Subir imagen
          <input type="file" class="sr-only" accept="image/*" (change)="onFileInput($event)" />
        </label>

        <label class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#e8d484] px-4 py-2 text-sm font-medium text-[#2a1820] transition-colors hover:bg-[#d4c070]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Usar cámara
          <input type="file" class="sr-only" accept="image/*" capture="environment" (change)="onFileInput($event)" />
        </label>
      </div>
    </div>
  `,
})
export class UploadZoneComponent {
  readonly imageSelected = output<string>();

  readonly isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.readFile(file);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.readFile(file);
  }

  private readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) this.imageSelected.emit(result);
    };
    reader.readAsDataURL(file);
  }
}
