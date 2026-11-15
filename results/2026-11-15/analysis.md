# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-15T08:01:12.174Z, latency board updated 2026-11-15T15:00:08.582Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 6 | 36/36 | 100.0% | 90.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.3% | 0.5 s | $0.08 |
| cerebras | 6 | 36/36 | 100.0% | 90.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 88.9% | 0.2 s | $0.10 |
| gemini | 6 | 36/36 | 100.0% | 90.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.9% | 2.5 s | $2.31 |
| nvidia | 6 | 35/36 | 97.2% | 85.8% to 99.5% | 5/6 | 43.6% to 97.0% | 0 | 98.6% | 6.9 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

Items that separate providers: strict-format.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|---|
| cerebras | on | 17 | 17/17 (81.6% to 100.0%) | 301 / 360 ms | 351 / 438 ms | 0 | 1799 | 2 |
| groq | on | 17 | 17/17 (81.6% to 100.0%) | 505 / 694 ms | 642 / 799 ms | 0 | 540 | 2 |
| gemini | on | 17 | 17/17 (81.6% to 100.0%) | 3541 / 4419 ms | 3819 / 4713 ms | 0 | 265 | 2 |
| nvidia | off | 17 | 17/17 (81.6% to 100.0%) | 163 / 289 ms | 1093 / 1759 ms | 0 | 96 | 2 |

Ping method version 3, output cap 1000 tokens (thinking included). A cut-off ping's time is when the tokens ran out, not the time to a complete answer.

A P90 from fewer than 29 samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
