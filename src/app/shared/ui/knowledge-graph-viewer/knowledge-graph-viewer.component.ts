import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { TechNode } from '../../../core/models/knowledge-graph.types';
import { KnowledgeGraphStore } from '../../../core/state/knowledge-graph.store';
import gsap from 'gsap';

/**
 * Manages directional data flow sprites.
 * Strictly grounded in the ontology flows.
 */
class DataFlowSystem {
  private points: THREE.Points;
  private particleCount = 25;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private progress: number[] = [];
  private speeds: number[] = [];
  private curve: THREE.LineCurve3;

  constructor(
    scene: THREE.Scene,
    source: THREE.Vector3,
    target: THREE.Vector3,
    color: number,
    texture: THREE.Texture
  ) {
    this.curve = new THREE.LineCurve3(source, target);
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 12,
      map: texture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, material);

    for (let i = 0; i < this.particleCount; i++) {
      this.progress.push(Math.random());
      this.speeds.push(0.003 + Math.random() * 0.005);
    }

    scene.add(this.points);
  }

  update(opacityScale = 1.0) {
    (this.points.material as THREE.PointsMaterial).opacity = 0.9 * opacityScale;
    for (let i = 0; i < this.particleCount; i++) {
      this.progress[i] += this.speeds[i];
      if (this.progress[i] > 1) this.progress[i] = 0;

      const pos = this.curve.getPoint(this.progress[i]);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
    }
    this.geometry.attributes['position'].needsUpdate = true;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.points);
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

