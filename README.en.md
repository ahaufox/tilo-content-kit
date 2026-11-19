# @tilo-ui/content-kit

> Content rendering and editing SDK for AI-agent frontends — streaming Markdown, HTML ⇄ Markdown conversion, content shape detection and sanitization, resizable Tiptap tables, Yjs collaboration primitives, and a theme-token contract.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](./tsconfig.json)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](./package.json)

**Live demo:** <https://ahaufox.github.io/tilo-content-kit/>
**Version:** `0.6.3`

---

## What it is

Most AI products end up with the same problem: a model streams tokens into a frontend that was never designed to render a document. Chunks arrive mid-table, HTML arrives half-sanitized, Markdown and rich-text coexist in the same database column, and every product re-implements the same twelve fixes.

`@tilo-ui/content-kit` is that layer, extracted and made reusable. It is a set of independent entry points — you import only the ones you need, and nothing else enters your bundle.

It was originally built for a legal-document production system, which is why it carries one domain-specific entry (`/legal`) alongside six domain-agnostic ones. That entry is optional; skip it and the rest behaves like any content toolkit.

## Entry points

| Entry | Responsibility | Runtime deps |
| --- | --- | --- |
| `@tilo-ui/content-kit/content` | Shape detection (`isHtml` / `isMarkdown` / `isBlockContent` / `containsDisguisedMarkdown` / `isHtmlSubstantivelyEmpty`), allow-list HTML sanitization, A4 table column-width allocation. Pure functions, no React, SSR-safe. | none |
| `@tilo-ui/content-kit/convert` | Two-way HTML ⇄ Markdown conversion. | `marked`, `turndown` |
| `@tilo-ui/content-kit/markdown` | One renderer for both static and incremental content (`MarkdownContent`, `StreamingMarkdown`), sharing plugins and styles so streaming and static output never drift. | peer |
| `@tilo-ui/content-kit/legal` | Chinese legal-document normalization: strip a leading duplicated document title, bold standalone section headings, promote capitalized-number chapter lines. Zero dependencies. | none |
| `@tilo-ui/content-kit/tiptap` | Rich-text editor plus a resizable table extension that persists `colwidth`. | peer |
| `@tilo-ui/content-kit/collab` | Yjs collaboration assembly with isolated undo managers and awareness; transport and auth are injected by the host. | peer |
| `@tilo-ui/content-kit/theme` | Theme-token contract: validated tokens in, `--tk-*` CSS variables out. | none |
| `@tilo-ui/content-kit/styles.css` | Package styles. Everything consumes `--tk-*`, so the host can override without forking. | — |

`@tilo-ui/content-kit/editor` is a deprecated alias of `/tiptap` and will be removed in 1.0.

Heavy capabilities — React, Tiptap, ProseMirror, Yjs — are optional `peerDependencies`. The package does not bundle them, so one application ends up with a single instance of each.

## Install

```bash
pnpm add @tilo-ui/content-kit@0.6.3
```

