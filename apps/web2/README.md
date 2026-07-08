# apps/web2 — ChessKeeper (Gestor de planillas de ajedrez)

Nueva web que evoluciona el proyecto de "analizador de una planilla" (`apps/web`) a
"gestor de planillas": biblioteca de partidas guardadas, cuentas de usuario, y el mismo
flujo de escaneo + corrección que ya existe, pero pensado para uso recurrente en vez de
una sesión suelta.

`apps/web` **no se toca ni se retira** mientras se construye esta — conviven en
paralelo hasta que `apps/web2` cubra lo mismo (y más) y se decida el cambio.

## Origen del diseño

El diseño viene de Figma Make (`/design` en la raíz del repo — código React + Vite +
Tailwind v4 + shadcn/ui, no se ejecuta ni se despliega, es solo referencia). Este
scaffold ya trae portados desde ahí:

- El sistema de color (`src/styles/theme.css`) — tema oscuro, dorado como color de
  acento (`--primary: #d4a843`), tal cual el diseño.
- Las tipografías (`src/styles/fonts.css` — Libre Baskerville para títulos, DM Sans
  para texto, JetBrains Mono para notación de ajedrez).
- El mapa de pantallas como rutas (`auth`, `scan`, `analyzing`, `editor`, `archive`) —
  las 5 ya están portadas con su contenido real, ver "Pantallas portadas" más abajo.

Lo que **no** se ha traído todavía (deliberado, es la siguiente fase, no esta):

- La mayoría de componentes de `design/src/app/components/ui/` (shadcn/Radix) — solo
  se han portado Button/Card/Badge (ver "Sistema de diseño" más abajo); el resto
  (dialog, select, tabs, etc.) se añadirá según haga falta al portar cada pantalla,
  no hay un port automático de React a Angular.
- La lógica de `App.tsx` (estado de pantallas, tablero de demo, movimientos, etc.).
- Iconos (el diseño usa `lucide-react`, específico de React — para Angular habrá que
  decidir entre SVGs inline como ya hace `apps/web`, o una librería de iconos Angular).

## Stack

Igual que `apps/web`: Angular 22 (standalone, signals), Tailwind CSS v4, TypeScript
strict, Vitest. `chess.js` ya incluida como dependencia porque la pantalla `editor`
casi seguro reutilizará (o adaptará) `features/chess-board` de `apps/web`.

## Desarrollo local

```bash
cd apps/web2
npm install
npm start
```

Sirve en `http://localhost:4201/` (puerto distinto a `apps/web`, que usa el 4200, para
poder correr ambas a la vez mientras convive el diseño antiguo y el nuevo).

## Estructura

```
src/app/
  core/       (vacío por ahora) servicios transversales — auth, api client, etc.
  shared/
    components/ui/   primitivos base (button, card, badge) — ver "Sistema de diseño"
  features/   (vacío por ahora) piezas de funcionalidad por pantalla
  pages/      una carpeta por pantalla (auth, scan, analyzing, editor, archive),
              cada una cargada de forma perezosa (`loadComponent`) desde app.routes.ts
```

## Sistema de diseño

`design/src/app/App.tsx` (1405 líneas) **no usa** los componentes shadcn de
`design/src/app/components/ui/` — están ahí como boilerplate de Figma Make, pero la
pantalla real está escrita con clases de Tailwind sueltas (34 botones, cada uno con
sus propias clases). Así que en vez de portar ese boilerplate sin usar, se extrajeron
los patrones reales del diseño:

**Colores** (`src/styles/theme.css`) — además del tema base ya portado, se añadieron
los tokens que `App.tsx` usa como hex sueltos:
- `--board-light` / `--board-dark` (`#f0d9b5` / `#b58863`) — tablero de vista previa
  "madera clásica", **distinto** del tablero rosa/dorado premium de `apps/web`
  (`docs/chess-board.md`). El tablero interactivo real del `editor` seguirá usando
  ese, no este — este es solo para previsualizaciones ligeras (p. ej. una miniatura en
  `archive`).
