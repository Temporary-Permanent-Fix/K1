"use client";
/*
  K1_OMEGA — multi-project process & test tracker (v2)
  Dark PREDICTION theme (#0E1117 / green #00b84a), Slovak UI.

  ── Deploy (Next.js + Vercel, ako PREDICTION) ─────────────────────────────
  1) Vlož tento súbor ako komponent (napr. app/page.jsx alebo components/K1Omega.jsx).
  2) Online zdieľané úložisko: doplň API route /api/state (viď súbor api-state.js),
     ktorá číta/zapisuje JSON cez GitHub Contents API. Env na Verceli:
        GH_TOKEN, GH_REPO (owner/repo), GH_BRANCH=main, GH_PATH=data/k1omega.json
  3) Ak /api/state nie je dostupné (lokálny beh), appka spadne na localStorage,
     takže sa dá testovať aj bez backendu.
  4) Používatelia: zoznam { email, name, hash } sa drží v štáte. Heslo = SHA-256.
     Dočasný login: test@alza.cz / test  — vymeň, keď dodáš zoznam.

  Pozn.: viac odkazov na krok/test (Jira aj Asana/Confluence/…); chip = Jira kľúč
  alebo názov aplikácie. Do diagramu sa premietajú len Jira issues.
*/
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Folders, Plus, Search, RefreshCw, ChevronRight, ChevronDown, Flag, Bug,
  CircleCheck, CircleDashed, PlayCircle, ListChecks, User, Calendar, Target,
  AlertTriangle, Save, ExternalLink, Download, LogOut, X, Trash2, Link2,
  ListOrdered, LayoutList, Workflow, FileText, Upload, FileSpreadsheet,
  CheckSquare, Square, GitBranch, Printer, MessageCircle, Send,
} from "lucide-react";

/* ───────────────────────── theme ───────────────────────── */
const T = {
  bg: "#0E1117", panel: "#161B22", panel2: "#0D1117", border: "#30363D",
  borderSoft: "#21262D", text: "#E6EDF3", text2: "#C9D1D9", muted: "#8B949E",
  dim: "#6E7681", green: "#00b84a", greenDeep: "#00963C", greenLink: "#55df36",
  amber: "#D29922", red: "#F85149", slate: "#3D444D",
};
const STATUS = {
  Done: T.green, Prebieha: T.amber, Blocked: T.red, "Out of scope": T.dim, Nezačaté: T.slate,
};
const TEST_RESULT = { OK: T.green, BUG: T.red, Blocked: T.amber, "Out of scope": T.dim, "": T.slate };
const SEVERITIES = ["Nízka", "Stredná", "Vysoká", "Kritická"];
const BUG_STATUS = ["Otvorený", "V riešení", "Vyriešený"];
const SEV_COLOR = { "Nízka": T.dim, "Stredná": T.amber, "Vysoká": T.red, "Kritická": T.red };
const BUGST_COLOR = { "Otvorený": T.red, "V riešení": T.amber, "Vyriešený": T.green };

/* ───────────────────────── utils ───────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const JIRA_BASE = "https://jira.alza.cz/browse/";
const APP_BY_HOST = [
  [/atlassian\.net|jira\./, "Jira"], [/asana\.com/, "Asana"],
  [/confluence|wiki\./, "Confluence"], [/sharepoint\.com/, "SharePoint"],
  [/github\.com/, "GitHub"], [/miro\.com/, "Miro"],
  [/teams\.microsoft|teams\.live/, "Teams"], [/notion\.so/, "Notion"],
];
function jiraKey(url) {
  const m = String(url || "").match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
  if (m) return m[1];
  const b = String(url || "").match(/^([A-Z][A-Z0-9]+-\d+)$/); // holý kľúč
  return b ? b[1] : null;
}
function normalizeUrl(url) {
  const t = String(url || "").trim();
  if (!t) return "";
  if (jiraKey(t) && !/^https?:/i.test(t)) return JIRA_BASE + t; // holý kľúč → Jira URL
  return /^https?:\/\//i.test(t) ? t : "https://" + t;
}
function linkLabel(link) {
  if (link.label && link.label.trim()) return link.label.trim();
  const url = normalizeUrl(link.url);
  const k = jiraKey(url);
  if (k) return k;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const [re, name] of APP_BY_HOST) if (re.test(host)) return name;
    return host;
  } catch { return "odkaz"; }
}
function isJiraLink(link) { return !!jiraKey(normalizeUrl(link.url)); }

/* ───────────────────────── seed ───────────────────────── */
const step = (name, type, status, links = [], bugs = []) =>
  ({ id: uid(), name, type, status, links, bugs });
const proc = (name, status, description, steps) =>
  ({ id: uid(), name, status, priority: "", description: description || "", steps });
const group = (name, color, processes) => ({ id: uid(), name, color, processes, integrationTests: { k1wms: false, wmswes: false } });
const L = (url, label = "") => ({ url, label });

function seedProjects() {
  const p4ds = {
    id: uid(),
    name: "4DS · Pallet Shuttle",
    subtitle: "SKLC3 · príjem, dekantácia, expedícia",
    milestoneName: "F1", milestoneDate: "2026-09-15",
    issues: seedIssues(), documents: [],
    groups: [
      group("Predpríjem", T.greenDeep, [
        proc("Vkladanie prázdnych plastových paliet", "Done", "", [
          step("Systémové vloženie", "system", "Done"),
          step("Sken SSCC kódu", "system", "Done"),
          step("Manuálne vloženie", "manual", "Done", [L(JIRA_BASE + "LOG-35818")]),
        ]),
        proc("Vkladanie paliet s novým tovarom", "Prebieha", "", [
          step("Sken palety", "system", "Blocked", [L(JIRA_BASE + "LOG-36288")],
            [{ id: uid(), title: "Sken zlyháva pri poškodenom štítku", severity: "Vysoká" }]),
          step("Manuálne overenie", "manual", "Done"),
        ]),
      ]),
      group("Manuálna dekantácia", T.amber, [
        proc("Dekantácia", "Prebieha", "Časť out of scope, časť in dev.", [
          step("Volanie zdrojovej palety", "system", "Done"),
          step("Manuálna dekantácia paliet", "manual", "Blocked",
            [L(JIRA_BASE + "LOG-36042"), L("https://app.asana.com/0/12/34", "Asana – dekantácia")],
            [{ id: uid(), title: "Nesprávne párovanie SKU", severity: "Kritická" }]),
          step("Kontrola množstva", "manual", "Done"),
          step("Potvrdenie a odvoz palety", "system", "Nezačaté"),
        ]),
      ]),
      group("Automatická dekantácia", T.greenDeep, [
        proc("Dekantácia", "Prebieha", "", [
          step("Automatický príjem monopalety", "system", "Done", [L(JIRA_BASE + "LOG-35957")]),
          step("Async naskladnenie do 4DS", "system", "Blocked", [L(JIRA_BASE + "LOG-36301")],
            [{ id: uid(), title: "Async naskladnenie padá po skene", severity: "Vysoká" }]),
          step("Kontrola senzorov prázdnosti", "system", "Done"),
        ]),
      ]),
    ],
    cycles: [
      {
        id: uid(), name: "Cyklus 1", from: "2026-08-19", to: "2026-08-30",
        tests: [
          mkTest("Dekantácia mix palety — put-to-light", "Manuálna dekantácia",
            "Po umiestnení posledného kusu put-to-light zhasne a paleta sa potvrdí.",
            "OK", "test@alza.cz", [L(JIRA_BASE + "LOG-36042")],
            [attempt("Prešlo bez problému", true), attempt("Prešlo", true)]),
        ],
      },
      {
        id: uid(), name: "Cyklus 2", from: "2026-09-01", to: "2026-09-12",
        tests: [
          mkTest("Dekantácia mix palety — put-to-light", "Manuálna dekantácia",
            "Po umiestnení posledného kusu put-to-light zhasne a paleta sa potvrdí.",
            "BUG", "test@alza.cz", [L(JIRA_BASE + "LOG-36042")],
            [attempt("Put-to-light zhaslo, potvrdenie OK", true),
             attempt("Svetlo zostalo svietiť, timeout", false),
             attempt("OK bez problému", true),
             attempt("Paleta uviazla na stanici", false)]),
          mkTest("Async naskladnenie do 4DS po skene", "Automatická dekantácia",
            "Po skene SSCC prebehne async naskladnenie do 4DS bez chyby.",
            "BUG", "test@alza.cz", [L(JIRA_BASE + "LOG-36301")],
            [attempt("Chyba príjmu, neúplný zápis", false)]),
        ],
      },
    ],
  };
  return [p4ds];
}
function attempt(text, ok) { return { id: uid(), text, ok, at: new Date().toISOString().slice(0, 10) }; }
function mkTest(name, area, expected, result, testerEmail, links, attempts) {
  return { id: uid(), name, area, expected, result, testerEmail, links, attempts: attempts || [] };
}
// Jira status -> app bucket (pre farbu v diagrame/prehľade)
function bucketOf(status, type) {
  const s = String(status || "").toLowerCase();
  if ((type || "").toLowerCase() === "bug" && s !== "closed" && s !== "done") return "Blocked";
  if (["closed", "done", "hotovo"].includes(s)) return "Done";
  if (["code review", "final testing", "developing", "in progress", "prebieha"].some((x) => s.includes(x))) return "Prebieha";
  if (["postponed", "odložené"].includes(s)) return "Out of scope";
  return "Nezačaté";
}
const issue = (key, summary, status, assignee, type, epic) =>
  ({ key, summary, status, assignee, type, epic, url: JIRA_BASE + key });
