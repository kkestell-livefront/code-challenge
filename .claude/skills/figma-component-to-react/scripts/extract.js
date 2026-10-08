// Read-only. Run with use_figma after setting SET_ID.
// Returns the set's properties, every layer of the default variant, and for each
// other variant only what differs from its nearest neighbour (the same variant
// with one property reset to its default). Layer paths are lowercased so that a
// layer renamed only by case ("Icon" vs "icon") still matches.
//
// If the result is too large for one response, it returns a summary instead.
// Then rerun with PART = "base", and with PART = "variants" and a SLICE of
// variant indexes, e.g. [0, 8], until every variant is covered.
const SET_ID = "REPLACE_ME";
const PART = "all"; // "all" | "base" | "variants"
const SLICE = null; // [start, end) into the variant list, for PART = "variants"

let set = await figma.getNodeByIdAsync(SET_ID);
if (set && set.type === "COMPONENT" && set.parent && set.parent.type === "COMPONENT_SET") set = set.parent;
if (!set || set.type !== "COMPONENT_SET") return { error: "not a component set", type: set && set.type };

// Variables are named "Collection/variable". Collections are recorded as they're
// met, so library collections the component uses are reported too.
const varCache = {}, usedCollections = {};
async function varName(id) {
  if (!(id in varCache)) {
    const v = await figma.variables.getVariableByIdAsync(id);
    const col = v && await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    if (col) usedCollections[col.id] = { name: col.name, modes: col.modes.map(m => m.name), remote: col.remote };
    varCache[id] = v ? `${col ? col.name + "/" : ""}${v.name}` : id;
  }
  return varCache[id];
}
const r = v => Math.round(v * 100) / 100;
const hex = c => "#" + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
async function paints(arr) {
  const out = [];
  for (const p of arr) {
    if (p.visible === false) continue;
    let s = p.type === "SOLID" ? hex(p.color) : p.type === "IMAGE" ? `IMAGE(${p.scaleMode})` : p.type;
    if (p.opacity !== undefined && p.opacity < 1) s += `@${r(p.opacity)}`;
    if (p.boundVariables && p.boundVariables.color) s += ` {${await varName(p.boundVariables.color.id)}}`;
    out.push(s);
  }
  return out.join(", ");
}
async function props(n) {
  const d = { name: n.name, type: n.type };
  if (n.visible === false) d.hidden = "true";
  d.size = `${r(n.width)}x${r(n.height)}`;
  if ("layoutMode" in n && n.layoutMode !== "NONE")
    d.autolayout = `${n.layoutMode} gap ${n.itemSpacing} pad ${[n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].join(" ")} align ${n.primaryAxisAlignItems}/${n.counterAxisAlignItems}${n.layoutWrap === "WRAP" ? " wrap" : ""}`;
  const inAL = n.parent && "layoutMode" in n.parent && n.parent.layoutMode !== "NONE";
  if (inAL || d.autolayout) d.sizing = `${n.layoutSizingHorizontal}/${n.layoutSizingVertical}`;
  if (n.layoutPositioning === "ABSOLUTE") d.absolute = "true";
  for (const k of ["minWidth", "maxWidth", "minHeight", "maxHeight"]) if (n[k] != null) d[k] = String(n[k]);
  if ("cornerRadius" in n && n.cornerRadius) d.radius = String(n.cornerRadius === figma.mixed ? [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius] : n.cornerRadius);
  if ("clipsContent" in n && n.clipsContent) d.clips = "true";
  if ("opacity" in n && n.opacity < 1) d.opacity = String(r(n.opacity));
  if (Array.isArray(n.fills) && n.fills.length) { const f = await paints(n.fills); if (f) d.fill = f; }
  if (Array.isArray(n.strokes) && n.strokes.length) { const s = await paints(n.strokes); if (s) d.stroke = `${s} ${n.strokeWeight === figma.mixed ? [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight].join(",") : n.strokeWeight} ${n.strokeAlign}`; }
  for (const [k, label] of [["fillStyleId", "fillStyle"], ["strokeStyleId", "strokeStyle"]]) {
    if (n[k] && n[k] !== figma.mixed) { const st = await figma.getStyleByIdAsync(n[k]); if (st) d[label] = st.name; }
  }
  if (Array.isArray(n.effects) && n.effects.length) {
    const fx = n.effects.filter(e => e.visible !== false).map(e => `${e.type}${e.color ? " " + hex(e.color) + "@" + r(e.color.a) : ""}${e.offset ? ` ${e.offset.x},${e.offset.y}` : ""}${e.radius != null ? ` blur ${e.radius}` : ""}${e.spread ? ` spread ${e.spread}` : ""}`);
    if (fx.length) d.effects = fx.join("; ");
  }
  if (n.effectStyleId) { const s = await figma.getStyleByIdAsync(n.effectStyleId); if (s) d.effectStyle = s.name; }
  for (const [k, val] of Object.entries(n.boundVariables || {})) {
    if (k === "fills" || k === "strokes") continue;
    const ids = (Array.isArray(val) ? val : [val]).filter(a => a && a.id);
    if (ids.length) d[`var.${k}`] = (await Promise.all(ids.map(a => varName(a.id)))).join(",");
  }
  if (n.type === "TEXT") {
    d.text = n.characters;
    d.textResize = n.textAutoResize;
    if (n.textTruncation && n.textTruncation !== "DISABLED") d.truncation = n.textTruncation;
    if (n.maxLines != null) d.maxLines = String(n.maxLines);
    const fontOf = (fn, size, lh) => `${fn.family} ${fn.style} ${size}/${lh.unit === "AUTO" ? "auto" : r(lh.value) + (lh.unit === "PERCENT" ? "%" : "")}`;
    if (n.fontName === figma.mixed || n.fontSize === figma.mixed || n.lineHeight === figma.mixed || n.fills === figma.mixed || n.textStyleId === figma.mixed) {
      // Runs with different styling, e.g. a bold word inside a sentence.
      const segs = n.getStyledTextSegments(["fontName", "fontSize", "lineHeight", "fills", "textStyleId"]);
      d.runs = [];
      for (const g of segs) {
        const st = g.textStyleId ? await figma.getStyleByIdAsync(g.textStyleId) : null;
        d.runs.push(`"${g.characters}": ${fontOf(g.fontName, g.fontSize, g.lineHeight)} ${await paints(g.fills)}${st ? ` [${st.name}]` : ""}`);
      }
      d.runs = d.runs.join(" | ");
    } else {
      d.font = fontOf(n.fontName, n.fontSize, n.lineHeight);
      if (n.textStyleId) { const s = await figma.getStyleByIdAsync(n.textStyleId); if (s) d.textStyle = s.name; }
    }
  }
  if (n.componentPropertyReferences && Object.keys(n.componentPropertyReferences).length) d.propRefs = JSON.stringify(n.componentPropertyReferences);
  if (n.type === "INSTANCE") {
    const m = await n.getMainComponentAsync();
    if (m) d.instanceOf = (m.parent && m.parent.type === "COMPONENT_SET" ? m.parent.name + " / " : "") + m.name;
    if (Object.keys(n.componentProperties || {}).length) d.instanceProps = JSON.stringify(Object.fromEntries(Object.entries(n.componentProperties).map(([k, v]) => [k, v.value])));
  }
  if (n.reactions && n.reactions.length) d.reactions = JSON.stringify(n.reactions.map(x => ({ trigger: x.trigger && x.trigger.type, actions: (x.actions || []).map(a => a.type + (a.navigation ? ":" + a.navigation : "")) })));
  if (n.annotations && n.annotations.length) d.annotations = JSON.stringify(n.annotations.map(a => a.label || a.labelMarkdown).filter(Boolean));
  return d;
}
// Flatten to path -> props. Duplicate sibling names get an index suffix.
// Nested instances are walked too, so their text and icons are visible.
async function flatten(root) {
  const out = {};
  async function go(n, path) {
    out[path] = await props(n);
    if (!("children" in n)) return;
    const seen = {};
    for (const c of n.children) {
      const nm = c.name.toLowerCase();
      const dup = n.children.filter(x => x.name.toLowerCase() === nm).length > 1;
      const i = seen[nm] = (seen[nm] ?? -1) + 1;
      await go(c, `${path} > ${nm}${dup ? `[${i}]` : ""}`);
    }
  }
  await go(root, "");
  return out;
}
function diff(a, b) {
  const changes = {};
  for (const p of Object.keys(b)) {
    if (!(p in a)) { changes[p || "(root)"] = { added: b[p] }; continue; }
    const c = {};
    for (const k of new Set([...Object.keys(a[p]), ...Object.keys(b[p])])) {
      if (k === "name") continue;
      if (a[p][k] !== b[p][k]) c[k] = `${a[p][k] ?? "∅"} → ${b[p][k] ?? "∅"}`;
    }
    if (Object.keys(c).length) changes[p || "(root)"] = c;
  }
  for (const p of Object.keys(a)) if (!(p in b)) changes[p] = "removed";
  return changes;
}

