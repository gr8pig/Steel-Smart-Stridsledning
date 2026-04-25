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

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  labelRenderer!: CSS2DRenderer;
  composer!: EffectComposer;
  controls!: OrbitControls;
  animationFrameId: number = 0;
  resizeObserver!: ResizeObserver;

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
}