import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-ml-slide',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-ml animate-in">
      <div class="slide-eyebrow">{{ state.slides[4].eyebrow }}</div>
      <h2 class="slide-title">{{ state.slides[4].title }}</h2>
      <p class="slide-sub">{{ state.slides[4].subtitle }}</p>

      <div class="state-explain">
        <div class="state-explain-head">Varför delad state behövs</div>
        <div class="state-explain-body">Utan ett gemensamt theatre state får policy, readiness, logistics och governance egna versioner av sanningen. Med en gemensam modell kan alla ytor läsa samma sak och fatta beslut på samma grund.</div>
      </div>

      <div class="data-strip data-strip-tight">
        <div class="data-pill"><span class="data-pill-num">5</span><span class="data-pill-label">Domäner</span><span class="data-pill-text">policy, readiness, logistics, governance, labs</span></div>
        <div class="data-pill"><span class="data-pill-num">3</span><span class="data-pill-label">Ytor</span><span class="data-pill-text">API, state backbone, domain models</span></div>
        <div class="data-pill"><span class="data-pill-num">1</span><span class="data-pill-label">Sanning</span><span class="data-pill-text">samma semantik överallt</span></div>
        <div class="data-pill"><span class="data-pill-num">0</span><span class="data-pill-label">Drift</span><span class="data-pill-text">inga kopierade snapshots</span></div>
      </div>

      <div class="ml-grid">
        <!-- Single source of truth -->
        <div class="ml-card ml-card-primary" [class.ml-card-focus]="state.modelFocusIndex() === 0" (click)="state.modelFocusIndex.set(0)" tabindex="0" (keydown.enter)="state.modelFocusIndex.set(0)" (keydown.space)="state.modelFocusIndex.set(0)">
          <div class="ml-card-header">
            <span class="ml-icon">⊚</span>
            <span class="ml-card-title">Single source of truth</span>
          </div>
          <div class="ml-stack-list">
            <div class="ml-stack-item">
              <span class="ml-lib">Theater state</span><span class="ml-lic apache">shared</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Policy</span><span class="ml-lic mit">same model</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Readiness</span><span class="ml-lic mit">same model</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Logistics</span><span class="ml-lic apache">same model</span>
            </div>
            <div class="ml-stack-item">
              <span class="ml-lib">Labs</span><span class="ml-lic mit">same model</span>
            </div>
          </div>
          <div class="ml-card-note">5 domäner, 4 typer av dataflöden och 1 gemensam semantik driver samma beslutsyta.</div>
          <p class="ml-card-note">Det som skiljer Steel från en UI-demo är att samma state driver flera ytor samtidigt.</p>
        </div>

        <!-- Backend authority -->
        <div class="ml-card" [class.ml-card-focus]="state.modelFocusIndex() === 1" (click)="state.modelFocusIndex.set(1)" tabindex="0" (keydown.enter)="state.modelFocusIndex.set(1)" (keydown.space)="state.modelFocusIndex.set(1)">
          <div class="ml-card-header">
            <span class="ml-icon">⊛</span>
            <span class="ml-card-title">Backend authority</span>
          </div>
          <div class="ml-flag-row">
            <div class="ml-flag-item">
              <div class="ml-flag fr">API</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">FastAPI</div>
                <div class="ml-flag-sub">Autoritativ decision logic</div>
              </div>
            </div>
            <div class="ml-flag-item">
              <div class="ml-flag eu">SRV</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">State backbone</div>
                <div class="ml-flag-sub">Policy, readiness, logistics, labs</div>
              </div>
            </div>
            <div class="ml-flag-item">
              <div class="ml-flag se">DB</div>
              <div class="ml-flag-text">
                <div class="ml-flag-name">Shared domain models</div>
                <div class="ml-flag-sub">One meaning across surfaces</div>
              </div>
            </div>
          </div>
          <div class="ml-card-note">3 lager, 2 lagringsled och 1 gemensamt kontrakt håller betydelsen stabil.</div>
          <p class="ml-card-note">Semantiken flyttas inte runt som kopior. Den läses från samma källa av varje yta.</p>
        </div>

        <!-- Consumers -->
        <div class="ml-card ml-card-highlight" [class.ml-card-focus]="state.modelFocusIndex() === 2" (click)="state.modelFocusIndex.set(2)" tabindex="0" (keydown.enter)="state.modelFocusIndex.set(2)" (keydown.space)="state.modelFocusIndex.set(2)">
          <div class="ml-card-header">
            <span class="ml-icon">⊟</span>
            <span class="ml-card-title">Consumers</span>
          </div>
          <div class="ncs-specs">
            <div class="ncs-spec"><span class="ncs-k">Policy</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Readiness</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Logistics</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Governance</span><span class="ncs-v">same state</span></div>
            <div class="ncs-spec"><span class="ncs-k">Labs</span><span class="ncs-v">same state</span></div>
          </div>
          <div class="ncs-badge">5 ytor · 1 semantic contract</div>
          <div class="ncs-badge">State re-used across all major surfaces</div>
        </div>

        <!-- BDT vs dagens system -->
        <div class="ml-card" [class.ml-card-focus]="state.modelFocusIndex() === 3" (click)="state.modelFocusIndex.set(3)" tabindex="0" (keydown.enter)="state.modelFocusIndex.set(3)" (keydown.space)="state.modelFocusIndex.set(3)">
          <div class="ml-card-header">
            <span class="ml-icon">◷</span>
            <span class="ml-card-title">BDT vs dagens system</span>
          </div>
          <div class="system-compare">
            <div class="system-compare-summary">
              Dagens system sprider läget över flera ytor. BDT samlar samma theatre state, samma beslutskedja och samma semantik i en modell.
            </div>
            <div class="system-compare-head">
              <span>Dagens system</span>
              <span>BDT</span>
            </div>
            @for (row of state.systemComparison; track row.label) {
              <div class="system-compare-row">
                <div class="system-compare-legacy">
                  <div class="system-pill system-pill-legacy">Fragmenterat</div>
                  <div class="system-compare-text">{{ row.legacyText }}</div>
                </div>
                <div class="system-compare-center">
                  <div class="system-compare-label">{{ row.label }}</div>
                  <div class="system-compare-bridge">→</div>
                  <div class="system-compare-benefit">{{ row.benefit }}</div>
                </div>
                <div class="system-compare-bdt">
                  <div class="system-pill system-pill-bdt">Unified</div>
                  <div class="system-compare-text">{{ row.bdtText }}</div>
                </div>
              </div>
            }
          </div>
          <div class="system-compare-note">
            BDT vinner eftersom samma state, samma semantik och samma kontrakt används i alla ytor. Det ger mindre drift, snabbare beslut och mindre risk för att demo, governance och operationer säger olika saker.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ml-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .ml-card { padding: 18px; border: 1px solid var(--s-border); border-radius: 8px; background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
    .ml-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .ml-card-focus { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.06); box-shadow: 0 0 0 1px rgba(92,167,255,0.08) inset; }
    .ml-card-primary { border-color: rgba(92,167,255,0.2); background: rgba(92,167,255,0.04); }
    .ml-card-highlight { border-color: rgba(124,224,190,0.25); background: rgba(124,224,190,0.04); }
    .ml-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .ml-icon { font-size: 16px; color: var(--s-blue); }
    .ml-card-highlight .ml-icon { color: var(--s-green); }
    .ml-card-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; }
    .ml-stack-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .ml-stack-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--s-border); }
    .ml-lib { font-size: 12px; font-family: monospace; color: var(--s-text); }
    .ml-lic { font-size: 8px; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .ml-lic.apache { background: rgba(92,167,255,0.15); color: var(--s-blue); }
    .ml-lic.mit { background: rgba(124,224,190,0.15); color: var(--s-green); }
    .ml-card-note { font-size: 11px; color: var(--s-muted); margin: 0; }
    .system-compare { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .system-compare-summary {
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid rgba(92,167,255,0.16); background: rgba(92,167,255,0.04);
      font-size: 11px; line-height: 1.55; color: var(--s-muted);
    }
    .system-compare-head {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-muted); padding: 0 2px;
    }
    .system-compare-row {
      display: grid; grid-template-columns: minmax(0, 1fr) 108px minmax(0, 1fr); gap: 10px;
      align-items: stretch; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.04);
    }
    .system-compare-legacy, .system-compare-bdt, .system-compare-center {
      display: flex; flex-direction: column; gap: 6px;
    }
    .system-compare-center {
      align-items: center; justify-content: center; text-align: center; padding: 2px 0;
    }
    .system-compare-label {
      font-size: 10px; color: var(--s-blue); font-weight: 900; line-height: 1.35;
      text-transform: uppercase; letter-spacing: 0.14em;
    }
    .system-compare-bridge {
      width: 100%; font-size: 14px; font-weight: 900; color: var(--s-green);
      line-height: 1; padding: 4px 0;
    }
    .system-compare-benefit {
      font-size: 11px; line-height: 1.45; color: var(--s-text); font-weight: 700;
    }
    .system-pill {
      display: inline-flex; align-items: center; align-self: flex-start; gap: 4px;
      font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em;
      padding: 3px 8px; border-radius: 999px;
    }
    .system-pill-legacy { color: #ffb4b4; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.18); }
    .system-pill-bdt { color: #c9fff0; background: rgba(124,224,190,0.12); border: 1px solid rgba(124,224,190,0.18); }
    .system-compare-text {
      font-size: 11px; line-height: 1.55; color: var(--s-muted);
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);
      min-height: 64px;
    }
    .system-compare-note {
      font-size: 11px; line-height: 1.6; color: var(--s-muted);
      padding-top: 4px;
    }
    .ml-flag-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .ml-flag-item { display: flex; align-items: center; gap: 10px; }
    .ml-flag {
      width: 36px; height: 28px; border-radius: 4px; display: grid; place-items: center;
      font-size: 9px; font-weight: 900; letter-spacing: 0.1em;
    }
    .ml-flag.fr { background: rgba(0,82,204,0.3); color: #6699ff; border: 1px solid rgba(0,82,204,0.4); }
    .ml-flag.eu { background: rgba(0,51,153,0.3); color: #8899ff; border: 1px solid rgba(0,51,153,0.4); }
    .ml-flag.se { background: rgba(0,107,56,0.3); color: #66cc99; border: 1px solid rgba(0,107,56,0.4); }
    .ml-flag-name { font-size: 12px; font-weight: 700; color: var(--s-text); }
    .ml-flag-sub { font-size: 10px; color: var(--s-muted); }
    .ncs-specs { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .ncs-spec { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--s-border); }
    .ncs-k { font-size: 10px; color: var(--s-muted); font-family: monospace; }
    .ncs-v { font-size: 11px; color: var(--s-green); font-family: monospace; font-weight: 700; }
    .ncs-badge { font-size: 9px; padding: 4px 10px; border-radius: 4px; background: rgba(124,224,190,0.15); color: var(--s-green); font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; display: inline-block; }
  `],
})
export class MlSlide {
  readonly state = inject(ShowcaseState);
}