- `--confidence-high/good/medium/low/poor` — escala discreta de 5 colores para
  confianza OCR (`#4ade80/#a3e635/#facc15/#fb923c/#f87171`), extraída de la función
  `confidenceColor()` en `App.tsx`. Es un esquema **distinto** al degradado continuo
  `hsl()` que usa `MoveRowComponent` en `apps/web` — habrá que decidir cuál usar (o si
  conviven) cuando se porte el editor de jugadas.
- `--piece-white` / `--piece-black` / `--board-coord-bg` — colores de las piezas
  (glifos unicode) y del gutter de coordenadas del tablero de vista previa.

Todos expuestos como utilidades de Tailwind (`bg-board-light`, `text-confidence-high`,
etc.) vía el bloque `@theme inline` en el mismo fichero.

**Tamaños / media queries** — el diseño no personaliza el radio de esquinas más allá
de `--radius` (ya portado) ni los breakpoints (usa `sm/md/lg/xl` de Tailwind por
defecto, sin overrides) — no hizo falta configurar nada ahí. Los tamaños de
componente (botones `sm/default/lg/icon`, etc.) se definen por componente, ver abajo.

**Componentes** (`shared/components/ui/`) — primitivos reescritos en Angular
replicando las clases reales de `design/src/app/components/ui/{button,card,badge}.tsx`
(aunque el diseño no los use, sí anticipan el sistema de variantes que conviene seguir
al portar pantallas nuevas):
- `ButtonComponent` — `variant: default|secondary|outline|ghost|destructive|link`,
  `size: default|sm|lg|icon`.
- `CardComponent` + `CardHeader/Title/Description/Action/Content/Footer` — cada parte
  aplica sus clases al propio host (`host: { class: '...' }`), así que se le pueden
  añadir clases extra de forma normal en Angular: `<app-card class="mb-6">`.
- `BadgeComponent` — `variant: default|secondary|destructive|outline`.

Demo visual de los tres en `pages/archive/archive.page.ts` (temporal, hasta que se
porte el contenido real de `archive` — bórralo o muévelo a una ruta de style-guide
cuando llegue el momento).

También se añadió `SpinnerComponent` (`shared/components/ui/spinner/`) — mismo patrón
que el de `apps/web` (círculo con `animate-spin`, sin depender de `lucide-react`, que
es específico de React).

## Pantallas portadas

- **`auth`** ✅ — login/registro con pestañas, formulario, estado de carga y fondo
  decorativo, tal cual `design/src/app/App.tsx` (`AuthScreen`). La autenticación está
  **mockeada**: `core/services/auth.service.ts` simula el mismo retraso de ~900ms del
  prototipo de Figma y no llama a ningún backend todavía — al hacer login/registro
  navega a `/scan`. Cuando `apps/api` tenga un endpoint de usuarios real, solo hay que
  cambiar el cuerpo de `AuthService.login`/`register` (misma forma pública,
  `Observable<UserProfile>`), no los consumidores.
- **`scan`** ✅ — zona de drag & drop, botón de cámara (mismo `<input type=file>`
  oculto que la zona, sin `capture`, igual que el diseño), preview con overlay de
  "Imagen cargada", CTA "Analizar planilla" (deshabilitado hasta que hay preview) y
  atajo "Continuar sin planilla". El análisis también está **mockeado**:
  `core/services/analysis.service.ts` simula el contrato real de `apps/api` (crear
  devuelve `{id, status: "processing"}` al momento, luego hay que consultar
  `getAnalysis(id)` hasta `"done"`), con las mismas jugadas de ejemplo (Ruy López con
  hueco) que usan `apps/web`/`apps/ocr`. Al analizar navega a `/analyzing?id=...`.
  Iconos (upload, cámara, check) reutilizan los SVG exactos ya escritos en
  `apps/web` — sin añadir ninguna librería de iconos.