function seedIssues() {
  return [
    issue("LOG-33440", "Modul pravidiel smerovania paliet", "Open", "Simona Fratila", "Story", "Smerovanie"),
    issue("LOG-33441", "Modul v čítačkách pre smerovanie", "Open", "Filip Koiš", "Story", "Smerovanie"),
    issue("LOG-35519", "Kontrola sekcie pri potvrdzovaní do 4DS", "Developing", "Jonáš Bujok", "Story", "Smerovanie"),
    issue("LOG-33456", "Modul naskladňovanie", "Open", "Filip Koiš", "Story", "Manuálna dekantácia"),
    issue("LOG-35770", "Načítanie + dotisk prijatej palety", "Open", "Zdeněk Pekáček", "Story", "Manuálna dekantácia"),
    issue("LOG-35957", "Automatický príjem monopalet", "Open", "Jonáš Bujok", "Story", "Automatická dekantácia"),
    issue("LOG-36301", "Chyby async naskladnenie do 4DS", "Open", "Zdeněk Pekáček", "Bug", "Automatická dekantácia"),
    issue("LOG-36323", "Autonaskladnenie v čítačke", "Open", "Miroslav Baloga", "Bug", "Automatická dekantácia"),
    issue("LOG-36042", "Nesprávne párovanie SKU pri dekantácii", "Open", "Filip Koiš", "Bug", "Manuálna dekantácia"),
  ];
}
function seedState() {
  return {
    users: [{ email: "test@alza.cz", name: "Testovací login",
      hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" }], // "test"
    projects: seedProjects(),
  };
}

/* ───────────────────────── storage ───────────────────────── */
const LS_KEY = "k1omega:v2";
async function loadState() {
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (r.ok) { const j = await r.json(); if (j && j.projects) return j; }
  } catch { /* fallback below */ }
  try { const s = localStorage.getItem(LS_KEY); if (s) return JSON.parse(s); } catch {}
  return seedState();
}
async function saveState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  try { await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) }); } catch {}
}

/* ───────────────────────── evaluation ───────────────────────── */
function evalTest(t) {
  const n = t.attempts.length;
  const ok = t.attempts.filter((a) => a.ok).length;
  const pct = n ? Math.round((ok / n) * 100) : null;
  return { n, ok, fail: n - ok, pct };
}
function cycleStats(cycle) {
  const tests = cycle.tests || [];
  const res = { total: tests.length, OK: 0, BUG: 0, Blocked: 0, Out: 0, pct: null };
  let done = 0;
  tests.forEach((t) => {
    if (t.result === "OK") res.OK++;
    else if (t.result === "BUG") res.BUG++;
    else if (t.result === "Blocked") res.Blocked++;
    else if (t.result === "Out of scope") res.Out++;
    if (t.result) done++;
  });
  res.pct = tests.length ? Math.round((res.OK / tests.length) * 100) : null;
  res.done = done;
  return res;
}
function projectReadiness(pr) {
  let total = 0, sum = 0;
  (pr.groups || []).forEach((g) => g.processes.forEach((p) => {
    total++;
    sum += p.status === "Done" ? 1 : p.status === "Prebieha" ? 0.5 : 0;
  }));
  return total ? Math.round((sum / total) * 100) : 0;
}
function statusSplit(pr) {
  const c = { Done: 0, Prebieha: 0, Blocked: 0, Nezačaté: 0 };
  let total = 0;
  (pr.groups || []).forEach((g) => g.processes.forEach((p) => {
    total++; c[p.status] = (c[p.status] || 0) + 1;
  }));
  const pct = (k) => (total ? Math.round((c[k] / total) * 100) : 0);
  return { total, done: pct("Done"), prebieha: pct("Prebieha"), blocked: pct("Blocked"), nezacate: pct("Nezačaté") };
}
function openBugs(pr) {
  let n = 0;
  (pr.groups || []).forEach((g) => g.processes.forEach((p) => p.steps.forEach((s) => (s.bugs || []).forEach((b) => { if ((b.status || "Otvorený") !== "Vyriešený") n++; }))));
  return n;
}
function daysTo(dateStr) {
  if (!dateStr) return null;
  const d = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return d;
}

