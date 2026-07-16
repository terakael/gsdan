---
name: task-reorient
description: "Post-ticket sweep: harvest decisions from the just-completed ticket's done-summary, reshape remaining tickets and phase-spec if the concrete findings warrant it, then advance STATE.md to the next runnable ticket."
---

Harvest concrete findings into CONTEXT.md and ADRs. Reshape remaining work only where the just-completed ticket's outcome makes it necessary. Write STATE.md so the implement loop can continue.

## Pre-conditions

- `.flow/STATE.md` exists with `status: implementing` and `current_task` set to the just-completed ticket slug.
- A done-summary exists at `.flow/phases/<phase>/summaries/<slug>.md` with `status: done`.

## Context

Read these files before starting (the loop's prompt pre-loads most of them; read any that are missing):

| File | What it provides |
|---|---|
| `.flow/STATE.md` | `current_task` (just-completed slug), `current_phase` |
| `.flow/phases/<phase>/summaries/<slug>.md` | Done-summary for the just-completed ticket — your primary input |
| `.flow/phases/<phase>/tickets/*.md` | All tickets in the phase |
| `.flow/phases/<phase>/phase-spec.md` | This phase's goal, scope, and done definition — the guardrail |
| `.flow/milestone-spec.md` | The destination and module interfaces |
| `.flow/CONTEXT.md` | Glossary and rules |
| `.flow/adr/*.md` | Relevant hard decisions |

## Steps

### 1. Identify the just-completed ticket

Read `current_task` from STATE.md. Read its done-summary from `summaries/`. This is your primary input for everything below.

Done-summaries are written with two readers in mind: the next implement iteration and task-reorient. The "Key decisions" section is harvest-ready - treat it as your primary source for step 2.

### 2. Harvest decisions

Read the done-summary's "Key decisions" section. For each decision:

- Already in CONTEXT.md or an ADR - skip it. This is a sweep, not new thinking.
- New domain term or rule - add it to CONTEXT.md via `/domain-modeling`.
- Meets ADR criteria (hard to reverse, surprising without context, real trade-off) - open an ADR via `/domain-modeling`.

Keep this tight. Most decisions will already be captured - the escalation mechanic in implement ensures it. This is just the closing sweep.

### 3. Reshape remaining work

Find all tickets in the phase without a done-summary. If there are none (the last ticket just completed), skip this step.

Ask yourself: **what did the just-completed ticket's concrete outcome reveal about the remaining work?** React only to what actually happened. Not to what might be affected. Not to cosmetic improvements. Concrete outcome is the bar.

**Triggers to update a ticket:**

- Acceptance criteria or constraints that are now wrong given what actually landed.
- A blocking edge that was missed or one that no longer applies. Blocking edges are load-bearing - the frontier computation depends on them being correct (see ARTIFACT-CONTRACT.md).
- A ticket that is now fully redundant, or that needs splitting to stay coherent.

When you rewrite, update the ticket file in place. For splits: add new tickets with the
next available prefix and correct blocking edges. Existing prefixes stay as-is - the
loop uses the frontier rule (ARTIFACT-CONTRACT.md), not prefix order.

**When rewriting or splitting a ticket**, carry all fields through to every resulting
ticket (see ticket format in ARTIFACT-CONTRACT.md). For splits: assign the next
available prefix and set correct blocking edges. Existing prefixes stay as-is - the
loop uses the frontier rule (ARTIFACT-CONTRACT.md), not prefix order.

**Triggers to update phase-spec.md:**

If the findings change how the remaining phase work gets done (scope, approach, details of the done definition), update phase-spec.md. The phase goal and premise stay intact - only the description of remaining work changes.

**Not triggers:** The bar is concrete outcome. A finding must directly contradict or
invalidate a remaining ticket's acceptance criteria, blocking edges, or scope. A different
possible sequencing, a cleanup opportunity, a speculative dependency - none of these
clear that bar. Phase goal, premise, and downstream phases belong to phase-reorient.

### 4. Drift check [If milestone-spec has typed zone fields]

If `milestone-spec.md` has typed zone fields (establishing-path milestone), check:

- Did the summary correctly restate zone, allowed deps, forbidden move?
- Pure boundary attestation clean? `no` or missing on a port/shell task = missed escalation.
- Do pure-module tests run with zero real infra?
- Did any adapter test assert domain policy rather than translation/boundary behavior?
- If a port was introduced: do shared contract tests exist and pass for both adapters?

Fail → update CONTEXT.md or ADR. Serious enough to reshape tickets → apply step 3 triggers.

No typed zone fields → skip.

### 5. Update STATE.md

Compute the next runnable ticket using the frontier rule from ARTIFACT-CONTRACT.md: runnable = no done-summary AND all blocking-edge slugs have done-summaries; pick the lowest-prefix one.

Write STATE.md:

```
current_phase: <unchanged>
current_task: <next-runnable-slug>    # or "none" if no runnable tickets remain
status: implementing
```

`current_phase` and `status` stay unchanged. Only `current_task` advances.

When you write `current_task: none`, the loop re-globs on its next iteration, finds no runnable tickets, and fires `phase-reorient`.

## Reads / Writes

**Reads:** STATE.md, the just-completed ticket's done-summary, all tickets in the phase, phase-spec.md, milestone-spec.md, CONTEXT.md, relevant ADRs.

**Writes:**

| File | Condition |
|---|---|
| `.flow/CONTEXT.md` | New entries via `/domain-modeling` |
| `.flow/adr/NNNN-<slug>.md` | If a decision meets ADR criteria |
| `.flow/phases/<phase>/tickets/*.md` | Only when a rewrite trigger fires |
| `.flow/phases/<phase>/phase-spec.md` | Only when concrete findings change how remaining work gets done |
| `.flow/STATE.md` | Always — `current_task` advanced |

Stop at the phase boundary: milestone-spec.md and the phase goal are phase-reorient's territory.
