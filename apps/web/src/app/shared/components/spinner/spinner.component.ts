import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: `
    <span
      role="status"
      [attr.aria-label]="label()"
      class="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      [class]="sizeClass()"
    ></span>
  `,
})
export class SpinnerComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly label = input('Cargando...');

  sizeClass(): string {
    const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
    return sizes[this.size()];
  }
}
