---
schema_version: 1
template_version: 1
kind: system-spec
id: spec:AST-036
authority: current
archive_reason: null
superseded_by: null
approved_by: cixzhang
approved_at: 2026-09-15
phase: accepted
owners: [cixzhang]
affects_architecture:
  [
    architecture:public-component-api,
    architecture:react-component-runtime,
    architecture:component-test-sufficiency,
  ]
affects_families: [family:navigation-destinations]
affects_contributing: []
affects_consumer_docs: [Markdown, Outline]
---

# General Markdown plugin system spec

## Contract at a glance

| Area                 | Contract                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public contract      | One additive `plugins` prop and `createMarkdownPlugin()`. A plugin exposes only `syntax`, immutable `transform`, and `renderers`. Text matching, semantic fences, and source decoration are helper-authored transforms, not separate protocol phases.                                                                                                |
| Behavior             | Parsing, transformation, Markdown rendering, and Outline observe one stable, strictly typed, MDAST-aligned tree. Ordered transforms return validated replacement trees while Core retains built-in semantics and readable fallback.                                                                                                                  |
| Remark compatibility | A separate adapter may run synchronous transform-only Remark plugins over the documented supported MDAST subset. Parser extensions, async plugins, compiler plugins, arbitrary `VFile` state, and unsupported node kinds are rejected rather than approximated.                                                                                      |
| End-user impact      | Readers may receive additional syntax and transformed document structure while ordinary Markdown, copyable fallback, heading and Outline identity, accessibility, navigation, images, lists, and tables retain canonical ownership.                                                                                                                  |
| Builder impact       | Existing builders do nothing. Opt-in builders pass one stable plugin list. Simple text, fence, and decoration use cases use helpers that return transforms.                                                                                                                                                                                          |
| Compatibility        | Omitted plugins and `plugins={[]}` are semantically the same empty pipeline. Core may skip empty preparation and allocation, but no separate behavior model exists. Existing `components`, `inlinePlugins`, math, citations, autolinks, and parser signatures retain their meaning.                                                                  |
| Review checks        | Reject a second plugin prop, public lifecycle-specific phases, mutable shared AST, raw-markup nodes, plugin override of Core semantics, unbounded parser hooks, silent Remark incompatibility, transform-driven reparsing, or work proportional to every plugin at every source character.                                                           |
| Governing rules      | [`architecture:public-component-api`](../../architecture/public-component-api.md); [`family:navigation-destinations`](../../families/navigation-destinations.md); [AST-002 FR4](../AST-002/spec.md); [AST-002 FR15](../AST-002/spec.md); [AST-002 FR17](../AST-002/spec.md); [AST-002 FR18](../AST-002/spec.md); [AST-002 FR20](../AST-002/spec.md). |

This section is a review projection; the body below is authoritative.

## Intent

Application authors should be able to add reusable Markdown behavior without rewriting source text, forking the parser, or replacing the whole renderer. One understandable model must cover new source syntax, document-level semantic transformation, and typed rendering.

The public concepts should remain fewer than the use cases. Prose replacement, semantic code fences, source decoration, callouts, frontmatter, TOCs, footnotes, and compatible Remark transforms all use the same immutable transform boundary rather than becoming independent protocol phases.

## Ownership boundary

AST-036 owns shared plugin admission, syntax and transform ordering, compatibility, validation, failure behavior, parse identity, Remark-adapter limits, and observable resource constraints. Markdown owns its concrete AST declarations, parser integration, aggregate rendering, and helpers. Outline owns its projection of Markdown heading identity. A first-party plugin owns its specific semantics and evidence in its own module record.

## Non-goals

- Adopt Unified, mutable MDAST, `VFile`, or Remark as Core runtime dependencies.
- Break the released `parseMarkdown` result shape before a separately approved
  migration.
- Promise compatibility with arbitrary Remark parser, transform, compiler, async, or raw-HTML plugins.
- Expose mutable shared AST, unrestricted visitors, DOM access, package discovery, or a registry.
- Replace generic CodeBlock highlighting or Core-owned document, heading, navigation, image, list, or table semantics.
- Make a zero-plugin document a separate semantic mode.

## Platform support

