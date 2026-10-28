// Vercel serverless function: POST /api/recommend
// API key chỉ nằm ở server, không bao giờ gửi xuống trình duyệt.
// Có GEMINI_API_KEY thì dùng Gemini, không thì dùng Claude (ANTHROPIC_API_KEY), không có key nào thì trả đề xuất mẫu.
import Anthropic from "@anthropic-ai/sdk";
import {
  PLAN_OPTIONS_JSON_SCHEMA,
  PlanContextSchema,
  PlanOptionsSchema,
  SYSTEM_PROMPT,
  buildPrompt,
  mockRecommendation,
  type PlanContext,
  type PlanOption,
  type PlanResult,
} from "../shared/recommendation.js";

const CLAUDE_MODEL = "claude-opus-5-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Model dự phòng, thử lần lượt khi model trước quá tải (503), hết quota tạm thời (429) hoặc quá chậm.
// Flash-Lite đứng cuối vì thường còn dư năng lực khi các model Flash quá tải.
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.6-flash,gemini-3.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const RETRYABLE = new Set([429, 500, 503]);
// Model trước chờ ngắn để kịp chuyển; model cuối chờ lâu hơn vì không còn đường lui.
const GEMINI_TIMEOUT_MS = 20_000;
const GEMINI_LAST_TIMEOUT_MS = 40_000;

// Gemini hỗ trợ minItems/maxItems: ép đúng 3 phương án (bản Flash-Lite hay trả thiếu).
const GEMINI_SCHEMA = {
  ...PLAN_OPTIONS_JSON_SCHEMA,
  properties: { options: { ...PLAN_OPTIONS_JSON_SCHEMA.properties.options, minItems: 3, maxItems: 3 } },
};

class MissingKeyError extends Error {}
class GeminiHttpError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`Gemini HTTP ${status}: ${detail.slice(0, 300)}`);
  }
}


// Model chính quá tải hoặc quá chậm thì chuyển ngay sang model dự phòng, không chờ thử lại.
async function recommendWithGemini(ctx: PlanContext): Promise<string> {
  const models = [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];
  let lastError: unknown;
  for (const [i, model] of models.entries()) {
    try {
      return await callGemini(model, ctx, i === models.length - 1 ? GEMINI_LAST_TIMEOUT_MS : GEMINI_TIMEOUT_MS);
    } catch (err) {
      lastError = err;
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      if (!timedOut && !(err instanceof GeminiHttpError && RETRYABLE.has(err.status))) throw err;
      console.warn(`[recommend] ${model} ${timedOut ? "quá thời gian chờ" : `trả ${(err as GeminiHttpError).status}`}, chuyển model…`);
    }
  }
  throw lastError;
}

async function callGemini(model: string, ctx: PlanContext, timeoutMs: number): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(ctx) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: GEMINI_SCHEMA,
          // Suy luận ít để phản hồi nhanh; lập kế hoạch hoạt động không cần nghĩ sâu.
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    },
  );
  if (!res.ok) throw new GeminiHttpError(res.status, await res.text());
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts
    ?.filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  if (!text) {
    throw new Error(`Gemini không trả nội dung (${candidate?.finishReason ?? data.promptFeedback?.blockReason ?? "unknown"})`);
  }
  return text;
}

async function recommendWithClaude(ctx: PlanContext): Promise<string> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // Nếu model từ chối vì bộ lọc an toàn, server tự chạy lại trên model dự phòng.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // effort thấp để demo phản hồi nhanh; nội dung lập kế hoạch không cần suy luận sâu.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: PLAN_OPTIONS_JSON_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(ctx) }],
  });

  if (response.stop_reason === "refusal") throw new Error("Model từ chối yêu cầu");
  if (response.stop_reason === "max_tokens") throw new Error("Phản hồi bị cắt do max_tokens");

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error("Không có nội dung trả về");
  return text.text;
}

async function recommend(ctx: PlanContext): Promise<PlanOption[]> {
  let raw: string;
  if (process.env.GEMINI_API_KEY) raw = await recommendWithGemini(ctx);
  else if (process.env.ANTHROPIC_API_KEY) raw = await recommendWithClaude(ctx);
  else throw new MissingKeyError();

  const { options } = PlanOptionsSchema.parse(JSON.parse(raw));
  // Grounding: bỏ các vendor id không có trong danh sách để AI không "bịa" quán.
  const known = new Set(ctx.vendors.map((v) => v.id));
  return options.map((o) => ({ ...o, vendorIds: o.vendorIds.filter((id) => known.has(id)) }));
}

export async function POST(request: Request): Promise<Response> {
  const parsed = PlanContextSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dữ liệu đầu vào không hợp lệ" }, { status: 400 });
  }
  const ctx = parsed.data;

  try {
    const result: PlanResult = { options: await recommend(ctx), source: "ai" };
    return Response.json(result);
  } catch (err) {
    console.error("[recommend]", err);
    const en = ctx.lang === "en";
    const message =
      err instanceof MissingKeyError
        ? en
          ? "GEMINI_API_KEY is not set"
          : "chưa cấu hình GEMINI_API_KEY"
        : (err instanceof GeminiHttpError && RETRYABLE.has(err.status)) || (err instanceof Error && err.name === "TimeoutError")
          ? en
            ? "Gemini is busy, please try again in a moment"
            : "Gemini đang quá tải, thử lại sau ít phút"
          : err instanceof Error
            ? err.message
            : String(err);
    const result: PlanResult = {
      options: mockRecommendation(ctx),
      source: "mock",
      note:
        (en
          ? `Couldn't reach the AI (${message}). Showing sample suggestions.`
          : `Không gọi được AI (${message}). Đang hiển thị đề xuất mẫu.`) +
        (ctx.notes.trim() ? (en ? " Sample suggestions don't apply your notes." : " Đề xuất mẫu không áp dụng ghi chú của bạn.") : ""),
    };
    return Response.json(result);
  }
}
