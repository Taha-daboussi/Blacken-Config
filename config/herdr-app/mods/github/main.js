import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, shared, setShared, exec, notify, openOverlay, closeOverlay, props, checking } from "herdr";

const REFRESH_MS = 120000;
const RECENT_DAYS = 30;
const GREEN = "#3fb950";
const PURPLE = "#a371f7";
const ORANGE = "#f2994a";
const YELLOW = "#d29922";
const RED = "#f85149";

const PR_STATUSES = [
  { id: "review", label: "Review required", icon: "pr-open", color: GREEN },
  { id: "changes", label: "Changes requested", icon: "pr-open", color: ORANGE },
  { id: "approved", label: "Approved", icon: "pr-open", color: GREEN },
  { id: "draft", label: "Draft", icon: "pr-draft", color: null },
  { id: "merged", label: "Merged", icon: "pr-merged", color: PURPLE },
  { id: "closed", label: "Closed", icon: "pr-closed", color: RED },
];
const DEFAULT_PR_STATUSES = ["review", "changes", "approved", "draft"];
const INBOX_STATUSES = [
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];
const DEFAULT_INBOX_STATUSES = ["unread"];
const REASONS = {
  review_requested: "Review requested",
  mention: "Mentioned",
  team_mention: "Team mentioned",
  comment: "Comment",
  author: "Your thread",
  assign: "Assigned",
  state_change: "State changed",
  ci_activity: "CI",
  subscribed: "Watching",
  manual: "Subscribed",
  approval_requested: "Approval requested",
  security_alert: "Security",
};
const CHECKS = {
  SUCCESS: { color: GREEN, label: "Checks passed" },
  FAILURE: { color: RED, label: "Checks failing" },
  ERROR: { color: RED, label: "Checks errored" },
  PENDING: { color: YELLOW, label: "Checks running" },
  EXPECTED: { color: YELLOW, label: "Checks expected" },
};

const PR_FIELDS = `... on PullRequest { id number title url state isDraft reviewDecision updatedAt
  repository { nameWithOwner }
  comments { totalCount }
  reviewThreads(first: 100) { totalCount nodes { isResolved } }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } }`;

function prQuery() {
  const since = new Date(Date.now() - RECENT_DAYS * 86400000).toISOString().slice(0, 10);
  return `query {
    open: search(query: "is:pr author:@me is:open sort:updated-desc", type: ISSUE, first: 100) { nodes { ${PR_FIELDS} } }
    done: search(query: "is:pr author:@me is:closed updated:>=${since} sort:updated-desc", type: ISSUE, first: 100) { nodes { ${PR_FIELDS} } }
  }`;
}

async function gh(args) {
  const r = await exec("gh", args, { timeout: 30000 });
  if (r.code !== 0) throw new Error((r.stderr || r.stdout || `gh exited ${r.code}`).trim().split("\n")[0]);
  return r.stdout;
}

function prStatus(pr) {
  if (pr.state === "MERGED") return "merged";
  if (pr.state === "CLOSED") return "closed";
  if (pr.isDraft) return "draft";
  if (pr.reviewDecision === "CHANGES_REQUESTED") return "changes";
  if (pr.reviewDecision === "APPROVED") return "approved";
  return "review";
}