- **Feature and engine floor:** unchanged from current Markdown/Core package support; the protocol adds no browser, React, Node, or TypeScript floor.
- **Unsupported behavior:** unsupported syntax/transform/Remark behavior fails closed to the last valid readable document and cannot silently approximate output.
- **Browser evidence:** interactive stories verify rendered output, keyboard/focus order, copyable fallback, navigation ownership, and unchanged no-plugin behavior in real Chromium; server-render fixtures cover non-browser use.

## Current-state impact

| Current seam              | Preserved behavior                                                                     | New role                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `components`              | Replaces supported built-in renderers, including the all-fence code renderer.          | Continues to win before plugin rendering.                                                                     |
| `inlinePlugins`           | Replaces matched prose with released traversal, overlap, callback, and error behavior. | Remains compatible; a later migration may adapt it through a helper-backed transform only after exact parity. |
| Parser and streaming APIs | Produce the released AST and reuse settled incremental output.                         | Accept syntax plugins and apply live transforms without making transforms part of parse identity.             |
| Markdown and Outline      | Share built-in heading text and slug behavior.                                         | Also share transformed heading projection and collision allocation.                                           |

## Semantic model

A plugin entry is an opaque value created by Markdown's public plugin factory. Its only public capabilities are `syntax`, `transform`, and `renderers`. A plain object cannot masquerade as an entry. Heterogeneous lists preserve the union of their extension-node kinds under strict TypeScript.

The canonical document is an immutable, discriminated, Unist-shaped tree aligned with the supported MDAST subset below. Parsing, transforms, Markdown rendering, and Outline projection observe the same node meanings. Released parser entrypoints retain their current result types and values through a compatibility boundary; adopting plugins requires no migration.

The Markdown owner exposes stable node unions and node-kind-narrowed traversal. Plugin-defined extension kinds augment the generic union without widening unrelated built-in callbacks. A transform receives readonly input and returns the original root or a replacement root. Equivalent validation and immutability implementations are permitted.

A syntax contribution declares non-empty literal prefixes, a finite pending bound, and a synchronous deterministic tokenizer. It may emit only its owning typed extension nodes. Syntax-bearing plugins declare stable parse identity; only ordered syntax identity participates in incremental parse identity.

A transform is synchronous and deterministic. It may replace, insert, remove, or annotate representable nodes within the permitted-edit matrix. It cannot mutate input, author source provenance, introduce raw markup or React values, or bypass Core-owned semantics. Transform changes refresh transformed output without changing syntax parse identity.

Renderers receive typed extension-node data only. Every extension node introduced through syntax or transform has a renderer and deterministic perceivable-text projection. A source-backed node falls back to exact authored source; a synthetic node falls back to its required text projection. Sibling content continues after failure.

Text matching, semantic fences, and source decoration are optional transform helpers, not additional public phases. Equivalent optimized execution is allowed when it preserves ordered transform semantics and observable results.

## Canonical MDAST compatibility matrix

