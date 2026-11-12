import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { EVAL_SYSTEM, EVAL_TASKS } from "../src/eval-tasks";
import { DEFAULT_MAX_TOKENS, chatCompletionsUrl, main, readCompletion } from "../src/reproduce";

// A fake OpenAI-compatible server on localhost. Nothing leaves this machine.

const KEY = "test-key-123456";

interface Seen {
    url: string | undefined;
    authorization: string | undefined;
    body: {
        model: string;
        messages: { role: string; content: string }[];
        max_tokens: number;
        stream: boolean;
    };
}

type Reply = { status?: number; body: unknown; raw?: string };
type Handler = (taskId: string, seen: Seen) => Reply;

let server: Server | undefined;
afterEach(async () => {
    if (server) await new Promise((r) => server!.close(r));
    server = undefined;
});

/** Start the fake server. `handler` decides the reply for each task. */
async function start(handler: Handler) {
    const seen: Seen[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            const s: Seen = { url: req.url, authorization: req.headers.authorization, body };
            seen.push(s);
            const prompt = body.messages[1].content;
            const task = EVAL_TASKS.find((t) => t.prompt === prompt);
            const reply = handler(task ? task.id : "unknown", s);
            // A short pause, so that two requests in flight at once would overlap.
            setTimeout(() => {
                res.writeHead(reply.status ?? 200, { "content-type": "application/json" });
                res.end(reply.raw ?? JSON.stringify(reply.body));
                inFlight--;
            }, 5);
        });
    });
    await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    return { baseUrl: `http://127.0.0.1:${port}/v1`, seen, maxInFlight: () => maxInFlight };
}

const completion = (content: string, extra: Record<string, unknown> = {}) => ({
    body: {
        choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
        usage: {
            prompt_tokens: 50,
            completion_tokens: 120,
            total_tokens: 170,
            completion_tokens_details: { reasoning_tokens: 100 },
        },
        ...extra,
    },
});

const expectedOf = (taskId: string) => EVAL_TASKS.find((t) => t.id === taskId)!.expected;

async function run(baseUrl: string, extraArgs: string[] = [], env: Record<string, string> = { LLM_API_KEY: KEY }) {
    const out: string[] = [];
    const err: string[] = [];
    const code = await main(
        ["--base-url", baseUrl, "--model", "fake-model", ...extraArgs],
        env,
        (l) => out.push(l),
        (l) => err.push(l),
    );
    return { code, out: out.join("\n"), err: err.join("\n") };
}

const rowOf = (out: string, taskId: string) => out.split("\n").find((l) => l.startsWith(taskId)) ?? "";

describe("reproduce: every answer correct", () => {
    it("grades six of six and sends what the site sends", async () => {
        const fake = await start((id) => completion(expectedOf(id)));
        const { code, out, err } = await run(fake.baseUrl);

        expect(code).toBe(0);
        expect(err).toBe("");
        expect(out).toContain("Correct: 6 / 6");
        for (const t of EVAL_TASKS) expect(rowOf(out, t.id)).toContain("correct");

        // One request per task, in the order of the task list, one at a time.
        expect(fake.seen).toHaveLength(6);
        expect(fake.maxInFlight()).toBe(1);
        expect(fake.seen.map((s) => s.body.messages[1].content)).toEqual(EVAL_TASKS.map((t) => t.prompt));

        // The request itself.
        const first = fake.seen[0];
        expect(first.url).toBe("/v1/chat/completions");
        expect(first.authorization).toBe(`Bearer ${KEY}`);
        expect(first.body.model).toBe("fake-model");
        expect(first.body.max_tokens).toBe(DEFAULT_MAX_TOKENS);
        expect(DEFAULT_MAX_TOKENS).toBe(4000);
        expect(first.body.stream).toBe(false);
        expect(first.body.messages[0]).toEqual({ role: "system", content: EVAL_SYSTEM });

        // The key is never printed.
        expect(out).not.toContain(KEY);
    });

    it("reports output and reasoning tokens when the response has them", async () => {
        const fake = await start((id) => completion(expectedOf(id)));
        const { out } = await run(fake.baseUrl);
        const row = rowOf(out, "arithmetic");
        expect(row).toMatch(/\b120\b/);
        expect(row).toMatch(/\b100\b/);
        expect(row).not.toContain("*");
    });

    it("--max-tokens changes the cap that is sent", async () => {
        const fake = await start((id) => completion(expectedOf(id)));
        await run(fake.baseUrl, ["--max-tokens", "1500"]);
        expect(fake.seen.every((s) => s.body.max_tokens === 1500)).toBe(true);
    });

    it("--show-answers prints the answer text", async () => {
        const fake = await start((id) => completion(expectedOf(id)));
        const { out } = await run(fake.baseUrl, ["--show-answers"]);
        expect(out).toContain('answer: "10063"');
    });
});

