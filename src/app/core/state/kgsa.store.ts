import { Injectable, signal, computed, inject } from '@angular/core';
import { AuditLogger } from '../services/audit-logger';
import {
  KgsaNode, KgsaEdge, KgsaHypothesis, WeakSignalEntry,
  SEED_KGSA_NODES, SEED_KGSA_EDGES, SEED_HYPOTHESES,
} from '../../shared/domain/kgsa';

@Injectable({ providedIn: 'root' })
export class KgsaStore {
  private audit = inject(AuditLogger);

  private _nodes       = signal<KgsaNode[]>(SEED_KGSA_NODES.map(n => ({ ...n })));
  private _edges       = signal<KgsaEdge[]>(SEED_KGSA_EDGES.map(e => ({ ...e })));
  private _hypotheses  = signal<KgsaHypothesis[]>(SEED_HYPOTHESES.map(h => ({ ...h })));
  private _weakSignals = signal<WeakSignalEntry[]>([]);
  private _selectedNodeId = signal<string | null>(null);

  nodes           = this._nodes.asReadonly();
  edges           = this._edges.asReadonly();
  hypotheses      = this._hypotheses.asReadonly();
  weakSignals     = this._weakSignals.asReadonly();
  selectedNodeId  = this._selectedNodeId.asReadonly();

  selectedNode = computed(() =>
    this._nodes().find(n => n.id === this._selectedNodeId()) ?? null
  );

  // Edges connected to the selected node (both directions)
  selectedNodeEdges = computed(() => {
    const id = this._selectedNodeId();
    if (!id) return [];
    return this._edges().filter(e => e.fromNodeId === id || e.toNodeId === id);
  });

  // Neighbor nodes of the selected node
  selectedNodeNeighbors = computed(() => {
    const id = this._selectedNodeId();
    if (!id) return [];
    const neighborIds = new Set<string>();
    for (const edge of this.selectedNodeEdges()) {
      neighborIds.add(edge.fromNodeId === id ? edge.toNodeId : edge.fromNodeId);
    }
    return this._nodes().filter(n => neighborIds.has(n.id));
  });

  activeHypotheses = computed(() =>
    this._hypotheses().filter(h => h.status === 'ACTIVE')
  );

  highConfidenceNodes = computed(() =>
    this._nodes().filter(n => n.confidence >= 0.65)
  );

  selectNode(id: string | null) {
    this._selectedNodeId.set(id);
  }

  addWeakSignal(entry: Omit<WeakSignalEntry, 'id' | 'timestamp'>) {
    const newSignal: WeakSignalEntry = {
      ...entry,
      id: `WS-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    this._weakSignals.update(list => [newSignal, ...list]);

    this.audit.log({
      actor: 'ANALYST',
      action: 'Weak Signal Added',
      rationale: `Signal: "${entry.signal}". Strength: ${(entry.strength * 100).toFixed(0)}%. Novelty: ${(entry.novelty * 100).toFixed(0)}%.`,
      category: 'TACTICAL',
    });
  }

  updateHypothesisStatus(id: string, status: KgsaHypothesis['status'], analystNote?: string) {
    const prev = this._hypotheses().find(h => h.id === id);
    if (!prev) return;
    this._hypotheses.update(list =>
      list.map(h => h.id === id ? { ...h, status, analystNote: analystNote ?? h.analystNote } : h)
    );
    this.audit.log({
      actor: 'ANALYST',
      action: 'Hypothesis Status Updated',
      rationale: `${prev.title}: ${prev.status} → ${status}.${analystNote ? ' Note: ' + analystNote : ''}`,
      category: 'TACTICAL',
    });
  }

  // Link a weak signal to an existing hypothesis by adding a new node + edge
  linkSignalToHypothesis(signalEntry: WeakSignalEntry, hypothesisId: string) {
    const hyp = this._hypotheses().find(h => h.id === hypothesisId);
    if (!hyp) return;

    const newNodeId = `KN-WS-${Date.now()}`;
    const newNode: KgsaNode = {
      id: newNodeId, type: 'SIGNAL',
      label: signalEntry.signal,
      description: `Weak signal added by analyst. Strength: ${(signalEntry.strength * 100).toFixed(0)}%.`,
      confidence: signalEntry.strength,
      timestamp: signalEntry.timestamp,
      linkedTrackId: signalEntry.trackId,
      linkedBaseId: signalEntry.baseId,
      tags: ['analyst-added', 'weak-signal'],
    };

    const newEdge: KgsaEdge = {
      id: `KE-WS-${Date.now()}`,
      fromNodeId: newNodeId,
      toNodeId: hyp.evidenceNodeIds[0] ?? hypothesisId,
      type: 'SUPPORTS', confidence: signalEntry.strength,
      label: 'Analyst-submitted weak signal supports hypothesis',
      timestamp: signalEntry.timestamp,
    };

    this._nodes.update(list => [...list, newNode]);
    this._edges.update(list => [...list, newEdge]);
    this._hypotheses.update(list =>
      list.map(h => h.id === hypothesisId
        ? { ...h, evidenceNodeIds: [...h.evidenceNodeIds, newNodeId], confidence: Math.min(0.98, h.confidence + 0.05) }
        : h)
    );
    this.audit.log({
      actor: 'ANALYST',
      action: 'Signal Linked to Hypothesis',
      rationale: `Weak signal "${signalEntry.signal}" linked to hypothesis "${hyp.title}". Confidence nudged.`,
      category: 'TACTICAL',
    });
  }
}
