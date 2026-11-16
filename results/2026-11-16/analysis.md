# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-16T08:00:44.100Z, latency board updated 2026-11-16T15:00:10.461Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 7 | 42/42 | 100.0% | 91.6% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.1% | 0.5 s | $0.08 |
| cerebras | 7 | 42/42 | 100.0% | 91.6% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 88.7% | 0.2 s | $0.10 |
| gemini | 7 | 42/42 | 100.0% | 91.6% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.8% | 2.5 s | $2.30 |
| nvidia | 7 | 41/42 | 97.6% | 87.7% to 99.6% | 5/6 | 43.6% to 97.0% | 0 | 98.6% | 6.9 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

Items that separate providers: strict-format.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|---|
| cerebras | on | 21 | 21/21 (84.5% to 100.0%) | 297 / 347 ms | 338 / 413 ms | 0 | 1810 | 2 |
| groq | on | 21 | 21/21 (84.5% to 100.0%) | 505 / 694 ms | 654 / 799 ms | 0 | 531 | 2 |
| gemini | on | 21 | 21/21 (84.5% to 100.0%) | 3541 / 4367 ms | 3819 / 4713 ms | 0 | 279 | 2 |
| nvidia | off | 21 | 21/21 (84.5% to 100.0%) | 161 / 283 ms | 1018 / 1712 ms | 0 | 102 | 2 |

Ping method version 3, output cap 1000 tokens (thinking included). A cut-off ping's time is when the tokens ran out, not the time to a complete answer.

A P90 from fewer than 29 samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