- **`analyzing`** ✅ — icono de peón animado (pulse + anillo `animate-ping`), barra de
  progreso y lista de 4 pasos (`Detectando bordes...`, `Extrayendo cuadrícula...`,
  `Interpretando notación...`, `Validando secuencia...`), tal cual
  `design/src/app/App.tsx` (`AnalyzingScreen`). A diferencia del original en React
  —que simula el progreso con un temporizador fijo y nunca llama a nada— esta versión
  combina esa misma animación visual (cadencia de 650ms/paso, solo estética) con
  **polling real** contra `AnalysisService.getAnalysis(id)` (mockeado, resuelve a
  `"done"` a los ~2200ms): la navegación a `/editor?id=...` sólo ocurre cuando *ambas*
  cosas terminan (animación Y el job mock), así que cuando se conecte al `apps/api`
  real el único cambio es dentro de `AnalysisService`, no en esta página. Si no hay
  `id` en la query, redirige a `/scan`; si el job termina en `"error"`, muestra un
  panel con el mensaje y un botón para volver a `/scan` (no hace un bounce silencioso).
  El atajo "Continuar sin planilla" de `scan` navega directo a `/editor` y **nunca**
  pasa por esta pantalla (correcto: no hay nada que analizar).
- **`editor`** ✅ — tablero interactivo real + planilla editable, no un mockup estático.
  En vez de reescribir el tablero (como hace `design/src/app/App.tsx`, con un
  `<ChessBoard>` de solo lectura), se **portó el tablero premium completo de
  `apps/web`** (`features/chess-board/`, ver `docs/chess-board.md` en la raíz del
  repo) junto con todo lo que necesita para funcionar: `core/services/GameStateService`
  + `ChessRulesService`, `core/models/{move,game,position}.model.ts`,
  `core/utils/fen.utils.ts` — copias verbatim, son lógica de dominio pura sin nada de
  estilo. Lo único que cambia respecto a `apps/web` es la piel:
  - `ChessSquareComponent`: `bg-board-light`/`bg-board-dark` (tokens ya extraídos en
    `styles/theme.css`) en vez del rosa/dorado de `apps/web`; coordenadas con el tono
    contrario (efecto "grabado en la madera").
  - `BoardComponent`: aro `ring-primary/20` + `shadow-2xl` en vez del rosa de apps/web.
  - `PromotionPickerComponent`: tarjeta `bg-card`/`border-border` en vez de crema.
  - `BoardControlsComponent`: **reescrito** — botones individuales con borde
    (`border-border`, `hover:border-primary/40`) en vez del grupo en píldora de
    apps/web, seedeado en los iconos skip-back/chevron/skip-forward que usa
    `design/src/app/App.tsx` (lucide-react) pero como SVG inline (mismo criterio que
    `scan`: sin librería de iconos). Conserva el botón de voltear tablero, que el
    diseño original nunca llegó a cablear (`setFlipped` estaba muerto en el código
    fuente de Figma Make).
  - `/pieces/*.svg` copiados literalmente de `apps/web/public/pieces/`.
  Planilla: `features/move-list/` (nuevo, no reutiliza `apps/web`'s `move-sheet` tal
  cual porque el marcado visual del diseño es bastante distinto — puntos de confianza
  al estilo `ConfidenceDot` de `App.tsx`, celda "no detectada" con borde discontinuo)
  pero con la MISMA máquina de estados por debajo (`MoveStatus`: validated/manual/
  inferred/unvalidated/gap) y el mismo patrón de edición in-place al hacer click.
  La escala de confianza de 5 pasos usa los tokens `--confidence-*` ya extraídos
  (cierra el círculo del trabajo de sistema de diseño de la sesión anterior). PGN:
  modal con copiar/descargar (`gameState.pgn()`, sin cambios). "Guardar" está
  **mockeado** (estado transitorio "Guardado" 2s, sin persistencia real todavía).
  Al entrar con `?id=...` (desde `analyzing`), pide `AnalysisService.getAnalysis(id)`
  y carga las jugadas reales; sin `id` (atajo demo) arranca en blanco
  (`gameState.reset()` explícito, por si el singleton traía una partida anterior de
  la misma sesión de navegador). Cabecera propia mínima (logo + "Volver" a `/scan`) en
  vez de la `NavBar` completa del diseño (con enlaces Analizar/Partidas y menú de
  usuario) — esa sigue pendiente, ver más abajo.
  **Metadatos de partida** (2026-07-05, cierra el hueco dejado deliberadamente antes):
  formulario de jugadores/torneo/fecha/ronda/mesa/resultado (`core/models/game-meta.model.ts`,
  estado local de la página — no viene de `AnalysisService`, el OCR nunca detecta esto,
  lo confirma el propio dato de demo hardcodeado del diseño). Panel colapsable en móvil
  igual que en `design/src/app/App.tsx`, siempre visible en desktop. El desplegable de
  resultado sincroniza con `GameStateService` (nuevo método `setResult()`) para que el
  token final del PGN (`1-0`/`0-1`/`1/2-1/2`) sea coherente con lo elegido — el dropdown
  muestra "½-½" (más legible) pero el PGN real usa la notación ASCII estándar
  `1/2-1/2`, que es lo que exigen lichess/chess.com al importar (el prototipo de Figma
  metía el símbolo unicode literal en el PGN, lo cual no es válido fuera de la propia
  demo — se corrigió en el port, ver `core/utils/pgn.utils.ts`). El PGN completo
  (cabeceras `[Event]/[Site]/[Date]/[Round]/[White]/[Black]/[Result]` + el cuerpo de
  `gameState.pgn()`) es lo que ahora se ve en el modal, se copia y se descarga —
  antes solo eran las jugadas sueltas. El nombre del fichero descargado usa los
  apellidos de blancas/negras (`Carlsen_vs_Caruana.pgn`), con fallback a `partida.pgn`
  si los nombres están vacíos.
  **Sigue fuera de alcance**: añadir/borrar jugadas sueltas de la lista — `GameStateService`
  no soporta esa operación todavía, y no hacía falta para lo pedido aquí.
  **Selector de fecha propio** (2026-07-08): el campo de fecha sustituyó el
  `<input type="date">` nativo por `shared/components/ui/date-picker/` — el widget
  nativo no se puede restylear (icono y popup del navegador ignoran el tema oscuro,
  quedan mal). Es un `ControlValueAccessor` normal (funciona con `[(ngModel)]="meta.date"`
  igual que el input al que sustituye, el valor sigue siendo un string ISO
  `yyyy-mm-dd`), con su propio calendario mensual (mes anterior/siguiente, día de hoy
  resaltado con anillo, botón "Hoy"), backdrop a pantalla completa para cerrar al
  hacer click fuera (mismo patrón que `promotion-picker` del tablero) y tecla Escape.
  Sin dependencias nuevas — nada de Angular Material ni ningún date-picker de npm,
  solo `Date` nativo (el `calendar.tsx` de `design/components/ui/` usa
  `react-day-picker`, que es específico de React y de todas formas es boilerplate sin
  conectar a `App.tsx`, como el resto de esa carpeta).
  **Tablero a pantalla completa en desktop** (2026-07-08): antes el tablero tenía un
  `max-width: 480px` fijo aunque sobrara muchísimo espacio en pantallas anchas. En
  `≥1024px` (`lg`), el contenedor del tablero (`.board-fit`) pasa a `flex: 1 1 0%` para
  ocupar toda la altura sobrante de la columna y se convierte en un *size container*
  (`container-type: size`); el tablero en sí (`.board-square`) se dimensiona con
  `width/height: min(100cqw, 100cqh)` — el truco CSS clásico para un cuadrado que debe
  caber en ambos ejes a la vez sin desbordar ninguno, sin JS ni `ResizeObserver`. En
  móvil no cambia nada (sigue capado a 480px, el ancho es la única dimensión escasa
  ahí). Verificado con Playwright en tres anchos de viewport: pantalla ancha (tablero
  crece a 843px, antes se habría quedado en 480px), pantalla de poca altura (el
  tablero se encoge a 493px para no desbordar la sección verticalmente, siempre
  cuadrado), y móvil (sin cambios) — más una comprobación de que el tablero sigue
  siendo interactivo (click-to-move) tras el redimensionado.
