import { useEffect, useRef } from "react";
import type { InferenceOutcome } from "@/lib/onnx/types";

interface Props {
  outcome: InferenceOutcome | null;
  threshold: number;
  imageUrl: string | null;
  running: boolean;
  error: string | null;
}

const PALETTE = [
  "oklch(0.715 0.066 165.5)",
  "oklch(0.78 0.09 57)",
  "oklch(0.72 0.1 300)",
  "oklch(0.8 0.11 92)",
  "oklch(0.68 0.09 220)",
  "oklch(0.7 0.11 20)",
];

const color = (id: number) => PALETTE[id % PALETTE.length]!;

function SegmentationCanvas({
  outcome,
  imageUrl,
}: {
  outcome: Extract<InferenceOutcome, { kind: "segmentation" }>;
  imageUrl: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height, mask } = outcome.result;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(width, height);
    for (let i = 0; i < mask.length; i++) {
      const id = mask[i]!;
      const hue = (id * 67) % 360;
      const rgb = hslToRgb(hue / 360, 0.55, 0.6);
      image.data[i * 4] = rgb[0];
      image.data[i * 4 + 1] = rgb[1];
      image.data[i * 4 + 2] = rgb[2];
      image.data[i * 4 + 3] = id === 0 ? 70 : 190;
    }
    ctx.putImageData(image, 0, 0);
  }, [outcome]);

  return (
    <div className="relative overflow-hidden rounded-2xl clay-in">
      {imageUrl ? <img src={imageUrl} alt="" className="w-full object-contain" /> : null}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full mix-blend-multiply"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function ResultsPanel({ outcome, threshold, imageUrl, running, error }: Props) {
  const limit = threshold / 100;

  return (
    <div className="rounded-[2rem] clay p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-clay" />
        <p className="text-lg font-extrabold">Resultados</p>
      </div>

      {error ? (
        <div className="rounded-2xl p-4 clay-in">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      ) : running ? (
        <p className="font-mono text-sm text-foreground/50">executando a inferência…</p>
      ) : !outcome ? (
        <p className="text-sm text-foreground/50">
          Carregue um modelo e uma imagem para ver os resultados aqui.
        </p>
      ) : outcome.kind === "classification" ? (
        (() => {
          const visible = outcome.items.filter((i) => i.score >= limit);
          if (visible.length === 0) {
            return (
              <p className="text-sm text-foreground/50">
                Nenhuma classe atingiu {threshold}% de confiança. Reduza o limite para ver mais
                resultados.
              </p>
            );
          }
          return (
            <div className="space-y-3">
              {visible.slice(0, 50).map((item, i) => (
                <div
                  key={`${item.id}-${item.original}`}
                  className="rise-in rounded-2xl p-3 clay-in"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.display}</p>
                      <p className="truncate font-mono text-[11px] text-foreground/40">
                        {item.original}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold">
                      {(item.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full clay-track">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${item.score * 100}%`, background: color(item.id) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : outcome.kind === "detection" ? (
        (() => {
          const visible = outcome.items.filter((i) => i.score >= limit);
          return (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl clay-in">
                {imageUrl ? <img src={imageUrl} alt="" className="w-full object-contain" /> : null}
                {visible.map((d, i) => (
                  <div
                    key={i}
                    className="absolute rounded-md border-2"
                    style={{
                      left: `${d.box.x * 100}%`,
                      top: `${d.box.y * 100}%`,
                      width: `${d.box.w * 100}%`,
                      height: `${d.box.h * 100}%`,
                      borderColor: color(d.id),
                    }}
                  >
                    <span
                      className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground"
                      style={{ background: color(d.id) }}
                    >
                      {d.display} · {(d.score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              {visible.length === 0 ? (
                <p className="text-sm text-foreground/50">
                  Nenhuma detecção acima de {threshold}% de confiança.
                </p>
              ) : (
                <div className="space-y-2">
                  {visible.slice(0, 40).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2 clay-in"
                    >
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: color(d.id) }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {d.display}
                        <span className="ml-2 font-mono text-[11px] text-foreground/40">
                          {d.original}
                        </span>
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {(d.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      ) : outcome.kind === "segmentation" ? (
        <div className="space-y-4">
          <SegmentationCanvas outcome={outcome} imageUrl={imageUrl} />
          <div className="space-y-2">
            {outcome.result.presentClasses.slice(0, 20).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl px-3 py-2 clay-in">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    background: `hsl(${(c.id * 67) % 360} 55% 60%)`,
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.display}</span>
                <span className="font-mono text-sm font-bold">{(c.ratio * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 clay-in">
            <p className="text-sm font-semibold">{outcome.note}</p>
            <p className="mt-2 text-xs text-foreground/50">
              Os valores brutos abaixo mostram a estrutura real da saída para diagnóstico.
            </p>
          </div>
          {outcome.tensors.map((t) => (
            <div key={t.name} className="rounded-2xl p-4 font-mono text-xs clay-in">
              <p className="text-clay">{t.name}</p>
              <p className="text-foreground/60">dimensões → [{t.dims.join(", ")}]</p>
              <p className="break-all text-foreground/60">
                primeiros valores → {t.preview.map((v) => v.toFixed(4)).join(", ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
