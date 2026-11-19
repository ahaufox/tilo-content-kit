# Requirements — Public API snapshot gate

## Purpose

Each entry point of `@tilo-ui/content-kit` is a public contract. Consumers depend on exact export names and signatures, so a rename or a widened type is a breaking change even when the build still succeeds. This feature turns the public surface into a checked artifact instead of an implicit consequence of whatever `src/<entry>/index.ts` happens to export.

## User stories

### US-1 — A readable contract per entry

As a consumer, I want a human-readable statement of what each entry point exposes, so that I can judge whether an upgrade will break my integration without reading the source.

**Acceptance criteria**

- The report SHALL produce one snapshot per SDK entry: `content`, `convert`, `legal`, `theme`, `markdown`, `tiptap`, `collab`, and `compat-editor`.
- Each snapshot SHALL contain the runtime export names of that entry, sorted, and the normalized type declarations for the entry and its local shared chunks.
- Each snapshot SHALL carry a short content digest so that two snapshots can be compared at a glance.
- The rendered snapshot SHALL state that it is generated, how to refresh it, and how to verify it.

### US-2 — Drift detection

As a maintainer, I want any unintended change to the public surface to fail a command, so drift is caught locally instead of in a consumer's build.

**Acceptance criteria**

- WHEN `pnpm api:check` runs and the generated report matches the snapshot on disk, the command SHALL report consistency and exit 0.
- WHEN the generated report differs from the snapshot, the command SHALL exit non-zero and SHALL print a line-level diff of the first differing lines, naming the affected entry.
- WHEN a signature changed while the export name did not, the command SHALL treat it as drift, because the type declarations are part of the compared text.
- WHEN `dist/` does not exist, the command SHALL exit non-zero and instruct the maintainer to build first, rather than reporting consistency.

### US-3 — Intentional change

As a maintainer making a deliberate API change, I want one command to accept the new surface, so approving a change is explicit rather than a hand-edit.

**Acceptance criteria**

- WHEN `pnpm api:update` runs, the snapshots SHALL be rewritten from the current build.
- WHEN `pnpm api:update` completes, `pnpm api:check` SHALL exit 0 without further edits.
- The command's own output SHALL remind the maintainer to review `git diff api/` and record the change in `CHANGELOG`.

### US-4 — Build jitter must not create false drift

As a maintainer, I do not want unrelated rebuilds to fail the gate.

**Acceptance criteria**

- WHILE normalizing declarations, the report SHALL strip content hashes from chunk file names and normalize line endings.
- IF the same source is rebuilt, the generated report SHALL be byte-identical apart from nothing — i.e. no hash-dependent noise.

### US-5 — Gate at the point of edit

As a maintainer, I want the gate to run when I save source, so I learn about drift within seconds.

**Acceptance criteria**

- WHEN a file matching `\.(ts|tsx)$` is saved, the configured hook SHALL run `pnpm api:check`.
- WHEN the check reports drift, the hook SHALL run `pnpm api:update`, state the impact, then run `pnpm typecheck` and `pnpm test`.
- WHEN the hook cannot run, it SHALL report the failure instead of reporting success.

### US-6 — Non-goals

The gate SHALL NOT judge semantic breakage beyond what the declarations show, and SHALL NOT replace the test suite. It answers one question: does the published surface still match what the repository says it is.
