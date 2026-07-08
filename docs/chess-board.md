# El tablero (`features/chess-board/`)

## Idea central

Hay dos capas, a propósito separadas:

- **`<app-board>`** (`components/board/board.component.ts`) — el tablero en sí. No sabe
  nada de `GameStateService`, de OCR, ni de historia de partida. Solo sabe "aquí hay una
  posición (FEN)" y "el usuario ha intentado esta jugada". Es la pieza reutilizable —
  se podría usar en una página de puzzles o en cualquier otro sitio sin tocarla.
- **`<app-chess-board>`** (`components/chess-board/chess-board.component.ts`) — el
  contenedor que se usa de verdad en `AnalysisPage`. Conecta `<app-board>` con
  `GameStateService` (historia, huecos OCR, PGN) y con `ChessRulesService` (jaque),
  y añade los controles de navegación + el aviso de "tablero pausado".

Si necesitas cambiar **qué se ve y cómo se interactúa** → toca `board.component.ts`.
Si necesitas cambiar **qué pasa cuando se hace una jugada** (guardarla, validarla,
encajarla en la partida) → toca `chess-board.component.ts` o `GameStateService`.

## Mapa de ficheros

```
core/services/chess-rules.service.ts     Adaptador fino sobre chess.js (sin estado)
features/chess-board/
  models/board.model.ts                  Orientation, BoardMoveAttempt, DrawableArrow/Circle...
  utils/board-geometry.ts                casilla <-> posición en % según orientación
  utils/piece-diff.ts                    diff entre dos posiciones -> qué animar
  components/
    board/board.component.ts             el tablero (presentacional)
    promotion-picker/promotion-picker.component.ts
    chess-square/chess-square.component.ts   una casilla (solo visual)
    chess-piece/chess-piece.component.ts     <img> de una pieza SVG
    chess-board/chess-board.component.ts     contenedor conectado a GameStateService
    board-controls/board-controls.component.ts  barra de navegación + botón voltear
```

## Usar `<app-board>` desde otro sitio

```html
<app-board
  [fen]="fen()"
  [orientation]="orientation()"
  [lastMove]="lastMove()"
  [checkSquare]="checkSquare()"
  [interactive]="true"
  (moveMade)="onMoveMade($event)"
/>
```

```ts
onMoveMade(attempt: BoardMoveAttempt): void {
  // attempt = { from: 'e2', to: 'e4' } o { from: 'e7', to: 'e8', promotion: 'q' }
  // El tablero ya ha comprobado que es un destino legal; decide tú qué hacer con ella
  // (aquí es donde ChessBoardComponent llama a gameState.makeMove(...)).
}
```

El tablero nunca decide si una jugada "cuenta" — solo garantiza que `from`→`to` es un
movimiento legal según `ChessRulesService` en el momento de soltar/hacer click. Quien
escucha `moveMade` es responsable de aplicarla (o no).

## Cómo se pinta

`fen` se convierte en un mapa `casilla -> pieza` con `parseFen` (ya existía en
`core/utils/fen.utils.ts`). A partir de ahí hay tres capas independientes, todas
`position: absolute` una encima de otra:

1. **Casillas** (`ChessSquareComponent` × 64) — color, coordenadas, y todos los
   resaltados (seleccionada, destino legal/captura, último movimiento, jaque, casilla
   sobre la que se está soltando un arrastre). Es puramente visual, no tiene lógica ni
   eventos propios.
2. **Piezas** — a diferencia de antes, **no viven dentro de la casilla**: cada pieza es
   un `<div>` posicionado con `left/top` en `%` (`board-geometry.ts`), calculado a
   partir de casilla + orientación. Esto es lo que permite animar: si solo cambias el
   `left/top` de un elemento que ya existía, el navegador interpola solo gracias a la
   `transition` en CSS (`.piece-slot { transition: left 180ms, top 180ms }`) — no hace
   falta ninguna librería de animación.
3. **Ghost de arrastre** — la pieza que sigue al puntero mientras se arrastra. Va aparte
   porque no puede tener `transition` (tiene que seguir al dedo/ratón sin retraso).

Encima de todo: el SVG de flechas/círculos, y el selector de promoción cuando aplica.

## Animación entre posiciones (`piece-diff.ts`)

Cada vez que cambia `fen`, se compara la posición anterior con la nueva
(`diffBoards`). El resultado son tres listas:

- `moved`: una pieza que estaba en A y una pieza del mismo tipo/color que apareció en
  B → se tratan como la misma pieza. Esto incluye capturas normales (la pieza capturada
  sale en `disappeared` aparte).
- `appeared` / `disappeared`: todo lo demás (promoción, enroque, saltos de varias
  jugadas en el listado) — no se intenta animar el desplazamiento, solo aparecen/
  desaparecen con un fade corto (`piece-enter`/`piece-exit` en CSS).

Es una simplificación deliberada: intentar animar bien un enroque o un salto de 5
jugadas de golpe no compensa la complejidad. El 95% de las interacciones reales son
"una jugada", y esas sí se deslizan.

**Detalle importante de implementación** (si tocas `syncPieces`): el `effect()` que
llama a esto lee `fen()` y escribe el signal `renderedPieces`. Si dentro de la función
lees `this.renderedPieces()` para saber qué había antes, el efecto pasa a depender de
su propia salida y se retriggerea sin parar (cuelga la pestaña — nos pasó durante el
desarrollo). Por eso `syncPieces` lee de `this.pieces`, un array plano normal que se
mantiene sincronizado a mano, y solo al final escribe `this.renderedPieces.set(...)`.
Si necesitas tocar esta función, mantén esa separación.

