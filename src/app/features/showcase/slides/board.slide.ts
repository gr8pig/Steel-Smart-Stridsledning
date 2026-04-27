import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-board-slide',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-board animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ state.slides[3].eyebrow }}</div>
          <h2 class="slide-title">{{ state.slides[3].title }}</h2>
          <p class="slide-sub">{{ state.slides[3].subtitle }}</p>

          <div class="validation-explain">
            <div class="validation-explain-kicker">Vad som utvärderas</div>
            <div class="validation-explain-body">{{ state.currentValidationTree().premise }}</div>
            <div class="validation-explain-meta">{{ state.currentValidationTree().modelHint }}</div>
            <div class="validation-explain-note">{{ state.currentValidationTree().collapseHint }}</div>
          </div>

          <div class="validation-chain">
            <span class="validation-chip">Decision tree</span>
            <span class="validation-arrow">→</span>
            <span class="validation-chip">ML inference</span>
            <span class="validation-arrow">→</span>
            <span class="validation-chip">Monte Carlo</span>
            <span class="validation-arrow">→</span>
            <span class="validation-chip">Counterfactual lab</span>
          </div>

          <div class="validation-tree-strip">
            @for (tree of state.validationTrees; track tree.id; let i = $index) {
              <button class="validation-tree-card" type="button" [class.validation-tree-card-active]="state.validationTreeIndex() === i" (click)="state.selectValidationTree(i)">
                <div class="validation-tree-card-title">{{ tree.title }}</div>
                <div class="validation-tree-card-premise">{{ tree.premise }}</div>
                <div class="validation-tree-card-meta">{{ tree.branches.length }} inferensgrenar</div>
              </button>
            }
          </div>

          <div class="data-strip data-strip-tight">
            <div class="data-pill"><span class="data-pill-num">3</span><span class="data-pill-label">Trees</span><span class="data-pill-text">intercept, balance, corridor</span></div>
            <div class="data-pill"><span class="data-pill-num">4</span><span class="data-pill-label">Stages</span><span class="data-pill-text">tree, ML, Monte Carlo, lab</span></div>
            <div class="data-pill"><span class="data-pill-num">9</span><span class="data-pill-label">Branches</span><span class="data-pill-text">scored and traced live</span></div>
            <div class="data-pill"><span class="data-pill-num">1</span><span class="data-pill-label">Horizon</span><span class="data-pill-text">collapse threshold per tree</span></div>
          </div>

          <div class="board-features">
            @for (step of state.validationSteps; track step.id; let i = $index) {
              <div class="board-feat" [class.board-feat-active]="state.validationFocusIndex() === i" (click)="state.validationFocusIndex.set(i)" tabindex="0" (keydown.enter)="state.validationFocusIndex.set(i)" (keydown.space)="state.validationFocusIndex.set(i)">
                <div class="feat-icon">{{ step.tag }}</div>
                <div class="feat-text">
                  <div class="feat-title">{{ step.title }}</div>
                  <div class="feat-sub">{{ step.body }}</div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Board mini demo SVG -->
        <div class="board-demo-container">
          <div class="board-demo-label">ROBUSTNESS LAB — {{ state.validationSteps[state.validationFocusIndex()].title.toUpperCase() }} · {{ state.currentValidationTree().title.toUpperCase() }}</div>
          <div class="board-demo-stage">
            <div class="board-demo-stage-head">
              <div class="board-demo-stage-title">{{ state.currentValidationTree().premise }}</div>
              <div class="board-demo-stage-sub">{{ state.currentValidationTree().modelHint }}</div>
            </div>
            <svg viewBox="0 0 760 420" preserveAspectRatio="xMidYMid slice" class="board-svg validation-svg">
              <defs>
                <filter id="tree-glow"><feGaussianBlur stdDeviation="2.4" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
              </defs>
              <rect x="1" y="1" width="758" height="418" rx="12" fill="rgba(3,7,12,0.75)" stroke="rgba(148,189,255,0.08)"/>
              <text x="32" y="36" font-size="11" fill="rgba(156,176,199,0.6)" font-family="monospace" text-transform="uppercase">Inference trace</text>
              <text x="32" y="58" font-size="15" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ state.currentValidationTree().title }}</text>
              <g>
                <circle cx="110" cy="210" r="34" fill="rgba(92,167,255,0.12)" stroke="#5ca7ff" stroke-width="1.5"/>
                <text x="110" y="204" text-anchor="middle" font-size="10" fill="#5ca7ff" font-family="monospace" font-weight="bold">ROOT</text>
                <text x="110" y="219" text-anchor="middle" font-size="11" fill="#edf5ff" font-family="monospace">{{ state.currentValidationTree().title }}</text>
              </g>
              @for (branch of state.currentValidationTree().branches; track branch.label; let i = $index) {
                @let y = 90 + (i * 110);
                <g>
                  <line x1="144" y1="210" [attr.x2]="220" [attr.y2]="y" stroke="rgba(148,189,255,0.22)" stroke-width="1.2" />
                  <line x1="220" [attr.y1]="y" x2="410" [attr.y2]="y" [attr.stroke]="state.activeValidationBranchIndex() === i ? 'rgba(124,224,190,0.9)' : 'rgba(148,189,255,0.18)'" stroke-width="1.2" stroke-dasharray="6,4" />
                  <circle cx="220" [attr.cy]="y" [attr.r]="state.activeValidationBranchIndex() === i ? 20 : 16" [attr.fill]="state.activeValidationBranchIndex() === i ? 'rgba(124,224,190,0.16)' : 'rgba(92,167,255,0.08)'" [attr.stroke]="state.activeValidationBranchIndex() === i ? '#7ce0be' : '#5ca7ff'" stroke-width="1.2"/>
                  <text x="220" [attr.y]="y - 2" text-anchor="middle" font-size="9" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ branch.label }}</text>
                  <text x="220" [attr.y]="y + 12" text-anchor="middle" font-size="9" fill="rgba(156,176,199,0.7)" font-family="monospace">p={{ branch.probability }}</text>
                  <circle cx="438" [attr.cy]="y" [attr.r]="state.activeValidationBranchIndex() === i ? 24 : 19" fill="rgba(255,255,255,0.03)" [attr.stroke]="state.activeValidationBranchIndex() === i ? '#7ce0be' : 'rgba(156,176,199,0.22)'" stroke-width="1.2"/>
                  <text x="438" [attr.y]="y - 3" text-anchor="middle" font-size="9" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ branch.outcome }}</text>
                  <text x="438" [attr.y]="y + 10" text-anchor="middle" font-size="9" [attr.fill]="state.activeValidationBranchIndex() === i ? '#7ce0be' : 'rgba(156,176,199,0.68)'" font-family="monospace">score {{ branch.score }}</text>
                </g>
              }
              <g opacity="0.95">
                <rect x="520" y="44" width="204" height="118" rx="10" fill="rgba(255,255,255,0.02)" stroke="rgba(92,167,255,0.12)"/>
                <text x="536" y="68" font-size="9" fill="rgba(156,176,199,0.7)" font-family="monospace" text-transform="uppercase">ML inference</text>
                <text x="536" y="88" font-size="11" fill="#edf5ff" font-family="monospace">Each branch gets a score.</text>
                <text x="536" y="108" font-size="11" fill="#edf5ff" font-family="monospace">Counterfactual deltas tell us</text>
                <text x="536" y="124" font-size="11" fill="#edf5ff" font-family="monospace">which assumption flips the tree.</text>
                <text x="536" y="146" font-size="9" fill="#7ce0be" font-family="monospace">Collapse: {{ state.currentValidationTree().collapseHint }}</text>
              </g>
              <g>
                <rect x="520" y="190" width="204" height="188" rx="10" fill="rgba(255,255,255,0.02)" stroke="rgba(92,167,255,0.12)"/>
                <text x="536" y="214" font-size="9" fill="rgba(156,176,199,0.7)" font-family="monospace" text-transform="uppercase">Branch ledger</text>
                @for (branch of state.currentValidationTree().branches; track branch.label; let j = $index) {
                  <rect x="536" [attr.y]="230 + (j * 48)" width="168" height="36" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(148,189,255,0.08)"/>
                  <text x="548" [attr.y]="244 + (j * 48)" font-size="10" fill="#edf5ff" font-family="monospace" font-weight="bold">{{ branch.label }}</text>
                  <text x="548" [attr.y]="258 + (j * 48)" font-size="9" fill="rgba(156,176,199,0.72)" font-family="monospace">p {{ branch.probability }} · score {{ branch.score }}</text>
                }
              </g>
            </svg>
          </div>

          <div class="validation-inference-grid">
            @for (branch of state.currentValidationTree().branches; track branch.label; let i = $index) {
              <button class="validation-inference-card" type="button" [class.validation-inference-card-active]="state.activeValidationBranchIndex() === i">
                <div class="validation-inference-top">
                  <span class="validation-inference-label">{{ branch.label }}</span>
                  <span class="validation-inference-score">{{ branch.score }}</span>
                </div>
                <div class="validation-inference-line">Probability {{ branch.probability }}</div>
                <div class="validation-inference-line">Outcome {{ branch.outcome }}</div>
                <div class="validation-inference-line">{{ branch.counterfactual }}</div>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .slide-board .slide-split {
      grid-template-columns: minmax(560px, 640px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }
    .board-demo-container {
      position: relative; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--s-border); background: rgba(3,7,12,0.8);
      display: flex; flex-direction: column;
    }
    .board-demo-label {
      padding: 6px 12px; font-size: 8px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.2em; color: var(--s-muted); border-bottom: 1px solid var(--s-border);
      background: rgba(255,255,255,0.02); flex-shrink: 0;
    }
    .board-svg { flex: 1; display: block; }
    .board-feat-active { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.08); }
    .validation-chain {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04); margin-bottom: 14px;
    }
    .validation-chip {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em;
      color: var(--s-text); padding: 5px 10px; border: 1px solid rgba(92,167,255,0.18); border-radius: 999px;
      background: rgba(255,255,255,0.03);
    }
    .validation-arrow { color: var(--s-blue); font-size: 14px; font-weight: 900; }
    .validation-tree-strip {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;
      margin-bottom: 12px;
    }
    .validation-tree-card {
      padding: 16px; border: 1px solid var(--s-border); border-radius: 10px;
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
      text-align: left;
    }
    .validation-tree-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .validation-tree-card-active { border-color: rgba(92,167,255,0.35); background: rgba(92,167,255,0.07); }
    .validation-tree-card-title {
      font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em;
      color: var(--s-blue); margin-bottom: 6px;
    }
    .validation-tree-card-premise { font-size: 13px; line-height: 1.6; color: var(--s-text); margin-bottom: 8px; }
    .validation-tree-card-meta { font-size: 11px; color: var(--s-muted); text-transform: uppercase; letter-spacing: 0.12em; }
    .board-demo-stage {
      display: flex; flex-direction: column; gap: 10px; padding: 12px; background: rgba(255,255,255,0.02);
    }
    .board-demo-stage-head { display: flex; flex-direction: column; gap: 4px; padding: 0 2px; }
    .board-demo-stage-title { font-size: 12px; font-weight: 800; color: var(--s-text); line-height: 1.45; }
    .board-demo-stage-sub { font-size: 11px; color: var(--s-muted); line-height: 1.45; }
    .validation-svg { min-height: 420px; }
    .validation-inference-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
      padding: 12px; border-top: 1px solid var(--s-border); background: rgba(255,255,255,0.02);
    }
    .validation-inference-card {
      display: flex; flex-direction: column; gap: 4px; text-align: left;
      padding: 12px 14px; border: 1px solid var(--s-border); border-radius: 10px;
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
    }
    .validation-inference-card:hover { border-color: rgba(92,167,255,0.28); background: rgba(92,167,255,0.05); }
    .validation-inference-card-active { border-color: rgba(124,224,190,0.35); background: rgba(124,224,190,0.07); }
    .validation-explain {
      display: flex; flex-direction: column; gap: 6px;
      padding: 18px 20px; border-radius: 12px; border: 1px solid rgba(92,167,255,0.16);
      background: rgba(92,167,255,0.04);
    }
    .validation-explain-kicker {
      font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.18em;
      color: var(--s-blue);
    }
    .validation-explain-body {
      font-size: 15px; line-height: 1.7; color: var(--s-text); font-weight: 700;
    }
    .validation-explain-meta {
      font-size: 13px; line-height: 1.6; color: var(--s-muted);
    }
    .validation-explain-note {
      font-size: 11px; line-height: 1.5; color: var(--s-green);
    }
  `],
})
export class BoardSlide {
  readonly state = inject(ShowcaseState);
}
