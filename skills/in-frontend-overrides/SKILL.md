---
name: in-frontend-overrides
description: Align a frontend project's documentation and agent rules with the in-frontend-feature skill — find rules that duplicate the skill, rules that contradict it, and project-specific rules; after the user confirms a plan, delete the duplicates, record intentional deviations in docs/frontend-overrides.md, and point AGENTS.md/CLAUDE.md at it. Also re-validates existing overrides after the skill changes. Use when a project's frontend docs repeat or contradict the team skill, or when in-frontend-feature reports an unmarked conflict. Trigger phrases: "frontend overrides", "align frontend docs", "remove duplicated frontend rules", "check frontend overrides", "приведи фронтенд-доки к скиллу", "убери дубли правил фронта", "оверрайды фронтенда", "проверь переопределения фронта".
---

# Frontend Overrides

## Purpose

Projects using `in-frontend-feature` should not restate its rules. A restated rule drifts from the skill, and an agent reading both gets two sources of truth. This skill reduces a project's frontend guidance to what is actually specific to it:

- rules the skill does not cover stay where they are;
- rules that duplicate the skill are deleted;
- intentional deviations are recorded as overrides in `docs/frontend-overrides.md`, which `in-frontend-feature` reads and obeys.

Every edit happens only after the user confirms the plan. Whether a contradicting rule is an intentional deviation or a stale leftover is the user's decision, never the agent's.

## The overrides document

`docs/frontend-overrides.md` is the only place `in-frontend-feature` looks for deviations. Keep this exact structure so both skills read it the same way:

```md
# Frontend overrides

Rules of the `in-frontend-feature` skill that this project intentionally replaces. Everything not listed here follows the skill.

## Override: Query hooks only in entities
- Replaces: `references/architecture.md#page-first-means-the-page-slice` — "New page-specific code starts in the page slice."
- Rule: Query hooks are always defined in `entities/{entity}/model/`, never in a page model.
- Why: Our codegen generates one hook module per entity.
```

- `Replaces` holds an anchor and a quote. The anchor is the path of the skill file relative to the skill's root plus the GitHub-style slug of the heading that contains the rule. The quote is the replaced sentence, verbatim.
- `Rule` states the project's rule completely enough to follow without reading the replaced one.
- `Why` is required. An override without a reason cannot be told apart from a stale rule.
- One `## Override:` section per replaced rule. Keep the document free of anything else.

`AGENTS.md` (or `CLAUDE.md` when the project has no `AGENTS.md`) carries one pointer line:

```md
Frontend: follow the `in-frontend-feature` skill; intentional deviations are listed in `docs/frontend-overrides.md`.
```

## Steps

### 1. Load the skill being aligned to

Locate `in-frontend-feature` in the installed skills directory or in this repository's `skills/`. Read its `SKILL.md` and every file under `references/` in full; these are the rules the project is compared against. If the skill is unavailable, stop and say so. Never compare against remembered or summarized rules.

Resolve the target repository root (`git rev-parse --show-toplevel` is allowed).

### 2. Collect the project's frontend guidance

Read these sources in full when they exist:

- `AGENTS.md` and `CLAUDE.md`, at the root and in nested directories;
- `docs/**/*.md` and `README.md`;
- `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`;
- project skills in `.claude/skills/`, `.codex/skills/`, `.cursor/skills/`.

Ignore lint, TypeScript, and build configuration; they are out of scope. Ignore guidance that is not about the frontend (backend, deployment, product docs), except for the pointer line and the index.

### 3. Classify every frontend rule

Split the guidance into individual rules and give each one exactly one class:

| Class | Meaning | Proposed action |
|---|---|---|
| Duplicate | Says what the skill says, in any wording, possibly with project-specific names as examples | Delete it |
| Conflict | Prescribes something the skill forbids or places differently | Ask the user: override or stale |
| Project-specific | A topic the skill does not cover (domain modules list, design tokens, a project library) | Keep it unchanged |
| Existing override | Already listed in `docs/frontend-overrides.md` | Re-validate, see below |

A rule that narrows the skill without contradicting it (for example, naming the project's actual modules) is project-specific, not a conflict. When a rule is partly duplicate and partly specific, propose deleting only the duplicated part.

A project skill whose purpose overlaps `in-frontend-feature` is a conflict at the skill level: report it and ask whether to remove it, rename it, or record its differences as overrides. Never delete a project skill without that answer.

Re-validate each existing override: find its anchor in the current skill and check that the quoted sentence is still there.

- Anchor and quote both found: the override is valid.
- Quote found under a different heading: propose updating the anchor.
- Quote not found: the override is stale. Show the closest current rule, if any, and ask whether to keep the override (with a rewritten `Replaces`), drop it, or change it.
- An override missing `Why`: ask for the reason.

### 4. Present the plan and wait

Show the plan grouped by file. For each rule, show the location, a short quote, its class, and the proposed action. Show every conflict as a question with two outcomes:

- **Override:** the project keeps its rule. Ask for the reason; it becomes `Why`.
- **Stale:** the rule is deleted and the skill applies.

Ask the conflict questions in the user's language, one batch per file at most. Make no edits until the user confirms the plan and answers every conflict. A conflict the user leaves unanswered stays as it is and is listed in the report as unresolved.

### 5. Apply the confirmed plan

- Delete duplicated and stale rules. If a document becomes empty or only a heading remains, propose deleting the whole file as part of the plan and fix links that pointed to it.
- Write confirmed overrides to `docs/frontend-overrides.md` in the exact format above. Create the file only when at least one override exists; delete it when its last override is dropped.
- Add the pointer line to `AGENTS.md`, or to `CLAUDE.md` when there is no `AGENTS.md`. Do not add it twice; replace any older wording of the same pointer.
- If the project has `docs/INDEX.md`, read and apply `/in-docs-write` for every created, changed, or deleted document: frontmatter, and the index entry updated in the same change. Locate it the same way as `in-frontend-feature`. Without an index, write plain files and do not create one.
- Never edit `in-frontend-feature` itself. If a rule looks wrong in the skill rather than in the project, note it in the report.

### 6. Verify and report

Re-read the changed files and check:

- no remaining frontend rule duplicates or contradicts the skill without an override;
- every override has `Replaces` with an anchor that exists in the current skill and a verbatim quote, plus `Rule` and `Why`;
- the pointer line is present exactly once;
- the index is in sync when the project has one.

Report: files changed and deleted, overrides recorded with their reasons, rules kept as project-specific, unresolved conflicts, and suggested fixes to the skill itself. Leave all changes uncommitted.
