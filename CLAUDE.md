@AGENTS.md

# CLAUDE.md

Use `AGENTS.md` as the source of truth for project rules. If this file and `AGENTS.md` disagree about project behavior, follow `AGENTS.md`.

Claude Code specific guidance in this file takes precedence for Claude Code behavior only.

## Claude Code Notes

- Respond in Japanese unless the user explicitly requests another language.
- Use PowerShell syntax for shell examples and commands in this repository.
- Remember PowerShell differences such as `$null`, `$env:NAME`, and `;` command separators.
- Prefer running Git commands from the repository root without relying on `cd` inside a command string.
- Use `/memory` to confirm that this file and the imported `AGENTS.md` are loaded when validating setup.
