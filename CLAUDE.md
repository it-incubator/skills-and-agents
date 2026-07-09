# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A team-shared library of agent skills for AI coding tools (Claude Code, Codex, Cursor). There is no application code, build, lint, or test tooling — the repo is markdown skill definitions plus the sync mechanism that distributes them.

## Architecture

- `skills/<skill-name>/SKILL.md` — the **source of truth** for every skill. One directory per skill.
- `.claude/skills/`, `.codex/skills/`, `.cursor/skills/` — **bootstrap copies** containing only `in-sync-skills`, so a freshly cloned developer can invoke the sync skill regardless of which tool they opened the repo in. Never edit these directly; they are refreshed from `skills/in-sync-skills/` (step 9 of that skill does it on every run). If they change, commit them.
- `agents/` — does not exist yet, but `/in-sync-skills` will pick it up automatically if added (same one-directory-per-item layout).

Distribution model: developers run `/in-sync-skills`, which physically copies (rsync, never symlinks — Windows-safe) each skill directory into `~/.<tool>/skills/` or `<project>/.<tool>/skills/`. Sync is additive at the item level: it overwrites skills that exist in this repo but never deletes a developer's personal skills in the destination.

## Skill conventions

- All skill names are prefixed `in-` (team-namespace marker), e.g. `in-commit`, `in-arch-c4-diagrams`. Architecture-diagram skills use the `in-arch-` prefix.
- Each `SKILL.md` starts with YAML frontmatter containing `name` and `description`. The `description` must state when to use the skill and include trigger phrases in **both English and Russian** — this is what the agent matches against.
- Body structure follows the existing skills: `## Purpose`, then numbered `## Steps`; add `## Architecture`, `## Locked policies`, or `## Trigger phrases` sections when the skill needs them.
- When renaming or adding a skill, remember the copy in the developer's global config only updates after they re-run `/in-sync-skills`.

## Commits

Conventional Commits with the `skills` scope, e.g. `feat(skills): add in-arch-sequence-for-usecase`, `refactor(skills): rename in-commit-message to in-commit`.
