/**
 * Re-run the six tasks of the eval against any OpenAI-compatible
 * chat-completions endpoint, with your own key.
 *
 *   LLM_API_KEY=<your key> npx tsx src/reproduce.ts --base-url <url> --model <id>
 *
 * What it does: sends the system prompt and each task prompt from
 * src/eval-tasks.ts, one task after another, grades the visible answer with
 * the same graders as the site, and prints one row per task.
 *
 * What it does not do: it stores nothing, and it sends nothing anywhere except
 * the endpoint you give it (redirects are refused). The key is read from the
 * LLM_API_KEY environment variable only, is sent only as the Authorization
 * header and is never printed.
 *
 * How it differs from the site's runner (see METHODOLOGY.md): it makes plain
 * non-streaming requests, it sends no thinking switch (the site sends none
 * either for this eval, so the model keeps its default behaviour), and you
 * choose the model. Your seconds will differ from ours: they depend on where
 * you run it.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { EVAL_SYSTEM, EVAL_TASKS, type EvalTask } from "./eval-tasks";

/** The site's output cap for this eval, thinking tokens included (method version 2). */
export const DEFAULT_MAX_TOKENS = 4000;
/** The site's per-task time limit, in seconds. */
export const DEFAULT_TIMEOUT_SECONDS = 90;
/** Environment variable that holds the key. Never a flag. */
export const KEY_ENV = "LLM_API_KEY";

export const USAGE = `Usage:
  ${KEY_ENV}=<your key> npx tsx src/reproduce.ts --base-url <url> --model <id> [options]

Runs the six tasks of the eval, one after another, against an OpenAI-compatible
chat-completions endpoint and grades the answers with the same graders as the site.

Required:
  --base-url <url>      Base URL of the API, for example https://api.example.com/v1
                        (the script adds /chat/completions; a URL that already ends
                        in /chat/completions is used as it is).
  --model <id>          Model id to send in the request.
  ${KEY_ENV}          Environment variable with your API key. It is never taken from
                        a flag and never printed.

Options:
  --max-tokens <n>      Output token cap, thinking included. Default ${DEFAULT_MAX_TOKENS} (the site's value).
  --timeout <seconds>   Time limit for each request. Default ${DEFAULT_TIMEOUT_SECONDS} (the site's value).
  --show-answers        Print the text of each answer under its row.
  --help                Show this text.

Exit code: 0 when the six requests were answered (right or wrong), 1 when a flag
or the key is missing or invalid, 2 when at least one request got no answer.`;

/** A problem with the flags or the key: shown to the reader, exit code 1. */
export class UsageError extends Error {}

export interface Options {
    baseUrl: string;
    model: string;
    maxTokens: number;
    timeoutSeconds: number;
    showAnswers: boolean;
}

export type ParsedCli = { help: true } | { help: false; options: Options; apiKey: string };

/** Read the flags and the key. Reports every problem at once. */
export function parseCli(argv: string[], env: Record<string, string | undefined>): ParsedCli {
    let values: {
        "base-url"?: string;
        model?: string;
        "max-tokens"?: string;
        timeout?: string;
        "show-answers"?: boolean;
        help?: boolean;
    };
    try {
        values = parseArgs({
            args: argv,
            allowPositionals: false,
            options: {
                "base-url": { type: "string" },
                model: { type: "string" },
                "max-tokens": { type: "string" },
                timeout: { type: "string" },
                "show-answers": { type: "boolean" },
                help: { type: "boolean", short: "h" },
            },
        }).values;
    } catch (err) {
        throw new UsageError((err as Error).message);
    }
    if (values.help) return { help: true };

    const problems: string[] = [];
    const baseUrl = values["base-url"]?.trim() ?? "";
    const model = values.model?.trim() ?? "";
    const apiKey = (env[KEY_ENV] ?? "").trim();
    if (!baseUrl) problems.push("Missing --base-url (the API's base URL).");
    if (!model) problems.push("Missing --model (the model id).");
    if (!apiKey) {
        problems.push(
            `${KEY_ENV} is not set. Put your API key in that environment variable; it is not accepted as a flag.`,
        );
    }

    let maxTokens = DEFAULT_MAX_TOKENS;
    if (values["max-tokens"] !== undefined) {
        maxTokens = Number(values["max-tokens"]);
        if (!Number.isInteger(maxTokens) || maxTokens < 1) {
            problems.push("--max-tokens must be a whole number, 1 or more.");
        }
    }
    let timeoutSeconds = DEFAULT_TIMEOUT_SECONDS;
    if (values.timeout !== undefined) {
        timeoutSeconds = Number(values.timeout);
        if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
            problems.push("--timeout must be a number of seconds greater than 0.");
        }
    }
    if (baseUrl) {
        try {
            chatCompletionsUrl(baseUrl);
        } catch (err) {
            problems.push((err as Error).message);
        }
    }
    if (problems.length > 0) throw new UsageError(problems.join("\n"));

    return {
        help: false,
        options: {
            baseUrl,
            model,
            maxTokens,
            timeoutSeconds,
            showAnswers: values["show-answers"] === true,
        },
        apiKey,
    };
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The URL requests go to. https is required, so the key never travels in the
 * clear; plain http is accepted only for this machine (a local server).
 */
