# UI SDK notes for ticket 08 (Kiosk name picker) and ADR-0002

Verdict: **UI SDK exists, is on npm, and is usable for the picker.** It needs a small custom primitive. The ready-made `Listbox` component has no 2-D grid navigation and no filtering. No reason to fall back to shadcn Command on availability grounds.

I unpacked both tarballs (read only, nothing run) into:
- `<unpacked @ui-sdk/react tarball>/package/` (abbrev. `R/`)
- `<unpacked @ui-sdk/core tarball>/package/` (abbrev. `C/`)
- These were unpacked from `npm pack @ui-sdk/react` and `npm pack @ui-sdk/core` (0.1.0-beta.17) into a temporary folder that may be gone. Re-run `npm pack` into an empty folder to read them again.

After install, the same docs ship at `node_modules/@ui-sdk/react/docs/` (start at `docs/llms.txt`, then `docs/core.md`, `docs/components/listbox.md`) and `node_modules/@ui-sdk/core/skills/ui-sdk/references/patterns.md`.

## 1. Packages, versions, peers

From `npm view` on 2026-11-27:

| | `@ui-sdk/react` | `@ui-sdk/core` |
|---|---|---|
| `latest` dist-tag | `0.1.0-beta.17` (2026-11-24) | `0.1.0-beta.17` |
| `beta` dist-tag | `0.1.0-beta.18` (2026-11-26) | `0.1.0-beta.18` |
| first release | `0.1.0-beta.1`, 2026-11-12 | same |
| deps | none | none |
| license | Apache-2.0 | Apache-2.0 |
| maintainer | `shadcn` on npm; repo `github.com/vercel-labs/ui` (HTTP 200), site `https://ui-sdk.dev/docs/react` (HTTP 200) | same |

- `@ui-sdk/react` peerDependencies: `react >=19`, `react-dom >=19`, `@types/react >=19.2.10`, `@ui-sdk/core ^0.1.0-beta.17`. Repo has react/react-dom 19.3.0 and `@types/react` 19.3.3, so peers are satisfied.
- Install both, so the components and any helpers share one copy of core (`R/docs/installation.md`): `pnpm add @ui-sdk/react@0.1.0-beta.17 @ui-sdk/core@0.1.0-beta.17`. **Pin exact versions.** 17 betas shipped in two weeks, and the docs say "any of these can still change between releases" (`R/docs/core.md` l.2412).
- `pnpm-workspace.yaml` has no `minimumReleaseAge`, so a 3-day-old release installs. The docs' quick-start prompt says to stop and ask if a release-age policy blocks install (`R/docs/llms.txt` l.25).
- ESM only (`"type": "module"`), `sideEffects: false`. No root import: import from subpaths such as `@ui-sdk/react/listbox` and `@ui-sdk/react/primitive` (custom parts), and from `@ui-sdk/core` (behaviors) and `@ui-sdk/core/text-match` (`R/package.json` exports; `C/package.json` l.52, l.264).
- No provider. Modules already contain `"use client"`. Your own component built with `createParts`/`usePrimitive` must be in a `"use client"` file, and a Server Component can render it (`R/docs/server-rendering.md`).
- CSS: unstyled. Optional default look is `@ui-sdk/core/web.css`; skip it for shadcn styling. Do add `@layer ui-sdk;` ABOVE `@import "tailwindcss"` in `src/app/globals.css`, because ui-sdk injects a little behavior CSS into that layer at mount (`R/docs/styling-and-animation.md` "The ui-sdk Layer", l.122).
- The core package ships a `skills/ui-sdk/` folder. It's guidance for agents, treated here as reference data only.

## 2. Is there a ready-made component that fits?

`@ui-sdk/react/listbox` (`R/docs/components/listbox.md`):
- Parts: `Listbox`, `ListboxItem`, `ListboxItemIndicator`, `ListboxItemIcon`, groups and separators. Props: `activation: "automatic"|"manual"`, `orientation: "horizontal"|"vertical"` (NO grid/2-D), `loop`, `virtualFocus`, `value`/`defaultValue`/`onValueChange(value, details)`, `items`, `label` per item, `controller` (`createListboxController()`: `highlight(value)`, `focus()`, `setValue`...).
- Built-in typeahead is jump-to-match: "Typing moves focus to the next option that starts with it", plus multi-letter queries. It does NOT filter. The source comment says "Nothing filters a listbox" (`C/dist/components/listbox/listbox-root-parts.js` ~l.190).
- Keys handled: the orientation's two arrows, Home/End, PageUp/PageDown, Enter, Space, typeahead (same file, l.57-70). Up/Down do nothing in a horizontal list.
- Touch: "Taps toggle where clicks replace" (multiple only). In single mode a tap selects.
- Styling hooks: `data-slot="listbox"`/`"listbox-item"`, `data-selected`, `data-highlighted` (focus), `data-disabled`, `data-orientation`.
- Usable as a cheap fallback (`orientation="horizontal"` + CSS grid: Left/Right walk reading order, Up/Down dead, filtering done by rendering a filtered list), but it doesn't meet "arrow keys move focus through the grid", and ADR-0002 says to compose behaviors. So build a custom primitive (section 4).

