# How we measure the LLM providers on the Sahara World Business site

This is the public explanation of the two boards in the Arena section of the home page (https://www.saharaworldbusiness.com): what is measured, how each number is calculated, what the numbers can and cannot support, and the published work behind the method. It is written so that someone outside the project can check us.

The website itself is not in this repository. What is here is the part needed to check the numbers: the tasks and graders (`src/eval-tasks.ts`), a runner for your own key (`src/reproduce.ts`), the analysis script (`analysis/analyze-leaderboard.mjs`), dated copies of what the boards published (`results/`), and the sources behind the method (`references/literature.md`, `references/statistics.md`). The history of changes to the method is in `CHANGELOG.md`.

## The two boards

| | Reasoning eval | Latency board |
|---|---|---|
| Question | Does the model get six verifiable tasks right, and at what cost and time? | How fast does a short answer start and finish? |
| Cadence | Once a day | Every six hours |
| Thinking mode | On | Off, for the models that have a switch (the row says so) |
| Output cap | 4,000 tokens, thinking included | 120 tokens |
| Prompt | Six fixed tasks in Spanish, identical for every provider | One short prompt, identical for every provider |
| Window shown | Last 14 days, current method version only | Last 7 days |
| Measured from | Our own server (Google Cloud, us-east4) | Same |

Each provider is measured on its default model on this site, named on its row.

## The reasoning eval

**Tasks.** Six tasks, each with exactly one correct answer: an arithmetic product, a weekday calculation across a leap-year February, a JSON extraction with an exact three-key schema, a one-word answer, a well-known trap question, and a question about a date that does not exist. The exact prompts, the system prompt, the expected answers and the grading rule of each task are in `src/eval-tasks.ts`, a verbatim copy of the file the site uses. They are also shown in the "how we measure" panel of the reasoning tab and returned by `GET /api/eval/leaderboard` in its `method` block.

**Grading.** By code, never by another model. Each grader is a deterministic function of the answer text. `test/eval-tasks.test.ts` asserts that every published expected answer passes its own grader.

**What each number is.**

- *Aciertos (accuracy):* correct answers ÷ tasks attempted in the window.
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

One short request per provider every six hours. Shown: median and 90th percentile of the time to the first visible token and of the time to the complete short answer, visible output tokens per second after the first token, and the success rate.

The runner of the latency board is not in this repository yet. Only its published numbers (`results/`) and this description are.

Three clocks rank providers differently, and the page names which one it uses:

1. time to the first visible token of a short answer (the latency board's first column and its badge);
2. time to the complete short answer (the latency board's second column);
3. time to a complete answer with thinking on (the reasoning tab).

A model can lead on the first and be last on the third: it starts quickly, generates slowly, and most of what it generates is thinking.

The ping switches thinking off only for models that offer a switch. A model without one still thinks before its first visible token. The first-token column is therefore not like for like across providers; each row states whether thinking was off.

## What the numbers support

- **The sample is six items.** Every run repeats the same six tasks, so more days add answers and not items. Eighteen correct answers out of eighteen are three runs of six tasks. Counted as answers the 95% Wilson interval is 82% to 100%; counted as items (six of six) it is 61% to 100%. What that supports is "no failure seen on these six tasks", not "100% accurate".
- **It is a health check, not a ranking.** When every provider is at 100% the suite is saturated: it confirms that nothing is broken and cannot rank on accuracy. Cost and time are then the columns that carry information.
- **Small differences are noise.** One task is 16.7 points. With six items only very large gaps between two providers could be told apart reliably.
- **The P90 on the latency board rests on about 28 samples,** so the two or three slowest requests set it. The medians are stable.
- **Scope.** The results describe these tasks, these default models and this server location. They say nothing about long answers, other languages, tools, or general model quality.

## Known limits

- Six items is a very small set, and one of them (the trap question) is a famous puzzle that is almost certainly in training data, so it may test memory.
- The JSON task uses a flat three-key schema: it supports a claim about simple structured output and nothing wider.
- The invalid-premise task tells the model what to answer if the date does not exist, which is the easy version of that probe.
- An answer cut off by the per-task time limit (90 s), as opposed to the token cap, is not marked.
- First-token times are not like for like while thinking can be switched off for some models and not others.

## How to check us

You need Node 22 or later and `npm install` once.

- `GET /api/eval/leaderboard` and `GET /api/arena/leaderboard` on the site are public and return everything the boards show, plus the method block.
- `node analysis/analyze-leaderboard.mjs` (or `npm run analyze`) reads those two endpoints and prints the tables with intervals, the per-item view and the three rankings. It also reads saved files, which is how `analysis.md` in each `results/` folder is made.
- The tasks and graders are in `src/eval-tasks.ts`, and their tests in `test/eval-tasks.test.ts`. Those tests also compare the `method` block saved in each result with `src/eval-tasks.ts`.
- `src/reproduce.ts` runs the six tasks against any OpenAI-compatible chat-completions endpoint with your own key, so you can see the graders applied to a provider's real answers.
- `results/<UTC date>/` holds the two boards as the site published them that day, and the analysis of those two files. A workflow takes a new snapshot every day.

What you cannot reproduce here: our exact times, which depend on where our server is and on its network (yours will be different); the latency board's runner, which is not in this repository yet; and the text of the answers from our daily runs, which is not published. Running `src/reproduce.ts` is an independent check of the tasks and graders on your own key. It is not an audit of our daily runs.

## Published work behind the method

Each source was opened and checked on 2026-11-12. The full list, with what each one implies for us and what was not verified, is in `references/literature.md` and `references/statistics.md`.

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
