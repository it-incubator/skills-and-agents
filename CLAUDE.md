# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A team-shared library of agent skills for AI coding tools (Claude Code, Codex, Cursor). There is no application code, build, lint, or test tooling — the repo is markdown skill definitions plus the sync mechanism that distributes them.

## Architecture

- `skills/<skill-name>/SKILL.md` — the **source of truth** for every skill. One directory per skill.
- `.claude/skills/`, `.codex/skills/`, `.cursor/skills/` — **bootstrap copies** containing only `in-sync-skills`, so a freshly cloned developer can invoke the sync skill regardless of which tool they opened the repo in.
- `in-sync-skills` is deliberately the **one skill with no `skills/` copy** — it only works when run from inside this repo (its step 1 aborts otherwise), so a global copy would be dead weight, and leaving it out of `skills/` keeps step 6 from ever syncing it into anyone's global config. It lives only in the three bootstrap dirs above. Edit the `.claude/skills/in-sync-skills/` copy; step 9 of the skill mirrors it into the `.codex` and `.cursor` copies. Commit all three.
- **`in-sync-skills` must NEVER live in a global config** (`~/.claude/skills/`, `~/.codex/skills/`, `~/.cursor/skills/`) or in any project's `.<tool>/skills/`. It is a repo-only skill, invoked from inside this repo via `/in-sync-skills`. If a stale global copy exists (e.g. installed manually by an older workflow), delete it — `rm -rf ~/.<tool>/skills/in-sync-skills`. It is **not** a team-library skill that got removed, so orphan detection must not offer to re-sync it; it simply should not be there.
- `agents/` — does not exist yet, but `/in-sync-skills` will pick it up automatically if added (same one-directory-per-item layout).

Distribution model: developers run `/in-sync-skills`, which physically copies (rsync, never symlinks — Windows-safe) each skill directory into `~/.<tool>/skills/` or `<project>/.<tool>/skills/`. Sync is additive at the item level: it overwrites skills that exist in this repo but never deletes a developer's personal skills in the destination.

## Precedence: why names matter here

Skills and agents resolve name collisions in **opposite** directions. Both verified experimentally, not just read off the docs.

| | Same name in personal and project config | Result |
| --- | --- | --- |
| **Skills** | `~/.claude/skills/X` vs `<project>/.claude/skills/X` | **personal wins** — the project copy never reaches the model's skill list at all |
| **Agents** | `~/.claude/agents/X.md` vs `<project>/.claude/agents/X.md` | **project wins** (`.claude/agents/` is priority 3, `~/.claude/agents/` is 4) |
| **CLAUDE.md** | user + project | neither wins — all files are concatenated; on contradiction the model picks arbitrarily |

Consequences for this repo:

- **The `in-` prefix is not decoration.** A team skill installed globally silently shadows any project skill of the same name — the project's version stops existing as far as the model is concerned, while the slash menu still lists both. The prefix keeps team skills out of that collision.
- **Never claim a bare, likely-used name** (`commit`, `review`, `deploy`, `write-e2e-tests`) for a skill that ships from here.
- **Agents added under `agents/` must keep plain names** (`designer`, `developer`, `qa`, `tester`) — *not* `in-designer`. Because project agents override personal ones, a project that ships its own `designer` is meant to win, and a prefixed name would break that by making both visible at once.
- When a project deliberately specializes a skill (e.g. a starter-kit fork's `sk-write-e2e-tests`), the two must have **different names** and each `description` should say when to prefer it. Same-name "overlay" does not work — the project copy is invisible, not merged.

## Skill conventions

- All skill names are prefixed `in-` (team-namespace marker), e.g. `in-commit`, `in-arch-c4-diagrams`. Architecture-diagram skills use the `in-arch-` prefix.
- Each `SKILL.md` starts with YAML frontmatter containing `name` and `description`. The `description` must state when to use the skill and include trigger phrases in **both English and Russian** — this is what the agent matches against.
- Body structure follows the existing skills: `## Purpose`, then numbered `## Steps`; add `## Architecture`, `## Locked policies`, or `## Trigger phrases` sections when the skill needs them.
- When renaming or adding a skill, remember the copy in the developer's global config only updates after they re-run `/in-sync-skills`.

## Commits

Conventional Commits with the `skills` scope, e.g. `feat(skills): add in-arch-sequence-for-usecase`, `refactor(skills): rename in-commit-message to in-commit`.
