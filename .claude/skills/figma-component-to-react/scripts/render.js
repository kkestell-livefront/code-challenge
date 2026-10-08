// Run with use_figma after setting SET_ID. Builds a temporary page with one
// transparent wrapper frame per variant per mode set, sized to the variant plus
// its effects, and leaves it in place. Export each returned frameId with
// download_assets, then delete the page with cleanup.js. Every image's content
// sits at the returned offset, which is what capture.mjs needs to line the
// browser render up with it.
const SET_ID = "REPLACE_ME";
const MODE_SETS = [{}]; // e.g. [{}, { "Colors": "Dark Mode" }]; keys are collection names
const VARIANTS = null; // e.g. ["State=Default, Size=Large"]; null for all

let set = await figma.getNodeByIdAsync(SET_ID);
if (set && set.type === "COMPONENT" && set.parent && set.parent.type === "COMPONENT_SET") set = set.parent;
if (!set || set.type !== "COMPONENT_SET") return { error: "not a component set", type: set && set.type };
const targets = set.children.filter(v => !VARIANTS || VARIANTS.includes(v.name));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const caseName = (v, modes) => [slug(v.name), ...Object.values(modes).map(slug)].join("--");

// Collections by name: local ones, plus library collections the set's variables use.
const collections = {};
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) collections[c.name] = c;
const wanted = [...new Set(MODE_SETS.flatMap(m => Object.keys(m)))];
if (wanted.some(n => !collections[n])) {
  const ids = new Set();
  const collect = bv => { for (const val of Object.values(bv || {})) for (const a of [].concat(val)) if (a && a.id) ids.add(a.id); };
  for (const n of [set, ...set.findAll()]) {
    collect(n.boundVariables);
    for (const k of ["fills", "strokes"]) if (Array.isArray(n[k])) n[k].forEach(p => collect(p.boundVariables));
  }
  for (const id of ids) {
    const v = await figma.variables.getVariableByIdAsync(id);
    const c = v && await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    if (c && !collections[c.name]) collections[c.name] = c;
  }
}
const resolveModes = modes => Object.entries(modes).map(([colName, modeName]) => {
  const col = collections[colName];
  if (!col) throw new Error(`No collection ${colName}. Known: ${Object.keys(collections).join(", ") || "none"}`);
  const mode = col.modes.find(m => m.name === modeName);
  if (!mode) throw new Error(`No mode ${modeName} in ${colName}. Modes: ${col.modes.map(m => m.name).join(", ")}`);
  return { col, modeId: mode.modeId };
});

const home = figma.currentPage;
const page = figma.createPage();
page.name = "tmp-figma-component-to-react";
page.backgrounds = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
const created = [page.id], cases = [];
let keep = false;
try {
  let y = 0;
  for (const modes of MODE_SETS) {
    const settings = resolveModes(modes);
    let x = 0, rowH = 0;
    for (const v of targets) {
      const inst = v.createInstance();
      page.appendChild(inst);
      created.push(inst.id);
      for (const { col, modeId } of settings) inst.setExplicitVariableModeForCollection(col, modeId);
      // Pad each side by the effects' overhang, rounded up to whole pixels.
      const b = inst.absoluteBoundingBox, rb = inst.absoluteRenderBounds || b;
      const pad = {
        l: Math.max(0, Math.ceil(b.x - rb.x)), t: Math.max(0, Math.ceil(b.y - rb.y)),
        r: Math.max(0, Math.ceil(rb.x + rb.width - (b.x + b.width))), b: Math.max(0, Math.ceil(rb.y + rb.height - (b.y + b.height))),
      };
      const fw = Math.ceil(pad.l + inst.width + pad.r), fh = Math.ceil(pad.t + inst.height + pad.b);
      const f = figma.createFrame();
      page.appendChild(f);
      created.push(f.id);
      f.name = caseName(v, modes);
      f.fills = [];
      f.clipsContent = true;
      f.resize(fw, fh);
      f.x = x; f.y = y;
      f.appendChild(inst);
      inst.x = pad.l; inst.y = pad.t;
      cases.push({ name: f.name, variant: v.name, modes, frameId: f.id, frame: [fw, fh], offset: [pad.l, pad.t],
        size: [Math.round(inst.width * 100) / 100, Math.round(inst.height * 100) / 100] });
      x += fw + 200;
      rowH = Math.max(rowH, fh);
    }
    y += rowH + 200;
  }
  keep = true;
} finally {
  if (!keep) {
    // The current page can't be removed, so return to the original first.
    if (figma.currentPage === page) await figma.setCurrentPageAsync(home);
    page.remove();
  }
}
return { pageId: page.id, createdNodeIds: created, cases };