- **`archive`** ✅ — buscador (con debounce), pestañas de resultado, filtros avanzados
  (torneo + rango de fechas con `app-date-picker`, el mismo componente del editor) y
  la rejilla de tarjetas de partida — ported 1:1 de `ArchiveScreen` en `App.tsx`.
  A diferencia del prototipo de React, que filtra en memoria sobre el array completo,
  aquí el filtrado vive **dentro de `ArchiveService.listGames(filters)`**
  (`core/services/archive.service.ts`) — la página manda los filtros y recibe la
  lista ya filtrada, simulando cómo se comportaría un endpoint real de listado
  paginado/filtrable (justo lo que falta en `apps/api`, que hoy solo gestiona
  análisis sueltos, no una biblioteca por usuario). Mismo dataset de demo que el
  diseño (6 partidas, `core/models/archive-game.model.ts`). "Ver" abre el editor en
  blanco (mismo camino que el atajo "Continuar sin planilla" de `scan`) porque las
  partidas mockeadas no llevan lista de jugadas todavía, solo metadatos + número de
  jugadas — no hay nada real que cargar. El botón "PGN" por tarjeta se dejó
  **deshabilitado con tooltip** en vez de un botón sin `onClick` como en el diseño
  (ahí no hace nada al pulsarlo, sin ningún indicio visual) — exportar el PGN de una
  partida archivada necesitará que el backend real devuelva también sus jugadas.
  Estado de carga con `app-spinner` mientras resuelve el mock (350ms) — el diseño no
  lo necesita porque su filtrado es síncrono.

