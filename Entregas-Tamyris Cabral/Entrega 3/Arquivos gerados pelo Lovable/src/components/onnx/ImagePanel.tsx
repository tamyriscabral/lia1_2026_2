import { useRef, useState } from "react";
import { NORMALIZATION_LABELS, type Normalization } from "@/lib/onnx/preprocess";

interface Props {
  imageUrl: string | null;
  imageName: string | null;
  onImage: (file: File) => void;
  disabled: boolean;
  running: boolean;
  onRun: () => void;
  normalization: Normalization;
  onNormalization: (value: Normalization) => void;
  inputSummary: string | null;
}

export function ImagePanel({
  imageUrl,
  imageName,
  onImage,
  disabled,
  running,
  onRun,
  normalization,
  onNormalization,
  inputSummary,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div className="rounded-[2rem] clay p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold">Imagem de entrada</p>
        {inputSummary ? (
          <span className="font-mono text-[11px] text-foreground/40">{inputSummary}</span>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onImage(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={`grid min-h-[200px] cursor-pointer place-items-center overflow-hidden rounded-[1.5rem] border-2 border-dashed p-3 text-center clay-in transition-colors ${
          over ? "border-clay" : "border-clay/40"
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageName ?? "Imagem selecionada"}
            className="max-h-72 w-auto rounded-2xl object-contain"
          />
        ) : (
          <div className="p-6">
            <p className="font-bold">Arraste uma imagem</p>
            <p className="mt-1 text-sm text-foreground/50">
              ou <span className="font-semibold text-clay underline">selecionar arquivo</span>
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onImage(picked);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2 clay-in">
          <span className="font-mono text-[10px] uppercase tracking-wide text-foreground/45">
            normalização
          </span>
          <select
            value={normalization}
            onChange={(e) => onNormalization(e.target.value as Normalization)}
            className="flex-1 bg-transparent text-xs font-semibold outline-none"
          >
            {Object.entries(NORMALIZATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled || running}
          className="rounded-2xl px-5 py-2.5 text-sm font-bold text-primary-foreground clay-clay transition-transform disabled:opacity-40 not-disabled:hover:-translate-y-0.5"
        >
          {running ? "Executando…" : "Executar inferência"}
        </button>
      </div>
    </div>
  );
}
