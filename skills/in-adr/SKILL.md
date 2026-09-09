---
name: in-adr
description: Capture and centrally maintain Architecture Decision Records (ADRs) as a stateful lifecycle — allocate the next sequential number, draft the decision from the conversation and git diff, and manage status transitions (propose/accept/supersede/deprecate/reject) with a regenerated register. ADRs are MADR-4.0-minimal files under docs/adr/ with their own clean frontmatter; the register docs/adr/README.md is rebuilt from that frontmatter each run and surfaced to docs/INDEX.md via a single pointer. Use to record an architecturally significant decision or change an existing decision's status. Trigger phrases: "adr", "architecture decision record", "record a decision", "capture this decision", "supersede adr", "deprecate adr", "новый adr", "зафиксируй решение", "запиши архитектурное решение", "замени adr", "депрекейт adr", "реестр решений".
---

# ADR (Architecture Decision Records)

## Purpose
Own the **stateful lifecycle** of architecture decisions — the part generic doc-writing (`/in-docs-write`) cannot do:

1. **Sequential numbering** — allocate the next `NNNN` reliably across the whole `docs/adr/` folder.
2. **Immutable superseding** — reversing a decision means writing a *new* ADR and flipping the old one's status, as an atomic bidirectional two-file edit.
3. **A central register** — `docs/adr/README.md`, regenerated from the ADRs' frontmatter every run, so the decision log never lies about statuses.

Each ADR is a **MADR 4.0 minimal** file with clean MADR frontmatter. The skill is **self-sufficient** — the folder + register work with no docs system present — and integrates with `docs/INDEX.md` best-effort (a single pointer, never one row per ADR).

## Hard boundaries (locked policies)
- **One source of truth per fact.** The register is **derived** from the ADR files' frontmatter — never invent register-only data. ADR authoring/lifecycle lives here, not in `/in-docs-write` (whose `adr` type was removed).
- **Immutability after `accepted`.** Once an ADR is `accepted`, its body is immutable. The **only** permitted mutation is its status pointer (when it is superseded/deprecated). A request to change an accepted decision on the merits is answered with a **warning + an offer to create a superseding ADR**, not a silent edit. Substantive edits are allowed only while `status: proposed`.
- **Numbers are permanent.** A `rejected` ADR keeps its number forever. Numbers are never reused and gaps are never backfilled (`0001, 0002, 0004` → next is `0005`).
- **Anti-hallucination.** `Context`, `Considered Options`, and `Decision` are drafted only from evidence (the conversation + git artifacts). Missing material is marked `TODO: fill in`, never invented. If only one option was actually discussed, write one option and state that alternatives were not considered — do not fabricate strawman alternatives.
- **No commit.** Leave the diff for the user to review.
- Confirm the draft (on create) and the transition (on lifecycle change) before writing; register regeneration and the INDEX pointer are automatic.

## Steps

### 1. Preconditions and folder resolution
- Find `<repo_root>` via `git rev-parse --show-toplevel`.
- Locate the ADR folder: default `docs/adr/`. If the repo already keeps ADRs elsewhere (`doc/architecture/decisions/`, `docs/decisions/`), **respect the existing folder** instead of creating a second one. Create `docs/adr/` only if none exists.

### 2. Determine the operation
Infer from the request, the way `/in-docs-write` infers create/edit/delete:

- **create** — record a new decision.
- **accept** — `proposed → accepted`.
- **supersede** — create a new ADR *and* flip the superseded one.
- **deprecate** — `accepted → deprecated` (no longer relevant, no replacement).
- **reject** — `proposed → rejected` (record the reason to prevent relitigation).

If the user asks to change the substance of an already-`accepted` ADR, do **not** edit it — warn and offer to `supersede` it (step 4c).

### 3. Detect the documentation language
Body text and `title` are written in the dominant language of the project's existing docs/ADRs (check a few files or the register). **Field names** and `status` values are always English. **`tags`** are always English kebab-case (stable technical routing keys), e.g. `database`, `event-sourcing`.

### 4a. Create
1. **Allocate the number.** Scan the ADR folder for `NNNN-*.md`, take `max(NNNN) + 1`, zero-pad to 4 digits. Never reuse a number, never backfill a gap.
2. **Draft from context (active, anti-hallucination).** Pull `Context and Problem Statement`, `Considered Options`, and `Decision Outcome` from the current conversation and — if the decision is tied to code — from `git diff` / `git log` / changed files. Mark gaps `TODO: fill in`; never fabricate options.
3. **Pick the default status.** Default `proposed`. Switch to `accepted` only on an explicit signal ("we already decided", "record the accepted decision", "зафиксируй принятое"). Set `date` = today.
4. **Show the draft for confirmation** (full frontmatter + body). Write the file only after the user confirms.
5. Write `<adr_folder>/NNNN-<kebab-slug>.md` (slug from the title; ask only if genuinely ambiguous), with the frontmatter from step 6 and body from the template below.
6. Regenerate the register (step 5) and update the INDEX pointer (step 6).

