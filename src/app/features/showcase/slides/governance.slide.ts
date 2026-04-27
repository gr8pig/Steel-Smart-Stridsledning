import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-governance-slide',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-governance animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ state.slides[5].eyebrow }}</div>
          <h2 class="slide-title">{{ state.slides[5].title }}</h2>
          <p class="slide-sub">{{ state.slides[5].subtitle }}</p>

          <div class="data-strip data-strip-tight">
            <div class="data-pill"><span class="data-pill-num">5</span><span class="data-pill-label">Domäner</span><span class="data-pill-text">ett språk för hela systemet</span></div>
            <div class="data-pill"><span class="data-pill-num">14</span><span class="data-pill-label">Inputs</span><span class="data-pill-text">policy, tracks, logistics, UI, infra</span></div>
            <div class="data-pill"><span class="data-pill-num">1</span><span class="data-pill-label">Ontology</span><span class="data-pill-text">en modell, många vyer</span></div>
            <div class="data-pill"><span class="data-pill-num">0</span><span class="data-pill-label">Dubbeltydlighet</span><span class="data-pill-text">samma betydelse överallt</span></div>
          </div>

          <div class="gov-authority-levels">
            @for (domain of state.ontologyDomains; track domain.id; let i = $index) {
              <div class="auth-level" [class.active-auth]="state.ontologyFocusIndex() === i" (click)="state.ontologyFocusIndex.set(i)" tabindex="0" (keydown.enter)="state.ontologyFocusIndex.set(i)" (keydown.space)="state.ontologyFocusIndex.set(i)">
                <div class="auth-badge">{{ $index + 1 }}</div>
                <div class="auth-info">
                  <div class="auth-name">{{ domain.title }}</div>
                  <div class="auth-desc">{{ domain.summary }}</div>
                  <div class="auth-data">{{ domain.datapoints }}</div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Ontology proof -->
        <div class="gov-right">
          <div class="kg-facts">
            <div class="kg-fact">
              <span class="kf-v">5</span>
              <span class="kf-l">Domäner</span>
            </div>
            <div class="kg-fact">
              <span class="kf-v">14</span>
              <span class="kf-l">Inputs</span>
            </div>
            <div class="kg-fact">
              <span class="kf-v">1</span>
              <span class="kf-l">Ontologi</span>
            </div>
            <div class="kg-fact">
              <span class="kf-v">0</span>
              <span class="kf-l">Dubbeltydighet</span>
            </div>
          </div>
          <div class="gov-factors">
            @for (domain of state.ontologyDomains; track domain.id; let i = $index) {
              <div class="gov-factor" [class.gov-factor-active]="state.ontologyFocusIndex() === i">
                <div class="gf-top">
                  <span class="gf-label">{{ domain.title }}</span>
                  <span class="gf-summary">{{ domain.summary }}</span>
                </div>
                <div class="gf-why">{{ domain.why }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gov-authority-levels { display: flex; flex-direction: column; gap: 6px; }
    .auth-level { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--s-border); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
    .auth-level:hover { border-color: rgba(245,158,11,0.28); background: rgba(245,158,11,0.05); }
    .active-auth { border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.08); }
    .auth-badge { font-size: 9px; font-weight: 900; font-family: monospace; padding: 3px 8px; border-radius: 4px; flex-shrink: 0; }
    .auth-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .auto .auth-badge { background: rgba(124,224,190,0.15); color: var(--s-green); }
    .semi .auth-badge { background: rgba(92,167,255,0.15); color: var(--s-blue); }
    .manual .auth-badge { background: rgba(245,158,11,0.2); color: var(--s-amber); }
    .auth-name { font-size: 11px; font-weight: 700; color: var(--s-text); margin-bottom: 2px; }
    .auth-desc { font-size: 10px; color: var(--s-muted); }
    .gov-right { display: flex; flex-direction: column; align-items: stretch; gap: 16px; padding: 16px; overflow-y: auto; }
    .gov-factors { width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .gov-factor { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--s-border); background: rgba(255,255,255,0.02); }
    .gov-factor-active { border-color: rgba(92,167,255,0.25); background: rgba(92,167,255,0.05); }
    .gf-top { display: flex; flex-direction: column; gap: 3px; }
    .gf-label { font-size: 10px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.14em; }
    .gf-summary { font-size: 11px; color: var(--s-text); }
    .auth-data { font-size: 9px; color: var(--s-green); font-family: monospace; }
    .gf-why { font-size: 11px; color: var(--s-muted); line-height: 1.5; }
  `],
})
export class GovernanceSlide {
  readonly state = inject(ShowcaseState);
}
