export type NodeCategory =
  | "CORE"
  | "DECISION"
  | "LOGISTICS"
  | "INTELLIGENCE"
  | "GOVERNANCE"
  | "SURFACE"
  | "DOCUMENTATION";
export type PlatformArea =
  | "runtime"
  | "backend"
  | "frontend"
  | "docs"
  | "research"
  | "scaffold";
export type FlowType =
  | "DATA"
  | "MATERIAL"
  | "CONTROL"
  | "LOGICAL"
  | "DOCTRINAL";
export type KnowledgeGraphStatus =
  | "implemented"
  | "mock-simulation"
  | "partial"
  | "conceptual";
export type KnowledgeGraphViewMode = "GRAPH" | "TWIN";
export type NodeDataClass =
  | "ThreatTwin"
  | "BaseTwin"
  | "PolicyTwin"
  | "COATwin"
  | "SupplyNode"
  | "SupplyCorridor"
  | "SystemModel"
  | "Document"
  | "Service"
  | "Scaffold";

export interface ReferenceSourceAnchor {
  label: string;
  path: string;
  note: string;
}

export interface GraphEdge {
  id: string;
  source: string; // ID of the source node
  target: string; // ID of the target node
  type: FlowType;
  label?: string;
  description?: string;
}

export interface TechNode {
  id: string;
  label: string;
  category: NodeCategory;
  area?: PlatformArea;
  status?: KnowledgeGraphStatus;
  dataClass?: NodeDataClass;
  description: string;
  what?: string;
  why?: string;
  where?: string;
  who?: string;
  route?: string;
  sourcePath?: string;
  technicalSpecs: {
    inputs: string[];
    outputs: string[];
    logic?: string;
    math?: string;
    doctrine?: string;
    verif?: string;
    uncertaintySource?: string;
    fatiguePenalty?: number;
    policyDriftOffset?: number;
  };
  connectedTo: string[]; // Keep for simple traversal
  flows?: GraphEdge[]; // Explicit definitions of relationships and flows
  // Initial logical positions (will be translated to 3D space)
  x: number;
  y: number;
  z: number;
}
