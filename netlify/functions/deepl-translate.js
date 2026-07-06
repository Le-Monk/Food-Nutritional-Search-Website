const DEEPL_FREE_ENDPOINT = "https://api-free.deepl.com/v2/translate";
const DEEPL_PRO_ENDPOINT = "https://api.deepl.com/v2/translate";

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return response(204, "");
  }

  if (event.httpMethod !== "POST") {
    return response(405, { error: "Use POST." });
  }

  const authKey = process.env.DEEPL_API_KEY;
  if (!authKey) {
    return response(503, { error: "DeepL API key is not configured." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid JSON." });
  }

  const text = Array.isArray(payload.text)
    ? payload.text.filter((item) => typeof item === "string" && item.trim()).slice(0, 50)
    : [];
  const targetLang = String(payload.target_lang || "").toUpperCase();
  const context = typeof payload.context === "string" ? payload.context.slice(0, 800) : "";

  if (!text.length || !targetLang) {
    return response(400, { error: "text and target_lang are required." });
  }

  const endpoint = authKey.endsWith(":fx") ? DEEPL_FREE_ENDPOINT : DEEPL_PRO_ENDPOINT;
  const body = {
    text,
    target_lang: targetLang,
    split_sentences: "0",
    preserve_formatting: true,
  };
  if (context) {
    body.context = context;
  }

  try {
    const deeplResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${authKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await deeplResponse.text();
    if (!deeplResponse.ok) {
      return response(deeplResponse.status, {
        error: "DeepL request failed.",
        detail: responseText.slice(0, 300),
      });
    }

    return response(200, JSON.parse(responseText));
  } catch (error) {
    return response(502, { error: error.message || "DeepL request failed." });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}
