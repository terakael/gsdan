#!/usr/bin/env bash
# implement.sh — dumb orchestrator for one phase of the nested delivery loop.
#
# Each ticket gets its own interactive tmux window running a fresh pi instance.
# The window closes automatically when the agent writes the ticket's summary
# (via the auto-exit.ts extension). Dan can watch and answer questions in each
# window; the outer loop (this script) waits by polling the summary file.
#
# Task-reorient and phase-reorient run headlessly (pi -p) since they are
# automated and do not need human interaction.
#
# Run from the repo root in a dedicated tmux window:
#   bash dan/skills/implement/implement.sh
#
# Override defaults via env:
#   MAX_ITERATIONS=30 bash dan/skills/implement/implement.sh
#   FLOW_DIR=my-flow  bash dan/skills/implement/implement.sh

set -uo pipefail

FLOW_DIR="${FLOW_DIR:-.flow}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
POLL_INTERVAL="${POLL_INTERVAL:-3}"   # seconds between summary-file polls
iteration=0

# --- sanity checks ---

if ! command -v pi &>/dev/null; then
  echo "ERROR: 'pi' not found in PATH. Install pi first."
  exit 1
fi

if ! command -v tmux &>/dev/null; then
  echo "ERROR: 'tmux' not found. implement.sh requires a running tmux session."
  exit 1
fi

if [ -z "${TMUX:-}" ]; then
  echo "ERROR: Not running inside a tmux session."
  echo "Start a tmux session and run this script from within it."
  exit 1
fi

# --- helpers ---

# Extract a top-level YAML-style field from a file.
# Usage: get_field "current_phase" ".flow/STATE.md"
get_field() {
  grep "^$1:" "$2" 2>/dev/null | head -1 | sed 's/^[^:]*:[[:space:]]*//'
}

# True if slug has a done-summary in this phase (file exists + status: done).
has_done_summary() {
  local slug="$1" phase="$2"
  local f="$FLOW_DIR/phases/$phase/summaries/$slug.md"
  [ -f "$f" ] && grep -q "^status: done" "$f"
}

# Print blocking-edge slugs from a ticket file.
# Expects a "## Blocking Edges" section with "- slug" list items.
blocking_edges() {
  awk '
    /^## Blocking[- ][Ee]dges/ { in_s=1; next }
    in_s && /^##/ { in_s=0 }
    in_s && /^ *- / { sub(/^ *- /, ""); print }
  ' "$1"
}