`@ui-sdk/react/command` and `autocomplete` do filter as you type (fuzzy, `CommandItemText` highlights matches) (`R/docs/components/command.md` l.202, l.437). But they are input-plus-vertical-list widgets, not a grid.

## 3. The behaviors ADR-0002 names (all exported from `@ui-sdk/core`, verified in `C/dist/index.d.ts`)

### `createListbox(context, opts)`
Source: `C/dist/foundation/lists/listbox-behavior.d.ts`; docs at `R/docs/core.md` l.5839-5935 "Options You Search".

- Opts: `key` (state key for the highlighted option, start `null`), `focus: "real"|"virtual"` (default `"real"`), `items?`, **`query?: () => string`**, **`filter?: () => "contains"|"startsWith"|false|((item, query) => boolean|number)`** (default `"contains"`; a number ranks, 0 hides), `loop?` (default true), `onHighlight?`, `onEnd?`.
- Returns `bind(el, part)`, `attrs(state, part)` (gives `id`, `tabindex` `"-1"` with real focus, `data-highlighted`, `aria-disabled`), `activeId(state)`, `keydown(event)`, `highlight(key|null)`, `move(step: number|"first"|"last")`, `items()`, `shows(part)`, `count()`.
- **This is the filtering behavior.** Pass the typed text as `query`. For composed (non-`items`) options add `present: (_s, part) => part.api.listbox.shows(part)`. Call `listbox.move("first")` when the query changes. Matching ignores case and accents, and uses the option's `label` prop or its text.
- `keydown` handles ONLY ArrowUp/ArrowDown (±1; Cmd = first/last), PageUp/PageDown (±10), and, with real focus, Home/End and typeahead-jump. Left/Right are not handled. Source: `C/dist/foundation/lists/listbox-keyboard.js` `listStep`; `listbox-behavior.js` l.100-120. Enter/choosing is yours.
- With real focus its typeahead already uses `createTypeahead` internally (`listbox-engine.js` l.5, l.86, l.322). If you capture letters for filtering, intercept them BEFORE calling `listbox.keydown`, or it jump-focuses instead.

### `createRovingFocus(context, opts)`
Source: `C/dist/foundation/focus/roving-focus.d.ts`; docs at `R/docs/core.md` l.4138-4320, options l.4529.

- Opts: `slot`, `key` (state key, start `null`), `orientation?: () => "vertical"|"horizontal"|"both"`, `loop?`, `remember?` (default true), `disabled?`, `focusable?`, `preferred?`, `claims?`, **`move?: (event, { from, items, rtl }) => key|undefined`**, `onItemsChange?`.
- Returns `bind`, `tabIndex(state, part)` (`"0"`/`"-1"`), `keydown(event, el)` → `{ key, from, shift } | undefined`, `items()`, `focus(key?)`, `remember`, `check`, `stopFor`.
- **2-D layout: `move: spatialMove()`** (also exported from `@ui-sdk/core`) picks the nearest item in the arrow's direction by measuring on-screen rects. Home/End use document order (`R/docs/core.md` "Spatial Focus", l.4271). This fits a responsive CSS grid without knowing the column count. Alternative: index ±columns `move` (keypad example `R/docs/core.md` "Any Layout"; flowing-grid notes `C/skills/ui-sdk/references/patterns.md` l.5-55: "Down from a column the short last row lacks should land on its last item"; "Past an edge, return `from.key` so the arrow is handled and the page doesn't scroll").
- Items that leave (filtered out) hand focus back to the group; `onItemsChange` fires after joins/leaves; `createFocusRecovery` can choose a successor.

### `createTypeahead(timeoutMs = 500)`
Docs at `R/docs/core.md` "Find an Item by Typing" l.2487 and "Typeahead" l.4321; pattern `patterns.md` l.115.

- `const t = createTypeahead(); t(key, labels, currentIndex)` → index of next match or `-1`. Keys within 500 ms build one query ("pl" → Plum). `t.active()`, `t.reset()`. Space continues an active query. Use `isTypeaheadKey(event)` to skip arrows and shortcuts, and `labelOf(el)` for labels (skips `aria-hidden` text, so the status dot won't pollute names).
- **First-letters typeahead ≠ filter.** It moves focus to the next match and leaves every item visible. It keeps no query you can render, and resets after 500 ms. The ticket's "filters the grid as you type" needs a controlled `query` in state (fed to `createListbox`'s `query`/`filter`, or filtering the data yourself). Typeahead-jump is at most an optional extra.

