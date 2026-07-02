import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="buttonClasses()"
      (click)="clicked.emit()"
    >
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly fullWidth = input(false);

  readonly clicked = output<void>();

  buttonClasses(): string {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-[#b85c6e] text-white hover:bg-[#a04d5e] focus:ring-[#b85c6e]',
      secondary: 'bg-[#e8d484] text-[#2a1820] hover:bg-[#d4c070] focus:ring-[#b85c6e]',
      ghost: 'text-[#7a4a58] hover:bg-[#f5e8ec] focus:ring-[#b85c6e]',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const width = this.fullWidth() ? 'w-full' : '';

    return [base, variants[this.variant()], sizes[this.size()], width].filter(Boolean).join(' ');
  }
}
