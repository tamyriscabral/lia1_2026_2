import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  file: { name: string; size: number } | null;
  status: "idle" | "loading" | "ready" | "error";
  statusText: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ModelDropzone({ onFile, file, status, statusText }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div className="rounded-[2rem] clay p-6">
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
          if (dropped) onFile(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={`grid min-h-[220px] cursor-pointer place-items-center rounded-[1.5rem] border-2 border-dashed p-8 text-center clay-in transition-colors ${
          over ? "border-clay" : "border-clay/40"
        }`}
      >
        <div>
          <div className="mx-auto grid size-16 place-items-center rounded-full text-2xl clay-peach float-slow">
            ⬆
          </div>
          <p className="mt-4 text-lg font-bold">Arraste o modelo aqui</p>
          <p className="mt-1 text-sm text-foreground/50">
            .onnx — ou <span className="font-semibold text-clay underline">selecionar arquivo</span>
          </p>
          <p className="mt-4 font-mono text-xs text-foreground/40">
            processado 100% local no navegador
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".onnx,application/octet-stream"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onFile(picked);
            e.target.value = "";
          }}
        />
      </div>

      {file ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl p-4 clay-in">
          <div className="grid size-10 place-items-center rounded-xl text-sm font-bold text-primary-foreground clay-clay">
            ON
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="font-mono text-xs text-foreground/40">
              {formatSize(file.size)} · {statusText}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold clay ${
              status === "error"
                ? "text-destructive"
                : status === "ready"
                  ? "text-clay"
                  : "text-foreground/50"
            }`}
          >
            {status === "loading"
              ? "analisando"
              : status === "ready"
                ? "pronto"
                : status === "error"
                  ? "erro"
                  : "aguardando"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
