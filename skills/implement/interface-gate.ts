import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

// Interface-ownership gate for the implement loop.
//
// The human owns the module interfaces. An implement iteration must not record
// an interface decision on its own — it has to escalate and get sign-off. This
// extension turns that from a soft instruction into a hard block.
//
// It hooks tool_call and, whenever a write/edit touches an interface-ownership
// artifact, blocks until Dan approves in the tmux pane:
//   - any file under `<flow>/adr/`      → a new or changed ADR (an interface decision)
//   - `<flow>/milestone-spec.md`        → the frozen spine (should not change mid-phase)
//
// On approval the write proceeds. On rejection the write never happens and the
// agent is steered back into grilling instead of self-approving. This closes the
// hole where an agent wrote an ADR without the human ever seeing it.
//
// Not gated: CONTEXT.md (glossary updates via domain-modeling are legit and
// frequent), tickets, summaries, and all source code.
//
// Interaction with auto-exit: while blocked on ctx.ui.confirm the agent is not
// settled, so auto-exit does not fire — the "escalation stays open until the
// human answers" property holds. `pi:agent_blocked` tells coms we are waiting.
//
// FLOW_DIR (default `.flow`) is read from the environment, matching implement.sh.

const FLOW_DIR = (process.env.FLOW_DIR || ".flow").replace(/\/+$/, "");

// Escape a string for use inside a RegExp.
function rx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ADR_RE = new RegExp(`(^|/)${rx(FLOW_DIR)}/adr/[^/]+\\.md$`);
const SPEC_RE = new RegExp(`(^|/)${rx(FLOW_DIR)}/milestone-spec\\.md$`);

// Non-anchored variants for scanning inside a shell command string.
const ADR_IN_CMD = new RegExp(`${rx(FLOW_DIR)}/adr/[^/\\s]+\\.md`);
const SPEC_IN_CMD = new RegExp(`${rx(FLOW_DIR)}/milestone-spec\\.md`);

// A redirect (`>` / `>>`) whose target is the gated path. `\S*` absorbs any
// prefix like `./`, but a redirect to something else (e.g. `2>/dev/null`) does
// not match because /dev/null isn't the gated path.
const ADR_REDIRECT = new RegExp(`>>?\s*\S*${rx(FLOW_DIR)}/adr/[^/\s]+\.md`);
const SPEC_REDIRECT = new RegExp(`>>?\s*\S*${rx(FLOW_DIR)}/milestone-spec\.md`);

type Kind = "adr" | "spec" | null;

function classify(path: string): Kind {
  const p = path.trim();
  if (SPEC_RE.test(p)) return "spec";
  if (ADR_RE.test(p)) return "adr";
  return null;
}

// Best-effort detection of shell commands that write to a gated path
// (redirections, tee, cp, mv, sed -i). The agent normally uses the write/edit
// tools; this catches the obvious `cat > .flow/adr/...` style side-doors.
function classifyBash(command: string): Kind {
  // A gated path only matters if the command WRITES to it: a redirect whose
  // target is the path, or a mutating command (tee/cp/mv/sed) touching it.
  const mutates = /(^|\s)(tee|cp|mv|sed)\b/.test(command);
  if (SPEC_REDIRECT.test(command) || (mutates && SPEC_IN_CMD.test(command)))
    return "spec";
  if (ADR_REDIRECT.test(command) || (mutates && ADR_IN_CMD.test(command)))
    return "adr";
  return null;
}

function truncate(s: string, n = 1800): string {
  return s.length > n ? `${s.slice(0, n)}\n… (${s.length - n} more chars)` : s;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    let kind: Kind = null;
    let path = "";
    let preview = "";

    if (isToolCallEventType("write", event)) {
      path = event.input.path;
      kind = classify(path);
      preview = truncate(event.input.content ?? "");
    } else if (isToolCallEventType("edit", event)) {
      path = event.input.path;
      kind = classify(path);
      preview = truncate(
        (event.input.edits ?? [])
          .map((e) => `- replace:\n${e.oldText}\n+ with:\n${e.newText}`)
          .join("\n\n"),
      );
    } else if (isToolCallEventType("bash", event)) {
      kind = classifyBash(event.input.command);
      path = "(via shell command)";
      preview = truncate(event.input.command);
    }

    if (!kind) return;

    const heading =
      kind === "spec"
        ? "⚠️ Agent wants to change the FROZEN milestone-spec (interface spine)"
        : "⚠️ Agent wants to record an interface decision (ADR)";

    process.emit("pi:agent_blocked", true);
    let ok = false;
    try {
      ok = await ctx.ui.confirm(
        heading,
        `${path}\n\n${preview}\n\nApprove this interface decision?`,
      );
    } finally {
      process.emit("pi:agent_blocked", false);
    }

    if (ok) return; // let the write through

    const reason =
      kind === "spec"
        ? "Human rejected. milestone-spec.md is frozen mid-phase — do not edit it. " +
          "If the interface must change, record it as an ADR (which will be reviewed); " +
          "milestone-spec is updated at phase-reorient. Otherwise keep grilling or write a failed summary."
        : "Human rejected this interface decision. Do NOT record it and do NOT proceed as if approved. " +
          "Keep grilling to reach a decision the human approves, or write a failed summary explaining the open question.";

    return { block: true, reason };
  });
}
