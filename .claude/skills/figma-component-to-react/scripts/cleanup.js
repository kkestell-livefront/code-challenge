// Run with use_figma after setting PAGE_ID to the pageId render.js returned.
// Deletes the temporary page, and only that page.
const PAGE_ID = "REPLACE_ME";

const page = await figma.getNodeByIdAsync(PAGE_ID);
if (!page || page.type !== "PAGE" || page.name !== "tmp-figma-component-to-react")
  return { error: "unexpected node", type: page && page.type, name: page && page.name };
if (figma.currentPage === page) await figma.setCurrentPageAsync(figma.root.children.find(p => p !== page));
page.remove();
return { removedNodeIds: [PAGE_ID], pages: figma.root.children.map(p => p.name) };
