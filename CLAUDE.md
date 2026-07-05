# CSS

This project uses the [agent-skills](https://github.com/addyosmani/agent-skills) engineering workflows (MIT, Addy Osmani — see `.claude/LICENSE-agent-skills`), installed as project-level skills.

## How to work in this repo

Start every task with the `using-agent-skills` meta-skill (`.claude/skills/using-agent-skills/SKILL.md`) — it maps the task to the right workflow. Optionally, add a SessionStart hook to `.claude/settings.json` to inject it automatically:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh\" || true" } ] }
    ]
  }
}
```

| Phase | Skills |
|-------|--------|
| Define | interview-me, idea-refine, spec-driven-development |
| Plan | planning-and-task-breakdown |
| Build | incremental-implementation, context-engineering, source-driven-development, doubt-driven-development, frontend-ui-engineering, api-and-interface-design |
| Verify | test-driven-development, browser-testing-with-devtools, debugging-and-error-recovery |
| Review | code-review-and-quality, code-simplification, security-and-hardening, performance-optimization |
| Ship | git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, observability-and-instrumentation, shipping-and-launch |

## Slash commands

`/spec` → `/plan` → `/build` (or `/build auto`) → `/test` → `/review` → `/code-simplify` → `/ship`, plus `/webperf` for performance audits.

## Layout

```
.claude/skills/     → 24 workflow skills (SKILL.md each)
.claude/agents/     → reviewer personas: code-reviewer, security-auditor, test-engineer, web-performance-auditor
.claude/commands/   → slash commands
.claude/hooks/      → session-start hook (injects the meta-skill)
references/         → checklists: testing, security, performance, accessibility, observability, definition-of-done, orchestration
```

## Non-negotiables (from the meta-skill)

- Surface assumptions before implementing anything non-trivial; stop and ask when confused rather than guessing.
- No code without a spec for non-trivial work — `/spec` first.
- Verify, don't assume: a task is done only when the Definition of Done (`references/definition-of-done.md`) passes — tests, no regressions, runtime-verified behavior.
- Enforce simplicity and scope discipline: touch only what the task requires.
