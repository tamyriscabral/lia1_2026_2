import type {
  ClassificationResult,
  DetectionResult,
  DiscoveredClass,
  InferenceOutcome,
  SegmentationResult,
  TaskKind,
} from "./types";

export interface OutputTensor {
  name: string;
  dims: number[];
  data: ArrayLike<number> | BigInt64Array;
}

const toNumbers = (data: OutputTensor["data"]): number[] => {
  const out: number[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = (data as ArrayLike<number | bigint>)[i];
    out[i] = typeof v === "bigint" ? Number(v) : (v as number);
  }
  return out;
};

const nameFor = (classes: DiscoveredClass[], id: number) => {
  const found = classes.find((c) => c.id === id);
  return {
    original: found?.original ?? `#${id}`,
    display: found?.display ?? `Classe ${id}`,
  };
};

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

function asProbabilities(values: number[]): number[] {
  if (values.length === 0) return values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const alreadyProb = min >= -1e-6 && max <= 1 + 1e-6 && Math.abs(sum - 1) < 0.05;
  if (alreadyProb) return values;
  if (min >= 0 && max <= 1) return values; // sigmoid multi-label
  return softmax(values);
}

export function decodeClassification(
  tensor: OutputTensor,
  classes: DiscoveredClass[],
): ClassificationResult[] {
  const raw = toNumbers(tensor.data);
  const scores = asProbabilities(raw);
  return scores
    .map((score, id) => ({ id, ...nameFor(classes, id), score }))
    .sort((a, b) => b.score - a.score);
}