describe("reproduce: a wrong answer", () => {
    it("counts it as wrong, not as an error", async () => {
        const fake = await start((id) => completion(id === "arithmetic" ? "10064" : expectedOf(id)));
        const { code, out } = await run(fake.baseUrl);

        expect(code).toBe(0);
        expect(out).toContain("Correct: 5 / 6");
        expect(rowOf(out, "arithmetic")).toContain("wrong");
        expect(rowOf(out, "arithmetic")).not.toContain("no answer");
        expect(out).toContain("Requests with no answer: 0 of 6");
    });
});

describe('reproduce: finish_reason "length"', () => {
    it("marks the answer as cut off and still grades what arrived", async () => {
        const fake = await start((id) => {
            // Cut off, but the final line is already the right answer: correct AND cut off.
            if (id === "arithmetic") {
                return completion("10063", { choices: [{ message: { content: "10063" }, finish_reason: "length" }] });
            }
            // Cut off while still thinking: nothing visible, so it grades as wrong.
            if (id === "trap-question") {
                return completion("", { choices: [{ message: { content: "" }, finish_reason: "length" }] });
            }
            return completion(expectedOf(id));
        });
        const { code, out } = await run(fake.baseUrl);

        expect(code).toBe(0);
        expect(rowOf(out, "arithmetic")).toContain("correct");
        expect(rowOf(out, "arithmetic")).toMatch(/correct\s+yes/);
        expect(rowOf(out, "trap-question")).toMatch(/wrong\s+yes/);
        expect(rowOf(out, "date-interval")).toMatch(/correct\s+no/);
        expect(out).toContain("Cut off at max_tokens: 2 of 6");
        expect(out).toContain("Correct: 5 / 6");
    });
});

describe("reproduce: HTTP 500", () => {
    it("reports no answer, exits 2, and never prints the key", async () => {
        const fake = await start(() => ({
            status: 500,
            body: { error: { message: `internal error while handling ${KEY}` } },
        }));
        const { code, out, err } = await run(fake.baseUrl);

        expect(code).toBe(2);
        expect(out).toContain("Correct: 0 / 6");
        expect(out).toContain("Requests with no answer: 6 of 6");
        expect(rowOf(out, "arithmetic")).toContain("no answer");
        expect(out).toContain("HTTP 500");
        expect(out).toContain("[redacted]");
        expect(out).not.toContain(KEY);
        expect(err).not.toContain(KEY);
    });

    it("a failed request does not stop the others", async () => {
        const fake = await start((id) =>
            id === "strict-format" ? { status: 500, body: {} } : completion(expectedOf(id)),
        );
        const { code, out } = await run(fake.baseUrl);
        expect(code).toBe(2);
        expect(fake.seen).toHaveLength(6);
        expect(out).toContain("Correct: 5 / 6");
        expect(out).toContain("Requests with no answer: 1 of 6");
    });
});

// What a terminal obeys: C0 (ESC, BEL, CR, newline...), DEL and C1 (CSI...).
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

// A hostile endpoint: its text tries to clear the screen, retitle the window,
// move the cursor up over the previous rows and then write a line of its own.
const HOSTILE =
    "bad request\u001b[2J\u001b[1A\u001b[2K\u001b]0;pwned\u0007\r\n" +
    "Correct: 6 / 6\n\u009b2K\u009d0;x\u009c\u007f";

describe("reproduce: text from a hostile endpoint", () => {
    async function runLines(baseUrl: string, extraArgs: string[] = []) {
        const out: string[] = [];
        const code = await main(
            ["--base-url", baseUrl, "--model", "fake-model", ...extraArgs],
            { LLM_API_KEY: KEY },
            (l) => out.push(l),
            () => undefined,
        );
        return { code, out };
    }

    it("shows no control character from an error body, JSON or not, and cannot forge a result line", async () => {
        const fake = await start((id) =>
            id === "arithmetic"
                ? { status: 500, body: { error: { message: HOSTILE } } }
                : { status: 502, body: null, raw: HOSTILE },
        );
        const { code, out } = await runLines(fake.baseUrl);

        expect(code).toBe(2);
        // Each element is one console.log call: none may hold a control
        // character, since a newline or an ESC would be obeyed by the terminal.
        for (const line of out) expect(line).not.toMatch(CONTROL);
        // The only "Correct:" line is the real one.
        expect(out.filter((l) => l.startsWith("Correct:"))).toEqual(["Correct: 0 / 6"]);
        // The text itself is still there, on the error line, flattened.
        expect(out.find((l) => l.startsWith("  error: HTTP 500"))).toContain("Correct: 6 / 6");
    });

    it("--show-answers writes control characters out instead of sending them", async () => {
        const fake = await start(() => completion(HOSTILE));
        const { out } = await runLines(fake.baseUrl, ["--show-answers"]);

        const answers = out.filter((l) => l.startsWith("  answer: "));
        expect(answers).toHaveLength(6);
        for (const line of out) expect(line).not.toMatch(CONTROL);
        expect(answers[0]).toContain("\\u001b");
        expect(answers[0]).toContain("\\u009b");
        expect(answers[0]).toContain("\\u007f");
        expect(out.filter((l) => l.startsWith("Correct:"))).toEqual(["Correct: 0 / 6"]);
    });
});

