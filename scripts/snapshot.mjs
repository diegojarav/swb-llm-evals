#!/usr/bin/env node
// Stores a dated copy of the two public boards and the analysis of that copy.
//
//   node scripts/snapshot.mjs                        # production site
//   node scripts/snapshot.mjs --base http://localhost:3000
//
// Writes, for today's UTC date:
//   results/<date>/eval-leaderboard.json    GET /api/eval/leaderboard, as returned
//   results/<date>/arena-leaderboard.json   GET /api/arena/leaderboard, as returned
//   results/<date>/analysis.md              the output of analysis/analyze-leaderboard.mjs
//                                           run on those two saved files
//
// Running it again on the same date overwrites that folder. It makes two GET
// requests to public endpoints and writes only under results/. No dependencies
// (Node 22+). Nothing is written if a request, a response or the analysis fails.
//
// To regenerate analysis.md from a saved day:
//   node analysis/analyze-leaderboard.mjs \
//     --eval results/<date>/eval-leaderboard.json --arena results/<date>/arena-leaderboard.json

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const baseFlag = args.indexOf("--base");
const BASE = String(baseFlag === -1 ? "https://www.saharaworldbusiness.com" : (args[baseFlag + 1] ?? "")).replace(/\/$/, "");
if (!/^https?:\/\//.test(BASE)) {
    console.error("--base needs a URL, for example https://www.saharaworldbusiness.com");
    process.exit(1);
}

const ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Text from a response, made safe for one line of the log: control characters
 * (escape sequences, line breaks) become spaces and the length is capped. Only
 * what is printed goes through this; the JSON is written to disk as it came.
 */
const oneLine = (value) => {
    const flat = String(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/ +/g, " ").trim();
    return flat.length > 120 ? `${flat.slice(0, 120)}...` : flat;
};

/** GET one public board, retrying a few times on a network error or a 5xx. */
async function fetchBoard(kind) {
    const url = `${BASE}/api/${kind}/leaderboard`;
    let lastError;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
            const res = await fetch(url, {
                headers: { accept: "application/json" },
                signal: AbortSignal.timeout(30_000),
            });
            if (res.status >= 500) throw new Error(`${url} answered ${res.status}`);
            if (!res.ok) throw Object.assign(new Error(`${url} answered ${res.status}`), { fatal: true });
            // A SyntaxError message quotes the start of the body: do not repeat it.
            const json = await res.json().catch((e) => {
                throw e?.name === "SyntaxError" ? new Error(`${url} did not return valid JSON`) : e;
            });
            if (!json || !Array.isArray(json.entries)) {
                throw Object.assign(new Error(`${url} did not return the expected shape (no "entries" array)`), {
                    fatal: true,
                });
            }
            return json;
        } catch (err) {
            lastError = err;
            if (err.fatal || attempt === ATTEMPTS) break;
            await sleep(5_000 * attempt);
        }
    }
    throw lastError;
}

const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function main() {
    const date = new Date().toISOString().slice(0, 10); // UTC
    const [evalBoard, arenaBoard] = await Promise.all([fetchBoard("eval"), fetchBoard("arena")]);

    // Run the analysis on saved files, exactly as a reader would, before writing
    // anything under results/.
    const work = await mkdtemp(join(tmpdir(), "swb-snapshot-"));
    let analysis;
    try {
        const evalFile = join(work, "eval-leaderboard.json");
        const arenaFile = join(work, "arena-leaderboard.json");
        await writeFile(evalFile, pretty(evalBoard));
        await writeFile(arenaFile, pretty(arenaBoard));
        analysis = execFileSync(
            process.execPath,
            [join(root, "analysis", "analyze-leaderboard.mjs"), "--eval", evalFile, "--arena", arenaFile],
            { encoding: "utf8" },
        );
    } finally {
        await rm(work, { recursive: true, force: true });
    }

    const dir = join(root, "results", date);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "eval-leaderboard.json"), pretty(evalBoard));
    await writeFile(join(dir, "arena-leaderboard.json"), pretty(arenaBoard));
    await writeFile(join(dir, "analysis.md"), analysis);

    console.log(`Wrote results/${date}/ (eval-leaderboard.json, arena-leaderboard.json, analysis.md)`);
    console.log(
        `Eval board updated ${oneLine(evalBoard.updatedAt ?? "never")} (method version ${oneLine(evalBoard.method?.methodVersion ?? "not stated")}), ` +
            `latency board updated ${oneLine(arenaBoard.updatedAt ?? "never")}.`,
    );
    // An empty board is what the site served, so it is written like any other;
    // the line makes sure it does not pass unnoticed in the log.
    for (const [name, board] of [
        ["eval", evalBoard],
        ["latency", arenaBoard],
    ]) {
        if (board.entries.length === 0) {
            console.log(`WARNING: the ${name} board came back empty ("entries" has no items). It was written as the site served it.`);
        }
    }
}

main().catch((err) => {
    console.error(`snapshot failed: ${oneLine(err?.message ?? err)}`);
    process.exit(1);
});
