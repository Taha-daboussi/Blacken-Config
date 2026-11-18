import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, ScrollHandle } from "gpui-base";
import { spaces, run, theme, props, closeOverlay, shared, setShared } from "herdr";

const RECENT_KEY = "space-switcher.recent";
const MARK = { ansi6: "#22a99a", ansi3: "#e3814f", ansi4: "#5b8def", ansi5: "#8b7cf6", ansi2: "#3fae6a", ansi1: "#d9649a" };
const ROW_H = 34;
const LIST_MAX = ROW_H * 9;

function spaceColor(t, p) {
  if (p.name === "~") return t.dim;
  const c = (shared("space.colors") ?? {})[p.id] ?? "ansi6";
  return c.startsWith("#") ? c : (MARK[c] ?? t[c] ?? t.accent);
}

function remember(id) {
  const ids = new Set(spaces().map((p) => p.id));
  const next = [id, ...(shared(RECENT_KEY) ?? []).filter((x) => x !== id && ids.has(x))];
  const old = shared(RECENT_KEY) ?? [];
  if (next.length !== old.length || next.some((x, i) => x !== old[i])) setShared(RECENT_KEY, next);
}

function score(text, q) {
  const s = text.toLowerCase();
  if (s.startsWith(q)) return 3;
  if (s.split(/[\s\-_/.]+/).some((w) => w.startsWith(q))) return 2.5;
  if (s.includes(q)) return 2;
  let i = 0;
  for (const ch of s) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

export default class SpaceSwitcher extends View {
  init(_props, cx) {
    this.query = "";
    this.at = 0;
    this.list = ScrollHandle.new();
    this.handle = cx.focus_handle();
    const here = spaces().find((p) => p.active);
    if (here) remember(here.id);
    this.input = InputState.new({ placeholder: "Where would you like to go?" });
    this.input.on("change", (_e, cx) => {
      this.query = this.input.value().trim().toLowerCase();
      this.at = 0;
      this.list.scroll_to_item(0);
      cx.notify();
    });
    this.input.on("submit", () => this.go(this.rows()[this.at]));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
  }

  close() {
    closeOverlay(props().overlay);
  }

  rows() {
    const recent = shared(RECENT_KEY) ?? [];
    const rank = (p) => {
      const i = recent.indexOf(p.id);
      return i < 0 ? recent.length + p.index : i;
    };
    const all = spaces();
    if (!this.query) {
      const others = all.filter((p) => !p.active).sort((a, b) => rank(a) - rank(b));
      return [...others, ...all.filter((p) => p.active)];
    }
    return all
      .map((p) => ({ p, s: Math.max(score(p.name, this.query), score(p.machine ?? "", this.query) * 0.8, score(p.branch ?? "", this.query) * 0.6) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || rank(a.p) - rank(b.p))
      .map((x) => x.p);
  }

  go(p) {
    if (!p) return;
    this.close();
    remember(p.id);
    if (!p.active) run("space.select", { id: p.id });
  }

  glyph(t, st) {
    if (st === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900);
    if (!st) return div().w(12).flex_none();
    return div().w(12).flex_none().text_size(10).text_color(t[st] ?? t.dim).child(st === "idle" ? "○" : "●");
  }

  row(t, p, on) {
    const tabs = `${p.tabs.length} tab${p.tabs.length === 1 ? "" : "s"}`;
    return h_flex()
      .id(`ss-${p.id}`)
      .h(ROW_H)
      .flex_none()
      .px(10)
      .gap(10)
      .items_center()
      .rounded(6)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.selected ?? t.hover))
      .hover((s) => s.bg(t.hover))
      .on_click(() => this.go(p))
      .child(h_flex().size(20).flex_none().rounded(5).bg(spaceColor(t, p)).items_center().justify_center().text_size(11).font_bold().text_color("#ffffff").child([...p.name][0]?.toUpperCase() ?? "?"))
      .child(div().flex_none().max_w(260).truncate().text_size(14).text_color(t.foreground).when(p.active, (d) => d.font_semibold()).child(p.name))
      .when(!!p.branch, (el) => el.child(div().flex_shrink(1).min_w(0).truncate().text_size(11).text_color(t.dim).child(p.branch)))
      .child(div().flex_1())
      .when(p.status === "blocked", (el) => el.child(div().text_size(11).text_color(t.blocked).child("needs you")))
      .child(this.glyph(t, p.status))
      .child(div().flex_none().text_size(12).text_color(t.muted).child(p.active ? "current" : (p.machine ?? tabs)));
  }

  render() {
    const t = theme();
    const rows = this.rows();
    this.at = Math.max(0, Math.min(this.at, rows.length - 1));
    const move = (d, cx) => {
      if (!rows.length) return;
      this.at = (this.at + d + rows.length) % rows.length;
      this.list.scroll_to_item(this.at);
      cx.stop_propagation();
      cx.notify();
    };
    const key = (k) => div().px(5).rounded(4).bg(t.raised).text_color(t.foreground).font_semibold().child(k);

    return v_flex()
      .id("space-switcher")
      .track_focus(this.handle)
      .w_full()
      .p(16)
      .gap(12)
      .bg(t.popover)
      .text_size(13)
      .on_key_down((e, cx) => {
        const k = e.key;
        const ctrl = e.modifiers.control;
        if (k === "escape") return this.close();
        if (k === "down" || (k === "tab" && !e.modifiers.shift) || (ctrl && k === "n")) move(1, cx);
        else if (k === "up" || (k === "tab" && e.modifiers.shift) || (ctrl && k === "p")) move(-1, cx);
      })
      .child(
        h_flex().h(48).flex_none().px(12).items_center().rounded(8).border_1().border_color(t.input ?? t.border).bg(t.background)
          .child(Input.new(this.input).flex_1().h_full().text_size(17).text_color(t.foreground)),
      )
      .child(div().px(10).text_size(12).font_semibold().text_color(t.muted).child(this.query ? "Spaces" : "Previous Spaces"))
      .child(
        rows.length
          ? v_flex().id("ss-list").max_h(LIST_MAX).overflow_y_scrollbar().track_scroll(this.list).children(rows.map((p, i) => this.row(t, p, i === this.at)))
          : div().px(10).py(10).text_color(t.dim).child("No space matches."),
      )
      .child(
        h_flex().gap(6).items_center().text_size(11).text_color(t.dim).flex_wrap()
          .child(key("↑↓")).child("move")
          .child(key("Enter")).child("go")
          .child(key("Esc")).child("close")
          .child(div().flex_1())
          .child("Search by name, branch or machine"),
      );
  }
}
