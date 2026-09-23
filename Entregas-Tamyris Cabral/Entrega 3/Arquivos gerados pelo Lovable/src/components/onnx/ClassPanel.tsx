import type { ClassDiscovery } from "@/lib/onnx/types";

interface Props {
  discovery: ClassDiscovery | null;
  metadataKeys: string[];
  translating: boolean;
  translationNote: string | null;
  threshold: number;
  onThreshold: (value: number) => void;
  thresholdEnabled: boolean;
}

const chipTones = ["clay-clay", "clay-peach", "clay-lilac", "clay-butter"];

export function ClassPanel({
  discovery,
  metadataKeys,
  translating,
  translationNote,
  threshold,
  onThreshold,
  thresholdEnabled,
}: Props) {
  return (
    <div className="flex flex-col rounded-[2rem] clay p-6">
      <p className="text-lg font-extrabold">Classes do modelo</p>
      <p className="mb-4 text-xs text-foreground/50">
        {discovery
          ? `descobertas em "${discovery.sourceKey}" · ${discovery.sourceFormat}`
          : "lidas diretamente dos metadados do arquivo"}
      </p>

      {discovery ? (
        <>
          {translating ? (
            <p className="mb-2 font-mono text-[11px] text-foreground/40">traduzindo para pt-BR…</p>
          ) : translationNote ? (
            <p className="mb-2 font-mono text-[11px] text-foreground/40">{translationNote}</p>
          ) : null}
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {discovery.classes.map((c, i) => (
              <div key={`${c.id}-${c.original}`} className="flex items-center gap-3 rounded-2xl p-3 clay-in">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-primary-foreground ${chipTones[i % chipTones.length]}`}
                >
                  {c.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.display}</p>
                  <p className="truncate font-mono text-[11px] text-foreground/40">{c.original}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl p-4 clay-in">
          <p className="text-sm font-semibold">
            Não foram encontradas classes nos metadados deste modelo.
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            {metadataKeys.length > 0
              ? `Campos disponíveis para diagnóstico: ${metadataKeys.join(", ")}`
              : "Este arquivo não traz nenhum campo de metadados. Os resultados serão exibidos por índice numérico."}
          </p>
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Confiança mínima</span>
          <span className="rounded-lg px-2.5 py-0.5 text-xs font-bold clay-butter">
            {threshold}%
          </span>
        </div>
        <div className="relative h-6 rounded-full clay-track">
          <div
            className="absolute inset-y-0 left-0 rounded-full clay-clay"
            style={{ width: `${threshold}%` }}
          />
          <div
            className="pointer-events-none absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full clay-knob"
            style={{ left: `${threshold}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={threshold}
            aria-label="Nível mínimo de confiança"
            onChange={(e) => onThreshold(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-foreground/40">
          <span>0%</span>
          <span>100%</span>
        </div>
        {!thresholdEnabled ? (
          <p className="mt-2 font-mono text-[11px] text-foreground/40">
            este modelo não expõe um conceito de confiança aplicável
          </p>
        ) : null}
      </div>
    </div>
  );
}