| Node or field                               | Supported contract                                                                                                                                                                               | Rejected or constrained behavior                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `root`, `children`                          | One root; ordered typed children.                                                                                                                                                                | Removing/retyping the root; cycles; shared mutable children.                                                                        |
| `text`, `value`                             | Text replacement, splitting, insertion, and removal.                                                                                                                                             | Functions, React values, or non-string `value`.                                                                                     |
| `paragraph`, `strong`, `emphasis`, `delete` | Ordered phrasing children.                                                                                                                                                                       | Block children inside phrasing containers.                                                                                          |
| `heading`, `depth`                          | Phrasing children may transform; transformed text participates in shared Markdown/Outline identity.                                                                                              | Changing a source-backed heading's depth; renderer-defined IDs.                                                                     |
| `inlineCode`, `break`                       | Standard MDAST meaning.                                                                                                                                                                          | Transforming protected inline-code contents through text helpers.                                                                   |
| `link`, `url`, `children`                   | Phrasing children; every Astryx-owned destination is revalidated by the navigation owner.                                                                                                        | Nested links; bypassing destination policy; non-string URLs.                                                                        |
| `image`, `url`, `alt`                       | Revalidated resource URL and text alternative.                                                                                                                                                   | Bypassing resource policy or removing required alternative text.                                                                    |
| `blockquote`                                | Ordered block children.                                                                                                                                                                          | Invalid child kinds.                                                                                                                |
| `list`, `listItem`                          | `ordered`, optional `start`, `spread`, optional `checked`, and block children. Astryx also preserves the authored ordered-list `delimiter` for exact released projection.                        | Invalid task/list structure or non-finite starts.                                                                                   |
| `code`, `lang`, `meta`, `value`             | MDAST semantics: `lang` is `null` when absent and `meta` is optional. Ordinary code remains copyable; fence helpers annotate the original node.                                                  | Replacing/removing source through the fence helper; bypassing `components.code`.                                                    |
| Astryx flow image                           | Preserves released standalone-image block behavior with `url` and `alt`; phrasing images retain normal MDAST placement.                                                                          | Treating the flow extension as portable MDAST without adapter evidence.                                                             |
| `table`, `tableRow`, `tableCell`, `align`   | Rectangular rows, phrasing cells, normalized alignment.                                                                                                                                          | Replacing Core table semantics or producing ragged/invalid structure.                                                               |
| `thematicBreak`                             | Standard MDAST meaning.                                                                                                                                                                          | Children or renderer slots.                                                                                                         |
| `math`, `inlineMath`                        | Present only when the released math opt-in is enabled.                                                                                                                                           | Enabling math through transformation alone.                                                                                         |
| `position`                                  | Core-authored optional start/end UTF-16 offsets on source-backed nodes; line and column remain optional until available without changing released range behavior. Synthetic nodes omit position. | Authoring, shifting, or forging source positions.                                                                                   |
| `data`                                      | Finite JSON-like plugin data with no rendering effect by itself.                                                                                                                                 | `hName`, `hProperties`, `hChildren`, functions, DOM/React values, or raw-markup channels.                                           |
| Astryx extension node                       | Stable plugin/name/display/data discriminants, renderer, and text projection.                                                                                                                    | Foreign ownership, missing projection/renderer, or changing another plugin's discriminants.                                         |
| Astryx citation node                        | Preserved as an owned typed extension to the MDAST subset.                                                                                                                                       | Rewriting it as a link to bypass citation ownership.                                                                                |
| Other MDAST nodes                           | Unsupported unless a later current contract adds them.                                                                                                                                           | `html`, definitions/references, footnotes, frontmatter, directives, MDX, and other unknown nodes fail closed in the Remark adapter. |

## Permitted transform edits

| Surface                         | Permitted                                                                                | Rejected                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Document root                   | Return the same root or a structurally valid replacement root.                           | Removing/retyping the root or adding an independently rendered document shell.                        |
| Source-backed text and phrasing | Replace, split, insert, remove, or annotate while preserving protected contexts.         | Text-helper matches inside protected code, links, images, citations, math, or accepted opaque syntax. |
| Headings                        | Transform phrasing children; shared identity updates from the transformed text.          | Changing source-backed depth, supplying an ID, or creating renderer-only identity.                    |
| Links and images                | Insert or update values that pass their current navigation/resource owners.              | Bypassing destination, protocol, alternative-text, or trusted-resource policy.                        |
| Lists and tables                | Insert, remove, or transform valid descendants while retaining Core-owned semantics.     | Changing roles, ownership, or producing invalid structure.                                            |
| Code fences                     | A semantic-fence helper may attach an owned render proposal to the original code node.   | Replacing source through the helper or taking precedence over `components.code`.                      |
| Source decoration               | Attach non-semantic, non-interactive presentation metadata to source-backed ranges.      | Changing AST meaning, focus order, accessible name, navigation, selection, or copyable text.          |
| Plugin extension nodes          | Insert the transform owner's typed extension node with its renderer and text projection. | Foreign ownership or unrenderable/unprojectable nodes.                                                |
| Inline entrypoints              | Return exactly one paragraph-equivalent root containing phrasing nodes.                  | Block nodes, multiple top-level blocks, or a changed container shape.                                 |

## Limited Remark compatibility profile

A Remark adapter accepts a synchronous transform-only plugin confined to the matrix above. Each invocation receives a fresh mutable tree copy and an isolated constrained file object. The file exposes readonly source text, per-invocation finite JSON data, and diagnostic reporting; it exposes no processor registration, cross-run state, compiler, I/O, or async completion.

