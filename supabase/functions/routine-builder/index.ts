import { corsHeaders, generateGeminiJSON, jsonResponse } from "../_shared/gemini.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const result = await generateGeminiJSON(`Build a calm minimal habit routine from the user's prompt. Return strict JSON shape {"kind":"routine","confidence":"high","drafts":[habit drafts],"previewText":"short preview"}. Use only 2-5 habits. Avoid guilt language. Habit draft fields: title, type binary|count|timer|negative, schedule, timeOfDay, category, optional targetCount. Input: ${JSON.stringify(body)}`);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Routine generation failed" }, 500);
  }
});
