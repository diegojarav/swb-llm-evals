// Adapted from the website's test for the graders (test/lib/eval-tasks.test.ts).
// Everything down to the "grade: invalid-premise" block is that test with three
// small changes: the import path, EVAL_SYSTEM added to the import list, and an
// em dash replaced by a colon in two group names. The two blocks at the end are
// new in this repository: they check that src/eval-tasks.ts is still the
// verbatim copy, and that it is the task set the site published in each stored
// result.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
    EVAL_SYSTEM,
    EVAL_TASKS,
    extractJsonObject,
    finalAnswerLine,
    parseIntegerLine,
    type EvalTask,
} from "../src/eval-tasks";

const task = (id: string): EvalTask => {
    const t = EVAL_TASKS.find((x) => x.id === id);
    if (!t) throw new Error(`no task ${id}`);
    return t;
};

describe("eval task set: shape", () => {
    it("has the six planned tasks with unique ids and non-empty prompts", () => {
        expect(EVAL_TASKS).toHaveLength(6);
        const ids = EVAL_TASKS.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const t of EVAL_TASKS) {
            expect(t.prompt.trim().length).toBeGreaterThan(0);
            expect(typeof t.grade).toBe("function");
        }
    });
});

describe("eval task set: the answer shown to visitors", () => {
    // `expected` is display-only (the site and /api/eval/leaderboard `method`
    // show it as "the correct answer"). If a grader changes and stops accepting
    // it, the page would be telling visitors something false.
    it.each(EVAL_TASKS.map((t) => [t.id, t] as const))(
        "%s: the grader accepts its own expected answer",
        (_id, t) => {
            expect(t.expected.trim().length).toBeGreaterThan(0);
            expect(t.grade(t.expected)).toBe(true);
        },
    );

    it("keeps the canonical answers the page shows", () => {
        expect(Object.fromEntries(EVAL_TASKS.map((t) => [t.id, t.expected]))).toEqual({
            arithmetic: "10063",
            "date-interval": "viernes",
            "json-extraction": '{"nombre":"Juan","edad":34,"ciudad":"Asunción"}',
            "strict-format": "azul",
            "trap-question": "5",
            "invalid-premise": "NO_EXISTE",
        });
    });
});

describe("finalAnswerLine", () => {
    it("takes the LAST non-empty line, normalised", () => {
        expect(finalAnswerLine("Paso 1: ...\nPaso 2: ...\n\nViernes\n\n")).toBe("viernes");
        expect(finalAnswerLine("  sábado  ")).toBe("sabado");
    });
    it("strips markdown emphasis, code, quotes and trailing punctuation", () => {
        expect(finalAnswerLine("**viernes**")).toBe("viernes");
        expect(finalAnswerLine("`NO_EXISTE`")).toBe("no_existe");
        expect(finalAnswerLine("“viernes”.")).toBe("viernes");
        expect(finalAnswerLine("_10063_.")).toBe("10063");
    });
    it("skips lines that were only wrapping, like a closing code fence", () => {
        expect(finalAnswerLine("```\n10063\n```")).toBe("10063");
    });
    it("returns empty for an empty answer", () => {
        expect(finalAnswerLine("")).toBe("");
        expect(finalAnswerLine("\n  \n")).toBe("");
    });
});

describe("parseIntegerLine", () => {
    it("parses a bare integer, with or without thousands separators", () => {
        expect(parseIntegerLine("10063")).toBe(10063);
        expect(parseIntegerLine("10.063")).toBe(10063);
        expect(parseIntegerLine("10,063")).toBe(10063);
        expect(parseIntegerLine("5")).toBe(5);
    });
    it("rejects anything that isn't only the number", () => {
        expect(parseIntegerLine("= 10063")).toBeNull();
        expect(parseIntegerLine("5 centavos")).toBeNull();
        expect(parseIntegerLine("10.5")).toBeNull();
        expect(parseIntegerLine("no lo se")).toBeNull();
        expect(parseIntegerLine("")).toBeNull();
    });
});