# Print the slug of the first runnable ticket, or nothing.
# Runnable = no done-summary AND every blocking-edge slug has a done-summary.
# Lowest numeric prefix wins (sort order).
find_runnable() {
  local phase="$1"
  local tickets_dir="$FLOW_DIR/phases/$phase/tickets"

  for f in $(ls "$tickets_dir"/*.md 2>/dev/null | sort); do
    local slug
    slug=$(basename "$f" .md)

    has_done_summary "$slug" "$phase" && continue

    local blocked=0
    while IFS= read -r edge; do
      [ -z "$edge" ] && continue
      if ! has_done_summary "$edge" "$phase"; then
        blocked=1
        break
      fi
    done < <(blocking_edges "$f")

    if [ "$blocked" -eq 0 ]; then
      echo "$slug"
      return
    fi
  done
}

# Read the phase status from milestone-spec.md's phase list.
# Phase-reorient updates the line for the current phase to include "done".
# Returns "done" if that line contains the word "done", otherwise "pending".
phase_status() {
  local phase="$1"
  if grep "$phase" "$FLOW_DIR/milestone-spec.md" 2>/dev/null | grep -qw "done"; then
    echo "done"
  else
    echo "pending"
  fi
}

# Write a failure summary when max_iterations is hit.
write_failure_summary() {
  local phase="$1" slug="$2"
  local dir="$FLOW_DIR/phases/$phase/summaries"
  mkdir -p "$dir"
  cat > "$dir/$slug.md" <<EOF
status: failed

## What was tried
Max iterations ($MAX_ITERATIONS) reached without completing phase $phase.

## Why it failed
Possible doom loop - the phase has not completed after $MAX_ITERATIONS ticket
iterations. Human investigation required.

## What the next iteration should try differently
Inspect all ticket summaries and phase-spec.md for stuck tickets. Consider
removing a failed summary to re-queue that ticket, or running phase-grilling
to replan the remaining work.
EOF
  echo "Wrote failure summary: $dir/$slug.md"
}

# Build the per-ticket prompt file and print its path.
# Combines a dynamic header (paths for this ticket) with the static instructions.
build_iter_prompt() {
  local phase="$1" slug="$2"
  local prompt_dir="$FLOW_DIR/.prompts"
  mkdir -p "$prompt_dir"
  local out="$prompt_dir/iter-${slug}.md"

  local prior_block=""
  local summary_path="$FLOW_DIR/phases/$phase/summaries/$slug.md"
  if [ -f "$summary_path" ]; then
    prior_block="- \`$summary_path\`
  Your prior attempt. Read it before starting: understand what failed and what
  to try differently. If there are uncommitted changes from the last attempt,
  decide whether to keep or reset them."
  fi

  cat > "$out" <<HEADER
You are implementing one ticket in the nested delivery loop.

Your ticket: \`$FLOW_DIR/phases/$phase/tickets/$slug.md\`

Read these files before starting work:

- \`$FLOW_DIR/milestone-spec.md\`
  The destination and module interfaces. Build with the grain of this vision.

- \`$FLOW_DIR/phases/$phase/phase-spec.md\`
  This phase's goal, scope, and done definition. Your ticket lives in this scope.

- \`$FLOW_DIR/CONTEXT.md\`
  Glossary and project-specific rules. Match its vocabulary throughout.

- \`$FLOW_DIR/adr/*.md\`
  Hard decisions already made. Check any that touch your area before writing code.

- \`$FLOW_DIR/phases/$phase/tickets/$slug.md\`
  Your task: acceptance criteria, blocking edges, constraints.

$prior_block

---

HEADER

  cat "$SKILL_DIR/iter-instructions.md" >> "$out"
  echo "$out"
}

# Launch one ticket's pi session in a tmux window and wait for it to finish.
# The auto-exit.ts extension exits pi automatically when the summary is written.
# Polls the summary file; if the window closes without a summary, treats as
# a pi crash and breaks (the next loop tick will retry the ticket).
run_ticket_iter() {
  local phase="$1" slug="$2" prompt_file="$3" summary_file="$4"

  local window_name="impl-${slug}"

  # Write a per-ticket launcher so we avoid quoting hell in the tmux command.
  local launcher="$FLOW_DIR/.prompts/launch-${slug}.sh"
  mkdir -p "$FLOW_DIR/.prompts"
  cat > "$launcher" <<LAUNCHER
#!/usr/bin/env bash
export FLOW_SUMMARY_FILE="$summary_file"
export FLOW_DIR="$FLOW_DIR"
exec pi -e "$SKILL_DIR/auto-exit.ts" -e "$SKILL_DIR/interface-gate.ts" --approve --no-session @"$prompt_file"
LAUNCHER
  chmod +x "$launcher"

  # Open a new tmux window for this iteration.
  tmux new-window -n "$window_name" "bash '$launcher'"

  echo "Waiting for $window_name to finish (summary: $summary_file)..."

  # Poll until the summary file is written or the window closes.
  while true; do
    if [ -f "$summary_file" ]; then
      sleep 2  # brief pause for agent_settled + ctx.shutdown() to fire
      break
    fi
    if ! tmux list-windows -F "#W" 2>/dev/null | grep -qFx "$window_name"; then
      echo "Window '$window_name' closed without writing a summary (pi crashed?)."
      echo "Loop will retry this ticket on the next iteration."
      break
    fi
    sleep "$POLL_INTERVAL"
  done

  # Close the window if still open (race: summary written before shutdown completes).
  tmux kill-window -t "$window_name" 2>/dev/null || true
}

# --- startup checks ---

if [ ! -f "$FLOW_DIR/STATE.md" ]; then
  echo "ERROR: $FLOW_DIR/STATE.md not found. Run phase-grilling first."
  exit 1
fi

CURRENT_STATUS=$(get_field "status" "$FLOW_DIR/STATE.md")
if [ "$CURRENT_STATUS" != "implementing" ]; then
  echo "ERROR: STATE.md status is '$CURRENT_STATUS', expected 'implementing'."
  echo "Run phase-grilling to set up the phase and set status to 'implementing'."
  exit 1
fi

PHASE=$(get_field "current_phase" "$FLOW_DIR/STATE.md")
if [ -z "$PHASE" ]; then
  echo "ERROR: current_phase is not set in STATE.md."
  exit 1
fi

if [ ! -f "$FLOW_DIR/milestone-spec.md" ]; then
  echo "ERROR: $FLOW_DIR/milestone-spec.md not found."
  exit 1
fi

echo "=== implement: phase=$PHASE, max_iterations=$MAX_ITERATIONS ==="

# --- main loop ---

while true; do

  # Step 1: find the next runnable ticket.
  TICKET=$(find_runnable "$PHASE")

  # Step 2: empty frontier.
  if [ -z "$TICKET" ]; then
    if [ "$(phase_status "$PHASE")" = "done" ]; then
      echo "Phase $PHASE is done. Exiting."
      exit 0
    fi

    # Phase not done yet — invoke phase-reorient headlessly, then re-check.
    echo "=== phase-reorient (headless) ==="
    cat <<PROMPT | pi -p --approve --no-session
You are running the phase-reorient step for phase $PHASE of the nested delivery loop.

Read these files before acting:

- \`$FLOW_DIR/STATE.md\`
- \`$FLOW_DIR/milestone-spec.md\`
- \`$FLOW_DIR/phases/$PHASE/phase-spec.md\`
- \`$FLOW_DIR/phases/$PHASE/summaries/*.md\`
- \`$FLOW_DIR/CONTEXT.md\`
- \`$FLOW_DIR/adr/*.md\`

Then run \`/phase-reorient\`.
PROMPT
    continue
  fi

  # Step 3: max_iterations cap — prevent doom loops.
  if [ "$iteration" -ge "$MAX_ITERATIONS" ]; then
    echo "Max iterations ($MAX_ITERATIONS) reached. Writing failure summary."
    write_failure_summary "$PHASE" "$TICKET"
    exit 1
  fi

  # Step 4: increment iteration counter.
  iteration=$((iteration + 1))
  echo ""
  echo "=== Iteration $iteration / $MAX_ITERATIONS: $TICKET ==="

  # Steps 5-6: build prompt and launch interactive pi in a tmux window.
  PROMPT_FILE=$(build_iter_prompt "$PHASE" "$TICKET")
  SUMMARY="$FLOW_DIR/phases/$PHASE/summaries/$TICKET.md"

  run_ticket_iter "$PHASE" "$TICKET" "$PROMPT_FILE" "$SUMMARY"

  # Step 7: check outcome and run task-reorient on success.
  if [ -f "$SUMMARY" ] && grep -q "^status: done" "$SUMMARY"; then
    echo "=== task-reorient: $TICKET (headless) ==="
    cat <<PROMPT | pi -p --approve --no-session
You are running the task-reorient step after completing ticket $TICKET in phase $PHASE.

Read these files before acting:

- \`$FLOW_DIR/STATE.md\`
  Current task and phase.

- \`$FLOW_DIR/phases/$PHASE/summaries/$TICKET.md\`
  What was just built. Primary input for this step.

- \`$FLOW_DIR/phases/$PHASE/phase-spec.md\`
  This phase's goal and done definition. The guardrail.

- \`$FLOW_DIR/phases/$PHASE/tickets/*.md\`
  All tickets in the phase.

- \`$FLOW_DIR/milestone-spec.md\`
  The destination and module interfaces.

- \`$FLOW_DIR/CONTEXT.md\`
- \`$FLOW_DIR/adr/*.md\`

Then run \`/task-reorient\`.
PROMPT
  else
    echo "Ticket $TICKET did not complete (failed, escalated, or pi crashed). Loop continues."
  fi

  # Loop back to step 1.

done
