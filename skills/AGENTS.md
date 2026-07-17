# skills

One SKILL.md per step in the nested delivery loop. Each skill is independently invokable by pi from the TUI. The SKILL.md is the operational surface: steps, reads, writes. The AGENTS.md captures why the skill exists and what it must not do.

## What makes something a skill

- A single concern: one input state to one output state in the delivery loop.
- A fixed position in the loop with a defined handoff on each side.
- A clean read/write contract against `.flow/` defined in `ARTIFACT-CONTRACT.md`.

Pi primitives invoked inside skills (`/tdd`, `/grilling`, `/codebase-design`, `/write-agents`) are building blocks, not loop steps. A skill orchestrates them; it does not replace them.

## Why independent SKILL.md files

A monolith would force every pi session to load every step's instructions regardless of which step it is running. Each skill is independently delegatable: different steps run in separate pi sessions, by separate agents, on separate context windows. Keeping them separate makes that delegation clean.
