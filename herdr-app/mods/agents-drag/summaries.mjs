#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const DATA = join(HOME, ".config/herdr-app/data");
const CACHE = join(DATA, "agent-summaries.json");
const LOCK = join(DATA, "agent-summaries.lock");
const LOG = join(DATA, "agent-summaries.log");
const PROJECTS = join(HOME, ".claude/projects");
const USER_REFRESH_MS = 60_000;
const ASSISTANT_REFRESH_MS = 600_000;
const PARALLEL = 4;

const log = (m) => {
  try { writeFileSync(LOG, `${new Date().toISOString()} ${m}\n`, { flag: "a" }); } catch {}
};

function loadCache() {
  try {
    const c = JSON.parse(readFileSync(CACHE, "utf8"));
    return c && typeof c === "object" && !Array.isArray(c) ? c : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  const tmp = `${CACHE}.${process.pid}`;
  writeFileSync(tmp, JSON.stringify(cache));
  renameSync(tmp, CACHE);
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function takeLock() {
  try {
    const pid = Number(readFileSync(LOCK, "utf8"));
    if (pid && alive(pid)) return false;
  } catch {}
  writeFileSync(LOCK, String(process.pid));
  return true;
}

const slug = (p) => p.replace(/[^A-Za-z0-9]/g, "-");

function transcript(session, cwds, known) {
  if (known && existsSync(known)) return known;
  for (const cwd of cwds) {
    if (!cwd) continue;
    const f = join(PROJECTS, slug(cwd), `${session}.jsonl`);
    if (existsSync(f)) return f;
  }
  for (const d of readdirSync(PROJECTS)) {
    const f = join(PROJECTS, d, `${session}.jsonl`);
    if (existsSync(f)) return f;
  }
  return null;
}

function readRange(file, start, length) {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(length);
    const n = readSync(fd, buf, 0, length, start);
    return buf.subarray(0, n).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

function lines(text, partialStart) {
  const all = text.split("\n");
  if (partialStart) all.shift();
  const out = [];
  for (const l of all) {
    if (!l) continue;
    try { out.push(JSON.parse(l)); } catch {}
  }
  return out;
}

function userText(e) {
  if (e.type !== "user" || e.isMeta || e.isCompactSummary || e.isSidechain) return null;
  const c = e.message?.content;
  const text = typeof c === "string" ? c : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text).join("\n") : "";
  const t = text.trim();
  if (!t || /^<(command-|local-command|system-reminder|bash-|task-notification)/.test(t) || t.startsWith("[Request interrupted")) return null;
  return t;
}

function assistantText(e) {
  if (e.type !== "assistant" || e.isSidechain) return null;
  const c = e.message?.content;
  if (!Array.isArray(c)) return null;
  const t = c.filter((b) => b?.type === "text").map((b) => b.text).join("\n").trim();
  return t || null;
}

function taskOf(text) {
  const m = text.match(/<task>([\s\S]*?)<\/task>/);
  const ctx = text.match(/<context>([\s\S]*?)<\/context>/);
  const type = ctx?.[1].match(/Task type:[^\n]*/)?.[0] ?? "";
  return [m ? m[1].trim() : text, type].filter(Boolean).join("\n");
}

function facts(file) {
  const size = statSync(file).size;
  const headLen = Math.min(size, 256 * 1024);
  const head = lines(readRange(file, 0, headLen), false);
  const first = head.map(userText).find(Boolean) ?? "";
  const tailStart = Math.max(0, size - 512 * 1024);
  const tail = lines(readRange(file, tailStart, size - tailStart), tailStart > 0);
  let lastUser = "";
  let lastAssistant = "";
  for (const e of tail) {
    const u = userText(e);
    if (u) lastUser = u;
    const a = assistantText(e);
    if (a) lastAssistant = a;
  }
  if (lastUser === first) lastUser = "";
  return { task: taskOf(first).slice(0, 1500), lastUser: lastUser.slice(0, 600), lastAssistant: lastAssistant.slice(-600) };
}

const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 16);

function ask(f) {
  const prompt = [
    "You write the label for a coding agent in a narrow sidebar.",
    "Say what the agent works on now, in 3 to 7 plain English words.",
    "Start with a verb (Fix, Add, Review, Test, Watch, Plan, Answer...).",
    "If the task names a ticket id (like DAW-8 or ROA-144), put it first, then a colon.",
    "No quotes, no period, no markdown. Reply with the label only.",
    "",
    "Task given to the agent:",
    f.task || "(none)",
    f.lastUser ? `\nLatest message from the user:\n${f.lastUser}` : "",
    f.lastAssistant ? `\nLatest message from the agent:\n${f.lastAssistant}` : "",
  ].join("\n");
  return new Promise((resolve) => {
    const env = { ...process.env, CLAUDE_SESSION_NAMER: "1" };
    delete env.CLAUDE_CODE_OAUTH_TOKEN;
    const p = spawn("claude", ["-p", "--setting-sources", "local", "--no-session-persistence", "--strict-mcp-config", "--model", "haiku"], { cwd: DATA, env, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => p.kill("SIGTERM"), 90_000);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => { clearTimeout(timer); log(`ask.failed ${e.message}`); resolve(null); });
    p.on("close", (code) => {
      clearTimeout(timer);
      const label = out.trim().split("\n").filter(Boolean).pop()?.replace(/^["'`*]+|["'`*.]+$/g, "").trim();
      if (code !== 0 || !label) {
        log(`ask.failed code=${code} err=${err.trim().slice(0, 200)}`);
        resolve(null);
      } else resolve(label.slice(0, 80));
    });
    p.stdin.end(prompt);
  });
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

async function main() {
  mkdirSync(DATA, { recursive: true });
  let agents = [];
  try { agents = JSON.parse(process.argv[2] ?? "[]"); } catch {}
  const cache = loadCache();
  const print = () => {
    const out = {};
    for (const a of agents) if (cache[a.s]?.summary) out[a.a] = cache[a.s].summary;
    process.stdout.write(JSON.stringify(out));
  };
  if (!takeLock()) return print();
  try {
    const now = Date.now();
    const todo = [];
    for (const a of agents) {
      const c = (cache[a.s] ??= {});
      c.seen = now;
      try {
        c.file = transcript(a.s, [a.cwd, a.cwd2], c.file);
        if (!c.file) continue;
        const mtime = statSync(c.file).mtimeMs;
        if (c.summary && c.mtime === mtime) continue;
        const f = facts(c.file);
        const userKey = hash(`${f.task}\0${f.lastUser}`);
        const fullKey = hash(`${userKey}\0${f.lastAssistant}`);
        c.mtime = mtime;
        if (c.summary && c.fullKey === fullKey) continue;
        const age = now - (c.at ?? 0);
        const due = !c.summary || (c.userKey !== userKey ? age > USER_REFRESH_MS : age > ASSISTANT_REFRESH_MS);
        if (!due) { c.mtime = null; continue; }
        todo.push({ c, f, userKey, fullKey });
      } catch (e) {
        log(`read.failed ${a.s} ${e.message}`);
      }
    }
    await pool(todo, PARALLEL, async ({ c, f, userKey, fullKey }) => {
      const label = await ask(f);
      c.at = Date.now();
      if (!label) return;
      c.summary = label;
      c.userKey = userKey;
      c.fullKey = fullKey;
    });
    for (const [k, c] of Object.entries(cache)) if (now - (c.seen ?? 0) > 30 * 86400000) delete cache[k];
    saveCache(cache);
    print();
  } finally {
    try { unlinkSync(LOCK); } catch {}
  }
}

main().catch((e) => {
  log(`main.failed ${e.stack ?? e}`);
  process.exit(1);
});
