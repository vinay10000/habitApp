import { corsHeaders, generateGeminiJSON, jsonResponse } from "../_shared/gemini.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const result = await generateGeminiJSON(`Create a minimal weekly habit report. Return strict JSON {"kind":"weeklyReport","confidence":"high","summary":"one calm sentence","wins":["up to 3 short wins"],"focus":"one gentle focus"}. Avoid shame and dense analytics. Input: ${JSON.stringify(body)}`);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Weekly report failed" }, 500);
  }
});
