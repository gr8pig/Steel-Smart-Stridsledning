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

class DataFlowSystem {
  private points: THREE.Points;
  private particleCount = 24; // More particles
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
      size: 48, // Larger particles
      map: texture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, material);

    for (let i = 0; i < this.particleCount; i++) {
      this.progress.push(Math.random());
      // Slow speeds for calmer, more subtle motion
      this.speeds.push(0.0008 + Math.random() * 0.0012);
    }

    scene.add(this.points);
  }

  update(opacityScale = 1.0) {
    (this.points.material as THREE.PointsMaterial).opacity = 0.95 * opacityScale;
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

interface EdgeInfo {
  sourceId: string;
  targetId: string;
  tube: THREE.Mesh;
  arrow: THREE.Mesh | null;
}

type NodeMaterialTier = 'full' | 'semi' | 'ghost';

@Component({
  selector: 'app-knowledge-graph-viewer',
  standalone: true,
  template: `<div #container class="w-full h-full relative outline-none bg-black" tabindex="0"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class KnowledgeGraphViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  
  nodeObjects = new Map<string, THREE.Group>();
  private nodeMaterialTiers = new Map<string, NodeMaterialTier>();
  private flowSystems = new Map<string, DataFlowSystem>();
  private edgeInfos: EdgeInfo[] = [];
  private spriteTexture!: THREE.Texture;
  private selectionRings: THREE.Mesh[] = [];
  private hoverRing: THREE.Mesh | null = null;
  private hoveredNodeId: string | null = null;
  private previousHoveredId: string | null = null;
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

  private matCore = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });
  private matDec = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9 });
  private matLog = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9 });
  private matInt = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.9 });
  private matGov = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.9 });
  private matDef = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.9 });
  
  // Ghost material for non-filtered nodes - dim wireframe
  private matGhostLine = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.15, wireframe: true });
  private matGhost = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.12, wireframe: true });
  private matSemi = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.4, wireframe: true });

  // Edge materials - thinner, more subtle like boreal scaffolding
  private edgeTubeMaterialActive = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 });
  private edgeTubeMaterialGhost = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.08 });
  private edgeTubeMaterialHover = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 });
  private arrowheadGeometry = new THREE.ConeGeometry(6, 12, 6);

  private edgesGroup: THREE.Group = new THREE.Group();

  constructor() {
    this.spriteTexture = this.createGlowTexture();
    effect(() => { 
      // Track all filter signals to ensure effect re-runs
      const categories = this.store.activeCategories();
      const areas = this.store.activeAreas();
      const query = this.store.searchQuery();
      const filtered = this.store.filteredNodes();
      const selected = this.store.selectedNodeId();
      const nodes = this.store.nodes();
      
      console.log('Effect triggered:', { 
        categoriesLength: categories.length, 
        areasLength: areas.length, 
        queryLength: query.length,
        filteredCount: filtered.length,
        selectedId: selected
      });
      
      if (this.scene) {
        this.buildNodes(nodes);
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
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.15, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(0.65, 'rgba(255,255,255,0.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
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
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 1.4, 0.5, 0.82);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pl = new THREE.PointLight(0x5ca7ff, 2.0, 8000);
    pl.position.set(1500, 1000, 1000);
    this.scene.add(pl);
    const pl2 = new THREE.PointLight(0xfbbf24, 0.8, 6000);
    pl2.position.set(-1000, 800, -500);
    this.scene.add(pl2);

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
      fs.update(isGhost ? 0.08 : 1.0);
    });
    
    const time = Date.now() * 0.001;
    this.nodeObjects.forEach((group, id) => {
       const mesh = group.children.find(c => c.userData['isNodeMesh']) as THREE.Mesh;
       if (mesh && id === this.hoveredNodeId && mesh.material instanceof THREE.MeshBasicMaterial) {
          // Pulse effect on hover
          mesh.material.opacity = 0.6 + Math.sin(time * 4) * 0.3;
       }
    });

    this.selectionRings.forEach(ring => {
      ring.rotation.z = time * 0.8;
      const scale = 1.0 + Math.sin(time * 3) * 0.06;
      ring.scale.set(scale, scale, scale);
    });

    if (this.hoverRing) {
      this.hoverRing.rotation.z = -time * 1.2;
      const hScale = 1.0 + Math.sin(time * 4) * 0.04;
      this.hoverRing.scale.set(hScale, hScale, hScale);
    }

    this.controls.update();
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }

  private applyHoverState(newHoveredId: string | null) {
    if (newHoveredId === this.previousHoveredId) return;

    if (this.previousHoveredId) {
      const prevGroup = this.nodeObjects.get(this.previousHoveredId);
      if (prevGroup) {
        gsap.to(prevGroup.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'power2.out' });
        const prevMesh = prevGroup.children.find(c => c.userData['isNodeMesh']) as THREE.Mesh;
        if (prevMesh && prevMesh.material instanceof THREE.MeshBasicMaterial) {
          const tier = this.nodeMaterialTiers.get(this.previousHoveredId);
          if (tier === 'ghost') {
            prevMesh.material = this.matGhost;
          } else if (tier === 'semi') {
            prevMesh.material = this.matSemi;
          } else {
            // Restore original material based on node category
            const nodeData = this.store.nodes().find(n => n.id === this.previousHoveredId);
            if (nodeData) {
              const mat = this.getActiveMaterialForCategory(nodeData.category, nodeData.dataClass);
              prevMesh.material = mat.clone();
            }
          }
        }
      }

      this.edgeInfos.forEach(info => {
        if (info.sourceId === this.previousHoveredId || info.targetId === this.previousHoveredId) {
          const selectedId = this.store.selectedNodeId();
          const neighbors = this.getNeighbors(this.store.nodes(), selectedId);
          const inNeighborhood = selectedId && (info.sourceId === selectedId || info.targetId === selectedId || (neighbors.has(info.sourceId) && neighbors.has(info.targetId)));
          if (inNeighborhood) {
            info.tube.material = this.edgeTubeMaterialActive;
          } else if (selectedId) {
            info.tube.material = this.edgeTubeMaterialGhost;
          } else {
            info.tube.material = this.edgeTubeMaterialActive;
          }
          if (info.arrow) {
            (info.arrow.material as THREE.MeshBasicMaterial).opacity = inNeighborhood || !selectedId ? 0.6 : 0.15;
            (info.arrow.material as THREE.MeshBasicMaterial).color.set(0x475569);
          }
        }
      });
    }

    if (newHoveredId) {
      const group = this.nodeObjects.get(newHoveredId);
      if (group) {
        gsap.to(group.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.25, ease: 'power2.out' });
        const mesh = group.children.find(c => c.userData['isNodeMesh']) as THREE.Mesh;
        const tier = this.nodeMaterialTiers.get(newHoveredId);
        if (mesh && tier !== 'full') {
          // Brighten the node on hover
          const nodeData = this.store.nodes().find(n => n.id === newHoveredId);
          const catMat = this.getActiveMaterialForCategory(nodeData?.category ?? '', nodeData?.dataClass);
          if (catMat instanceof THREE.MeshBasicMaterial) {
            const newMat = catMat.clone();
            newMat.opacity = 1.0;
            mesh.material = newMat;
          }
        }
      }

      this.edgeInfos.forEach(info => {
        if (info.sourceId === newHoveredId || info.targetId === newHoveredId) {
          info.tube.material = this.edgeTubeMaterialHover;
          if (info.arrow) {
            (info.arrow.material as THREE.MeshBasicMaterial).opacity = 1.0;
            (info.arrow.material as THREE.MeshBasicMaterial).color.set(0xfbbf24);
          }
        }
      });
    }

    this.previousHoveredId = newHoveredId;
  }

  private getNeighbors(allNodes: TechNode[], selectedId: string | null): Set<string> {
    const neighbors = new Set<string>();
    if (!selectedId) return neighbors;
    const selected = allNodes.find(n => n.id === selectedId);
    if (selected) {
      neighbors.add(selectedId);
      selected.connectedTo.forEach(id => neighbors.add(id));
      allNodes.forEach(n => { if (n.connectedTo.includes(selectedId)) neighbors.add(n.id); });
    }
    return neighbors;
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

    this.renderer.domElement.style.cursor = hoveredId ? 'pointer' : 'default';

    if (hoveredId !== this.hoveredNodeId) {
      if (this.hoverRing) {
        this.hoverRing.parent?.remove(this.hoverRing);
        this.hoverRing.geometry.dispose();
        (this.hoverRing.material as THREE.Material).dispose();
        this.hoverRing = null;
      }
      if (hoveredId && hoveredId !== this.store.selectedNodeId()) {
        const group = this.nodeObjects.get(hoveredId);
        if (group) {
          const ringGeo = new THREE.RingGeometry(48, 52, 32);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2;
          group.add(ring);
          this.hoverRing = ring;
        }
      }
      this.hoveredNodeId = hoveredId;
      this.applyHoverState(hoveredId);
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
      this.controls.autoRotate = true;
      this.store.selectNode(null);
    }
  }

  buildNodes(allNodes: TechNode[]) {
    // IMPORTANT: Check store's active filters directly, not derived set sizes
    const activeCategories = this.store.activeCategories();
    const activeAreas = this.store.activeAreas();
    const searchQuery = this.store.searchQuery();
    const hasActiveFilters = activeCategories.length > 0 || activeAreas.length > 0 || searchQuery.length > 0;

    console.log('buildNodes called:', { 
      hasActiveFilters, 
      activeCategories, 
      activeAreas, 
      searchQuery,
      totalNodes: allNodes.length 
    });

    const filteredIds = new Set(this.store.filteredNodes().map(n => n.id));
    console.log('filteredIds:', filteredIds.size, Array.from(filteredIds).slice(0, 5));
    
    const selectedId = this.store.selectedNodeId();
    const neighbors = this.getNeighbors(allNodes, selectedId);

    this.nodeObjects.forEach(group => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
        if (child instanceof CSS2DObject) child.element.remove();
      });
      this.scene.remove(group);
    });
    this.nodeObjects.clear();
    this.nodeMaterialTiers.clear();
    this.flowSystems.forEach(fs => fs.dispose(this.scene));
    this.flowSystems.clear();
    this.selectionRings = [];
    this.edgeInfos = [];
    while (this.edgesGroup.children.length > 0) {
      const child = this.edgesGroup.children[0];
      if (child instanceof THREE.Mesh) child.geometry.dispose();
      if (child instanceof THREE.Line) child.geometry.dispose();
      this.edgesGroup.remove(child);
    }

    const posMap = new Map<string, THREE.Vector3>();

    allNodes.forEach(node => {
      const group = new THREE.Group();
      const pos = new THREE.Vector3(node.x * 2.5 - 1600, node.y * 1.8 - 900, node.z * 12);
      group.position.copy(pos);
      group.userData = { id: node.id };
      posMap.set(node.id, pos);

      // Determine visibility based on filters
      const passesFilters = !hasActiveFilters || filteredIds.has(node.id);
      
      // Determine selection state
      const isSelected = node.id === selectedId;
      const isDirectNeighbor = selectedId && neighbors.has(node.id) && node.id !== selectedId;
      const isInSelectionNeighborhood = isSelected || isDirectNeighbor;
      
      // Skip nodes that don't pass filters
      if (!passesFilters) return;

      let material: THREE.MeshBasicMaterial;
      let tier: NodeMaterialTier;
      let isDimmed = false;

      if (selectedId) {
        // When a node is selected: highlight neighborhood, dim others
        if (isInSelectionNeighborhood) {
          material = this.getActiveMaterialForCategory(node.category, node.dataClass);
          tier = 'full';
        } else {
          // Other nodes that pass filters but aren't in selection neighborhood - dim them
          material = this.getActiveMaterialForCategory(node.category, node.dataClass);
          tier = 'full';
          isDimmed = true;
        }
      } else {
        // No selection - show all filtered nodes normally
        material = this.getActiveMaterialForCategory(node.category, node.dataClass);
        tier = 'full';
      }

      // Create wireframe-style node using Mesh with wireframe material
      // LineSegments creates 1px lines that are hard to see; Mesh wireframe is thicker
      let mesh: THREE.Mesh;
      const dClass = node.dataClass;
      const cat = node.category;

      // Helper to create wireframe mesh (thicker lines than LineSegments)
      const createWireframeBox = (size: number, mat: THREE.MeshBasicMaterial, innerRatio = 0.35) => {
        const geo = new THREE.BoxGeometry(size, size, size);
        const line = new THREE.Mesh(geo, mat.clone());
        line.material.wireframe = true;
        
        // Add inner box for "nested" look (like boreal scaffolding)
        const innerGeo = new THREE.BoxGeometry(size * innerRatio, size * innerRatio, size * innerRatio);
        const innerMat = mat.clone();
        innerMat.opacity = (mat.opacity || 0.9) * 0.4;
        innerMat.wireframe = true;
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        line.add(innerMesh);
        
        return line;
      };

      // Helper to create center dot mesh
      const createCenterDot = (size: number, color: number, parentOpacity: number) => {
        const dotGeo = new THREE.SphereGeometry(size, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ 
          color,
          transparent: true, 
          opacity: parentOpacity * 0.8 
        });
        return new THREE.Mesh(dotGeo, dotMat);
      };

      // Base sizes for wireframe meshes
      if (dClass === 'SystemModel' || cat === 'CORE') {
        // Nested box wireframe
        const mat = material instanceof THREE.MeshBasicMaterial ? material : new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9, wireframe: true });
        mesh = createWireframeBox(20, mat, 0.35);
      } else if (dClass === 'PolicyTwin' || cat === 'DECISION') {
        // Diamond shape - rotated box with center dot
        const size = 16;
        const mat = material instanceof THREE.MeshBasicMaterial ? material : new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9, wireframe: true });
        const geo = new THREE.BoxGeometry(size, size, size);
        mesh = new THREE.Mesh(geo, mat.clone());
        (mesh.material as THREE.MeshBasicMaterial).wireframe = true;
        mesh.rotation.z = Math.PI / 4;
        // Add center dot
        const dot = createCenterDot(2.5, mat.color.getHex(), mat.opacity);
        mesh.add(dot);
      } else if (dClass === 'SupplyNode' || cat === 'LOGISTICS') {
        // Triangle cone wireframe
        const mat = material instanceof THREE.MeshBasicMaterial ? material : new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9, wireframe: true });
        const geo = new THREE.ConeGeometry(14, 24, 3);
        mesh = new THREE.Mesh(geo, mat.clone());
        (mesh.material as THREE.MeshBasicMaterial).wireframe = true;
      } else if (dClass === 'ThreatTwin' || cat === 'INTELLIGENCE') {
        // Icosahedron wireframe
        const mat = material instanceof THREE.MeshBasicMaterial ? material : new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.9, wireframe: true });
        const geo = new THREE.IcosahedronGeometry(16, 0);
        mesh = new THREE.Mesh(geo, mat.clone());
        (mesh.material as THREE.MeshBasicMaterial).wireframe = true;
      } else if (dClass === 'Document' || cat === 'GOVERNANCE') {
        // Dodecahedron wireframe
        const mat = material instanceof THREE.MeshBasicMaterial ? material : new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.9, wireframe: true });
        const geo = new THREE.DodecahedronGeometry(14, 0);
        mesh = new THREE.Mesh(geo, mat.clone());
        (mesh.material as THREE.MeshBasicMaterial).wireframe = true;
      } else {
        // Default sphere wireframe
        const mat = material instanceof THREE.MeshBasicMaterial ? material : new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.9, wireframe: true });
        const geo = new THREE.SphereGeometry(14, 8, 6);
        mesh = new THREE.Mesh(geo, mat.clone());
        (mesh.material as THREE.MeshBasicMaterial).wireframe = true;
      }

      mesh.userData = { isNodeMesh: true };
      group.add(mesh);

      // Add dark overlay for dimmed nodes (85% darker)
      if (isDimmed) {
        const dimOverlay = new THREE.Mesh(
          new THREE.SphereGeometry(25, 16, 16),
          new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            transparent: true, 
            opacity: 0.85,
            depthWrite: false,
          })
        );
        dimOverlay.userData = { isDimOverlay: true };
        group.add(dimOverlay);
      }

      // Only show selection ring if node is actually visible
      if (isSelected) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(28, 32, 32), new THREE.MeshBasicMaterial({ color: 0x5ca7ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        this.selectionRings.push(ring);
      }

      const div = document.createElement('div');
      div.className = 'text-[11px] font-black font-mono text-white tracking-[0.2em] uppercase pointer-events-none drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] transition-opacity duration-500';

      // Label opacity: selection neighborhood gets priority
      if (isInSelectionNeighborhood) {
        if (isSelected) {
          div.style.opacity = '1.0';
        } else {
          div.style.opacity = '0.8';
        }
      } else if (isDimmed) {
        // Dimmed nodes get lower opacity labels
        div.style.opacity = '0.4';
      } else {
        // Passes filters, no selection active
        div.style.opacity = '0.85';
      }

      div.textContent = node.label;
      const label = new CSS2DObject(div);
      label.position.set(0, 35, 0);
      group.add(label);

      this.scene.add(group);
      this.nodeObjects.set(node.id, group);
      this.nodeMaterialTiers.set(node.id, tier);
    });

    allNodes.forEach(node => {
      const start = posMap.get(node.id);
      if (!start) return;
      const targetIds = new Set(node.connectedTo || []);
      if (node.flows) node.flows.forEach(f => targetIds.add(f.target));

      targetIds.forEach(tId => {
        const end = posMap.get(tId);
        if (!end) return;

        // Determine if this edge touches the selected node or connects two neighbors
        const sourceIsSelected = node.id === selectedId;
        const targetIsSelected = tId === selectedId;
        const touchesSelected = selectedId && (sourceIsSelected || targetIsSelected);
        const bothAreNeighbors = selectedId && neighbors.has(node.id) && neighbors.has(tId);

        let isVisible: boolean;
        let isActive: boolean;

        if (selectedId) {
          // With selection: only show edges connected to selected node or between its neighbors
          isVisible = !!(touchesSelected || bothAreNeighbors);
          isActive = !!touchesSelected;
        } else {
          // No selection: show edges where both nodes pass filters
          const sourcePasses = !hasActiveFilters || filteredIds.has(node.id);
          const targetPasses = !hasActiveFilters || filteredIds.has(tId);
          isVisible = sourcePasses && targetPasses;
          isActive = true;
        }

        if (!isVisible) return;

        if (isActive) {
          // Active edge - thin glowing line
          const curve = new THREE.LineCurve3(start, end);
          const tubeGeo = new THREE.TubeGeometry(curve, 1, 1.5, 6, false);
          const tube = new THREE.Mesh(tubeGeo, this.edgeTubeMaterialActive);
          this.edgesGroup.add(tube);

          // Arrowhead
          const arrow = new THREE.Mesh(this.arrowheadGeometry, new THREE.MeshBasicMaterial({ color: 0x5ca7ff, transparent: true, opacity: 0.8 }));
          arrow.position.copy(end);
          arrow.lookAt(start);
          arrow.rotateX(Math.PI / 2);
          const dir = new THREE.Vector3().subVectors(start, end).normalize();
          arrow.position.add(dir.multiplyScalar(28));
          this.edgesGroup.add(arrow);

          const flow = node.flows?.find(f => f.target === tId);
          const key = `${node.id}_${tId}`;
          this.flowSystems.set(key, new DataFlowSystem(this.scene, start, end, this.getFlowColor(flow?.type), this.spriteTexture));

          this.edgeInfos.push({ sourceId: node.id, targetId: tId, tube, arrow });
        } else {
          // Ghost edge - very thin, low opacity
          const curve = new THREE.LineCurve3(start, end);
          const tubeGeo = new THREE.TubeGeometry(curve, 1, 0.8, 4, false);
          const tube = new THREE.Mesh(tubeGeo, this.edgeTubeMaterialGhost);
          this.edgesGroup.add(tube);

          const key = `${node.id}_${tId}_ghost`;
          this.flowSystems.set(key, new DataFlowSystem(this.scene, start, end, 0x1e293b, this.spriteTexture));

          this.edgeInfos.push({ sourceId: node.id, targetId: tId, tube, arrow: null });
        }
      });
    });
  }

  private getActiveMaterialForCategory(cat: string, dClass?: string): THREE.MeshBasicMaterial {
    const color = this.getCategoryColor(cat, dClass);
    // Wireframe style using MeshBasicMaterial (thicker than LineBasicMaterial)
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      wireframe: true,
    });
  }

  private getSemiMaterialForCategory(cat: string, dClass?: string): THREE.MeshBasicMaterial {
    const color = this.getCategoryColor(cat, dClass);
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      wireframe: true,
    });
  }

  private getCategoryColor(cat: string, dClass?: string): number {
    if (dClass === 'SystemModel' || cat === 'CORE') return 0xfbbf24; // amber-400
    if (dClass === 'PolicyTwin' || cat === 'DECISION') return 0x60a5fa; // blue-400
    if (dClass === 'SupplyNode' || cat === 'LOGISTICS') return 0x4ade80; // green-400
    if (dClass === 'ThreatTwin' || cat === 'INTELLIGENCE') return 0xf87171; // red-400
    if (dClass === 'Document' || cat === 'GOVERNANCE') return 0xa78bfa; // purple-400
    return 0x94a3b8; // slate-400
  }

  private getMaterialForCategory(cat: string, dClass?: string): THREE.MeshBasicMaterial {
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
      case 'MATERIAL': return 0x4ade80;
      case 'LOGICAL': return 0x94a3b8;
      case 'DOCTRINAL': return 0xa78bfa;
      default: return 0x334155;
    }
  }
}
