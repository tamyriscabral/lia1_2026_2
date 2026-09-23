import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { ClassPanel } from "@/components/onnx/ClassPanel";
import { ImagePanel } from "@/components/onnx/ImagePanel";
import { ModelDropzone } from "@/components/onnx/ModelDropzone";
import { ModelInfoPanel } from "@/components/onnx/ModelInfoPanel";
import { ResultsPanel } from "@/components/onnx/ResultsPanel";
import { discoverClasses } from "@/lib/onnx/classes";
import { decodeOutputs } from "@/lib/onnx/postprocess";
import { prepareInput, resolveInputPlan, type Normalization } from "@/lib/onnx/preprocess";
import { parseOnnxModel } from "@/lib/onnx/proto";
import { createSession, type Session } from "@/lib/onnx/session";
import { inferTask } from "@/lib/onnx/task";
import type {
  ClassDiscovery,
  InferenceOutcome,
  OnnxModelInfo,
  TaskGuess,
} from "@/lib/onnx/types";
import { translateClassNames } from "@/lib/translate.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OnnxPlayground — análise e inferência de modelos ONNX" },
      {
        name: "description",
        content:
          "Carregue qualquer modelo ONNX de visão computacional, descubra classes e metadados automaticamente e execute a inferência no próprio navegador.",
      },
      { property: "og:title", content: "OnnxPlayground — análise e inferência de modelos ONNX" },
      {
        property: "og:description",
        content:
          "Ferramenta genérica para inspecionar e executar modelos ONNX de visão computacional, direto no navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function Index() {
  const [modelFile, setModelFile] = useState<{ name: string; size: number } | null>(null);
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [statusText, setStatusText] = useState("aguardando arquivo");
  const [modelInfo, setModelInfo] = useState<OnnxModelInfo | null>(null);
  const [discovery, setDiscovery] = useState<ClassDiscovery | null>(null);
  const [task, setTask] = useState<TaskGuess | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationNote, setTranslationNote] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [normalization, setNormalization] = useState<Normalization>("unit");
  const [threshold, setThreshold] = useState(50);
  const [outcome, setOutcome] = useState<InferenceOutcome | null>(null);
  const [running, setRunning] = useState(false);
  const [inferError, setInferError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const discoveryRef = useRef<ClassDiscovery | null>(null);
  discoveryRef.current = discovery;

  useEffect(() => {
    return () => {
      void sessionRef.current?.release();
    };
  }, []);

  const handleModelFile = useCallback(async (file: File) => {
    setModelFile({ name: file.name, size: file.size });
    setModelStatus("loading");
    setStatusText("lendo o arquivo…");
    setModelError(null);
    setModelInfo(null);
    setDiscovery(null);
    setTask(null);
    setOutcome(null);
    setInferError(null);
    setTranslationNote(null);
    if (sessionRef.current) {
      void sessionRef.current.release();
      sessionRef.current = null;
    }

    if (!file.name.toLowerCase().endsWith(".onnx")) {
      setModelStatus("error");
      setStatusText("extensão inesperada");
      setModelError("O arquivo selecionado não tem a extensão .onnx. Escolha um modelo ONNX.");
      return;
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch {
      setModelStatus("error");
      setStatusText("falha na leitura");
      setModelError("Não foi possível ler o arquivo. Tente selecioná-lo novamente.");
      return;
    }

    let info: OnnxModelInfo;
    try {
      setStatusText("analisando a estrutura…");
      info = parseOnnxModel(buffer);
    } catch {
      setModelStatus("error");
      setStatusText("arquivo inválido");
      setModelError(
        "Este arquivo não pôde ser interpretado como um modelo ONNX. Ele pode estar corrompido ou incompleto.",
      );
      return;
    }

    const found = discoverClasses(info.metadata);
    const guess = inferTask(info, found ? found.classes.length : null);
    setModelInfo(info);
    setDiscovery(found);
    setTask(guess);

    try {
      setStatusText("preparando o motor de inferência…");
      sessionRef.current = await createSession(buffer);
      setModelStatus("ready");
      setStatusText("análise concluída");
    } catch {
      setModelStatus("error");
      setStatusText("incompatível com o navegador");
      setModelError(
        "O modelo foi lido e analisado, mas o motor de execução do navegador não conseguiu carregá-lo. Ele pode usar operadores ainda não suportados. As informações técnicas abaixo continuam disponíveis.",
      );
    }

    if (found) {
      setTranslating(true);
      try {
        const response = await translateClassNames({
          data: { names: found.classes.map((c) => c.original) },
        });
        if (response.ok) {
          setDiscovery({
            ...found,
            classes: found.classes.map((c, i) => ({
              ...c,
              display: response.translated[i] ?? c.original,
            })),
          });
          setTranslationNote("nomes traduzidos automaticamente · original preservado");
        } else {
          setTranslationNote("tradução indisponível — exibindo os nomes originais");
        }
      } catch {
        setTranslationNote("tradução indisponível — exibindo os nomes originais");
      } finally {
        setTranslating(false);
      }
    }
  }, []);

  const runInference = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !modelInfo || !imageUrl) return;
    setRunning(true);
    setInferError(null);
    setOutcome(null);

    try {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();

      const spec =
        modelInfo.inputs.find((i) => i.name === session.inputNames[0]) ?? modelInfo.inputs[0];
      if (!spec) throw new Error("Este modelo não declara nenhuma entrada utilizável.");
      if (session.inputNames.length > 1) {
        throw new Error(
          "Este modelo espera mais de uma entrada e ainda não pode ser executado automaticamente.",
        );
      }

      const fallbackSize = task?.task === "detection" ? 640 : 224;

      let prepared;
      try {
        prepared = prepareInput(image, spec, normalization, fallbackSize);
      } catch (err) {
        throw new Error(
          err instanceof Error && err.message
            ? `Não foi possível preparar a imagem para este modelo. ${err.message}`
            : "Não foi possível preparar a imagem para este modelo.",
        );
      }

      let outputs;
      try {
        outputs = await session.run({ [session.inputNames[0]!]: prepared });
      } catch {
        throw new Error(
          "A execução falhou. A imagem preparada pode não corresponder ao que o modelo espera — tente outra opção de normalização.",
        );
      }

      try {
        setOutcome(
          decodeOutputs(
            task?.task ?? "unknown",
            outputs,
            discoveryRef.current?.classes ?? [],
            prepared.width,
            prepared.height,
          ),
        );
      } catch {
        throw new Error("A inferência funcionou, mas a saída não pôde ser interpretada.");
      }
    } catch (err) {
      setInferError(
        err instanceof Error ? err.message : "Algo deu errado durante a inferência.",
      );
    } finally {
      setRunning(false);
    }
  }, [imageUrl, modelInfo, normalization, task]);

  const handleImage = useCallback((file: File) => {
    setImageName(file.name);
    setOutcome(null);
    setInferError(null);
    setImageUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  }, []);

  useEffect(() => {
    if (imageUrl && modelStatus === "ready") void runInference();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, modelStatus, normalization]);

  let inputSummary: string | null = null;
  if (modelInfo?.inputs[0]) {
    try {
      const plan = resolveInputPlan(modelInfo.inputs[0], task?.task === "detection" ? 640 : 224);
      inputSummary = `${plan.width}×${plan.height} · ${plan.layout}`;
    } catch {
      inputSummary = null;
    }
  }

  const thresholdEnabled =
    outcome === null || outcome.kind === "classification" || outcome.kind === "detection";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="blob -left-16 -top-16 size-72 bg-mint" />
      <div className="blob -right-24 top-24 size-80 bg-peach/70" />
      <div className="blob bottom-[-4rem] left-1/3 size-64 bg-lilac/50" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 pt-7">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl text-lg font-bold text-primary-foreground clay-clay">
            O
          </div>
          <div>
            <p className="font-extrabold leading-none tracking-tight">OnnxPlayground</p>
            <p className="font-mono text-[11px] text-foreground/50">
              análise · tradução · inferência
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="rounded-full px-4 py-2 text-xs font-semibold clay">
            Local · sem servidor
          </span>
          <span className="rounded-full px-4 py-2 font-mono text-xs text-foreground/60 clay-in">
            v1.0
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pt-8">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide clay-butter">
            visão computacional universal
          </span>
          <h1 className="mt-4 text-5xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">
            Seu arquivo ONNX decide <span className="text-clay">tudo.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-foreground/60">
            Carregue qualquer modelo. Ele detecta classes, traduz para o português, descobre a
            tarefa e executa a inferência direto no navegador.
          </p>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-6">
            <ModelDropzone
              onFile={(file) => void handleModelFile(file)}
              file={modelFile}
              status={modelStatus}
              statusText={statusText}
            />
            {modelError ? (
              <div className="rounded-[1.6rem] p-5 clay">
                <p className="text-sm font-semibold text-destructive">{modelError}</p>
              </div>
            ) : null}
          </div>

          {modelInfo ? (
            <ClassPanel
              discovery={discovery}
              metadataKeys={Object.keys(modelInfo.metadata)}
              translating={translating}
              translationNote={translationNote}
              threshold={threshold}
              onThreshold={setThreshold}
              thresholdEnabled={thresholdEnabled}
            />
          ) : (
            <div className="flex flex-col justify-center rounded-[2rem] p-6 clay">
              <p className="text-lg font-extrabold">Classes do modelo</p>
              <p className="mt-2 text-sm text-foreground/55">
                As classes aparecem aqui assim que um modelo for carregado. Nada é pré-definido: a
                lista vem dos metadados do próprio arquivo.
              </p>
            </div>
          )}
        </section>

        {modelInfo ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <ImagePanel
              imageUrl={imageUrl}
              imageName={imageName}
              onImage={handleImage}
              disabled={modelStatus !== "ready" || !imageUrl}
              running={running}
              onRun={() => void runInference()}
              normalization={normalization}
              onNormalization={setNormalization}
              inputSummary={inputSummary}
            />
            <ResultsPanel
              outcome={outcome}
              threshold={threshold}
              imageUrl={imageUrl}
              running={running}
              error={inferError}
            />
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[1.6rem] p-6 clay float-slow">
            <div className="grid size-12 place-items-center rounded-2xl text-xl clay-butter">
              🔍
            </div>
            <p className="mt-4 font-bold">Análise automática</p>
            <p className="mt-1 text-sm text-foreground/55">
              Inspeciona entradas, saídas, dimensões e tipos de dados sem presumir o formato.
            </p>
          </div>
          <div className="rounded-[1.6rem] p-6 clay float-slower">
            <div className="grid size-12 place-items-center rounded-2xl text-xl clay-clay">🌐</div>
            <p className="mt-4 font-bold">Tradução de classes</p>
            <p className="mt-1 text-sm text-foreground/55">
              Detecta o idioma e traduz para pt-BR, mantendo sempre o nome original intacto.
            </p>
          </div>
          <div className="rounded-[1.6rem] p-6 clay">
            <div className="grid size-12 place-items-center rounded-2xl text-xl clay-lilac">⚡</div>
            <p className="mt-4 font-bold">Inferência local</p>
            <p className="mt-1 text-sm text-foreground/55">
              Executa com ONNX Runtime Web no navegador — nada sai da sua máquina.
            </p>
          </div>
        </section>

        {modelInfo && modelFile && task ? (
          <div className="mt-8">
            <ModelInfoPanel
              model={modelInfo}
              fileName={modelFile.name}
              fileSize={formatSize(modelFile.size)}
              task={task}
              discovery={discovery}
            />
          </div>
        ) : null}

        <footer className="mt-10 pb-10 text-center font-mono text-sm text-foreground/40">
          Nenhuma classe fixa. Nenhum domínio presumido. O modelo é a única fonte de verdade.
        </footer>
      </main>
    </div>
  );
}
