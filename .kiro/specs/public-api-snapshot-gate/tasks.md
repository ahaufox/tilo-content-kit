# Tasks — Public API snapshot gate

## 1. Report tooling

- [x] 1.1 Create `scripts/api-report.mjs` with `--check` (default) and `--update` modes.
- [x] 1.2 Declare the `ENTRIES` map: `content`, `convert`, `legal`, `theme`, `markdown`, `tiptap`, `collab`, `compat-editor`.
- [x] 1.3 Guard on missing `dist/`: exit 1 with an instruction to run `pnpm build`.
- [x] 1.4 Implement `normalizeDts`: strip `-XXXXXXXX` content hashes from `.js` / `.d.ts` names, normalize CRLF, trim.
- [x] 1.5 Implement `collectDtsGraph`: follow `from './…'` imports into local chunks, dedupe by absolute path, sort.
- [x] 1.6 Implement `readExportNames`: import `dist/<entry>.js` and list runtime export keys, sorted.
- [x] 1.7 Implement `renderReport`: title, generation note, `sha256` digest of the declaration body, runtime export list, declaration block.
- [x] 1.8 Implement comparison: exact text match against `api/<entry>.api.md`; on mismatch, collect failures.
- [x] 1.9 Implement `firstDiff`: line-level diff of the first differing lines, capped at 18 lines.
- [x] 1.10 On failure, name the entry, print the diff, and remind to run `api:update`, review `git diff api/`, and record the change in `CHANGELOG`; exit 1.

## 2. Snapshots

- [x] 2.1 Generate `api/content.api.md`, `api/convert.api.md`, `api/legal.api.md`, `api/theme.api.md`.
- [x] 2.2 Generate `api/markdown.api.md`, `api/tiptap.api.md`, `api/collab.api.md`, `api/compat-editor.api.md`.

## 3. Script wiring

- [x] 3.1 Add `"api:check": "node scripts/api-report.mjs --check"`.
- [x] 3.2 Add `"api:update": "node scripts/api-report.mjs --update"`.
- [x] 3.3 Add `api:check` to `prepublishOnly`, after build, test and typecheck.

## 4. Kiro hook

- [x] 4.1 Add `.kiro/hooks/content-kit-hooks.json` with a `PostFileSave` hook matched on `\.(ts|tsx)$`.
- [x] 4.2 Hook prompt: run `pnpm api:check`; if drifted, run `pnpm api:update`, state the impact, then run `pnpm typecheck` and `pnpm test`.

## 5. Documentation

- [x] 5.1 Record the gate in `README` under Verification.
- [x] 5.2 Record in `.kiro/steering/conventions.md` that public API changes must ship with an updated snapshot and a zero-diff `api:check`.

## 6. Verification

- [x] 6.1 `pnpm build && pnpm api:check` → exit 0 on the committed tree.
- [x] 6.2 Rename one exported symbol → `api:check` exits non-zero and prints the differing lines.
- [x] 6.3 Run `pnpm api:update` → `api:check` returns to exit 0.
- [x] 6.4 Delete `dist/` → `api:check` exits non-zero with the build instruction.
- [x] 6.5 `pnpm typecheck` and `pnpm test` pass after a snapshot update.
