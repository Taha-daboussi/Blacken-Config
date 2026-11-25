import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, terminals, focused, theme, shared, setShared, readTextFile, home, hc, run, notify, openOverlay, closeOverlay, props, checking, exec } from "herdr";
import * as PROBEFS from "fs/promises";
const PROBEID = Math.random().toString(36).slice(2, 7); let PROBELOG = ""; const PROBE = (m) => { PROBELOG += `${Date.now()} ${m}\n`; PROBEFS.writeFile(`${home()}/.config/herdr-app/data/linear-probe-${PROBEID}.log`, PROBELOG); };

const WORKSPACES = [
  { id: "dwn", label: "Dawn", match: /dawn/i },
  { id: "roas", label: "RoasX1ds", match: /1ds|roas/i },
  { id: "kubbly", label: "Kubbly", match: /kubbly|monorepo/i },
];
const TYPE_ORDER = { started: 0, unstarted: 1, backlog: 2, triage: 3, completed: 4, canceled: 5 };
const PRIORITIES = [[1, "Urgent"], [2, "High"], [3, "Medium"], [4, "Low"], [0, "No priority"]];
const REFRESH_MS = 60000;

const ISSUES_QUERY = `query {
  viewer { assignedIssues(first: 100, orderBy: updatedAt, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
    nodes { id identifier title url priority state { id name type position color } team { id key } }
  } }
  teams(first: 50) { nodes { id key states { nodes { id name type position color } } } }
}`;

async function linear(ws, query, variables) {
  const key = (await readTextFile(`${home()}/.config/herdr-linear/${ws}.key`))?.trim();
  if (!key) throw new Error(`No API key in ~/.config/herdr-linear/${ws}.key`);
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.errors?.length) throw new Error(body?.errors?.[0]?.message ?? `Linear HTTP ${res.status}`);
  return body.data;
}

function spaceWorkspace(space) {
  if (!space) return null;
  const hay = `${space.name} ${space.folder}`;
  return WORKSPACES.find((w) => w.match.test(hay))?.id ?? null;
}

function sortStates(states) {
  return [...states].sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) || a.position - b.position);
}

function stateIcon(type) {
  const name = type === "started" ? "started" : type === "completed" ? "completed" : type === "canceled" ? "canceled" : type === "backlog" || type === "triage" ? "backlog" : "unstarted";
  return `mods/linear/st-${name}.svg`;
}

function priorityIcon(p) {
  return `mods/linear/pr-${p ?? 0}.svg`;
}

const STEPS_MS = 3000;

function issueKeys(strings) {
  const keys = new Set();
  for (const s of strings) {
    if (!s) continue;
    for (const m of s.matchAll(/(?:^|[^a-z0-9])([a-z]{2,10}-\d+)(?!\d)/gi)) keys.add(m[1].toUpperCase());
  }
  return keys;
}

function agentsByIssue() {
  const terms = new Map(terminals().map((t) => [t.address, t]));
  const byKey = new Map();
  for (const a of agents()) {
    const t = terms.get(a.address);
    const labels = t?.labels ?? {};
    const live = /^(\d{1,2})\/\d+\s+(.*)$/.exec(labels["dispatch.step"] ?? "");
    const entry = { ...a, step: live ? { n: Number(live[1]), label: live[2], waiting: labels["dispatch.wait"] === "1" } : null };
    for (const k of issueKeys([a.title, t?.name, t?.cwd, labels["herdr.summary"]])) {
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(entry);
    }
  }
  return byKey;
}

function savedStepsByIssue(records) {
  const byKey = new Map();
  for (const r of Object.values(records ?? {})) {
    if (!Number.isInteger(r?.n)) continue;
    for (const k of issueKeys([r.name, r.title, r.cwd])) {
      if (!byKey.has(k) || (byKey.get(k).since ?? 0) < (r.since ?? 0)) byKey.set(k, r);
    }
  }
  return byKey;
}

function ago(sec) {
  if (!sec) return "";
  const m = Math.max(0, Math.round((Date.now() / 1000 - sec) / 60));
  return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}

