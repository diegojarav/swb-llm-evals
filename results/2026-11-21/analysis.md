# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-21T08:00:59.451Z, latency board updated 2026-11-21T15:00:08.224Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 12 | 72/72 | 100.0% | 94.9% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.8% | 0.6 s | $0.08 |
| cerebras | 12 | 72/72 | 100.0% | 94.9% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.4% | 0.2 s | $0.11 |
| gemini | 12 | 72/72 | 100.0% | 94.9% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.9% | 2.4 s | $2.33 |
| nvidia | 11 | 65/66 | 98.5% | 91.9% to 99.7% | 5/6 | 43.6% to 97.0% | 0 | 98.6% | 6.2 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

Items that separate providers: strict-format.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|---|
| cerebras | on | 28 | 28/28 (87.9% to 100.0%) | 307 / 418 ms | 363 / 459 ms | 0 | 1621 | 3 |
| groq | on | 28 | 28/28 (87.9% to 100.0%) | 457 / 651 ms | 667 / 866 ms | 0 | 517 | 3 |
| gemini | on | 28 | 28/28 (87.9% to 100.0%) | 3641 / 4509 ms | 3919 / 4772 ms | 0 | 293 | 3 |
| nvidia | off | 28 | 28/28 (87.9% to 100.0%) | 161 / 267 ms | 772 / 1213 ms | 0 | 136 | 3 |

Ping method version 3, output cap 1000 tokens (thinking included). A cut-off ping's time is when the tokens ran out, not the time to a complete answer.

A P90 from fewer than 29 samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
