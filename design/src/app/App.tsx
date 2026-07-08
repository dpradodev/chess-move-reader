import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera, Upload, ChevronLeft, ChevronRight, ChevronDown, Download, Save,
  Search, Calendar, Trophy, User, LogOut, Edit2, X, FileText,
  ScanLine, BookOpen, SkipBack, SkipForward, RotateCcw,
  Filter, Check, Eye, Loader2, Plus, Trash2,
} from "lucide-react";

// ─── Brand ────────────────────────────────────────────────────────────────────

function RookIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Merlons */}
      <rect x="2" y="2" width="5" height="5" rx="0.75" />
      <rect x="9.5" y="2" width="5" height="5" rx="0.75" />
      <rect x="17" y="2" width="5" height="5" rx="0.75" />
      {/* Upper body */}
      <rect x="2" y="6" width="20" height="4" />
      {/* Shaft */}
      <rect x="4" y="10" width="16" height="7" />
      {/* Base */}
      <rect x="1" y="17" width="22" height="5" rx="1" />
    </svg>
  );
}

function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scales = { sm: { icon: 14, text: "text-base" }, md: { icon: 18, text: "text-lg" }, lg: { icon: 28, text: "text-4xl" } };
  const s = scales[size];
  return (
    <div className="flex items-center gap-2.5">
      <div className={[
        "rounded-lg bg-primary flex items-center justify-center shrink-0",
        size === "lg" ? "w-12 h-12 rounded-xl" : "w-7 h-7",
      ].join(" ")}>
        <RookIcon size={s.icon} className="text-primary-foreground" />
      </div>
      <span
        className={`${s.text} tracking-tight text-foreground leading-none`}
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        Chess<span className="text-primary">Keeper</span>
      </span>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "auth" | "scan" | "analyzing" | "editor" | "archive";
type AuthMode = "login" | "register";
type Piece = { type: "K" | "Q" | "R" | "B" | "N" | "P"; color: "w" | "b" } | null;
type Board = Piece[][];
interface Move {
  num: number;
  white: string; whiteConf: number; whiteConfirmed: boolean; whiteIllegal: boolean; whiteInferred: boolean;
  black: string; blackConf: number; blackConfirmed: boolean; blackIllegal: boolean; blackInferred: boolean;
}

interface HalfMoveState {
  undetected: boolean;
  illegal: boolean;
  gray: boolean;
}
interface Game {
  id: number; white: string; black: string;
  date: string; tournament: string; result: string;
  moves: number;
}
interface UserProfile { name: string; email: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const GLYPHS = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
} as const;

// Ruy Lopez position after 12...Re8
const DEMO_BOARD: Board = [
  [{ type: "R", color: "b" }, null, null, { type: "Q", color: "b" }, { type: "R", color: "b" }, null, { type: "K", color: "b" }, null],
  [null, { type: "B", color: "b" }, { type: "P", color: "b" }, { type: "N", color: "b" }, { type: "B", color: "b" }, { type: "P", color: "b" }, { type: "P", color: "b" }, { type: "P", color: "b" }],
  [{ type: "P", color: "b" }, null, null, { type: "P", color: "b" }, null, { type: "N", color: "b" }, null, null],
  [null, { type: "P", color: "b" }, null, null, { type: "P", color: "b" }, null, null, null],
  [null, null, null, { type: "P", color: "w" }, { type: "P", color: "w" }, null, null, null],
  [null, null, { type: "P", color: "w" }, null, null, { type: "N", color: "w" }, null, { type: "P", color: "w" }],
  [{ type: "P", color: "w" }, { type: "P", color: "w" }, { type: "B", color: "w" }, { type: "N", color: "w" }, null, { type: "P", color: "w" }, { type: "P", color: "w" }, null],
  [{ type: "R", color: "w" }, null, null, { type: "Q", color: "w" }, { type: "R", color: "w" }, null, { type: "K", color: "w" }, null],
];

const INITIAL_MOVES: Move[] = [
  { num: 1,  white: "e4",   whiteConf: 0.97, whiteConfirmed: true,  whiteIllegal: false, whiteInferred: false, black: "e5",   blackConf: 0.95, blackConfirmed: true,  blackIllegal: false, blackInferred: false },
  { num: 2,  white: "Nf3",  whiteConf: 0.93, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "Nc6",  blackConf: 0.91, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 3,  white: "Bb5",  whiteConf: 0.88, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "a6",   blackConf: 0.85, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 4,  white: "Ba4",  whiteConf: 0.82, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "Nf6",  blackConf: 0.79, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 5,  white: "O-O",  whiteConf: 0.90, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "Be7",  blackConf: 0.86, blackConfirmed: false, blackIllegal: false, blackInferred: true  },
  { num: 6,  white: "Re1",  whiteConf: 0.74, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "b5",   blackConf: 0.70, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 7,  white: "Bb3",  whiteConf: 0.66, whiteConfirmed: false, whiteIllegal: false, whiteInferred: true,  black: "",     blackConf: 0,    blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 8,  white: "c3",   whiteConf: 0.58, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "O-O",  blackConf: 0.55, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 9,  white: "h3",   whiteConf: 0.48, whiteConfirmed: false, whiteIllegal: true,  whiteInferred: false, black: "Nb8",  blackConf: 0.41, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 10, white: "d4",   whiteConf: 0.35, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "Nbd7", blackConf: 0.29, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 11, white: "Nbd2", whiteConf: 0.22, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "Bb7",  blackConf: 0.18, blackConfirmed: false, blackIllegal: false, blackInferred: false },
  { num: 12, white: "Bc2",  whiteConf: 0.14, whiteConfirmed: false, whiteIllegal: false, whiteInferred: false, black: "Re8",  blackConf: 0.11, blackConfirmed: false, blackIllegal: false, blackInferred: false },
];

const TOURNAMENTS = [
  "All Tournaments",
  "World Championship 2024",
  "Grand Chess Tour Paris",
  "Sinquefield Cup",
  "Legends of Chess",
  "Tata Steel India",
];

const ARCHIVE_GAMES: Game[] = [
  { id: 1, white: "Magnus Carlsen", black: "Fabiano Caruana", date: "2024-11-14", tournament: "World Championship 2024", result: "1-0", moves: 47 },
  { id: 2, white: "Hikaru Nakamura", black: "Ian Nepomniachtchi", date: "2024-11-10", tournament: "World Championship 2024", result: "½-½", moves: 32 },
  { id: 3, white: "Ding Liren", black: "Magnus Carlsen", date: "2024-10-05", tournament: "Grand Chess Tour Paris", result: "0-1", moves: 63 },
  { id: 4, white: "Alireza Firouzja", black: "Wesley So", date: "2024-09-20", tournament: "Sinquefield Cup", result: "1-0", moves: 41 },
  { id: 5, white: "Viswanathan Anand", black: "Levon Aronian", date: "2024-08-15", tournament: "Legends of Chess", result: "½-½", moves: 28 },
  { id: 6, white: "Gukesh D", black: "Praggnanandhaa R", date: "2024-07-22", tournament: "Tata Steel India", result: "1-0", moves: 55 },
];

const ANALYZING_STEPS = [
  "Detectando bordes de la planilla",
  "Extrayendo cuadrícula de jugadas",
  "Interpretando notación algebraica",
  "Validando secuencia de movimientos",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPGN(moves: Move[], meta: { white: string; black: string; tournament: string; date: string; result: string; round: string; table: string }) {
  const header = [
    `[Event "${meta.tournament}"]`,
    `[Site "${meta.table ? `Mesa ${meta.table}` : "?"}"]`,
    `[Date "${meta.date.replace(/-/g, ".")}"]`,
    `[Round "${meta.round || "?"}"]`,
    `[White "${meta.white}"]`,
    `[Black "${meta.black}"]`,
    `[Result "${meta.result}"]`,
    "",
  ].join("\n");
  const body = moves.map((m) => `${m.num}. ${m.white} ${m.black}`).join(" ") + " 1-0";
  return header + body;
}

function resultBadge(result: string) {
  if (result === "1-0") return "text-emerald-400 bg-emerald-950/60 border border-emerald-700/40";
  if (result === "0-1") return "text-red-400 bg-red-950/60 border border-red-700/40";
  return "text-[#7a7a9a] bg-white/5 border border-white/10";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── ChessBoard ───────────────────────────────────────────────────────────────

function ChessBoard({ currentHalfMove, flipped }: { currentHalfMove: number; flipped: boolean }) {
  const files = flipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = flipped ? ["1", "2", "3", "4", "5", "6", "7", "8"] : ["8", "7", "6", "5", "4", "3", "2", "1"];
  const board = flipped ? [...DEMO_BOARD].reverse().map((r) => [...r].reverse()) : DEMO_BOARD;

  return (
    <div className="inline-flex flex-col gap-0 rounded overflow-hidden shadow-2xl ring-1 ring-[#d4a843]/20">
      {board.map((row, rowIdx) => (
        <div key={rowIdx} className="flex">
          <div className="w-6 flex items-center justify-center text-[10px] font-mono text-[#7a7a9a] bg-[#1a1a28] select-none shrink-0">
            {ranks[rowIdx]}
          </div>
          {row.map((piece, colIdx) => {
            const isLight = (rowIdx + colIdx) % 2 === 0;
            return (
              <div
                key={colIdx}
                className={[
                  "w-12 h-12 flex items-center justify-center text-3xl cursor-pointer select-none relative",
                  isLight ? "bg-[#f0d9b5]" : "bg-[#b58863]",
                ].join(" ")}
              >
                {piece && (
                  <span
                    className="leading-none z-10 relative transition-transform duration-100 hover:scale-110"
                    style={{
                      textShadow: piece.color === "w"
                        ? "0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.7)"
                        : "0 1px 2px rgba(255,255,255,0.25)",
                      color: piece.color === "w" ? "#fffff4" : "#1a0f00",
                    }}
                  >
                    {GLYPHS[piece.color][piece.type]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex bg-[#1a1a28]">
        <div className="w-6 shrink-0" />
        {files.map((f) => (
          <div key={f} className="w-12 text-center text-[10px] font-mono text-[#7a7a9a] py-1 select-none">
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Move state helpers ───────────────────────────────────────────────────────

function computeMoveStates(moves: Move[]): { w: HalfMoveState; b: HalfMoveState }[] {
  let gapped = false;
  return moves.map((m) => {
    const wUndetected = m.white === "";
    const wIllegal = !wUndetected && m.whiteIllegal;
    const wGray = gapped || wIllegal;
    if (wUndetected || wIllegal) gapped = true;

    const bUndetected = m.black === "";
    const bIllegal = !bUndetected && m.blackIllegal;
    const bGray = gapped || bIllegal;
    if (bUndetected || bIllegal) gapped = true;

    return {
      w: { undetected: wUndetected, illegal: wIllegal, gray: wGray },
      b: { undetected: bUndetected, illegal: bIllegal, gray: bGray },
    };
  });
}

// ─── ConfidenceDot ────────────────────────────────────────────────────────────

function confidenceColor(conf: number): string {
  if (conf >= 0.80) return "#4ade80"; // green
  if (conf >= 0.60) return "#a3e635"; // lime
  if (conf >= 0.45) return "#facc15"; // yellow
  if (conf >= 0.30) return "#fb923c"; // orange
  return "#f87171";                   // red
}

function ConfidenceDot({ conf, confirmed, inferred }: { conf: number; confirmed: boolean; inferred: boolean }) {
  if (confirmed) {
    return (
      <span
        title="Confirmado manualmente"
        className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 shrink-0"
      >
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
          <polyline points="1,3.5 3,5.5 6,1.5" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (inferred) {
    return (
      <span
        title="Inferida"
        className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500/20 border border-blue-500/50 shrink-0"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
      </span>
    );
  }
  const color = confidenceColor(conf);
  const pct = Math.round(conf * 100);
  return (
    <span
      title={`Confianza: ${pct}%`}
      className="flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0 border"
      style={{ borderColor: color + "60", backgroundColor: color + "20" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────

function NavBar({
  screen, user, onNav, onLogout,
}: {
  screen: Screen; user: UserProfile; onNav: (s: Screen) => void; onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (s: Screen) => {
    onNav(s);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setMenuOpen(false);
  };

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-14 flex items-center px-4 sm:px-6">
        {/* Logo */}
        <button className="mr-auto sm:mr-8 cursor-pointer" onClick={() => handleNav("scan")}>
          <BrandLogo size="sm" />
        </button>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1 flex-1">
          <button
            onClick={() => handleNav("scan")}
            className={[
              "flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150",
              screen === "scan" || screen === "analyzing"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            ].join(" ")}
            style={{ fontFamily: "var(--font-body)" }}
          >
            <ScanLine size={15} />
            Analizar
          </button>
          <button
            onClick={() => handleNav("archive")}
            className={[
              "flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150",
              screen === "archive"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            ].join(" ")}
            style={{ fontFamily: "var(--font-body)" }}
          >
            <BookOpen size={15} />
            Partidas
          </button>
        </div>

        {/* Desktop user */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User size={13} className="text-primary" />
            </div>
            <span>{user.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Menú"
        >
          {menuOpen ? <X size={20} /> : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="9.25" width="16" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="13.5" width="16" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border bg-card/95 backdrop-blur-sm" style={{ fontFamily: "var(--font-body)" }}>
          <div className="flex flex-col p-3 gap-1">
            <button
              onClick={() => handleNav("scan")}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left",
                screen === "scan" || screen === "analyzing"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              ].join(" ")}
            >
              <ScanLine size={16} />
              Analizar planilla
            </button>
            <button
              onClick={() => handleNav("archive")}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left",
                screen === "archive"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              ].join(" ")}
            >
              <BookOpen size={16} />
              Mis partidas
            </button>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User size={13} className="text-primary" />
                </div>
                {user.name}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 transition-all"
              >
                <LogOut size={12} />
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── AuthScreen ───────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (u: UserProfile) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({ name: "", email: "magnus@chess.com", password: "••••••••" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onAuth({ name: form.name || "Magnus C.", email: form.email });
    }, 900);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,168,67,0.08) 0%, transparent 60%), #0b0b12",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Decorative board pattern */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
        backgroundImage: "repeating-conic-gradient(#d4a843 0% 25%, transparent 0% 50%)",
        backgroundSize: "64px 64px",
      }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="flex flex-col items-center gap-1">
            <BrandLogo size="lg" />
            <p className="text-muted-foreground text-sm">Registra y analiza tus partidas</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex rounded-lg bg-muted p-1 mb-6 gap-1">
            {(["login", "register"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  "flex-1 py-2 text-sm rounded-md font-medium transition-all duration-200",
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Entrando…
                </>
              ) : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Al continuar aceptas los términos de uso y la política de privacidad.
        </p>
      </div>
    </div>
  );
}

// ─── ScanScreen ───────────────────────────────────────────────────────────────

function ScanScreen({ onAnalyze }: { onAnalyze: (img: string) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  return (
    <div
      className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center p-6 gap-8"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Analizar planilla
        </h2>
        <p className="text-muted-foreground text-sm">
          Sube una foto de la planilla o usa la cámara
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={[
          "relative w-full max-w-lg h-72 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 group overflow-hidden",
          dragOver
            ? "border-primary bg-primary/8 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-white/[0.02]",
        ].join(" ")}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview planilla" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Check size={18} className="text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium">Imagen cargada</p>
              <p className="text-xs text-muted-foreground">Click para cambiar</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
              <Upload size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm text-foreground font-medium">Arrastra o haz clic para subir</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, HEIC hasta 10 MB</p>
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full max-w-lg">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">o</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Camera button */}
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-secondary text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
      >
        <Camera size={16} className="text-primary" />
        Usar cámara
      </button>

      {/* Analyze CTA */}
      <button
        onClick={() => onAnalyze(preview || "demo")}
        className={[
          "flex items-center gap-3 px-8 py-3.5 rounded-xl text-sm font-bold transition-all duration-200",
          "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
          "hover:bg-primary/90 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",
          !preview && "opacity-40 cursor-not-allowed pointer-events-none",
        ].join(" ")}
      >
        <ScanLine size={18} />
        Analizar planilla
      </button>

      {/* Demo shortcut */}
      {!preview && (
        <button
          onClick={() => onAnalyze("demo")}
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
        >
          Continuar sin planilla
        </button>
      )}
    </div>
  );
}

// ─── AnalyzingScreen ──────────────────────────────────────────────────────────

function AnalyzingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = ANALYZING_STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), (i + 1) * 650)
    );
    const done = setTimeout(onComplete, ANALYZING_STEPS.length * 650 + 900);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [onComplete]);

  const progress = Math.round((step / ANALYZING_STEPS.length) * 100);

  return (
    <div
      className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-10 p-6"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Animated icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-card border border-border flex items-center justify-center">
          <div className="text-5xl animate-pulse select-none">♟</div>
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-primary/30 animate-ping" />
      </div>

      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Procesando planilla…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {ANALYZING_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step - 1 || (i === 0 && step === 0);
            return (
              <div
                key={i}
                className={[
                  "flex items-center gap-3 transition-all duration-500",
                  done ? "opacity-100" : i === step ? "opacity-100" : "opacity-25",
                ].join(" ")}
              >
                <div className={[
                  "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300",
                  done
                    ? "bg-primary/20 border-primary"
                    : active
                    ? "border-primary/60"
                    : "border-white/10",
                ].join(" ")}>
                  {done ? (
                    <Check size={11} className="text-primary" />
                  ) : i === step ? (
                    <Loader2 size={11} className="text-primary animate-spin" />
                  ) : null}
                </div>
                <span className={[
                  "text-sm",
                  done ? "text-foreground" : i === step ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── EditorScreen ─────────────────────────────────────────────────────────────

function EditorScreen() {
  const [moves, setMoves] = useState<Move[]>(INITIAL_MOVES);
  const [currentHalfMove, setCurrentHalfMove] = useState(24);
  const [flipped, setFlipped] = useState(false);
  const [editingCell, setEditingCell] = useState<{ idx: number; side: "white" | "black" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [meta, setMeta] = useState({
    white: "Magnus Carlsen", black: "Fabiano Caruana",
    tournament: "World Championship 2024", date: "2024-11-14",
    result: "1-0",
    round: "" as string,
    table: "" as string,
  });
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const totalHalfMoves = moves.length * 2;
  const moveListRef = useRef<HTMLDivElement>(null);

  const goTo = (h: number) => setCurrentHalfMove(Math.max(0, Math.min(totalHalfMoves, h)));

  const isActive = (moveIdx: number, side: "white" | "black") => {
    const hm = moveIdx * 2 + (side === "white" ? 1 : 2);
    return hm === currentHalfMove;
  };

  const startEdit = (idx: number, side: "white" | "black") => {
    setEditingCell({ idx, side });
    setEditValue(side === "white" ? moves[idx].white : moves[idx].black);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    setMoves((prev) =>
      prev.map((m, i) =>
        i === editingCell.idx
          ? { ...m, [editingCell.side]: editValue }
          : m
      )
    );
    setEditingCell(null);
  };

  const deleteMove = (idx: number) => {
    setMoves((prev) => {
      const next = prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, num: i + 1 }));
      return next;
    });
    if (currentHalfMove > (moves.length - 1) * 2) setCurrentHalfMove((moves.length - 1) * 2);
  };

  const addMove = () => {
    const num = moves.length + 1;
    setMoves((prev) => [...prev, { num, white: "?", black: "?" }]);
    startEdit(moves.length, "white");
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDownload = () => {
    const pgn = buildPGN(moves, meta);
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.white.split(" ").pop()}_vs_${meta.black.split(" ").pop()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(buildPGN(moves, meta));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col lg:flex-row overflow-hidden" style={{ fontFamily: "var(--font-body)" }}>
      {/* Left — Board */}
      <div className="shrink-0 lg:flex-1 flex flex-col items-center justify-start lg:justify-center gap-3 pt-3 pb-3 px-4 lg:gap-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-border">
        <ChessBoard currentHalfMove={currentHalfMove} flipped={flipped} />

        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => goTo(0)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all" title="Inicio">
            <SkipBack size={16} />
          </button>
          <button onClick={() => goTo(currentHalfMove - 1)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all" title="Anterior">
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 py-2 rounded-lg bg-secondary text-sm text-muted-foreground" style={{ fontFamily: "var(--font-notation)", minWidth: 80, textAlign: "center" }}>
            {currentHalfMove === 0 ? "inicio" : `${Math.ceil(currentHalfMove / 2)}${currentHalfMove % 2 !== 0 ? "." : "..."}`}
          </div>
          <button onClick={() => goTo(currentHalfMove + 1)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all" title="Siguiente">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => goTo(totalHalfMoves)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all" title="Final">
            <SkipForward size={16} />
          </button>
        </div>

        {/* PGN toggle */}

      </div>

      {/* Right — Moves panel */}
      <div className="flex-1 min-h-0 w-full lg:w-80 xl:w-96 flex flex-col border-border overflow-hidden">
        {/* Game metadata */}
        <div className="border-b border-border bg-card/50">
          {/* Mobile toggle header */}
          <button
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMetaOpen((o) => !o)}
          >
            <span className="flex items-center gap-2">
              <User size={11} />
              <span className="font-medium text-foreground truncate max-w-[180px]">
                {meta.white || "Blancas"} — {meta.black || "Negras"}
              </span>
              {meta.result && <span className="text-primary" style={{ fontFamily: "var(--font-notation)" }}>{meta.result}</span>}
            </span>
            <ChevronDown size={13} className={`transition-transform duration-200 shrink-0 ${metaOpen ? "rotate-180" : ""}`} />
          </button>
          <div className={`p-4 lg:p-5 flex flex-col gap-3 lg:gap-5 ${metaOpen ? "block" : "hidden"} lg:block`}>
            {/* Players row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Blancas</label>
                <input
                  value={meta.white}
                  onChange={(e) => setMeta((m) => ({ ...m, white: e.target.value }))}
                  className="bg-transparent border-b border-border focus:border-primary text-sm font-semibold text-foreground focus:outline-none transition-colors placeholder:text-muted-foreground truncate"
                  placeholder="Jugador blancas"
                />
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0 px-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Resultado</label>
                <select
                  value={meta.result}
                  onChange={(e) => setMeta((m) => ({ ...m, result: e.target.value }))}
                  className="bg-transparent text-primary text-sm font-bold focus:outline-none cursor-pointer text-center"
                  style={{ fontFamily: "var(--font-notation)" }}
                >
                  <option value="1-0">1-0</option>
                  <option value="0-1">0-1</option>
                  <option value="½-½">½-½</option>
                  <option value="*">*</option>
                </select>
              </div>
              <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Negras</label>
                <input
                  value={meta.black}
                  onChange={(e) => setMeta((m) => ({ ...m, black: e.target.value }))}
                  className="bg-transparent border-b border-border focus:border-primary text-sm font-semibold text-foreground focus:outline-none transition-colors placeholder:text-muted-foreground text-right w-full truncate"
                  placeholder="Jugador negras"
                />
              </div>
            </div>
            {/* Tournament + date row */}
            <div className="flex items-center gap-3 pt-1 lg:pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Trophy size={11} className="text-muted-foreground shrink-0" />
                <input
                  value={meta.tournament}
                  onChange={(e) => setMeta((m) => ({ ...m, tournament: e.target.value }))}
                  className="bg-transparent text-xs text-muted-foreground focus:text-foreground focus:outline-none border-b border-transparent focus:border-border transition-colors w-full truncate placeholder:text-muted-foreground/50"
                  placeholder="Torneo"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar size={11} className="text-muted-foreground" />
                <input
                  type="date"
                  value={meta.date}
                  onChange={(e) => setMeta((m) => ({ ...m, date: e.target.value }))}
                  className="bg-transparent text-xs text-muted-foreground focus:text-foreground focus:outline-none border-b border-transparent focus:border-border transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            {/* Round + table row */}
            <div className="flex items-center gap-4 pt-1 lg:pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider shrink-0">Ronda</span>
                <input
                  type="number"
                  min="1"
                  value={meta.round}
                  onChange={(e) => setMeta((m) => ({ ...m, round: e.target.value }))}
                  className="bg-transparent text-xs text-muted-foreground focus:text-foreground focus:outline-none border-b border-transparent focus:border-border transition-colors w-10 placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="—"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider shrink-0">Mesa</span>
                <input
                  type="number"
                  min="1"
                  value={meta.table}
                  onChange={(e) => setMeta((m) => ({ ...m, table: e.target.value }))}
                  className="bg-transparent text-xs text-muted-foreground focus:text-foreground focus:outline-none border-b border-transparent focus:border-border transition-colors w-10 placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="—"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Move list */}
        <div ref={moveListRef} className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: "none" }}>
          <div className="flex flex-col gap-0.5">
            {(() => { const states = computeMoveStates(moves); return moves.map((m, idx) => {
            const ws = states[idx].w;
            const bs = states[idx].b;
            return (
              <div
                key={idx}
                className="flex items-center gap-1 rounded-lg px-1"
              >
                {/* Move number */}
                <span
                  className="text-xs text-muted-foreground w-7 shrink-0 text-right pr-1"
                  style={{ fontFamily: "var(--font-notation)" }}
                >
                  {m.num}.
                </span>

                {/* White move */}
                <div className="flex-1 group/white relative">
                  {editingCell?.idx === idx && editingCell.side === "white" ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
                      className="w-full bg-primary/10 border border-primary/40 rounded px-2 py-0.5 text-sm text-foreground focus:outline-none"
                      style={{ fontFamily: "var(--font-notation)" }}
                    />
                  ) : ws.undetected ? (
                    <div
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm border border-dashed border-white/15 bg-white/[0.02] cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => startEdit(idx, "white")}
                      title="Movimiento no detectado — haz clic para introducir"
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-dashed border-white/25 shrink-0" />
                      <span className="text-muted-foreground/40 italic" style={{ fontFamily: "var(--font-notation)" }}>—</span>
                    </div>
                  ) : (
                    <div className={[
                      "flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-all duration-100",
                      ws.gray
                        ? "opacity-40 cursor-default"
                        : isActive(idx, "white") ? "bg-primary/20 text-primary font-semibold" : "text-foreground hover:bg-secondary",
                    ].join(" ")}>
                      {ws.gray
                        ? <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/5 shrink-0" />
                        : <ConfidenceDot conf={m.whiteConf} confirmed={m.whiteConfirmed} inferred={m.whiteInferred} />
                      }
                      <button
                        onClick={() => !ws.gray && goTo(idx * 2 + 1)}
                        className={["flex-1 text-left", ws.gray ? "text-muted-foreground pointer-events-none" : ""].join(" ")}
                        style={{ fontFamily: "var(--font-notation)" }}
                      >
                        {m.white}
                        {ws.illegal && <span className="ml-1 text-[9px] text-amber-500/80 font-sans align-middle">ilegal</span>}
                      </button>
                      {!ws.gray && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/white:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => startEdit(idx, "white")} className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors">
                            <Edit2 size={10} />
                          </button>
                          <button onClick={() => deleteMove(idx)} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Black move */}
                <div className="flex-1 group/black relative">
                  {editingCell?.idx === idx && editingCell.side === "black" ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
                      className="w-full bg-primary/10 border border-primary/40 rounded px-2 py-0.5 text-sm text-foreground focus:outline-none"
                      style={{ fontFamily: "var(--font-notation)" }}
                    />
                  ) : bs.undetected ? (
                    <div
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm border border-dashed border-white/15 bg-white/[0.02] cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => startEdit(idx, "black")}
                      title="Movimiento no detectado — haz clic para introducir"
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-dashed border-white/25 shrink-0" />
                      <span className="text-muted-foreground/40 italic" style={{ fontFamily: "var(--font-notation)" }}>—</span>
                    </div>
                  ) : (
                    <div className={[
                      "flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-all duration-100",
                      bs.gray
                        ? "opacity-40 cursor-default"
                        : isActive(idx, "black") ? "bg-primary/20 text-primary font-semibold" : "text-foreground hover:bg-secondary",
                    ].join(" ")}>
                      {bs.gray
                        ? <span className="w-3.5 h-3.5 rounded-full border border-white/15 bg-white/5 shrink-0" />
                        : <ConfidenceDot conf={m.blackConf} confirmed={m.blackConfirmed} inferred={m.blackInferred} />
                      }
                      <button
                        onClick={() => !bs.gray && goTo(idx * 2 + 2)}
                        className={["flex-1 text-left", bs.gray ? "text-muted-foreground pointer-events-none" : ""].join(" ")}
                        style={{ fontFamily: "var(--font-notation)" }}
                      >
                        {m.black}
                        {bs.illegal && <span className="ml-1 text-[9px] text-amber-500/80 font-sans align-middle">ilegal</span>}
                      </button>
                      {!bs.gray && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/black:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => startEdit(idx, "black")} className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors">
                            <Edit2 size={10} />
                          </button>
                          <button onClick={() => deleteMove(idx)} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ); })})()}

            {/* Result */}
          </div>
        </div>

        {/* Add move */}

        {/* Action buttons */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={handleSave}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
              saved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
            ].join(" ")}
          >
            {saved ? <><Check size={14} /> Guardado</> : <><Save size={14} /> Guardar</>}
          </button>
          <button
            onClick={() => setShowPgnModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
          >
            <FileText size={14} />
            PGN
          </button>
        </div>
      </div>

      {/* PGN modal */}
      {showPgnModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPgnModal(false); }}
        >
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">PGN</span>
                <span className="text-xs text-muted-foreground ml-1">
                  {meta.white} vs {meta.black}
                </span>
              </div>
              <button
                onClick={() => setShowPgnModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* PGN text */}
            <div className="p-5">
              <textarea
                readOnly
                value={buildPGN(moves, meta)}
                className="w-full h-56 bg-muted rounded-xl p-4 text-xs text-muted-foreground resize-none focus:outline-none border border-border leading-relaxed"
                style={{ fontFamily: "var(--font-notation)" }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={handleCopyPgn}
                className={[
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border",
                  copied
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-secondary border-border text-foreground hover:border-primary/40 hover:bg-primary/5",
                ].join(" ")}
              >
                {copied ? <><Check size={14} /> Copiado</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar</>}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
              >
                <Download size={14} />
                Descargar .pgn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ArchiveScreen ────────────────────────────────────────────────────────────

function ArchiveScreen({ onOpenEditor }: { onOpenEditor: () => void }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tournament, setTournament] = useState("All Tournaments");
  const [result, setResult] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = ARCHIVE_GAMES.filter((g) => {
    if (search) {
      const q = search.toLowerCase();
      if (!g.white.toLowerCase().includes(q) && !g.black.toLowerCase().includes(q)) return false;
    }
    if (tournament !== "All Tournaments" && g.tournament !== tournament) return false;
    if (result !== "Todos" && g.result !== result) return false;
    if (dateFrom && g.date < dateFrom) return false;
    if (dateTo && g.date > dateTo) return false;
    return true;
  });

  const results = ["Todos", "1-0", "0-1", "½-½"];

  return (
    <div className="min-h-[calc(100vh-56px)] p-6" style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Mis partidas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} partida{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={[
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              showFilters ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30",
            ].join(" ")}
          >
            <Filter size={14} />
            Filtros
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar jugador, apertura…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        {/* Result tabs */}
        <div className="flex items-center gap-2">
          {results.map((r) => (
            <button
              key={r}
              onClick={() => setResult(r)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                result === r ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground",
              ].join(" ")}
              style={{ fontFamily: "var(--font-notation)" }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Torneo</label>
              <select
                value={tournament}
                onChange={(e) => setTournament(e.target.value)}
                className="bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TOURNAMENTS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {(tournament !== "All Tournaments" || dateFrom || dateTo) && (
              <button
                onClick={() => { setTournament("All Tournaments"); setDateFrom(""); setDateTo(""); }}
                className="self-end flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 transition-all"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Games grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="text-4xl opacity-30">♜</div>
          <p className="text-muted-foreground text-sm">No se encontraron partidas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
            >
              {/* Players */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#f0d9b5] bg-[#f0d9b5]/10 border border-[#f0d9b5]/20 rounded px-1 py-0.5 font-mono shrink-0">W</span>
                    <span className="text-sm font-semibold text-foreground truncate">{g.white}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#b58863] bg-[#b58863]/10 border border-[#b58863]/20 rounded px-1 py-0.5 font-mono shrink-0">B</span>
                    <span className="text-sm font-semibold text-foreground truncate">{g.black}</span>
                  </div>
                </div>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg shrink-0 ${resultBadge(g.result)}`}
                  style={{ fontFamily: "var(--font-notation)" }}>
                  {g.result}
                </span>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground border-t border-border pt-2">
                <span className="flex items-center gap-1"><Trophy size={10} />{g.tournament}</span>
                <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(g.date)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{g.moves} jugadas</span>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenEditor}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                  >
                    <Eye size={12} />
                    Ver
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all">
                    <Download size={12} />
                    PGN
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [user, setUser] = useState<UserProfile | null>(null);

  const handleAuth = useCallback((u: UserProfile) => {
    setUser(u);
    setScreen("scan");
  }, []);

  const handleAnalyze = useCallback((_img: string) => {
    setScreen("analyzing");
  }, []);

  const handleAnalyzeComplete = useCallback(() => {
    setScreen("editor");
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setScreen("auth");
  }, []);

  const handleNav = useCallback((s: Screen) => {
    setScreen(s);
  }, []);

  if (screen === "auth" || !user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "var(--font-body)" }}>
      <NavBar screen={screen} user={user} onNav={handleNav} onLogout={handleLogout} />
      {screen === "scan" && <ScanScreen onAnalyze={handleAnalyze} />}
      {screen === "analyzing" && <AnalyzingScreen onComplete={handleAnalyzeComplete} />}
      {screen === "editor" && <EditorScreen />}
      {screen === "archive" && <ArchiveScreen onOpenEditor={() => setScreen("editor")} />}
    </div>
  );
}
