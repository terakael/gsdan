import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

// AGENTS documentation fidelity gate for the implement loop.
//
// This is a "did the step happen" meta-gate: it does not inspect the quality
// of the fidelity review, only that one ran. The substance lives in the
// reviewer subagent, not here. The same pattern can be reused for any "did
// the step happen" enforcement: swap the attestation line and the block reason.
//
// When the agent writes a done-summary, this gate checks whether the content
// includes an "AGENTS fidelity review:" attestation line. If it does not,
// the write is blocked and the agent is steered to run the fidelity review
// first and record the outcome.
//
// A failed summary (status: failed) is not gated — fidelity review only
// makes sense when code actually landed.
//
// Why no gate on AGENTS.md writes themselves: the interface decision is already
// gated upstream by interface-gate.ts. An AGENTS.md file only documents an
// already-approved decision — it is distillation, not a new decision. The
// implementer writes AGENTS.md freely, like it writes tickets and CONTEXT.md.
//
// The summary file path comes from FLOW_SUMMARY_FILE, set by implement.sh
// before launching each pi instance. If the env var is absent, the gate is
// a no-op so it does not interfere with non-implement sessions.
//
// FLOW_DIR (default `.flow`) is read from the environment, matching implement.sh.

const FLOW_SUMMARY_FILE = process.env.FLOW_SUMMARY_FILE ?? "";
const _FLOW_DIR = (process.env.FLOW_DIR || ".flow").replace(/\/+$/, "");

// Normalise a path for comparison: strip leading `./`.
function norm(p: string): string {
  return p.trim().replace(/^\.\//, "");
}

function isSummaryPath(path: string): boolean {
  if (!FLOW_SUMMARY_FILE) return false;
  return norm(path) === norm(FLOW_SUMMARY_FILE);
}

// Best-effort detection of shell commands that write to the summary file
// (redirections, tee, cp, mv). The agent normally uses the write/edit tools;
// this catches the obvious `cat > summary.md` style side-doors.
function isSummaryBash(command: string): boolean {
  if (!FLOW_SUMMARY_FILE) return false;
  const target = norm(FLOW_SUMMARY_FILE);
  const mutates = /(^|\s)(tee|cp|mv)\b/.test(command);
  const redirects = new RegExp(`>>?\\s*\\S*${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(command);
  return redirects || (mutates && command.includes(target));
}

function isDoneSummary(content: string): boolean {
  return /^status:\s*done/im.test(content);
}

function hasAttestation(content: string): boolean {
  // Required attestation line: "AGENTS fidelity review: <outcome>"
  return /^AGENTS fidelity review:/im.test(content);
}

function truncate(s: string, n = 1800): string {
  return s.length > n ? `${s.slice(0, n)}\n… (${s.length - n} more chars)` : s;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    let content = "";
    let isTarget = false;

    if (isToolCallEventType("write", event)) {
      isTarget = isSummaryPath(event.input.path);
      content = event.input.content ?? "";
    } else if (isToolCallEventType("edit", event)) {
      // For edits: check the combined newText of all edits. If the agent is
      // adding `status: done` via an edit, it must also add the attestation
      // in the same edit. If the existing file already has the attestation
      // and this edit changes something else, the combined newText will not
      // contain `status: done` and we won't block — correct behaviour.
      isTarget = isSummaryPath(event.input.path);
      content = (event.input.edits ?? []).map((e) => e.newText).join("\n");
    } else if (isToolCallEventType("bash", event)) {
      isTarget = isSummaryBash(event.input.command);
      content = event.input.command;
    }

    if (!isTarget) return;
    if (!isDoneSummary(content)) return; // only gate done summaries
    if (hasAttestation(content)) return; // attestation present — let through

    const preview = truncate(content);

    process.emit("pi:agent_blocked", true);
    let ok = false;
    try {
      ok = await ctx.ui.confirm(
        "⚠️ Done summary is missing the AGENTS fidelity review attestation",
        `${FLOW_SUMMARY_FILE}\n\n${preview}\n\n` +
          `The summary does not include an "AGENTS fidelity review:" line.\n\n` +
          `Run the fidelity review first:\n` +
          `- Spawn a fresh reviewer subagent with the code diff and the AGENTS.md\n` +
          `  files for all directories touched by this ticket.\n` +
          `- Have it check: does the code do what the why claims? Is any decision\n` +
          `  in the diff unexplained? Is any stated rationale invented or\n` +
          `  contradicted by the code?\n` +
          `- Record the outcome in the done-summary as:\n` +
          `  "AGENTS fidelity review: <pass|fail|pass-with-notes> — <brief finding>"\n\n` +
          `Proceed without the fidelity review?`,
      );
    } finally {
      process.emit("pi:agent_blocked", false);
    }

    if (ok) return; // human approved skipping — let through

    return {
      block: true,
      reason:
        "Done summary blocked: AGENTS fidelity review attestation is missing. " +
        "Spawn a fresh reviewer subagent with the code diff and the AGENTS.md files " +
        "for touched directories. Have it verify AGENTS content against code. " +
        'Then add "AGENTS fidelity review: <pass|fail|pass-with-notes> — <finding>" ' +
        "to the done-summary before writing it.",
    };
  });
}
