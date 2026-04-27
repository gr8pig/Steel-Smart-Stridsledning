import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { KnowledgeGraphViewerComponent } from '../../../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';
import { ShowcaseState } from '../showcase-data';

@Component({
  selector: 'app-kg-slide',
  standalone: true,
  imports: [KnowledgeGraphViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slide slide-kg animate-in">
      <div class="slide-split">
        <div class="slide-left-panel">
          <div class="slide-eyebrow">{{ state.slides[6].eyebrow }}</div>
          <h2 class="slide-title">{{ state.slides[6].title }}</h2>
          <p class="slide-sub">{{ state.slides[6].subtitle }}</p>

          <div class="kg-section">
            <div class="kg-section-header kg-demo-header">
              <span class="kg-section-dot" style="background:#60a5fa"></span>
              MÖJLIGT EFTERSOM SAMMA STATE DELAS
            </div>
            <div class="kg-section-items">
            @for (effect of state.unificationEffects; track effect.id; let i = $index) {
                <div class="kg-item" [class.kg-item-active]="state.unificationFocusIndex() === i" (click)="state.unificationFocusIndex.set(i)" tabindex="0" (keydown.enter)="state.unificationFocusIndex.set(i)" (keydown.space)="state.unificationFocusIndex.set(i)"><strong>{{ effect.title }}</strong> · {{ effect.body }}</div>
              }
            </div>
          </div>

          <div class="kg-section">
            <div class="kg-section-header kg-power-header">
              <span class="kg-section-dot" style="background:#34d399"></span>
              SYSTEM I GRAFEN
            </div>
            <div class="kg-section-items">
              <div class="kg-item">01 Theater state · samma ingång för alla beslut</div>
              <div class="kg-item">02 COA solver · policy weights och reserve floor</div>
              <div class="kg-item">03 Counterfactual lab · decision tree och ML inferens</div>
              <div class="kg-item">04 Governance & audit · samma beslutskedja</div>
              <div class="kg-item">05 Field console · operatören ser samma semantik</div>
            </div>
          </div>

          <div class="kg-section">
            <div class="kg-section-header kg-more-header">
              <span class="kg-section-dot" style="background:#a78bfa"></span>
              FORTSATT SKALA
            </div>
            <div class="kg-section-items">
              <div class="kg-item">C2 resilience · command friction och collapse horizon</div>
              <div class="kg-item">Threat inspector · intent och osäkerhet i samma domänmodell</div>
              <div class="kg-item">Demo director · scenario injection med samma kontrakt</div>
              <div class="kg-item">Sovereign deployment · lokal eller EU utan semantisk drift</div>
            </div>
          </div>

          <div class="kg-section">
            <div class="kg-section-header kg-path-header">
              <span class="kg-section-dot" style="background:#f59e0b"></span>
              GRAFSPÅR SOM SPELAS IGENOM
            </div>
            <div class="kg-path-rail">
              @for (node of state.kgPathNodes; track node.id; let i = $index) {
                <button class="kg-path-node" [class.kg-path-node-active]="state.kgNodeIndex() === i" (click)="state.selectKgNode(i)">
                  <span class="kg-path-node-index">0{{ i + 1 }}</span>
                  <span class="kg-path-node-title">{{ node.title }}</span>
                  <span class="kg-path-node-summary">{{ node.summary }}</span>
                </button>
                @if (i < state.kgPathNodes.length - 1) {
                  <div class="kg-path-arrow">→</div>
                }
              }
            </div>
            @if (state.currentKgNode(); as kgNode) {
              <div class="kg-info-card">
                <div class="kg-info-top">
                  <div class="kg-info-title">{{ kgNode.title }}</div>
                  <div class="kg-info-step">{{ (state.kgNodeIndex() + 1) }} / {{ state.kgPathNodes.length }}</div>
                </div>
                <div class="kg-info-body">{{ kgNode.detail }}</div>
                <div class="kg-info-unlocks">Varför detta spelar roll: {{ kgNode.unlocks }}</div>
              </div>
            }
          </div>

          <p class="kg-hint">Samma state och samma ontologi gör att dessa ytor kan växa ihop utan att bli feature-islands.</p>
        </div>

        <!-- 3D Knowledge Graph Viewer -->
        <div class="kg-viewer-container">
          <div class="kg-viewer-label">
            PLATFORM KNOWLEDGE GRAPH · 3D WebGL · Live
            <span class="kg-live-dot"></span>
          </div>
          <div class="kg-viewer-inner">
            <app-knowledge-graph-viewer></app-knowledge-graph-viewer>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kg-viewer-container {
      position: relative; border-radius: 8px; overflow: hidden;
      border: 1px solid rgba(96,165,250,0.2); background: #05080d;
      display: flex; flex-direction: column;
    }
    .kg-viewer-label {
      padding: 6px 12px; font-size: 8px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.22em; color: rgba(96,165,250,0.7);
      border-bottom: 1px solid rgba(96,165,250,0.15);
      background: rgba(96,165,250,0.05);
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .kg-live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #34d399;
      animation: blink 1.5s ease-in-out infinite;
    }
    .kg-viewer-inner { flex: 1; min-height: 0; }
    .kg-categories { display: flex; flex-direction: column; gap: 6px; }
    .kg-cat {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-radius: 6px; border: 1px solid;
      font-size: 11px; color: var(--s-text);
    }
    .kg-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    
    .kg-section { display: flex; flex-direction: column; gap: 6px; }
    .kg-section-header {
      display: flex; align-items: center; gap: 6px;
      font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.22em;
      padding: 4px 0;
    }
    .kg-demo-header { color: rgba(96,165,250,0.9); }
    .kg-power-header { color: rgba(52,211,153,0.9); }
    .kg-more-header { color: rgba(167,139,250,0.9); }
    .kg-path-header { color: rgba(245,158,11,0.9); }
    .kg-section-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .kg-section-items { display: flex; flex-direction: column; gap: 2px; padding-left: 13px; }
    .kg-item {
      font-size: 11px; color: var(--s-muted); line-height: 1.6; padding: 2px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: color 0.2s;
    }
    .kg-item:hover { color: var(--s-text); }
    .kg-item-active { color: var(--s-text); }
    .kg-item:last-child { border-bottom: none; }
    .kg-path-rail {
      display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px;
      align-items: stretch; margin-top: 6px;
    }
    .kg-path-node {
      display: flex; flex-direction: column; gap: 4px; text-align: left;
      padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;
      min-height: 108px;
    }
    .kg-path-node:hover { border-color: rgba(245,158,11,0.24); background: rgba(245,158,11,0.05); }
    .kg-path-node-active { border-color: rgba(245,158,11,0.36); background: rgba(245,158,11,0.08); box-shadow: 0 0 0 1px rgba(245,158,11,0.08) inset; }
    .kg-path-node-index {
      font-size: 9px; font-weight: 900; font-family: monospace; color: var(--s-amber);
      text-transform: uppercase; letter-spacing: 0.14em;
    }
    .kg-path-node-title { font-size: 11px; font-weight: 800; color: var(--s-text); line-height: 1.35; }
    .kg-path-arrow {
      display: grid; place-items: center; align-self: center;
      font-size: 16px; color: var(--s-amber); font-weight: 900; opacity: 0.9;
    }
    .kg-info-card {
      margin-top: 10px; padding: 12px 14px; border-radius: 10px;
      border: 1px solid rgba(245,158,11,0.16); background: rgba(245,158,11,0.05);
      display: flex; flex-direction: column; gap: 6px;
    }
    .kg-info-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .kg-info-title { font-size: 12px; font-weight: 900; color: var(--s-text); text-transform: uppercase; letter-spacing: 0.12em; }
    .kg-info-body { font-size: 11px; line-height: 1.6; color: var(--s-muted); }
    .kg-hint { font-size: 10px; font-family: monospace; color: rgba(156,176,199,0.4); margin: 0; }
  `],
})
export class KgSlide {
  readonly state = inject(ShowcaseState);
}
