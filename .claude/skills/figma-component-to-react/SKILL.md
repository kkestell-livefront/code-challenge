---
name: figma-component-to-react
description: Turn a Figma component set into a React component using only the Figma MCP server. Use when the user gives a Figma component set (a URL or node id for the set or one of its variants) and wants it built in React. Breaks the set down, decides what the design leaves unsaid, builds the component, compares browser renders with Figma pixel by pixel, and reports every guess.
---

# Figma component set to React

A component set's screenshots show each variant with one set of sample
content, at one size, standing still. Everything else (what's data, what's a
prop, how text overflows, what clicking does) has to be read from the file's
structure or inferred. This skill makes that inference explicit: every
decision records where it came from, and every guess ends up in the final
report so the user knows what to scrutinize.

## Requirements

- The remote Figma MCP server (the claude.ai Figma connector). The desktop
  server has no `use_figma` or `download_assets`.
- Load the `figma-use` guidance before the first `use_figma` call: the
  `/figma-use` skill if installed, otherwise `get_figma_skill` with
  `skill://figma/figma-use/SKILL.md`. Pass `skillNames` on every call as it
  instructs.
- Edit access to the file. Step 2 creates a temporary page and deletes it.
- A Figma URL with a `node-id` for the set or any of its variants.
- A React project to put the component in. If the working directory has none,
  ask where the component should go. Ask nothing else up front.
- Node, and Playwright for step 5. If the project doesn't have Playwright,
  install it in a scratch directory outside the project
  (`npm i playwright && npx playwright install chromium-headless-shell`)
  rather than adding a dependency to the project.

The scripts in [scripts/](scripts/) are run as written, with only the
constants at the top changed. The `.js` files run inside Figma via
`use_figma`; the `.mjs` files run locally with Node.

## Working files

Every image this skill looks at or produces is saved under
`.ligma/<component>/` at the project root (`<component>` is the set's name in
kebab case), so the user can open the same files and follow along:

| Path | Contents |
| --- | --- |
| `figma/<case>.png` | Each variant in each mode, exported from Figma (step 2) |
| `screens/<screen>.png` | Screens where the component is used (step 2) |
| `assets/` | Icons and images from `download_assets` (step 4) |
| `cases.json` | `render.js`'s result: each case's frame, offset, and size |
| `manifest.json` | The comparison manifest (step 5) |
| `react/<case>.png` | Browser renders (step 5) |
| `diff/` | Diff images, strips, and `report.html` (step 5) |

Before step 2, create the directory and make sure `.ligma/` is gitignored
(add `/.ligma/` to `.gitignore` if it isn't), then tell the user the path.
Look at an image by reading its file, never inline, so the user sees
exactly what you see. Download every Figma URL as soon as it's returned (the
URLs are short-lived). On a rerun, overwrite the files in place.

## Labeling decisions

Every decision in step 3 gets one source:

| Source | Meaning |
| --- | --- |
| figma | Read from the file: property definitions, auto layout, text truncation, variables and styles, prototype reactions, descriptions, annotations |
| usage | Inferred from how instances appear in the file's screens |
| screenshot | Seen in a render but absent from the data |
| name | Inferred from a property, value, or layer name alone |
| guess | Judgment with no evidence. Every guess goes in the report |

## 1. Extract

Run [scripts/extract.js](scripts/extract.js) with `use_figma`, setting
`SET_ID`. It only reads. It returns:

- `set.properties`: every component property, its type, default, and options.
- `missingCombinations`: variant combinations that have no component.
- `collections`: the variable collections the component uses, local or from
  a library, with their modes.
- `usage`: for each variant, the screens (top-level frames, with ids) where
  its instances appear, and how many.
- `base.layers`: every layer of the default variant (including inside nested
  instances), keyed by path, with size, auto layout, sizing
  (FIXED/HUG/FILL), fills and strokes (`{Collection/variable}` when bound to
  a variable, `fillStyle`/`strokeStyle` when using a style), effects, text
  content, text resize mode, truncation, max lines, text style (or `runs`
  for mixed styling), instance properties, and prototype reactions.
- `variants[].changes`: what each other variant changes, compared with its
  nearest neighbour (the same variant with one property reset to its
  default). Layers added, removed, or changed. When a variant restructures
  its layers (wrapping them in a new frame, say), the same layers show up as
  removed and re-added under new paths.

If it returns `tooLarge`, follow its `hint`. Read the set's `description`
and any `annotations` first: what the designer wrote outranks every
inference. Several fills on one layer stack, top last: a solid with a
translucent black over it is a darkened color, not two colors.

## 2. Look

- Run [scripts/render.js](scripts/render.js) with `MODE_SETS` holding the
  default (`{}`) plus, for each collection in `collections` with more than
  one mode, each other mode, e.g. `[{}, { "<collection>": "<mode>" }]`. It
  leaves a temporary page holding one transparent wrapper frame per case and
  returns `pageId` and, per case, its `name`, `frameId`, `frame` size, the
  component's `offset` inside the frame, and its `size`. Save the result to
  `cases.json`.
