import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, input, effect } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
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
  nodeObjects: Map<string, THREE.Group> = new Map();
  store = inject(KnowledgeGraphStore);

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  labelRenderer!: CSS2DRenderer;
  composer!: EffectComposer;
  controls!: OrbitControls;
  animationFrameId: number = 0;
  resizeObserver!: ResizeObserver;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  constructor() {
    effect(() => { 
      // We must wait until the scene is initialized. 
      // A simple check is if this.scene exists.
      if (this.scene) {
        this.buildNodes(this.nodes()); 
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
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }

  initScene() {
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

    this.buildNodes(this.nodes());
  }

  setupResizeObserver() {
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

  startAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.startAnimationLoop);
    this.controls.update();
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }

  buildNodes(nodes: TechNode[]) {
    // Clear existing
    this.nodeObjects.forEach(group => {
      // Basic cleanup (in a real app, we'd dispose geometries/materials too)
      this.scene.remove(group);
    });
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
      } else if (node.category === 'LOGISTICS') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 10, 32), matDef);
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
}