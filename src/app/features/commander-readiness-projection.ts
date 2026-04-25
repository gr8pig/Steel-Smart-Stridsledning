import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-commander-readiness-projection',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="design-card overflow-hidden !p-0 shadow-lg">
      <div class="panel-header flex-wrap gap-3">
        <span>Wave-2 Readiness Projection</span>
        <div class="flex items-center gap-5 text-[8px] uppercase tracking-[0.2em]">
          <div class="flex items-center gap-2">
            <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--boreal-blue, #3b82f6)" stroke-width="2"/></svg>
            <span class="font-black text-boreal-blue">SSS Policy</span>
          </div>
          <div class="flex items-center gap-2">
            <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--boreal-red, #ef4444)" stroke-width="2" stroke-dasharray="4,2"/></svg>
            <span class="font-black text-boreal-red">Legacy Baseline</span>
          </div>
        </div>
      </div>

      <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.85fr)]">
        <div class="rounded-sm border border-boreal-border bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(7,7,8,0.02))] p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-[8px] uppercase tracking-[0.22em] text-boreal-text-muted">
              <span class="rounded-sm border border-boreal-blue/20 bg-boreal-blue/10 px-2 py-1 font-black text-boreal-blue">Forecast</span>
              <span>Readiness holds above the collapse threshold</span>
            </div>
            <div class="text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">
              85% start · 62% T+12 · 8% legacy
            </div>
          </div>

          <div class="rounded-sm border border-boreal-border/80 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.11),transparent_66%)] p-3">
            <svg viewBox="0 0 450 92" class="w-full drop-shadow-[0_10px_24px_rgba(0,0,0,0.2)]" preserveAspectRatio="none" style="height: 156px;">
              <line x1="32" y1="8"  x2="422" y2="8"  stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.45"/>
              <line x1="32" y1="27" x2="422" y2="27" stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.45"/>
              <line x1="32" y1="46" x2="422" y2="46" stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.45"/>
              <line x1="32" y1="65" x2="422" y2="65" stroke="currentColor" stroke-width="0.3" stroke-dasharray="2,4" class="text-boreal-border" opacity="0.45"/>

              <text x="28" y="11" text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">100%</text>
              <text x="28" y="30" text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">75%</text>
              <text x="28" y="49" text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">50%</text>
              <text x="28" y="68" text-anchor="end" font-size="5.5" fill="currentColor" class="text-boreal-text-muted" opacity="0.55">25%</text>

              <text x="32"  y="87" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+0</text>
              <text x="97"  y="87" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+2h</text>
              <text x="162" y="87" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+4h</text>
              <text x="227" y="87" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+6h</text>
              <text x="292" y="87" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+8h</text>
              <text x="357" y="87" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+10h</text>
              <text x="422" y="87" text-anchor="middle" font-size="5" fill="currentColor" class="text-boreal-text-muted" opacity="0.5">T+12h</text>

              <path d="M32,18 L97,28 L162,41 L227,53 L292,63 L357,70 L422,74 L422,80 L32,80 Z" fill="var(--boreal-red, #ef4444)" fill-opacity="0.08"/>
              <path d="M32,18 L97,20 L162,23 L227,26 L292,30 L357,32 L422,35 L422,80 L32,80 Z" fill="var(--boreal-blue, #3b82f6)" fill-opacity="0.12"/>
              <polyline points="32,18 97,28 162,41 227,53 292,63 357,70 422,74" fill="none" stroke="var(--boreal-red, #ef4444)" stroke-width="1.5" stroke-dasharray="5,3" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="32,18 97,20 162,23 227,26 292,30 357,32 422,35" fill="none" stroke="var(--boreal-blue, #3b82f6)" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>

              <circle cx="32" cy="18" r="3.2" fill="var(--boreal-blue, #3b82f6)"/>
              <circle cx="422" cy="74" r="2.6" fill="var(--boreal-red, #ef4444)"/>
              <circle cx="422" cy="35" r="3.2" fill="var(--boreal-blue, #3b82f6)"/>

              <text x="37" y="14" text-anchor="start" font-size="7" font-weight="bold" fill="var(--boreal-blue, #3b82f6)">85%</text>
              <text x="417" y="70" text-anchor="end" font-size="7" font-weight="bold" fill="var(--boreal-red, #ef4444)">8%</text>
              <text x="417" y="30" text-anchor="end" font-size="7" font-weight="bold" fill="var(--boreal-blue, #3b82f6)">62%</text>

              <line x1="430" y1="35" x2="430" y2="74" stroke="var(--boreal-amber, #f59e0b)" stroke-width="0.6" opacity="0.6"/>
              <line x1="427" y1="35" x2="433" y2="35" stroke="var(--boreal-amber, #f59e0b)" stroke-width="0.6" opacity="0.6"/>
              <line x1="427" y1="74" x2="433" y2="74" stroke="var(--boreal-amber, #f59e0b)" stroke-width="0.6" opacity="0.6"/>
              <text x="436" y="56" text-anchor="start" font-size="6" font-weight="bold" fill="var(--boreal-amber, #f59e0b)" opacity="0.8">Δ54pp</text>
            </svg>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span class="text-[8px] uppercase tracking-widest text-boreal-text-muted font-black block">Start</span>
              <span class="mt-1 block text-[1.9rem] font-mono font-bold text-boreal-blue leading-none">85%</span>
              <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Wave-2 opening posture</p>
            </div>
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span class="text-[8px] uppercase tracking-widest text-boreal-text-muted font-black block">SSS T+12</span>
              <span class="mt-1 block text-[1.9rem] font-mono font-bold text-boreal-blue leading-none">62%</span>
              <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Projected readiness</p>
            </div>
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span class="text-[8px] uppercase tracking-widest text-boreal-text-muted font-black block">Legacy T+12</span>
              <span class="mt-1 block text-[1.9rem] font-mono font-bold text-boreal-red leading-none">8%</span>
              <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Collapse trajectory</p>
            </div>
            <div class="rounded-sm border border-boreal-amber/30 bg-gradient-to-br from-boreal-amber/10 to-boreal-canvas/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span class="text-[8px] uppercase tracking-widest text-boreal-amber font-black block">Gap</span>
              <span class="mt-1 block text-[1.9rem] font-mono font-bold text-boreal-text-primary leading-none">+54pp</span>
              <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Protection preserved</p>
            </div>
          </div>

          <p class="mt-4 max-w-2xl text-[10px] leading-relaxed text-boreal-text-muted italic">
            The policy curve stays above the collapse line across the full 12 hour window. The visual gap is large enough to justify a dedicated forecast panel.
          </p>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommanderReadinessProjection {}