### Text-match helpers (`@ui-sdk/core/text-match`)
`fuzzyScore(text, query)` returns 0..1 (exact > prefix > in-order letters). `matchRanges(text, query, "contains"|"startsWith"|"fuzzy")` and `matchSegments(text, ranges)` support `<mark>` highlighting. Case/accent-insensitive per user locale (`R/docs/core.md` l.2546-2597). For "first letters of a name", a custom `filter` that matches the start of ANY word (first name or surname) is probably better than `"startsWith"`, which matches only the label start.

## 4. Recommended composition for the picker (sketch, NOT run)

Shape: a `listbox` root (named "Employees") containing `option`s laid out with CSS grid. Real focus on options. One tab stop plus spatial arrows from `createRovingFocus`. Filtering from `createListbox` with `query`/`filter` (or from React data filtering). Letters typed while the grid has focus append to `query`, Backspace trims, Escape clears. Show the query visibly above the grid with a clear button, so touch users see why the grid shrank. Enter or tap chooses.

Role note: ui-sdk's own agent guidance says lists that wrap into rows are a "flowing grid" (`grid`/`row`/`gridcell` + `createRovingFocus` `move`) and "a set in one dimension is a `listbox`" (`patterns.md` l.7). ADR-0002 says listbox. A single-select `listbox` whose options are visually wrapped is valid ARIA. Choose one and note it on the ticket.

```ts
// src/kiosk/name-picker-primitive.ts  ("use client" not needed here; no React)
import {
  definePrimitive, createRovingFocus, createListbox, spatialMove,
  isTypeaheadKey, selects,
} from "@ui-sdk/core";

type Options = { onPick?: (employeeId: string) => void };

export const namePicker = definePrimitive({
  name: "name-picker",
  options: { onPick: "callback" },
  state: (_o: Options) => ({ focused: null as string | null, highlighted: null as string | null, query: "" }),
  api: (context) => {
    const roving = createRovingFocus(context, { slot: "option", key: "focused", move: spatialMove() });
    const listbox = createListbox(context, {
      key: "highlighted",
      query: () => context.store.get().query,
      filter: () => (item, q) => item.label.toLowerCase().split(/\s+/).some((w) => w.startsWith(q.toLowerCase())),
    });
    const setQuery = (query: string) => { context.store.set({ query }); listbox.move("first"); };
    return {
      roving, listbox, setQuery,
      pick: (key: string) => context.options().onPick?.(key),
      keydown(event: KeyboardEvent, el: HTMLElement) {
        const { query } = context.store.get();
        if (event.key === "Enter" && context.store.get().focused) { event.preventDefault(); return this.pick(context.store.get().focused!); }
        if (event.key === "Escape" && query) { event.preventDefault(); return setQuery(""); }
        if (event.key === "Backspace" && query) { event.preventDefault(); return setQuery(query.slice(0, -1)); }
        if (isTypeaheadKey(event) && event.key !== " ") { event.preventDefault(); return setQuery(query + event.key); }
        roving.keydown(event, el);   // arrows (spatial), Home, End
      },
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "listbox",
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Escape", "typeahead"],
      on: { keydown: () => {} /* keys are handled on the options; see "keys" rule below */ },
    }),
    option: slot<{ value: string; label: string }>({
      role: "option",
      focus: "roving",
      props: { value: "key", label: "string" },
      selects: selects({ focused: ({ key }) => [key, null] }),
      present: (_s, part) => part.api.listbox.shows(part),
      attrs: (state, part) => ({ tabindex: part.api.roving.tabIndex(state, part), "aria-selected": "false" }),
      press: ({ api, key }) => api.pick(key),                 // click = tap = Enter/Space on a native <button>
      on: { keydown: (event, { el, api }) => el && api.keydown(event, el) },
      bind: (el, part) => {
        const a = part.api.roving.bind(el, part);
        const b = part.api.listbox.bind(el, part);
        return () => { a(); b(); };
      },
    }),
  }),
});
```

