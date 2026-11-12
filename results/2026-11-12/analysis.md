# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-12T17:33:26.997Z, latency board updated 2026-11-12T15:00:16.716Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 3 | 18/18 | 100.0% | 82.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.1% | 0.5 s | $0.08 |
| cerebras | 3 | 18/18 | 100.0% | 82.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 88.0% | 0.2 s | $0.10 |
| gemini | 3 | 18/18 | 100.0% | 82.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.8% | 2.7 s | $2.27 |
| nvidia | 3 | 18/18 | 100.0% | 82.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 98.4% | 6.9 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

**Saturated:** every measured provider is at 100%. The suite confirms that nothing is broken; it cannot rank these providers on accuracy. Cost and time are the only columns that separate them.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|
| cerebras | on | 28 | 28/28 (87.9% to 100.0%) | 299 / 404 ms | 337 / 444 ms | 1850 | 3 |
| groq | on | 28 | 28/28 (87.9% to 100.0%) | 523 / 703 ms | 659 / 879 ms | 413 | 3 |
| nvidia | off | 28 | 28/28 (87.9% to 100.0%) | 180 / 470 ms | 1317 / 6903 ms | 65 | 3 |
| gemini | on | 28 | 28/28 (87.9% to 100.0%) | 1504 / 1731 ms | 1512 / 1742 ms | n/a | 3 |

A P90 from fewer than 29 samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