export function chatCompletionsUrl(baseUrl: string): URL {
    let url: URL;
    try {
        url = new URL(baseUrl);
    } catch {
        throw new UsageError("--base-url is not a valid URL. Example: https://api.example.com/v1");
    }
    const isLocal = LOOPBACK_HOSTS.has(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
        throw new UsageError(
            "--base-url must start with https:// (http:// is accepted only for localhost), so the key is never sent in the clear.",
        );
    }
    const trimmed = url.pathname.replace(/\/+$/, "");
    url.pathname = trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
    return url;
}

/** What the reader sees of the URL: no credentials, no query string. */
function displayUrl(url: URL): string {
    return `${url.origin}${url.pathname}`;
}

export interface TaskRun {
    taskId: string;
    /** false = no answer came back (HTTP error, timeout, malformed body). */
    answered: boolean;
    /** The grader accepted the answer. Always false when nothing was answered. */
    correct: boolean;
    /** finish_reason was "length": the answer, or its thinking, hit max_tokens. */
    truncated: boolean;
    /** Total output tokens (answer plus reasoning) when the response reports them. */
    outputTokens: number | null;
    /** Reasoning tokens when the response reports or implies them. */
    reasoningTokens: number | null;
    /** true = reasoningTokens was derived from total_tokens (see readCompletion). */
    reasoningDerived: boolean;
    seconds: number;
    /** The visible answer text ("" when nothing was answered). */
    answer: string;
    error: string | null;
}

const asCount = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

export interface Completion {
    answer: string;
    truncated: boolean;
    outputTokens: number | null;
    reasoningTokens: number | null;
    reasoningDerived: boolean;
}

/**
 * Read a chat-completions response body. Returns null when it has no
 * choices[0].message, which is not an answer.
 *
 * Reasoning tokens come from usage.completion_tokens_details.reasoning_tokens
 * when the endpoint reports them. Some endpoints bill thinking as output but
 * report it only in total_tokens (a short answer with a large gap between
 * total_tokens and prompt_tokens + completion_tokens). The site counts that gap
 * as reasoning, and as output, only when no reasoning figure is reported, so
 * this does the same and marks the figure as derived.
 */
export function readCompletion(body: unknown): Completion | null {
    if (!body || typeof body !== "object") return null;
    const choice = (body as { choices?: unknown }).choices;
    const first = Array.isArray(choice) ? (choice[0] as Record<string, unknown> | undefined) : undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (!first || !message || typeof message !== "object") return null;

    let answer = "";
    if (typeof message.content === "string") {
        answer = message.content;
    } else if (Array.isArray(message.content)) {
        answer = message.content
            .map((part) =>
                part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
                    ? (part as { text: string }).text
                    : "",
            )
            .join("");
    }

    const usage = ((body as { usage?: unknown }).usage ?? {}) as Record<string, unknown>;
    const details = (usage.completion_tokens_details ?? {}) as Record<string, unknown>;
    const prompt = asCount(usage.prompt_tokens);
    const completion = asCount(usage.completion_tokens);
    const total = asCount(usage.total_tokens);
    let reasoning = asCount(details.reasoning_tokens);
    let output = completion;
    let derived = false;
    if (!reasoning && prompt !== null && completion !== null && total !== null) {
        const hidden = Math.max(0, total - prompt - completion);
        if (hidden > 0) {
            reasoning = hidden;
            output = completion + hidden;
            derived = true;
        }
    }
    return {
        answer,
        truncated: first.finish_reason === "length",
        outputTokens: output,
        reasoningTokens: reasoning,
        reasoningDerived: derived,
    };
}

