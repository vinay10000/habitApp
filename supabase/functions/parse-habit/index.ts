import { corsHeaders, generateGeminiJSON, jsonResponse } from "../_shared/gemini.ts";

const schemaPrompt = `You are the AI command parser for a minimal habit tracker.
Return strict JSON only.
Supported result shapes:
{"kind":"createHabit","confidence":"high|medium|low","draft":{"title":"string","type":"binary|count|timer|negative","schedule":{"kind":"daily|weekdays|weekends|customDays|everyXDays|monthly",...},"timeOfDay":"morning|afternoon|evening|anytime","category":"health|learning|fitness|mindfulness|productivity|personal","targetCount":number?}}
{"kind":"completeHabit","confidence":"high|medium|low","habitId":"existing-id"}
{"kind":"editHabit","confidence":"high|medium|low","habitId":"existing-id","patch":{},"previewText":"short calm preview"}
{"kind":"routine","confidence":"high|medium|low","drafts":[drafts],"previewText":"short calm preview"}
{"kind":"weeklyReport","confidence":"high","summary":"string","wins":["string"],"focus":"string"}
{"kind":"needsPreview","reason":"string","transcript":"original"}
Rules: high confidence creations/check-ins may be applied immediately. Ambiguous destructive edits must use needsPreview or medium confidence. Keep copy calm, not guilt-based.`;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const result = await generateGeminiJSON(`${schemaPrompt}\n\nInput JSON:\n${JSON.stringify(body)}`);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "AI parsing failed" }, 500);
  }
});