```tsx
// src/kiosk/name-picker.tsx
"use client";
import { createParts } from "@ui-sdk/react/primitive";
import { namePicker } from "./name-picker-primitive";
const { Root, Option } = createParts(namePicker, { root: "div", option: "button" });

export function NamePicker({ employees, onPick }: { employees: { id: string; name: string; onSite: boolean }[]; onPick: (id: string) => void }) {
  return (
    <Root aria-label="Employees" onPick={onPick} className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
      {employees.map((e) => (
        <Option key={e.id} value={e.id} label={e.name}
          className="flex items-center gap-2 rounded-lg border bg-card p-4 text-lg focus-visible:ring-2 focus-visible:ring-ring data-highlighted:bg-accent">
          <span aria-hidden="true" className={e.onSite ? "size-2.5 rounded-full bg-green-500" : "size-2.5 rounded-full bg-muted-foreground/40"} />
          {e.name}
          <span className="sr-only">{e.onSite ? ", on site" : ""}</span>
        </Option>
      ))}
    </Root>
  );
}
```

Things to verify while implementing (the sketch is unverified):
- **Combining `createRovingFocus` and `createListbox` on one slot is not shown anywhere in the docs.** Both manage focus with real focus: `createListbox.attrs` sets `tabindex="-1"` on every option, and roving sets one `"0"`. Spread roving's `tabindex` last, and use `createListbox` only for `query`/`filter`/`shows`/`count` (don't call `listbox.keydown`). If they fight, drop `createListbox` and filter the `employees` array in React (rendering only matches). `createRovingFocus` handles items that come and go. ADR-0002's three names would then become `createRovingFocus` + `createTypeahead` + React filtering. Note that on the ticket.
- Slot typing rules (`R/docs/core.md` "Roles, Focus and Keys" l.497-547): declare `role` on the slot, not in `attrs`. `option` requires `focus` and `press`. A `listbox` role requires `keys`, and listing keys requires an `on.keydown` on that slot; or use `keys: { none: "why" }`. TypeScript errors name what's missing. Some doc examples (the rating, l.1298) still put `role` in `attrs`; follow the rule section and the types.
- `press` = "Activation: a click, which keys and screen readers send too" (`C/dist/foundation/kernel/primitive-types.d.ts` l.149-152). Rendering options as `<button type="button">` makes tap, Enter and Space all fire `press` natively (`R/docs/core.md` l.268). `role="option"` on `<button>` is ARIA-allowed. Then the Enter branch in `keydown` is redundant; keep only one of the two, or each Enter picks twice.
- Selection by tap must fire even when tapping the same Employee again after cancelling the PIN step, so don't store a selected value. Call `onPick` from `press` (above). With the ready-made `Listbox`, use controlled `value={null}` and act in `onValueChange`, since the request still fires while the controlled value never changes (`R/docs/state-and-events.md`, "Control the Value").
- Typing on a touch kiosk: there is no hardware keyboard, so the key-capture filter only helps with an attached keyboard. If filtering must work by touch, add a visible `<input type="search">` above the grid (ui-sdk: "Keep buttons, search fields, and empty messages outside the list", `listbox.md` l.72) wired to `setQuery`. Use `isComposing(event)` from `@ui-sdk/core` for IME safety. Use `inputHints("search")` for keyboard hints.
- Empty state: `listbox.count() === 0` (or the filtered array being empty) shows "No one matches" outside the listbox.
- Dev builds warn when the listbox has no accessible name. Set `aria-label`/`aria-labelledby`.
- Activity (Cache Components): the picker stays mounted when the Kiosk navigates to the PIN step and back. Reset `query` on pick (see `nextjs-16.md` section 8).
- E2E: options are real `role="option"` elements, so Playwright `page.getByRole("option", { name: /Alice/ })` works and excludes Activity-hidden copies.

## 5. Styling (shadcn tokens via className/data attributes)

- Every part gets `data-slot` = primitive `name` + slot (`name-picker` root, `name-picker-option`). Root = name alone (`R/docs/core.md` "Naming").
- State attributes: whatever your `attrs` emit (`""` adds, `undefined` omits), plus behavior attrs: `data-highlighted` from `createListbox.attrs`, `aria-selected`. Tailwind v4 variants work directly: `data-highlighted:bg-accent`, `aria-disabled:opacity-50` (`R/docs/styling-and-animation.md`; `R/docs/core.md` "Style Its State").
- `className` and `style` may be functions of part state: `className={(s) => ...}` (`styling-and-animation.md` l.70). Children may be a render function of slot `state`.
- `css({ "--x": value })` from `@ui-sdk/core` writes CSS variables into `style`.
- Prefer `focus-visible:` for focus rings, since options take real DOM focus.

## 6. Fallback criteria (ADR-0002)

Fall back to shadcn Command only if: the roving/listbox composition can't be made to pass the ticket's E2E (arrows in the grid, Enter selects, single tap selects, filter); or types and dev checks fight the composition and the only escape is reaching into internals; or a beta bump breaks it. Record the reason on ticket 08. Command is not a grid either, so the fallback would also lose 2-D arrows.
