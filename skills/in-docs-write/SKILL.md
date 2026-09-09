---
name: in-docs-write
description: Create, edit, or delete a project documentation file (.md or .puml) keeping metadata and the docs/INDEX.md manifest in sync — pick the right template, fill YAML frontmatter, update the index entry in the same change. Use whenever documentation is written or changed in a project that has a docs index. Trigger phrases: "docs write", "new doc", "add a doc", "update the doc", "создай док", "новый документ", "обнови документацию", "добавь документ в индекс".
---

# Docs Write

## Purpose
Steady-state companion to `/in-docs-audit`: governs the **whole lifecycle** of a documentation file so the structure stays healthy without periodic cleanups.

The invariant this skill exists to protect: **no documentation change is complete until `docs/INDEX.md` reflects it.** Created a doc → entry added. Edited a doc → frontmatter and entry synchronized, `last_reviewed` bumped. Deleted or renamed a doc → entry removed or repointed.

## Steps

### 1. Preconditions
- Find `<repo_root>` via `git rev-parse --show-toplevel`.
- If `docs/INDEX.md` does not exist, say so and suggest running `/in-docs-audit` first. If the user wants to proceed anyway, create a minimal `docs/INDEX.md` (header + Taxonomy + empty Documents) using the shape defined in `in-docs-audit`, then continue.
- Read the `## Taxonomy` section of `docs/INDEX.md` — core types plus project extensions are the only valid values for `type`.

### 2. Determine the operation
From the user's request: **create**, **edit**, or **delete/rename**. If the user already changed the file and asks to "sync the docs", treat it as **edit**.

### 3. Detect the documentation language
Body text and metadata **values** are written in the dominant language of the project's existing docs (check a few files or the index). Field names are always English.

### 4a. Create
1. Pick `type` (ask only if genuinely ambiguous) and the matching template from `## Templates` below. **Exception — ADRs:** this skill does not author Architecture Decision Records. If the user wants to record or change an architecture decision (`type` would be `adr`), stop and delegate to `/in-adr`, which owns ADR numbering, the immutable superseding lifecycle, and the `docs/adr/README.md` register. (`adr` remains a valid taxonomy value — an existing ADR is still classified and pointed to from the index — but it is created and maintained only via `/in-adr`.)
2. Place the file: default under `docs/` in a subfolder matching the type or system (follow the placement pattern already visible in the index); a doc tightly coupled to one module may live next to that module's code.
3. Fill **all** frontmatter fields — none may be omitted:
   - `type`, `status` (new docs start as `draft` unless the user says otherwise), `system`, `entities`, `answers` (2–5 concrete questions the doc answers — the routing field), `related`, `source_files`, `last_reviewed` (today).
   - For `.puml`: same fields as a `'` comment block right after `@startuml`, plus `subtype`.
4. Write the body per the template: literal headings, a short agent-readable `## Summary` first, self-contained sections.
5. Add the index entry (see step 5).

### 4b. Edit
1. Apply the requested content change.
2. Re-read the result and re-derive metadata: do `answers`, `entities`, `related`, `source_files`, `status` still match the content? Update what drifted.
3. Bump `last_reviewed` to today.
4. Synchronize the doc's entry in `docs/INDEX.md` with the new frontmatter (see step 5).

### 4c. Delete / rename
1. Delete or move the file as requested (renames/moves are allowed here — unlike the auditor, this is an explicit user-driven operation).
2. Remove or repoint the entry in `docs/INDEX.md`.
3. Grep the corpus for references to the old path (`related`, `source_files`, links in bodies) and update them; list any you could not resolve.

### 5. Update `docs/INDEX.md`
- The entry lives under the `### <Type>` group, sorted by path; keep the entry format exactly as defined in `in-docs-audit` step 6 (`summary`, `system`, `answers`, `entities`, `related`, and `subtype` for diagrams).
- The entry is **derived from the document's frontmatter** — never invent index-only information.
- If the doc's `system` is new, add a line to `## Domains`.
- If the user introduced a genuinely new doc type, add it to `## Taxonomy` under "Project extensions" with a one-line meaning — do not silently reuse `other` for a recurring category.

### 6. Verify the invariant
Before finishing, check and state explicitly:
- frontmatter complete and valid YAML (or `'` header for `.puml`);
- `docs/INDEX.md` entry exists / updated / removed and matches the frontmatter;
- `last_reviewed` is today.

If any check fails — fix it now; the task is not done. Do NOT commit — leave the diff for the user.

## Templates

Shared frontmatter (all types; values in the project's doc language):

```md
---
type: <taxonomy value>
status: draft | active | deprecated
system: <system/module>
entities: [<entity>, <entity>]
answers:
  - <question this doc answers>
  - <question this doc answers>
related: [<repo-relative path>]
source_files: [<code path>]
last_reviewed: <YYYY-MM-DD>
---
```

### architecture
```md
# <Component/System> Architecture

## Summary
<2–4 sentences: what this part of the system is and what the doc covers.>

## Context
<Where it sits, what depends on it, what it depends on.>

## Structure
<Components/layers and responsibilities.>

## Data flows
<Key runtime flows; reference diagrams via `related`.>

## Invariants and constraints
<Rules that must hold; non-obvious design constraints.>
```

### service
```md
# <Service name>

## Summary
<What the service owns and its boundary.>

## Responsibilities
## API surface
<Endpoints/queues/events it exposes; link api docs.>

## Dependencies
<What it calls; what calls it.>

## Configuration
## Failure modes
```

### api
```md
# <API name>

## Summary
## Endpoints
<Per endpoint: method, path, purpose, request/response shape, errors.>

## Auth
## Versioning and compatibility
```

### runbook
```md
# Runbook: <operation>

## Summary
<When to use this runbook.>

## Preconditions
## Steps
<Numbered, copy-pasteable commands.>

## Verification
<How to confirm success.>

## Rollback
```

### adr
ADRs are **not** authored by this skill. Use `/in-adr` — it owns ADR numbering, the
MADR-4.0 template, the immutable superseding lifecycle, and the `docs/adr/README.md`
register. (`adr` stays a taxonomy value so existing ADRs are still classified and
surfaced via the single index pointer to the register.)

### troubleshooting
```md
# Troubleshooting: <problem area>

## Summary
## Symptoms
## Diagnostics
<Commands/queries to localize the cause.>

## Causes and fixes
<Per cause: how to confirm it, how to fix it.>
```

### guide
```md
# <Guide title>

## Summary
<Who this guide is for and what they achieve by following it.>

## Prerequisites
## Steps
## Result
```

### diagram (`.puml`)
```
@startuml
' type: diagram
' subtype: c4-context | c4-container | c4-component | c4-code | c4-deployment | er | sequence | use-case | dynamic | other
' status: active
' system: <system/module>
' entities: <comma-separated>
' answers: <q1>; <q2>
' related: <repo-relative paths>
' last_reviewed: <YYYY-MM-DD>
title <Literal diagram title>
...
@enduml
```

### other
Shared frontmatter + `# Title` + `## Summary` + free-form sections with literal headings.
