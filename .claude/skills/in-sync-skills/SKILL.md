---
name: in-sync-skills
description: Sync skills and agents from the skills-and-agents repo to the developer's global AI tool config (Claude Code, Codex, Cursor) or to a specific project folder. Use when the user says "sync skills", "sync agents", "install team skills", "обнови скиллы", "синхронизируй скиллы", or after pulling updates to this repo.
---

# Sync Skills

## Purpose
Copy the team's shared `skills/` and `agents/` directories from the skills-and-agents repo to either:
- the developer's global AI tool config (`~/.<tool>/skills/`), or
- a specific project (`<project>/.<tool>/skills/`).

Supported tools: **Claude Code**, **Codex**, **Cursor**. Anything else is rejected with a message asking the user to contact Dmitry Kuzyuberdin.

## Architecture
- **This skill is special: it has no `skills/` source-of-truth copy.** Unlike every other team skill, `in-sync-skills` only works when invoked from inside the skills-and-agents repo (see step 1), so a global copy would be dead weight. It therefore lives *only* in the three bootstrap locations and is deliberately kept out of `skills/`.
- Because it is not under `skills/`, step 6 never lists it, so it is never synced into a developer's global or project config — exactly what we want.
- Canonical copies live at `.claude/skills/in-sync-skills/`, `.codex/skills/in-sync-skills/`, `.cursor/skills/in-sync-skills/` so a freshly cloned developer can invoke this skill no matter which of the three tools they opened the repo in.
- **Editing convention:** treat `.claude/skills/in-sync-skills/SKILL.md` as the one you edit. Step 9 below mirrors it into the `.codex` and `.cursor` copies on every run, so all three stay in sync. Commit all three.

## Question policy (read first)
**Ask everything you can up front, in a single batched `AskUserQuestion` call, then run to completion without stopping again.** The developer should be able to answer once and walk away.

- Step 2 collects **all** setup answers at once: which tool(s), git pull yes/no, global vs project. Tool selection is **multi-select** (checkboxes) — the developer can sync to Claude Code, Codex, and Cursor in the same run.
- The project path (step 3) is the only setup follow-up, and only when "Project" was chosen — it needs free-form text so it can't live in the batched multiple-choice call.
- The **only** unavoidable later interaction is orphan deletion (step 7): an orphan can't be detected until the sync plan is built against the resolved target, which requires the setup answers first. Batch all orphan decisions together and ask them once.
- Never fall back into the old ask-one-thing-then-work-then-ask-again rhythm. If you find yourself about to ask a setup question mid-flow, you skipped it in step 2.

## Steps

### 1. Confirm the working directory is the skills-and-agents repo
Run `git rev-parse --show-toplevel` to find the repo root. Verify that `<repo_root>/skills/` exists. If not, abort with:

> This skill must be invoked from inside the skills-and-agents repo. Please `cd` there and run it again.

Remember `<repo_root>` for the rest of the steps.

### 2. Ask all setup questions at once (one batched call)
Make a **single** `AskUserQuestion` call containing these three questions — do not split them across turns:

1. **Which AI tool(s)?** — `multiSelect: true` (checkboxes, pick one or more):
   - **Claude Code**
   - **Codex**
   - **Cursor**
2. **Run `git pull` first to fetch the latest skills?** — single-select:
   - **Yes** (Recommended)
   - **No**
3. **Global or project?** — single-select:
   - **Global** — the developer's user-wide config.
   - **Project** — a specific project folder.

Handling the answers:

- **Tools.** Map each selected supported choice to its directory name; the result is a **set** `<tool_dirs>` (may contain more than one):

  | Choice      | `<tool_dir>` |
  |-------------|--------------|
  | Claude Code | `.claude`    |
  | Codex       | `.codex`     |
  | Cursor      | `.cursor`    |

  If the developer used **Other** to name an unsupported tool, print for that entry:
  > `<tool_name>` is not yet supported by `/in-sync-skills`. Please tell Dmitry Kuzyuberdin to add support for `<tool_name>`.

  Drop the unsupported entry. If at least one supported tool was also selected, continue with those; if **no** supported tool remains, stop without copying.

- **git pull / scope** are remembered for steps 3–4. Do not re-ask them.