/** Replace every occurrence of the key, and flatten whitespace, in text we may show. */
function safeSnippet(text: string, apiKey: string, max = 200): string {
    const redacted = apiKey ? text.split(apiKey).join("[redacted]") : text;
    const flat = redacted.replace(/\s+/g, " ").trim();
    return flat.length > max ? `${flat.slice(0, max)}...` : flat;
}

/** The error message of a provider's JSON error body, else the raw text. */
function errorText(raw: string): string {
    try {
        const parsed = JSON.parse(raw) as { error?: { message?: unknown } | string; message?: unknown };
        const e = parsed.error;
        if (typeof e === "string") return e;
        if (e && typeof e.message === "string") return e.message;
        if (typeof parsed.message === "string") return parsed.message;
    } catch {
        // not JSON: use the raw text
    }
    return raw;
}

/** Run ONE task. Never throws: a failed request comes back as answered: false. */
export async function runTask(
    task: EvalTask,
    options: Options,
    apiKey: string,
    fetchImpl: typeof fetch = fetch,
): Promise<TaskRun> {
    const run: TaskRun = {
        taskId: task.id,
        answered: false,
        correct: false,
        truncated: false,
        outputTokens: null,
        reasoningTokens: null,
        reasoningDerived: false,
        seconds: 0,
        answer: "",
        error: null,
    };
    const started = performance.now();
    try {
        const res = await fetchImpl(chatCompletionsUrl(options.baseUrl), {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(options.timeoutSeconds * 1000),
            headers: {
                "content-type": "application/json",
                accept: "application/json",
                authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: options.model,
                messages: [
                    { role: "system", content: EVAL_SYSTEM },
                    { role: "user", content: task.prompt },
                ],
                max_tokens: options.maxTokens,
                stream: false,
            }),
        });
        const raw = await res.text();
        run.seconds = (performance.now() - started) / 1000;
        if (!res.ok) {
            run.error = `HTTP ${res.status}: ${safeSnippet(errorText(raw), apiKey)}`;
            return run;
        }
        let body: unknown;
        try {
            body = JSON.parse(raw);
        } catch {
            run.error = "HTTP 200 but the body is not JSON.";
            return run;
        }
        const completion = readCompletion(body);
        if (!completion) {
            run.error = "HTTP 200 but the body has no choices[0].message.";
            return run;
        }
        run.answered = true;
        run.answer = completion.answer;
        run.truncated = completion.truncated;
        run.outputTokens = completion.outputTokens;
        run.reasoningTokens = completion.reasoningTokens;
        run.reasoningDerived = completion.reasoningDerived;
        // A cut-off answer is graded as it stands, like the site does: it is
        // reported separately so a cut-off is not read as a wrong answer.
        run.correct = task.grade(completion.answer);
        return run;
    } catch (err) {
        run.seconds = (performance.now() - started) / 1000;
        const e = err as Error & { cause?: unknown };
        if (e.name === "TimeoutError" || e.name === "AbortError") {
            run.error = `no answer within ${options.timeoutSeconds} s.`;
        } else {
            const cause = e.cause instanceof Error ? `: ${e.cause.message}` : "";
            run.error = `request failed (${safeSnippet(`${e.message}${cause}`, apiKey)}).`;
        }
        return run;
    }
}

const COLUMNS = [
    ["task", 17],
    ["result", 10],
    ["cut off", 9],
    ["output tokens", 15],
    ["reasoning tokens", 18],
    ["seconds", 7],
] as const;

