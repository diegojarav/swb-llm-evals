# Published work behind the method

What the literature supports in our design, and what it says we should change. Collected on 2026-11-12. Every source in the first two tables was opened that day (the arXiv abstract page, the journal page or the methodology page) and the title, authors, year and claim were checked against it; four were opened a second time independently (Akhtar, Guedes de Souza, Miller, Erol). Findings are paraphrased from abstracts and pages, not from full PDFs, except Hagendorff et al. (full text). "Not peer-reviewed" means an arXiv preprint.

When you cite one of these in a doc, a PR or the site, open it again first: preprints get revised and withdrawn (the arXiv version of Hagendorff et al. was).

## Contents

1. Sources by design choice
2. Secondary sources
3. What the literature says we should change
4. What we can say today
5. Leads that were not opened

## 1. Sources by design choice

| Choice | Source | Finding | What it means here |
|---|---|---|---|
| Code-graded, verifiable tasks | Zhou et al. 2023, "Instruction-Following Evaluation for Large Language Models" (IFEval). https://arxiv.org/abs/2311.07911 | Builds on "verifiable instructions" (25 types, about 500 prompts) because human grading is slow and hard to reproduce and LLM grading can be biased. | Supports code grading, most directly for the one-word and JSON tasks. |
| No LLM judge | Zheng et al. 2023, "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", NeurIPS Datasets and Benchmarks. https://arxiv.org/abs/2306.05685 | LLM judges show position, verbosity and self-enhancement bias. | Supports the choice. The price is that we can only test things with one checkable answer. |
| Small targeted checks | Ribeiro et al. 2020, "Beyond Accuracy: Behavioral Testing of NLP Models with CheckList", ACL. https://arxiv.org/abs/2005.04118 | Held-out accuracy overestimates models; tests organised by capability find failures accuracy hides. | Supports capability-by-capability checks. CheckList generates many cases per capability; we have one item each. |
| What a trustworthy benchmark documents | Reuel et al. 2024, "BetterBench: Assessing AI Benchmarks, Uncovering Issues, and Establishing Best Practices", NeurIPS. https://arxiv.org/abs/2411.12990 | 46 practices across the benchmark lifecycle; most of the 24 benchmarks assessed did not report statistical significance or support replication. | Use it as the documentation checklist. We lack significance reporting and item provenance. |
| Uncertainty | Miller 2024, "Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations". Not peer-reviewed. https://arxiv.org/abs/2411.00640 | Evals are experiments; questions are a sample from a larger population; gives formulas for analysing results and comparing two models. | With six items every accuracy has a wide interval. See `references/statistics.md`. |
| Saturation | Akhtar et al. 2026, "When AI Benchmarks Plateau: A Systematic Study of Benchmark Saturation", ICML. https://arxiv.org/abs/2602.16763 | Of 60 LLM benchmarks, nearly half are saturated, and saturation rises with age. | Four providers at 100% means the board cannot rank them on accuracy. Refresh or harden the items, or say so. |
| The bat-and-ball item | Hagendorff, Fabi and Kosinski 2023, Nature Computational Science 3(10). https://doi.org/10.1038/s43588-023-00527-x | Earlier studies used verbatim Cognitive Reflection Test items that are likely in training data; the authors wrote fresh variants instead. They call memorisation plausible but untested. | Our trap question is the verbatim, famous version. Rewrite it. |
| Same, with numbers changed | Xie et al. 2025, "Do Large Language Models Truly Grasp Mathematics?", CogSci. https://arxiv.org/abs/2410.14979 | Changing the numbers in CRT-style problems cut accuracy by up to about half, including for a reasoning model. | The closest direct evidence that a verbatim item tests memory. No paper found that tests bat-and-ball itself for memorisation. |
| Invalid-premise probe | Kirichenko et al. 2025, "AbstentionBench". Not peer-reviewed. https://arxiv.org/abs/2506.09038 | Twenty datasets including false-premise questions; abstention is unsolved, and reasoning fine-tuning lowers it. | Supports the probe. One item, with the escape hatch written into the prompt, is the easy case. |
| JSON task | Geng et al. 2025, "JSONSchemaBench". Not peer-reviewed. https://arxiv.org/abs/2501.10868 | About 10,000 real-world schemas of varying complexity. | A three-key flat schema is the easy end. Claim "simple JSON", nothing wider. |
| Date task | Fatemi et al. 2024, "Test of Time". Not peer-reviewed. https://arxiv.org/abs/2406.09170 | Uses synthetic temporal data because real-world items may have been seen in pretraining. | Supports generated date items over one fixed date. |
| Cost per correct answer | Erol et al. 2025, "Cost-of-Pass: An Economic Framework for Evaluating Language Models". https://arxiv.org/abs/2504.13359 | Defines cost-of-pass as the expected monetary cost of generating a correct solution. | Same idea as our headline metric. At 100% accuracy it is just cost per request. |
| Token cap as part of the method | Guedes de Souza and Panisson 2026, "Who Thinks Best Depends on How Long You Let Them: Budget-Dependent Rankings in LLM Evaluation". Not peer-reviewed. https://arxiv.org/abs/2608.12150 | Four models, caps from 64 to 4,096 tokens: accuracy sometimes drops as the cap rises even after controlling for truncation, and rankings reverse across budgets. | The cap changes results in both directions. Keep it in the method version and report cut-offs next to accuracy. |
| Truncation mistaken for failure | Lawsen 2025, comment on Shojaee et al. Not peer-reviewed. https://arxiv.org/abs/2506.09250 | Argues that a reported "accuracy collapse" partly reflects output-token limits. | Supports the separate "cut off" category. This is what happened to us with the 800 cap. |
| Re-running daily | Chen, Zaharia and Zou 2023, "How is ChatGPT's behavior changing over time?". https://arxiv.org/abs/2307.09009 | The same hosted models changed noticeably within three months on fixed tasks; the authors call for continuous monitoring. | Supports repeated runs of a fixed set as a drift detector. |
| Latency definitions | Artificial Analysis, API performance methodology v3.0.0 (2026-11-03). https://artificialanalysis.ai/methodology/performance-benchmarking | For reasoning models the first token is a reasoning token; a separate "time to first answer token" includes reasoning time. Runs every six hours and reports medians. | Our cadence matches. Tools define these terms differently, so publish ours: thinking off, first visible token, short answer. |