function subjectNumber(n) {
  const m = n.subject?.url?.match(/\/(?:pulls|issues)\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

function notificationUrl(n) {
  const repo = n.repository?.html_url ?? `https://github.com/${n.repository?.full_name}`;
  const api = n.subject?.url;
  if (!api || n.subject.type === "Release") return n.subject.type === "Release" ? `${repo}/releases` : repo;
  if (n.subject.type === "CheckSuite") return `${repo}/actions`;
  return api.replace("https://api.github.com/repos/", "https://github.com/").replace("/pulls/", "/pull/").replace("/commits/", "/commit/");
}

function ago(iso) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (86400 * 30))}mo`;
}

function repoShort(name) {
  return name?.split("/")[1] ?? name ?? "";
}

function loadList(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function project() {
  return shared("github.project") ?? "all";
}

class ProjectMenu {
  render(t) {
    const p = props();
    const current = project();
    const row = (id, label, count) => h_flex().id(`proj-${id}`).h(28).px(8).gap(9).flex_none().rounded(7).items_center().cursor_pointer()
      .text_color(t.foreground).hover((s) => s.bg(t.hover))
      .on_click(() => { setShared("github.project", id); closeOverlay(p.overlay); })
      .child(div().flex_1().min_w(0).truncate().child(label))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(String(count)))
      .child(div().w(13).flex_none().when(id === current, (el) => el.child(svg("mods/github/check.svg").size(13).text_color(t.muted))));
    return v_flex().id("github-projects").w_full().p(5).bg(t.popover).text_size(12.8).overflow_y_scrollbar()
      .child(div().px(8).pt(6).pb(4).flex_none().text_size(11).text_color(t.dim).child("Project"))
      .child(row("all", "All projects", p.total))
      .children(p.projects.map((x) => row(x.name, x.name, x.count)));
  }
}

export default class GitHub extends View {
  init(_props, cx) {
    if (props()?.menu === "project") {
      this.menu = new ProjectMenu();
      return;
    }
    this.view = localStorage.getItem("view") === "inbox" ? "inbox" : "prs";
    this.prStatuses = new Set(loadList("prStatuses", DEFAULT_PR_STATUSES));
    this.inboxStatuses = new Set(loadList("inboxStatuses", DEFAULT_INBOX_STATUSES));
    this.prs = { items: [], error: null, loading: false, at: 0 };
    this.inbox = { items: [], error: null, loading: false, at: 0 };
    if (checking()) return;
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  refresh(cx) {
    this.load(cx, this.prs, async () => {
      const data = JSON.parse(await gh(["api", "graphql", "-f", `query=${prQuery()}`])).data;
      const seen = new Set();
      return [...data.open.nodes, ...data.done.nodes].filter((pr) => pr?.id && !seen.has(pr.id) && seen.add(pr.id));
    });
    this.load(cx, this.inbox, async () => {
      const [unread, recent] = await Promise.all([
        gh(["api", "--paginate", "--slurp", "notifications?all=false&per_page=50"]).then((s) => JSON.parse(s).flat()),
        gh(["api", "notifications?all=true&per_page=50"]).then((s) => JSON.parse(s)),
      ]);
      const byId = new Map([...recent, ...unread].map((n) => [n.id, n]));
      return [...byId.values()];
    });
  }

  load(cx, store, fetcher) {
    if (store.loading) return;
    store.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        store.items = await fetcher();
        store.error = null;
        store.at = Date.now();
      } catch (e) {
        store.error = String(e?.message ?? e);
      }
      store.loading = false;
      cx.notify();
    });
  }

  markRead(cx, items) {
    const unread = items.filter((n) => n.unread);
    if (unread.length === 0) return;
    for (const n of unread) n.unread = false;
    cx.notify();
    cx.spawn(async (cx) => {
      const failed = [];
      for (const n of unread) {
        try {
          await gh(["api", "-X", "PATCH", `notifications/threads/${n.id}`]);
        } catch (e) {
          n.unread = true;
          failed.push(String(e?.message ?? e));
        }
      }
      if (failed.length) notify({ title: "GitHub", body: `Could not mark ${failed.length} as read: ${failed[0]}`, level: "error" });
      cx.notify();
    });
  }

  setView(view, cx) {
    this.view = view;
    localStorage.setItem("view", view);
    cx.notify();
  }

  toggle(set, key, id, cx) {
    set.has(id) ? set.delete(id) : set.add(id);
    localStorage.setItem(key, JSON.stringify([...set]));
    cx.notify();
  }

  projects() {
    const counts = new Map();
    for (const pr of this.prs.items) {
      const name = pr.repository.nameWithOwner;
      counts.set(name, (counts.get(name) ?? 0) + (pr.state === "OPEN" ? 1 : 0));
    }
    for (const n of this.inbox.items) {
      const name = n.repository.full_name;
      counts.set(name, (counts.get(name) ?? 0) + (n.unread ? 1 : 0));
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }

  inProject(name) {
    const p = project();
    return p === "all" || p === name;
  }

  openProjects() {
    const projects = this.projects();
    const total = projects.reduce((n, x) => n + x.count, 0);
    openOverlay({ mod: "github", kind: "popup", width: 280, height: Math.min(520, 74 + projects.length * 28), props: { menu: "project", projects, total } });
  }

  header(t) {
    const store = this.view === "prs" ? this.prs : this.inbox;
    const loading = this.prs.loading || this.inbox.loading;
    return h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
      .child(svg("mods/github/github.svg").size(14).flex_none().text_color(t.muted))
      .child(div().font_semibold().child("GitHub"))
      .child(div().text_color(t.dim).text_size(12).child(store.at ? `updated ${ago(new Date(store.at).toISOString())} ago` : ""))
      .child(div().flex_1())
      .when(this.view === "inbox", (el) => el.child(h_flex().id("github-read-all").size(24).flex_none().items_center().justify_center().rounded(6).cursor_pointer()
        .text_color(t.muted).hover((s) => s.bg(t.hover)).tooltip("Mark shown as read")
        .on_click((_e, cx) => this.markRead(cx, this.shownInbox()))
        .child(svg("mods/github/check-all.svg").size(14))))
      .child(h_flex().id("github-refresh").size(24).flex_none().items_center().justify_center().rounded(6).cursor_pointer()
        .text_color(t.muted).hover((s) => s.bg(t.hover)).tooltip("Refresh")
        .on_click((_e, cx) => this.refresh(cx))
        .child(loading ? svg("mods/workspace-chrome/spinner.svg").size(13).spin(900) : svg("mods/github/refresh.svg").size(13)));
  }

  viewTabs(t) {
    const unread = this.inbox.items.filter((n) => n.unread && this.inProject(n.repository.full_name)).length;
    const open = this.prs.items.filter((pr) => pr.state === "OPEN" && this.inProject(pr.repository.nameWithOwner)).length;
    const tab = (id, icon, label, count, hot) => {
      const on = this.view === id;
      return h_flex().id(`view-${id}`).h(26).px(9).gap(6).items_center().rounded(6).cursor_pointer().text_size(12)
        .bg(on ? t.selected : t.background).text_color(on ? t.foreground : t.muted).hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => this.setView(id, cx))
        .child(svg(icon).size(13))
        .child(label)
        .child(div().text_size(11).text_color(hot && count ? t.accent : t.dim).child(String(count)));
    };
    const p = project();
    return h_flex().flex_none().px(10).py(8).gap(4).items_center().border_b(1).border_color(t.border)
      .child(tab("prs", "mods/github/pr-open.svg", "My PRs", open, false))
      .child(tab("inbox", "mods/github/inbox.svg", "Inbox", unread, true))
      .child(div().flex_1())
      .child(h_flex().id("github-project").h(26).max_w(170).px(8).gap(5).items_center().rounded(6).cursor_pointer().text_size(12)
        .border_1().border_color(t.border).text_color(p === "all" ? t.muted : t.foreground).hover((s) => s.bg(t.hover))
        .tooltip("Pick a project")
        .on_click(() => this.openProjects())
        .child(div().min_w(0).truncate().child(p === "all" ? "All projects" : repoShort(p)))
        .child(svg("mods/workspace-chrome/chevron-down.svg").size(12).flex_none().text_color(t.dim)));
  }

  chip(t, id, label, on, count, onClick) {
    return h_flex().id(`chip-${id}`).h(22).px(7).gap(5).flex_none().items_center().rounded(11).cursor_pointer().text_size(11.5)
      .border_1().border_color(on ? t.accent : t.border).bg(on ? t.selected : t.background).text_color(on ? t.foreground : t.muted)
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => onClick(cx))
      .child(label)
      .child(div().text_color(t.dim).child(String(count)));
  }

  filters(t) {
    const wrap = h_flex().flex_none().flex_wrap().px(10).py(7).gap(5).border_b(1).border_color(t.border);
    if (this.view === "prs") {
      const counts = {};
      for (const pr of this.prs.items) if (this.inProject(pr.repository.nameWithOwner)) counts[prStatus(pr)] = (counts[prStatus(pr)] ?? 0) + 1;
      return wrap.children(PR_STATUSES.map((s) => this.chip(t, s.id, s.label, this.prStatuses.has(s.id), counts[s.id] ?? 0,
        (cx) => this.toggle(this.prStatuses, "prStatuses", s.id, cx))));
    }
    const counts = { unread: 0, read: 0 };
    for (const n of this.inbox.items) if (this.inProject(n.repository.full_name)) counts[n.unread ? "unread" : "read"]++;
    return wrap.children(INBOX_STATUSES.map((s) => this.chip(t, s.id, s.label, this.inboxStatuses.has(s.id), counts[s.id],
      (cx) => this.toggle(this.inboxStatuses, "inboxStatuses", s.id, cx))));
  }

  shownPrs() {
    return this.prs.items
      .filter((pr) => this.inProject(pr.repository.nameWithOwner) && this.prStatuses.has(prStatus(pr)))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  shownInbox() {
    return this.inbox.items
      .filter((n) => this.inProject(n.repository.full_name) && this.inboxStatuses.has(n.unread ? "unread" : "read"))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  prRow(t, pr, unreadKeys) {
    const status = PR_STATUSES.find((s) => s.id === prStatus(pr));
    const threads = pr.reviewThreads?.nodes ?? [];
    const open = threads.filter((x) => !x.isResolved).length;
    const comments = (pr.comments?.totalCount ?? 0) + (pr.reviewThreads?.totalCount ?? 0);
    const checks = CHECKS[pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state];
    const repo = pr.repository.nameWithOwner;
    const fresh = unreadKeys.has(`${repo}#${pr.number}`);
    return h_flex().id(`pr-${pr.id}`).h(30).px(8).gap(8).flex_none().items_center().rounded(7).cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => cx.open_url(pr.url))
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); cx.write_to_clipboard(pr.url); notify({ title: "GitHub", body: `Copied the link of #${pr.number}.`, level: "info" }); })
      .child(h_flex().id(`st-${pr.id}`).flex_none().tooltip(status.label)
        .child(svg(`mods/github/${status.icon}.svg`).size(14).text_color(status.color ?? t.muted)))
      .child(div().flex_none().max_w(110).truncate().text_size(11.5).text_color(t.dim).child(`${project() === "all" ? `${repoShort(repo)} ` : ""}#${pr.number}`))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(pr.title))
      .when(fresh, (el) => el.child(div().id(`new-${pr.id}`).size(7).flex_none().rounded(4).bg(t.accent).tooltip("New activity in your inbox")))
      .when(Boolean(checks), (el) => el.child(div().id(`ci-${pr.id}`).size(8).flex_none().rounded(4).bg(checks.color).tooltip(checks.label)))
      .when(comments > 0, (el) => el.child(h_flex().id(`cm-${pr.id}`).flex_none().gap(3).items_center().text_size(11)
        .text_color(open ? ORANGE : t.dim)
        .tooltip(`${pr.comments.totalCount} comments, ${pr.reviewThreads.totalCount} review threads${open ? `, ${open} not resolved` : ""}`)
        .child(svg("mods/github/comment.svg").size(12))
        .child(open ? `${comments} · ${open} open` : String(comments))))
      .child(div().flex_none().w(34).truncate().text_size(11).text_color(t.dim).child(ago(pr.updatedAt)));
  }

  inboxRow(t, n) {
    const repo = n.repository.full_name;
    const num = subjectNumber(n);
    const icon = n.subject.type === "PullRequest" ? "pr-open" : "issue";
    const url = notificationUrl(n);
    return h_flex().id(`nt-${n.id}`).h(40).px(8).gap(8).flex_none().items_center().rounded(7).cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { cx.open_url(url); this.markRead(cx, [n]); })
      .child(div().size(7).flex_none().rounded(4).bg(n.unread ? t.accent : t.background))
      .child(svg(`mods/github/${icon}.svg`).size(14).flex_none().text_color(t.muted))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_color(n.unread ? t.foreground : t.muted).when(n.unread, (el) => el.font_semibold()).child(n.subject.title))
        .child(div().truncate().text_size(11).text_color(t.dim)
          .child(`${repoShort(repo)}${num ? ` #${num}` : ""} · ${REASONS[n.reason] ?? n.reason.replace(/_/g, " ")}`)))
      .when(n.unread, (el) => el.child(h_flex().id(`rd-${n.id}`).size(22).flex_none().items_center().justify_center().rounded(6)
        .text_color(t.dim).hover((s) => s.bg(t.selected).text_color(t.foreground)).tooltip("Mark as read")
        .on_click((_e, cx) => { cx.stop_propagation(); this.markRead(cx, [n]); })
        .child(svg("mods/github/check.svg").size(13))))
      .child(div().flex_none().w(34).truncate().text_size(11).text_color(t.dim).child(ago(n.updated_at)));
  }

  body(t) {
    const store = this.view === "prs" ? this.prs : this.inbox;
    if (!store.at && !store.error) return div().p(14).text_color(t.muted).child("Loading…");
    const parts = [];
    if (store.error) parts.push(div().id("github-err").m(2).p(10).flex_none().rounded(8).border_1().border_color(t.border).text_size(12)
      .text_color(t.blocked).child(`GitHub error: ${store.error}`));
    let rows = [];
    if (store.at && this.view === "prs") {
      const unreadKeys = new Set(this.inbox.items.filter((n) => n.unread && n.subject.type === "PullRequest").map((n) => `${n.repository.full_name}#${subjectNumber(n)}`));
      rows = this.shownPrs().map((pr) => this.prRow(t, pr, unreadKeys));
      if (rows.length === 0) parts.push(div().p(12).text_color(t.muted).child("No pull requests match these filters."));
    } else if (store.at) {
      rows = this.shownInbox().map((n) => this.inboxRow(t, n));
      if (rows.length === 0) parts.push(div().p(12).text_color(t.muted).child("Your inbox is clear for these filters."));
    }
    return v_flex().id("github-list").flex_1().min_h(0).px(8).py(6).gap(1).overflow_y_scrollbar().children(parts).children(rows);
  }

  render() {
    const t = theme();
    if (this.menu) return this.menu.render(t);
    return v_flex().id("github").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border)
      .text_color(t.foreground).text_size(13)
      .child(this.header(t))
      .child(this.viewTabs(t))
      .child(this.filters(t))
      .child(this.body(t))
      .child(h_flex().h(26).flex_none().px(14).items_center().border_t(1).border_color(t.border).text_size(11).text_color(t.dim)
        .child(this.view === "prs" ? "Click: open · Right-click: copy link" : "Click: open and mark read"));
  }
}