The adapter validates the plugin's returned or mutated tree against the matrix before it becomes observable. Unsupported nodes, raw HTML, promises, shared processor state, invalid structure, forged positions, and unrepresentable metadata preserve the last valid tree and report a source-free diagnostic.

Compatibility is explicit per plugin. “Remark-compatible” means equivalent supported-subset fixtures pass the adapter matrix; package shape alone is not evidence. Plugins using processor data, micromark extensions, async work, unrestricted `VFile` behavior, unsupported nodes, or compiler hooks are outside the profile.

## Requirements

### Admission and compatibility

- **FR1 — One public plugin model.** `plugins` and `createMarkdownPlugin()` are the canonical extension seam. The only protocol capabilities are `syntax`, `transform`, and `renderers`; helper APIs may compile common use cases into transforms.
- **FR2 — One empty-pipeline behavior.** Omitted plugins and an empty list have identical AST, DOM, styling, targets, IDs, errors, and streaming behavior. Core may avoid empty normalization and allocation, but no behavior may depend on whether the empty list was explicit.
- **FR3 — Zero breaking changes.** Existing `components`, `inlinePlugins`, citations, opt-in GFM autolinking, math, sources, parser signatures, fields, optionality, mutability, no-plugin result types, DOM, accessibility, heading/Outline identity, streaming reuse, and renderer precedence retain their released meaning and behavior. Opting into plugins adds behavior only for that callsite.
- **FR4 — `inlinePlugins` migrates only after parity.** No deprecation occurs until a helper-backed transform preserves every released traversal context, overlap rule, callback result, `null`, throw, migration-doc, and codemod requirement.
- **FR5 — Entries are durable package values.** First-party plugins are colocated under Markdown and exported normally; third-party plugins are explicit package imports with a compatible Core peer range. No registry or discovery mechanism exists.

### Parsing and immutable transformation

- **FR6 — Fixed order.** Built-in and extension syntax parse first; transforms then run in plugin-array order; rendering runs last. A transform observes the validated result of every earlier transform.
- **FR7 — Built-in lexical shields win during syntax.** Escapes, inline and fenced code, links, images, citations, math, and accepted opaque syntax remain protected according to their current owners. Block extension syntax remains top-level unless a current owner explicitly broadens it.
- **FR8 — Ordered syntax claims.** Duplicate plugin names fail validation. Syntax contributions resolve in plugin and declaration order; first match wins, defer reserves the bounded candidate, and terminal parsing resolves all pending source.
- **FR9 — Canonical AST is MDAST-aligned and strictly typed.** Parsing, transforms, rendering, and Outline projection use one stable Unist-shaped subset with complete available source positions. Public node-kind traversal narrows callbacks by discriminant, including generic plugin extensions. Released parser functions retain their existing result types and values until a separately approved migration.
- **FR10 — Transform input is immutable.** A transform returns the same root or a replacement root. Attempted mutation cannot change any observed input node, array, data object, source position, prior snapshot, or later plugin input.
- **FR11 — Transform output is representable and validated.** Output is finite, acyclic, typed data that satisfies both matrices above. Core rejects raw HTML, React values, DOM nodes, functions in node data, invalid built-in structure, foreign extension ownership, authored/shifted provenance, and block-shaped output from inline entrypoints.
- **FR12 — Transform failure is local to the plugin.** A throw, promise, invalid result, or unsupported adapter output reports one source-free diagnostic and passes the last valid root to later plugins and rendering. Source-backed nodes preserve authored-source fallback; synthetic extension nodes use their required perceivable-text projection.
- **FR13 — Live transforms do not reparse or mutate retained output.** Adding, removing, reordering, or updating transforms refreshes transformed output without rerunning syntax tokenization. Only current parser options and ordered syntax identity invalidate syntax parse identity. Prior snapshots stay unchanged; unchanged settled legacy output retains its released reuse and remount behavior.

### Rendering and cross-surface identity