The package is published to a public registry (`https://npm.cnb.cool/tilo-work/tilo-npm-content-kit/-/packages/`) and needs no credentials. If that registry is unreachable from your network, build from source — see [Run locally](#run-locally).

## Quick start

```tsx
import * as content from '@tilo-ui/content-kit/content';
import { themeStyle } from '@tilo-ui/content-kit/theme';
import '@tilo-ui/content-kit/styles.css';

content.isMarkdown(text);            // true | false
content.isHtmlSubstantivelyEmpty(html); // guards against "<div></div>" payloads

const { style } = themeStyle(profile.tokens); // tokens -> --tk-* inline variables
```

### Streaming from an agent backend

The core use case: an SSE endpoint pushes tokens, the frontend renders them as they arrive.

```tsx
import { useState, useEffect } from 'react';
import { StreamingMarkdown } from '@tilo-ui/content-kit/markdown';

function AgentReply({ body }: { body: ReadableStream<Uint8Array> }) {
  const [text, setText] = useState('');

  useEffect(() => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setText(buffer);
      }
    })();

    return () => reader.cancel();
  }, [body]);

  return <StreamingMarkdown content={text} />;
}
```

`StreamingMarkdown` and `MarkdownContent` render through the same remark pipeline and the same theme, so switching between static and streaming views does not change layout or behavior. Product-specific concerns — citation anchors, legal preprocessing — sit above the SDK, not inside it.

## Run locally

Requires Node ≥ 22 and pnpm ≥ 10 (the repo pins `pnpm@10.27.0`).

```bash
git clone https://github.com/ahaufox/tilo-content-kit.git
cd tilo-content-kit
pnpm install
pnpm build        # tsup, ESM + CJS + type declarations
pnpm test         # vitest, jsdom
pnpm typecheck    # tsc --noEmit
pnpm api:check    # verify public API snapshots have not drifted
```

To run the interactive demo site:

```bash
pnpm --filter @tilo-ui/content-kit-docs dev   # Vite dev server for demo/
```

Note that `pnpm dev` at the repository root is `tsup --watch` — it rebuilds the library, not the demo site.

The demo is a Vite + React app under `demo/`, declared as a workspace package (`@tilo-ui/content-kit-docs`). Its build output (`demo/dist`) is what GitHub Pages serves; the hosted demo above is generated from this repository.

### For reviewers

- The hosted demo (<https://ahaufox.github.io/tilo-content-kit/>) is public and needs no login or credentials. It is the primary surface to evaluate.
- Every panel on that site is interactive. The streaming section uses a locally synthesized SSE feed — no external model endpoint is called, so the demo works offline and without API keys.
- To evaluate from source, run `pnpm install && pnpm build && pnpm test`, then `pnpm --filter @tilo-ui/content-kit-docs dev`.
- The npm registry linked above is hosted outside GitHub. If it does not resolve from your region, use the source build instead; nothing in the evaluation depends on the registry.

## Repository layout

```
src/          eight entry points + src/internal (shared, not exported)
api/          eight machine-checked API snapshots, incl. compat-editor.api.md
              for the deprecated /editor alias
scripts/      build and API-report tooling (api-report.mjs)
tests/        25 vitest suites, incl. table-layout parity fixture
demo/         Vite + React interactive documentation site
.kiro/        Kiro steering documents and one agent hook
```

## Verification

Three gates run on every change:

1. **Public API snapshots.** Each of the eight entries has a snapshot generated from its emitted declarations, with content hashes stripped so rebuilds don't create false drift. `pnpm api:check` compares the build against the snapshot and fails on any difference — including a changed signature under an unchanged name. A missing snapshot is written on first run to bootstrap a new entry; an existing one is never overwritten by `api:check`. Intentional changes require `pnpm api:update`, then a review of `git diff api/`.
2. **Table-layout parity.** The column-width allocator is pinned by a golden fixture (`tests/fixtures/table-layout.parity.json`) shared with the export path, so the on-screen table and the exported document allocate columns the same way.
3. **Test suites.** 25 vitest suites cover rendering, conversion, sanitization, legal normalization, table behavior, theme tokens and collaboration adapters. Tests never touch the network; external services are mocked.

## How Kiro was used

The repository keeps its working Kiro configuration under `/.kiro` as evidence.

**Steering documents** — three files in `.kiro/steering/` encode standing rules so the agent works inside the architecture instead of around it:

- `product.md` (`inclusion: always`) — the scope of each entry point and the zero-bundling principle.
- `tech-stack.md` (`Scope Globs: src/**, scripts/**, *.config.ts`) — build (tsup, ESM + CJS), test (vitest + jsdom), package manager (pnpm), and the rule that heavy capabilities stay optional peer dependencies.
- `conventions.md` (`inclusion: fileMatch` on `src/**` and `tests/**`) — public API must be declared in `package.json` `exports` and mirrored in `api/<entry>.api.md`; comments and commit messages follow Conventional Commits.

**Agent hook** — one `PostFileSave` hook (`.kiro/hooks/content-kit-hooks.json`) fires on `.ts` / `.tsx` edits and drives the verification loop: run `pnpm api:check`, update snapshots when the change is intentional, then run `pnpm typecheck` and `pnpm test` before considering the change done. API drift becomes a caught-at-save problem instead of a release-time one.

**Scope of this claim.** The above is the complete Kiro configuration in this repository. No custom agents, no MCP server, and no property-based testing are present, and none are claimed.

## Pre-existing code disclosure

This repository is new (created 12 November 2026; all 40 commits fall between 12 and 18 November 2026), but not all of its source originated here.

The core rendering, Markdown/HTML conversion, HTML sanitization and Chinese legal-document normalization logic under `src/` was carried over from the editor layer of an internal legal-work platform, where the same implementation was already present before that platform's own history — the earliest tracked version of that code dates to September 2026.

Created during the submission period: the multi-entry zero-bundling packaging layer and its `exports` contract; the `api/*.api.md` snapshot gate and `scripts/api-report.mjs`; the 25 vitest suites; the `demo/` site; the theme-token contract; and the entire `/.kiro` configuration.

## Third-party dependencies

Runtime: `marked`, `turndown` (MIT).
Peer: React, React DOM, Tiptap and ProseMirror packages, `react-markdown`, `remark-gfm`, `yjs`, `y-websocket`, `@tiptap/y-tiptap` — each used under its own license, none bundled.

## Contributing

Issues and pull requests are welcome. Public API changes must ship with an updated `api/<entry>.api.md` and a zero-diff `pnpm api:check`. Keep PRs small and focused.

## License

[MIT](./LICENSE)
