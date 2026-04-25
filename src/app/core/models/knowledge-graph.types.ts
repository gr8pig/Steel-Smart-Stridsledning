export type NodeCategory = 'CORE' | 'DECISION' | 'LOGISTICS' | 'INTELLIGENCE' | 'GOVERNANCE' | 'SURFACE';
export type FlowType = 'DATA' | 'MATERIAL' | 'CONTROL' | 'LOGICAL' | 'DOCTRINAL';

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
  description: string;
  technicalSpecs: {
    inputs: string[];
    outputs: string[];
    logic?: string;
    math?: string;
    doctrine?: string;
    verif?: string;
  };
  connectedTo: string[]; // Keep for simple traversal
  flows?: GraphEdge[]; // Explicit definitions of relationships and flows
  // Initial logical positions (will be translated to 3D space)
  x: number;
  y: number;
  z: number;
}
