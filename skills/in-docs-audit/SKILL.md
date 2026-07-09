---
name: in-docs-audit
description: Audit and structure a project's documentation corpus (.md and .puml) for AI-agent consumption — add YAML frontmatter metadata, rebuild the docs/INDEX.md manifest, and wire documentation rules into the project's AGENTS.md (with CLAUDE.md pointing to it). Use for initial migration of an unstructured docs corpus or periodic re-audit. Trigger phrases: "docs audit", "audit docs", "audit documentation", "index the docs", "аудит доков", "аудит документации", "проиндексируй документацию", "приведи доки в порядок".
---

# Docs Audit

## Purpose
Turn an existing, unstructured documentation corpus into an AI-agent-first knowledge map:
1. Every document carries machine-readable metadata (YAML frontmatter for `.md`, comment header for `.puml`).
2. A single compact manifest `docs/INDEX.md` tells an agent what knowledge exists, what questions each document answers, and where to dive deeper.
3. The project's `AGENTS.md` gains a "Documentation" section so every future agent session (Claude Code, Codex, Cursor, …) knows the index exists and must keep it in sync; `CLAUDE.md` just points at `AGENTS.md` instead of duplicating the rules.

The main consumer of the result is an AI agent, not a human: optimize for routing (discovery → scoping → targeted reading), not for a book-style TOC.

## Hard boundaries (locked policies)
The skill runs **fully automatically** — no plan/confirmation phase — but within strict limits:

- **Allowed**: add frontmatter / metadata comment headers; add or rename headings; move sections within a document; add a `## Summary` section; rebuild `docs/INDEX.md`; add/update the "Documentation" section in `AGENTS.md` and make `CLAUDE.md` reference it (removing a duplicate section the auditor itself previously added).
- **Forbidden**: rephrasing, shortening, or deleting authored text; merging or splitting documents; moving or renaming files; deleting files. Author content must survive byte-for-byte (except heading text and whitespace around inserted sections).
- Anything questionable (contradictory docs, obvious duplicates, apparently dead docs) is **flagged in the final report**, never acted on.

## Steps

### 1. Determine repo root and scan scope
Run `git rev-parse --show-toplevel` to find `<repo_root>`. Collect all `.md` and `.puml` files under it, excluding:

- dependency/build/service dirs: `node_modules`, `.git`, `dist`, `build`, `out`, `coverage`, `.next`, `.turbo`, `vendor`, `.idea`, `.vscode`
- agent-harness files and dirs: `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.codex/`, `.cursor/`, `.github/copilot-instructions.md`
- `docs/INDEX.md` itself (it is output, not input)

Documents outside `docs/` (module READMEs, diagrams next to code) are **indexed in place** — never moved.

### 2. Read or bootstrap the taxonomy
Doc types are a fixed core plus per-project extensions:

- Core: `architecture | diagram | service | api | runbook | adr | troubleshooting | guide | other`
- If `docs/INDEX.md` already exists, read its `## Taxonomy` section — project-specific extra types declared there are valid too.
- For `type: diagram`, also set `subtype`: `c4-context | c4-container | c4-component | c4-code | c4-deployment | er | sequence | use-case | dynamic | other`.

### 3. Classify and extract metadata from every file
For each file, read the content and derive:

- `type` (and `subtype` for diagrams) — from content, not filename alone. For `.puml`, extract the diagram's purpose, major actors/components, and what part of the system it describes; never index a diagram as "file exists".
- `status`: `draft | active | deprecated` (default `active`; mark `deprecated` only on explicit evidence in the text, e.g. "outdated", "superseded by").
- `system`: the system/module the doc belongs to.
- `entities`: primary domain entities/components mentioned.
- `answers`: 2–5 concrete questions this document can answer (the key routing field).
- `related`: repo-relative paths of related docs, if evident.
- `source_files`: code paths the doc describes, if evident.
- `last_reviewed`: today's date (the audit itself counts as a review).

Field names are always English. Field **values** and `answers` are written in the dominant language of the project's existing documentation (detect it in this step; mixed corpus → majority wins).

### 4. Write metadata into each document
For `.md` — YAML frontmatter at the very top:

```md
---
type: architecture
status: active
system: billing
entities: [invoice, payment-gateway]
answers:
  - how an invoice is created
  - who calls the payment gateway
related: [docs/adr/003-payments.md]
source_files: [src/billing/]
last_reviewed: 2026-07-07
---
```

