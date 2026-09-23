import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  names: z.array(z.string()).min(1).max(2000),
});

const SYSTEM = [
  "Você traduz rótulos de classes de modelos de visão computacional para português do Brasil.",
  "Regras:",
  "1. Responda APENAS com um array JSON de strings, na mesma ordem e com o mesmo tamanho da entrada.",
  "2. Se o rótulo já estiver em português, repita-o apenas ajustando maiúsculas/acentuação.",
  "3. Traduza de forma curta, natural e contextual (um substantivo ou expressão curta).",
  "4. Use maiúscula inicial. Nunca invente explicações nem adicione texto fora do JSON.",
  "5. Se não souber traduzir um rótulo, repita o original.",
].join("\n");

async function translateChunk(names: string[], apiKey: string): Promise<string[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(names) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`gateway ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("resposta inesperada");
  const parsed = JSON.parse(match[0]) as unknown;
  if (!Array.isArray(parsed)) throw new Error("resposta inesperada");
  return names.map((original, i) => {
    const value = parsed[i];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : original;
  });
}

/** Translates class labels to pt-BR. Returns the originals if translation is unavailable. */
export const translateClassNames = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { translated: data.names, ok: false as const, reason: "indisponivel" };
    }
    try {
      const chunks: string[][] = [];
      for (let i = 0; i < data.names.length; i += 120) {
        chunks.push(data.names.slice(i, i + 120));
      }
      const results = await Promise.all(chunks.map((c) => translateChunk(c, apiKey)));
      return { translated: results.flat(), ok: true as const, reason: null };
    } catch {
      return { translated: data.names, ok: false as const, reason: "falha" };
    }
  });