## 2. Secondary sources (also opened)

- Liang et al. 2023, HELM, TMLR: many metrics per scenario including efficiency; raw prompts and completions released. https://arxiv.org/abs/2211.09110
- Sainz et al. 2023: contamination should be measured per benchmark. https://arxiv.org/abs/2310.18018
- Atil et al. 2024: accuracy varies between runs even in settings meant to be deterministic. https://arxiv.org/abs/2408.04667
- Tam et al. 2024: format restrictions reduce reasoning accuracy, more so when stricter. https://arxiv.org/abs/2408.02442
- Kapoor et al. 2024, "AI Agents That Matter": report accuracy and cost together. https://arxiv.org/abs/2407.01502
- Chen X. et al. 2024: reasoning models overthink simple problems, which is what the reasoning-share column shows. https://arxiv.org/abs/2412.21187
- NVIDIA technical blog, April 2025: definitions of time to first token, end-to-end latency and inter-token latency (vendor documentation). https://developer.nvidia.com/blog/llm-benchmarking-fundamental-concepts

## 3. What the literature says we should change

Ranked. None of these is done unless METHODOLOGY.md or CHANGELOG.md says so; each one changes the method, so each one is a decision for the maintainers and a new method version.

1. **Show uncertainty and the real sample size.** The sample is six items, not 84 answers, because the same six repeat. (Miller; BetterBench)
2. **Treat saturation openly.** Add harder or refreshed items, or keep saying that the board cannot rank at the ceiling. (Akhtar)
3. **Replace the verbatim bat-and-ball and parametrise items.** Vary the numbers and the wording; generate the operands and dates of the arithmetic and calendar tasks. (Hagendorff; Xie; Fatemi)
4. **Keep code grading; publish prompts, graders, raw outputs and an item-by-capability table.** (IFEval; Zheng; CheckList; BetterBench)
5. **Report the cut-off rate next to accuracy and keep the cap in the method version.** (Guedes de Souza; Lawsen)
6. **More than one false-premise item, some without the "answer NO_EXISTE" escape hatch.** (AbstentionBench)
7. **Narrow the structured-output claim to "simple JSON".** (JSONSchemaBench)
8. **Publish latency definitions and sample counts.** (Artificial Analysis)

## 4. What we can say today

It is a daily check on six small tasks with exactly one correct answer each, graded by code and not by another model. When every provider gets every task right, the board shows that they all pass these tasks, not that they are equally good. Six tasks are too few to separate close providers, and one of them is a famous puzzle that models may have memorised. Answers cut off by the token limit are reported separately from wrong ones. Cost per correct answer and reasoning share describe this setup at these list prices. The latency board measures one short prompt with thinking off, from our own server, and does not predict speed on long or reasoning-heavy requests.

## 5. Leads that were not opened

Surfaced by search on 2026-11-12, not verified. Do not cite without opening them: arXiv 2507.04023 (reasoning models at low token caps), 2511.14366 (truncation rates at a 32k cap), 2511.09993 (cross-calendar date reasoning), 2601.07148 (time puzzles).
