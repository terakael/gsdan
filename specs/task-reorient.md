# Spec: `task-reorient`

Step 4 of the nested delivery loop. A lightweight sweep that runs after every successfully-completed ticket - including the last one in a phase. It harvests decisions from the done-summary into the project's durable artifacts, checks whether the remaining tickets still make sense in light of what was just built, and advances STATE.md to the next ticket. Then the loop re-globs and continues.

Two rules define its boundary - not how much it can change, but what triggers it and what's off-limits:

- **Trigger:** react only to concrete findings from the just-completed task. Something it actually revealed. Not speculation, not "I'd organise this more nicely."
- **Ceiling:** the phase goal and premise stay intact. task-reorient reshapes *how* the remaining phase gets done - scope, tickets, phase-spec details - but never changes *why* the phase exists. A broken phase goal is escalation (handled inside implement) or phase-reorient territory.

Within those two rules, it can change as much as the findings warrant: update phase-spec.md, rewrite multiple tickets, add new ones, remove redundant ones. The boundary is the trigger and the ceiling, not the quantity.

Runs as a **fresh pi instance** - same principle as every implement iteration. Its context comes entirely from disk.

---

## Invocation

The loop invokes task-reorient as a fresh `pi` instance after every successful ticket:

```
loop:
  1. Glob tickets, find first runnable ticket (per ARTIFACT-CONTRACT.md frontier rule)
  2. If found: implement → review loop → task-reorient → back to step 1
  3. If none found: invoke phase-reorient → exit 0
```

"Successful" means the implement iteration committed and wrote a `status: done` summary. task-reorient runs even when the just-completed ticket is the last one in the phase. It sets `current_task: none`, the loop re-globs on step 1, finds no runnable tickets, and fires phase-reorient.

The loop's prompt for task-reorient lives at `.flow/.prompts/task-reorient-prompt.md` alongside `implement.sh`.

---

## Context assembly

task-reorient assembles its context from disk. Read these files before starting:

| File | What it provides |
|---|---|
| `.flow/STATE.md` | `current_task` — the just-completed ticket slug; `current_phase` — the active phase |
| `.flow/phases/<phase>/summaries/<slug>.md` | The done-summary for the just-completed ticket — the primary input for this skill |
| `.flow/phases/<phase>/tickets/*.md` | All tickets in the phase — needed to check what remains and update blocking edges |
| `.flow/phases/<phase>/phase-spec.md` | This phase's goal, scope, and done definition — the guardrail against phase-level re-planning |
| `.flow/milestone-spec.md` | The destination and module interfaces — needed to check remaining tickets still align with the vision |
| `.flow/CONTEXT.md` | The glossary and rules — read before harvesting, so you don't re-add things already there |
| `.flow/adr/*.md` | Hard decisions — read relevant ones before opening new ADRs |

---

## Step-by-step

### 1. Identify the just-completed ticket

Read `current_task` from STATE.md. Read that ticket's done-summary from `summaries/`. This is your primary input for everything that follows.

Note: done-summaries are written to serve two readers — the next implement iteration and this task-reorient instance. The "Key decisions" section in particular is written to be harvest-ready by a fresh agent. See `implement.md` summary format for the full contract.

### 2. Harvest decisions

Read through the done-summary's "Key decisions" section. For each decision:
- If it's already captured in CONTEXT.md or an ADR — skip it. This is a sweep, not new thinking.
- If it's a new domain term or rule — add it to CONTEXT.md via `/domain-modeling`.
- If it meets the ADR criteria (hard to reverse, surprising without context, real trade-off) — open an ADR via `/domain-modeling`.

Keep this step tight. Most decisions will already be captured; the escalation mechanic in implement ensures that. This is just the closing sweep.

### 3. Reshape remaining work

Find all tickets in the phase that don't yet have a done-summary. If there are none (last ticket just completed), skip this step.

Ask: **what did the just-completed task's concrete outcome reveal about the remaining work?** React only to what actually happened. Not to what might be affected. Not to cosmetic improvements. **Concrete outcome, not speculation** is the bar.

**Triggers for updating tickets:**

1. **Invalidated acceptance criteria or constraints.** The interface, API, or behaviour that landed is different enough from what a remaining ticket assumed that its criteria or constraints are now wrong or contradictory.

2. **Blocking-edge correction.** The completed work revealed a dependency that wasn't captured, or removed one that no longer applies. Blocking edges are load-bearing — the frontier computation depends on them being correct.

3. **Clearly redundant or needs splitting.** The completed work made a remaining ticket fully redundant, or revealed it needs to be two tickets to stay coherent.

**When rewriting or splitting a ticket**, update the ticket file in place and carry all
fields through to every resulting ticket (see ticket format in ARTIFACT-CONTRACT.md).
For splits: assign the next available prefix and set correct blocking edges. Existing
prefixes stay as-is — the loop uses the frontier rule (ARTIFACT-CONTRACT.md), not
prefix order.

**Triggers for updating phase-spec.md:**

