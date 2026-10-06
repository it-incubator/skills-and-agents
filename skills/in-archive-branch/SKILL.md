---
name: in-archive-branch
description: Archive the current git branch to origin under archive/<branch> — push it to the archive name, delete the old remote branch, and delete the local branch. Use when the user says "archive this branch", "archive branch", "move to archive/* and delete original", "заархивируй ветку", "архивируй текущую ветку", "перенеси ветку в архив".
---

# Skill: Archive Git Branch

## Purpose
Retire a finished or abandoned branch without losing its history: create (or update) a remote branch named `archive/<current-branch>`, delete the old remote branch if it exists, and delete the local branch. The work stays reachable on `origin` while the active branch list stays clean.

## Steps

### 1. Verify preconditions
Run the checks before touching any ref:
- `git rev-parse --is-inside-work-tree` — must be inside a Git repository.
- `git rev-parse --abbrev-ref HEAD` — resolve the current branch name (`BRANCH`). If the result is `HEAD` (detached), stop and ask the user to check out a branch.
- `git remote get-url origin` — the `origin` remote must exist. If it does not, stop and report that there is nowhere to archive to.
- Refuse protected branches by default: `main`, `master`, `develop`. Proceed only if the user explicitly says to archive it anyway.
- `git status --short` — if the working tree is dirty, warn the user: uncommitted changes are **not** archived and will be lost together with the local branch. Ask whether to continue, commit first, or stop.
- `git log --oneline origin/${BRANCH}..${BRANCH}` — unpushed commits are fine (the archive push carries them), but mention them in the output.

Let `ARCHIVE = archive/${BRANCH}`.

### 2. Push the branch to the archive name
- `git push origin "${BRANCH}:${ARCHIVE}"`
- If `origin/${ARCHIVE}` already exists, the push still runs (create or fast-forward update). If it is rejected as non-fast-forward, **stop and ask** whether to force-update the archive with `git push --force origin "${BRANCH}:${ARCHIVE}"`. Never force without a go-ahead — the existing archive may hold work that is nowhere else.
- If this push fails for any other reason, stop here. Nothing has been deleted yet, so the state is still safe.

### 3. Delete the old remote branch
- Check first: `git ls-remote --heads origin "${BRANCH}"`
- If it exists: `git push origin --delete "${BRANCH}"`
- If the remote refuses the deletion (branch protection, open PR requirement), report it and stop after the successful archive push — the archive exists, the cleanup is the only thing missing.

### 4. Delete the local branch
Skip this step entirely if the user said to keep the local branch.
- Move off the branch first: prefer `main`, else `master`, else any other local branch.
  - `git switch main` / `git switch master`
- Then delete: `git branch -D "${BRANCH}"`
  - `-D` is intentional: the branch was just pushed to the archive ref, so Git's "not merged" warning is noise here.

### 5. Report the result
Print, in this order:
- The branch that was archived and the archive ref created — `origin/archive/<branch>`.
- Whether the old remote branch was deleted or did not exist.
- Whether the local branch was deleted or kept.
- Any warnings raised along the way (unpushed commits that got archived, a dirty working tree, a protected remote branch).
- The restore command, so the archive is actually usable: `git fetch origin && git switch -c <branch> origin/archive/<branch>`.

## Rules
- **Archive before deleting.** Step 2 must succeed before step 3 or 4 runs. If the archive push fails, delete nothing.
- **Never force-push an archive ref** without explicit user confirmation.
- Never archive `main`, `master`, or `develop` unless the user insists.
- Uncommitted changes are never part of the archive — warn, do not silently commit or stash them.

## Trigger phrases
- "archive this branch"
- "archive branch"
- "move to archive/* and delete original"
- "заархивируй ветку"
- "архивируй текущую ветку"
- "перенеси ветку в архив"
