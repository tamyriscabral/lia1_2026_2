import { useState } from "react";
import type { ClassDiscovery, OnnxModelInfo, TaskGuess } from "@/lib/onnx/types";

interface Props {
  model: OnnxModelInfo;
  fileName: string;
  fileSize: string;
  task: TaskGuess;
  discovery: ClassDiscovery | null;
}

const dimsText = (dims: Array<number | string | null>) =>
  dims.length === 0 ? "não declarada" : `[${dims.map((d) => (d === null ? "?" : d)).join(", ")}]`;

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 clay-in">
      <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/40">{label}</p>
      <p className="mt-1 break-words font-mono text-sm">{value}</p>
    </div>
  );
}

export function ModelInfoPanel({ model, fileName, fileSize, task, discovery }: Props) {
  const [open, setOpen] = useState(false);
  const metadataEntries = Object.entries(model.metadata);

  return (
    <section className="rounded-[2rem] clay p-6 md:p-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="size-2.5 rounded-full bg-clay" />
        <p className="text-lg font-extrabold">Informações do modelo</p>
        <span className="ml-auto font-mono text-xs text-foreground/45">
          {open ? "ocultar" : "mostrar tudo"}
        </span>
      </button>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Arquivo" value={`${fileName} · ${fileSize}`} />
        <Cell label="Tarefa" value={task.label} />
        <Cell
          label="Entrada"
          value={model.inputs[0] ? dimsText(model.inputs[0].dims) : "não declarada"}
        />
        <Cell
          label="Saída"
          value={model.outputs[0] ? dimsText(model.outputs[0].dims) : "não declarada"}
        />
      </div>

      <p className="mt-4 rounded-2xl p-4 text-xs leading-relaxed text-foreground/60 clay-in">
        {task.reason}
      </p>

      {open ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Cell label="Nº de entradas" value={String(model.inputs.length)} />
            <Cell label="Nº de saídas" value={String(model.outputs.length)} />
            <Cell
              label="Nº de classes"
              value={discovery ? String(discovery.classes.length) : "não informado"}
            />
            <Cell label="Nº de nós no grafo" value={String(model.nodeCount)} />
            <Cell label="Produtor" value={model.producerName || "não informado"} />
            <Cell label="Versão do produtor" value={model.producerVersion || "não informada"} />
            <Cell label="IR version" value={model.irVersion ? String(model.irVersion) : "—"} />
            <Cell
              label="Opset"
              value={
                model.opsets.length
                  ? model.opsets.map((o) => `${o.domain}:${o.version}`).join(" · ")
                  : "não informado"
              }
            />
          </div>

          <div className="rounded-2xl p-4 clay-in">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-foreground/40">
              Entradas
            </p>
            <div className="space-y-1 font-mono text-xs text-foreground/65">
              {model.inputs.length === 0 ? (
                <p>nenhuma entrada declarada</p>
              ) : (
                model.inputs.map((i) => (
                  <p key={i.name}>
                    <span className="text-clay">{i.name}</span> → {dimsText(i.dims)} ·{" "}
                    {i.elemTypeName}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4 clay-in">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-foreground/40">
              Saídas
            </p>
            <div className="space-y-1 font-mono text-xs text-foreground/65">
              {model.outputs.length === 0 ? (
                <p>nenhuma saída declarada</p>
              ) : (
                model.outputs.map((o) => (
                  <p key={o.name}>
                    <span className="text-clay">{o.name}</span> → {dimsText(o.dims)} ·{" "}
                    {o.elemTypeName}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4 clay-in">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-foreground/40">
              Metadados disponíveis
            </p>
            <div className="space-y-1 font-mono text-xs leading-relaxed text-foreground/65">
              {metadataEntries.length === 0 ? (
                <p>nenhum metadado presente no arquivo</p>
              ) : (
                metadataEntries.map(([k, v]) => (
                  <p key={k} className="break-all">
                    <span className="text-clay">{k}</span> → {v.length > 400 ? `${v.slice(0, 400)}…` : v}
                  </p>
                ))
              )}
            </div>
          </div>

          {model.opTypes.length > 0 ? (
            <div className="rounded-2xl p-4 clay-in">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-foreground/40">
                Operadores presentes
              </p>
              <p className="break-words font-mono text-xs text-foreground/65">
                {model.opTypes.join(" · ")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
