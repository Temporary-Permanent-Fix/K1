const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

async function ask({ docText, messages }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Chýba ANTHROPIC_API_KEY");
  const system =
    "Si asistent, ktorý odpovedá na otázky a robí zhrnutia výhradne na základe nasledujúceho dokumentu. " +
    "Ak sa odpoveď v dokumente nenachádza, jasne to povedz a nevymýšľaj si. Odpovedaj vecne a stručne, v slovenčine.\n\n" +
    "Dokument:\n" + (docText || "(žiadny dokument)");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages: (messages || []).map((m) => ({ role: m.role, content: String(m.content || "") })) }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || ("Anthropic " + r.status));
  return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n") || "(bez odpovede)";
}

export async function POST(req) {
  try { const text = await ask(await req.json()); return Response.json({ text }); }
  catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }
}
