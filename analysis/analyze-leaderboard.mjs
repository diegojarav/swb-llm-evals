#!/usr/bin/env node
// Reads the two public boards (reasoning eval + latency) and prints what the
// numbers can and cannot support: an interval next to every accuracy, how many
// independent items sit behind it, which items separate providers, and where
// the two boards rank providers differently.
//
// Read-only: two GET requests to public endpoints. No dependencies (Node 22+).
//
//   node analyze-leaderboard.mjs                 # production, Markdown report
//   node analyze-leaderboard.mjs --json          # same analysis as JSON
//   node analyze-leaderboard.mjs --base http://localhost:3000
//   node analyze-leaderboard.mjs --eval eval.json --arena arena.json   # saved responses

import { readFile } from "node:fs/promises";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? fallback : (args[i + 1] ?? true);
};
const BASE = String(flag("base", "https://www.saharaworldbusiness.com")).replace(/\/$/, "");
const AS_JSON = args.includes("--json");
/** Below this many runs the site itself shows "not enough data". */
const MIN_RUNS = 3;
const Z95 = 1.959964;

// ---------- statistics ----------

/** Wilson score interval for k successes out of n (95%). Behaves at 0% and 100%. */
export function wilson(k, n, z = Z95) {
    if (n === 0) return { lo: 0, hi: 1 };
    const p = k / n;
    const denom = 1 + (z * z) / n;
    const centre = (p + (z * z) / (2 * n)) / denom;
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
    return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

/** A two-sided distribution-free 95% interval for a P90 needs at least this
 *  many samples (0.9^n + 0.1^n must be below 0.05). */
const MIN_SAMPLES_FOR_P90 = 29;

const pct = (x, d = 1) => (x == null ? "n/a" : `${(x * 100).toFixed(d)}%`);
const num = (x, d = 0) => (x == null ? "n/a" : Number(x).toFixed(d));

// ---------- input ----------

async function load(kind) {
    const file = flag(kind);
    if (typeof file === "string") return JSON.parse(await readFile(file, "utf8"));
    const url = `${BASE}/api/${kind}/leaderboard?t=${Date.now()}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return res.json();
}

// ---------- analysis ----------

function analyseEval(board) {
    const providers = (board.entries ?? []).map((e) => {
        const tasks = e.taskBreakdown ?? [];
        const attempts = tasks.reduce((s, t) => s + (t.attempts ?? 0), 0);
        const passes = tasks.reduce((s, t) => s + (t.passes ?? 0), 0);
        // The honest sample: items, not answers. An item counts as passed only
        // if the provider got it right every time it was asked.
        const itemsAsked = tasks.filter((t) => (t.attempts ?? 0) > 0).length;
        const itemsAlwaysPassed = tasks.filter((t) => (t.attempts ?? 0) > 0 && t.passes === t.attempts).length;
        return {
            provider: e.provider,
            model: e.model,
            runs: e.runs ?? 0,
            sufficient: e.status === "ok" && (e.runs ?? 0) >= MIN_RUNS,
            attempts,
            passes,
            accuracy: attempts ? passes / attempts : null,
            wilson: wilson(passes, attempts),
            itemsAsked,
            itemsAlwaysPassed,
            itemWilson: wilson(itemsAlwaysPassed, itemsAsked),
            truncated: e.tasksTruncated ?? null,
            reasoningShare: e.reasoningOverheadPct == null ? null : e.reasoningOverheadPct / 100,
            avgTimeMs: e.avgTimeToAnswerMs ?? null,
            costPer1000Correct: e.costPerCorrectUsd == null ? null : e.costPerCorrectUsd * 1000,
            tasks: Object.fromEntries(tasks.map((t) => [t.taskId, { passes: t.passes, attempts: t.attempts }])),
        };
    });
    const taskIds = [...new Set(providers.flatMap((p) => Object.keys(p.tasks)))];
    // An item separates providers only if someone fails it at least once.
    const items = taskIds.map((id) => {
        const rows = providers.filter((p) => p.sufficient && p.tasks[id]);
        const failing = rows.filter((p) => p.tasks[id].passes < p.tasks[id].attempts).map((p) => p.provider);
        return { taskId: id, failingProviders: failing, discriminates: failing.length > 0 && failing.length < rows.length };
    });
    const measured = providers.filter((p) => p.sufficient);
    return {
        updatedAt: board.updatedAt ?? null,
        windowDays: board.windowDays ?? null,
        methodVersion: board.method?.methodVersion ?? null,
        providers,
        items,
        independentItems: taskIds.length,
        saturated: measured.length > 0 && measured.every((p) => p.accuracy === 1),
        discriminatingItems: items.filter((i) => i.discriminates).map((i) => i.taskId),
    };
}

function analyseArena(board) {
    const providers = (board.entries ?? []).map((e) => {
        const n = e.samples ?? 0;
        const ok = e.successRate == null ? null : Math.round((e.successRate / 100) * n);
        return {
            provider: e.provider,
            model: e.model,
            samples: n,
            successes: ok,
            successWilson: ok == null ? null : wilson(ok, n),
            ttftMs: e.ttftMs ?? null,
            ttftP90Ms: e.ttftP90Ms ?? null,
            totalMs: e.totalMs ?? null,
            totalP90Ms: e.totalP90Ms ?? null,
            tokensPerSec: e.tokensPerSec ?? null,
            // The ping switches thinking off only for models that have a switch.
            // null = the API did not say (response from before the field existed).
            thinkingOff: typeof e.thinkingOff === "boolean" ? e.thinkingOff : null,
            // Pings in the window that stopped at the output-token cap. The time
            // of such a ping is when the tokens ran out, not a complete answer.
            // null = the API did not say (response from before the field existed).
            truncatedPings: typeof e.truncatedPings === "number" ? e.truncatedPings : null,
            // A P90 is set by the slowest tenth of the samples: with 28 samples
            // that is about 3 observations, so it moves a lot from week to week.
            samplesBehindP90: Math.max(0, Math.round(n * 0.1)),
            p90HasInterval: n >= MIN_SAMPLES_FOR_P90,
        };
    });
    return {
        updatedAt: board.updatedAt ?? null,
        windowDays: board.windowDays ?? null,
        methodVersion: board.method?.methodVersion ?? null,
        maxOutputTokens: board.method?.maxOutputTokens ?? null,
        providers,
    };
}

const rankBy = (rows, key) =>
    rows.filter((r) => r[key] != null).sort((a, b) => a[key] - b[key]).map((r) => r.provider);

/** Where "fastest" depends on which clock you read. */
function crossBoard(evalA, arenaA) {
    const byFirstToken = rankBy(arenaA.providers, "ttftMs");
    const byShortAnswer = rankBy(arenaA.providers, "totalMs");
    const byFullAnswer = rankBy(evalA.providers.filter((p) => p.sufficient), "avgTimeMs");
    const notes = [];
    if (byFirstToken[0] && byShortAnswer[0] && byFirstToken[0] !== byShortAnswer[0]) {
        notes.push(
            `First token: ${byFirstToken[0]} leads. Complete short answer: ${byShortAnswer[0]} leads. ` +
                "A badge that says \"fastest\" has to say which of the two it means."
        );
    }
    if (byFirstToken[0] && byFullAnswer.length && byFullAnswer[byFullAnswer.length - 1] === byFirstToken[0]) {
        notes.push(
            `${byFirstToken[0]} is first to the first token (thinking off, short answer) and last to a ` +
                "complete answer in the reasoning eval (thinking on). Both are real; they are different clocks."
        );
    }
    // The board's badge goes to the lowest complete-short-answer time, and only
    // if that provider had no ping cut off at the token cap. Say when it cannot.
    const shortLeader = arenaA.providers.find((p) => p.provider === byShortAnswer[0]);
    if (shortLeader && shortLeader.truncatedPings == null) {
        notes.push(
            `${shortLeader.provider} leads the complete short answer, but this response does not say how many of its pings were cut off by the token cap, ` +
                "so the time may be the time to run out of tokens, not to a complete answer."
        );
    } else if (shortLeader && shortLeader.truncatedPings > 0) {
        notes.push(
            `${shortLeader.provider} leads the complete short answer, but ${shortLeader.truncatedPings} of its ${shortLeader.samples} pings were cut off by the token cap: ` +
                "its time includes them, and the board gives no badge."
        );
    }
    const leader = arenaA.providers.find((p) => p.provider === byFirstToken[0]);
    const others = arenaA.providers.filter((p) => p.provider !== byFirstToken[0]);
    if (leader?.thinkingOff === true && others.some((p) => p.thinkingOff === false)) {
        notes.push(
            `${leader.provider} was pinged with thinking switched off; ` +
                `${others.filter((p) => p.thinkingOff === false).map((p) => p.provider).join(", ")} still think before their first visible token. ` +
                "The first-token column is not like for like."
        );
    }
    return { byFirstToken, byShortAnswer, byFullAnswer, notes };
}

// ---------- report ----------

function markdown(a) {
    const L = [];
    const e = a.eval;
    L.push(`# Eval boards: what the numbers support`);
    L.push("");
    L.push(`Source: ${a.source}. Reasoning board updated ${e.updatedAt ?? "never"}, latency board updated ${a.arena.updatedAt ?? "never"}.`);
    L.push("");
    L.push("## Reasoning eval");
    L.push("");
    L.push("| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |");
    L.push("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const p of e.providers) {
        L.push(
            `| ${p.provider}${p.sufficient ? "" : " (not enough runs)"} | ${p.runs} | ${p.passes}/${p.attempts} | ${pct(p.accuracy)} | ` +
                `${pct(p.wilson.lo)} to ${pct(p.wilson.hi)} | ${p.itemsAlwaysPassed}/${p.itemsAsked} | ` +
                `${pct(p.itemWilson.lo)} to ${pct(p.itemWilson.hi)} | ${p.truncated ?? "n/a"} | ` +
                `${pct(p.reasoningShare)} | ${p.avgTimeMs == null ? "n/a" : (p.avgTimeMs / 1000).toFixed(1) + " s"} | ` +
                `${p.costPer1000Correct == null ? "no published price" : "$" + p.costPer1000Correct.toFixed(2)} |`
        );
    }
    L.push("");
    L.push(
        `Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same ` +
            `${e.independentItems} items repeat every run. The item-level one counts an item as passed only if it was right every time, ` +
            `and is the one to quote for a claim about ability.`
    );
    if (e.saturated) {
        L.push("");
        L.push(
            "**Saturated:** every measured provider is at 100%. The suite confirms that nothing is broken; it cannot rank these providers on accuracy. " +
                "Cost and time are the only columns that separate them."
        );
    } else if (e.discriminatingItems.length) {
        L.push("");
        L.push(`Items that separate providers: ${e.discriminatingItems.join(", ")}.`);
    }
    L.push("");
    L.push("## Latency board");
    L.push("");
    L.push("| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |");
    L.push("|---|---|---|---|---|---|---|---|---|");
    for (const p of a.arena.providers) {
        L.push(
            `| ${p.provider} | ${p.thinkingOff == null ? "not stated" : p.thinkingOff ? "off" : "on"} | ${p.samples} | ${p.successes ?? "n/a"}/${p.samples}` +
                `${p.successWilson ? ` (${pct(p.successWilson.lo)} to ${pct(p.successWilson.hi)})` : ""} | ` +
                `${num(p.ttftMs)} / ${num(p.ttftP90Ms)} ms | ${num(p.totalMs)} / ${num(p.totalP90Ms)} ms | ${p.truncatedPings ?? "n/a"} | ${num(p.tokensPerSec)} | ${p.samplesBehindP90} |`
        );
    }
    if (a.arena.methodVersion != null) {
        L.push("");
        L.push(
            `Ping method version ${a.arena.methodVersion}, output cap ${a.arena.maxOutputTokens ?? "n/a"} tokens (thinking included). ` +
                "A cut-off ping's time is when the tokens ran out, not the time to a complete answer."
        );
    }
    if (a.arena.providers.some((p) => !p.p90HasInterval)) {
        L.push("");
        L.push(
            `A P90 from fewer than ${MIN_SAMPLES_FOR_P90} samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.`
        );
    }
    L.push("");
    L.push("## Where the two boards disagree");
    L.push("");
    L.push(`- By first token: ${a.cross.byFirstToken.join(" < ") || "n/a"}`);
    L.push(`- By complete short answer: ${a.cross.byShortAnswer.join(" < ") || "n/a"}`);
    L.push(`- By complete answer with thinking on: ${a.cross.byFullAnswer.join(" < ") || "n/a"}`);
    for (const n of a.cross.notes) L.push(`- ${n}`);
    return L.join("\n");
}

async function main() {
    const [evalBoard, arenaBoard] = await Promise.all([load("eval"), load("arena")]);
    const evalA = analyseEval(evalBoard);
    const arenaA = analyseArena(arenaBoard);
    const analysis = {
        source: typeof flag("eval") === "string" ? "saved responses" : BASE,
        eval: evalA,
        arena: arenaA,
        cross: crossBoard(evalA, arenaA),
    };
    console.log(AS_JSON ? JSON.stringify(analysis, null, 2) : markdown(analysis));
}

// Run only when executed directly, so the functions can be imported and tested.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
    main().catch((err) => {
        console.error(`analysis failed: ${err.message}`);
        process.exit(1);
    });
}