If the concrete findings change *how the remaining phase work gets done* — scope, approach, done definition — update phase-spec.md to reflect it. The phase goal and premise stay intact; only the description of the remaining work changes. Examples: an interface landed simpler than expected and the phase can now skip a planned complexity; a module turned out to have a different shape and the phase-spec's approach section needs correcting.

Don't touch phase-spec.md for speculative or cosmetic reasons. And don't rewrite the goal or premise — if the findings break those, that's escalation or phase-reorient.

**Leave everything else alone.** "This could be organised more nicely," "I'd sequence these differently," "this might be affected" — not triggers. Anything that touches the phase goal/premise or downstream phases belongs to phase-reorient.

### 4. Drift check [If milestone-spec has typed zone fields]

If `milestone-spec.md` has typed zone fields (establishing-path milestone), run these checks against the just-completed task's summary:

- Did the summary correctly restate the module's zone, allowed deps, and forbidden move?
- Is the pure boundary attestation clean? If it says `no` or is missing on a port/shell task, that's a missed escalation — flag it.
- Do pure-module tests run with zero real infrastructure? If a pure-zone test requires db, network, env vars, or sockets, the boundary is in the wrong place.
- Did any adapter test assert domain policy rather than translation/boundary behavior? If so, business logic has leaked into the adapter.
- If this task introduced or first wired a port: do shared contract tests exist and pass for both adapters?

If a check fails, update CONTEXT.md or open an ADR. If serious enough to reshape remaining tickets, apply step 3's rewrite triggers.

If `milestone-spec.md` has no typed zone fields (within-architecture milestone), skip this step.

### 5. Update STATE.md

Compute the next runnable ticket using the frontier rule from ARTIFACT-CONTRACT.md (runnable = no done-summary + all blocking-edge slugs have done-summaries; pick lowest prefix). 

Write STATE.md:

```
current_phase: <unchanged>
current_task: <next-runnable-slug>    # or "none" if no runnable tickets remain
status: implementing
```

`status` stays `implementing` — the loop is still running. `current_phase` is unchanged. Only `current_task` advances.

---

## Reads / Writes

**Reads:**
- `.flow/STATE.md`
- `.flow/phases/<phase>/summaries/<just-completed-slug>.md`
- `.flow/phases/<phase>/tickets/*.md`
- `.flow/phases/<phase>/phase-spec.md`
- `.flow/milestone-spec.md`
- `.flow/CONTEXT.md`
- `.flow/adr/*.md` (relevant)

**Writes:**

| File | Notes |
|---|---|
| `.flow/CONTEXT.md` | New glossary entries or rules harvested from done-summary |
| `.flow/adr/NNNN-<slug>.md` | New ADR if a decision meets the criteria |
| `.flow/phases/<phase>/tickets/*.md` | Updated or new tickets — only when a rewrite trigger fires |
| `.flow/phases/<phase>/phase-spec.md` | Updated when concrete findings change how remaining work gets done — never the goal/premise |
| `.flow/STATE.md` | `current_task` advanced to next runnable slug (or `none`) |

Does **not** write:
- `milestone-spec.md` — phase-reorient and milestone-grilling own this
- Summaries — those belong to the implement iteration

---

## STATE.md transition

| Field | Before | After |
|---|---|---|
| `current_phase` | `NN-<name>` | unchanged |
| `current_task` | `NN-<slug>` (just completed) | next runnable slug, or `none` |
| `status` | `implementing` | `implementing` |

When `current_task` is set to `none`, the loop's next glob finds no runnable tickets (all have done-summaries) and fires phase-reorient.

---

## Out of scope

**`milestone-spec.md` writes.** This skill never touches it. Downstream implications stay captured in CONTEXT.md or ADRs and are applied by phase-reorient at the phase boundary.

**`milestone-spec.md` writes.** This skill never touches it. Downstream implications stay in CONTEXT.md or ADRs until phase-reorient applies them at the phase boundary.

**Phase-goal or premise changes.** task-reorient can reshape how the remaining phase gets done but never why it exists. If a concrete finding breaks the phase premise, that's escalation (handled inside implement via inline grilling) - not task-reorient.

**Speculative changes.** Rewrite only on concrete outcomes of the just-completed task. "This might be affected" is not a trigger.

---

## vs. phase-reorient

Both skills can touch `phase-spec.md` and `tickets/`. The difference is input scope and authority:

| | task-reorient | phase-reorient |
|---|---|---|
| **Runs** | after each task | at phase end |
| **Input** | one task's done-summary | all tasks' summaries, holistic |
| **Can write** | phase-spec, tickets, CONTEXT.md, ADRs, STATE.md | all of the above + milestone-spec.md |
| **Phase goal** | never changes it | does not change the completed phase's goal; mid-phase goal breakage is escalation. Adjusts downstream phase stubs in milestone-spec.md (future phases' scope/intent) |
| **Status transitions** | none | marks phase done, next phase active |

If task-reorient and phase-reorient both update phase-spec.md, that's fine — each update is grounded in its own input (one task vs. the whole phase). phase-reorient's update is the more authoritative one since it has the full picture.