## Layout compartido (`layout/shell/`, 2026-07-05)

Todas las pantallas autenticadas (`scan`, `analyzing`, `editor`, `archive`) llevan la
`NavBar` del diseño (`shared/components/nav-bar/`) — logo, enlaces "Analizar"/"Partidas",
usuario + cerrar sesión, menú hamburguesa en móvil. `auth` **no** la lleva.

Cómo está resuelto (`app.routes.ts`): `auth` es una ruta hermana normal; las otras
cuatro cuelgan como `children` de una ruta padre con `path: ''` que carga
`ShellComponent` (header fijo `h-14` + `<router-outlet>` en un contenedor
`flex-1 overflow-y-auto`). El path vacío en el padre no añade segmento a la URL —
`/scan` sigue siendo `/scan`, no `/app/scan` — así que es invisible para quien navega,
solo cambia qué envuelve a qué. Cada página deja de asumir que es dueña de todo el
viewport: `min-h-dvh`/`h-dvh` en la raíz de cada página pasó a `min-h-full`/`h-full`
(si no, cada pantalla mediría 100dvh **más** los 56px del header, y sobraría scroll).
`editor` perdió su cabecera mínima ad-hoc (logo + "Volver") que se había puesto de
parche antes de que existiera el layout compartido — ya no hace falta, la `NavBar`
cubre esa navegación.

El estado activo del nav ("Analizar" también se enciende en `/analyzing`, no solo en
`/scan") se deriva del propio Router (`NavigationEnd` vía `toSignal`), no de un enum de
pantalla en memoria como hace el prototipo de React (`design/src/app/App.tsx` guarda
`screen` en un `useState` porque ahí no hay Router real, es un switch manual). Sin
guard de autenticación todavía (`AuthService.user()` puede ser `null` si se navega
directo a `/scan` sin pasar por login) — la `NavBar` no rompe en ese caso, muestra
"Invitado", pero no bloquea el acceso; añadir un guard real es trabajo aparte, no
estaba pedido aquí.

## Próximos pasos

Las 5 pantallas del diseño ya están portadas (`auth`, `scan`, `analyzing`, `editor`,
`archive`). Lo que queda es conectar backend real donde todavía es mock:

1. `apps/api` necesita endpoints nuevos para una biblioteca de partidas por usuario
   (listar con filtros server-side, guardar, y devolver las jugadas de una partida
   concreta) — hoy solo gestiona análisis sueltos. Esto desbloquea tres cosas mockeadas
   a la vez: `ArchiveService.listGames()`, el botón "Guardar" del editor, y el botón
   "PGN" de cada tarjeta de `archive` (deshabilitado hasta que haya jugadas reales
   que exportar).
2. Soporte de añadir/borrar jugadas sueltas en `GameStateService` (el diseño lo pide
   en `editor` vía los iconos de basura junto a cada jugada; no implementado todavía).
3. Guard de autenticación real en las rutas del `ShellComponent` (hoy se puede navegar
   a `/scan` sin haber iniciado sesión; `AuthService.user()` sencillamente será `null`).