### 4b. Accept / Deprecate / Reject
1. Identify the target ADR (by number or title).
2. **Accept**: only from `proposed`. Set `status: accepted`, `date` = today.
   **Deprecate**: from `accepted`. Set `status: deprecated`, `date` = today.
   **Reject**: from `proposed`. Set `status: rejected`, `date` = today; ensure the body records *why* (the rejection rationale prevents relitigation).
3. **Confirm the transition** (which ADR, old → new status). Then apply.
4. Regenerate the register and update the INDEX pointer.

### 4c. Supersede (atomic two-file edit)
1. Draft the **new** ADR exactly as in step 4a (allocate the next number, draft from context, default status usually `accepted` for a decision that replaces a live one — but honor `proposed` if it still needs review).
2. In the new ADR's frontmatter set `supersedes: [<old-id>]`; in the **old** ADR set `status: superseded` and `superseded-by: [<new-id>]`. This bidirectional link is the only mutation allowed on the old (accepted) ADR.
3. **Confirm the transition** (new ADR `NNNN` supersedes old `MMMM`; old → `superseded`), showing both frontmatter deltas. Then write both files.
4. Regenerate the register and update the INDEX pointer.

### 5. Regenerate the register `<adr_folder>/README.md`
**Full rebuild from frontmatter, every run** (self-healing — a hand-edited status in a file is picked up). Scan every `NNNN-*.md`, read its MADR frontmatter, and rebuild:

```md
---
type: adr
status: active
system: <system/module or repo-wide>
answers:
  - what architecture decisions have been made and their current status
  - which decision supersedes/deprecates which
last_reviewed: <YYYY-MM-DD>
---

# Architecture Decision Records

Central register of architecture decisions. Rebuilt from each ADR's frontmatter.
Immutable after accept — reverse a decision by superseding it, never by editing.
Maintained by `/in-adr`.

| ADR | Title | Status | Date | Tags | Links |
| --- | --- | --- | --- | --- | --- |
| [0001](0001-use-postgres.md) | Use PostgreSQL for OLTP | accepted | 2026-02-14 | database | — |
| [0007](0007-single-shared-db.md) | Single shared DB | superseded | 2025-11-01 | database | → 0021 |
| [0021](0021-db-per-service.md) | DB per service | accepted | 2026-02-14 | database | ⤴ 0007 |
```

Rules:
- Sort by number ascending (the historical decision log).
- `Links` shows the supersede graph: `→ NNNN` (superseded by), `⤴ NNNN` (supersedes). `—` when none.
- The register carries the docs-contract frontmatter (values in the project's doc language) so it is a legal document under a single INDEX entry. The individual ADR files carry **only** MADR frontmatter — never the docs contract.

### 6. Update `docs/INDEX.md` (best-effort)
The skill is self-sufficient; integrate only if a docs system exists.

- **If `docs/INDEX.md` exists**: ensure a **single** pointer entry exists under `### Adr` (add if missing; never one row per ADR), written in the index's language:

  ```md
  #### docs/adr/README.md
  - summary: Architecture decision register — all ADRs with status and supersede graph
  - system: <system/module or repo-wide>
  - answers: what architecture decisions exist and their current status; which decision supersedes which
  - entities: <primary decision areas / tags>
  ```

  If the `system` is new, add a line to `## Domains`.
- **If `docs/INDEX.md` does not exist**: skip index integration and note it in the report — do **not** pull in `/in-docs-audit`. The folder + register stand on their own.

### 7. Report
Print a summary:

```
Operation: create | accept | supersede | deprecate | reject
ADR: docs/adr/NNNN-<slug>.md — status <new status>  (superseded: MMMM → superseded, if any)
Numbering: allocated NNNN (max was N-1)   [create/supersede only]
Register: docs/adr/README.md rebuilt — E entries
Index: docs/INDEX.md pointer added/updated | skipped (no docs system)
Notes:
- <TODO gaps left for the user to fill / immutability warnings / anything to verify>
```

Do NOT commit — leave the diff for the user to review.

## Templates

### ADR file frontmatter (MADR 4.0, unified schema — always all fields; unknown → empty `[]`)
```yaml
---
id: 0021
title: DB per service
status: proposed          # proposed | accepted | superseded | deprecated | rejected
date: 2026-09-09          # date of the last status change
decision-makers: []
consulted: []
informed: []
tags: [database, persistence]
supersedes: []            # e.g. [7] — ADRs this one replaces
superseded-by: []         # e.g. [21] — ADR that replaced this one
---
```

### ADR body (MADR 4.0 minimal)
```md
# ADR-<NNNN>: <decision title>

## Context and Problem Statement
<The forces, the problem, and why a decision is needed. Drafted from the conversation / git diff; gaps marked `TODO: fill in`.>

## Considered Options
- <Option A>
- <Option B>
<Only options actually discussed. If just one was considered, list it and state alternatives were not considered.>

## Decision Outcome
Chosen option: "<Option A>", because <justification>.
<For a proposed ADR, this is the proposal; for accepted, the decision.>

## Consequences
- Good: <positive consequence>
- Bad: <negative consequence / accepted trade-off>
```

For a **rejected** ADR, keep the same body but make `## Decision Outcome` record *why it was rejected* — the rationale is the point.
