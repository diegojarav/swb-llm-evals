# How we measure the LLM providers on the Sahara World Business site

This is the public explanation of the two boards in the Arena section of the home page (https://www.saharaworldbusiness.com): what is measured, how each number is calculated, what the numbers can and cannot support, and the published work behind the method. It is written so that someone outside the project can check us.

The website itself is not in this repository. What is here is the part needed to check the numbers: the tasks and graders (`src/eval-tasks.ts`), a runner for your own key (`src/reproduce.ts`), the analysis script (`analysis/analyze-leaderboard.mjs`), dated copies of what the boards published (`results/`), and the sources behind the method (`references/literature.md`, `references/statistics.md`). The history of changes to the method is in `CHANGELOG.md`.

## The two boards

| | Reasoning eval | Latency board |
|---|---|---|
| Question | Does the model get six verifiable tasks right, and at what cost and time? | How fast does a short answer start and finish? |
| Cadence | Once a day | Every six hours |
| Thinking mode | On | Off, for the models that have a switch (the row says so) |
| Output cap | 4,000 tokens, thinking included | 1,000 tokens, thinking included |
| Prompt | Six fixed tasks in Spanish, identical for every provider | One short prompt (three sentences), identical for every provider |
| Window shown | Last 14 days, current method version only | Last 7 days, current method version only |
| Measured from | Our own server (Google Cloud, us-east4) | Same |

Each provider is measured on its default model on this site, named on its row.

## The reasoning eval

**Tasks.** Six tasks, each with exactly one correct answer: an arithmetic product, a weekday calculation across a leap-year February, a JSON extraction with an exact three-key schema, a one-word answer, a well-known trap question, and a question about a date that does not exist. The exact prompts, the system prompt, the expected answers and the grading rule of each task are in `src/eval-tasks.ts`, a verbatim copy of the file the site uses. They are also shown in the "how we measure" panel of the reasoning tab and returned by `GET /api/eval/leaderboard` in its `method` block. That block also carries `generatorVersion` and, for each task, `templateId` and `control`. The site's code contains a generator that can produce different instances of these task types, but it is not in use: the eval still asks only the six fixed tasks, each one its own template and a control (an item that never changes), and the eval's method version has not changed because of it.

**Grading.** By code, never by another model. Each grader is a deterministic function of the answer text. `test/eval-tasks.test.ts` asserts that every published expected answer passes its own grader.

**What each number is.**

- *Aciertos (accuracy):* correct answers out of tasks attempted in the window, shown as counts ("18 de 18 respuestas correctas", "6 tareas distintas, repetidas en 3 pruebas") and not as a percentage. The only range the board shows is counted over tasks: when every provider passed every task every time, one line above the cards gives it; when results differ, each card gives its own. A task counts as passed only if it was right on every attempt.
- *Razonamiento (reasoning share):* reasoning tokens ÷ total output tokens. It says how much of what the model generated was thinking before it answered. Those tokens are billed as output. It is not a quality score.
- *Costo por 1.000 correctas (cost per 1,000 correct answers):* output-token cost at the provider's published list price ÷ correct answers × 1,000. Input tokens are not included. A provider with no published per-token price shows no cost.
- *Tiempo de respuesta (time to answer):* time until the complete answer with thinking on; averaged over the six tasks of a run, then the median of the runs in the window.
- *Cut-off answers:* an answer that stopped at the output cap is graded as it stands and counted separately, so that a cut-off is not read as a wrong answer.

**How the site runs the tasks.** The runner is not in this repository, so here is what it does:

- Every task is sent with the system prompt from `src/eval-tasks.ts`, as a separate request, to the provider's default model.
- Models that have a thinking switch keep thinking on: the request does not ask them to stop. Models without a switch think, or not, as they normally do.
- The output cap is 4,000 tokens and thinking tokens count against it. Each task has a time limit of 90 seconds.
- Tasks run one after another, and providers run one after another, with the slowest provider last. The whole run shares one time budget. After 200 seconds no new task is started, and a provider that has not finished all six tasks by then is left out for that day. The slowest provider goes last so that a slow day costs it its own row and not the others'.
- An answer is cut off when the provider reports that it stopped because it reached the output cap (finish reason `length`).
- A request that fails counts as not correct for that task. If a provider fails all six requests in a run, the run is treated as an outage and is not stored, so an outage does not appear as 0%.
- The text of the answers is not published. The board publishes, per task, how many times it was attempted and passed, plus tokens and times.

**Method versions.** Anything that can move a score (the cap, the thinking setting, a task, a grader, the system prompt) increases the method version. The board only aggregates runs of the current version and says since when it holds.

| Version | From | What changed |
|---|---|---|
| 1 | 2026-10 | 800-token output cap. Cut-off answers were not recorded. |
| 2 | 2026-11-12 | 4,000-token cap; cut-off answers recorded and shown; runs carry their version; the slowest provider runs last. |

Version 2 exists because of an error of ours. Under version 1 the board showed one provider at about 75%. Of the 35 tasks it had answered wrong, 34 had stopped at the 800-token cap: the model was still thinking when it ran out of tokens. Under version 2 the same provider answers all six tasks correctly.

## The latency board

One short request per provider every six hours, asking for three sentences. Shown: median and 90th percentile of the time to the first visible token and of the time to the complete short answer, visible output tokens per second after the first token, the success rate, and how many pings were cut off.

The runner of the latency board is not in this repository yet. Only its published numbers (`results/`) and this description are. What the site does:

- Each run sends the same prompt to every provider, one provider after another, with a cap of 1,000 output tokens (thinking included) and a time limit of 30 seconds per provider.
- A ping is cut off when the provider reports that it stopped because it reached the output cap (finish reason `length`).
- The live "race" on the page is a separate demo that a visitor starts. It keeps a 120-token cap and is not part of this board.

Three clocks rank providers differently, and the page names which one it uses:

1. time to the first visible token of a short answer (the latency board's first column). When a model thinks before it answers, this is later than the first token the model generates; Huyen (2025) calls the first token the user sees "time to publish";
2. time to the complete short answer (the latency board's "complete answer" column, which the rows are sorted by and which the badge follows);
3. time to a complete answer with thinking on (the reasoning tab).

A model can lead on the first and be last on the third: it starts quickly, generates slowly, and most of what it generates is thinking. Huyen also splits latency into the time to the first token and the time per output token, with total latency roughly the first plus the second times the number of output tokens, which is why a fast start does not decide the end.

The ping switches thinking off only for models that offer a switch. A model without one still thinks before its first visible token. The first-token column is therefore not like for like across providers; each row states whether thinking was off.

**The badge.** "Fastest complete answer" goes to the row with the lowest median time to the complete short answer, and only if that row had no ping cut off by the output cap in the window and has at least five pings behind its median (the same minimum the P90 uses). If the leader fails either test, nobody gets the badge; the runner-up does not inherit it. A row with cut-off pings says how many.

**Cut-offs.** Thinking tokens count against the 1,000-token cap. A ping that stopped at the cap is stored as cut off, and the board counts them per provider (`truncatedPings` in `GET /api/arena/leaderboard`). The time of such a ping is when the tokens ran out, not the time to a complete answer, and it stays in the median so the figure shown is the one the data holds; the count beside it says how many of them there are. The cap was chosen as a margin over one direct measurement of the provider that thinks longest (see the known limits). The cut-off count says whether every provider keeps finishing inside it.

**Ping method versions.** The same rule as for the eval: anything that can move the latency numbers (the cap, the prompt, the thinking setting, what a row records) increases the ping's method version, every stored ping carries it, and the board aggregates only the current version and says since when it holds. The `method` block of `GET /api/arena/leaderboard` gives the prompt, the output cap and this version.

| Version | From | What changed |
|---|---|---|
| 1 | until 2026-11 | 120-token cap. Cut-offs were not recorded. Stored rows have no version, so they are left out. |
| 2 | 2026-11-12 | 400-token cap; cut-offs recorded and counted; pings carry their version; the badge and the sort follow the complete short answer instead of the first token. |
| 3 | 2026-11-12 | 1,000-token cap. The first five real pings under version 2 showed one provider still cut off at 400 every time; measured directly, its complete answer used 558 to 739 tokens. |

Version 2 exists because of an error of ours. Under version 1 the board published a "complete answer" time, but for three of the four providers at least 25 of 28 pings in a week had stopped at the 120-token cap: the model had spent the budget thinking, and the time was the time to run out of tokens. Only the provider whose thinking was switched off had measured a complete answer. The live race on the page is a separate, user-triggered demo and keeps its 120-token cap.

## What the numbers support

- **The sample is six items.** Every run repeats the same six tasks, so more days add answers and not items. Eighteen correct answers out of eighteen are three runs of six tasks. Counted as answers the 95% Wilson interval is 82% to 100%; counted as items (six of six) it is 61% to 100%. What that supports is "no failure seen on these six tasks", not "100% accurate". The board therefore shows the second range (over tasks) and never the first (over answers); the "how we measure" panel explains how to read it and links to this repository.
- **It is a health check, not a ranking.** When every provider is at 100% the suite is saturated: it confirms that nothing is broken and cannot rank on accuracy. Cost and time are then the columns that carry information.
- **Small differences are noise.** One task is 16.7 points. With six items only very large gaps between two providers could be told apart reliably.
- **The P90 on the latency board rests on about 28 samples,** so the two or three slowest requests set it. The medians are stable. Right after a method change the board holds only a few pings: a P90 and the badge need at least five, so for the first day rows show their medians and no badge.
- **A badge is a statement about one clock.** "Fastest complete answer" says that this provider had the lowest median time to the end of a short answer in this window, from this server, with no ping cut off. It does not say it starts first, answers best or is fastest for long answers.
- **Scope.** The results describe these tasks, these default models and this server location. They say nothing about long answers, other languages, tools, or general model quality.

## Known limits

- Six items is a very small set, and one of them (the trap question) is a famous puzzle that is almost certainly in training data, so it may test memory.
- The JSON task uses a flat three-key schema: it supports a claim about simple structured output and nothing wider.
- The invalid-premise task tells the model what to answer if the date does not exist, which is the easy version of that probe.
- An answer cut off by the per-task time limit (90 s), as opposed to the token cap, is not marked.
- First-token times are not like for like while thinking can be switched off for some models and not others. The time to the complete answer is also not like for like: a model that thinks before answering has that thinking inside its time, and one whose thinking is off does not.
- The 1,000-token cap comes from one measurement on 2026-11-12: the provider that thinks longest used 558 to 739 tokens across six complete answers. It is a margin over that, not a guarantee. A provider that still stops at it shows its cut-off count and gets no badge.
- A row with cut-off pings keeps them in its median. Its time is then partly "time until the tokens ran out", and the count beside it is the only warning.
- A ping that the 30 s time limit interrupted after some text had arrived is stored as answered, with a time near 30 s, and is not marked as cut off. (This is from reading the site's code; no test covers it.)
- If a provider does not report why it stopped, the ping is counted as not cut off, so the count can be too low. (Also from reading the site's code.)
- One ping per provider every six hours is 28 per week. A ranking between two providers whose medians are close is not supported by that.

## How to check us

You need Node 22 or later and `npm install` once.

- `GET /api/eval/leaderboard` and `GET /api/arena/leaderboard` on the site are public and return everything the boards show, plus the method block (the latency one gives the prompt, the output cap and the method version).
- `node analysis/analyze-leaderboard.mjs` (or `npm run analyze`) reads those two endpoints and prints the tables with intervals, the per-item view, the cut-off pings and the three rankings. It also reads saved files, which is how `analysis.md` in each `results/` folder is made.
- The tasks and graders are in `src/eval-tasks.ts`, and their tests in `test/eval-tasks.test.ts`. Those tests also compare the `method` block saved in each result with `src/eval-tasks.ts`: prompts, expected answers, system prompt, cap and thinking setting must match exactly. Fields of the block that this repository does not define (`generatorVersion`, `templateId`, `control`) are ignored.
- `src/reproduce.ts` runs the six tasks against any OpenAI-compatible chat-completions endpoint with your own key, so you can see the graders applied to a provider's real answers.
- `results/<UTC date>/` holds the two boards as the site published them that day, and the analysis of those two files. A workflow takes a new snapshot every day. The latency file of 2026-11-12 was taken before the ping changes above: it has no `method` block and no cut-off count, and it describes the 120-token ping.

What you cannot reproduce here: our exact times, which depend on where our server is and on its network (yours will be different); the latency board's runner, which is not in this repository yet; and the text of the answers from our daily runs, which is not published. Running `src/reproduce.ts` is an independent check of the tasks and graders on your own key. It is not an audit of our daily runs.

## Published work behind the method

Each source was opened and checked on 2026-11-12, except the book by Huyen, whose passage was checked in a printed copy on the same day. The full list, with what each one implies for us and what was not verified, is in `references/literature.md` and `references/statistics.md`.

| Choice | Source |
|---|---|
| Verifiable, code-graded tasks | Zhou et al. 2023, "Instruction-Following Evaluation for Large Language Models". https://arxiv.org/abs/2311.07911 |
| No model as judge | Zheng et al. 2023, "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena". https://arxiv.org/abs/2306.05685 |
| Small checks per capability | Ribeiro et al. 2020, "Beyond Accuracy: Behavioral Testing of NLP Models with CheckList". https://arxiv.org/abs/2005.04118 |
| What a benchmark should document | Reuel et al. 2024, "BetterBench". https://arxiv.org/abs/2411.12990 |
| Intervals and item counts | Miller 2024, "Adding Error Bars to Evals". https://arxiv.org/abs/2411.00640 |
| Small-sample intervals | Bowyer, Aitchison and Ivanova 2025, "Position: Don't Use the CLT in LLM Evals With Fewer Than a Few Hundred Datapoints". https://arxiv.org/abs/2503.01747 |
| Saturation | Akhtar et al. 2026, "When AI Benchmarks Plateau". https://arxiv.org/abs/2602.16763 |
| Famous items and memorisation | Hagendorff, Fabi and Kosinski 2023, Nature Computational Science. https://doi.org/10.1038/s43588-023-00527-x |
| Cost per correct answer | Erol et al. 2025, "Cost-of-Pass". https://arxiv.org/abs/2504.13359 |
| The token cap changes results | Guedes de Souza and Panisson 2026, "Who Thinks Best Depends on How Long You Let Them". https://arxiv.org/abs/2608.12150 |
| Hosted models change over time | Chen, Zaharia and Zou 2023, "How is ChatGPT's behavior changing over time?". https://arxiv.org/abs/2307.09009 |
| Latency definitions | Artificial Analysis, API performance methodology. https://artificialanalysis.ai/methodology/performance-benchmarking |
| First visible token, time per token | Huyen 2025, "AI Engineering: Building Applications with Foundation Models", O'Reilly, chapter 9, "Inference Optimization" (a book, no URL; passage checked in a printed copy on 2026-11-12, not opened online). |
