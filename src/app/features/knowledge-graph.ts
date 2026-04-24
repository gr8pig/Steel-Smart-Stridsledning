import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { KgsaStore } from '../core/state/kgsa.store';
import { FeatureFlagService } from '../core/services/feature-flag.service';
import { AuditLogger } from '../core/services/audit-logger';
import { KgsaNode, KgsaHypothesis } from '../shared/domain/kgsa';

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full bg-boreal-canvas relative flex overflow-hidden">

      <!-- Feature Gate Overlay -->
      @if (!flags.isEnabled('kgsa')) {
        <div class="absolute inset-0 z-50 bg-boreal-canvas/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div class="p-8 border border-boreal-border bg-boreal-panel rounded-sm shadow-2xl flex flex-col items-center gap-4 max-w-sm">
            <mat-icon class="text-boreal-text-muted !text-5xl !w-12 !h-12 opacity-30">hub</mat-icon>
            <div class="text-center">
              <div class="text-[10px] font-black text-boreal-text-muted uppercase tracking-[0.3em] mb-2">Feature Gated</div>
              <h2 class="text-sm font-bold text-boreal-text-primary uppercase tracking-widest mb-2">KGSA Knowledge Graph</h2>
              <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic">
                Knowledge Graph Situation Awareness is a gated capability. Enable via Demo Director or feature flag console.
              </p>
            </div>
            <button (click)="enableKgsa()"
              class="w-full py-2.5 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm text-[10px] font-black text-boreal-blue hover:bg-boreal-blue/20 transition-all uppercase tracking-widest">
              Enable for This Session
            </button>
          </div>
        </div>
      }

      <!-- Left: Node Browser -->
      <div class="w-72 border-r border-boreal-border bg-boreal-panel flex flex-col z-20 shadow-2xl">
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted flex items-center justify-between">
          <span>Graph Nodes</span>
          <span class="text-[8px] bg-boreal-blue/10 text-boreal-blue px-1.5 py-0.5 rounded font-black">{{ kgsa.nodes().length }}</span>
        </div>

        <!-- Node list -->
        <div class="flex-grow overflow-y-auto">
          @for (node of kgsa.nodes(); track node.id) {
            <button class="w-full text-left p-3 border-b border-boreal-border hover:bg-boreal-panel-muted/30 transition-colors group"
                    (click)="kgsa.selectNode(node.id)"
                    [class.bg-boreal-panel-elevated]="kgsa.selectedNodeId() === node.id">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full flex-shrink-0"
                  [class.bg-boreal-blue]="node.type === 'TRACK'"
                  [class.bg-boreal-amber]="node.type === 'SIGNAL'"
                  [class.bg-boreal-green]="node.type === 'HYPOTHESIS'"
                  [class.bg-zinc-500]="node.type === 'BASE'"
                  [class.bg-boreal-red]="node.type === 'EVENT'">
                </span>
                <span class="text-[9px] font-bold text-boreal-text-primary uppercase tracking-tight truncate flex-grow">{{ node.label }}</span>
                <span class="text-[7px] font-mono text-boreal-text-muted flex-shrink-0">{{ (node.confidence * 100 | number:'1.0-0') }}%</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[7px] px-1 py-0.5 border rounded uppercase font-bold"
                  [class.text-boreal-blue]="node.type === 'TRACK'"
                  [class.border-boreal-blue/30]="node.type === 'TRACK'"
                  [class.text-boreal-amber]="node.type === 'SIGNAL'"
                  [class.border-boreal-amber/30]="node.type === 'SIGNAL'"
                  [class.text-boreal-green]="node.type === 'HYPOTHESIS'"
                  [class.border-boreal-green/30]="node.type === 'HYPOTHESIS'"
                  [class.text-zinc-400]="node.type === 'BASE'"
                  [class.border-zinc-500/30]="node.type === 'BASE'">
                  {{ node.type }}
                </span>
                @for (tag of node.tags.slice(0, 2); track tag) {
                  <span class="text-[7px] text-boreal-text-muted font-mono">{{ tag }}</span>
                }
              </div>
            </button>
          }
        </div>

        <!-- Add Weak Signal -->
        <div class="p-3 border-t border-boreal-border bg-boreal-panel-muted/20">
          <button (click)="_showAddSignal.set(!_showAddSignal())"
            class="w-full py-2 text-[9px] font-bold uppercase tracking-widest text-boreal-blue border border-boreal-blue/30 rounded-sm hover:bg-boreal-blue/10 transition-all flex items-center justify-center gap-2">
            <mat-icon class="!text-xs">add</mat-icon>
            Add Weak Signal
          </button>

          @if (_showAddSignal()) {
            <div class="mt-2 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
              <input [value]="_newSignalText()"
                (input)="_newSignalText.set($any($event.target).value)"
                placeholder="Signal description..."
                class="w-full bg-boreal-canvas border border-boreal-border rounded-sm px-2 py-1.5 text-[9px] text-boreal-text-primary placeholder-boreal-text-muted focus:outline-none focus:border-boreal-blue/40">
              <div class="flex gap-2">
                <button (click)="submitWeakSignal()"
                  [disabled]="!_newSignalText().trim()"
                  class="flex-grow py-1.5 text-[8px] font-bold uppercase bg-boreal-blue text-white rounded-sm disabled:opacity-30 hover:brightness-110 transition-all">
                  Submit
                </button>
                <button (click)="_showAddSignal.set(false); _newSignalText.set('')"
                  class="px-2 py-1.5 text-[8px] border border-boreal-border text-boreal-text-muted rounded-sm hover:text-boreal-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Center: Graph Visualization (SVG-based) -->
      <div class="flex-grow relative overflow-hidden bg-boreal-canvas/60">
        <!-- Dot grid -->
        <div class="absolute inset-0 opacity-5 pointer-events-none"
          style="background-image: radial-gradient(var(--boreal-blue) 1px, transparent 1px); background-size: 60px 60px;">
        </div>

        <svg class="w-full h-full" viewBox="0 0 900 700" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrowGraph" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="var(--boreal-blue)" opacity="0.5" />
            </marker>
            <marker id="arrowGraphCausal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="var(--boreal-amber)" opacity="0.7" />
            </marker>
          </defs>

          <!-- Edges -->
          @for (edge of kgsa.edges(); track edge.id) {
            @if (getNodePos(edge.fromNodeId); as from) {
              @if (getNodePos(edge.toNodeId); as to) {
                <line [attr.x1]="from.x" [attr.y1]="from.y"
                      [attr.x2]="to.x" [attr.y2]="to.y"
                      [attr.stroke]="getEdgeColor(edge.type)"
                      stroke-width="1"
                      [attr.stroke-dasharray]="edge.type === 'CORRELATIONAL' ? '4,3' : ''"
                      [attr.opacity]="edge.confidence * 0.8 + 0.1"
                      marker-end="url(#arrowGraph)"
                />
                <!-- Edge label at midpoint -->
                <text [attr.x]="(from.x + to.x) / 2" [attr.y]="(from.y + to.y) / 2 - 4"
                  text-anchor="middle" style="font-size: 6px; font-family: monospace;"
                  class="fill-boreal-text-muted" opacity="0.5">
                  {{ edge.label.substring(0, 30) }}
                </text>
              }
            }
          }

          <!-- Nodes -->
          @for (node of kgsa.nodes(); track node.id) {
            @if (getNodePos(node.id); as pos) {
              <g [attr.transform]="'translate(' + pos.x + ',' + pos.y + ')'"
                 class="cursor-pointer"
                 (click)="kgsa.selectNode(node.id)">
                <!-- Selection ring -->
                @if (kgsa.selectedNodeId() === node.id) {
                  <circle r="22" fill="none" class="stroke-boreal-blue animate-pulse" stroke-width="1" stroke-dasharray="3,2" />
                }
                <!-- Node circle -->
                <circle [attr.r]="getNodeRadius(node)"
                  [attr.fill]="getNodeFill(node)"
                  [attr.stroke]="getNodeStroke(node)"
                  stroke-width="1.5" />
                <!-- Confidence arc -->
                <circle [attr.r]="getNodeRadius(node)"
                  fill="none"
                  [attr.stroke]="getNodeStroke(node)"
                  stroke-width="2"
                  [attr.stroke-dasharray]="getConfidenceArc(node)"
                  transform="rotate(-90)"
                  opacity="0.5" />
                <!-- Type icon (first letter) -->
                <text y="4" text-anchor="middle" style="font-size: 9px; font-weight: bold; font-family: monospace;"
                  class="fill-boreal-text-primary select-none pointer-events-none">
                  {{ node.type[0] }}
                </text>
                <!-- Label below -->
                <text y="24" text-anchor="middle" style="font-size: 7px; font-family: monospace;"
                  class="fill-boreal-text-secondary select-none pointer-events-none">
                  {{ node.id }}
                </text>
              </g>
            }
          }
        </svg>

        <!-- Legend -->
        <div class="absolute top-4 right-4 bg-boreal-panel/80 backdrop-blur border border-boreal-border rounded-sm p-3 flex flex-col gap-1.5">
          <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest mb-1">Node Types</span>
          @for (legend of legendItems; track legend.label) {
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" [style.background]="legend.color"></div>
              <span class="text-[8px] text-boreal-text-muted font-mono uppercase">{{ legend.label }}</span>
            </div>
          }
          <div class="mt-1 pt-1 border-t border-boreal-border/50 flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <div class="w-6 h-[1px] border-t border-boreal-amber"></div>
              <span class="text-[7px] text-boreal-text-muted font-mono">CAUSAL</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-6 h-[1px] border-t border-dashed border-boreal-blue opacity-60"></div>
              <span class="text-[7px] text-boreal-text-muted font-mono">CORRELATIONAL</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Selected node detail + Hypotheses -->
      <div class="w-72 border-l border-boreal-border bg-boreal-panel flex flex-col overflow-y-auto z-20 shadow-[-20px_0_40px_var(--boreal-shadow)]">

        <!-- Selected node detail -->
        @if (kgsa.selectedNode(); as node) {
          <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted">Node Detail</div>
          <div class="p-4 flex flex-col gap-3 border-b border-boreal-border animate-in fade-in duration-200">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full flex-shrink-0"
                [class.bg-boreal-blue]="node.type === 'TRACK'"
                [class.bg-boreal-amber]="node.type === 'SIGNAL'"
                [class.bg-boreal-green]="node.type === 'HYPOTHESIS'"
                [class.bg-zinc-500]="node.type === 'BASE'">
              </span>
              <span class="text-[10px] font-black text-boreal-text-primary uppercase tracking-tight">{{ node.label }}</span>
            </div>
            <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic">{{ node.description }}</p>
            <div class="grid grid-cols-2 gap-2 text-[8px]">
              <div>
                <span class="text-boreal-text-muted uppercase">Confidence</span>
                <div class="font-bold font-mono"
                  [class.text-boreal-green]="node.confidence >= 0.7"
                  [class.text-boreal-amber]="node.confidence >= 0.4 && node.confidence < 0.7"
                  [class.text-boreal-red]="node.confidence < 0.4">
                  {{ (node.confidence * 100 | number:'1.0-0') }}%
                </div>
              </div>
              <div>
                <span class="text-boreal-text-muted uppercase">Type</span>
                <div class="font-bold text-boreal-text-primary">{{ node.type }}</div>
              </div>
              @if (node.linkedTrackId) {
                <div class="col-span-2">
                  <span class="text-boreal-text-muted uppercase">Linked Track</span>
                  <div class="font-bold font-mono text-boreal-blue">{{ node.linkedTrackId }}</div>
                </div>
              }
            </div>

            <!-- Connected edges -->
            @if (kgsa.selectedNodeEdges().length > 0) {
              <div class="pt-2 border-t border-boreal-border">
                <span class="text-[8px] font-black text-boreal-text-muted uppercase tracking-widest block mb-2">
                  Connections ({{ kgsa.selectedNodeEdges().length }})
                </span>
                @for (edge of kgsa.selectedNodeEdges(); track edge.id) {
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-[7px] px-1 border rounded uppercase font-bold"
                      [class.text-boreal-amber]="edge.type === 'CAUSAL'"
                      [class.border-boreal-amber/30]="edge.type === 'CAUSAL'"
                      [class.text-boreal-blue]="edge.type !== 'CAUSAL'"
                      [class.border-boreal-blue/30]="edge.type !== 'CAUSAL'">
                      {{ edge.type }}
                    </span>
                    <span class="text-[8px] text-boreal-text-secondary flex-grow leading-tight truncate">{{ edge.label }}</span>
                    <span class="text-[7px] font-mono text-boreal-text-muted">{{ (edge.confidence * 100 | number:'1.0-0') }}%</span>
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="p-4 text-center text-boreal-text-muted text-[9px] italic border-b border-boreal-border">
            Select a node to inspect
          </div>
        }

        <!-- Active Hypotheses -->
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted">
          Active Hypotheses ({{ kgsa.activeHypotheses().length }})
        </div>
        <div class="flex-grow overflow-y-auto p-4 flex flex-col gap-3">
          @for (hyp of kgsa.hypotheses(); track hyp.id) {
            <div class="p-3 border rounded-sm flex flex-col gap-2 transition-all"
              [class.border-boreal-blue/30]="hyp.status === 'ACTIVE'"
              [class.bg-boreal-blue/5]="hyp.status === 'ACTIVE'"
              [class.border-boreal-green/30]="hyp.status === 'CONFIRMED'"
              [class.bg-boreal-green/5]="hyp.status === 'CONFIRMED'"
              [class.border-boreal-red/30]="hyp.status === 'REFUTED'"
              [class.bg-boreal-red/5]="hyp.status === 'REFUTED'"
              [class.opacity-50]="hyp.status === 'DORMANT'">

              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-tight"
                  [class.text-boreal-blue]="hyp.status === 'ACTIVE'"
                  [class.text-boreal-green]="hyp.status === 'CONFIRMED'"
                  [class.text-boreal-red]="hyp.status === 'REFUTED'"
                  [class.text-boreal-text-muted]="hyp.status === 'DORMANT'">
                  {{ hyp.title }}
                </span>
                <span class="text-[8px] font-mono text-boreal-text-muted">{{ (hyp.confidence * 100 | number:'1.0-0') }}%</span>
              </div>

              <p class="text-[9px] text-boreal-text-secondary leading-relaxed italic">{{ hyp.description }}</p>

              <div class="text-[7px] text-boreal-text-muted font-mono">
                Evidence nodes: {{ hyp.evidenceNodeIds.join(', ') }}
              </div>

              @if (hyp.status === 'ACTIVE') {
                <div class="flex gap-1.5 pt-1">
                  <button (click)="kgsa.updateHypothesisStatus(hyp.id, 'CONFIRMED')"
                    class="flex-grow py-1 text-[7px] font-bold uppercase border border-boreal-green/30 text-boreal-green rounded hover:bg-boreal-green/10 transition-colors">
                    Confirm
                  </button>
                  <button (click)="kgsa.updateHypothesisStatus(hyp.id, 'REFUTED')"
                    class="flex-grow py-1 text-[7px] font-bold uppercase border border-boreal-red/30 text-boreal-red rounded hover:bg-boreal-red/10 transition-colors">
                    Refute
                  </button>
                  <button (click)="kgsa.updateHypothesisStatus(hyp.id, 'DORMANT')"
                    class="flex-grow py-1 text-[7px] font-bold uppercase border border-boreal-border text-boreal-text-muted rounded hover:bg-boreal-panel-muted transition-colors">
                    Dormant
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; height: 100%; } .mat-icon { font-size: 16px; width: 16px; height: 16px; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeGraph {
  kgsa  = inject(KgsaStore);
  flags = inject(FeatureFlagService);
  audit = inject(AuditLogger);

  _showAddSignal  = signal(false);
  _newSignalText  = signal('');

  // Fixed layout positions for the seeded nodes (SVG 900×700)
  private readonly _nodePositions: Record<string, { x: number; y: number }> = {
    'KN-001': { x: 150, y: 180 },
    'KN-002': { x: 280, y: 120 },
    'KN-003': { x: 430, y: 100 },
    'KN-004': { x: 150, y: 380 },
    'KN-005': { x: 280, y: 450 },
    'KN-006': { x: 420, y: 390 },
    'KN-007': { x: 550, y: 280 },
    'KN-008': { x: 650, y: 380 },
    'KN-009': { x: 620, y: 180 },
    'KN-010': { x: 500, y: 560 },
  };
  private _dynamicPositions: Record<string, { x: number; y: number }> = {};

  readonly legendItems = [
    { label: 'TRACK',      color: 'var(--boreal-blue)' },
    { label: 'SIGNAL',     color: 'var(--boreal-amber)' },
    { label: 'HYPOTHESIS', color: 'var(--boreal-green)' },
    { label: 'BASE',       color: '#71717a' },
    { label: 'EVENT',      color: 'var(--boreal-red)' },
  ];

  getNodePos(nodeId: string): { x: number; y: number } | null {
    return this._nodePositions[nodeId] ?? this._dynamicPositions[nodeId] ?? this._assignDynamicPos(nodeId);
  }

  private _assignDynamicPos(nodeId: string): { x: number; y: number } {
    const idx = Object.keys(this._dynamicPositions).length;
    const pos = { x: 100 + (idx % 5) * 140, y: 580 + Math.floor(idx / 5) * 60 };
    this._dynamicPositions[nodeId] = pos;
    return pos;
  }

  getNodeRadius(node: KgsaNode): number {
    return node.type === 'HYPOTHESIS' ? 14 : 10;
  }

  getNodeFill(node: KgsaNode): string {
    switch (node.type) {
      case 'TRACK':      return 'rgba(59,130,246,0.15)';
      case 'SIGNAL':     return 'rgba(245,158,11,0.15)';
      case 'HYPOTHESIS': return 'rgba(34,197,94,0.15)';
      case 'BASE':       return 'rgba(113,113,122,0.15)';
      case 'EVENT':      return 'rgba(239,68,68,0.15)';
    }
  }

  getNodeStroke(node: KgsaNode): string {
    switch (node.type) {
      case 'TRACK':      return 'var(--boreal-blue)';
      case 'SIGNAL':     return 'var(--boreal-amber)';
      case 'HYPOTHESIS': return 'var(--boreal-green)';
      case 'BASE':       return '#71717a';
      case 'EVENT':      return 'var(--boreal-red)';
    }
  }

  getConfidenceArc(node: KgsaNode): string {
    const r = this.getNodeRadius(node);
    const circ = 2 * Math.PI * r;
    return `${circ * node.confidence} ${circ * (1 - node.confidence)}`;
  }

  getEdgeColor(type: KgsaNode['type'] | string): string {
    switch (type) {
      case 'CAUSAL':        return 'var(--boreal-amber)';
      case 'SUPPORTS':      return 'var(--boreal-blue)';
      case 'CONTRADICTS':   return 'var(--boreal-red)';
      case 'CORRELATIONAL': return 'rgba(59,130,246,0.4)';
      default:              return 'var(--boreal-text-muted)';
    }
  }

  enableKgsa() {
    this.flags.enable('kgsa');
    this.audit.log({
      actor: 'ANALYST',
      action: 'KGSA Feature Enabled',
      rationale: 'Operator enabled Knowledge Graph Situation Awareness for current session.',
      category: 'SYSTEM',
    });
  }

  submitWeakSignal() {
    const text = this._newSignalText().trim();
    if (!text) return;
    this.kgsa.addWeakSignal({
      signal: text,
      strength: 0.4,
      novelty: 0.5,
    });
    this._newSignalText.set('');
    this._showAddSignal.set(false);
  }
}
