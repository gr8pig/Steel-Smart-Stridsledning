# 3D Knowledge Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an interactive 3D WebGL knowledge graph visualization of the Boreal Decision Twin architecture.

**Architecture:** A standalone Angular component managing a Three.js scene with `OrbitControls`, `UnrealBloomPass` for visual glow, and `CSS2DRenderer` for crisp HTML labels. Nodes are distinct 3D geometries, edges are lines with instanced particle flows, and state is managed via `@ngrx/signals`.

**Tech Stack:** Angular 18, Three.js, GSAP.

---

### Task 1: Setup Dependencies and Types

**Files:**
- Modify: `package.json`
- Create: `src/app/core/models/knowledge-graph.types.ts`

- [ ] **Step 1: Install Three.js and GSAP**
```bash
npm install three gsap
npm install -D @types/three
```

- [ ] **Step 2: Define Core Types**
```typescript
// src/app/core/models/knowledge-graph.types.ts
export type NodeCategory = 'CORE' | 'DECISION' | 'LOGISTICS' | 'INTELLIGENCE' | 'GOVERNANCE' | 'SURFACE';

export interface TechNode {
  id: string;
  label: string;
  category: NodeCategory;
  description: string;
  technicalSpecs: {
    inputs: string[];
    outputs: string[];
    logic?: string;
    math?: string;
    doctrine?: string;
    verif?: string;
  };
  connectedTo: string[];
  // Initial logical positions (will be translated to 3D space)
  x: number;
  y: number;
  z: number;
}
```

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json src/app/core/models/knowledge-graph.types.ts
git commit -m "chore: add three.js dependencies and knowledge graph types"
```

---

### Task 2: Knowledge Graph State Store

**Files:**
- Create: `src/app/core/state/knowledge-graph.store.ts`

- [ ] **Step 1: Create the Signal Store**
```typescript
// src/app/core/state/knowledge-graph.store.ts
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { TechNode } from '../models/knowledge-graph.types';

export interface KnowledgeGraphState {
  nodes: TechNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
}

const initialState: KnowledgeGraphState = {
  nodes: [], // Will be hydrated later
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
};

export const KnowledgeGraphStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setNodes(nodes: TechNode[]) {
      patchState(store, { nodes });
    },
    selectNode(id: string | null) {
      patchState(store, { selectedNodeId: id });
    },
    hoverNode(id: string | null) {
      patchState(store, { hoveredNodeId: id });
    },
    setSearchQuery(query: string) {
      patchState(store, { searchQuery: query });
    }
  }))
);
```

- [ ] **Step 2: Commit**
```bash
git add src/app/core/state/knowledge-graph.store.ts
git commit -m "feat: add knowledge graph signal store"
```

---

### Task 3: 3D Viewer Component Core

**Files:**
- Create: `src/app/shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component.ts`

- [ ] **Step 1: Implement the WebGL Base Component**
```typescript
// src/app/shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component.ts
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, input } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { TechNode } from '../../../core/models/knowledge-graph.types';
import { KnowledgeGraphStore } from '../../../core/state/knowledge-graph.store';

