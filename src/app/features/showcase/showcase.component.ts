import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShowcaseState } from './showcase-data';
import { WelcomeSlide } from './slides/welcome.slide'; import { MapSlide } from './slides/map.slide'; import { CoaSlide } from './slides/coa.slide'; import { BoardSlide } from './slides/board.slide'; import { MlSlide } from './slides/ml.slide'; import { GovernanceSlide } from './slides/governance.slide'; import { KgSlide } from './slides/kg.slide'; import { SummarySlide } from './slides/summary.slide'; import { ScenarioSlide } from './slides/scenario.slide';

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, WelcomeSlide, MapSlide, CoaSlide, BoardSlide, MlSlide, GovernanceSlide, KgSlide, SummarySlide, ScenarioSlide],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
<div class="showcase-shell" [class]="'slide-' + state.currentSlide()" (keydown)="state.onKey($event)" tabindex="0">

  <div class="showcase-bg"></div>

  <header class="showcase-header">
    <div class="flex items-center gap-3">
      <div class="showcase-logo">S</div>
      <div class="flex flex-col">
        <span class="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--s-muted)]">Saab Smart Stridsledning</span>
        <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--s-text)]">Boreal Decision Twin</span>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <span class="text-[9px] font-mono text-[var(--s-muted)] uppercase tracking-widest">Hackathon Demo · 2026</span>
      <a routerLink="/" class="showcase-exit-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        Stäng
      </a>
    </div>
  </header>


  <main class="showcase-main">
    @if (state.currentSlide() === 0) {
      <app-welcome-slide></app-welcome-slide>
    }
    @if (state.currentSlide() === 1) {
      <app-map-slide></app-map-slide>
    }
    @if (state.currentSlide() === 2) {
      <app-coa-slide></app-coa-slide>
    }
    @if (state.currentSlide() === 3) {
      <app-board-slide></app-board-slide>
    }
    @if (state.currentSlide() === 4) {
      <app-ml-slide></app-ml-slide>
    }
    @if (state.currentSlide() === 5) {
      <app-governance-slide></app-governance-slide>
    }
    @if (state.currentSlide() === 6) {
      <app-kg-slide></app-kg-slide>
    }
    @if (state.currentSlide() === 7) {
      <app-summary-slide></app-summary-slide>
    }
    @if (state.currentSlide() === 8) {
      <app-scenario-slide></app-scenario-slide>
    }

    @if (!state.slideDemoStarted()[state.currentSlide()]) {
      <button class="demo-overlay" type="button" (click)="state.startCurrentSlideDemo($event)">
        <span class="demo-overlay-kicker">Klicka en gång för att starta demo</span>
        <span class="demo-overlay-lead">{{ state.slidePreviewCopy[state.currentSlide()].lead }}</span>
        <span class="demo-overlay-title">{{ state.slides[state.currentSlide()].title }}</span>
        <span class="demo-overlay-sub">{{ state.slidePreviewCopy[state.currentSlide()].detail }}</span>
        <div class="demo-overlay-bullets">
          @for (bullet of state.slidePreviewCopy[state.currentSlide()].bullets; track bullet) {
            <div class="demo-overlay-bullet">
              <span class="demo-overlay-bullet-dot"></span>
              <span>{{ bullet }}</span>
            </div>
          }
        </div>
      </button>
    }
  </main>


  <div class="console-window">
    <div class="console-header">
      <div class="console-dots">
        <span class="console-dot red"></span>
        <span class="console-dot amber"></span>
        <span class="console-dot green"></span>
      </div>
      <div class="console-header-copy">
        <span class="console-title">BDT BACKEND COMMAND LOG</span>
        <span class="console-subtitle">{{ state.slides[state.currentSlide()].eyebrow }} · {{ state.slides[state.currentSlide()].title }}</span>
      </div>
    </div>
    <div class="console-body">
      <div class="console-meta">
        <span>SLIDE DEMO MODE</span>
        <span>Ingest → score → decide → expose</span>
      </div>
      @if (state.visibleConsoleLines().length === 0) {
        <div class="console-line console-state">
          <span class="console-prompt">></span>
          <span>Klicka en gång på sliden för att starta demo-flödet.</span>
        </div>
      }
      @for (line of state.visibleConsoleLines(); track $index) {
        <div class="console-line" [class.console-dim]="$index < state.visibleConsoleLines().length - 4">
          <span class="console-prompt">$</span>
          <span>{{ line }}</span>
        </div>
      }
      <div class="console-cursor"></div>
    </div>
  </div>


  <nav class="showcase-nav">
    <button class="nav-arrow" [disabled]="state.currentSlide() === 0" (click)="state.prev()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    </button>

    <div class="nav-dots">
      @for (slide of state.slides; track $index) {
        <button
          class="nav-dot"
          [class.nav-dot-active]="state.currentSlide() === $index"
          (click)="state.goTo($index)"
          [title]="slide.title"
        ></button>
      }
    </div>

    <button class="nav-arrow" [disabled]="state.currentSlide() === state.slides.length - 1" (click)="state.next()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  </nav>

  <div class="slide-counter">{{ state.currentSlide() + 1 }} / {{ state.slides.length }}</div>