const row = (cells: string[]): string =>
    cells.map((c, i) => (i < COLUMNS.length - 1 ? c.padEnd(COLUMNS[i][1]) : c)).join("").trimEnd();

function formatRow(r: TaskRun): string {
    const result = !r.answered ? "no answer" : r.correct ? "correct" : "wrong";
    return row([
        r.taskId,
        result,
        r.answered ? (r.truncated ? "yes" : "no") : "-",
        r.outputTokens === null ? "-" : String(r.outputTokens),
        r.reasoningTokens === null ? "-" : `${r.reasoningTokens}${r.reasoningDerived ? "*" : ""}`,
        r.seconds.toFixed(2),
    ]);
}

/** Run every task, one after another, printing each row as it finishes. */
export async function runAll(
    options: Options,
    apiKey: string,
    out: (line: string) => void,
    fetchImpl: typeof fetch = fetch,
): Promise<TaskRun[]> {
    const url = chatCompletionsUrl(options.baseUrl);
    out(`Endpoint:    ${displayUrl(url)}`);
    out(`Model:       ${options.model}`);
    out(
        `Settings:    max_tokens ${options.maxTokens}, ${options.timeoutSeconds} s limit per request, ` +
            "no thinking switch sent, one request at a time",
    );
    out("");
    out(row(COLUMNS.map(([name]) => name)));

    const runs: TaskRun[] = [];
    for (const task of EVAL_TASKS) {
        const r = await runTask(task, options, apiKey, fetchImpl);
        runs.push(r);
        out(formatRow(r));
        if (r.error) out(`  error: ${r.error}`);
        if (options.showAnswers && r.answered) {
            out(`  answer: ${JSON.stringify(r.answer.length > 300 ? `${r.answer.slice(0, 300)}...` : r.answer)}`);
        }
    }

    out("");
    if (runs.some((r) => r.reasoningDerived)) {
        out(
            "* Not reported directly by the endpoint: counted as total_tokens - prompt_tokens - completion_tokens,\n" +
                "  which is how the site counts it. Those tokens are also added to the output tokens.",
        );
    }
    const cut = runs.filter((r) => r.truncated).length;
    const noAnswer = runs.filter((r) => !r.answered).length;
    out(`Cut off at max_tokens: ${cut} of ${runs.length}. Requests with no answer: ${noAnswer} of ${runs.length}.`);
    out(`Correct: ${runs.filter((r) => r.correct).length} / ${runs.length}`);
    return runs;
}

/** The whole command. Returns the exit code instead of exiting, so tests can call it. */
export async function main(
    argv: string[],
    env: Record<string, string | undefined>,
    out: (line: string) => void,
    err: (line: string) => void,
    fetchImpl: typeof fetch = fetch,
): Promise<number> {
    let parsed: ParsedCli;
    try {
        parsed = parseCli(argv, env);
    } catch (e) {
        if (!(e instanceof UsageError)) throw e;
        err(e.message);
        err("");
        err("Run with --help for usage.");
        return 1;
    }
    if (parsed.help) {
        out(USAGE);
        return 0;
    }
    const runs = await runAll(parsed.options, parsed.apiKey, out, fetchImpl);
    return runs.some((r) => !r.answered) ? 2 : 0;
}

/** True when this file is the one being run (`tsx src/reproduce.ts`), not imported by a test. */
function isEntryPoint(): boolean {
    const entry = process.argv[1];
    if (!entry) return false;
    const strip = (p: string) => {
        const resolved = path.resolve(p).replace(/\.[cm]?[jt]s$/, "");
        return process.platform === "win32" ? resolved.toLowerCase() : resolved;
    };
    return strip(fileURLToPath(import.meta.url)) === strip(entry);
}

if (isEntryPoint()) {
    main(process.argv.slice(2), process.env, console.log, console.error).then(
        (code) => {
            process.exitCode = code;
        },
        (e: unknown) => {
            console.error(`Unexpected error: ${(e as Error).message}`);
            process.exitCode = 2;
        },
    );
}