describe("extractJsonObject", () => {
    it("pulls a JSON object out of surrounding prose", () => {
        expect(extractJsonObject('aquí tenés: {"a":1} listo')).toEqual({ a: 1 });
    });
    it("returns null for arrays or invalid JSON", () => {
        expect(extractJsonObject("[1,2,3]")).toBeNull();
        expect(extractJsonObject("{not json}")).toBeNull();
        expect(extractJsonObject("sin json")).toBeNull();
    });
});

describe("grade: arithmetic (347 × 29 = 10063)", () => {
    const g = task("arithmetic").grade;
    it("accepts the right number as the final line", () => {
        expect(g("10063")).toBe(true);
        expect(g("10.063")).toBe(true);
        expect(g("347 × 30 = 10410\n10410 − 347 = 10063\n\n10063")).toBe(true);
    });
    it("rejects wrong answers", () => {
        expect(g("10062")).toBe(false);
        expect(g("no sé")).toBe(false);
    });
    it("rejects verbose answers whose final line isn't just the number", () => {
        expect(g("El resultado es 10.063")).toBe(false);
        expect(g("347 x 29 = 10063")).toBe(false);
        // Right number mid-text, then a different final answer.
        expect(g("Me da 10063, pero verificando...\n10064")).toBe(false);
    });
});

describe("grade: date-interval (1 mar 2024 = viernes)", () => {
    const g = task("date-interval").grade;
    it("accepts viernes as the final line, case/markdown tolerated", () => {
        expect(g("viernes")).toBe(true);
        expect(g("VIERNES")).toBe(true);
        expect(g("**viernes**")).toBe(true);
        expect(g("Enero 31 + febrero 29 = 60 días → lunes + 60.\nviernes")).toBe(true);
    });
    it("rejects any other weekday", () => {
        expect(g("jueves")).toBe(false);
        expect(g("sábado")).toBe(false);
    });
    it("rejects verbose-but-wrong answers that merely mention viernes", () => {
        // Both passed the old substring grader.
        expect(g("no fue viernes, fue jueves")).toBe(false);
        expect(g("Pensé en viernes, pero 2024 no es bisiesto.\njueves")).toBe(false);
        expect(g("Fue viernes.")).toBe(false); // ignores "SOLO el día"
    });
});

describe("grade: json-extraction (exact schema)", () => {
    const g = task("json-extraction").grade;
    it("accepts the exact schema with correct values", () => {
        expect(g('{"nombre":"Juan","edad":34,"ciudad":"Asunción"}')).toBe(true);
        expect(g('{"nombre":"juan","edad":34,"ciudad":"asuncion"}')).toBe(true);
        expect(g('Respuesta: {"nombre":"Juan","edad":34,"ciudad":"Asunción"}')).toBe(true);
    });
    it("rejects wrong values, wrong types, or extra/missing keys", () => {
        expect(g('{"nombre":"Juan","edad":"34","ciudad":"Asunción"}')).toBe(false); // edad string
        expect(g('{"nombre":"Ana","edad":34,"ciudad":"Asunción"}')).toBe(false); // wrong name
        expect(g('{"nombre":"Juan","edad":34}')).toBe(false); // missing key
        expect(g('{"nombre":"Juan","edad":34,"ciudad":"Asunción","pais":"PY"}')).toBe(false); // extra key
        expect(g("no es json")).toBe(false);
    });
});

describe("grade: strict-format (exactly one word: azul)", () => {
    const g = task("strict-format").grade;
    it("accepts a single word 'azul' (case / trailing punctuation tolerated)", () => {
        expect(g("azul")).toBe(true);
        expect(g("Azul")).toBe(true);
        expect(g("azul.")).toBe(true);
        expect(g("  azul  ")).toBe(true);
    });
    it("rejects multi-word answers even if they contain azul", () => {
        expect(g("El cielo es azul")).toBe(false);
        expect(g("azul claro")).toBe(false);
    });
    it("rejects a single wrong word", () => {
        expect(g("rojo")).toBe(false);
    });
});