- **FR14 — Extension rendering is complete and local.** Every extension kind a plugin may introduce has an owning renderer and perceivable-text projection. Missing or failed rendering preserves exact authored source for source-backed nodes and the required projection for synthetic nodes; siblings continue running.
- **FR15 — Core semantics remain authoritative.** Plugins cannot replace the document root or override Core-owned heading level/ID, navigation, image policy, list semantics, table semantics, or built-in accessibility behavior. Trusted renderer-created links and resources remain renderer-owned.
- **FR16 — One heading projection.** Markdown and Markdown-derived Outline use the same syntax list, transform list, text projection, slugger, and collision allocator. Renderer output cannot change identity; block extension nodes do not independently create Outline entries unless a later owner contract permits it.
- **FR17 — Existing code override remains compatible.** A semantic-fence helper may annotate an eligible original code node but cannot replace its source. Rendering resolves `components.code` first; only when absent may the helper proposal render. Ordinary copyable code is always the local fallback.

### Remark compatibility

- **FR18 — Adapter scope is explicit.** The adapter supports only synchronous transform-only plugins over the documented MDAST subset. It does not emulate Unified parser/compiler registration, async execution, processor state, or unrestricted `VFile` behavior.
- **FR19 — Translation is lossless or rejected.** Each adapted node and metadata field has a documented round trip. Unsupported input or output fails closed with readable source; the adapter never silently drops or approximates content.
- **FR20 — Compatibility is tested per plugin.** A package is called compatible only after fixtures prove equivalent supported-subset output, protected-context behavior, diagnostics, source preservation, and server rendering.

### Resources

- **FR21 — Unclaimed work is bounded.** A helper callback runs only for an actual claim; unmatched source cannot invoke it. Stable and recreated semantically equivalent plugin lists must both satisfy FR23, without requiring any particular preparation or dispatch implementation.
- **FR22 — Existing parser budgets remain the floor.** The canonical [parser performance fixture](../../../packages/core/src/Markdown/parser.perf.test.ts) remains green: full parse stays below 20/50/100/400/1000 ms at 10/50/200/500/2000 sections; full and incremental 50-character streaming stay below 5000 ms at 50 sections and 30000 ms at 500; incremental time stays at most 1.1× full reparse; and its exact settled-tail work, object-reuse, source-range, median/worst-block, and tracked whole-prefix assertions remain unchanged.
- **FR23 — Focused overhead budgets remain.** Under the evidence protocol below, five zero-work helper transforms add at most 15 percent at both fixture sizes; the representative three-transform set adds at most 25 percent.
- **FR24 — Optional work stays optional.** Remark adapters and heavy renderers are tree-shakeable and absent from parser-only/server bundles unless imported.

## Performance evidence protocol

- **Fixture:** a deterministic 200- and 500-section document; each section contains one heading, prose with an identifier and mention, a two-item list, a block quote, one table row, and an ordinary fenced code block.
- **Zero-work set:** five prepared helper transforms with valid selectors that match no fixture node or source span.
- **Representative set:** three helpers that respectively match prose identifiers, annotate eligible code fences, and decorate a known source range.
- **Comparison:** omitted/empty pipeline versus the same parse-and-transform call with the stable plugin list, in one process and runner.
- **Sampling:** ten untimed warmups, then nine alternating paired rounds; each side averages 20 iterations per round. The reported ratio is the median of the nine paired ratios. Both 200- and 500-section ratios must satisfy FR23.
- **Regression signal:** invoking a helper callback for unclaimed source, invoking a claimed helper more than once, or regressing parse/result reuse must fail work-count or threshold evidence.

## Public parser integration

Block, inline, incremental, Markdown, and Outline entrypoints accept the same ordered plugin configuration and infer the same extension-node union while retaining their released signatures and result shapes. Inline transforms must satisfy the one-paragraph phrasing constraint. Transform-only updates cannot increase syntax tokenizer calls, mutate prior snapshots, or remount unchanged settled output beyond current behavior.

## Verification