async function dispatchIssue(issue) {
  const sel = focused();
  const space = spaces().find((s) => s.id === sel?.space) ?? spaces().find((s) => s.active);
  if (!space) {
    notify({ title: "Linear", body: "No Herdr space is open.", level: "warning" });
    return;
  }
  if (space.folder && (await exec("test", ["-d", space.folder], { on: space.machine }).catch(() => null))?.code !== 0) {
    notify({ title: "Linear", body: `The ${space.name} space folder does not exist: ${space.folder}`, level: "error" });
    return;
  }
  const task = `dispatch this task please: ${issue.url} ${issue.title}`;
  const agent = space.machine ? "claudet" : "claude";
  const main = space.tabs.find((t) => t.name === "Main");
  if (!main) {
    run("tab.new", { name: "Main", space: space.id, folder: space.folder, argv: [agent], task, focus: false });
    notify({ title: "Linear", body: `Started a new Main tab in ${space.name} for ${issue.identifier}.`, level: "success" });
    return;
  }
  const local = (id) => id.slice(id.indexOf("/") + 1);
  const args = ["run", "--bg", "--keep", "--no-parent", "--label", `herdr.space=${local(space.id)}`, "--label", `herdr.tab=${local(main.id)}`];
  if (space.machine) args.push("--on", space.machine);
  if (space.folder) args.push("--cwd", space.folder);
  args.push("--", agent, task);
  const r = await hc(args);
  if (r.code === 0) notify({ title: "Linear", body: `Started a new pane in ${space.name} / Main for ${issue.identifier}.`, level: "success" });
  else notify({ title: "Linear", body: `Could not start a pane for ${issue.identifier}: ${(r.stderr || r.stdout).trim()}`, level: "error" });
}

class IssueMenu {
  constructor(view) {
    this.view = view;
    this.busy = null;
    this.error = null;
  }

