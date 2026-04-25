# Design Spec: SSS 3D Knowledge Graph (Steel)

**Topic:** 3D Information Architecture Visualization
**Date:** 2026-04-24
**Status:** Draft (Approved)

## 1. Vision & Purpose
The Knowledge Graph in the "Steel" command surface transforms the static, pseudo-3D information architecture diagram into a fully immersive, interactive 3D WebGL environment. It serves as a visual index of the Steel Smart Stridsledning's subsystems, data flows, and doctrinal mappings, allowing commanders and analysts to explore the system's topology organically.

## 2. Architecture: Pure Three.js + Angular

### 2.1 The Data Layer (Signals)
- **Source of Truth:** Data is sourced from `src/app/core/models/platform-knowledge-graph.data.ts`, providing a comprehensive map of 56+ nodes and 190+ edges across runtime, backend, docs, research, and scaffold areas.
- **Store:** `KnowledgeGraphStore` (using `@ngrx/signals`) manages the semantic data of the graph (Nodes, Edges, Active State).
- **Nodes:** Represent entities like Core Systems, Decisions, Logistics, Intelligence, Governance, and Surface.
- **Edges:** Represent relationships and data flows between nodes.

### 2.2 The 3D Engine (The "Renderer")
- **Core:** A dedicated Angular component (`<app-knowledge-graph-viewer>`) initializes and manages the raw Three.js context.
- **Scene & Camera:** A `PerspectiveCamera` with `OrbitControls` for free-roaming "Cinematic Sandbox" interaction.
- **Renderer:** `WebGLRenderer` with `antiAlias: true` and post-processing (specifically `UnrealBloomPass` for the signature "Steel" glowing effect).
- **Responsive:** A `ResizeObserver` ensures the canvas adapts fluidly to the container.

## 3. Visual Design & Geometries

### 3.1 The Nodes (Entities)
Distinctive geometries based on `NodeCategory`:
- **CORE:** A glowing inner cube encased in a wireframe outer box.
- **DECISION:** A sharp, rotating diamond (Octahedron).
- **LOGISTICS:** A flattened, pulsing cylinder.
- **INTELLIGENCE:** A complex, multi-faceted geometry (Icosahedron).
- **GOVERNANCE:** A stable, wide base (Torus or Dodecahedron).
- **SURFACE:** A flat plane or disc.
- **Materials:** `MeshStandardMaterial` with specific emissive colors (Boreal Blue, Amber, Green) reacting to the Bloom pass.

### 3.2 The Edges (Connections)
- **Static Lines:** Subtle, semi-transparent `LineBasicMaterial` connecting nodes.
- **Dynamic Flow (Particles):** Data flow visualized using an `InstancedMesh` of tiny glowing spheres traveling along paths between connected nodes, updated in the `requestAnimationFrame` loop.

### 3.3 HTML Overlays (Labels)
- **Technology:** Three.js `CSS2DRenderer` projects HTML elements into the 3D scene.
- **Design:** Angular templates styled with Tailwind CSS for node labels, ensuring they always face the camera, remain crisp, and match the "Steel" typography.

## 4. Integration & User Experience

### 4.1 The Application Shell
- **Main Component:** `<app-knowledge-graph>` containing the top control bar (Theme toggle, Search, Breadcrumbs) and the main visualization area (`<app-knowledge-graph-viewer>`).
- **Detail Panel:** An overlay drawer that appears upon node selection, displaying detailed technical specs, inputs/outputs, and doctrine mapping.

### 4.2 Interaction Loop
- **Hover:** `Raycaster` detects mouse-over. Nodes scale up slightly, emissive intensity increases, and HTML labels brighten.
- **Click:** Camera smoothly animates (using a tweening library or spring function) to focus on the selected node. Unrelated nodes dim, and the detail panel opens.
- **Search:** Typing in the search bar highlights matching nodes and dims the rest for quick navigation.

## 5. Technical Stack
- **Framework:** Angular 18 (Signals, Standalone Components).
- **3D Library:** Three.js (`three`), including `OrbitControls`, `UnrealBloomPass`, and `CSS2DRenderer`.
- **Animation:** GSAP or similar for smooth camera transitions.

## 6. Verification Plan
- **Rendering:** Ensure the WebGL canvas initializes without errors and the bloom effect is visible.
- **Performance:** Verify that the animation loop maintains 60fps with hundreds of nodes and particles using instanced rendering.
- **Interaction:** Confirm that raycasting accurately detects node hovers and clicks, and HTML labels position correctly.
- **Responsiveness:** Ensure the canvas resizes correctly when the browser window changes.
