import type { OnnxModelInfo, TaskGuess, TensorSpec } from "./types";

const staticDims = (t: TensorSpec): number[] =>
  t.dims.map((d) => (typeof d === "number" ? d : -1));

const nameHints = (specs: TensorSpec[]) => specs.map((s) => s.name.toLowerCase()).join(" ");

export function inferTask(model: OnnxModelInfo, classCount: number | null): TaskGuess {
  const outputs = model.outputs;
  const outNames = nameHints(outputs);
  const metaText = Object.entries(model.metadata)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")
    .toLowerCase();
  const ops = model.opTypes.map((o) => o.toLowerCase());

  if (/\bsegment/.test(metaText) || /mask|segment/.test(outNames)) {
    return {
      task: "segmentation",
      label: "Segmentação",
      certainty: "media",
      reason: "Nomes de saída ou metadados indicam segmentação.",
    };
  }
  if (/\bdetect|\bobb\b|\bbbox/.test(metaText) || /box|dets|detection|nms/.test(outNames)) {
    return {
      task: "detection",
      label: "Detecção de objetos",
      certainty: "media",
      reason: "Nomes de saída ou metadados indicam detecção.",
    };
  }
  if (/\bclassif/.test(metaText)) {
    return {
      task: "classification",
      label: "Classificação",
      certainty: "media",
      reason: "Metadados indicam classificação.",
    };
  }

  if (outputs.length >= 3) {
    const joined = outNames;
    if (/score|conf/.test(joined) && /label|class/.test(joined)) {
      return {
        task: "detection",
        label: "Detecção de objetos",
        certainty: "media",
        reason: "Saídas separadas de caixas, rótulos e pontuações.",
      };
    }
  }

  if (outputs.length === 1) {
    const dims = staticDims(outputs[0]!);
    const rank = dims.length;
    if (rank === 2 || (rank === 1 && dims[0]! > 1)) {
      const n = rank === 2 ? dims[1]! : dims[0]!;
      if (classCount && n === classCount) {
        return {
          task: "classification",
          label: "Classificação",
          certainty: "alta",
          reason: `Saída [${dims.join(", ")}] corresponde ao número de classes (${classCount}).`,
        };
      }
      return {
        task: "classification",
        label: "Classificação",
        certainty: "media",
        reason: `Saída bidimensional [${dims.join(", ")}] típica de classificação.`,
      };
    }
    if (rank === 3) {
      const a = dims[1]!;
      const b = dims[2]!;
      const small = Math.min(a, b);
      const large = Math.max(a, b);
      if (small >= 5 && small <= 512 && large >= 100) {
        return {
          task: "detection",
          label: "Detecção de objetos",
          certainty: "media",
          reason: `Saída [${dims.join(", ")}] compatível com grade de âncoras de detecção.`,
        };
      }
    }
    if (rank === 4) {
      const h = dims[2]!;
      const w = dims[3]!;
      if (h > 1 && w > 1) {
        return {
          task: "segmentation",
          label: "Segmentação",
          certainty: "media",
          reason: `Saída espacial [${dims.join(", ")}] compatível com máscaras.`,
        };
      }
    }
  }

  if (ops.includes("nonmaxsuppression")) {
    return {
      task: "detection",
      label: "Detecção de objetos",
      certainty: "media",
      reason: "O grafo contém NonMaxSuppression.",
    };
  }
  if (ops.includes("softmax") && outputs.length === 1) {
    return {
      task: "classification",
      label: "Classificação",
      certainty: "media",
      reason: "O grafo termina com Softmax.",
    };
  }

  return {
    task: "unknown",
    label: "Não identificada",
    certainty: "desconhecida",
    reason: "Não foi possível determinar automaticamente o significado da saída.",
  };
}
