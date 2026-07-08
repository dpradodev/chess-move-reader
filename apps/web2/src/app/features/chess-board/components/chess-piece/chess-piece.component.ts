import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-chess-piece',
  template: `
    <img
      [src]="src()"
      [alt]="alt()"
      class="h-full w-full"
      draggable="false"
    />
  `,
  host: { class: 'block w-full h-full pointer-events-none' },
})
export class ChessPieceComponent {
  readonly type  = input.required<string>();
  readonly color = input.required<'w' | 'b'>();

  readonly src = computed(() => `/pieces/${this.color()}${this.type()}.svg`);
  readonly alt = computed(() => `${this.color() === 'w' ? 'white' : 'black'} ${this.type()}`);
}
