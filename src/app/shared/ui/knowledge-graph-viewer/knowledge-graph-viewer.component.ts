import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, input, effect } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { TechNode, GraphEdge } from '../../../core/models/knowledge-graph.types';
import { KnowledgeGraphStore } from '../../../core/state/knowledge-graph.store';
import gsap from 'gsap';

/**
 * Manages the directional flow of data sprites between nodes.
 * Uses THREE.Points with a procedural glow texture for high-performance 'cyber' feel.
 */
class DataFlowSystem {
  private points: THREE.Points;
  private particleCount: number = 30;
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
    // Add subtle randomized offset to prevent overlap of multiple flows between same nodes
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    const start = source.clone().add(offset);
    const end = target.clone().add(offset);

    this.curve = new THREE.LineCurve3(start, end);
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 5,
      map: texture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, material);

    for (let i = 0; i < this.particleCount; i++) {
      this.progress.push(Math.random());
      this.speeds.push(0.001 + Math.random() * 0.003);
    }

    scene.add(this.points);
  }

  update() {
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
  // ── DESIGN LOCK: WebGL 3D Knowledge Graph Core ─────────────────────────────
  // GROUNDED IN: boreal-info-arch scaffolding.
  // ──────────────────────────────────────────────────────────────────────────────
  template: `<div #container class="w-full h-full relative outline-none" tabindex="0"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class KnowledgeGraphViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  
  nodeObjects = new Map<string, THREE.Group>();
  private flowSystems: DataFlowSystem[] = [];
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

  // Shared Materials
  private matCore = new THREE.MeshStandardMaterial({ color: 0x5ca7ff, emissive: 0x5ca7ff, emissiveIntensity: 0.8 });
  private matDec = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 1.2 });
  private matLog = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.0 });
  private matInt = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 1.0 });
  private matGov = new THREE.MeshStandardMaterial({ color: 0x64748b, emissive: 0x64748b, emissiveIntensity: 0.6 });
  private matDef = new THREE.MeshStandardMaterial({ color: 0x9ab0c8, emissive: 0x9ab0c8, emissiveIntensity: 0.4 });
  private edgeMaterial = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.15 });

  private edgesGroup: THREE.Group = new THREE.Group();

  constructor() {
    this.spriteTexture = this.createGlowTexture();
    effect(() => { 
      if (this.scene) {
        this.buildNodes(this.store.filteredNodes()); 
      }
    });
  }

  ngAfterViewInit() {
    this.initScene();
    this.startAnimationLoop();
    this.setupResizeObserver();
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
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
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

    // Deep volumetric perspective
    this.camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 1, 20000);
    this.camera.position.set(1500, 1200, 2500);

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
    this.controls.autoRotateSpeed = 0.4;

    // Post-processing: Heavy Bloom for 'Steel' look
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 2.2, 0.6, 0.85);
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pl = new THREE.PointLight(0x5ca7ff, 2, 5000);
    pl.position.set(1000, 1000, 1000);
    this.scene.add(pl);

    // Grid for spatial grounding
    const grid = new THREE.GridHelper(5000, 50, 0x1e293b, 0x0f172a);
    grid.position.y = -800;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    this.scene.add(grid);

    this.renderer.domElement.addEventListener('pointermove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    this.buildNodes(this.store.filteredNodes());
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
    this.flowSystems.forEach(fs => fs.update());
    
    // Pulse node intensities
    const time = Date.now() * 0.001;
    this.nodeObjects.forEach(group => {
       const mesh = group.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
       if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.emissiveIntensity = 0.8 + Math.sin(time * 2.5) * 0.5;
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
      if (obj) {
        hoveredId = obj.userData['id'];
        break;
      }
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
        gsap.to(this.controls.target, {
          x: targetGroup.position.x,
          y: targetGroup.position.y,
          z: targetGroup.position.z,
          duration: 1.5,
          ease: "expo.out"
        });
        gsap.to(this.camera.position, {
           x: targetGroup.position.x + 400,
           y: targetGroup.position.y + 300,
           z: targetGroup.position.z + 500,
           duration: 1.5,
           ease: "expo.out"
        });
      }
    } else {
      this.store.selectNode(null);
    }
  }

  buildNodes(nodes: TechNode[]) {
    this.nodeObjects.forEach(group => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
        if (child instanceof CSS2DObject) child.element.remove();
      });
      this.scene.remove(group);
    });
    this.nodeObjects.clear();

    this.flowSystems.forEach(fs => fs.dispose(this.scene));
    this.flowSystems = [];

    while (this.edgesGroup.children.length > 0) {
      const child = this.edgesGroup.children[0] as THREE.Line;
      child.geometry.dispose();
      this.edgesGroup.remove(child);
    }

    // Node placement logic
    const nodePositionMap = new Map<string, THREE.Vector3>();

    nodes.forEach(node => {
      const group = new THREE.Group();
      // Immersive scaling: Spread nodes significantly in 3D volume
      const scaleX = node.x * 2.2 - 1400;
      const scaleY = node.y * 1.8 - 900;
      const scaleZ = node.z * 10; // High Z-weight for depth
      const position = new THREE.Vector3(scaleX, scaleY, scaleZ);
      group.position.copy(position);
      group.userData = { id: node.id };
      nodePositionMap.set(node.id, position);

      let mesh: THREE.Mesh;
      const dClass = node.dataClass;

      if (dClass === 'SystemModel' || node.category === 'CORE') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(36, 36, 36), this.matCore);
      } else if (dClass === 'PolicyTwin' || node.category === 'DECISION') {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(28), this.matDec);
      } else if (dClass === 'SupplyNode' || node.category === 'LOGISTICS') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 18, 32), this.matLog);
      } else if (dClass === 'ThreatTwin' || node.category === 'INTELLIGENCE') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(28), this.matInt);
      } else if (dClass === 'Document') {
        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(22), this.matGov);
      } else if (node.category === 'GOVERNANCE') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(18, 9, 16, 100), this.matGov);
      } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(18), this.matDef);
      }
      group.add(mesh);

      const div = document.createElement('div');
      div.className = 'text-[11px] font-black font-mono text-white tracking-[0.3em] uppercase pointer-events-none drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]';
      div.textContent = node.label;
      const label = new CSS2DObject(div);
      label.position.set(0, 50, 0);
      group.add(label);

      this.scene.add(group);
      this.nodeObjects.set(node.id, group);
    });

    // Build Edges and Flow Systems using both flows and connectedTo
    nodes.forEach(node => {
      const start = nodePositionMap.get(node.id);
      if (!start) return;

      const connectionIds = new Set<string>(node.connectedTo || []);
      if (node.flows) {
          node.flows.forEach(f => connectionIds.add(f.target));
      }

      connectionIds.forEach(targetId => {
          const end = nodePositionMap.get(targetId);
          if (end) {
            const points = [start, end];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, this.edgeMaterial);
            this.edgesGroup.add(line);

            // Determine flow type/color
            let flowType = 'DATA';
            if (node.flows) {
                const flow = node.flows.find(f => f.target === targetId);
                if (flow) flowType = flow.type;
            }

            const flowColor = this.getFlowColor(flowType);
            this.flowSystems.push(new DataFlowSystem(this.scene, start, end, flowColor, this.spriteTexture));
          }
      });
    });
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