const defs = set.componentPropertyDefinitions;
const variantDefs = Object.entries(defs).filter(([, d]) => d.type === "VARIANT");
const key = vp => variantDefs.map(([k]) => `${k}=${vp[k]}`).join(", ");
const byKey = {}; for (const v of set.children) byKey[key(v.variantProperties)] = v;
const defaultProps = Object.fromEntries(variantDefs.map(([k, d]) => [k, d.defaultValue]));
const base = byKey[key(defaultProps)] || set.defaultVariant;

const flat = {};
for (const v of set.children) flat[v.id] = await flatten(v);

const variants = [];
for (const v of set.children) {
  if (v === base) continue;
  let ref = base;
  for (const [k, d] of variantDefs) {
    if (v.variantProperties[k] === d.defaultValue) continue;
    const cand = byKey[key({ ...v.variantProperties, [k]: d.defaultValue })];
    if (cand) { ref = cand; break; }
  }
  variants.push({ variant: v.name, id: v.id, comparedTo: ref.name, description: v.description || undefined, changes: diff(flat[ref.id], flat[v.id]) });
}

const missing = [];
const combos = variantDefs.reduce((acc, [k, d]) => acc.flatMap(a => d.variantOptions.map(o => ({ ...a, [k]: o }))), [{}]);
for (const c of combos) if (!byKey[key(c)]) missing.push(key(c));

// Where instances of each variant appear, counted by top-level frame.
const usage = {};
for (const v of set.children) {
  const where = {};
  for (const i of await v.getInstancesAsync()) {
    let top = i; while (top.parent && top.parent.type !== "PAGE") top = top.parent;
    if (top === i) continue;
    const k = `${top.parent ? top.parent.name : "?"} › ${top.name} (${top.id})`;
    where[k] = (where[k] || 0) + 1;
  }
  usage[v.name] = where;
}

const summary = {
  set: { id: set.id, name: set.name, description: set.description || undefined, docs: set.documentationLinks.length ? set.documentationLinks : undefined, properties: defs },
  variantCount: set.children.length, missingCombinations: missing,
  collections: Object.values(usedCollections), usage,
};
const baseOut = { variant: base.name, id: base.id, layers: flat[base.id] };
if (PART === "base") return { base: baseOut };
if (PART === "variants") return { variants: SLICE ? variants.slice(...SLICE) : variants, of: variants.length };
const out = { ...summary, base: baseOut, variants };
if (JSON.stringify(out).length <= 19500) return out;
return { tooLarge: true, ...summary, hint: "Rerun with PART = \"base\", then PART = \"variants\" with SLICE ranges over the " + variants.length + " compared variants." };