function iou(a: DetectionResult["box"], b: DetectionResult["box"]) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function nms(items: DetectionResult[], threshold = 0.45): DetectionResult[] {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const kept: DetectionResult[] = [];
  for (const item of sorted) {
    if (kept.some((k) => k.id === item.id && iou(k.box, item.box) > threshold)) continue;
    kept.push(item);
    if (kept.length >= 300) break;
  }
  return kept;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function boxFromCxCywh(cx: number, cy: number, w: number, h: number, sx: number, sy: number) {
  return {
    x: clamp01((cx - w / 2) / sx),
    y: clamp01((cy - h / 2) / sy),
    w: clamp01(w / sx),
    h: clamp01(h / sy),
  };
}

function boxFromXyxy(x1: number, y1: number, x2: number, y2: number, sx: number, sy: number) {
  return {
    x: clamp01(Math.min(x1, x2) / sx),
    y: clamp01(Math.min(y1, y2) / sy),
    w: clamp01(Math.abs(x2 - x1) / sx),
    h: clamp01(Math.abs(y2 - y1) / sy),
  };
}

/** Decodes the common single-tensor detection layouts (YOLO family, [N,6] lists). */
export function decodeDetection(
  outputs: OutputTensor[],
  classes: DiscoveredClass[],
  inputWidth: number,
  inputHeight: number,
): DetectionResult[] | null {
  // Multi-tensor layout: boxes + scores + labels
  if (outputs.length >= 2) {
    const boxes = outputs.find((o) => o.dims[o.dims.length - 1] === 4 && o.dims.length >= 2);
    const scores = outputs.find(
      (o) => o !== boxes && /score|conf/i.test(o.name) && o.dims.length <= 2,
    );
    const labels = outputs.find(
      (o) => o !== boxes && o !== scores && /label|class|id/i.test(o.name),
    );
    if (boxes && scores) {
      const b = toNumbers(boxes.data);
      const s = toNumbers(scores.data);
      const l = labels ? toNumbers(labels.data) : null;
      const results: DetectionResult[] = [];
      const normalized = b.every((v) => v >= -0.01 && v <= 1.01);
      const sx = normalized ? 1 : inputWidth;
      const sy = normalized ? 1 : inputHeight;
      for (let i = 0; i < s.length; i++) {
        const id = l ? Math.round(l[i] ?? 0) : 0;
        results.push({
          id,
          ...nameFor(classes, id),
          score: s[i] ?? 0,
          box: boxFromXyxy(b[i * 4]!, b[i * 4 + 1]!, b[i * 4 + 2]!, b[i * 4 + 3]!, sx, sy),
        });
      }
      return nms(results);
    }
  }

  const tensor = outputs[0];
  if (!tensor) return null;
  const data = toNumbers(tensor.data);
  const dims = tensor.dims;

  // [N, 6] or [1, N, 6] -> x1,y1,x2,y2,score,class
  const flat2 = dims.length === 2 ? dims : dims.length === 3 && dims[0] === 1 ? dims.slice(1) : null;
  if (flat2 && flat2[1] === 6) {
    const n = flat2[0]!;
    const results: DetectionResult[] = [];
    const maxCoord = Math.max(...data.filter((_, i) => i % 6 < 4).map(Math.abs), 0);
    const sx = maxCoord <= 1.01 ? 1 : inputWidth;
    const sy = maxCoord <= 1.01 ? 1 : inputHeight;
    for (let i = 0; i < n; i++) {
      const o = i * 6;
      const id = Math.round(data[o + 5] ?? 0);
      results.push({
        id,
        ...nameFor(classes, id),
        score: data[o + 4] ?? 0,
        box: boxFromXyxy(data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!, sx, sy),
      });
    }
    return nms(results);
  }

  if (dims.length !== 3) return null;
  const [, d1, d2] = dims as [number, number, number];
  // YOLOv8 exports as [1, 4+C, A]; YOLOv5 as [1, A, 5+C]
  const transposed = d1 < d2;
  const features = transposed ? d1 : d2;
  const anchors = transposed ? d2 : d1;
  if (features < 5 || anchors < 2) return null;

  const at = (a: number, f: number) => (transposed ? data[f * anchors + a]! : data[a * features + f]!);

  const classCount = classes.length > 0 ? classes.length : 0;
  const hasObjectness = classCount > 0 ? features === 5 + classCount : features >= 6 && false;
  const nClasses = classCount > 0 ? classCount : features - 4;

  const results: DetectionResult[] = [];
  for (let a = 0; a < anchors; a++) {
    const cx = at(a, 0);
    const cy = at(a, 1);
    const w = at(a, 2);
    const h = at(a, 3);
    const offset = hasObjectness ? 5 : 4;
    const objectness = hasObjectness ? at(a, 4) : 1;
    let best = -1;
    let bestScore = 0;
    for (let c = 0; c < nClasses; c++) {
      const s = at(a, offset + c) * objectness;
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (best < 0 || bestScore <= 0.01) continue;
    results.push({
      id: best,
      ...nameFor(classes, best),
      score: bestScore,
      box: boxFromCxCywh(cx, cy, w, h, inputWidth, inputHeight),
    });
  }
  if (results.length === 0) return [];
  return nms(results);
}

export function decodeSegmentation(
  tensor: OutputTensor,
  classes: DiscoveredClass[],
): SegmentationResult | null {
  const dims = tensor.dims;
  const data = toNumbers(tensor.data);
  let channels = 1;
  let height = 0;
  let width = 0;

  if (dims.length === 4) {
    channels = dims[1]!;
    height = dims[2]!;
    width = dims[3]!;
  } else if (dims.length === 3) {
    height = dims[1]!;
    width = dims[2]!;
  } else {
    return null;
  }
  if (height < 2 || width < 2) return null;

  const planeSize = width * height;
  const mask = new Int32Array(planeSize);
  const counts = new Map<number, number>();

  for (let i = 0; i < planeSize; i++) {
    let id = 0;
    if (channels === 1) {
      id = Math.round(data[i] ?? 0);
    } else {
      let best = 0;
      let bestValue = -Infinity;
      for (let c = 0; c < channels; c++) {
        const v = data[c * planeSize + i] ?? -Infinity;
        if (v > bestValue) {
          bestValue = v;
          best = c;
        }
      }
      id = best;
    }
    mask[i] = id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const presentClasses = [...counts.entries()]
    .map(([id, n]) => ({ id, ...nameFor(classes, id), ratio: n / planeSize }))
    .sort((a, b) => b.ratio - a.ratio);

  return { width, height, mask, presentClasses };
}

export function buildRawOutcome(outputs: OutputTensor[], note: string): InferenceOutcome {
  return {
    kind: "raw",
    note,
    tensors: outputs.map((o) => ({
      name: o.name,
      dims: o.dims,
      preview: toNumbers(o.data).slice(0, 12),
    })),
  };
}

export function decodeOutputs(
  task: TaskKind,
  outputs: OutputTensor[],
  classes: DiscoveredClass[],
  inputWidth: number,
  inputHeight: number,
): InferenceOutcome {
  const first = outputs[0];
  if (!first) return buildRawOutcome(outputs, "O modelo não retornou nenhuma saída.");

  if (task === "classification") {
    return { kind: "classification", items: decodeClassification(first, classes) };
  }
  if (task === "detection") {
    const items = decodeDetection(outputs, classes, inputWidth, inputHeight);
    if (items) return { kind: "detection", items };
    return buildRawOutcome(
      outputs,
      "A saída parece ser de detecção, mas o formato das caixas não pôde ser interpretado.",
    );
  }
  if (task === "segmentation") {
    const result = decodeSegmentation(first, classes);
    if (result) return { kind: "segmentation", result };
    return buildRawOutcome(
      outputs,
      "A saída parece ser de segmentação, mas a máscara não pôde ser interpretada.",
    );
  }

  return buildRawOutcome(
    outputs,
    "Não foi possível determinar automaticamente o significado da saída deste modelo.",
  );
}
