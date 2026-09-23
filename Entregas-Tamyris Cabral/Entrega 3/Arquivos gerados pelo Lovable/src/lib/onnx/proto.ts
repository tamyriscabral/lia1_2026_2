/**
 * Minimal, dependency-free protobuf reader for the ONNX `ModelProto` schema.
 * It only extracts the descriptive parts of the model (metadata, graph inputs
 * and outputs, operator types). Weights are skipped.
 */
import type { OnnxModelInfo, OpsetInfo, TensorSpec } from "./types";

type RawValue = bigint | Uint8Array;
type RawMessage = Map<number, RawValue[]>;

const decoder = new TextDecoder();

function readVarint(buf: Uint8Array, cursor: { i: number }): bigint {
  let result = 0n;
  let shift = 0n;
  while (cursor.i < buf.length) {
    const byte = buf[cursor.i++]!;
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return result;
    shift += 7n;
    if (shift > 70n) throw new Error("varint muito longo");
  }
  throw new Error("fim inesperado do buffer");
}

function decodeMessage(buf: Uint8Array): RawMessage {
  const out: RawMessage = new Map();
  const cursor = { i: 0 };
  while (cursor.i < buf.length) {
    const key = readVarint(buf, cursor);
    const field = Number(key >> 3n);
    const wire = Number(key & 7n);
    let value: RawValue;
    switch (wire) {
      case 0:
        value = readVarint(buf, cursor);
        break;
      case 1: {
        value = buf.slice(cursor.i, cursor.i + 8);
        cursor.i += 8;
        break;
      }
      case 2: {
        const len = Number(readVarint(buf, cursor));
        if (len < 0 || cursor.i + len > buf.length) throw new Error("tamanho inválido");
        value = buf.subarray(cursor.i, cursor.i + len);
        cursor.i += len;
        break;
      }
      case 5: {
        value = buf.slice(cursor.i, cursor.i + 4);
        cursor.i += 4;
        break;
      }
      default:
        throw new Error(`wire type não suportado: ${wire}`);
    }
    const bucket = out.get(field);
    if (bucket) bucket.push(value);
    else out.set(field, [value]);
  }
  return out;
}

const bytesOf = (v: RawValue | undefined): Uint8Array | undefined =>
  v instanceof Uint8Array ? v : undefined;

function str(msg: RawMessage, field: number): string | undefined {
  const b = bytesOf(msg.get(field)?.[0]);
  return b ? decoder.decode(b) : undefined;
}

function num(msg: RawMessage, field: number): number | undefined {
  const v = msg.get(field)?.[0];
  return typeof v === "bigint" ? Number(v) : undefined;
}

function sub(msg: RawMessage, field: number): RawMessage | undefined {
  const b = bytesOf(msg.get(field)?.[0]);
  return b ? decodeMessage(b) : undefined;
}

function subs(msg: RawMessage, field: number): RawMessage[] {
  const list = msg.get(field) ?? [];
  const out: RawMessage[] = [];
  for (const v of list) {
    const b = bytesOf(v);
    if (b) {
      try {
        out.push(decodeMessage(b));
      } catch {
        /* ignora sub-mensagens ilegíveis */
      }
    }
  }
  return out;
}

export const ELEM_TYPES: Record<number, string> = {
  0: "undefined",
  1: "float32",
  2: "uint8",
  3: "int8",
  4: "uint16",
  5: "int16",
  6: "int32",
  7: "int64",
  8: "string",
  9: "bool",
  10: "float16",
  11: "float64",
  12: "uint32",
  13: "uint64",
  14: "complex64",
  15: "complex128",
  16: "bfloat16",
};

function parseValueInfo(vi: RawMessage): TensorSpec {
  const name = str(vi, 1) ?? "";
  const type = sub(vi, 2);
  const tensorType = type ? sub(type, 1) : undefined;
  const elemType = tensorType ? (num(tensorType, 1) ?? 0) : 0;
  const shape = tensorType ? sub(tensorType, 2) : undefined;
  const dims: TensorSpec["dims"] = [];
  if (shape) {
    for (const d of subs(shape, 1)) {
      const value = d.get(1)?.[0];
      const param = str(d, 2);
      if (typeof value === "bigint") dims.push(Number(value));
      else if (param) dims.push(param);
      else dims.push(null);
    }
  }
  return { name, elemType, elemTypeName: ELEM_TYPES[elemType] ?? `tipo_${elemType}`, dims };
}

export function parseOnnxModel(buffer: ArrayBuffer): OnnxModelInfo {
  const root = decodeMessage(new Uint8Array(buffer));

  const metadata: Record<string, string> = {};
  for (const entry of subs(root, 14)) {
    const key = str(entry, 1);
    const value = str(entry, 2);
    if (key) metadata[key] = value ?? "";
  }

  const opsets: OpsetInfo[] = subs(root, 8).map((o) => ({
    domain: str(o, 1) || "ai.onnx",
    version: num(o, 2) ?? 0,
  }));

  const graph = sub(root, 7);
  let inputs: TensorSpec[] = [];
  let outputs: TensorSpec[] = [];
  let opTypes: string[] = [];
  let nodeCount = 0;
  let graphName: string | undefined;

  if (graph) {
    graphName = str(graph, 2);
    const initializerNames = new Set<string>();
    for (const init of subs(graph, 5)) {
      const n = str(init, 8);
      if (n) initializerNames.add(n);
    }
    inputs = subs(graph, 11)
      .map(parseValueInfo)
      .filter((t) => !initializerNames.has(t.name));
    outputs = subs(graph, 12).map(parseValueInfo);

    const nodes = subs(graph, 1);
    nodeCount = nodes.length;
    const seen = new Set<string>();
    for (const node of nodes) {
      const op = str(node, 4);
      if (op) seen.add(op);
    }
    opTypes = [...seen];
  }

  if (!graph && Object.keys(metadata).length === 0 && opsets.length === 0) {
    throw new Error("estrutura ONNX não reconhecida");
  }

  return {
    irVersion: num(root, 1),
    producerName: str(root, 2),
    producerVersion: str(root, 3),
    domain: str(root, 4),
    modelVersion: num(root, 5),
    docString: str(root, 6),
    opsets,
    metadata,
    graphName,
    inputs,
    outputs,
    opTypes,
    nodeCount,
  };
}