| Contract             | Verification                                                                                                                                                  | Representative states                                                                                                                | Mutation or failure expectation                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| FR1–FR5              | Public type/export fixtures and DOM/AST snapshots                                                                                                             | Omitted, explicit empty, stable/recreated lists, every released prop and parser overload                                             | Removing empty parity or changing a released signature fails fixtures.                                       |
| FR6–FR13             | Syntax claim matrix; typed narrowing; transform replacement/insertion/removal/annotation; inline-shape, mutation, cycle, raw, async, and provenance rejection | Full, inline, terminal, incremental partial/final, syntax-only update, transform-only update, prior snapshots                        | Reordering transforms changes ordered evidence; adding tokenizer calls or mutating a prior snapshot fails.   |
| FR14–FR17            | Renderer/fallback matrix, semantic-owner matrix, heading/Outline identity, code override precedence, server rendering                                         | Source-backed and synthetic extensions, duplicate headings, cross-base headings, custom code override present/absent, renderer throw | Failed render preserves exact source or required projection; helper output never outranks `components.code`. |
| FR18–FR20            | One real compatible transform plus rejected async, parser-extension, raw-HTML, unsupported-node, forged-position, processor-state, and metadata fixtures      | Every supported matrix row, constrained file messages/data, protected contexts, server rendering                                     | Silent field loss, unsupported-node acceptance, or source loss fails closed fixtures.                        |
| FR21–FR23            | Canonical linked parser budgets, callback work counts, and the exact paired protocol above                                                                    | 200/500 sections, stable/recreated lists, zero-work set, representative set                                                          | Any unmatched callback, duplicate claim callback, parser-budget regression, or threshold breach fails.       |
| FR24                 | Bundle inspection and parser-only/server import fixtures                                                                                                      | Adapter imported and absent; heavy renderer imported and absent                                                                      | Adapter or heavy renderer in an unimported parser-only bundle fails.                                         |
| Repository integrity | Knowledge validation, public-content checks, typecheck, formatting, and changed-file review                                                                   | Specification and every implementation PR                                                                                            | Internal content, stale owner records, or formatting/type failures block merge.                              |

## Related owner prerequisites

Before implementation acceptance, current owner clauses must cover:

1. a stable canonical MDAST-aligned AST, typed node-map/visitor APIs, released-parser
   compatibility projection, and Core-owned semantic validation;
2. Markdown/Outline shared transformed heading identity;
3. observable invalidation identity that distinguishes syntax from live transforms;
4. navigation/resource conformance for transformed nodes;
5. exact `inlinePlugins` compatibility before any migration.

## Decision log

### DEC-1 — Expose syntax, transform, and renderers only

**Reference:** `spec:AST-036/DEC-1`
**Direction owner:** `cixzhang`, `2026-09-15`

The public protocol has three concepts. Text matching, semantic fences, and decorations are transform helpers, not parallel lifecycle APIs. This keeps one mental model while permitting specialized internal execution.

Rejected: five independent public capability phases; a second transform prop; replacing simple local syntax with an unbounded document hook.

### DEC-2 — Make immutable AST transformation canonical

**Reference:** `spec:AST-036/DEC-2`
**Direction owner:** `cixzhang`, `2026-09-15`

Transforms receive the canonical MDAST-aligned tree observed by parsing, rendering,
and Outline. Public node-kind traversal preserves strict discriminated narrowing,
including plugin extension nodes. Inputs are immutable and transforms return
validated roots. Core owners retain provenance, structural validity, fallback, and
semantic authority. Released parser results remain unchanged until a separately
approved migration.

Rejected: a second transform tree, in-place mutation of canonical state,
transform-driven reparsing, raw markup, weakly typed string visitors, and
renderer-controlled heading identity.

### DEC-3 — Support a limited Remark compatibility profile

**Reference:** `spec:AST-036/DEC-3`
**Direction owner:** `cixzhang`, `2026-09-15`

A tree-shakeable adapter may run synchronous transform-only Remark plugins over an explicit MDAST subset. Compatibility is per-plugin evidence, never inferred from package identity.

Rejected: adopting Unified/MDAST as Core's runtime, claiming arbitrary Remark compatibility, or silently approximating unsupported behavior.

### DEC-4 — Separate syntax identity from live transforms

**Reference:** `spec:AST-036/DEC-4`
**Direction owner:** `cixzhang`, `2026-09-15`

Only syntax and existing parser options determine parse identity. Transform and renderer updates reuse parsed output and rerun only their owning post-parse work.

Rejected: object identity as parse identity, transform-driven reparsing, a public render key, or repeated preparation for stable inputs.

## Open questions

None. The contract is current; implementation and compatibility evidence remain pending.

## Content boundary

This record does not duplicate consumer signatures, examples, private dispatch/cache design, repository layout, first-party plugin behavior, or current audit results. Those belong to their canonical owners.