describe("grade: trap-question (ball = 5 cents, not 10)", () => {
    const g = task("trap-question").grade;
    it("accepts 5 as the final line", () => {
        expect(g("5")).toBe(true);
        expect(g("x + (x + 100) = 110 → x = 5\n5")).toBe(true);
    });
    it("rejects the naive 10", () => {
        expect(g("10")).toBe(false);
        expect(g("10 centavos")).toBe(false);
    });
    it("rejects verbose answers, right or wrong, whose final line isn't the number", () => {
        expect(g("La pelota cuesta 5 centavos.")).toBe(false);
        // The old last-integer heuristic read 105 here and failed it for the
        // wrong reason; now it fails for ignoring "SOLO un número entero".
        expect(g("La pelota: 5¢\nEl bate: 105¢")).toBe(false);
        // Mentions 5 along the way but commits to the naive answer.
        expect(g("No es 5, es la respuesta intuitiva:\n10")).toBe(false);
    });
});

describe("grade: invalid-premise (Feb 30 doesn't exist)", () => {
    const g = task("invalid-premise").grade;
    it("accepts the exact sentinel as the final line", () => {
        expect(g("NO_EXISTE")).toBe(true);
        expect(g("`NO_EXISTE`")).toBe(true);
        expect(g("Febrero de 2025 tiene 28 días.\nNO_EXISTE")).toBe(true);
    });
    it("rejects a hallucinated weekday", () => {
        expect(g("Fue un sábado.")).toBe(false);
        expect(g("lunes")).toBe(false);
    });
    it("rejects prose instead of the sentinel, and hallucinations that mention it", () => {
        // Both passed the old loose substring OR.
        expect(g("Esa fecha no existe, pero si existiera sería domingo.\ndomingo")).toBe(false);
        expect(g("NO_EXISTE... aunque contando días daría sábado\nsábado")).toBe(false);
        expect(g("Esa fecha no existe.")).toBe(false); // ignores "exactamente: NO_EXISTE"
    });
});

// ---- New in this repository ----

const root = new URL("../", import.meta.url);

describe("src/eval-tasks.ts is still the verbatim copy", () => {
    it("the text after the marker has the SHA-256 recorded in the header", () => {
        const file = readFileSync(new URL("src/eval-tasks.ts", root), "utf8").replace(/\r\n/g, "\n");
        const marker = "// ---- verbatim copy of lib/eval-tasks.ts starts on the next line ----\n";
        const at = file.indexOf(marker);
        expect(at).toBeGreaterThan(-1);
        const recorded = file.match(/^ \* ([0-9a-f]{64})$/m)?.[1];
        expect(recorded).toBeDefined();
        const body = file.slice(at + marker.length);
        expect(createHash("sha256").update(body).digest("hex")).toBe(recorded);
    });
});

describe("stored results were made with this task set", () => {
    // Every results/<date>/eval-leaderboard.json carries the site's `method`
    // block. For the method version this copy implements (2), the prompts, the
    // expected answers, the system prompt, the cap and the thinking setting must
    // be the ones in this repository. A later version is skipped here: when the
    // site moves to it, this copy has to be updated (see CHANGELOG.md).
    const METHOD_VERSION = 2;
    const dir = new URL("results/", root);
    const file = (day: string) => new URL(`results/${day}/eval-leaderboard.json`, root);
    const days = existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(file(d))) : [];
    const v2 = days.filter((d) => JSON.parse(readFileSync(file(d), "utf8")).method?.methodVersion === METHOD_VERSION);

    it.each(v2)("%s: the published method block matches src/eval-tasks.ts", (day) => {
        const { method } = JSON.parse(readFileSync(file(day), "utf8"));
        expect(method.systemPrompt).toBe(EVAL_SYSTEM);
        expect(method.tasks).toEqual(EVAL_TASKS.map((t) => ({ id: t.id, prompt: t.prompt, expected: t.expected })));
        expect(method.maxOutputTokens).toBe(4000);
        expect(method.thinking).toBe(true);
    });
});