- Call `download_assets` on each `frameId` with `defaultFormat: "png"` and
  `defaultScale: 2`, in parallel, and save each `export.url` to
  `figma/<name>.png`. Step 5 compares against these same files.
- Run [scripts/cleanup.js](scripts/cleanup.js) with the `pageId`. Check the
  returned page list matches the file's pages before.
- Read every `figma/` image. Each shows one variant in isolation with its
  effects.
- Take `get_screenshot` of one or two screens from `usage`, save each to
  `screens/<screen>.png`, and read it, to see the component in context: how
  wide it is, how many sit in a row, what surrounds it. Prefer real screens
  over pages that look archived or exploratory.
- Some variants differ only by a shadow or a faint overlay. Use step 1's
  `changes` to know what to look for in each.
- When a layer's name and its render disagree (a checkmark named
  `chevron-down`), trust the render.

## 3. Analyze

Work through these in order. Keep the answers, with their sources, as a
working list. It drives the build and the report.

1. **Inputs.** Classify every variant value:
   - *Interaction* (hover, focus, pressed or "active" in the pressed
     sense): the browser drives these. Use CSS; never expose them as props.
   - *Toggled by the user* (open/closed, expanded, checked when the
     component itself is the checkbox): state the component manages, which
     the app can optionally control (`open` with `onOpenChange`, and so on).
   - *Status* (loading, disabled, error, selected when the app decides): app
     state, so a prop.
   - *Layout* (size, density, orientation): a prop, unless `usage` shows it
     tracking screen size, in which case it may be responsive.
   - *Appearance* (primary, secondary, ...): a prop.

   One property often mixes kinds (`State` = Default/Hover/Loading, or
   Primary/Secondary/Inactive) and splits into several props plus CSS
   states. A value can also describe one item inside the component rather
   than the whole thing (one option shown checked in an open list): that
   becomes per-item data or a `value` prop, not a component state. BOOLEAN
   properties become optional content, TEXT properties become string props,
   INSTANCE_SWAP properties become icon or slot props. For
   `missingCombinations`, and for states that can happen together (focused
   and hovered, loading and hovered, disabled and focused, pressed and
   hovered), decide which wins or how they combine.

   If the component is clearly interactive but has no hover, focus, or
   pressed variants, design them in the component's own idiom (at minimum a
   visible focus style) and report them as guesses.
2. **Content.** For every text, image, and icon layer, decide whether it's
   data or fixed. It's data if it's bound to a TEXT property, reads like a
   record field (a name, price, date, or count), or changes between
   instances in the usage screens. Sibling layers with the same structure
   (rows, options, tabs) are a list. Record the type, format (decimals,
   units, how a list is joined), and examples, and whether it's required
   and what shows when it's absent. A row of identical glyphs whose fills
   switch between two colors usually encodes a number: a rating, a level,
   or progress.
3. **Overflow.** For every data text layer in every layout:
   - `TRUNCATE` with `truncation: ENDING`: ellipsis after `maxLines` lines
     (one line if unset).
   - `HEIGHT`: wraps and grows. If an ancestor has a FIXED height, growth
     will overflow it, so pick a line limit.
   - `NONE`: a fixed box that clips mid-word. Rarely intended. Pick a
     truncation.
   - `WIDTH_AND_HEIGHT`: one line that grows sideways. Check whether a
     FIXED-width parent will overflow.

   For images, `IMAGE(FILL)` is `object-fit: cover` and `IMAGE(FIT)` is
   `contain`. Decide the aspect ratio and what shows with no image.
4. **Size.** Root sizing FIXED or HUG in each layout. If the usage screens
   show it in a grid or stretched to a column, it probably fills its
   container, with the Figma width as a reference rather than a rule. Note
   which children FILL, since they absorb extra space.