## Interacción — un único listener de Pointer Events

No hay un listener por casilla. Hay tres (`pointerdown`/`pointermove`/`pointerup`) en
el contenedor raíz del tablero, y una función (`squareFromPoint` en
`board-geometry.ts`) que calcula en qué casilla cayó el evento a partir de
`getBoundingClientRect()` — nada de `elementFromPoint`. Esto unifica ratón, dedo y
lápiz óptico en el mismo código (`PointerEvent` los trata igual).

Resumen de la máquina de estados (ver `onPointerDown`/`onPointerMove`/`onPointerUp` en
`board.component.ts` para el detalle exacto):

- **`pointerdown`** con el botón izquierdo:
  - Si ya había una casilla seleccionada y esta es un destino legal → jugar
    directamente (click-to-move, segundo click).
  - Si la casilla tiene una pieza del color que mueve → seleccionarla y armar un
    posible arrastre (sin confirmar todavía que es un "arrastre" de verdad).
  - Si no → deseleccionar.
- **`pointermove`**: si el puntero se ha movido más de 5px desde el `pointerdown`, se
  confirma que es un arrastre (`draggingFrom` se activa, la pieza estática se oculta y
  aparece el ghost seguiendo al puntero).
- **`pointerup`**: si hubo arrastre de verdad, se calcula la casilla final y se intenta
  la jugada si es legal (si no, no pasa nada — la pieza "vuelve" sola porque nunca
  cambió de sitio en el estado, solo se dejó de ocultar). Si no hubo arrastre (fue solo
  un tap), no hace falta hacer nada más: la selección ya se resolvió en el
  `pointerdown`.
- **Botón derecho** (`event.button === 2`): arranca un arrastre de anotación
  independiente. Al soltar, si empezó y acabó en la misma casilla se guarda como
  círculo; si no, como flecha. Las flechas/círculos son estado interno del propio
  `BoardComponent` (`shapes`, un signal) — se limpian solas en cualquier click
  izquierdo o al confirmarse una jugada.

## Promoción

Antes de emitir `moveMade`, el tablero comprueba con
`ChessRulesService.needsPromotion(fen, from, to)` (peón llegando a la última fila). Si
hace falta, no emite nada todavía: guarda `pendingPromotion` y muestra
`<app-promotion-picker>` centrado sobre la casilla destino. Al elegir pieza, ahí sí se
emite `moveMade` con `promotion` incluido. Si se cancela (click fuera), no se emite
nada — como el estado (`fen`) nunca cambió, la pieza aparece de vuelta en su sitio sin
hacer nada especial.

## Orientación

`orientation: 'white' | 'black'` afecta a tres cosas, todas centralizadas en
`board-geometry.ts` para que no se puedan desincronizar:

- El orden de iteración de filas/columnas al pintar las casillas (`BoardComponent.files()`/`.ranks()`).
- El cálculo de posición de una pieza (`squareTopLeftPercent`).
- El cálculo inverso, casilla bajo el puntero (`squareFromPoint`).

Si algo se ve descuadrado al voltear el tablero, casi seguro que es porque alguna de
estas tres cosas no está usando `orientation()` correctamente.

## `ChessRulesService`

Vive en `core/services/` (no dentro de `chess-board/`) porque conceptualmente es un
adaptador de "reglas de ajedrez", no parte del tablero. Es intencionadamente delgado y
sin estado — cada llamada crea su propio `new Chess(fen)` interno:

- `legalDestinations(fen, square)` — destinos legales de la pieza en `square`.
- `needsPromotion(fen, from, to)` — ¿esta jugada requiere elegir pieza?
- `isCheck(fen)` / `kingSquare(fen, color)` — para el resaltado de jaque.

Si el día de mañana se cambia de librería de reglas, este es el único fichero que
debería hacer falta tocar.

## `ChessBoardComponent` (el contenedor real)

Lo que usa `AnalysisPage`. Su trabajo:

- Pasar a `<app-board>` lo que ya expone `GameStateService`: `currentFen()`,
  `lastMoveSquares()`.
- Calcular `checkSquare` con `ChessRulesService` (el tablero no lo calcula solo, se le
  da ya calculado).
- Mantener la orientación como estado propio (signal local, con el botón "voltear" de
  `BoardControlsComponent`) — no vive en `GameStateService` porque es una preferencia
  de visualización, no parte de la partida.
- Al recibir `(moveMade)`, llamar a `gameState.makeMove(from, to, promotion ?? 'q')` —
  este método ya existía y ya sabe corregir huecos OCR y revalidar en cascada; no hizo
  falta tocarlo.

## Limitaciones conocidas / próximos pasos

Cosas que quedaron fuera a propósito de esta primera versión, por si hace falta
retomarlas:

- El diff de animación solo trata bien el caso "una jugada" (incluye capturas); un
  enroque o un salto de varias jugadas en el listado no desliza, solo aparece/desaparece.
- No hay navegación por teclado ni anuncios `aria-live` para lectores de pantalla.
- No hay resaltado distinto para jaque mate/tablas (usa el mismo pulso que jaque simple).
- Las flechas son de un único color; no hay modificadores de teclado para cambiarlo
  (como en Lichess).
- No hay ninguna integración *programática* entre el tablero y la confianza OCR más
  allá de lo que ya hace `MoveRowComponent` en la lista (p. ej. no hay flechas
  sugeridas automáticas cuando una jugada del OCR es inválida).