describe("reproduce: odd responses", () => {
    it("a 200 whose body is not JSON is an error, not a wrong answer", async () => {
        const fake = await start(() => ({ raw: "<html>nope</html>", body: null }));
        const { code, out } = await run(fake.baseUrl);
        expect(code).toBe(2);
        expect(out).toContain("not JSON");
    });

    it("counts thinking that is only visible in total_tokens, and says so", async () => {
        const fake = await start((id) =>
            completion(expectedOf(id), {
                usage: { prompt_tokens: 17, completion_tokens: 3, total_tokens: 183 },
            }),
        );
        const { out } = await run(fake.baseUrl);
        // 183 - 17 - 3 = 163 hidden tokens; output = 3 + 163 = 166.
        const row = rowOf(out, "arithmetic");
        expect(row).toMatch(/\b166\b/);
        expect(row).toContain("163*");
        expect(out).toContain("* Not reported directly");
    });

    it("shows a dash when the response has no usage at all", async () => {
        const fake = await start((id) => ({
            body: { choices: [{ message: { content: expectedOf(id) }, finish_reason: "stop" }] },
        }));
        const { out } = await run(fake.baseUrl);
        expect(rowOf(out, "arithmetic")).toMatch(/correct\s+no\s+-\s+-\s+\d/);
    });
});

describe("reproduce: flags and key", () => {
    it("with no arguments and no key, says what is missing and exits 1", async () => {
        const out: string[] = [];
        const err: string[] = [];
        let called = false;
        const code = await main(
            [],
            {},
            (l) => out.push(l),
            (l) => err.push(l),
            (() => {
                called = true;
                throw new Error("must not be called");
            }) as unknown as typeof fetch,
        );
        expect(code).toBe(1);
        expect(called).toBe(false);
        const text = err.join("\n");
        expect(text).toContain("--base-url");
        expect(text).toContain("--model");
        expect(text).toContain("LLM_API_KEY");
        expect(text).toContain("--help");
        expect(out).toEqual([]);
    });

    it("a missing key alone is reported", async () => {
        const fake = await start((id) => completion(expectedOf(id)));
        const { code, err } = await run(fake.baseUrl, [], {});
        expect(code).toBe(1);
        expect(err).toContain("LLM_API_KEY is not set");
        expect(fake.seen).toHaveLength(0);
    });

    it("an unknown flag is a usage error, not a crash", async () => {
        const { code, err } = await run("http://127.0.0.1:9/v1", ["--key", "abc"]);
        expect(code).toBe(1);
        expect(err).toContain("--key");
        expect(err).toContain("--help");
    });

    it("rejects http:// for anything but localhost", () => {
        expect(() => chatCompletionsUrl("http://api.example.com/v1")).toThrow(/https/);
        expect(() => chatCompletionsUrl("not a url")).toThrow(/valid URL/);
        expect(chatCompletionsUrl("http://localhost:8080/v1").href).toBe("http://localhost:8080/v1/chat/completions");
    });

    it("builds the endpoint from a base URL, or takes a full one as it is", () => {
        expect(chatCompletionsUrl("https://api.example.com/v1").href).toBe("https://api.example.com/v1/chat/completions");
        expect(chatCompletionsUrl("https://api.example.com/v1/").href).toBe("https://api.example.com/v1/chat/completions");
        expect(chatCompletionsUrl("https://api.example.com/v1/chat/completions").href).toBe(
            "https://api.example.com/v1/chat/completions",
        );
    });

    it("rejects a bad --max-tokens", async () => {
        const { code, err } = await run("http://127.0.0.1:9/v1", ["--max-tokens", "lots"]);
        expect(code).toBe(1);
        expect(err).toContain("--max-tokens");
    });

    it("--help prints the usage and exits 0", async () => {
        const out: string[] = [];
        const code = await main(["--help"], {}, (l) => out.push(l), () => undefined);
        expect(code).toBe(0);
        expect(out.join("\n")).toContain("LLM_API_KEY");
    });
});

describe("readCompletion", () => {
    it("returns null when there is no message", () => {
        expect(readCompletion(null)).toBeNull();
        expect(readCompletion({})).toBeNull();
        expect(readCompletion({ choices: [] })).toBeNull();
    });

    it("does not derive reasoning when the endpoint reports it", () => {
        const c = readCompletion({
            choices: [{ message: { content: "x" }, finish_reason: "stop" }],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 130,
                completion_tokens_details: { reasoning_tokens: 15 },
            },
        });
        expect(c).toMatchObject({ outputTokens: 20, reasoningTokens: 15, reasoningDerived: false });
    });
});
