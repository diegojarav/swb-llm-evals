# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-25T08:00:54.946Z, latency board updated 2026-11-25T15:00:07.935Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 16 | 96/96 | 100.0% | 96.2% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.8% | 0.6 s | $0.08 |
| cerebras | 16 | 95/96 | 99.0% | 94.3% to 99.8% | 5/6 | 43.6% to 97.0% | 0 | 89.1% | 0.2 s | $0.10 |
| gemini | 16 | 96/96 | 100.0% | 96.2% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.9% | 2.4 s | $2.35 |
| nvidia | 15 | 89/90 | 98.9% | 94.0% to 99.8% | 5/6 | 43.6% to 97.0% | 0 | 98.6% | 4.5 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

Items that separate providers: date-interval, strict-format.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|---|
| cerebras | on | 28 | 28/28 (87.9% to 100.0%) | 307 / 401 ms | 350 / 455 ms | 0 | 1793 | 3 |
| groq | on | 28 | 28/28 (87.9% to 100.0%) | 430 / 602 ms | 630 / 758 ms | 0 | 531 | 3 |
| gemini | on | 28 | 28/28 (87.9% to 100.0%) | 3492 / 4825 ms | 3754 / 5077 ms | 0 | 307 | 3 |
| nvidia | off | 28 | 28/28 (87.9% to 100.0%) | 155 / 188 ms | 735 / 1213 ms | 0 | 150 | 3 |

Ping method version 3, output cap 1000 tokens (thinking included). A cut-off ping's time is when the tokens ran out, not the time to a complete answer.

A P90 from fewer than 29 samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
