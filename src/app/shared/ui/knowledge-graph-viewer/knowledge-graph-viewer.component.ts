import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, input, effect } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { TechNode } from '../../../core/models/knowledge-graph.types';
import { KnowledgeGraphStore } from '../../../core/state/knowledge-graph.store';
import gsap from 'gsap';

@Component({
  selector: 'app-knowledge-graph-viewer',
  standalone: true,
  template: `<div #container class="w-full h-full relative outline-none" tabindex="0"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class KnowledgeGraphViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  
  nodes = input<TechNode[]>([]);
  nodeObjects = new Map<string, THREE.Group>();
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

  // Shared Materials to prevent memory leaks
  private matCore = new THREE.MeshStandardMaterial({ color: 0x5ca7ff, emissive: 0x5ca7ff, emissiveIntensity: 0.5 });
  private matDec = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.8 });
  private matLog = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.6 });
  private matInt = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.6 });
  private matGov = new THREE.MeshStandardMaterial({ color: 0x64748b, emissive: 0x64748b, emissiveIntensity: 0.4 });
  private matDef = new THREE.MeshStandardMaterial({ color: 0x9ab0c8, emissive: 0x9ab0c8, emissiveIntensity: 0.2 });
  private edgeMaterial = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.3 });

  private edgesGroup: THREE.Group = new THREE.Group();

  constructor() {
    effect(() => { 
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
    
    // Thorough memory disposal
    this.renderer.dispose();
    this.composer.dispose();
    if (this.labelRenderer && this.labelRenderer.domElement) {
      this.labelRenderer.domElement.remove();
    }
  }

  initScene() {
    const el = this.containerRef.nativeElement;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b12);
    this.scene.add(this.edgesGroup);

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

    // Interaction Listeners
    this.renderer.domElement.addEventListener('pointermove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    this.buildNodes(this.nodes());
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

  buildNodes(nodes: TechNode[]) {
    // Clear and dispose existing nodes
    this.nodeObjects.forEach(group => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
        if (child instanceof CSS2DObject) {
          child.element.remove();
        }
      });
      this.scene.remove(group);
    });
    this.nodeObjects.clear();

    // Clear and dispose edges
    while (this.edgesGroup.children.length > 0) {
      const child = this.edgesGroup.children[0] as THREE.Line;
      child.geometry.dispose();
      this.edgesGroup.remove(child);
    }

    nodes.forEach(node => {
      const group = new THREE.Group();
      group.position.set(node.x, node.y, node.z);
      group.userData = { id: node.id };

      let mesh: THREE.Mesh;
      if (node.category === 'CORE') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), this.matCore);
      } else if (node.category === 'DECISION') {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(15), this.matDec);
      } else if (node.category === 'LOGISTICS') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 10, 32), this.matLog);
      } else if (node.category === 'INTELLIGENCE') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(15), this.matInt);
      } else if (node.category === 'GOVERNANCE') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(10, 5, 16, 100), this.matGov);
      } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(10), this.matDef);
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

    // Build Edges
    nodes.forEach(node => {
      if (node.flows) {
        node.flows.forEach(flow => {
          const targetNode = nodes.find(n => n.id === flow.target);
          if (targetNode) {
            const points = [];
            points.push(new THREE.Vector3(node.x, node.y, node.z));
            points.push(new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, this.edgeMaterial);
            this.edgesGroup.add(line);
          }
        });
      }
    });
  }
}
