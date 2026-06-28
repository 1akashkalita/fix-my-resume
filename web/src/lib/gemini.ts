import { GoogleGenAI } from "@google/genai";
import type { GeminiSchema } from "./prompts";
import { RateLimitError, ModelOverloadedError, ModelOutputError, InvalidKeyError, OfflineError } from "./errors";

export const DEFAULT_MODEL = "gemini-2.5-flash";

// Models offered in the Settings dropdown. Single source of truth — the
// <select> options, the default, and any validation all read from here.
// `label` is what the user sees; `id` is the model string sent to Gemini.
export const GEMINI_MODELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "gemini-2.5-pro", label: "gemini-2.5-pro — most accurate" },
  { id: "gemini-2.5-flash", label: "gemini-2.5-flash — balanced (default)" },
  { id: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite — fastest & cheapest" },
  { id: "gemini-2.0-flash", label: "gemini-2.0-flash — legacy fallback" },
];

export function makeAI(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

type AILike = { models: { generateContent: (args: any) => Promise<{ text?: string }> } };

function isRateLimit(e: unknown): boolean {
  const any = e as { status?: number; message?: string };
  return any?.status === 429 || /resource_exhausted|rate limit|429/i.test(any?.message ?? "");
}

// Gemini returns 503 UNAVAILABLE ("The model is overloaded") when the model is
// in high demand. Transient like a rate limit, but it's Google's capacity, not
// the user's quota — so it gets its own error type and "wait a few minutes" copy.
function isOverloaded(e: unknown): boolean {
  const any = e as { status?: number; message?: string };
  return any?.status === 503 || /unavailable|overloaded|high demand/i.test(any?.message ?? "");
}

// 400/401/403 + "API key not valid" / PERMISSION_DENIED mean the key is wrong —
// permanent, so it must NOT be retried (it would just burn the backoff budget).
function isInvalidKey(e: unknown): boolean {
  const any = e as { status?: number; message?: string };
  return (
    any?.status === 400 || any?.status === 401 || any?.status === 403 ||
    /api[_ ]?key not valid|api_key_invalid|invalid api key|permission_denied|unauthenticated/i.test(any?.message ?? "")
  );
}

// In-browser fetch failures surface as `TypeError: Failed to fetch` (offline,
// DNS, CORS). Distinct from a rate limit — the request never reached Google.
function isOffline(e: unknown): boolean {
  const msg = (e as { message?: string })?.message ?? "";
  return (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|networkerror|network request failed|load failed/i.test(msg)
  );
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException ? e.name === "AbortError" : (e as { name?: string })?.name === "AbortError";
}

export async function callGeminiJSON<T>(opts: {
  ai: AILike;
  model: string;
  system: string;
  user: string;
  responseSchema: GeminiSchema;
  validate: (value: unknown) => T;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  abortSignal?: AbortSignal;
}): Promise<T> {
  const { ai, model, system, user, responseSchema, validate, abortSignal } = opts;
  const maxRetries = opts.maxRetries ?? 5;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  // Browser-tuned backoff. The Python GeminiProvider uses 10s base / 120s cap;
  // we deliberately shorten to 1s base / 30s cap because the user is watching a
  // live UI and won't tolerate minute-long waits. (We also skip Python's
  // server-provided retry_in hint parsing for the same reason.)
  const BASE = 1000, CAP = 30000;

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1,
          topP: 0.9,
          abortSignal,
        },
      });
      const text = (res.text ?? "").trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new ModelOutputError();
      }
      try {
        return validate(parsed);
      } catch {
        throw new ModelOutputError("Model output failed schema validation.");
      }
    } catch (e) {
      lastErr = e;
      if (e instanceof ModelOutputError) throw e;
      // A user-triggered cancel must propagate untouched, not be retried.
      if (isAbort(e)) throw e;
      // Wrong key / no network are permanent for this run — fail fast with
      // actionable copy instead of burning the backoff budget on retries.
      if (isInvalidKey(e)) throw new InvalidKeyError();
      if (isOffline(e)) throw new OfflineError();
      // Both rate limits and overload are transient — back off and retry.
      const transient = isRateLimit(e) || isOverloaded(e);
      if (transient && attempt < maxRetries - 1) {
        const expo = Math.min(BASE * 2 ** attempt, CAP);
        const jitter = 0.8 + Math.random() * 0.4;
        await sleep(Math.round(expo * jitter));
        continue;
      }
      if (isOverloaded(e)) throw new ModelOverloadedError();
      if (isRateLimit(e)) throw new RateLimitError();
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini call failed");
}
