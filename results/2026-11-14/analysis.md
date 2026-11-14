# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-14T08:00:58.365Z, latency board updated 2026-11-14T15:00:08.616Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 5 | 30/30 | 100.0% | 88.6% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.3% | 0.5 s | $0.08 |
| cerebras | 5 | 30/30 | 100.0% | 88.6% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 88.4% | 0.2 s | $0.10 |
| gemini | 5 | 30/30 | 100.0% | 88.6% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.9% | 2.7 s | $2.30 |
| nvidia | 5 | 29/30 | 96.7% | 83.3% to 99.4% | 5/6 | 43.6% to 97.0% | 0 | 98.4% | 6.9 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

Items that separate providers: strict-format.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|---|
| cerebras | on | 13 | 13/13 (77.2% to 100.0%) | 297 / 360 ms | 336 / 438 ms | 0 | 1799 | 1 |
| groq | on | 13 | 13/13 (77.2% to 100.0%) | 416 / 625 ms | 595 / 777 ms | 0 | 529 | 1 |
| gemini | on | 13 | 13/13 (77.2% to 100.0%) | 3545 / 4419 ms | 3842 / 4713 ms | 0 | 263 | 1 |
| nvidia | off | 13 | 13/13 (77.2% to 100.0%) | 163 / 283 ms | 1155 / 1759 ms | 0 | 87 | 1 |

Ping method version 3, output cap 1000 tokens (thinking included). A cut-off ping's time is when the tokens ran out, not the time to a complete answer.

A P90 from fewer than 29 samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
