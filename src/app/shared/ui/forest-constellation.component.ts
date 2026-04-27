import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  effect,
  signal,
  computed,
  NgZone,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ForestStore, ModelKey } from '../../core/state/forest.store';
import { ForestNode, ForestStructure, TrainingSample, DecisionPathNode } from '../../core/ml/forest.models';

interface TreeNode3D {
  nodeId: number;
  x: number;
  y: number;
  z: number;
  depth: number;
  isLeaf: boolean;
  feature: string | null;
  threshold: number | null;
  value: number;
  nSamples: number;
}

interface TreeLayout3D {
  treeIndex: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  nodes: TreeNode3D[];
  edges: [number, number][];
}

const MODEL_COLORS: Record<ModelKey, number> = {
  robustness: 0x3b82f6,
  failure: 0xef4444,
  intent: 0xf59e0b,
};

@Component({
  selector: 'app-forest-constellation',
  standalone: true,
  imports: [CommonModule],
  template: `<div #container class="w-full h-full relative outline-none bg-black" tabindex="0"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
  `],
})
export class ForestConstellationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private store = inject(ForestStore);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private animationFrameId = 0;
  private resizeObserver!: ResizeObserver;
  private disposed = false;

  private treeGroup = new THREE.Group();
  private particleGroup = new THREE.Group();
  private laserGroup = new THREE.Group();

  private nodeMeshMap = new Map<string, THREE.InstancedMesh>();
  private edgeLineMap = new Map<string, THREE.LineSegments>();
  private layouts3D = new Map<string, TreeLayout3D>();

  private particleSystem: THREE.Points | null = null;
  private laserLines: THREE.Line[] = [];
  private laserProgress = signal(0);
  private laserAnimating = false;
  private clock = new THREE.Clock();

  activeModel = this.store.selectedModel;
  selectedTreeIndex = this.store.selectedTreeIndex;
  laserActive = this.store.laserActive;

  totalNodes = computed(() => {
    const s = this.store.structure();
    if (!s) return 0;
    let total = 0;
    for (const key of ['robustness', 'failure', 'intent'] as ModelKey[]) {
      total += s[key].trees.reduce((sum, t) => sum + t.nodeCount, 0);
    }
    return total;
  });

  constructor() {
    effect(() => {
      const structure = this.store.structure();
      const samples = this.store.samples();
      const model = this.activeModel();
      if (structure && this.scene) {
        this.zone.runOutsideAngular(() => this.buildForest(structure, model));
      }
      if (samples && this.scene && !this.particleSystem) {
        this.zone.runOutsideAngular(() => this.buildParticles(samples.samples));
      }
    });

    effect(() => {
      const path = this.store.activeDecisionPath();
      if (path && path.length > 0 && this.scene) {
        this.zone.runOutsideAngular(() => this.animateLaser(path));
      }
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.initScene();
      this.startAnimationLoop();
      this.setupResizeObserver();
      this.store.loadStructure();
      this.store.loadSamples(5000);
    } catch (e) {
      console.warn('Skipping WebGL init (expected in test env)', e);
    }
  }

  ngOnDestroy() {
    this.disposed = true;
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.composer?.dispose();
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }

  private initScene() {
    const el = this.containerRef.nativeElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010204);
    this.scene.add(this.treeGroup);
    this.scene.add(this.particleGroup);
    this.scene.add(this.laserGroup);

    this.camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 1, 50000);
    this.camera.position.set(0, 400, 1200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    el.appendChild(this.renderer.domElement);

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 1.6, 0.4, 0.85);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.15;
    this.controls.maxDistance = 8000;
    this.controls.minDistance = 200;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pl1 = new THREE.PointLight(0x5ca7ff, 2.5, 12000);
    pl1.position.set(500, 800, 500);
    this.scene.add(pl1);
    const pl2 = new THREE.PointLight(0xf59e0b, 1.2, 10000);
    pl2.position.set(-600, 400, -300);
    this.scene.add(pl2);

    const grid = new THREE.GridHelper(8000, 80, 0x1e293b, 0x0f172a);
    grid.position.y = -600;
    grid.material.opacity = 0.08;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
      }
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private startAnimationLoop = () => {
    if (this.disposed) return;
    this.animationFrameId = requestAnimationFrame(this.startAnimationLoop);
    const t = this.clock.getElapsedTime();

    this.treeGroup.children.forEach(child => {
      if (child instanceof THREE.InstancedMesh) {
        const origY = child.userData['baseY'] ?? 0;
        child.position.y = origY + Math.sin(t * 0.3 + origY * 0.01) * 2;
      }
    });

    if (this.particleSystem) {
      const positions = this.particleSystem.geometry.attributes['position'] as THREE.BufferAttribute;
      const baseY = this.particleSystem.userData['basePositions'] as Float32Array | null;
      if (baseY) {
        for (let i = 0; i < positions.count; i++) {
          const by = baseY[i * 3 + 1];
          positions.array[i * 3 + 1] = by + Math.sin(t * 0.5 + i * 0.01) * 3;
        }
        positions.needsUpdate = true;
      }
    }

    if (this.laserAnimating) {
      this.laserLines.forEach((line, idx) => {
        const mat = line.material as THREE.LineBasicMaterial;
        mat.opacity = 0.4 + Math.sin(t * 8 + idx * 0.5) * 0.4;
      });
    }

    this.controls.update();
    this.composer.render();
  };

  private buildForest(structure: ForestStructure, selectedModel: ModelKey) {
    this.clearGroup(this.treeGroup);
    this.layouts3D.clear();

    const models: ModelKey[] = ['robustness', 'failure', 'intent'];
    const modelOffsets: Record<ModelKey, { x: number; z: number }> = {
      robustness: { x: -800, z: 0 },
      failure: { x: 0, z: 0 },
      intent: { x: 800, z: 0 },
    };

    for (const modelKey of models) {
      const model = structure[modelKey];
      const offset = modelOffsets[modelKey];
      const isPrimary = modelKey === selectedModel;
      const color = new THREE.Color(MODEL_COLORS[modelKey]);
      const opacity = isPrimary ? 0.9 : 0.2;

      const modelGroup = new THREE.Group();
      modelGroup.position.set(offset.x, 0, offset.z);

      const treesPerRow = 10;
      const treeSpacingX = 50;
      const treeSpacingZ = 40;

      for (let i = 0; i < model.trees.length; i++) {
        const tree = model.trees[i];
        const layout = this.layoutTree(tree, i, treesPerRow, treeSpacingX, treeSpacingZ);
        this.layouts3D.set(`${modelKey}-${i}`, layout);

        const treeLocalGroup = new THREE.Group();

        const nodePositions = new Float32Array(layout.nodes.length * 3);
        const nodeColors = new Float32Array(layout.nodes.length * 3);
        const nodeSizes = new Float32Array(layout.nodes.length);

        for (let n = 0; n < layout.nodes.length; n++) {
          const node = layout.nodes[n];
          nodePositions[n * 3] = node.x;
          nodePositions[n * 3 + 1] = node.y;
          nodePositions[n * 3 + 2] = node.z;

          const nc = node.isLeaf ? color.clone().multiplyScalar(0.6 + node.value * 0.4) : color.clone();
          nodeColors[n * 3] = nc.r;
          nodeColors[n * 3 + 1] = nc.g;
          nodeColors[n * 3 + 2] = nc.b;

          nodeSizes[n] = node.isLeaf ? 1.5 : 2.0;
        }

        const nodeGeo = new THREE.BufferGeometry();
        nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
        nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
        nodeGeo.setAttribute('size', new THREE.BufferAttribute(nodeSizes, 1));

        const nodeMat = new THREE.PointsMaterial({
          size: isPrimary ? 4 : 2,
          vertexColors: true,
          transparent: true,
          opacity,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const points = new THREE.Points(nodeGeo, nodeMat);
        treeLocalGroup.add(points);

        if (isPrimary && i < 20) {
          const edgePositions: number[] = [];
          for (const [fromId, toId] of layout.edges) {
            const from = layout.nodes[fromId];
            const to = layout.nodes[toId];
            edgePositions.push(from.x, from.y, from.z, to.x, to.y, to.z);
          }
          if (edgePositions.length > 0) {
            const edgeGeo = new THREE.BufferGeometry();
            edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
            const edgeMat = new THREE.LineBasicMaterial({
              color: MODEL_COLORS[modelKey],
              transparent: true,
              opacity: 0.08,
              blending: THREE.AdditiveBlending,
            });
            const lines = new THREE.LineSegments(edgeGeo, edgeMat);
            treeLocalGroup.add(lines);
          }
        }

        modelGroup.add(treeLocalGroup);
      }

      this.treeGroup.add(modelGroup);
    }
  }

  private layoutTree(tree: { treeIndex: number; nodeCount: number; nodes: ForestNode[] }, treeIdx: number, treesPerRow: number, spacingX: number, spacingZ: number): TreeLayout3D {
    const nodes = tree.nodes;
    const row = Math.floor(treeIdx / treesPerRow);
    const col = treeIdx % treesPerRow;
    const centerX = col * spacingX;
    const centerZ = row * spacingZ;

    const resultNodes: TreeNode3D[] = [];
    const edges: [number, number][] = [];

    const branchSpreadX = spacingX * 0.35;
    const depthSpacingY = 30;

    const nodePositions = new Map<number, { x: number; y: number; z: number }>();

    const stack: { nodeId: number; depth: number; leftBound: number; rightBound: number }[] = [];
    stack.push({ nodeId: 0, depth: 0, leftBound: centerX - branchSpreadX, rightBound: centerX + branchSpreadX });

    while (stack.length > 0) {
      const { nodeId, depth, leftBound, rightBound } = stack.pop()!;
      const node = nodes[nodeId];

      const x = (leftBound + rightBound) / 2;
      const y = depth * depthSpacingY;
      const z = centerZ;

      nodePositions.set(nodeId, { x, y, z });

      resultNodes.push({
        nodeId: node.id,
        x, y, z,
        depth,
        isLeaf: node.isLeaf,
        feature: node.feature,
        threshold: node.threshold,
        value: node.value,
        nSamples: node.nSamples,
      });

      if (!node.isLeaf && node.left !== null && node.right !== null) {
        edges.push([nodeId, node.left]);
        edges.push([nodeId, node.right]);
        const mid = (leftBound + rightBound) / 2;
        stack.push({ nodeId: node.right, depth: depth + 1, leftBound: mid, rightBound: rightBound });
        stack.push({ nodeId: node.left, depth: depth + 1, leftBound: leftBound, rightBound: mid });
      }
    }

    return {
      treeIndex: tree.treeIndex,
      centerX,
      centerY: 0,
      centerZ,
      nodes: resultNodes,
      edges,
    };
  }

  private buildParticles(samples: TrainingSample[]) {
    if (this.particleSystem) {
      this.particleGroup.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
    }

    const scale = 40;
    const positions = new Float32Array(samples.length * 3);
    const colors = new Float32Array(samples.length * 3);
    const basePositions = new Float32Array(samples.length * 3);

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      positions[i * 3] = s.x * scale;
      positions[i * 3 + 1] = s.y * scale - 200;
      positions[i * 3 + 2] = s.z * scale;

      basePositions[i * 3] = s.x * scale;
      basePositions[i * 3 + 1] = s.y * scale - 200;
      basePositions[i * 3 + 2] = s.z * scale;

      if (s.scenario === 'boreal_strike') {
        colors[i * 3] = 0.23;
        colors[i * 3 + 1] = 0.51;
        colors[i * 3 + 2] = 0.96;
      } else {
        colors[i * 3 + 1] = 0.56;
        colors[i * 3 + 1] = 0.96;
        colors[i * 3 + 2] = 0.56;
        colors[i * 3] = 0.23;
        colors[i * 3 + 1] = 0.56;
        colors[i * 3 + 2] = 0.96;
      }
      if (s.scenario === 'ghost_feint') {
        colors[i * 3] = 0.96;
        colors[i * 3 + 1] = 0.62;
        colors[i * 3 + 2] = 0.04;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this.particleSystem.userData['basePositions'] = basePositions;
    this.particleSystem.position.set(0, -300, 0);
    this.particleGroup.add(this.particleSystem);
  }

  private animateLaser(path: DecisionPathNode[]) {
    while (this.laserGroup.children.length > 0) {
      const child = this.laserGroup.children[0];
      this.laserGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.laserLines = [];

    if (path.length < 2) return;

    const selectedModel = this.activeModel();
    const selectedTreeIdx = this.selectedTreeIndex();
    if (selectedTreeIdx === null) return;

    const layoutKey = `${selectedModel}-${selectedTreeIdx}`;
    const layout = this.layouts3D.get(layoutKey);
    if (!layout) return;

    const modelOffsets: Record<ModelKey, { x: number; z: number }> = {
      robustness: { x: -800, z: 0 },
      failure: { x: 0, z: 0 },
      intent: { x: 800, z: 0 },
    };
    const offset = modelOffsets[selectedModel];

    const points: THREE.Vector3[] = [];
    for (const pathNode of path) {
      const layoutNode = layout.nodes.find(n => n.nodeId === pathNode.nodeId);
      if (layoutNode) {
        points.push(new THREE.Vector3(
          layoutNode.x + offset.x,
          layoutNode.y,
          layoutNode.z + offset.z,
        ));
      }
    }

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];

      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const mat = new THREE.LineBasicMaterial({
        color: MODEL_COLORS[selectedModel],
        transparent: true,
        opacity: 0.9,
        linewidth: 2,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      this.laserGroup.add(line);
      this.laserLines.push(line);
    }

    for (let i = 0; i < points.length; i++) {
      const nodeGeo = new THREE.SphereGeometry(6, 8, 8);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: path[i].isLeaf ? 0x4ade80 : MODEL_COLORS[selectedModel],
        transparent: true,
        opacity: 0.95,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(points[i]);
      this.laserGroup.add(nodeMesh);
    }

    this.laserAnimating = true;
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.LineSegments) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
      if (child instanceof THREE.Group) {
        this.clearGroup(child);
      }
    }
  }
}