5. **Values.** Variables and styles become CSS custom properties (or the
   project's existing tokens with the same meaning). Text styles map to the
   project's typography. Raw values in a component that otherwise uses
   variables or styles are suspect, especially colors: check the other-mode
   renders for anything that broke. Check the project loads the fonts; if a
   font isn't available, say so, since every text comparison in step 5 will
   differ.
6. **Behavior.** Interaction variants mean the component is interactive.
   Choose the element: a link if it navigates (a prototype `NAVIGATE`
   reaction, or a screen it obviously leads to), a button if it performs an
   action, or the matching native or ARIA pattern for a composite widget
   (disclosure, listbox, menu, tabs). Never a `div` with a click handler.
   Use the Focus variant for `:focus-visible`, Pressed for `:active`, and
   Hover inside `@media (hover: hover)`. Decide whether a disabled or
   loading component can be focused or activated.
7. **Accessibility.** The accessible name, alt text for data images (from
   which field), `aria-hidden` on decorative icons, a text equivalent for
   anything encoded visually ("level 2 of 3"), and announced states
   (`aria-busy`, `aria-expanded`, `aria-selected`, `aria-pressed`, ...).
8. **Modes.** How the app switches modes: `prefers-color-scheme`, a class,
   or an attribute. Match the project. If it has no convention, use
   `prefers-color-scheme`.
9. **Motion.** Prototype reactions with `SMART_ANIMATE` or a duration give
   the transition. Otherwise use a short transition on the properties that
   change between interaction states, and none under
   `prefers-reduced-motion`. A gradient placeholder in a loading state
   suggests an animated shimmer.
10. **Design inconsistencies.** Differences in `changes` that look
    accidental: a text style on one variant but not its siblings, a layer
    restructured in one variant, a value that changes in a state for no
    visible reason, or a raw color that breaks in another mode. Implement
    what was probably intended and report it.

Don't stop to ask during analysis. Make the call, label it, and carry on.

## 4. Build

- Read the project before writing: framework, TypeScript, styling approach,
  existing tokens, components to reuse (a button, icon, skeleton, visually
  hidden text), where components live, and how they're named. Match it.
- Props come from steps 3.1 and 3.2: content as data fields, plus status,
  layout, and appearance props, and controlled/uncontrolled pairs for state
  the user toggles. Forward the usual extras (`className`, `href` or
  `onClick`) the way the project does.
- Style each difference in `changes` once, on the variant that introduces
  it. Interaction states use pseudo-classes. Use tokens, with Figma's values
  only where no token exists.
- Get icons as SVG from `download_assets` (`svgAssets`) on the base variant,
  save them and any `rawImages` to `assets/`, and copy the icons the
  component uses to where the project keeps assets. Use `rawImages` only as
  demo content, never as part of the component.
- Add a demo (a story if the project has Storybook, otherwise a page or
  route) that shows every variant in every mode with the sample content,
  plus stress cases: long text, missing optional content, and extreme
  values.
- Add a comparison page for step 5 (it can be the demo page): one wrapper
  per case, `<div data-figma-case="<case name>">`, whose first child is the
  component's root element, rendered with the variant's props and the
  Figma sample content. Give each wrapper enough padding that nothing else
  falls within the case's frame, and if the component fills its container,
  make the wrapper the Figma width. Render interaction cases at rest; step 5
  applies the interaction. For modes the app switches by class or
  attribute, wrap the case accordingly; for `prefers-color-scheme`, set
  `colorScheme` in the manifest.

## 5. Compare

1. Write `manifest.json` (the format is at the top of
   [scripts/capture.mjs](scripts/capture.mjs)) with one case per image in
   `figma/`: the selector, the interaction (`hover`, `focus`, `active`) for
   interaction variants, `colorScheme` for `prefers-color-scheme` modes,
   `frame`, `offset`, and `size` from `cases.json`, `figma/<name>.png`, and
   `react/<name>.png`.
2. Start the project's dev server and run
   `node capture.mjs .ligma/<component>/manifest.json`, from a directory
   where Playwright is installed. It renders each case at the same scale
   with a transparent page, applies the interaction with real input
   (keyboard Tab for focus), crops to the same frame, and saves it to
   `react/`. It warns when the component's rendered size differs from
   Figma's.
3. Run `node diff.mjs .ligma/<component>/manifest.json`. For each case it
   writes `diff/<name>.png` (black where the images match, red where they
   don't, brighter for larger differences) and `diff/<name>.strip.png`
   (Figma, browser, and diff side by side), plus `diff/report.html`.
   Matching tolerates anti-aliasing and one-pixel shifts
   (`--threshold 16 --radius 1`); don't loosen it to make a case pass.
4. Read every strip. Fix differences in layout, spacing, color, and
   effects, then rerun steps 2–3. A difference that remains has to be one
   of these, and goes in the report as such:
   - the font isn't available to the browser, or glyphs rasterize
     differently;
   - a decision from step 3 that departs from the design on purpose (a
     truncation the design didn't have, a focus ring drawn outside the
     box);
   - a state combination the browser forces: pressing with a mouse also
     hovers, so a Pressed case shows hover effects that Figma's Pressed
     variant doesn't.

Also run the project's typecheck, lint, and tests, and check the stress
cases behave as decided. If something couldn't be compared, say so in the
report.

## 6. Report

Keep it short:

- **Built:** the files, and the props with their types.
- **Guesses**, highest impact first: behavior and element, then the data
  contract (props, what's required), then overflow and sizing, then state
  combinations, then visuals and motion. For each: what was chosen, the
  main alternative, and where in the code to change it.
- **Design issues:** inconsistencies and raw values found in the file, and
  what was done about each.
- **Comparison:** the path to `.ligma/<component>/diff/report.html`, and
  each remaining difference with its reason from step 5.4.
- **Not verified:** anything that couldn't be checked.

Leave out decisions sourced from `figma` unless they're surprising.
