import type { ClassDiscovery, DiscoveredClass } from "./types";

/**
 * Class/label discovery. Nothing here is domain specific: the model metadata
 * is the only source of truth. Several encodings found in the wild are tried.
 */

const PREFERRED_KEYS = [
  "class_names",
  "classnames",
  "names",
  "labels",
  "classes",
  "categories",
  "id2label",
  "label_map",
  "class_list",
];

function looksLikeNames(values: string[]): boolean {
  if (values.length === 0) return false;
  if (values.length > 100000) return false;
  const nonEmpty = values.filter((v) => v.trim().length > 0);
  if (nonEmpty.length === 0) return false;
  // Reject pure numeric dumps (likely shapes / weights / versions)
  const numeric = nonEmpty.filter((v) => /^-?\d+(\.\d+)?$/.test(v.trim()));
  return numeric.length / nonEmpty.length < 0.8;
}

function fromEntries(entries: Array<[number, string]>): DiscoveredClass[] | null {
  const cleaned = entries
    .map(([id, original]) => [id, original.trim().replace(/^['"]|['"]$/g, "")] as const)
    .filter(([, original]) => original.length > 0);
  if (!looksLikeNames(cleaned.map(([, v]) => v))) return null;
  const seen = new Map<number, string>();
  for (const [id, original] of cleaned) if (!seen.has(id)) seen.set(id, original);
  return [...seen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, original]) => ({ id, original, display: original }));
}

function tryJson(raw: string): { classes: DiscoveredClass[]; format: string } | null {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const entries = parsed.map((v, i) => [i, String(v)] as [number, string]);
      const classes = fromEntries(entries);
      return classes ? { classes, format: "lista JSON" } : null;
    }
    if (parsed && typeof parsed === "object") {
      const entries: Array<[number, string]> = [];
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        const id = Number(k);
        if (Number.isFinite(id)) entries.push([id, String(v)]);
      }
      const classes = fromEntries(entries);
      return classes ? { classes, format: "objeto JSON" } : null;
    }
  } catch {
    /* segue para os outros formatos */
  }
  return null;
}

function tryPythonDict(raw: string): { classes: DiscoveredClass[]; format: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  const pairs = [...trimmed.matchAll(/(-?\d+)\s*:\s*(?:'([^']*)'|"([^"]*)"|([^,}\n]+))/g)];
  if (pairs.length === 0) return null;
  const entries = pairs.map(
    (m) => [Number(m[1]), (m[2] ?? m[3] ?? m[4] ?? "").trim()] as [number, string],
  );
  const classes = fromEntries(entries);
  return classes ? { classes, format: "dicionário id → nome" } : null;
}

function tryIndexedList(raw: string): { classes: DiscoveredClass[]; format: string } | null {
  const pairs = [...raw.matchAll(/(?:^|[,;\n])\s*(-?\d+)\s*[:=]\s*([^,;\n]+)/g)];
  if (pairs.length === 0) return null;
  const entries = pairs.map((m) => [Number(m[1]), (m[2] ?? "").trim()] as [number, string]);
  const classes = fromEntries(entries);
  return classes ? { classes, format: "pares id:nome" } : null;
}

function tryPlainList(raw: string): { classes: DiscoveredClass[]; format: string } | null {
  const parts = raw
    .split(/[\n,;|]+/)
    .map((v) => v.trim().replace(/^\[|\]$/g, "").replace(/^['"]|['"]$/g, ""))
    .filter((v) => v.length > 0);
  if (parts.length < 1) return null;
  const classes = fromEntries(parts.map((v, i) => [i, v] as [number, string]));
  return classes ? { classes, format: "lista simples" } : null;
}

function parseValue(raw: string) {
  return (
    tryJson(raw) ?? tryPythonDict(raw) ?? tryIndexedList(raw) ?? tryPlainList(raw) ?? null
  );
}

export function discoverClasses(metadata: Record<string, string>): ClassDiscovery | null {
  const keys = Object.keys(metadata);
  const ordered = [
    ...keys.filter((k) => PREFERRED_KEYS.includes(k.toLowerCase().replace(/[\s-]/g, "_"))),
    ...keys.filter((k) => /name|class|label|categor/i.test(k)),
    ...keys,
  ];
  const visited = new Set<string>();
  for (const key of ordered) {
    if (visited.has(key)) continue;
    visited.add(key);
    const raw = metadata[key];
    if (!raw || raw.trim().length === 0) continue;
    const parsed = parseValue(raw);
    if (parsed && parsed.classes.length > 0) {
      return { classes: parsed.classes, sourceKey: key, sourceFormat: parsed.format };
    }
  }
  return null;
}