@Component({
  selector: 'app-knowledge-graph-viewer',
  standalone: true,
  // ── DESIGN LOCK: Immersive 3D Spectral Renderer ──────────────────────────
  // GROUNDED IN: boreal-info-arch scaffolding.
  // RELATIONAL FADING & DIRECTIONAL SPRITES ENABLED.
  // ──────────────────────────────────────────────────────────────────────────
  template: `<div #container class="w-full h-full relative outline-none bg-black" tabindex="0"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class KnowledgeGraphViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  
  nodeObjects = new Map<string, THREE.Group>();
  private flowSystems = new Map<string, DataFlowSystem>();
  private spriteTexture!: THREE.Texture;
  store = inject(KnowledgeGraphStore);

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  labelRenderer!: CSS2DRenderer;
  composer!: EffectComposer;
  controls!: OrbitControls;
  animationFrameId = 0;
  resizeObserver!: ResizeObserver;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Primary Materials
  private matCore = new THREE.MeshStandardMaterial({ color: 0x5ca7ff, emissive: 0x5ca7ff, emissiveIntensity: 0.8 });
  private matDec = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 1.2 });
  private matLog = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.0 });
  private matInt = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 1.0 });
  private matGov = new THREE.MeshStandardMaterial({ color: 0x64748b, emissive: 0x64748b, emissiveIntensity: 0.6 });
  private matDef = new THREE.MeshStandardMaterial({ color: 0x9ab0c8, emissive: 0x9ab0c8, emissiveIntensity: 0.4 });
  
  // Ghost Materials
  private matGhost = new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: 0.1, wireframe: true });
  private matSemi = new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: 0.35 });

  private edgeMaterialActive = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.8, linewidth: 2 });
  private edgeMaterialGhost = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.2 });
  private arrowheadGeometry = new THREE.ConeGeometry(4, 10, 8); // Slightly larger arrowheads

  private edgesGroup: THREE.Group = new THREE.Group();

  constructor() {
    this.spriteTexture = this.createGlowTexture();
    effect(() => { 
      if (this.scene) {
        const nodes = this.store.filteredNodes(); // Reacts to filter changes
        this.store.selectedNodeId();
        this.buildNodes(nodes); // Pass filtered nodes
      }
    });
  }

  ngAfterViewInit() {
    try {
      this.initScene();
      this.startAnimationLoop();
      this.setupResizeObserver();
    } catch (e) {
      console.warn('Skipping WebGL init (expected in test env)', e);
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.composer?.dispose();
    this.spriteTexture?.dispose();
    if (this.labelRenderer && this.labelRenderer.domElement) {
      this.labelRenderer.domElement.remove();
    }
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  initScene() {
    const el = this.containerRef.nativeElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010204);
    this.scene.add(this.edgesGroup);

    this.camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 1, 20000);
    this.camera.position.set(1600, 1200, 2800);

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
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.25;

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 1.8, 0.4, 0.85);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const pl = new THREE.PointLight(0x5ca7ff, 1.5, 6000);
    pl.position.set(1500, 1000, 1000);
    this.scene.add(pl);

    const grid = new THREE.GridHelper(6000, 60, 0x1e293b, 0x0f172a);
    grid.position.y = -1000;
    grid.material.opacity = 0.1;
    grid.material.transparent = true;
    this.scene.add(grid);

    this.renderer.domElement.addEventListener('pointermove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    this.buildNodes(this.store.nodes());
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
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

  startAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.startAnimationLoop);
    this.flowSystems.forEach((fs, key) => {
      const isGhost = key.includes('_ghost');
      fs.update(isGhost ? 0.1 : 1.0);
    });
    
    const time = Date.now() * 0.001;
    this.nodeObjects.forEach(group => {
       const mesh = group.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
       if (mesh && mesh.material instanceof THREE.MeshStandardMaterial && mesh.material.opacity > 0.5) {
          mesh.material.emissiveIntensity = 0.8 + Math.sin(time * 2) * 0.4;
       }
    });

    this.controls.update();
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }

  onMouseMove(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    let hoveredId: string | null = null;
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !obj.userData['id']) obj = obj.parent;
      if (obj) { hoveredId = obj.userData['id']; break; }
    }
    this.store.hoverNode(hoveredId);
  }

  onClick() {
    const hovered = this.store.hoveredNodeId();
    if (hovered) {
      this.store.selectNode(hovered);
      const targetGroup = this.nodeObjects.get(hovered);
      if (targetGroup) {
        this.controls.autoRotate = false;
        gsap.to(this.controls.target, { x: targetGroup.position.x, y: targetGroup.position.y, z: targetGroup.position.z, duration: 1.2, ease: "power3.out" });
        gsap.to(this.camera.position, { x: targetGroup.position.x + 400, y: targetGroup.position.y + 300, z: targetGroup.position.z + 500, duration: 1.2, ease: "power3.out" });
      }
    } else {
      this.store.selectNode(null);
    }
  }

  buildNodes(allNodes: TechNode[]) {
    const filteredIds = new Set(this.store.filteredNodes().map(n => n.id));
    const selectedId = this.store.selectedNodeId();
    
    // Neighborhood logic: selected + its direct connections
    const neighbors = new Set<string>();
    if (selectedId) {
      const selected = allNodes.find(n => n.id === selectedId);
      if (selected) {
        neighbors.add(selectedId);
        selected.connectedTo.forEach(id => neighbors.add(id));
        allNodes.forEach(n => { if (n.connectedTo.includes(selectedId)) neighbors.add(n.id); });
      }
    }

    // Cleanup
    this.nodeObjects.forEach(group => {
      group.traverse((child) => { if (child instanceof THREE.Mesh) child.geometry.dispose(); if (child instanceof CSS2DObject) child.element.remove(); });
      this.scene.remove(group);
    });
    this.nodeObjects.clear();
    this.flowSystems.forEach(fs => fs.dispose(this.scene));
    this.flowSystems.clear();
    while (this.edgesGroup.children.length > 0) {
      const child = this.edgesGroup.children[0];
      if (child instanceof THREE.Mesh) child.geometry.dispose();
      this.edgesGroup.remove(child);
    }

    const posMap = new Map<string, THREE.Vector3>();

    allNodes.forEach(node => {
      const group = new THREE.Group();
      const pos = new THREE.Vector3(node.x * 2.5 - 1600, node.y * 1.8 - 900, node.z * 12);
      group.position.copy(pos);
      group.userData = { id: node.id };
      posMap.set(node.id, pos);

      const isActive = filteredIds.has(node.id);
      const isNeighbor = neighbors.has(node.id);
      const isSelected = node.id === selectedId;

      let material: THREE.MeshStandardMaterial;
      if (isSelected || (isActive && (!selectedId || isNeighbor))) {
        material = this.getMaterialForCategory(node.category, node.dataClass);
      } else if (isNeighbor || isActive) {
        material = this.matSemi;
      } else {
        material = this.matGhost;
      }

      let mesh: THREE.Mesh;
      const dClass = node.dataClass;
      if (dClass === 'SystemModel' || node.category === 'CORE') mesh = new THREE.Mesh(new THREE.BoxGeometry(36, 36, 36), material);
      else if (dClass === 'PolicyTwin' || node.category === 'DECISION') mesh = new THREE.Mesh(new THREE.OctahedronGeometry(28), material);
      else if (dClass === 'SupplyNode' || node.category === 'LOGISTICS') mesh = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 16, 32), material);
      else if (dClass === 'ThreatTwin' || node.category === 'INTELLIGENCE') mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(28), material);
      else if (dClass === 'Document') mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(22), material);
      else if (node.category === 'GOVERNANCE') mesh = new THREE.Mesh(new THREE.TorusGeometry(18, 9, 16, 100), material);
      else mesh = new THREE.Mesh(new THREE.SphereGeometry(18), material);
      
      group.add(mesh);

      if (isSelected) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(45, 47, 32), new THREE.MeshBasicMaterial({ color: 0x5ca7ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }

      const div = document.createElement('div');
      div.className = 'text-[11px] font-black font-mono text-white tracking-[0.25em] uppercase pointer-events-none drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-opacity duration-700';
      div.style.opacity = (isSelected || (isActive && isNeighbor)) ? '1.0' : (isActive || isNeighbor) ? '0.4' : '0.1';
      div.textContent = node.label;
      const label = new CSS2DObject(div);
      label.position.set(0, 55, 0);
      group.add(label);

      this.scene.add(group);
      this.nodeObjects.set(node.id, group);
    });

    // Edges & Flows from Ontology
    allNodes.forEach(node => {
      const start = posMap.get(node.id);
      if (!start) return;
      const targetIds = new Set(node.connectedTo || []);
      if (node.flows) node.flows.forEach(f => targetIds.add(f.target));

      targetIds.forEach(tId => {
        const end = posMap.get(tId);
        if (end) {
          const isSelectedPath = node.id === selectedId || tId === selectedId;
          const isActivePath = filteredIds.has(node.id) && filteredIds.has(tId);
          const isGhostPath = !isActivePath && !isSelectedPath;

          const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
          const line = new THREE.Line(geometry, isGhostPath ? this.edgeMaterialGhost : this.edgeMaterialActive);
          this.edgesGroup.add(line);

          if (!isGhostPath) {
             const arrow = new THREE.Mesh(this.arrowheadGeometry, new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.3 }));
             arrow.position.copy(end);
             arrow.lookAt(start);
             arrow.rotateX(Math.PI / 2);
             const dir = new THREE.Vector3().subVectors(start, end).normalize();
             arrow.position.add(dir.multiplyScalar(45));
             this.edgesGroup.add(arrow);

             const flow = node.flows?.find(f => f.target === tId);
             const key = `${node.id}_${tId}`;
             this.flowSystems.set(key, new DataFlowSystem(this.scene, start, end, this.getFlowColor(flow?.type), this.spriteTexture));
          } else if (isNeighborPath(node.id, tId, selectedId, neighbors)) {
             // Optional: semi-visible flows for ghosts? User said "faded nodes... edges between them"
             const key = `${node.id}_${tId}_ghost`;
             this.flowSystems.set(key, new DataFlowSystem(this.scene, start, end, 0x1e293b, this.spriteTexture));
          }
        }
      });
    });
  }

  private getMaterialForCategory(cat: string, dClass?: string): THREE.MeshStandardMaterial {
    if (dClass === 'SystemModel' || cat === 'CORE') return this.matCore;
    if (dClass === 'PolicyTwin' || cat === 'DECISION') return this.matDec;
    if (dClass === 'SupplyNode' || cat === 'LOGISTICS') return this.matLog;
    if (dClass === 'ThreatTwin' || cat === 'INTELLIGENCE') return this.matInt;
    if (dClass === 'Document' || cat === 'GOVERNANCE') return this.matGov;
    return this.matDef;
  }

  private getFlowColor(type?: string): number {
    switch (type) {
      case 'DATA': return 0x38bdf8;
      case 'CONTROL': return 0xfbbf24;
      case 'MATERIAL': return 0x10b981;
      case 'LOGICAL': return 0x94a3b8;
      case 'DOCTRINAL': return 0xa855f7;
      default: return 0x334155;
    }
  }
}

function isNeighborPath(s: string, t: string, sel: string | null, neighbors: Set<string>): boolean {
    if (!sel) return false;
    return (neighbors.has(s) && neighbors.has(t)) || (s === sel || t === sel);
}
