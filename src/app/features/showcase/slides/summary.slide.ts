import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-summary-slide',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-summary animate-in">
      <div class="slide-eyebrow">{{ state.slides[7].eyebrow }}</div>
      <h2 class="slide-title slide-title-big">{{ state.slides[7].title }}</h2>
      <p class="slide-sub">{{ state.slides[7].subtitle }}</p>

      <div class="summary-grid">
        <div class="sum-card">
          <div class="sum-num blue">Användarmål</div>
          <div class="sum-label">1 operatörsmål, 3 roller och 1 tydlig beslutspunkt</div>
        </div>
        <div class="sum-card">
          <div class="sum-num green">Påverkan</div>
          <div class="sum-label">2 risker: fel prioritering nu eller förlorad uthållighet sen</div>
        </div>
        <div class="sum-card">
          <div class="sum-num purple">Oundvikliga aktiviteter</div>
          <div class="sum-label">5 steg: samla, fusionera, välja, validera, skydda</div>
        </div>
        <div class="sum-card">
          <div class="sum-num amber">Lösningsstruktur</div>
          <div class="sum-label">3 metoder, 5 domäner och 1 delad state</div>
        </div>
      </div>

      <div class="data-strip data-strip-tight">
        <div class="data-pill"><span class="data-pill-num">3</span><span class="data-pill-label">Novel metoder</span><span class="data-pill-text">COA, validation, ontology</span></div>
        <div class="data-pill"><span class="data-pill-num">5</span><span class="data-pill-label">Domäner</span><span class="data-pill-text">beslut, läge, logistik, yta, infra</span></div>
        <div class="data-pill"><span class="data-pill-num">7</span><span class="data-pill-label">Surfaces</span><span class="data-pill-text">allt från field console till knowledge graph</span></div>
        <div class="data-pill"><span class="data-pill-num">1</span><span class="data-pill-label">State</span><span class="data-pill-text">en källa, en semantik</span></div>
      </div>

      <div class="summary-pillars">
        @for (method of state.novelMethods; track method.id; let i = $index) {
          <div class="pillar" [class.pillar-active]="state.summaryFocusIndex() === i" (click)="state.summaryFocusIndex.set(i)" tabindex="0" (keydown.enter)="state.summaryFocusIndex.set(i)" (keydown.space)="state.summaryFocusIndex.set(i)">
            <div class="pillar-icon">{{ method.tag }}</div>
            <div class="pillar-title">{{ method.title }}</div>
            <div class="pillar-desc">{{ method.body }}</div>
          </div>
        }
      </div>

      <div class="summary-answer">
        Hackathonet bad inte om ett helt system. Steel visar den del som måste vara rätt först: en ontologi som binder ihop data, beräknar causal intent, ger konkreta förslag, sänker kognitiv belastning i C2 och går att utvärdera mot faktisk sensordata nära realtid för att förbättra inferenskedjan efter att händelser utspelat sig.
      </div>

      <div class="summary-cta">
        <a routerLink="/" class="cta-btn">Öppna systemet <span class="cta-arrow">→</span></a>
        <span class="cta-note">Kräver åtkomstnyckel</span>
      </div>
    </div>
  `,
  styles: [`
    .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
    .sum-card { padding: 16px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px; }
    .sum-num { font-size: 28px; font-weight: 200; font-family: monospace; }
    .sum-num.blue { color: var(--s-blue); }
    .sum-num.green { color: var(--s-green); }
    .sum-num.purple { color: var(--s-purple); }
    .sum-num.amber { color: var(--s-amber); }
    .sum-label { font-size: 11px; color: var(--s-muted); }
    .summary-pillars { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
    .pillar-icon { font-size: 18px; color: var(--s-blue); }
    .pillar-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .pillar-desc { font-size: 10px; color: var(--s-muted); line-height: 1.5; }
    .summary-answer {
      padding: 14px 16px; border-radius: 8px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04); color: var(--s-text); line-height: 1.7; font-size: 12px;
    }
    .summary-cta { display: flex; align-items: center; gap: 16px; }
    .cta-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 28px; border-radius: 8px;
      background: linear-gradient(135deg, #5ca7ff, #7ce0be);
      color: #050b12; font-weight: 800; font-size: 14px;
      text-decoration: none; letter-spacing: 0.05em; transition: opacity 0.2s;
    }
    .cta-btn:hover { opacity: 0.9; }
    .cta-arrow { transition: transform 0.2s; }
    .cta-btn:hover .cta-arrow { transform: translateX(4px); }
    .cta-note { font-size: 11px; color: var(--s-muted); }
  `],
})
export class SummarySlide {
  readonly state = inject(ShowcaseState);
}
