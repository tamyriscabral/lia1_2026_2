import type { OutputTensor } from "./postprocess";
import type { PreparedInput } from "./preprocess";

type Ort = typeof import("onnxruntime-web");

let ortPromise: Promise<Ort> | null = null;

const ORT_VERSION = "1.30.0";

export async function getOrt(): Promise<Ort> {
  if (typeof window === "undefined") {
    throw new Error("A inferência só pode ser executada no navegador.");
  }
  if (!ortPromise) {
    ortPromise = import("onnxruntime-web").then((ort) => {
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      ort.env.logLevel = "error";
      return ort;
    });
  }
  return ortPromise;
}

export interface Session {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run: (feeds: Record<string, PreparedInput>) => Promise<OutputTensor[]>;
  release: () => Promise<void>;
}

export async function createSession(buffer: ArrayBuffer): Promise<Session> {
  const ort = await getOrt();
  const session = await ort.InferenceSession.create(buffer, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  return {
    inputNames: session.inputNames,
    outputNames: session.outputNames,
    async run(feeds) {
      const tensors: Record<string, InstanceType<Ort["Tensor"]>> = {};
      for (const [name, prepared] of Object.entries(feeds)) {
        const type =
          prepared.data instanceof Uint8Array
            ? "uint8"
            : prepared.data instanceof Int32Array
              ? "int32"
              : "float32";
        tensors[name] = new ort.Tensor(
          type as "float32",
          prepared.data as Float32Array,
          prepared.dims,
        );
      }
      const results = await session.run(tensors);
      return session.outputNames.map((name) => {
        const t = results[name]!;
        return {
          name,
          dims: t.dims as number[],
          data: t.data as OutputTensor["data"],
        };
      });
    },
    async release() {
      await session.release();
    },
  };
}