@Component({
  selector: 'app-knowledge-graph-viewer',
  standalone: true,
  template: `<div #container class="w-full h-full relative outline-none" tabindex="0"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class KnowledgeGraphViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  
  nodes = input<TechNode[]>([]);
  store = inject(KnowledgeGraphStore);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private labelRenderer!: CSS2DRenderer;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private animationFrameId: number = 0;
  private resizeObserver!: ResizeObserver;

  ngAfterViewInit() {
    this.initScene();
    this.startAnimationLoop();
    this.setupResizeObserver();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }

  private initScene() {
    const el = this.containerRef.nativeElement;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b12);

    this.camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 1, 10000);
    this.camera.position.set(0, 500, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(el.clientWidth, el.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    el.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Post-processing
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 1.5, 0.4, 0.85);
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
        this.composer.setSize(width, height);
      }
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private startAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.startAnimationLoop);
    this.controls.update();
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component.ts
git commit -m "ui: add basic WebGL knowledge graph viewer with bloom pass"
```

---

### Task 4: Node Generation and Materials

**Files:**
- Modify: `src/app/shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component.ts`

- [ ] **Step 1: Add Node creation logic to Viewer**
```typescript
// Add to KnowledgeGraphViewerComponent
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

  private nodeObjects: Map<string, THREE.Group> = new Map();

  // Add to ngAfterViewInit after initScene:
  // effect(() => { this.buildNodes(this.nodes()); }); // Note: properly inject/handle effect in constructor

  private buildNodes(nodes: TechNode[]) {
    // Clear existing
    this.nodeObjects.forEach(group => this.scene.remove(group));
    this.nodeObjects.clear();

    const matCore = new THREE.MeshStandardMaterial({ color: 0x5ca7ff, emissive: 0x5ca7ff, emissiveIntensity: 0.5 });
    const matDec = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.8 });
    const matDef = new THREE.MeshStandardMaterial({ color: 0x9ab0c8, emissive: 0x9ab0c8, emissiveIntensity: 0.2 });

    nodes.forEach(node => {
      const group = new THREE.Group();
      group.position.set(node.x, node.y, node.z);
      group.userData = { id: node.id };

      let mesh: THREE.Mesh;
      if (node.category === 'CORE') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), matCore);
      } else if (node.category === 'DECISION') {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(15), matDec);
      } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(10), matDef);
      }
      group.add(mesh);

      // Label
      const div = document.createElement('div');
      div.className = 'text-[9px] font-mono text-white tracking-widest uppercase pointer-events-none drop-shadow-md';
      div.textContent = node.label;
      const label = new CSS2DObject(div);
      label.position.set(0, 30, 0);
      group.add(label);

      this.scene.add(group);
      this.nodeObjects.set(node.id, group);
    });
  }
```

- [ ] **Step 2: Commit**
```bash
git add src/app/shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component.ts
git commit -m "ui: render 3D nodes and CSS2D labels in graph viewer"
```

---

### Task 5: Interactivity (Hover & Focus)

**Files:**
- Modify: `src/app/shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component.ts`

- [ ] **Step 1: Add Raycasting and GSAP Animation**
```typescript
// Add imports:
import gsap from 'gsap';

// Add properties:
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

// Add to initScene:
// this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
// this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

  private onMouseMove(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    let hoveredId = null;
    for (const hit of intersects) {
      // Find parent group with userData
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !obj.userData['id']) obj = obj.parent;
      if (obj) {
        hoveredId = obj.userData['id'];
        break;
      }
    }
    this.store.hoverNode(hoveredId);
  }

  private onClick() {
    const hovered = this.store.hoveredNodeId();
    if (hovered) {
      this.store.selectNode(hovered);
      const targetGroup = this.nodeObjects.get(hovered);
      if (targetGroup) {
        gsap.to(this.controls.target, {
          x: targetGroup.position.x,
          y: targetGroup.position.y,
          z: targetGroup.position.z,
          duration: 1.5,
          ease: "power3.inOut"
        });
      }
    } else {
      this.store.selectNode(null);
    }
  }
```

- [ ] **Step 2: Commit**
```bash
git add src/app/shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component.ts
git commit -m "ui: implement raycaster hover and gsap camera focus in 3D graph"
```

---

### Task 6: Main Feature Component Shell

**Files:**
- Create: `src/app/features/knowledge-graph.ts`
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Implement Shell Component**
```typescript
// src/app/features/knowledge-graph.ts
import { Component, inject, OnInit } from '@angular/core';
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
           <p class="text-xs text-boreal-text-muted">{{ store.selectedNodeId() }} selected.</p>
           <button (click)="store.selectNode(null)" class="mt-8 text-xs text-boreal-blue border border-boreal-blue/30 px-3 py-1 rounded">Close</button>
        </div>
      }
    </div>
  `
})
export class KnowledgeGraph implements OnInit {
  store = inject(KnowledgeGraphStore);

  ngOnInit() {
    // Seed some mock data
    this.store.setNodes([
      { id: 'n1', label: 'Tactical Core', category: 'CORE', description: '', technicalSpecs: {inputs:[], outputs:[]}, connectedTo: [], x: 0, y: 0, z: 0 },
      { id: 'n2', label: 'COA Engine', category: 'DECISION', description: '', technicalSpecs: {inputs:[], outputs:[]}, connectedTo: [], x: 200, y: 100, z: -100 }
    ]);
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/features/knowledge-graph.ts
git commit -m "feat: add main knowledge graph feature shell and drawer"
```

- [ ] **Step 3: Update Routes (If not already present)**
```typescript
// Ensure src/app/app.routes.ts has:
// { path: 'knowledge-graph', loadComponent: () => import('./features/knowledge-graph').then(m => m.KnowledgeGraph) }
```