If frontmatter already exists, merge: fill missing fields, never delete unknown user fields, update `last_reviewed`.

For `.puml` — an equivalent comment block right after `@startuml`:

```
@startuml
' type: diagram
' subtype: c4-container
' status: active
' system: billing
' entities: invoice, payment-gateway
' answers: which containers handle payments; how billing talks to the gateway
' related: docs/architecture/billing.md
' last_reviewed: 2026-07-07
```

### 5. Repair weak structure (within the boundaries)
Per document, without touching authored prose:

- If there is no H1 title — add one derived from filename/content.
- If the doc is long and has no summary — add a short `## Summary` (2–4 sentences, agent-readable) right after the title. This is **new** text, not a rewrite of existing text.
- Make headings literal where they are empty labels you are adding — never rename an authored heading unless it is genuinely meaningless (`Misc`, `Stuff`); renames are listed in the report.

### 6. Rebuild `docs/INDEX.md`
Create `docs/` if missing. The index has a fixed shape:

```md
# Documentation Index

Machine-oriented map of this repository's documentation. Consumers are AI agents:
scan this file first, then open only the documents whose `answers`/`entities` match the task.
Maintained by `/in-docs-audit` (full rebuild) and `/in-docs-write` (incremental updates).

## Taxonomy
Core: architecture, diagram, service, api, runbook, adr, troubleshooting, guide, other
Project extensions: <none | list with one-line meaning each>

## Domains
- <system/module>: <1–2 lines: what it is, where its docs live>
- ...

## Documents

### Architecture
#### <repo-relative path>
- summary: <one line>
- system: <...>
- answers: <q1>; <q2>; <q3>
- entities: <...>
- related: <paths>

### Diagrams
#### <path.puml>
- summary: ...
- subtype: c4-container
- ...
```

Rules:
- One entry per document, grouped by `type`, sorted by path within a group.
- Entries are derived from the frontmatter written in step 4 — the index never contains information absent from the document itself (single source of truth is the doc).
- No "retrieval hints" section: routing is carried by `answers`/`entities` per entry.

### 7. Wire the contract into `AGENTS.md` (canonical) and point `CLAUDE.md` at it
The documentation contract is tool-agnostic, so its single source of truth is `AGENTS.md` at the repo root — the file Claude Code, Codex, Cursor and other agents all read. `CLAUDE.md` must not carry its own copy; it only references `AGENTS.md`.

1. **`AGENTS.md`** — add or update (idempotently — replace the whole section if it exists) this `## Documentation` section. Create `AGENTS.md` with only this section if the file does not exist:

   ```md
   ## Documentation
   - The documentation map is `docs/INDEX.md` — scan it before searching docs manually.
   - Every `.md`/`.puml` doc carries metadata (YAML frontmatter / `'` comment header).
   - Rule: creating, editing, or deleting any documentation file requires updating its
     metadata (`last_reviewed` at minimum) and its entry in `docs/INDEX.md` in the same
     change. A doc change without an index update is incomplete. Use `/in-docs-write`.
   ```

2. **`CLAUDE.md`** — ensure it references `AGENTS.md` instead of duplicating the rules:
   - If a prior audit added a `## Documentation` section directly to `CLAUDE.md`, remove it (the content now lives in `AGENTS.md`).
   - Ensure `CLAUDE.md` imports `AGENTS.md` via an `@AGENTS.md` line (Claude Code resolves `@path` as an import). If `CLAUDE.md` already references `AGENTS.md` in any form, leave it.
   - If `CLAUDE.md` does not exist, create a minimal one whose sole content is that import:

     ```md
     # Project instructions

     @AGENTS.md
     ```

### 8. Report
Print a summary:

```
Scanned: N .md, M .puml (excluded: K files)
Frontmatter: added X, updated Y
Structure: H1 added to A docs, Summary added to B docs, headings renamed: <list or none>
Index: docs/INDEX.md rebuilt — E entries in T types
Contract: AGENTS.md Documentation section added/updated; CLAUDE.md points to AGENTS.md (@AGENTS.md)
Flagged for humans (not acted on):
- <path>: <why — duplicate of X / looks obsolete / contradicts Y / unclassifiable>
```

Do NOT commit — leave the diff for the user to review.