</div>
  `,
  styles: [`
    :host { display: block; }
    .showcase-shell {
      position: fixed; inset: 0; z-index: 9999;
      background: #050b12;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      color: #edf5ff;
      display: flex; flex-direction: column;
      overflow: hidden;
      --s-text: #edf5ff;
      --s-muted: #9ab0c8;
      --s-blue: #5ca7ff;
      --s-green: #7ce0be;
      --s-purple: #9b8cff;
      --s-amber: #f59e0b;
      --s-red: #ef4444;
      --s-border: rgba(148,189,255,0.12);
      --s-panel: rgba(7,14,23,0.85);
    }
    .showcase-shell:focus { outline: none; }
    .showcase-bg {
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(circle at 20% 20%, rgba(92,167,255,0.12), transparent 30%),
        radial-gradient(circle at 80% 80%, rgba(124,224,190,0.08), transparent 30%),
        radial-gradient(circle at 60% 40%, rgba(155,140,255,0.06), transparent 25%);
    }
    .showcase-header {
      position: relative; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px;
      border-bottom: 1px solid var(--s-border);
      background: rgba(5,11,18,0.7); backdrop-filter: blur(12px);
      flex-shrink: 0;
    }
    .showcase-logo {
      width: 36px; height: 36px; border-radius: 8px;
      background: linear-gradient(135deg, #5ca7ff, #7ce0be);
      display: grid; place-items: center;
      font-size: 18px; font-weight: 900; color: #050b12;
    }
    .showcase-exit-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 6px;
      border: 1px solid var(--s-border); background: transparent;
      color: var(--s-muted); font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.15em;
      text-decoration: none; cursor: pointer; transition: all 0.2s;
    }
    .showcase-exit-btn:hover { color: var(--s-text); border-color: rgba(148,189,255,0.3); }
    .showcase-main {
      flex: 1; min-height: 0; overflow: hidden; position: relative; z-index: 1;
    }
    .console-window {
      position: fixed; bottom: 60px; right: 24px; z-index: 50;
      width: min(680px, calc(100vw - 48px));
      background: rgba(3,7,12,0.94); border: 1px solid rgba(92,167,255,0.28);
      border-radius: 10px; overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.55);
      backdrop-filter: blur(10px);
    }
    .console-header {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-bottom: 1px solid rgba(92,167,255,0.14);
      background: rgba(92,167,255,0.07);
    }
    .console-header-copy { display: flex; flex-direction: column; gap: 3px; }
    .console-dots { display: flex; gap: 4px; }
    .console-dot { width: 9px; height: 9px; border-radius: 50%; }
    .console-dot.red { background: #ef4444; opacity: 0.7; }
    .console-dot.amber { background: #f59e0b; opacity: 0.7; }
    .console-dot.green { background: #7ce0be; opacity: 0.7; }
    .console-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.22em; color: rgba(92,167,255,0.98); font-family: monospace; }
    .console-subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em; color: rgba(156,176,199,0.78); font-family: monospace; }
    .console-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; min-height: 160px; max-height: 280px; overflow: hidden; }
    .console-meta {
      display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px;
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: rgba(156,176,199,0.78); border-bottom: 1px solid rgba(148,189,255,0.1);
      margin-bottom: 6px;
    }
    .console-line { font-size: 13px; font-family: 'JetBrains Mono', 'Courier New', monospace; color: rgba(124,224,190,0.95); display: flex; gap: 6px; line-height: 1.65; }
    .console-dim { opacity: 0.4; }
    .console-prompt { color: rgba(92,167,255,0.6); flex-shrink: 0; }
    .console-state { color: rgba(237,245,255,0.88); }
    .console-cursor {
      width: 7px; height: 12px; background: rgba(124,224,190,0.8);
      animation: blink 1s step-end infinite; margin-top: 2px;
    }
    .showcase-nav {
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 20;
      display: flex; align-items: center; gap: 16px;
      padding: 8px 16px; border-radius: 999px;
      background: rgba(7,14,23,0.9); border: 1px solid var(--s-border);
      backdrop-filter: blur(12px); box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    .nav-arrow {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1px solid var(--s-border); background: transparent;
      color: var(--s-muted); cursor: pointer; display: grid; place-items: center;
      transition: all 0.2s;
    }
    .nav-arrow:hover:not(:disabled) { color: var(--s-text); border-color: rgba(148,189,255,0.3); background: rgba(255,255,255,0.05); }
    .nav-arrow:disabled { opacity: 0.3; cursor: not-allowed; }
    .nav-dots { display: flex; gap: 6px; align-items: center; }
    .nav-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(156,176,199,0.25); border: none; cursor: pointer;
      transition: all 0.25s;
    }
    .nav-dot-active { width: 22px; border-radius: 3px; background: var(--s-blue); }
    .slide-counter {
      position: fixed; bottom: 24px; left: 24px; z-index: 20;
      padding: 4px 10px; border-radius: 999px;
      border: 1px solid var(--s-border); background: rgba(7,14,23,0.7);
      font-size: 10px; font-family: monospace; color: var(--s-muted); font-weight: 700;
    }
    .demo-overlay {
      position: absolute; inset: 0; z-index: 30;
      display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end;
      gap: 8px; padding: 40px 56px 120px;
      border: none; background:
        linear-gradient(180deg, rgba(5,11,18,0.08), rgba(5,11,18,0.42)),
        radial-gradient(circle at 20% 30%, rgba(92,167,255,0.12), transparent 30%);
      color: var(--s-text); text-align: left; cursor: pointer;
      backdrop-filter: blur(2px);
    }
    .demo-overlay:hover { background:
        linear-gradient(180deg, rgba(5,11,18,0.04), rgba(5,11,18,0.34)),
        radial-gradient(circle at 20% 30%, rgba(92,167,255,0.16), transparent 30%); }
    .demo-overlay-kicker {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.24em; color: var(--s-blue);
    }
    .demo-overlay-lead {
      font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-muted);
    }
    .demo-overlay-title {
      font-size: clamp(28px, 4vw, 60px); font-weight: 300; letter-spacing: -0.04em;
    }
    .demo-overlay-sub {
      max-width: 54rem; font-size: 15px; line-height: 1.6; color: var(--s-muted);
    }
    .demo-overlay-bullets {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
      width: min(100%, 720px); margin-top: 6px;
    }
    .demo-overlay-bullet {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(148,189,255,0.14);
      background: rgba(255,255,255,0.03); font-size: 11px; line-height: 1.45; color: var(--s-text);
    }
    .demo-overlay-bullet-dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--s-blue);
      margin-top: 5px; flex-shrink: 0;
    }

    /* ─── Shared slide utility classes (used by child components) ─── */
    .slide {
      height: 100%; overflow-y: auto; padding: 32px 40px;
      position: relative; z-index: 1;
    }
    .animate-in { animation: slideIn 0.4s ease-out both; }
    .slide-eyebrow {
      font-size: 10px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.28em; color: var(--s-muted);
    }
    .slide-title {
      font-size: clamp(24px,3.5vw,42px); font-weight: 300; letter-spacing: -0.02em;
      margin: 0; line-height: 1.05;
    }
    .slide-title-big { font-size: clamp(28px,4vw,52px); }
    .slide-sub {
      font-size: 14px; color: var(--s-muted); line-height: 1.6; margin: 0;
    }
    .slide-split {
      display: grid; grid-template-columns: 320px 1fr; gap: 32px; height: 100%;
    }
    .slide-map .slide-split {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px; align-items: start;
    }
    .slide-map .slide-left-panel { gap: 10px; }
    .slide-board .slide-split {
      grid-template-columns: minmax(560px, 640px) minmax(0, 1fr);
      gap: 18px; align-items: start;
    }
    .slide-left-panel {
      display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
    }
    .slide-hero-title {
      font-size: clamp(56px,8vw,96px); font-weight: 200; letter-spacing: -0.05em;
      margin: 0; line-height: 0.9;
      background: linear-gradient(135deg, #edf5ff, #5ca7ff 40%, #7ce0be);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .slide-hero-sub { font-size: 18px; color: var(--s-muted); margin: 0; line-height: 1.6; max-width: 42rem; }
    .slide-welcome { display: flex; align-items: center; justify-content: center; }
    .slide-welcome-inner { max-width: 760px; display: flex; flex-direction: column; gap: 24px; }
    .slide-ai { overflow-y: auto; }
    .slide-ml { overflow-y: auto; }
    .slide-summary { display: flex; flex-direction: column; gap: 24px; }
    .slide-kg { overflow: hidden; }
    .data-strip {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;
      margin-top: 12px;
    }
    .data-strip-tight { margin-top: 12px; }
    .data-pill {
      display: flex; flex-direction: column; gap: 4px;
      padding: 10px 12px; border-radius: 10px;
      border: 1px solid rgba(92,167,255,0.14); background: rgba(255,255,255,0.02);
    }
    .data-pill-num {
      font-size: 18px; line-height: 1; font-weight: 300; color: var(--s-text);
      font-family: monospace;
    }
    .data-pill-label {
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em;
      color: var(--s-blue);
    }
    .data-pill-text {
      font-size: 10px; line-height: 1.45; color: var(--s-muted);
    }
    .board-features {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
    }
    .board-feat {
      display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1px solid var(--s-border);
      border-radius: 10px; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
    }
    .feat-icon {
      width: 22px; font-size: 17px; flex-shrink: 0;
    }
    .feat-text { min-width: 0; }
    .feat-title { font-size: 12px; font-weight: 700; color: var(--s-text); }
    .feat-sub { font-size: 11px; color: var(--s-muted); line-height: 1.5; overflow-wrap: anywhere; }
    .legend-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--s-muted); }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-dot.blue { background: var(--s-blue); }
    .legend-dot.red { background: var(--s-red); }
    .legend-dot.amber { background: var(--s-amber); }
    .legend-dot.white { background: var(--s-text); opacity: 0.6; }
    .map-phase-label {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-blue);
    }
    .map-phase-label.phase-intercept { color: var(--s-green); }
    .state-explain {
      display: flex; flex-direction: column; gap: 6px;
      padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04); margin-top: 10px;
    }
    .state-explain-head {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-blue);
    }
    .state-explain-body {
      font-size: 12px; line-height: 1.6; color: var(--s-muted);
    }
    .kg-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .kg-fact { flex: 1; padding: 8px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 2px; }
    .kf-v { font-size: 22px; font-weight: 700; font-family: monospace; color: rgba(96,165,250,0.9); }
    .kf-l { font-size: 9px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.1em; }

    /* ─── Keyframes ─── */
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
    @keyframes trackPulse {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 0.8; }
    }
    @keyframes interceptCoreFade {
      from { opacity: 1; r: 7; }
      to { opacity: 0; r: 28; }
    }
    @keyframes interceptRingPing {
      0% { r: 18; opacity: 1; }
      100% { r: 36; opacity: 0; }
    }
    @keyframes pulseRing {
      0%, 100% { r: 15; opacity: 0.5; }
      50% { r: 18; opacity: 0.2; }
    }
    @keyframes kgNodeGlow {
      0%, 100% { box-shadow: 0 0 4px rgba(245,158,11,0.2); }
      50% { box-shadow: 0 0 12px rgba(245,158,11,0.4); }
    }
  `],
})
export class Showcase implements OnInit, OnDestroy {
  readonly state = inject(ShowcaseState);

  ngOnInit(): void {
    this.state.resetConsole(0);
  }

  ngOnDestroy(): void {
    this.state.destroy();
  }
}