  update(input, label, cx) {
    const p = props();
    this.busy = label;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const data = await linear(p.ws, `mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id: p.issue.id, input });
        if (!data?.issueUpdate?.success) throw new Error("Linear did not accept the change");
        setShared("linear.dirty", { ws: p.ws, at: Date.now() });
        closeOverlay(p.overlay);
      } catch (e) {
        this.busy = null;
        this.error = String(e?.message ?? e);
        cx.notify();
      }
    });
  }

  row(t, id, icon, iconColor, label, selected, onClick) {
    return h_flex().id(id).h(28).px(8).gap(9).flex_none().rounded(7).items_center().cursor_pointer()
      .text_color(t.foreground).hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { PROBE(`menu-click ${id}`); if (id === "copy") { closeOverlay(props().overlay); return; } onClick(cx); })
      .child(svg(icon).size(14).flex_none().text_color(iconColor ?? t.muted))
      .child(div().flex_1().min_w(0).truncate().child(label))
      .when(selected, (el) => el.child(svg("mods/workspace-chrome/check.svg").size(13).flex_none().text_color(t.muted)));
  }

  heading(t, text) {
    return div().px(8).pt(8).pb(3).flex_none().text_size(11).text_color(t.dim).child(text);
  }

  render(t) {
    const p = props();
    const issue = p.issue;
    const states = sortStates(p.states ?? []);
    return v_flex().id("linear-menu").w_full().p(5).bg(t.popover).text_size(12.8)
      .child(h_flex().px(8).h(30).gap(8).flex_none().items_center()
        .child(div().flex_none().text_color(t.muted).child(issue.identifier))
        .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(issue.title)))
      .when(Boolean(this.busy || this.error), (el) => el.child(div().px(8).py(4).flex_none().text_size(11.5)
        .text_color(this.error ? t.blocked : t.muted).child(this.error ?? `Saving: ${this.busy}…`)))
      .child(v_flex().id("linear-menu-list")
        .child(this.heading(t, "Status"))
        .children(states.map((s) => this.row(t, `st-${s.id}`, stateIcon(s.type), s.color, s.name, s.id === issue.state.id,
          (cx) => s.id !== issue.state.id && this.update({ stateId: s.id }, s.name, cx))))
        .child(this.heading(t, "Priority"))
        .children(PRIORITIES.map(([n, name]) => this.row(t, `pr-${n}`, priorityIcon(n), n === 1 ? "#f2994a" : null, name, n === issue.priority,
          (cx) => n !== issue.priority && this.update({ priority: n }, name, cx))))
        .child(div().mx(7).my(4).h(1).flex_none().bg(t.border))
        .child(this.row(t, "dispatch", "mods/linear/bot.svg", null, "Dispatch task", false, () => { setShared("linear.dispatch", { issue, at: Date.now() }); closeOverlay(p.overlay); }))
        .child(this.row(t, "open", "mods/linear/linear.svg", null, "Open in Linear", false, (cx) => { closeOverlay(p.overlay); cx.open_url(issue.url); }))
        .child(this.row(t, "copy", "mods/workspace-chrome/file-text.svg", null, "Copy link", false, (cx) => { cx.write_to_clipboard(issue.url); closeOverlay(p.overlay); })));
  }
}

export default class Linear extends View {
  init(_props, cx) {
    if (props()?.issue) {
      this.menu = new IssueMenu(this);
      return;
    }
    this.data = {};
    this.picked = null;
    this.collapsed = new Set();
    this.dirtyAt = shared("linear.dirty")?.at ?? 0;
    this.dispatchAt = shared("linear.dispatch")?.at ?? 0;
    this.steps = new Map();
    this.stepsText = null;
    this.stepsError = null;
    if (checking()) return;
    cx.timer.every(REFRESH_MS, (cx) => this.refreshAll(cx));
    cx.timer.every(1500, (cx) => this.checkDirty(cx));
    cx.timer.every(STEPS_MS, (cx) => this.loadSteps(cx));
    this.refreshAll(cx);
    this.loadSteps(cx);
  }

  loadSteps(cx) {
    const path = `${home()}/.local/share/dispatch/steps.json`;
    cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(path);
        if (text === this.stepsText) return;
        this.steps = text ? savedStepsByIssue(JSON.parse(text)) : new Map();
        this.stepsText = text;
        this.stepsError = null;
      } catch (e) {
        const msg = `Dispatch steps (${path}): ${e?.message ?? e}`;
        if (msg !== this.stepsError) notify({ title: "Linear", body: msg, level: "error" });
        this.stepsError = msg;
      }
      cx.notify();
    });
  }

  stepBadge(t, issue, busy) {
    const live = busy.find((a) => a.step)?.step;
    const saved = this.steps.get(issue.identifier.toUpperCase());
    const step = live ?? (saved ? { n: saved.n, label: saved.label, waiting: saved.waiting } : null);
    if (busy.length === 0 && !step) return null;
    const open = busy.length > 0;
    const color = !open ? t.dim : step?.waiting ? t.blocked : busy.some((a) => a.status === "working") ? t.working : t.muted;
    const where = busy.map((a) => `${a.space_name} / ${a.tab_name}: ${a.title}`);
    const stepLine = !step ? null
      : open ? `Step ${step.n}/10 ${step.label}${step.waiting ? " · waits for you" : ""}`
      : `Stopped at step ${step.n}/10 ${step.label}${step.waiting ? " (was waiting for you)" : ""} · pane closed · ${ago(saved?.since)}`;
    const waitMsg = step?.waiting ? (saved?.wait_msg && saved.n === step.n ? saved.wait_msg : null) : null;
    return h_flex().id(`bot-${issue.id}`).flex_none().gap(3).items_center()
      .tooltip([stepLine, waitMsg, ...where].filter(Boolean).join("\n"))
      .when(open, (el) => el.on_click((_e, cx) => { cx.stop_propagation(); run("pane.focus", { pane: busy[0].pane }); }))
      .child(svg("mods/linear/bot.svg").size(14).text_color(color))
      .when(Boolean(step), (el) => el.child(div().text_size(11).font_semibold().text_color(color).child(`${step.n}${step.waiting ? "⏳" : ""}`)));
  }

  refreshAll(cx) {
    for (const w of WORKSPACES) this.refresh(w.id, cx);
  }

  refresh(ws, cx) {
    const d = (this.data[ws] ??= { issues: [], teams: {}, error: null, loading: false, at: 0 });
    if (d.loading) return;
    d.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const data = await linear(ws, ISSUES_QUERY);
        d.issues = data.viewer.assignedIssues.nodes;
        d.teams = Object.fromEntries(data.teams.nodes.map((tm) => [tm.id, tm.states.nodes]));
        d.error = null;
        d.at = Date.now();
      } catch (e) {
        d.error = String(e?.message ?? e);
      }
      d.loading = false;
      cx.notify();
    });
  }

  checkDirty(cx) {
    const ask = shared("linear.dispatch");
    if (ask?.at && ask.at !== this.dispatchAt) {
      this.dispatchAt = ask.at;
      dispatchIssue(ask.issue);
    }
    const dirty = shared("linear.dirty");
    if (!dirty?.at || dirty.at === this.dirtyAt) return;
    this.dirtyAt = dirty.at;
    if (dirty.ws) this.refresh(dirty.ws, cx);
  }

  currentWorkspace() {
    if (this.picked) return this.picked;
    const f = focused();
    const space = spaces().find((s) => s.id === f?.space) ?? spaces().find((s) => s.active);
    return spaceWorkspace(space) ?? WORKSPACES[0].id;
  }

  openMenu(ws, issue) {
    const states = this.data[ws]?.teams?.[issue.team.id] ?? [];
    openOverlay({ mod: "linear", kind: "popup", width: 260, height: Math.min(680, 214 + (states.length + PRIORITIES.length) * 28), props: { ws, issue, states } });
  }

  header(t, ws, d) {
    return h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
      .child(svg("mods/linear/linear.svg").size(14).flex_none().text_color(t.muted))
      .child(div().font_semibold().child("Linear"))
      .child(div().text_color(t.dim).text_size(12).child(d?.issues ? `${d.issues.length} open` : ""))
      .child(div().flex_1())
      .child(h_flex().id("linear-refresh").size(24).flex_none().items_center().justify_center().rounded(6).cursor_pointer()
        .text_color(t.muted).hover((s) => s.bg(t.hover)).tooltip("Refresh")
        .on_click((_e, cx) => this.refresh(ws, cx))
        .child(d?.loading ? svg("mods/workspace-chrome/spinner.svg").size(13).spin(900) : svg("mods/linear/refresh.svg").size(13)));
  }

  tabs(t, ws) {
    return h_flex().flex_none().px(10).py(8).gap(4).border_b(1).border_color(t.border)
      .children(WORKSPACES.map((w) => {
        const on = w.id === ws;
        const n = this.data[w.id]?.issues?.length;
        return h_flex().id(`ws-${w.id}`).h(26).px(9).gap(6).items_center().rounded(6).cursor_pointer().text_size(12)
          .bg(on ? t.selected : t.background).text_color(on ? t.foreground : t.muted).hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => { this.picked = w.id === this.currentWorkspaceAuto() ? null : w.id; cx.notify(); })
          .child(w.label)
          .when(n != null, (el) => el.child(div().text_size(11).text_color(t.dim).child(String(n))));
      }));
  }

  currentWorkspaceAuto() {
    const saved = this.picked;
    this.picked = null;
    const ws = this.currentWorkspace();
    this.picked = saved;
    return ws;
  }

  issueRow(t, ws, issue, byIssue) {
    const busy = byIssue.get(issue.identifier.toUpperCase()) ?? [];
    const badge = this.stepBadge(t, issue, busy);
    return h_flex().id(`is-${issue.id}`).h(30).px(8).gap(8).flex_none().items_center().rounded(7).cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => PROBE(`row-click ${issue.identifier}`))
      .on_mouse_down("right", (_e, cx) => { PROBE(`row-right ${issue.identifier}`); cx.stop_propagation(); this.openMenu(ws, issue); })
      .child(h_flex().id(`pr-${issue.id}`).flex_none().tooltip(PRIORITIES.find(([n]) => n === issue.priority)?.[1] ?? "")
        .child(svg(priorityIcon(issue.priority)).size(13).text_color(issue.priority === 1 ? "#f2994a" : t.muted)))
      .child(div().flex_none().w(62).truncate().text_size(11.5).text_color(t.dim).child(issue.identifier))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(issue.title))
      .when(Boolean(badge), (el) => el.child(badge))
      .child(h_flex().id(`act-${issue.id}`).size(22).flex_none().items_center().justify_center().rounded(6)
        .text_color(t.dim).hover((s) => s.bg(t.selected).text_color(t.foreground)).tooltip("Status, priority, dispatch")
        .on_click((_e, cx) => { cx.stop_propagation(); this.openMenu(ws, issue); })
        .child(svg("mods/workspace-chrome/chevron-down.svg").size(13)));
  }

  groups(t, ws, d) {
    const byIssue = agentsByIssue();
    const byState = new Map();
    for (const issue of d.issues) {
      const g = byState.get(issue.state.id) ?? { state: issue.state, issues: [] };
      g.issues.push(issue);
      byState.set(issue.state.id, g);
    }
    const list = [...byState.values()].sort((a, b) => (TYPE_ORDER[a.state.type] ?? 9) - (TYPE_ORDER[b.state.type] ?? 9) || a.state.position - b.state.position);
    return list.map((g) => {
      const key = `${ws}:${g.state.name}`;
      const closed = this.collapsed.has(key);
      g.issues.sort((a, b) => (a.priority || 9) - (b.priority || 9));
      return v_flex().flex_none().gap(1)
        .child(h_flex().id(`grp-${key}`).h(28).px(6).gap(7).items_center().rounded(7).cursor_pointer().hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => { closed ? this.collapsed.delete(key) : this.collapsed.add(key); cx.notify(); })
          .child(svg(`mods/workspace-chrome/${closed ? "chevron-right" : "chevron-down"}.svg`).size(12).flex_none().text_color(t.dim))
          .child(svg(stateIcon(g.state.type)).size(14).flex_none().text_color(g.state.color ?? t.muted))
          .child(div().font_semibold().text_size(12.5).child(g.state.name))
          .child(div().text_size(11.5).text_color(t.dim).child(String(g.issues.length))))
        .when(!closed, (el) => el.children(g.issues.map((issue) => this.issueRow(t, ws, issue, byIssue))));
    });
  }

  body(t, ws, d) {
    if (!d || (!d.at && !d.error)) return div().p(14).text_color(t.muted).child("Loading…");
    const parts = [];
    if (d.error) parts.push(div().id("linear-err").m(10).p(10).rounded(8).border_1().border_color(t.border).text_size(12)
      .text_color(t.blocked).child(`Linear error: ${d.error}`));
    if (d.at && d.issues.length === 0) parts.push(div().p(14).text_color(t.muted).child("No open issues for you here."));
    return v_flex().id("linear-list").flex_1().min_h(0).px(8).py(6).gap(4).overflow_y_scrollbar()
      .children(parts).children(d.at ? this.groups(t, ws, d) : []);
  }

  render(cx) {
    const t = theme();
    if (this.menu) return this.menu.render(t);
    const ws = this.currentWorkspace();
    const d = this.data[ws];
    return v_flex().id("linear").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border)
      .text_color(t.foreground).text_size(13)
      .child(this.header(t, ws, d))
      .child(this.tabs(t, ws))
      .child(this.body(t, ws, d))
      .child(h_flex().h(26).flex_none().px(14).items_center().border_t(1).border_color(t.border).text_size(11).text_color(t.dim)
        .child("Click: open · Right-click or ⌄: status, priority, dispatch"));
  }
}
