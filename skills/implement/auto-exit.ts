import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, statSync } from "node:fs";

// Auto-exit extension for the implement loop.
//
// When the per-iteration pi instance finishes its work (writes the summary
// file and the agent settles), this extension calls ctx.shutdown() so pi
// exits cleanly and the tmux window closes on its own.
//
// The summary file path is passed via the FLOW_SUMMARY_FILE env var, set by
// implement.sh before launching each pi instance.
//
// Escalation is handled for free: the agent asks Dan inline, Dan answers,
// the agent writes the summary, then agent_settled fires and pi exits.
// While Dan is answering, no summary file exists so pi stays open.
//
// Retry fix: on a retry of a previously-failed ticket, the old failed summary
// already exists when the session starts. We record the session-start time and
// only shut down if the summary was written AFTER this session began — so a
// stale file from a prior run doesn't trigger an immediate exit.

export default function (pi: ExtensionAPI) {
  let sessionStartTime: number | undefined;

  pi.on("session_start", async (event, _ctx) => {
    if (event.reason === "startup") {
      sessionStartTime = Date.now();
    }
  });

  pi.on("agent_settled", async (_event, ctx) => {
    const summaryFile = process.env.FLOW_SUMMARY_FILE;
    if (!summaryFile) return;
    if (!existsSync(summaryFile)) return;

    // Only exit if the summary was written during this session.
    // A file older than sessionStartTime is a prior failed attempt — leave it
    // for the agent to read and take a different path.
    //
    // Note: Date.now() is ms but some filesystems give coarser mtime granularity
    // (e.g. 1s). The only collision risk is a prior failed summary written in the
    // same coarse window as session start — vanishingly unlikely since a failed
    // summary is from an earlier iteration (seconds or more back). Fine for v1.
    if (sessionStartTime !== undefined) {
      const mtime = statSync(summaryFile).mtimeMs;
      if (mtime < sessionStartTime) return;
    }

    ctx.shutdown();
  });
}