/* ───────────────────────── small UI ───────────────────────── */
const card = { background: T.panel, border: `1px solid ${T.borderSoft}`, borderRadius: 12 };
function Pill({ children, bg, fg }) {
  return <span style={{ fontSize: 10.5, background: bg, color: fg, borderRadius: 99, padding: "2px 8px", fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>;
}
function statusPill(status) {
  const c = STATUS[status] || T.slate;
  const fg = status === "Nezačaté" || status === "Out of scope" ? T.muted : "#08160c";
  const bg = status === "Nezačaté" ? T.borderSoft : c;
  return <Pill bg={bg} fg={status === "Nezačaté" ? T.muted : fg}>{status}</Pill>;
}
function LinkChip({ link }) {
  const url = normalizeUrl(link.url);
  const jira = isJiraLink(link) && (!link.label || !link.label.trim());
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ color: T.greenLink, textDecoration: "none", fontFamily: jira ? "ui-monospace,monospace" : "inherit",
        fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {linkLabel(link)}{!jira && <ExternalLink size={11} />}
    </a>
  );
}

/* ───────────────────────── app ───────────────────────── */
export default function K1Omega() {
  const [state, setState] = useState(null);
  const [me, setMe] = useState(null);
  const [route, setRoute] = useState({ view: "projects", projectId: null, tab: "prehlad" });

  useEffect(() => { loadState().then(setState); }, []);
  const persist = useCallback((next) => { setState(next); saveState(next); }, []);

  if (!state) return <Shell><div style={{ color: T.muted, padding: 40 }}>Načítavam…</div></Shell>;
  if (!me) return <Login state={state} onLogin={setMe} />;

  const project = state.projects.find((p) => p.id === route.projectId) || null;
  const setProject = (fn) => persist({ ...state, projects: state.projects.map((p) => (p.id === project.id ? fn(p) : p)) });

  return (
    <Shell>
      <div style={{ ...card, overflow: "hidden" }}>
        <Header me={me} project={project} onLogout={() => setMe(null)}
          onHome={() => setRoute({ view: "projects", projectId: null, tab: "prehlad" })} />
        {route.view === "projects" ? (
          <Portfolio state={state} persist={persist}
            onOpen={(id) => setRoute({ view: "project", projectId: id, tab: "prehlad" })} />
        ) : (
          <ProjectView project={project} setProject={setProject} me={me}
            tab={route.tab} setTab={(tab) => setRoute((r) => ({ ...r, tab }))} />
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, padding: 20,
      fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

/* ───────────────────────── login ───────────────────────── */
function Login({ state, onLogin }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const submit = async () => {
    setErr("");
    const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return setErr("Neznámy e-mail.");
    if ((await sha256(pw)) !== u.hash) return setErr("Nesprávne heslo.");
    onLogin({ email: u.email, name: u.name });
  };
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "grid", placeItems: "center", padding: 20, fontFamily: "-apple-system,sans-serif" }}>
      <div style={{ ...card, width: 340, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: T.panel2, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", color: T.green }}><Workflow size={19} /></span>
          <div><div style={{ color: T.text, fontWeight: 600 }}>K1_OMEGA</div><div style={{ color: T.muted, fontSize: 11 }}>process &amp; test tracker</div></div>
        </div>
        {["E-mail", "Heslo"].map((lbl, i) => (
          <div key={lbl} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{lbl}</div>
            <input type={i ? "password" : "email"} value={i ? pw : email}
              onChange={(e) => (i ? setPw : setEmail)(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{ width: "100%", boxSizing: "border-box", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 11px", color: T.text, fontSize: 13, outline: "none" }} />
          </div>
        ))}
        {err && <div style={{ color: T.red, fontSize: 12, margin: "4px 0 8px" }}>{err}</div>}
        <button onClick={submit} style={{ width: "100%", background: T.green, color: T.bg, border: "none", borderRadius: 8, padding: "10px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Prihlásiť sa</button>
        <div style={{ fontSize: 10.5, color: T.dim, marginTop: 10, textAlign: "center" }}>Dočasne: test@alza.cz / test</div>
      </div>
    </div>
  );
}

/* ───────────────────────── header ───────────────────────── */
function Header({ me, project, onLogout, onHome }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${T.borderSoft}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span onClick={onHome} style={{ width: 28, height: 28, borderRadius: 8, background: T.panel2, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", color: T.green, cursor: "pointer" }}><Workflow size={17} /></span>
        {project ? (
          <div style={{ fontSize: 12, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
            <span onClick={onHome} style={{ cursor: "pointer" }}>Projekty</span><ChevronRight size={13} />
            <span style={{ color: T.text, fontWeight: 500 }}>{project.name}</span>
          </div>
        ) : (
          <div><div style={{ fontSize: 14, fontWeight: 500 }}>K1_OMEGA</div><div style={{ fontSize: 11, color: T.muted }}>Multi-project process &amp; test tracker</div></div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 5 }}><User size={13} />{me.name}</span>
        <span onClick={onLogout} title="Odhlásiť" style={{ width: 28, height: 28, borderRadius: 8, background: T.panel2, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", color: T.muted, cursor: "pointer" }}><LogOut size={15} /></span>
      </div>
    </div>
  );
}

/* ───────────────────────── portfolio ───────────────────────── */
function Portfolio({ state, persist, onOpen }) {
  const projects = state.projects;
  const avg = projects.length ? Math.round(projects.reduce((s, p) => s + projectReadiness(p), 0) / projects.length) : 0;
  const bugs = projects.reduce((s, p) => s + openBugs(p), 0);
  const near = projects.map((p) => daysTo(p.milestoneDate)).filter((d) => d != null && d >= 0).sort((a, b) => a - b)[0];
  const addProject = () => {
    const np = { id: uid(), name: "Nový projekt", subtitle: "", milestoneName: "", milestoneDate: "", groups: [], cycles: [] };
    persist({ ...state, projects: [...projects, np] });
  };
  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}><Folders size={15} color={T.green} /><span style={{ fontWeight: 500 }}>Projekty</span></div>
        <button onClick={addProject} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: T.green, color: T.bg, border: "none", borderRadius: 8, padding: "6px 11px", fontWeight: 500, cursor: "pointer" }}><Plus size={15} />Nový projekt</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
        <Metric label="Projekty" value={projects.length} />
        <Metric label="Priem. pripravenosť" value={avg + "%"} color={T.green} />
        <Metric label="Bugy spolu" value={bugs} color={bugs ? T.red : T.text} />
        <Metric label="Najbližší míľnik" value={near == null ? "–" : near + " dní"} color={T.amber} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
        {projects.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => onOpen(p.id)} />)}
        <div onClick={addProject} style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: T.muted, minHeight: 170, cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: T.panel, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", color: T.green }}><Plus size={20} /></span>
          <div style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>Nový projekt</div>
        </div>
      </div>
    </div>
  );
}
function Metric({ label, value, color }) {
  return <div style={{ background: T.panel, border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: "10px 12px" }}>
    <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 500, color: color || T.text }}>{value}</div>
  </div>;
}
function ProjectCard({ p, onOpen }) {
  const r = projectReadiness(p); const s = statusSplit(p); const d = daysTo(p.milestoneDate);
  return (
    <div style={{ background: T.panel, border: `2px solid ${T.green}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div><div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 11, color: T.muted }}>{p.subtitle}</div></div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}><span style={{ fontSize: 28, fontWeight: 500, color: T.green, lineHeight: 1 }}>{r}%</span><span style={{ fontSize: 11, color: T.muted }}>pripravenosť</span></div>
      <SplitBar s={s} h={8} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", fontSize: 11.5, color: T.muted }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><ListChecks size={14} />{s.total} procesov</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Bug size={14} color={T.red} />{openBugs(p)} bugov</span>
        {p.milestoneDate && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Flag size={14} />{p.milestoneName || "míľnik"}{d != null ? ` · ${d}d` : ""}</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", borderTop: `1px solid ${T.borderSoft}`, paddingTop: 9 }}>
        <span onClick={onOpen} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: T.greenLink, fontWeight: 500, cursor: "pointer" }}>Otvoriť<ChevronRight size={15} /></span>
      </div>
    </div>
  );
}
function SplitBar({ s, h = 8 }) {
  const seg = [[s.done, T.greenDeep], [s.prebieha, T.amber], [s.blocked, T.red], [s.nezacate, T.slate]];
  return <div style={{ display: "flex", height: h, borderRadius: 99, overflow: "hidden", background: T.borderSoft }}>
    {seg.map(([w, c], i) => <div key={i} style={{ width: w + "%", background: c }} />)}
  </div>;
}

/* ───────────────────────── project view ───────────────────────── */
const TABS = [["prehlad", "Prehľad"], ["tok", "Procesný tok"], ["test", "Testovanie"], ["jira", "Odkazy"], ["dok", "Dokument"]];
function ProjectView({ project, setProject, me, tab, setTab }) {
  const [showImport, setShowImport] = useState(false);
  if (!project) return <div style={{ padding: 24, color: T.muted }}>Projekt neexistuje.</div>;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", borderBottom: `1px solid ${T.borderSoft}`, fontSize: 12.5 }}>
        <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
          {TABS.map(([k, lbl]) => (
            <span key={k} onClick={() => setTab(k)} style={{ padding: "10px 12px", whiteSpace: "nowrap", cursor: "pointer", color: tab === k ? T.text : T.muted, fontWeight: tab === k ? 500 : 400, borderBottom: `2px solid ${tab === k ? T.green : "transparent"}` }}>{lbl}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flex: "none", margin: "4px 0" }}>
          <button onClick={() => exportExcel(project)} title="Export do Excelu" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, background: T.panel, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}><FileSpreadsheet size={14} color={T.green} />XLSX</button>
          <button onClick={() => exportPDF(project)} title="Export do PDF / tlač" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, background: T.panel, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}><Printer size={14} color={T.green} />PDF</button>
          <button onClick={() => setShowImport(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: T.panel, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 11px", cursor: "pointer" }}><Upload size={14} color={T.green} />Import</button>
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {tab === "prehlad" && <Prehlad project={project} />}
        {tab === "tok" && <ProcesnyTok project={project} setProject={setProject} />}
        {tab === "test" && <Testovanie project={project} setProject={setProject} me={me} />}
        {tab === "jira" && <OdkazyTab project={project} />}
        {tab === "dok" && <DokumentTab project={project} setProject={setProject} me={me} />}
      </div>
      {showImport && <ImportModal project={project} setProject={setProject} me={me} onClose={() => setShowImport(false)} />}
      <ChatWidget project={project} />
    </div>
  );
}

/* ── Prehľad ── */
function Prehlad({ project }) {
  const r = projectReadiness(project); const s = statusSplit(project); const d = daysTo(project.milestoneDate);
  const bugs = openBugs(project);
  const today = new Date().toLocaleDateString("sk-SK");
  const areas = project.groups.map((g) => {
    let tot = 0, sum = 0;
    g.processes.forEach((p) => { tot++; sum += p.status === "Done" ? 1 : p.status === "Prebieha" ? 0.5 : 0; });
    const pct = tot ? Math.round((sum / tot) * 100) : 0;
    const col = pct >= 75 ? T.greenDeep : pct >= 40 ? T.amber : pct > 0 ? T.red : T.dim;
    return { name: g.name, pct, col };
  });
  const lastBugs = [];
  project.groups.forEach((g) => g.processes.forEach((p) => p.steps.forEach((st) =>
    (st.bugs || []).forEach((b) => { if ((b.status || "Otvorený") !== "Vyriešený") lastBugs.push({ ...b, link: (st.links || []).find(isJiraLink) }); }))));
  return (
    <div>
      <div style={{ ...card, padding: "15px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 170 }}>
            <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 6 }}>Celková pripravenosť projektu</div>
            <div style={{ fontSize: 40, fontWeight: 500, color: T.green, lineHeight: 1 }}>{r}%</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11.5, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px" }}><Calendar size={14} color={T.muted} />stav k {today}</div>
          </div>
          <div style={{ flex: 1, minWidth: 230 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted, marginBottom: 6 }}><span>Rozloženie stavu ({s.total} procesov)</span><span>{project.milestoneName}</span></div>
            <SplitBar s={s} h={12} />
            <div style={{ display: "flex", gap: 12, marginTop: 9, fontSize: 10.5, color: T.muted, flexWrap: "wrap" }}>
              <Leg c={T.greenDeep} t={`hotové ${s.done}%`} /><Leg c={T.amber} t={`prebieha ${s.prebieha}%`} />
              <Leg c={T.red} t={`blokované ${s.blocked}%`} /><Leg c={T.slate} t={`nezačaté ${s.nezacate}%`} />
            </div>
            {project.milestoneDate && <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 11, fontSize: 11.5, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 11px" }}><Flag size={14} color={T.green} /><span>{project.milestoneName} · {new Date(project.milestoneDate).toLocaleDateString("sk-SK")}</span><span style={{ color: T.muted }}>·</span><span style={{ color: T.amber }}>{d != null ? `o ${d} dní` : ""}</span></div>}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 16 }}>
        <Metric label="Procesy" value={s.total} />
        <Metric label="Hotové" value={s.done + "%"} color={T.green} />
        <Metric label="Otvorené bugy" value={bugs} color={bugs ? T.red : T.text} />
        <Metric label="Cykly" value={(project.cycles || []).length} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 12 }}>
        <div style={{ ...card, padding: "13px 14px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Priebeh podľa oblastí</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {areas.map((a) => (
              <div key={a.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span>{a.name}</span><span style={{ color: T.muted }}>{a.pct}%</span></div>
                <div style={{ height: 7, background: T.borderSoft, borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: Math.max(a.pct, 2) + "%", background: a.col }} /></div>
              </div>
            ))}
            {areas.length === 0 && <div style={{ color: T.dim, fontSize: 12 }}>Zatiaľ žiadne oblasti.</div>}
          </div>
        </div>
        <div style={{ ...card, padding: "13px 14px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Posledné bugy</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 12 }}>
            {lastBugs.slice(0, 6).map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: b.severity === "Kritická" || b.severity === "Vysoká" ? T.red : T.amber, flex: "none" }} />
                {b.link && <LinkChip link={b.link} />}
                <span style={{ color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
              </div>
            ))}
            {lastBugs.length === 0 && <div style={{ color: T.dim }}>Žiadne bugy.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
function Leg({ c, t }) { return <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: c }} />{t}</span>; }

/* ── Procesný tok (Zoznam / Diagram) ── */
function ProcesnyTok({ project, setProject }) {
  const [view, setView] = useState("zoznam");
  const [edit, setEdit] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const setGroupIT = (gid, key, val) => setProject((pr) => ({ ...pr, groups: pr.groups.map((g) => (g.id === gid ? { ...g, integrationTests: { ...(g.integrationTests || {}), [key]: val } } : g)) }));
  const [sel, setSel] = useState(project.groups[0]?.processes[0]?.id || null);
  const selProc = useMemo(() => {
    for (const g of project.groups) for (const p of g.processes) if (p.id === sel) return { g, p };
    return null;
  }, [project, sel]);
  const [q, setQ] = useState("");
  const groupsF = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return project.groups;
    const m = (t) => String(t || "").toLowerCase().includes(ql);
    const pMatch = (p) => m(p.name) || m(p.description) || (p.steps || []).some((s) => m(s.name) || (s.links || []).some((l) => m(linkLabel(l))));
    return project.groups
      .map((g) => (m(g.name) ? g : { ...g, processes: g.processes.filter(pMatch) }))
      .filter((g) => m(g.name) || g.processes.length);
  }, [project, q]);

  const addGroup = () => setProject((pr) => ({ ...pr, groups: [...pr.groups, { id: uid(), name: "Nový celok", color: T.greenDeep, processes: [] }] }));
  const renameGroup = (gid, name) => setProject((pr) => ({ ...pr, groups: pr.groups.map((g) => (g.id === gid ? { ...g, name } : g)) }));
  const deleteGroup = (gid) => { if (!confirm("Zmazať celok aj s jeho procesmi?")) return; setProject((pr) => ({ ...pr, groups: pr.groups.filter((g) => g.id !== gid) })); };
  const addProcess = (gid) => {
    const np = { id: uid(), name: "Nový proces", status: "Nezačaté", description: "", steps: [] };
    setProject((pr) => ({ ...pr, groups: pr.groups.map((g) => (g.id === gid ? { ...g, processes: [...g.processes, np] } : g)) }));
    setSel(np.id);
  };
  const deleteProcess = (pid) => { if (!confirm("Zmazať proces?")) return; setProject((pr) => ({ ...pr, groups: pr.groups.map((g) => ({ ...g, processes: g.processes.filter((p) => p.id !== pid) })) })); };

  const nb = { background: "transparent", border: "none", color: T.dim, cursor: "pointer", display: "inline-flex", alignItems: "center" };
  const inp = { background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 6px", color: T.text, fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "inline-flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 3 }}>
          {[["zoznam", "Zoznam", LayoutList], ["diagram", "Diagram", Workflow]].map(([k, lbl, Icon]) => (
            <span key={k} onClick={() => setView(k)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: view === k ? T.green : "transparent", color: view === k ? T.bg : T.muted, fontWeight: view === k ? 500 : 400 }}><Icon size={14} />{lbl}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view === "zoznam" && (
            <button onClick={() => setEdit((e) => !e)} style={{ fontSize: 12, color: edit ? T.bg : T.muted, background: edit ? T.green : T.panel, border: `1px solid ${edit ? T.green : T.border}`, borderRadius: 8, padding: "6px 11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: edit ? 600 : 400 }}><FileText size={13} />{edit ? "Hotovo" : "Upraviť"}</button>
          )}
          {view === "diagram" && <button onClick={() => downloadDrawio(project)} style={{ fontSize: 11.5, color: T.muted, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Download size={13} />.drawio</button>}
        </div>
      </div>

      {view === "zoznam" ? (
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, border: `1px solid ${T.borderSoft}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ borderRight: `1px solid ${T.borderSoft}`, padding: "12px 10px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 8px", marginBottom: 10 }}>
              <Search size={13} color={T.muted} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="hľadať…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: T.text, fontSize: 11.5 }} />
              {q && <X size={13} color={T.dim} style={{ cursor: "pointer" }} onClick={() => setQ("")} />}
            </div>
            {groupsF.map((g) => {
              const isOpen = q.trim() ? true : !collapsed[g.id];
              const it = g.integrationTests || { k1wms: false, wmswes: false };
              return (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, marginBottom: 5 }}>
                  <span onClick={() => setCollapsed((c) => ({ ...c, [g.id]: isOpen }))} style={{ cursor: "pointer", color: T.muted, display: "inline-flex" }}>{isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: g.color, flex: "none" }} />
                  {edit ? <input value={g.name} onChange={(e) => renameGroup(g.id, e.target.value)} style={inp} /> : <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>}
                  {edit && <button title="Zmazať celok" onClick={() => deleteGroup(g.id)} style={nb}><Trash2 size={13} /></button>}
                </div>
                {isOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 14, fontSize: 11.5 }}>
                  {g.processes.map((p) => {
                    const on = p.id === sel;
                    return <span key={p.id} onClick={() => setSel(p.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 6, cursor: "pointer", color: on ? T.text : T.muted, background: on ? "rgba(0,184,74,.1)" : "transparent", border: `1px solid ${on ? "rgba(0,184,74,.35)" : "transparent"}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: STATUS[p.status] || T.slate, flex: "none" }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      {p.priority && <span title={"Priorita: " + p.priority} style={{ width: 6, height: 6, borderRadius: 99, background: PRIO_COLOR[p.priority] || T.dim, flex: "none" }} />}
                    </span>;
                  })}
                  {edit && <span onClick={() => addProcess(g.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.green, cursor: "pointer", padding: "3px 6px" }}><Plus size={13} />proces</span>}
                  <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                    {[["k1wms", "K1↔WMS"], ["wmswes", "WMS↔WES"]].map(([k, lbl]) => (
                      <span key={k} onClick={() => edit && setGroupIT(g.id, k, !it[k])} title="Integračný test"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, padding: "2px 6px", borderRadius: 99, cursor: edit ? "pointer" : "default",
                          background: it[k] ? "rgba(0,184,74,.12)" : T.panel2, border: `1px solid ${it[k] ? T.green : T.border}`, color: it[k] ? T.green : T.dim }}>
                        {it[k] ? <CheckSquare size={10} /> : <Square size={10} />}{lbl}
                      </span>
                    ))}
                  </div>
                </div>
                )}
              </div>
              );
            })}
            {edit && <button onClick={addGroup} style={{ width: "100%", marginTop: 4, background: T.panel2, border: `1px dashed ${T.border}`, color: T.green, borderRadius: 8, padding: "7px", cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={14} />Celok</button>}
          </div>
          <div style={{ padding: "14px 16px", minWidth: 0 }}>
            {selProc ? <FlowDetail entry={selProc} edit={edit} issues={project.issues || []} onUpdate={(fn) => updateProc(setProject, selProc.p.id, fn)} onDelete={() => deleteProcess(selProc.p.id)} /> : <div style={{ color: T.dim }}>Vyber proces.</div>}
          </div>
        </div>
      ) : (
        <DiagramView project={project} />
      )}
    </div>
  );
}
function updateProc(setProject, procId, fn) {
  setProject((pr) => ({ ...pr, groups: pr.groups.map((g) => ({ ...g, processes: g.processes.map((p) => (p.id === procId ? fn(p) : p)) })) }));
}
const STATUS_OPTS = ["Done", "Prebieha", "Blocked", "Nezačaté", "Out of scope"];
const PRIORITIES = ["", "Vysoká", "Stredná", "Nízka"];
const PRIO_COLOR = { "Vysoká": T.red, "Stredná": T.amber, "Nízka": T.dim };
function FlowDetail({ entry, onUpdate, onDelete, edit, issues = [] }) {
  const { g, p } = entry;
  const inp = { background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", color: T.text, fontSize: 12, outline: "none" };
  const nb = { background: "transparent", border: "none", color: T.dim, cursor: "pointer", display: "inline-flex", alignItems: "center", padding: 2 };

  const addStep = () => onUpdate((x) => ({ ...x, steps: [...x.steps, { id: uid(), name: "Nový krok", type: "system", status: "Nezačaté", links: [], bugs: [] }] }));
  const setStep = (sid, patch) => onUpdate((x) => ({ ...x, steps: x.steps.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }));
  const delStep = (sid) => onUpdate((x) => ({ ...x, steps: x.steps.filter((s) => s.id !== sid) }));
  const moveStep = (sid, d) => onUpdate((x) => { const i = x.steps.findIndex((s) => s.id === sid); const j = i + d; if (j < 0 || j >= x.steps.length) return x; const a = [...x.steps]; [a[i], a[j]] = [a[j], a[i]]; return { ...x, steps: a }; });
  const addLink = (sid, link) => onUpdate((x) => ({ ...x, steps: x.steps.map((s) => (s.id === sid ? { ...s, links: [...(s.links || []), link] } : s)) }));
  const delLink = (sid, idx) => onUpdate((x) => ({ ...x, steps: x.steps.map((s) => (s.id === sid ? { ...s, links: s.links.filter((_, i) => i !== idx) } : s)) }));
  const addBug = (sid, title) => onUpdate((x) => ({ ...x, steps: x.steps.map((s) => (s.id === sid ? { ...s, bugs: [...(s.bugs || []), { id: uid(), title, severity: "Stredná", status: "Otvorený" }] } : s)) }));
  const delBug = (sid, idx) => onUpdate((x) => ({ ...x, steps: x.steps.map((s) => (s.id === sid ? { ...s, bugs: s.bugs.filter((_, i) => i !== idx) } : s)) }));
  const setBug = (sid, idx, patch) => onUpdate((x) => ({ ...x, steps: x.steps.map((s) => (s.id === sid ? { ...s, bugs: s.bugs.map((b, i) => (i === idx ? { ...b, ...patch } : b)) } : s)) }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        {edit ? (
          <>
            <input value={p.name} onChange={(e) => onUpdate((x) => ({ ...x, name: e.target.value }))} style={{ ...inp, fontSize: 14, fontWeight: 500, flex: 1, minWidth: 160 }} />
            <select value={p.status} onChange={(e) => onUpdate((x) => ({ ...x, status: e.target.value }))} style={{ ...inp, appearance: "auto" }}>{STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}</select>
            <select value={p.priority || ""} onChange={(e) => onUpdate((x) => ({ ...x, priority: e.target.value }))} title="Priorita" style={{ ...inp, appearance: "auto" }}>{PRIORITIES.map((s) => <option key={s} value={s}>{s || "priorita —"}</option>)}</select>
            <button onClick={onDelete} title="Zmazať proces" style={{ ...nb, color: T.red }}><Trash2 size={15} /></button>
          </>
        ) : (
          <><span style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</span>{statusPill(p.status)}
            {p.priority && <Pill bg={T.panel2} fg={PRIO_COLOR[p.priority] || T.dim}>priorita: {p.priority}</Pill>}</>
        )}
      </div>
      {edit ? (
        <input value={p.description} placeholder="popis procesu…" onChange={(e) => onUpdate((x) => ({ ...x, description: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: 14 }} />
      ) : (
        <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 14 }}>{g.name}{p.description ? " · " + p.description : ""}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {p.steps.map((st, i) => (
          <div key={st.id}>
            {edit ? (
              <StepEditor st={st} inp={inp} nb={nb} issues={issues}
                onSet={(patch) => setStep(st.id, patch)} onDel={() => delStep(st.id)}
                onMove={(d) => moveStep(st.id, d)} onAddLink={(l) => addLink(st.id, l)} onDelLink={(idx) => delLink(st.id, idx)}
                onAddBug={(t) => addBug(st.id, t)} onDelBug={(idx) => delBug(st.id, idx)} onSetBug={(idx, patch) => setBug(st.id, idx, patch)} first={i === 0} last={i === p.steps.length - 1} />
            ) : (
              <div style={{ background: T.panel, border: `1px solid ${st.status === "Blocked" ? "rgba(248,81,73,.35)" : T.borderSoft}`, borderLeft: `3px solid ${STATUS[st.status] || T.slate}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 9.5, color: T.muted, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 5, padding: "2px 6px", fontFamily: "ui-monospace,monospace" }}>{st.type === "manual" ? "MAN" : "SYS"}</span>
                    <span style={{ fontSize: 12.5, color: st.status === "Nezačaté" ? T.muted : T.text }}>{st.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {(st.links || []).map((l, li) => <LinkChip key={li} link={l} />)}
                    {(st.bugs || []).length > 0 && <span style={{ fontSize: 10.5, color: T.red, display: "flex", alignItems: "center", gap: 3 }}><Bug size={13} />{st.bugs.length}</span>}
                    {statusPill(st.status)}
                  </div>
                </div>
              </div>
            )}
            {i < p.steps.length - 1 && !edit && <div style={{ textAlign: "center", color: T.slate, padding: "2px 0" }}><ChevronDown size={14} /></div>}
          </div>
        ))}
        {p.steps.length === 0 && <div style={{ color: T.dim, fontSize: 12 }}>Proces nemá kroky.</div>}
        {edit && <button onClick={addStep} style={{ marginTop: 8, background: T.panel2, border: `1px dashed ${T.border}`, color: T.green, borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={14} />Krok</button>}
      </div>
    </div>
  );
}
function StepEditor({ st, inp, nb, issues, onSet, onDel, onMove, onAddLink, onDelLink, onAddBug, onDelBug, onSetBug, first, last }) {
  const [lk, setLk] = useState({ url: "", label: "" });
  const [bugT, setBugT] = useState("");
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.borderSoft}`, borderLeft: `3px solid ${STATUS[st.status] || T.slate}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span onClick={() => onSet({ type: st.type === "manual" ? "system" : "manual" })} title="Prepnúť SYS/MAN" style={{ fontSize: 9.5, color: T.green, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 7px", fontFamily: "ui-monospace,monospace", cursor: "pointer" }}>{st.type === "manual" ? "MAN" : "SYS"}</span>
        <input value={st.name} onChange={(e) => onSet({ name: e.target.value })} style={{ ...inp, flex: 1, minWidth: 140 }} />
        <select value={st.status} onChange={(e) => onSet({ status: e.target.value })} style={{ ...inp, appearance: "auto" }}>{STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}</select>
        <button onClick={() => onMove(-1)} disabled={first} style={{ ...nb, opacity: first ? .3 : 1 }} title="Hore"><ChevronDown size={15} style={{ transform: "rotate(180deg)" }} /></button>
        <button onClick={() => onMove(1)} disabled={last} style={{ ...nb, opacity: last ? .3 : 1 }} title="Dole"><ChevronDown size={15} /></button>
        <button onClick={onDel} style={{ ...nb, color: T.red }} title="Zmazať krok"><Trash2 size={15} /></button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
        {(st.links || []).map((l, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 7, padding: "3px 7px" }}>
            <LinkChip link={l} /><X size={12} color={T.dim} style={{ cursor: "pointer" }} onClick={() => onDelLink(i)} />
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <input value={lk.url} placeholder="URL / Jira kľúč" onChange={(e) => setLk((v) => ({ ...v, url: e.target.value }))} style={{ ...inp, flex: 2, minWidth: 130 }} />
        <input value={lk.label} placeholder="štítok" onChange={(e) => setLk((v) => ({ ...v, label: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 90 }} />
        <button onClick={() => { if (!lk.url.trim()) return; onAddLink({ ...lk }); setLk({ url: "", label: "" }); }} style={{ ...inp, cursor: "pointer", color: T.green }}>+ odkaz</button>
        {issues.length > 0 && (
          <select onChange={(e) => { if (e.target.value) { const it = issues.find((x) => x.key === e.target.value); onAddLink({ url: it.url, label: "" }); e.target.value = ""; } }} style={{ ...inp, appearance: "auto", color: T.muted }} defaultValue="">
            <option value="">+ z Jiry…</option>
            {issues.map((it) => <option key={it.key} value={it.key}>{it.key}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {(st.bugs || []).map((b, i) => (
          <div key={b.id || i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, background: "rgba(248,81,73,.08)", border: `1px solid rgba(248,81,73,.3)`, borderRadius: 7, padding: "4px 7px", fontSize: 11 }}>
            <Bug size={12} color={SEV_COLOR[b.severity] || T.red} />
            <span style={{ flex: 1, minWidth: 90, color: T.text2 }}>{b.title}</span>
            <select value={b.severity || "Stredná"} onChange={(e) => onSetBug(i, { severity: e.target.value })} style={{ ...inp, padding: "2px 5px", appearance: "auto", fontSize: 10.5 }}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select>
            <select value={b.status || "Otvorený"} onChange={(e) => onSetBug(i, { status: e.target.value })} style={{ ...inp, padding: "2px 5px", appearance: "auto", fontSize: 10.5, color: BUGST_COLOR[b.status || "Otvorený"] }}>{BUG_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            <X size={12} color={T.dim} style={{ cursor: "pointer" }} onClick={() => onDelBug(i)} />
          </div>
        ))}
        <input value={bugT} placeholder="+ bug (Enter)…" onChange={(e) => setBugT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && bugT.trim()) { onAddBug(bugT.trim()); setBugT(""); } }} style={{ ...inp, minWidth: 120 }} />
      </div>
    </div>
  );
}

/* ── Diagram (vlastný render z dát) ── */
function nodeColor(status) { return STATUS[status] || T.slate; }
function DiagramView({ project }) {
  const issues = project.issues || [];
  const cols = useMemo(() => {
    const map = {};
    issues.forEach((it) => { const k = it.epic || "Bez oblasti"; (map[k] ||= []).push(it); });
    return Object.entries(map);
  }, [issues]);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: T.green, background: "rgba(0,184,74,.1)", border: `1px solid rgba(0,184,74,.35)`, borderRadius: 8, padding: "5px 9px", display: "inline-flex", alignItems: "center", gap: 5 }}><RefreshCw size={13} />auto-sync · {issues.length} Jira uzlov</span>
      </div>
      {issues.length === 0 ? (
        <div style={{ background: T.panel2, border: `1px dashed ${T.border}`, borderRadius: 10, padding: 24, textAlign: "center", color: T.muted, fontSize: 12.5 }}>
          Žiadne Jira issues. Použi <b style={{ color: T.text }}>Import → Jira</b> a diagram sa vygeneruje automaticky.
        </div>
      ) : (
        <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 22, alignItems: "stretch", minWidth: "min-content" }}>
            {cols.map(([epic, list]) => (
              <div key={epic} style={{ minWidth: 160 }}>
                <div style={{ fontSize: 9.5, letterSpacing: .5, color: T.dim, textTransform: "uppercase", textAlign: "center", marginBottom: 8 }}>{epic}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {list.map((it) => {
                    const c = nodeColor(bucketOf(it.status, it.type));
                    return <a key={it.key} href={it.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", background: T.panel, border: `1px solid ${c}`, borderLeft: `3px solid ${c}`, borderRadius: 7, padding: "7px 8px" }}>
                      <div style={{ fontSize: 10.5, fontFamily: "ui-monospace,monospace", color: T.greenLink }}>{it.key}{it.type === "Bug" ? " 🐞" : ""}</div>
                      <div style={{ fontSize: 9.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.summary}</div>
                    </a>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 10.5, color: T.dim, display: "flex", alignItems: "center", gap: 5 }}>Diagram sa generuje z importovaných Jira issues (zoskupené podľa Epicu) — nový import/zmena stavu sa premietne aj sem a do exportu .drawio. Iné odkazy (Asana…) uzol netvoria.</div>
    </div>
  );
}
function downloadDrawio(project) {
  const cells = [];
  const push = (s) => cells.push(s);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const COLW = 220, NW = 190, NH = 46, X0 = 40, Y0 = 60;
  const byEpic = {};
  (project.issues || []).forEach((it) => { (byEpic[it.epic || "Bez oblasti"] ||= []).push(it); });
  Object.entries(byEpic).forEach(([epic, list], gi) => {
    const x = X0 + gi * COLW;
    push(`<mxCell id="h${gi}" value="${esc(epic)}" style="text;html=1;align=center;fontStyle=1;fillColor=#eceff1;strokeColor=#cfd8dc;rounded=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="20" width="${NW}" height="28" as="geometry"/></mxCell>`);
    list.forEach((it, row) => {
      const col = nodeColor(bucketOf(it.status, it.type));
      const y = Y0 + row * (NH + 16);
      push(`<mxCell id="n${it.key}" value="${esc(it.key + " · " + it.summary)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#161B22;strokeColor=${col};fontColor=#E6EDF3;fontSize=10;align=left;spacingLeft=8;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${NW}" height="${NH}" as="geometry"/></mxCell>`);
    });
  });
  const xml = `<mxfile host="k1omega"><diagram id="k1" name="${esc(project.name)}"><mxGraphModel dx="1000" dy="700" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="1600" pageHeight="1000"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel></diagram></mxfile>`;
  const blob = new Blob([xml], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = (project.name || "diagram").replace(/\W+/g, "_") + ".drawio"; a.click();
  URL.revokeObjectURL(a.href);
}

/* ── Testovanie (cykly + testy + pokusy) ── */
function Testovanie({ project, setProject, me }) {
  const cycles = project.cycles || [];
  const [selCycle, setSelCycle] = useState(cycles[cycles.length - 1]?.id || null);
  const [openTest, setOpenTest] = useState(null);
  const cycle = cycles.find((c) => c.id === selCycle) || cycles[cycles.length - 1] || null;

  const addCycle = () => {
    const prev = cycles[cycles.length - 1];
    const tests = prev ? prev.tests.map((t) => ({ ...t, id: uid(), result: "", attempts: [], links: (t.links || []).map((l) => ({ ...l })) })) : [];
    const nc = { id: uid(), name: `Cyklus ${cycles.length + 1}`, from: "", to: "", tests };
    setProject((pr) => ({ ...pr, cycles: [...(pr.cycles || []), nc] }));
    setSelCycle(nc.id);
  };
  const updateCycle = (fn) => setProject((pr) => ({ ...pr, cycles: pr.cycles.map((c) => (c.id === cycle.id ? fn(c) : c)) }));
  const updateTest = (testId, fn) => updateCycle((c) => ({ ...c, tests: c.tests.map((t) => (t.id === testId ? fn(t) : t)) }));
  const addTest = () => {
    const nt = mkTest("Nový test", project.groups[0]?.name || "", "", "", me.email, [], []);
    updateCycle((c) => ({ ...c, tests: [...c.tests, nt] }));
    setOpenTest(nt.id);
  };

  if (!cycle) return <div style={{ color: T.muted, fontSize: 13 }}>Zatiaľ žiadny cyklus. <span onClick={addCycle} style={{ color: T.greenLink, cursor: "pointer" }}>+ Nový cyklus</span></div>;
  const st = cycleStats(cycle);
  const byArea = {};
  cycle.tests.forEach((t) => { (byArea[t.area || "Bez oblasti"] ||= []).push(t); });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {cycles.map((c) => {
          const cs = cycleStats(c); const on = c.id === cycle.id;
          return <span key={c.id} onClick={() => { setSelCycle(c.id); setOpenTest(null); }} style={{ fontSize: 12, background: on ? "rgba(0,184,74,.1)" : T.panel, border: `1px solid ${on ? T.green : T.border}`, borderRadius: 8, padding: "6px 10px", color: on ? T.text : T.muted, fontWeight: on ? 500 : 400, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{c.name} · {cs.pct == null ? "–" : cs.pct + "%"}</span>;
        })}
        <span onClick={addCycle} style={{ fontSize: 12, background: T.panel, border: `1px dashed ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.green, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Plus size={14} />Nový cyklus</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8, marginBottom: 16 }}>
        <Metric label="Scenáre" value={st.total} />
        <Metric label="OK" value={st.OK} color={T.green} />
        <Metric label="BUG" value={st.BUG} color={T.red} />
        <Metric label="Blocked" value={st.Blocked} color={T.amber} />
        <Metric label="Úspešnosť" value={st.pct == null ? "–" : st.pct + "%"} color={T.green} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={addTest} style={{ fontSize: 12, background: T.green, color: T.bg, border: "none", borderRadius: 8, padding: "6px 11px", fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={14} />Nový test</button>
      </div>

      {Object.entries(byArea).map(([area, tests]) => (
        <div key={area} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: T.greenDeep }} /><span style={{ fontSize: 12.5, fontWeight: 500 }}>{area}</span><span style={{ fontSize: 10.5, color: T.muted }}>{tests.length} scenáre</span></div>
          <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, overflow: "hidden" }}>
            {tests.map((t, i) => (
              <TestRow key={t.id} t={t} last={i === tests.length - 1} open={openTest === t.id}
                onToggle={() => setOpenTest(openTest === t.id ? null : t.id)}
                onUpdate={(fn) => updateTest(t.id, fn)}
                onDelete={() => updateCycle((c) => ({ ...c, tests: c.tests.filter((x) => x.id !== t.id) }))}
                me={me} groups={project.groups} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10.5, color: T.dim, display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>Na sumári vidíš názov + výsledok. Po rozkliknutí sa vyplní čo sa má stať, pokusy (čo sa reálne stalo) a výsledok — pre každý cyklus a testera zvlášť.</div>
    </div>
  );
}
function TestRow({ t, last, open, onToggle, onUpdate, onDelete, me, groups }) {
  const ev = evalTest(t);
  const jira = (t.links || []).find(isJiraLink);
  return (
    <div style={{ borderBottom: last && !open ? "none" : `1px solid ${T.borderSoft}` }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", background: open ? T.panel : "transparent" }}>
        {open ? <ChevronDown size={15} color={T.green} /> : <ChevronRight size={15} color={T.muted} />}
        <span style={{ flex: 1, fontSize: 12, minWidth: 0, fontWeight: open ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
        {ev.n > 0 && <span style={{ fontSize: 10.5, color: T.muted }}>{ev.ok}/{ev.n}</span>}
        {jira && <LinkChip link={jira} />}
        {t.result ? <Pill bg={TEST_RESULT[t.result]} fg={t.result === "Out of scope" ? T.muted : "#08160c"}>{t.result}</Pill> : <Pill bg={T.borderSoft} fg={T.muted}>—</Pill>}
      </div>
      {open && <TestDetail t={t} onUpdate={onUpdate} onDelete={onDelete} me={me} groups={groups} />}
    </div>
  );
}
function TestDetail({ t, onUpdate, onDelete, me, groups }) {
  const [newLink, setNewLink] = useState({ url: "", label: "" });
  const ev = evalTest(t);
  const field = { background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", color: T.text, fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none" };
  const addAttempt = () => onUpdate((x) => ({ ...x, attempts: [...x.attempts, { id: uid(), text: "", ok: true, at: new Date().toISOString().slice(0, 10) }] }));
  return (
    <div style={{ padding: "12px 14px 14px", background: T.panel2, borderTop: `1px solid ${T.borderSoft}`, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <Lbl>Názov testu</Lbl>
          <input value={t.name} onChange={(e) => onUpdate((x) => ({ ...x, name: e.target.value }))} style={field} />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Lbl>Oblasť</Lbl>
          <select value={t.area} onChange={(e) => onUpdate((x) => ({ ...x, area: e.target.value }))} style={{ ...field, appearance: "auto" }}>
            <option value="">—</option>
            {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Lbl><Target size={13} color={T.green} /> Čo sa má stať</Lbl>
        <textarea value={t.expected} onChange={(e) => onUpdate((x) => ({ ...x, expected: e.target.value }))} rows={2} style={{ ...field, resize: "vertical" }} />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <Lbl><ListOrdered size={14} /> Pokusy — čo sa reálne stalo</Lbl>
          <span onClick={addAttempt} style={{ fontSize: 11, color: T.green, background: "rgba(0,184,74,.1)", border: `1px dashed rgba(0,184,74,.35)`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={13} />Pridať pokus</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {t.attempts.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.panel, border: `1px solid ${a.ok ? T.border : "rgba(248,81,73,.3)"}`, borderRadius: 8, padding: "6px 9px" }}>
              <span style={{ fontSize: 10, color: T.muted, fontFamily: "ui-monospace,monospace", width: 16, textAlign: "center" }}>{i + 1}</span>
              <input value={a.text} placeholder="čo sa stalo…" onChange={(e) => onUpdate((x) => ({ ...x, attempts: x.attempts.map((y) => (y.id === a.id ? { ...y, text: e.target.value } : y)) }))} style={{ flex: 1, background: "transparent", border: "none", color: T.text2, fontSize: 12, outline: "none", minWidth: 0 }} />
              {["OK", "Fail"].map((v) => {
                const ok = v === "OK"; const on = a.ok === ok;
                return <span key={v} onClick={() => onUpdate((x) => ({ ...x, attempts: x.attempts.map((y) => (y.id === a.id ? { ...y, ok } : y)) }))} style={{ fontSize: 10, borderRadius: 99, padding: "2px 8px", cursor: "pointer", fontWeight: 500, background: on ? (ok ? T.green : T.red) : T.borderSoft, color: on ? "#08160c" : T.muted }}>{v}</span>;
              })}
              <Trash2 size={13} color={T.dim} style={{ cursor: "pointer" }} onClick={() => onUpdate((x) => ({ ...x, attempts: x.attempts.filter((y) => y.id !== a.id) }))} />
            </div>
          ))}
          {t.attempts.length === 0 && <div style={{ fontSize: 11.5, color: T.dim }}>Zatiaľ žiadny pokus.</div>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: T.muted }}>Vyhodnotenie</div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: T.borderSoft }}>
            <div style={{ width: (ev.pct || 0) + "%", background: T.greenDeep }} /><div style={{ width: (100 - (ev.pct || 0)) + "%", background: ev.n ? T.red : T.borderSoft }} />
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500 }}><span style={{ color: T.green }}>{ev.ok}</span><span style={{ color: T.muted }}> / {ev.n} OK</span></div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <div>
          <Lbl>Výsledok</Lbl>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["OK", "BUG", "Blocked", "Out of scope"].map((r) => {
              const on = t.result === r;
              return <span key={r} onClick={() => onUpdate((x) => ({ ...x, result: r }))} style={{ fontSize: 11, borderRadius: 8, padding: "5px 11px", cursor: "pointer", fontWeight: on ? 500 : 400, background: on ? TEST_RESULT[r] : T.panel, border: `1px solid ${on ? TEST_RESULT[r] : T.border}`, color: on ? (r === "Out of scope" ? T.bg : "#08160c") : T.muted }}>{r}</span>;
            })}
          </div>
        </div>
      </div>

      <div>
        <Lbl><Link2 size={13} /> Odkazy (Jira, Asana, …)</Lbl>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {(t.links || []).map((l, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "4px 8px" }}>
              <LinkChip link={l} />
              <X size={12} color={T.dim} style={{ cursor: "pointer" }} onClick={() => onUpdate((x) => ({ ...x, links: x.links.filter((_, j) => j !== i) }))} />
            </span>
          ))}
          {(t.links || []).length === 0 && <span style={{ fontSize: 11.5, color: T.dim }}>Žiadny odkaz.</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={newLink.url} placeholder="URL alebo Jira kľúč (napr. LOG-123)" onChange={(e) => setNewLink((n) => ({ ...n, url: e.target.value }))} style={{ ...field, flex: 2, minWidth: 180 }} />
          <input value={newLink.label} placeholder="štítok (voliteľné)" onChange={(e) => setNewLink((n) => ({ ...n, label: e.target.value }))} style={{ ...field, flex: 1, minWidth: 120 }} />
          <button onClick={() => { if (!newLink.url.trim()) return; onUpdate((x) => ({ ...x, links: [...(x.links || []), { ...newLink }] })); setNewLink({ url: "", label: "" }); }} style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "0 12px", cursor: "pointer", fontSize: 12 }}>Pridať</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${T.borderSoft}`, paddingTop: 11 }}>
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: T.muted, alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={13} />{t.testerEmail || me.email}</span>
          <Trash2 size={14} color={T.dim} style={{ cursor: "pointer" }} onClick={onDelete} />
        </div>
        <span style={{ fontSize: 11, color: T.muted, display: "inline-flex", alignItems: "center", gap: 5 }}><Save size={14} color={T.green} />ukladá sa priebežne</span>
      </div>
    </div>
  );
}
function Lbl({ children }) { return <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>{children}</div>; }

/* ── Odkazy tab ── */
function OdkazyTab({ project }) {
  const rows = [];
  project.groups.forEach((g) => g.processes.forEach((p) => p.steps.forEach((s) => (s.links || []).forEach((l) => rows.push({ g, p, s, l })))));
  (project.cycles || []).forEach((c) => c.tests.forEach((t) => (t.links || []).forEach((l) => rows.push({ cycle: c, t, l }))));
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 10 }}>Všetky odkazy ({rows.length})</div>
      <div style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 10, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: i === rows.length - 1 ? "none" : `1px solid ${T.borderSoft}` }}>
            <LinkChip link={r.l} />
            <span style={{ fontSize: 11.5, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.s ? `${r.g.name} › ${r.p.name} › ${r.s.name}` : `${r.cycle.name} › ${r.t.name}`}
            </span>
          </div>
        ))}
        {rows.length === 0 && <div style={{ padding: 14, color: T.dim, fontSize: 12 }}>Žiadne odkazy.</div>}
      </div>
    </div>
  );
}

/* ───────────────────────── import: parsing ───────────────────────── */
function findCol(headers, names) {
  const low = headers.map((h) => String(h).toLowerCase().trim());
  for (const n of names) { const i = low.indexOf(n.toLowerCase()); if (i >= 0) return headers[i]; }
  // partial contains
  for (const n of names) { const i = low.findIndex((h) => h.includes(n.toLowerCase())); if (i >= 0) return headers[i]; }
  return null;
}
async function readTable(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const out = Papa.parse(text, { header: true, skipEmptyLines: true });
    return out.data;
  }
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}
async function parseJiraFile(file) {
  const rows = await readTable(file);
  if (!rows.length) return [];
  const h = Object.keys(rows[0]);
  const cK = findCol(h, ["Issue key", "Issue Key", "Key", "Kľúč"]);
  const cS = findCol(h, ["Summary", "Súhrn", "Názov"]);
  const cSt = findCol(h, ["Status", "Stav"]);
  const cA = findCol(h, ["Assignee", "Assignee Name", "Riešiteľ"]);
  const cT = findCol(h, ["Issue Type", "Type", "Typ"]);
  const cE = findCol(h, ["Custom field (Epic Link)", "Epic Link", "Epic", "Epika"]);
  return rows.map((r) => {
    const key = String(r[cK] || "").trim();
    if (!key) return null;
    return { key, summary: String(r[cS] || "").trim(), status: String(r[cSt] || "").trim(),
      assignee: String(r[cA] || "").split("@")[0].trim(), type: String(r[cT] || "Story").trim(),
      epic: String(r[cE] || "").trim() || "Bez oblasti", url: JIRA_BASE + key };
  }).filter(Boolean);
}
async function parseDocx(file) {
  let mod;
  try { mod = await import("mammoth/mammoth.browser.js"); }
  catch { mod = await import("mammoth"); }
  const mammoth = mod.default || mod;
  const arrayBuffer = await file.arrayBuffer();
  const res = await mammoth.convertToHtml({ arrayBuffer });
  const doc = new DOMParser().parseFromString(res.value, "text/html");
  const heads = [...doc.querySelectorAll("h1,h2,h3,h4")].map((el) => ({ level: +el.tagName[1], text: el.textContent.trim() })).filter((x) => x.text);
  const text = doc.body.textContent.replace(/\s+/g, " ").trim();
  return { heads, text };
}
function headsToGroups(heads) {
  // h1/h2 -> skupina (oblasť), h3/h4 -> proces
  const groups = []; let cur = null;
  heads.forEach((hd) => {
    if (hd.level <= 2) { cur = { name: hd.text, processes: [] }; groups.push(cur); }
    else if (cur) cur.processes.push(hd.text);
    else { cur = { name: hd.text, processes: [] }; groups.push(cur); }
  });
  return groups.filter((g) => g.name);
}
async function parseTestsFile(file) {
  const rows = await readTable(file);
  if (!rows.length) return [];
  const h = Object.keys(rows[0]);
  const cN = findCol(h, ["Scenár", "Scenar", "Test", "Názov", "Name", "Summary"]);
  const cAr = findCol(h, ["Oblasť", "Oblast", "Area", "Proces", "Sekcia"]);
  const cE = findCol(h, ["Očakávané", "Ocakavane", "Expected", "Čo sa má stať"]);
  return rows.map((r) => ({ name: String(r[cN] || "").trim(), area: String(r[cAr] || "").trim(),
    expected: String(r[cE] || "").trim() })).filter((t) => t.name);
}

/* ───────────────────────── import modal ───────────────────────── */
function ImportModal({ project, setProject, me, onClose }) {
  const [mode, setMode] = useState("jira"); // jira | doc
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null); // {kind, ...}

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(""); setBusy(true); setPreview(null);
    try {
      if (mode === "jira") {
        const issues = await parseJiraFile(file);
        if (!issues.length) throw new Error("V súbore som nenašla žiadne issues (skontroluj stĺpec Issue key).");
        setPreview({ kind: "jira", issues, fileName: file.name });
      } else {
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (ext === "docx") {
          const { heads, text } = await parseDocx(file);
          setPreview({ kind: "doc", groups: headsToGroups(heads), text, fileName: file.name, fileType: "docx" });
        } else {
          const tests = await parseTestsFile(file);
          setPreview({ kind: "tests", tests, fileName: file.name, fileType: ext });
        }
      }
    } catch (ex) { setErr(String(ex.message || ex)); }
    setBusy(false);
    e.target.value = "";
  };

  const applyJira = () => {
    const incoming = preview.issues;
    setProject((pr) => {
      const cur = [...(pr.issues || [])];
      const byKey = Object.fromEntries(cur.map((i) => [i.key, i]));
      incoming.forEach((it) => { byKey[it.key] = { ...(byKey[it.key] || {}), ...it }; });
      return { ...pr, issues: Object.values(byKey) };
    });
    onClose();
  };
  const applyDoc = () => {
    setProject((pr) => {
      const groups = [...(pr.groups || [])];
      const names = new Set(groups.map((g) => g.name.toLowerCase()));
      preview.groups.forEach((g) => {
        if (names.has(g.name.toLowerCase())) return;
        groups.push({ id: uid(), name: g.name, color: T.greenDeep,
          processes: g.processes.map((pn) => ({ id: uid(), name: pn, status: "Nezačaté", description: "", steps: [] })) });
      });
      const documents = [...(pr.documents || []), { id: uid(), name: preview.fileName, type: preview.fileType,
        uploadedBy: me.email, date: new Date().toISOString().slice(0, 10), text: (preview.text || "").slice(0, 20000) }];
      return { ...pr, groups, documents };
    });
    onClose();
  };
  const applyTests = () => {
    setProject((pr) => {
      const cycles = [...(pr.cycles || [])];
      let last = cycles[cycles.length - 1];
      if (!last) { last = { id: uid(), name: "Cyklus 1", from: "", to: "", tests: [] }; cycles.push(last); }
      const tests = [...last.tests, ...preview.tests.map((t) => mkTest(t.name, t.area, t.expected, "", me.email, [], []))];
      cycles[cycles.length - 1] = { ...last, tests };
      const documents = [...(pr.documents || []), { id: uid(), name: preview.fileName, type: preview.fileType, uploadedBy: me.email, date: new Date().toISOString().slice(0, 10), text: "" }];
      return { ...pr, cycles, documents };
    });
    onClose();
  };

  const box = { background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 560, maxWidth: "100%", maxHeight: "86vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><Upload size={17} color={T.green} />Import do projektu</div>
          <X size={18} color={T.muted} style={{ cursor: "pointer" }} onClick={onClose} />
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "inline-flex", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 3, marginBottom: 14 }}>
            {[["jira", "Jira (CSV/XLSX)", GitBranch], ["doc", "Dokument (docx/xlsx)", FileText]].map(([k, lbl, Icon]) => (
              <span key={k} onClick={() => { setMode(k); setPreview(null); setErr(""); }} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: mode === k ? T.green : "transparent", color: mode === k ? T.bg : T.muted, fontWeight: mode === k ? 500 : 400 }}><Icon size={14} />{lbl}</span>
            ))}
          </div>

          {!preview && (
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `1px dashed ${T.border}`, borderRadius: 10, padding: 26, cursor: "pointer", color: T.muted }}>
              <FileSpreadsheet size={26} color={T.green} />
              <div style={{ fontSize: 13, color: T.text }}>{busy ? "Spracúvam…" : "Vyber súbor"}</div>
              <div style={{ fontSize: 11 }}>{mode === "jira" ? "Jira export .csv alebo .xlsx" : "Procesný popis .docx alebo test scenáre .xlsx/.csv"}</div>
              <input type="file" accept={mode === "jira" ? ".csv,.xlsx,.xls" : ".docx,.xlsx,.xls,.csv"} onChange={onFile} style={{ display: "none" }} />
            </label>
          )}
          {err && <div style={{ color: T.red, fontSize: 12, marginTop: 10 }}>{err}</div>}

          {preview?.kind === "jira" && (
            <div>
              <div style={{ fontSize: 12, color: T.muted, margin: "4px 0 8px" }}>Návrh — nájdených <b style={{ color: T.text }}>{preview.issues.length}</b> issues. Zlúči sa podľa kľúča (existujúce sa aktualizujú, nové pridajú).</div>
              <div style={{ ...box, maxHeight: 260, overflow: "auto" }}>
                {preview.issues.slice(0, 60).map((it) => (
                  <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: `1px solid ${T.borderSoft}`, fontSize: 11.5 }}>
                    <span style={{ fontFamily: "ui-monospace,monospace", color: T.greenLink, flex: "none" }}>{it.key}</span>
                    <span style={{ flex: 1, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.summary}</span>
                    <span style={{ color: T.dim, flex: "none" }}>{it.status}</span>
                  </div>
                ))}
                {preview.issues.length > 60 && <div style={{ padding: 8, fontSize: 11, color: T.dim, textAlign: "center" }}>… a ďalších {preview.issues.length - 60}</div>}
              </div>
              <Actions onCancel={() => setPreview(null)} onApply={applyJira} label="Zlúčiť do projektu" />
            </div>
          )}
          {preview?.kind === "doc" && (
            <div>
              <div style={{ fontSize: 12, color: T.muted, margin: "4px 0 8px" }}>Návrh z <b style={{ color: T.text }}>{preview.fileName}</b> — {preview.groups.length} oblastí. Nové sa pridajú, existujúce (podľa názvu) sa nechajú.</div>
              <div style={{ ...box, maxHeight: 260, overflow: "auto", padding: 10 }}>
                {preview.groups.map((g, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, paddingLeft: 12 }}>{g.processes.join(" · ") || "—"}</div>
                  </div>
                ))}
                {preview.groups.length === 0 && <div style={{ fontSize: 11.5, color: T.dim }}>Nenašla som nadpisy — dokument sa uloží, procesy dorobíš ručne.</div>}
              </div>
              <Actions onCancel={() => setPreview(null)} onApply={applyDoc} label="Potvrdiť a vytvoriť" />
            </div>
          )}
          {preview?.kind === "tests" && (
            <div>
              <div style={{ fontSize: 12, color: T.muted, margin: "4px 0 8px" }}>Návrh — <b style={{ color: T.text }}>{preview.tests.length}</b> scenárov sa pridá do posledného cyklu.</div>
              <div style={{ ...box, maxHeight: 260, overflow: "auto" }}>
                {preview.tests.slice(0, 60).map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 10px", borderBottom: `1px solid ${T.borderSoft}`, fontSize: 11.5 }}>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                    <span style={{ color: T.dim }}>{t.area}</span>
                  </div>
                ))}
              </div>
              <Actions onCancel={() => setPreview(null)} onApply={applyTests} label="Pridať scenáre" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Actions({ onCancel, onApply, label }) {
  return <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
    <button onClick={onCancel} style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12 }}>Zrušiť</button>
    <button onClick={onApply} style={{ background: T.green, border: "none", color: T.bg, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>
  </div>;
}

/* ───────────────────────── Dokument tab (upload + cleanup) ───────────────────────── */
function DokumentTab({ project, setProject, me }) {
  const docs = project.documents || [];
  const [sel, setSel] = useState({});
  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const anySel = Object.values(sel).some(Boolean);
  const removeSelected = () => {
    setProject((pr) => ({ ...pr, documents: (pr.documents || []).filter((d) => !sel[d.id]) }));
    setSel({});
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><FileText size={16} color={T.green} />Dokumenty ({docs.length})</div>
        {anySel && <button onClick={removeSelected} style={{ fontSize: 12, background: "rgba(248,81,73,.12)", border: `1px solid ${T.red}`, color: T.red, borderRadius: 8, padding: "6px 11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={14} />Zmazať vybrané</button>}
      </div>
      <div style={{ ...card, overflow: "hidden" }}>
        {docs.map((d, i) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: i === docs.length - 1 ? "none" : `1px solid ${T.borderSoft}` }}>
            <span onClick={() => toggle(d.id)} style={{ cursor: "pointer", color: sel[d.id] ? T.green : T.dim }}>{sel[d.id] ? <CheckSquare size={17} /> : <Square size={17} />}</span>
            <FileText size={15} color={T.muted} />
            <span style={{ flex: 1, fontSize: 12.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
            <span style={{ fontSize: 10.5, color: T.dim, textTransform: "uppercase" }}>{d.type}</span>
            <span style={{ fontSize: 10.5, color: T.dim, display: "flex", alignItems: "center", gap: 4 }}><User size={12} />{d.uploadedBy}</span>
            <span style={{ fontSize: 10.5, color: T.dim }}>{d.date}</span>
          </div>
        ))}
        {docs.length === 0 && <div style={{ padding: 20, color: T.dim, fontSize: 12.5, textAlign: "center" }}>Zatiaľ žiadne dokumenty. Nahraj cez <b style={{ color: T.text }}>Import → Dokument</b>.</div>}
      </div>
      <div style={{ fontSize: 10.5, color: T.dim, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>Zaškrtni dokumenty a „Zmazať vybrané". Maže sa len z tejto sekcie — procesy a issues ostávajú.</div>
    </div>
  );
}

/* ───────────────────────── export: Excel / PDF ───────────────────────── */
async function exportExcel(project) {
  const XLSX = await import("xlsx");
  const P = [["Celok", "Proces", "Status procesu", "Krok", "Typ", "Stav kroku", "Odkazy", "Bugy"]];
  (project.groups || []).forEach((g) => g.processes.forEach((p) => {
    if (!p.steps.length) P.push([g.name, p.name, p.status, "", "", "", "", ""]);
    p.steps.forEach((s) => P.push([g.name, p.name, p.status, s.name, s.type === "manual" ? "MAN" : "SYS", s.status,
      (s.links || []).map((l) => normalizeUrl(l.url)).join("  "),
      (s.bugs || []).map((b) => `${b.title} [${b.severity || ""}/${b.status || "Otvorený"}]`).join("; ")]));
  }));
  const Tr = [["Cyklus", "Oblasť", "Test", "Čo sa má stať", "Výsledok", "Pokusy OK", "Pokusy spolu", "Úspešnosť %", "Odkazy", "Tester"]];
  (project.cycles || []).forEach((c) => c.tests.forEach((t) => {
    const ev = evalTest(t);
    Tr.push([c.name, t.area, t.name, t.expected, t.result, ev.ok, ev.n, ev.pct == null ? "" : ev.pct,
      (t.links || []).map((l) => normalizeUrl(l.url)).join("  "), t.testerEmail || ""]);
  }));
  const Ir = [["Kľúč", "Súhrn", "Status", "Typ", "Assignee", "Epic", "URL"]];
  (project.issues || []).forEach((i) => Ir.push([i.key, i.summary, i.status, i.type, i.assignee, i.epic, i.url]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(P), "Procesy");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(Tr), "Testovanie");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(Ir), "Jira");
  XLSX.writeFile(wb, (project.name || "projekt").replace(/\W+/g, "_") + ".xlsx");
}
function exportPDF(project) {
  const esc = (s) => String(s || "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  let body = `<h1>${esc(project.name)}</h1><div class="meta">Pripravenosť ${projectReadiness(project)}% · export ${new Date().toLocaleString("sk-SK")}</div>`;
  (project.groups || []).forEach((g) => {
    body += `<h2>${esc(g.name)}</h2>`;
    g.processes.forEach((p) => {
      body += `<h3>${esc(p.name)} — <span class="st">${esc(p.status)}</span></h3>`;
      if (p.steps.length) {
        body += "<ul>";
        p.steps.forEach((s) => {
          const bugs = (s.bugs || []).map((b) => `${esc(b.title)} [${esc(b.severity)}/${esc(b.status || "Otvorený")}]`).join("; ");
          body += `<li><b>[${s.type === "manual" ? "MAN" : "SYS"}]</b> ${esc(s.name)} — ${esc(s.status)}${bugs ? ` <span class="bug">🐞 ${bugs}</span>` : ""}</li>`;
        });
        body += "</ul>";
      }
    });
  });
  const w = window.open("", "_blank");
  if (!w) { alert("Povoľ vyskakovacie okná pre export do PDF."); return; }
  w.document.write(`<html><head><meta charset="utf-8"><title>${esc(project.name)}</title><style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px;color:#111}
    h1{font-size:20px;margin:0 0 4px} .meta{color:#666;font-size:12px;margin-bottom:16px}
    h2{font-size:15px;margin:18px 0 4px;border-bottom:1px solid #ccc;padding-bottom:3px}
    h3{font-size:13px;margin:10px 0 3px} .st{color:#0a7} ul{margin:0 0 8px 18px} li{font-size:12px;margin:2px 0}
    .bug{color:#c62828} @media print{a{color:#000}}
  </style></head><body>${body}<script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

/* ───────────────────────── AI chat nad dokumentom ───────────────────────── */
function ChatWidget({ project }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const docText = (project.documents || []).map((d) => d.text).filter(Boolean).join("\n\n").slice(0, 12000);
  const hasDoc = docText.length > 0;
  const send = async () => {
    const q = input.trim(); if (!q || loading) return;
    const next = [...msgs, { role: "user", content: q }];
    setMsgs(next); setInput(""); setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docText, messages: next }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Chyba");
      setMsgs((m) => [...m, { role: "assistant", content: j.text }]);
    } catch (e) { setErr(String(e.message || e)); }
    setLoading(false);
  };
  if (!open) {
    return <button onClick={() => setOpen(true)} title="Chat s dokumentom" style={{ position: "fixed", right: 20, bottom: 20, width: 48, height: 48, borderRadius: 99, background: T.green, color: T.bg, border: "none", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 4px 14px rgba(0,0,0,.4)", zIndex: 40 }}><MessageCircle size={22} /></button>;
  }
  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, width: 340, maxWidth: "calc(100vw - 40px)", height: 440, maxHeight: "calc(100vh - 40px)", ...card, display: "flex", flexDirection: "column", zIndex: 40, boxShadow: "0 8px 28px rgba(0,0,0,.5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}><MessageCircle size={16} color={T.green} />Dokument — Q&amp;A</div>
        <X size={17} color={T.muted} style={{ cursor: "pointer" }} onClick={() => setOpen(false)} />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {!hasDoc && <div style={{ fontSize: 12, color: T.dim }}>Najprv nahraj dokument cez <b style={{ color: T.text }}>Import → Dokument</b>, potom sa môžeš pýtať na jeho obsah.</div>}
        {hasDoc && msgs.length === 0 && <div style={{ fontSize: 12, color: T.dim }}>Opýtaj sa čokoľvek k nahratému dokumentu — zhrnutie, konkrétny krok, definícia procesu…</div>}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? T.green : T.panel2, color: m.role === "user" ? T.bg : T.text, border: m.role === "user" ? "none" : `1px solid ${T.border}`, borderRadius: 10, padding: "7px 10px", fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{m.content}</div>
        ))}
        {loading && <div style={{ fontSize: 11.5, color: T.muted }}>Píšem…</div>}
        {err && <div style={{ fontSize: 11.5, color: T.red }}>{err}</div>}
      </div>
      <div style={{ display: "flex", gap: 6, padding: 10, borderTop: `1px solid ${T.borderSoft}` }}>
        <input value={input} disabled={!hasDoc} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={hasDoc ? "otázka…" : "nahraj dokument"} style={{ flex: 1, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", color: T.text, fontSize: 12, outline: "none" }} />
        <button onClick={send} disabled={!hasDoc || loading} style={{ background: T.green, color: T.bg, border: "none", borderRadius: 8, padding: "0 12px", cursor: hasDoc ? "pointer" : "default", opacity: hasDoc ? 1 : .5 }}><Send size={15} /></button>
      </div>
    </div>
  );
}
