export interface TensorSpec {
  name: string;
  elemType: number;
  elemTypeName: string;
  /** number for static dims, string for symbolic dims, null for unknown */
  dims: Array<number | string | null>;
}

export interface OpsetInfo {
  domain: string;
  version: number;
}

export interface OnnxModelInfo {
  irVersion?: number | undefined;
  producerName?: string | undefined;
  producerVersion?: string | undefined;
  domain?: string | undefined;
  docString?: string | undefined;
  modelVersion?: number | undefined;
  opsets: OpsetInfo[];
  metadata: Record<string, string>;
  graphName?: string | undefined;
  inputs: TensorSpec[];

  outputs: TensorSpec[];
  opTypes: string[];
  nodeCount: number;
}

export interface DiscoveredClass {
  id: number;
  original: string;
  display: string;
}

export interface ClassDiscovery {
  classes: DiscoveredClass[];
  sourceKey: string;
  sourceFormat: string;
}

export type TaskKind = "classification" | "detection" | "segmentation" | "unknown";

export interface TaskGuess {
  task: TaskKind;
  label: string;
  certainty: "alta" | "media" | "desconhecida";
  reason: string;
}

export interface ClassificationResult {
  id: number;
  original: string;
  display: string;
  score: number;
}

export interface DetectionResult {
  id: number;
  original: string;
  display: string;
  score: number;
  /** normalized 0..1 relative to the displayed image */
  box: { x: number; y: number; w: number; h: number };
}

export interface SegmentationResult {
  width: number;
  height: number;
  /** class id per pixel */
  mask: Int32Array;
  presentClasses: Array<{ id: number; original: string; display: string; ratio: number }>;
}

export type InferenceOutcome =
  | { kind: "classification"; items: ClassificationResult[] }
  | { kind: "detection"; items: DetectionResult[] }
  | { kind: "segmentation"; result: SegmentationResult }
  | { kind: "raw"; note: string; tensors: Array<{ name: string; dims: number[]; preview: number[] }> };
