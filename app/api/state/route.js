const GH = "https://api.github.com";
const { GH_TOKEN, GH_REPO, GH_BRANCH = "main", GH_PATH = "data/k1omega.json" } = process.env;
const H = () => ({ Authorization: `token ${GH_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" });

async function ghGet() {
  const url = `${GH}/repos/${GH_REPO}/contents/${encodeURIComponent(GH_PATH)}?ref=${GH_BRANCH}`;
  const r = await fetch(url, { headers: H(), cache: "no-store" });
  if (r.status === 404) return { json: null, sha: null };
  if (!r.ok) throw new Error("GitHub GET " + r.status);
  const j = await r.json();
  return { json: JSON.parse(Buffer.from(j.content, "base64").toString("utf8")), sha: j.sha };
}
async function ghPut(state) {
  const cur = await ghGet().catch(() => ({ sha: null }));
  const body = { message: `k1omega ${new Date().toISOString()}`, content: Buffer.from(JSON.stringify(state, null, 2)).toString("base64"), branch: GH_BRANCH, ...(cur.sha ? { sha: cur.sha } : {}) };
  const r = await fetch(`${GH}/repos/${GH_REPO}/contents/${encodeURIComponent(GH_PATH)}`, { method: "PUT", headers: H(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error("GitHub PUT " + r.status + " " + (await r.text()));
}

export async function GET() {
  if (!GH_TOKEN || !GH_REPO) return Response.json({ error: "Chýba GH_TOKEN / GH_REPO" }, { status: 500 });
  try { const { json } = await ghGet(); return Response.json(json || {}); }
  catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }
}
export async function PUT(req) {
  if (!GH_TOKEN || !GH_REPO) return Response.json({ error: "Chýba GH_TOKEN / GH_REPO" }, { status: 500 });
  try { await ghPut(await req.json()); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ error: String(e.message || e) }, { status: 500 }); }
}
