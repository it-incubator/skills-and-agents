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
- Source of truth lives at `skills/in-sync-skills/SKILL.md` inside the skills-and-agents repo.
- Bootstrap copies live at `.claude/skills/in-sync-skills/`, `.codex/skills/in-sync-skills/`, `.cursor/skills/in-sync-skills/` so a freshly cloned developer can invoke this skill no matter which of the three tools they opened the repo in.
- Step 9 below re-copies the source-of-truth into the three bootstrap locations on every run, so editing `skills/in-sync-skills/SKILL.md` automatically propagates.

## Steps

### 1. Confirm the working directory is the skills-and-agents repo
Run `git rev-parse --show-toplevel` to find the repo root. Verify that `<repo_root>/skills/` exists. If not, abort with:

> This skill must be invoked from inside the skills-and-agents repo. Please `cd` there and run it again.

Remember `<repo_root>` for the rest of the steps.

### 2. Ask which AI tool the developer uses
Ask a single-select question with these options:

- **Claude Code**
- **Codex**
- **Cursor**
- **Other**

If **Other**:
1. Ask the user: *"Which AI tool are you using?"*
2. Print exactly:
   > `<tool_name>` is not yet supported by `/in-sync-skills`. Please tell Dmitry Kuzyuberdin to add support for `<tool_name>`.
3. Stop. Do not perform any copies.

Otherwise, map the choice to a tool directory name:

| Choice      | `<tool_dir>` |
|-------------|--------------|
| Claude Code | `.claude`    |
| Codex       | `.codex`     |
| Cursor      | `.cursor`    |

### 3. Offer to `git pull` first
Ask: *"Run `git pull` first to fetch the latest skills?"* — default **Yes**.

- If yes: run `git pull` from `<repo_root>`.
  - If pull fails (dirty tree, conflicts, divergence), print the error and ask whether to abort or continue with the current checkout. Never force-pull, reset, or stash without explicit user consent.
- If no: continue with whatever is currently on disk.

### 4. Ask: global or project?
Single-select:

- **Global** — sync to the developer's user-wide config.
- **Project** — sync to a specific project folder.

### 5. Resolve the target directory
Define `<target_root>`:

- **Global** → `<target_root> = $HOME/<tool_dir>`
- **Project**:
  1. Ask the user for the **absolute path** to the project.
  2. Validate:
     - Must start with `/` (absolute). Reject `~`, `./`, relative paths with:
       > Please provide an absolute path starting with `/`.
     - Path must exist and be a directory (`test -d "<path>"`). Reject otherwise with:
       > Path does not exist or is not a directory: `<path>`
  3. `<target_root> = <path>/<tool_dir>`

Targets used in step 8:
- skills target: `<target_root>/skills/`
- agents target: `<target_root>/agents/`

### 6. Build the sync plan
From `<repo_root>`:

- List subdirectories of `<repo_root>/skills/` → these are the **skill items** to sync.
- If `<repo_root>/agents/` exists, list its subdirectories → these are the **agent items** to sync. Otherwise the agents list is empty.

For each source item, classify against the destination:
- If `<target>/skills/<item>/` (or `<target>/agents/<item>/`) already exists → **overwrite**.
- Otherwise → **new**.

**Orphan detection (`in-*` only).** All team skills and agents are prefixed `in-`. Anything in `<target_root>/skills/` (and `<target_root>/agents/`) that:

1. starts with `in-`, AND
2. does NOT exist in the corresponding source list

is an **orphan candidate** — likely renamed or removed from the team repo. Collect these into an orphans list.

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

### 7. Show summary, gather orphan decisions, confirm
Print the summary:

```
Tool:    Claude Code
Target:  ~/.claude/  (skills/ + agents/)

Skills to add (3):       in-arch-c4-code, in-arch-er-diagram, in-sync-skills
Skills to overwrite (5): in-add-global-skill, in-arch-c4-diagrams, in-arch-dynamic-diagrams, ...
Agents to add (0):       (none)
Agents to overwrite (0): (none)

Orphan in-* items found (2):
  - in-commit-message   reason: renamed to in-commit in 4f867b4: refactor(skills): rename in-commit-message to in-commit
  - in-old-thing        reason: deleted in abc1234: chore(skills): drop unused in-old-thing
```

If there are orphans, ask the user per-orphan whether to delete or keep, repeating the reason in the question:

> Orphan `<name>` — `<reason>`. Delete from `<target_root>`?
> - Delete it
> - Keep it

Batch up to 4 orphan questions per `AskUserQuestion` call; loop if more. Collect each decision.

Then ask the **final** confirmation:

> Proceed? (will apply syncs/overwrites + delete the orphans you confirmed)

If no → abort with no changes (no syncs, no deletions).

If there are zero orphans, skip the per-orphan step and just ask the final Proceed?

### 8. Apply the sync
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

### 9. Refresh bootstrap copies inside this repo
Re-sync the source-of-truth into the three bootstrap locations so future clones / fresh checkouts see the latest version:

```bash
for boot in .claude .codex .cursor; do
  mkdir -p "<repo_root>/$boot/skills/in-sync-skills"
  rsync -a --delete \
    --exclude='.*' \
    "<repo_root>/skills/in-sync-skills/" "<repo_root>/$boot/skills/in-sync-skills/"
done
```

If anything changed in the bootstrap copies, mention it in the final report so the maintainer knows to commit them.

### 10. Report
Print:

```
Synced N skills (X new, Y updated) and M agents (X new, Y updated) to <target_root>.
Removed D orphan in-* items: <names...>
Kept K orphan in-* items (user declined): <names...>
Bootstrap copies refreshed: .claude/, .codex/, .cursor/.
```

Omit the "Removed" and/or "Kept" lines when their counts are zero.

If the user declined `git pull` in step 3, append:
> Note: you skipped `git pull`. The repo may be behind the team's latest. Run `git pull` and re-run `/in-sync-skills` to update.

## Locked policies
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
