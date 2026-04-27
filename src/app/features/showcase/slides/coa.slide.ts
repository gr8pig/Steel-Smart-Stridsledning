import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-coa-slide',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-ai animate-in">
      <div class="slide-eyebrow">{{ state.slides[2].eyebrow }}</div>
      <h2 class="slide-title">{{ state.slides[2].title }}</h2>
      <p class="slide-sub">{{ state.slides[2].subtitle }}</p>

      <div class="data-strip">
        <div class="data-pill"><span class="data-pill-num">3</span><span class="data-pill-label">COA-grenar</span><span class="data-pill-text">MAX, BAL, DST</span></div>
        <div class="data-pill"><span class="data-pill-num">4</span><span class="data-pill-label">Policy inputs</span><span class="data-pill-text">posture, reserve, threat, wave 2</span></div>
        <div class="data-pill"><span class="data-pill-num">9</span><span class="data-pill-label">Scorefält</span><span class="data-pill-text">3 metrics per alternativ</span></div>
        <div class="data-pill"><span class="data-pill-num">1</span><span class="data-pill-label">Rekommendation</span><span class="data-pill-text">balanserat val med motivering</span></div>
      </div>

      <div class="coa-primer-grid">
        @for (item of state.coaGuide; track item.id) {
          <div class="coa-primer-card" [class.coa-primer-active]="state.selectedCoaId() === item.title">
            <div class="coa-primer-title">{{ item.title }}</div>
            <div class="coa-primer-meaning">{{ item.meaning }}</div>
            <div class="coa-primer-when">{{ item.when }}</div>
            <div class="coa-primer-tradeoff">{{ item.tradeoff }}</div>
          </div>
        }
      </div>

      <div class="intent-card">
        <div class="intent-card-head">
          <div class="intent-card-title">intent_distribution</div>
          <div class="intent-card-meta">1 track · 5 sannolikhetsklasser</div>
        </div>
        <div class="intent-card-grid">
          <div class="intent-card-item"><span>probe</span><strong>0.08</strong></div>
          <div class="intent-card-item"><span>feint</span><strong>0.18</strong></div>
          <div class="intent-card-item"><span>strike</span><strong>0.52</strong></div>
          <div class="intent-card-item"><span>saturation</span><strong>0.17</strong></div>
          <div class="intent-card-item"><span>decoy</span><strong>0.05</strong></div>
        </div>
      </div>

      <div class="ai-grid">
        <!-- Pareto scatter (SVG mini) -->
        <div class="ai-pareto-card">
          <div class="card-label">Pareto-front · Beredskap vs. Bekämpningseffekt</div>
          <svg viewBox="0 0 320 220" class="pareto-svg">
            <!-- Axes -->
            <line x1="40" y1="190" x2="300" y2="190" stroke="rgba(156,176,199,0.3)" stroke-width="1"/>
            <line x1="40" y1="10" x2="40" y2="190" stroke="rgba(156,176,199,0.3)" stroke-width="1"/>
            <text x="160" y="210" text-anchor="middle" font-size="9" fill="rgba(156,176,199,0.6)" font-family="monospace">Beredskap (%)</text>
            <text x="12" y="100" text-anchor="middle" font-size="9" fill="rgba(156,176,199,0.6)" font-family="monospace" transform="rotate(-90,12,100)">Intercept (%)</text>

            <!-- Pareto curve -->
            <path d="M 258,30 Q 160,80 80,155" stroke="rgba(92,167,255,0.3)" stroke-width="1.5" fill="none" stroke-dasharray="4,3"/>

            <!-- COA points -->
            @for (coa of state.coas; track coa.id) {
              <g [attr.transform]="'translate('+state.coaX(coa.readiness)+','+state.coaY(coa.intercept)+')'">
                <circle [attr.r]="state.selectedCoaId() === coa.id ? 9 : 6" [attr.fill]="coa.color" [attr.fill-opacity]="state.selectedCoaId() === coa.id ? 0.9 : 0.5" [attr.stroke]="coa.color" stroke-width="1.5"/>
                @if (state.selectedCoaId() === coa.id) {
                  <circle r="15" [attr.stroke]="coa.color" stroke-width="1" fill="none" opacity="0.5" class="pulse-ring"/>
                }
                <text [attr.x]="coa.readiness > 60 ? -8 : 10" y="-10" font-size="8" [attr.fill]="coa.color" font-family="monospace" font-weight="bold">{{ coa.id }}</text>
              </g>
            }
          </svg>
        </div>

        <!-- COA cards -->
        <div class="coa-list">
          @for (coa of state.coas; track coa.id) {
            <div class="coa-card" [class.coa-selected]="state.selectedCoaId() === coa.id" (click)="state.selectedCoaId.set(coa.id)" tabindex="0" (keydown.enter)="state.selectedCoaId.set(coa.id)" (keydown.space)="state.selectedCoaId.set(coa.id)">
              <div class="coa-top">
                <span class="coa-id" [style.color]="coa.color">{{ coa.id }}</span>
                @if (state.selectedCoaId() === coa.id) {
                  <span class="coa-badge">Rekommenderad</span>
                }
              </div>
              <div class="coa-name">{{ coa.label }}</div>
              <div class="coa-bars">
                <div class="coa-bar-row">
                  <span class="coa-bar-label">Bekämpning</span>
                  <div class="coa-bar-track">
                    <div class="coa-bar-fill" [style.width]="coa.intercept+'%'" [style.background]="coa.color"></div>
                  </div>
                  <span class="coa-bar-val">{{ coa.intercept }}%</span>
                </div>
                <div class="coa-bar-row">
                  <span class="coa-bar-label">Beredskap</span>
                  <div class="coa-bar-track">
                    <div class="coa-bar-fill" [style.width]="coa.readiness+'%'" style="background:rgba(124,224,190,0.7)"></div>
                  </div>
                  <span class="coa-bar-val">{{ coa.readiness }}%</span>
                </div>
                <div class="coa-bar-row">
                  <span class="coa-bar-label">Robusthet</span>
                  <div class="coa-bar-track">
                    <div class="coa-bar-fill" [style.width]="coa.robustness*100+'%'" style="background:rgba(155,140,255,0.7)"></div>
                  </div>
                  <span class="coa-bar-val">{{ coa.robustness }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Rationale block -->
        <div class="ai-rationale">
          <div class="card-label">Policy tradeoff</div>
          <p class="rationale-text">
            COA-MAX ger mest effekt nu, COA-BAL ger bäst balans och COA-DST skyddar mest uthållighet. Steel väger fyra inputs och nio scorevärden per beslut: commander posture, reserve floor, hottryck och wave 2-beredskap. Beslutet styrs inte bara av position, utan av sannolik avsikt: sondering, skenanfall, verkligt anfall, mättnadsattack eller vilseledning.
          </p>
          <div class="rationale-meta">
            <span class="r-tag">Commander posture</span>
            <span class="r-tag">Reserve floor</span>
            <span class="r-tag">Wave 2</span>
            <span class="r-tag">Score → choose</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 16px; margin-top: 16px; }
    .ai-pareto-card { grid-row: 1; padding: 16px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); }
    .coa-list { grid-row: 1; display: flex; flex-direction: column; gap: 8px; }
    .ai-rationale { grid-column: 1 / -1; padding: 16px; border: 1px solid rgba(92,167,255,0.15); border-radius: 8px; background: rgba(92,167,255,0.04); }
    .coa-primer-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
    .coa-primer-card {
      padding: 12px; border: 1px solid var(--s-border); border-radius: 8px;
      background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px;
    }
    .coa-primer-active { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.06); }
    .coa-primer-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em; color: var(--s-blue); }
    .coa-primer-meaning { font-size: 12px; font-weight: 700; color: var(--s-text); }
    .coa-primer-when { font-size: 11px; color: var(--s-muted); line-height: 1.5; }
    .coa-primer-tradeoff { font-size: 10px; color: var(--s-green); line-height: 1.5; }
    .intent-card {
      grid-column: 1 / -1;
      margin-top: 16px;
      padding: 14px 16px;
      border: 1px solid rgba(92,167,255,0.16);
      border-radius: 10px;
      background: rgba(92,167,255,0.04);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .intent-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .intent-card-title {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--s-blue);
      font-family: monospace;
    }
    .intent-card-meta {
      font-size: 10px;
      color: var(--s-muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }
    .intent-card-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }
    .intent-card-item {
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
      background: rgba(255,255,255,0.02);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .intent-card-item span {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--s-muted);
    }
    .intent-card-item strong {
      font-size: 16px;
      line-height: 1;
      color: var(--s-text);
      font-family: monospace;
    }
    .card-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--s-muted); margin-bottom: 10px; }
    .pareto-svg { width: 100%; height: 200px; }
    .pulse-ring { animation: pulseRing 2s ease-in-out infinite; }
    .coa-card { padding: 10px 12px; border: 1px solid var(--s-border); border-radius: 6px; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
    .coa-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .coa-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .coa-id { font-size: 10px; font-weight: 900; font-family: monospace; }
    .coa-badge { font-size: 8px; padding: 2px 8px; border-radius: 999px; background: rgba(92,167,255,0.2); color: var(--s-blue); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .coa-name { font-size: 11px; color: var(--s-muted); margin-bottom: 8px; }
    .coa-bars { display: flex; flex-direction: column; gap: 4px; }
    .coa-bar-row { display: flex; align-items: center; gap: 6px; }
    .coa-bar-label { font-size: 9px; color: var(--s-muted); width: 62px; flex-shrink: 0; }
    .coa-bar-track { flex: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
    .coa-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
    .coa-bar-val { font-size: 9px; font-weight: 700; font-family: monospace; color: var(--s-text); width: 32px; text-align: right; }
    .rationale-text { font-size: 12px; line-height: 1.7; color: var(--s-muted); margin: 0 0 10px; }
    .rationale-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .r-tag { font-size: 9px; padding: 2px 8px; border: 1px solid var(--s-border); border-radius: 4px; color: var(--s-muted); font-family: monospace; }
  `],
})
export class CoaSlide {
  readonly state = inject(ShowcaseState);
}
