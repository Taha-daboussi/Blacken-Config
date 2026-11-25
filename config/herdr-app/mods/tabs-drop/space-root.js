import { spaces, panes, focused, layout, home, run } from "herdr";

export const KEY_ACTIONS = {
  "tab.new": "tabs-drop.new-tab",
  "pane.split:right": "tabs-drop.split-right",
  "pane.split:down": "tabs-drop.split-down",
};

function findRoots(node) {
  const roots = node?.content?.mod === "files-space" ? node.content.props?.roots : null;
  if (roots) return roots;
  for (const child of node?.children ?? []) {
    const found = findRoots(child);
    if (found) return found;
  }
  return null;
}

function spaceOfPane(pane) {
  const tab = panes().find((p) => p.pane === pane)?.tab;
  return tab ? spaces().find((s) => (s.tabs ?? []).some((t) => t.id === tab))?.id : undefined;
}

export function spaceRoot(spaceId) {
  const space = spaces().find((s) => s.id === spaceId);
  if (!space) return null;
  const root = findRoots(layout())?.[space.id] || space.folder;
  if (!root) return null;
  return !space.machine && root.startsWith("~/") ? home() + root.slice(1) : root;
}

export function splitInRoot(direction, pane) {
  const folder = spaceRoot(pane ? spaceOfPane(pane) : focused()?.space);
  if (!folder) return run("pane.split", pane ? { direction, pane } : { direction });
  if (pane) run("pane.focus", { pane });
  return run("terminal.open", { folder, place: direction });
}

export function newTabInRoot(args = {}) {
  const folder = spaceRoot(args.space ?? focused()?.space ?? spaces().find((s) => s.active)?.id);
  return run("tab.new", folder ? { ...args, folder } : args);
}
