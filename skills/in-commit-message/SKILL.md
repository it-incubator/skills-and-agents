---
name: commit-message
description: Generate a conventional commit message with title and detailed description. Use when user says "commit message", "создай комит месседж", "напиши сообщение для коммита", "create commit message", or "сгенерируй комит".
---

# Skill: Generate Commit Message

## Purpose
Analyze current changes in the working tree (staged + unstaged) and generate a well-structured commit message following the Conventional Commits specification. Present the message and ask the user whether to commit or just keep the text.

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
   - Understand WHY the change was made, not just WHAT changed
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
- Explain **what** changed and **why** (not how — the diff shows how)
- Use bullet points for multiple changes
- Group by logical areas if touching multiple modules
- Mention breaking changes with `BREAKING CHANGE:` prefix if applicable
- Reference related issues/tasks if known

5. **Present the result** in a copyable format:

```
<title>

<description>
```

6. **Ask the user** what to do next using AskUserQuestion:
   - "Закоммитить" — stage all relevant files and create the commit with the generated message (use HEREDOC for the message). After committing, run `git status` to verify.
   - "Только текст" — do nothing more, the user will copy the message themselves.

## Rules
- NEVER add `Co-Authored-By` — that's the user's choice
- If changes span multiple unrelated concerns, suggest splitting into separate commits
- Match the language of the codebase commit history (if recent commits are in English, write in English)
- If the diff is empty (no changes), say so and stop
- When committing, stage only the relevant changed files by name — do NOT use `git add -A` or `git add .`

## Output Format
Present the commit message inside a single fenced code block so the user can copy it easily. After the code block, briefly explain the reasoning behind the chosen type and scope.

## Trigger phrases
- "commit message"
- "создай комит месседж"
- "напиши сообщение для коммита"
- "create commit message"
- "сгенерируй комит"
- "generate commit message"
