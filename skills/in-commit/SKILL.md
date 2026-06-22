---
name: in-commit
description: Generate a conventional commit message with title and detailed description. Use when user says "commit message", "создай комит месседж", "напиши сообщение для коммита", "create commit message", or "сгенерируй комит".
---

# Skill: Generate Commit Message

## Purpose
Analyze current changes in the working tree (staged + unstaged), generate a well-structured commit message following the Conventional Commits specification, and immediately create the commit. No "text or commit?" question — just commit.

## Steps

1. **Gather context** (run all in parallel):
   - `git status` — see what files are changed
   - `git diff --staged` — see staged changes
   - `git diff` — see unstaged changes
   - `git log --oneline -5` — see recent commit style for consistency

2. **If no staged changes exist**, analyze unstaged changes instead and note which files should be staged.

3. **Analyze the changes**:
   - Identify the nature: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `build`, `ci`
   - Identify the scope (module, feature area, component)
   - Understand **WHY** the change was made and **what problem it solves** — not just WHAT changed. This is mandatory: every commit body must explain motivation.
   - If the motivation is **not obvious from the diff alone** (e.g. a refactor without a clearly visible bug, a config tweak whose trigger isn't in the diff, a small internal tweak with no public impact, no recent conversation context that explains the why), **stop and ask the developer** before generating the message:
     > Какую проблему решает это изменение? Зачем оно было сделано?
     Wait for the answer. **Never invent or guess motivation.**
   - Group related changes logically

4. **Generate the commit message** with two parts:

### Title (first line)
- Format: `<type>(<scope>): <short summary>`
- Max 72 characters
- Use imperative mood ("add", "fix", "change" — not "added", "fixes", "changed")
- Lowercase after the colon
- No period at the end
- Examples:
  - `feat(session): add mentee-only session counting endpoint`
  - `fix(auth): prevent token refresh race condition`
  - `refactor(room): extract level validation into utility`

### Description (body)
- Blank line after title
- Wrap at 72 characters
- **Always start with the motivation**: what problem this commit solves and why it was made. One short paragraph or an explicit `Why:` line. **Never omit this** — it is the whole point of the commit message.
- Then list **what** changed (bullet points for multiple items)
- Group by logical areas if touching multiple modules
- Do not describe HOW — the diff shows how
- Mention breaking changes with `BREAKING CHANGE:` prefix if applicable
- Reference related issues/tasks if known

5. **Print the generated message** so the user sees what's about to land:

```
<title>

<description>
```

6. **Commit immediately**:
   - Stage only the relevant changed files by name (NOT `git add -A` / `git add .`).
   - Create the commit using the generated message via HEREDOC:
     ```bash
     git commit -m "$(cat <<'EOF'
     <title>

     <description>
     EOF
     )"
     ```
   - Run `git status` to verify the working tree is clean.
   - Report the new commit hash and a one-line summary.

   Do **not** ask "закоммитить или только текст" — this skill always commits.

   The only reasons to abort or pause without committing:
   - **Motivation unclear** — stop, ask the developer (see step 3), wait for the answer, then continue. This is the one allowed user-question for this skill.
   - **Diff is empty** (nothing to commit) — say so and stop.
   - **Changes span multiple unrelated concerns** — print a warning, suggest splitting, and stop without committing.

## Rules
- **Every commit body MUST contain the motivation** — what problem is being solved and why. No motivation, no commit. If you can't derive the motivation from the diff + recent conversation context with high confidence, ASK the developer first. Never invent or guess.
- NEVER add `Co-Authored-By` — that's the user's choice
- If changes span multiple unrelated concerns, suggest splitting into separate commits
- Match the language of the codebase commit history (if recent commits are in English, write in English)
- If the diff is empty (no changes), say so and stop
- When committing, stage only the relevant changed files by name — do NOT use `git add -A` or `git add .`

## Output Format
Print the commit message inside a single fenced code block before committing so the user sees what landed. After the commit, briefly state: the new commit hash, type/scope reasoning, and `git status` confirmation that the tree is clean.

## Trigger phrases
- "commit message"
- "создай комит месседж"
- "напиши сообщение для коммита"
- "create commit message"
- "сгенерируй комит"
- "generate commit message"
