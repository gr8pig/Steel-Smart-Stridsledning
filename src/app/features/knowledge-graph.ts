import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeGraphViewerComponent } from '../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';
import { KnowledgeGraphStore } from '../core/state/knowledge-graph.store';

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule, KnowledgeGraphViewerComponent],
  template: `
    <div class="h-full w-full relative flex overflow-hidden bg-boreal-canvas">
      <!-- Top Bar -->
      <header class="absolute top-0 left-0 right-0 h-14 border-b border-boreal-border bg-boreal-panel/80 backdrop-blur z-10 flex items-center px-6">
        <h1 class="text-boreal-text-primary font-black uppercase tracking-[0.2em] text-sm">Boreal <span class="font-light">Info_Arch</span></h1>
      </header>

      <!-- Viewer -->
      <div class="flex-grow w-full h-full">
        <app-knowledge-graph-viewer [nodes]="store.nodes()"></app-knowledge-graph-viewer>
      </div>

      <!-- Detail Panel Overlay -->
      @if (store.selectedNodeId()) {
        <div class="absolute top-14 right-0 bottom-0 w-80 bg-boreal-panel/95 backdrop-blur border-l border-boreal-border z-20 p-6 animate-in slide-in-from-right">
           <h2 class="text-boreal-text-primary font-bold uppercase tracking-widest mb-4">Node Details</h2>
           <p class="text-xs text-boreal-blue font-mono mb-4">{{ store.selectedNodeId() }} selected.</p>
           
           @if (selectedNode(); as node) {
             <div class="space-y-4">
                <div>
                   <h3 class="text-[9px] uppercase tracking-widest text-boreal-text-muted mb-1">Description</h3>
                   <p class="text-[10px] text-boreal-text-primary leading-relaxed">{{ node.description }}</p>
                </div>
                <div>
                   <h3 class="text-[9px] uppercase tracking-widest text-boreal-text-muted mb-1">Doctrinal Mapping</h3>
                   <p class="text-[10px] text-amber-500 font-mono italic">"{{ node.technicalSpecs.doctrine }}"</p>
                </div>
             </div>
           }

           <button (click)="store.selectNode(null)" class="mt-8 text-[10px] uppercase font-black text-boreal-blue border border-boreal-blue/30 px-4 py-2 rounded hover:bg-boreal-blue/10 transition-colors">Close_Panel</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .animate-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class KnowledgeGraph {
  store = inject(KnowledgeGraphStore);

  selectedNode = computed(() => {
    const id = this.store.selectedNodeId();
    if (!id) return null;
    return this.store.nodes().find(n => n.id === id) || null;
  });
}