### 3. Ask for the project path (only if "Project")
If the scope answer was **Project**, ask once for the **absolute path** to the project (free-form text — this is the single follow-up that can't be a checkbox). Validate:

- Must start with `/` (absolute). Reject `~`, `./`, relative paths with:
  > Please provide an absolute path starting with `/`.
- Path must exist and be a directory (`test -d "<path>"`). Reject otherwise with:
  > Path does not exist or is not a directory: `<path>`

If the scope answer was **Global**, skip this step. From here on, ask nothing until the orphan decisions in step 7.

### 4. Run `git pull` if requested
- If the developer chose **Yes** in step 2: run `git pull` from `<repo_root>`.
  - If pull fails (dirty tree, conflicts, divergence), print the error and ask whether to abort or continue with the current checkout. Never force-pull, reset, or stash without explicit user consent.
- If **No**: continue with whatever is currently on disk.

### 5. Resolve the target directory for each selected tool
For **every** `<tool_dir>` in `<tool_dirs>`, resolve a `<target_root>`:

- **Global** → `<target_root> = $HOME/<tool_dir>`
- **Project** → `<target_root> = <path>/<tool_dir>` (using the validated `<path>` from step 3)

Targets used per tool in step 8:
- skills target: `<target_root>/skills/`
- agents target: `<target_root>/agents/`

Steps 6–8 below run **once per selected tool**. Build every tool's plan before asking any orphan questions, so all remaining questions can be batched together in step 7.

### 6. Build the sync plan (per selected tool)
The source lists are the same for every tool. Compute them once from `<repo_root>`:

- List subdirectories of `<repo_root>/skills/` → these are the **skill items** to sync.
- If `<repo_root>/agents/` exists, list its subdirectories → these are the **agent items** to sync. Otherwise the agents list is empty.

Then, **for each selected tool's `<target_root>`**, classify against that destination. For each source item:
- If `<target>/skills/<item>/` (or `<target>/agents/<item>/`) already exists → **overwrite**.
- Otherwise → **new**.

**Orphan detection (`in-*` only).** Run this per tool. Anything in that tool's `<target_root>/skills/` (and `<target_root>/agents/`) that:

1. starts with `in-`, AND
2. does NOT exist in the corresponding source list

is an **orphan candidate** — likely renamed or removed from the team repo. Collect these into a per-tool orphans list, tagged with which tool/target they belong to (the same `in-` name may be an orphan in one tool but not another). All team skills and agents are prefixed `in-`.

Items in the destination that do NOT start with `in-` are personal/external skills — never list them, never offer them for deletion, never touch them.

For each orphan, gather context from the repo's git history to explain *why* it might be gone:

```bash
# Look for delete/rename events touching this orphan's path in recent history.
git -C "<repo_root>" log -n 10 --diff-filter=DR --name-status --format='COMMIT %h %s' -- "skills/<orphan>" "agents/<orphan>"
```

Parse the output to find the most recent event:
- A line `D skills/<orphan>/...` under `COMMIT <hash> <subject>` → reason: **deleted in `<hash>`: `<subject>`**.
- A line `R<score> skills/<orphan>/... skills/<new_name>/...` → reason: **renamed to `<new_name>` in `<hash>`: `<subject>`**.

If git returns nothing, reason: **no recent commit history found — may predate this repo or have been installed manually**.

### 7. Show one combined summary, gather all orphan decisions, confirm once
Print **one** summary covering every selected tool — one block per tool:

```
Scope:   Global

── Claude Code → ~/.claude/  (skills/ + agents/) ──
Skills to add (2):       in-arch-c4-code, in-arch-er-diagram
Skills to overwrite (5): in-add-global-skill, in-arch-c4-diagrams, in-arch-dynamic-diagrams, ...
Agents to add (0):       (none)
Agents to overwrite (0): (none)
Orphan in-* items (1):
  - in-old-thing   reason: deleted in abc1234: chore(skills): drop unused in-old-thing

── Cursor → ~/.cursor/  (skills/) ──
Skills to add (7):       ...
Skills to overwrite (0): (none)
Orphan in-* items (0):   (none)
```

Then, if any orphans exist **across all tools**, gather every orphan decision in as few `AskUserQuestion` calls as possible — up to 4 questions per call, looping only if there are more than 4 total. Each question names the tool so identical `in-` names in different targets stay distinct:

> `[Claude Code]` Orphan `<name>` — `<reason>`. Delete from `~/.claude`?
> - Delete it
> - Keep it

Collect each decision against its (tool, item). Items in the destination that do NOT start with `in-` are personal/external skills — never list them, never offer them for deletion, never touch them.

Then ask the **single final** confirmation (one call, applies to all tools):

> Proceed? (will apply syncs/overwrites to all selected tools + delete the orphans you confirmed)

If no → abort with no changes (no syncs, no deletions) for any tool. If there are zero orphans anywhere, skip straight to this Proceed? question.

### 8. Apply the sync (loop over every selected tool)
Run the whole of this step once per selected tool's `<target_root>`, applying that tool's own orphan decisions from step 7.

Ensure target dirs exist:

```bash
mkdir -p "<target_root>/skills"
# Only if there is at least one agent item:
mkdir -p "<target_root>/agents"
```

For each skill item `<name>` in `<repo_root>/skills/`:

```bash
rsync -a --delete \
  --exclude='.*' \
  --exclude='Thumbs.db' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.idea' \
  --exclude='.vscode' \
  "<repo_root>/skills/<name>/" "<target_root>/skills/<name>/"
```

For each agent item `<name>` in `<repo_root>/agents/` (only if `agents/` exists): same command, swapping `skills` for `agents`.

Notes:
- Trailing slashes on both sides are intentional — sync **contents** of `<name>/` into `<name>/`, not nested.
- `--delete` here scopes deletion **inside the item folder being synced** (so renaming files inside a skill works cleanly). It does **not** affect sibling items in the destination.
- We never iterate over destination items that are not in source, so personal skills outside the repo are untouched (additive-only at the item level).
- `--exclude='.*'` already covers `.DS_Store`, `.git`, `.idea`, `.vscode`; the explicit excludes are belt-and-suspenders.

Fallback if `rsync` is not available (rare on macOS/Linux; Windows shells may need it):

```bash
mkdir -p "<target_root>/skills/<name>"
# Remove what's there, then copy fresh (only inside this one item folder):
rm -rf "<target_root>/skills/<name>"/*
cp -R "<repo_root>/skills/<name>/." "<target_root>/skills/<name>/"
find "<target_root>/skills/<name>" -name '.*' -prune -exec rm -rf {} +
find "<target_root>/skills/<name>" \( -name 'Thumbs.db' -o -name 'node_modules' \) -prune -exec rm -rf {} +
```

**Delete confirmed orphans.** For each orphan the user confirmed for deletion in step 7:

```bash
target="<target_root>/skills/<orphan>"     # or "<target_root>/agents/<orphan>"
case "$(basename "$target")" in
  in-*) ;;                                  # safety: only in-* paths
  *) echo "REFUSED: $target is not in-*"; continue ;;
esac
if [ -L "$target" ]; then
  rm -f "$target"                           # symlink: remove only the link
elif [ -d "$target" ]; then
  rm -rf "$target"                          # real dir: remove fully
fi
```

Safety: only paths matching `<target_root>/{skills,agents}/in-*` may be deleted. Never `rm -rf` anything without the `in-` prefix, even if asked.

### 9. Mirror this skill into the other bootstrap copies
`in-sync-skills` lives only in the three bootstrap locations (there is no `skills/` copy). Treat `.claude/skills/in-sync-skills/` as the canonical one you edit, and mirror it into the `.codex` and `.cursor` copies so all three tools see the same version:

```bash
for boot in .codex .cursor; do
  mkdir -p "<repo_root>/$boot/skills/in-sync-skills"
  rsync -a --delete \
    --exclude='.*' \
    "<repo_root>/.claude/skills/in-sync-skills/" "<repo_root>/$boot/skills/in-sync-skills/"
done
```

If anything changed in the `.codex`/`.cursor` copies, mention it in the final report so the maintainer knows to commit them.

### 10. Report
Print:

One block per selected tool, then the shared footer:

```
Claude Code → ~/.claude/: synced N skills (X new, Y updated) and M agents (X new, Y updated).
  Removed D orphan in-* items: <names...>
  Kept K orphan in-* items (user declined): <names...>
Cursor → ~/.cursor/: synced N skills (X new, Y updated).

Bootstrap copies mirrored from .claude/ into: .codex/, .cursor/.
```

Omit a tool's "Removed" and/or "Kept" line when its count is zero.

If the user declined `git pull` in step 2, append:
> Note: you skipped `git pull`. The repo may be behind the team's latest. Run `git pull` and re-run `/in-sync-skills` to update.

## Locked policies
- **Question batching**: all setup answers (tool(s), git pull, global/project) are collected in one `AskUserQuestion` call up front; the project path is the only setup follow-up (Project only); orphan decisions are the only data-dependent questions and are batched together. Never drip-feed setup questions.
- **Tool selection**: multi-select — one run can sync to any combination of Claude Code, Codex, and Cursor. Steps 5–8 loop per selected tool.
- **Copy mode**: physical copy (rsync/cp), not symlink — cross-platform safe (Windows-friendly).
- **Scope**: `skills/` always; `agents/` if present.
- **Selection**: sync everything, no per-item picker.
- **Overwrite**: silent overwrite at item level.
- **Deletion**:
  - Inside each synced item: `rsync --delete` removes stale files inside that item folder so renames inside a skill clean up properly.
  - At the item level: `in-*` orphans (present in destination but absent from source) are deletion candidates. Each requires explicit per-item confirmation with a git-history reason (deleted/renamed commit, or "no history found").
  - Items in the destination that do NOT start with `in-` are NEVER listed, offered, or removed — they are personal/external skills.
- **Path validation**: must be absolute, must exist as a directory.
- **Pre-sync UX**: dry-run summary + explicit confirm.
- **Auto pull**: ask, default Yes; never force or reset.
- **Exclusions**: dotfiles, `.DS_Store`, `Thumbs.db`, `.git`, `.idea`, `.vscode`, `node_modules`.

## Trigger phrases
- `/in-sync-skills`
- "sync skills"
- "sync agents"
- "install team skills"
- "обнови скиллы"
- "синхронизируй скиллы"
- "обнови команду скиллов"
