import type { TensorSpec } from "./types";

export type Normalization = "unit" | "raw" | "imagenet" | "symmetric";

export const NORMALIZATION_LABELS: Record<Normalization, string> = {
  unit: "0 a 1 (dividir por 255)",
  raw: "0 a 255 (sem normalizar)",
  imagenet: "Média/desvio ImageNet",
  symmetric: "-1 a 1",
};

export interface PreparedInput {
  data: Float32Array | Uint8Array | Int32Array;
  dims: number[];
  width: number;
  height: number;
  layout: "NCHW" | "NHWC";
}

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

const isFixed = (d: number | string | null | undefined): d is number =>
  typeof d === "number" && d > 0;


export function resolveInputPlan(spec: TensorSpec, fallbackSize: number) {
  const dims = spec.dims;
  if (dims.length !== 4) {
    throw new Error(
      `A entrada "${spec.name}" tem ${dims.length} dimensões e não parece ser uma imagem.`,
    );
  }
  const channelsFirst = isFixed(dims[1]) && [1, 3, 4].includes(dims[1]);
  const channelsLast = isFixed(dims[3]) && [1, 3, 4].includes(dims[3]);
  const layout: "NCHW" | "NHWC" = channelsLast && !channelsFirst ? "NHWC" : "NCHW";

  const channels = layout === "NCHW" ? (isFixed(dims[1]) ? dims[1] : 3) : isFixed(dims[3]) ? dims[3] : 3;
  const hIdx = layout === "NCHW" ? 2 : 1;
  const wIdx = layout === "NCHW" ? 3 : 2;
  const height = isFixed(dims[hIdx]) ? dims[hIdx] : fallbackSize;
  const width = isFixed(dims[wIdx]) ? dims[wIdx] : fallbackSize;
  const batch = isFixed(dims[0]) ? dims[0] : 1;

  return { layout, channels, width, height, batch };
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Não foi possível preparar a imagem no navegador.");
  ctx.drawImage(source, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function prepareInput(
  source: CanvasImageSource,
  spec: TensorSpec,
  normalization: Normalization,
  fallbackSize: number,
): PreparedInput {
  const plan = resolveInputPlan(spec, fallbackSize);
  const { width, height, channels, layout, batch } = plan;
  const pixels = drawToCanvas(source, width, height).data;
  const count = batch * channels * width * height;

  const integerInput = ["uint8", "int8", "uint16", "int16", "int32", "int64"].includes(
    spec.elemTypeName,
  );

  const values = new Float32Array(count);
  const planeSize = width * height;

  for (let i = 0; i < planeSize; i++) {
    const r = pixels[i * 4]! / 255;
    const g = pixels[i * 4 + 1]! / 255;
    const b = pixels[i * 4 + 2]! / 255;
    const a = pixels[i * 4 + 3]! / 255;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const raw = channels === 1 ? [gray] : channels === 4 ? [r, g, b, a] : [r, g, b];

    for (let c = 0; c < channels; c++) {
      let v = raw[c] ?? 0;
      if (integerInput) {
        v = Math.round(v * 255);
      } else if (normalization === "raw") {
        v = v * 255;
      } else if (normalization === "imagenet") {
        const mean = IMAGENET_MEAN[c] ?? 0.5;
        const std = IMAGENET_STD[c] ?? 0.5;
        v = (v - mean) / std;
      } else if (normalization === "symmetric") {
        v = v * 2 - 1;
      }
      const idx = layout === "NCHW" ? c * planeSize + i : i * channels + c;
      values[idx] = v;
    }
  }

  // Replicate the single prepared image across the batch when batch > 1.
  if (batch > 1) {
    const single = planeSize * channels;
    for (let b = 1; b < batch; b++) values.copyWithin(b * single, 0, single);
  }

  const dims =
    layout === "NCHW" ? [batch, channels, height, width] : [batch, height, width, channels];

  if (spec.elemTypeName === "uint8" || spec.elemTypeName === "int8") {
    return { data: Uint8Array.from(values), dims, width, height, layout };
  }
  if (spec.elemTypeName === "int32") {
    return { data: Int32Array.from(values), dims, width, height, layout };
  }
  return { data: values, dims, width, height, layout };
}
