import { corsHeaders, generateGeminiText, jsonResponse } from "../_shared/gemini.ts";

const mimeFallbacks: Record<string, string[]> = {
  "audio/m4a": ["audio/mp4", "audio/aac"],
  "audio/x-m4a": ["audio/mp4", "audio/aac"],
  "audio/mp4": ["audio/mp4", "audio/aac"],
  "audio/aac": ["audio/aac", "audio/mp4"]
};

function candidateMimeTypes(mimeType: string) {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  return mimeFallbacks[normalized] ?? [normalized];
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { base64, mimeType } = await request.json();

    if (!base64 || !mimeType) {
      return jsonResponse({ error: "base64 and mimeType are required" }, 400);
    }

    if (typeof base64 !== "string" || base64.length < 64) {
      return jsonResponse({ text: "" });
    }

    let lastError: unknown = null;

    for (const candidate of candidateMimeTypes(String(mimeType))) {
      try {
        const text = await generateGeminiText("Transcribe the spoken audio into concise plain text. Return only the transcript. If there is no speech, return an empty string.", [
          {
            inlineData: {
              mimeType: candidate,
              data: base64
            }
          }
        ]);

        return jsonResponse({ text: text.trim() });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("Transcription failed");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Transcription failed" }, 500);
  }
});
