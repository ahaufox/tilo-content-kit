# Design — Public API snapshot gate

## Problem shape

`src/<entry>/index.ts` is the de facto public surface, but nothing pins it. `package.json` `exports` declares the entry points, `tsup` emits the bundles, and the exported symbols are whatever the source contains at build time. Three failures follow:

1. An internal helper is exported by accident and becomes de facto public.
2. A symbol is renamed for internal clarity and silently breaks consumers.
3. An entry's public shape drifts while every test still passes.

## Approach

Two commands, one snapshot per entry:

- `scripts/api-report.mjs` — builds the report from the `tsup` declaration output, compares it with the snapshot, and optionally rewrites it.
- `pnpm api:check` → `node scripts/api-report.mjs --check`
- `pnpm api:update` → `node scripts/api-report.mjs --update`

The report is generated from the emitted `.d.ts` files, not by parsing source text. Declarations are the compiler's own statement of the exported type surface, so the snapshot inherits the compiler's view rather than a second hand-maintained parser.

## Data flow

```
src/<entry>/index.ts
        │  tsup (dts)
        ▼
dist/<entry>.d.ts + local shared chunks
        │  collectDtsGraph: follow ./relative imports, dedupe, sort
        ▼
normalizeDts: strip content hashes, normalize line endings, trim
        ▼
renderReport: title + sha256 digest + runtime export names + declarations
        │
        ├── --check  → compare text with api/<entry>.api.md, exit 0 / non-zero
        └── --update → write api/<entry>.api.md
```

## Decisions

**Snapshot is Markdown, not JSON.** A JSON dump is precise but unreadable in review. Markdown keeps the contract reviewable by a human; the comparison stays exact because it is a text comparison.

**Comparison is exact text, after normalization.** This is simpler and stricter than symbol-by-symbol matching: any change to a declaration line is drift, including a widened type or a renamed parameter.

**Content hashes are stripped.** `tsup` names shared chunks with a content hash. Without stripping, a rebuild could rename chunks and fail the gate for no reason. The normalizer removes `-XXXXXXXX.js` / `-XXXXXXXX.d.ts` hash segments before comparison.

**Entry set is an explicit map in the script.** The script holds `ENTRIES`, mapping entry name to its `dist` declaration file, including `compat-editor` for the deprecated `/editor` alias. This is a deliberate trade-off: an explicit map keeps the alias visible and prevents a stray directory from silently becoming public, but it must be kept in sync with `package.json` `exports` by the conventions rule — the gate does not discover new entries automatically.

**Runtime export names are read from the built module.** The script imports `dist/<entry>.js` and lists its keys. That list is for human orientation; the authoritative part of the snapshot is the declarations.

**Check does not overwrite an existing snapshot.** It compares and reports. The single exception is a missing snapshot: the first run writes it, which bootstraps a new entry instead of failing with no artifact to review.

**A diff is shown, not a summary.** On failure the script prints the first differing lines with both sides, capped, so the maintainer sees the change without opening the file.

## Edge cases

- **Deprecated alias.** `/editor` maps to `compat-editor.d.ts` and gets its own snapshot, so its removal in 1.0 appears as an explicit change rather than a silent disappearance.
- **Shared chunks.** Declarations that import a local chunk pull that chunk's declarations into the same snapshot, so a change in a shared type is visible in every entry that depends on it.
- **Rebuild noise.** Hash stripping plus line-ending normalization keep a no-op rebuild byte-identical.
- **Build not run.** Missing `dist/` exits non-zero with an instruction to build; silence is never success.
- **Empty entry.** Reported as "（无）" in the snapshot. Not treated as a failure — the absence of exports is visible in review, and an emptied entry would surface as a text change against the previous snapshot.

## Failure semantics

| Situation | Exit | Output |
| --- | --- | --- |
| Report matches snapshot | 0 | consistency message |
| Text differs | non-zero | entry name + first differing lines |
| `dist/` missing | non-zero | instruct to run `pnpm build` |
| Snapshot missing | 0 | snapshot written |
| `--update` | 0 | each snapshot written, with export count |
