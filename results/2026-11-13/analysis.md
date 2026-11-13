# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-13T08:00:44.400Z, latency board updated 2026-11-13T15:00:09.908Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 4 | 24/24 | 100.0% | 86.2% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.1% | 0.5 s | $0.08 |
| cerebras | 4 | 24/24 | 100.0% | 86.2% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 87.9% | 0.2 s | $0.09 |
| gemini | 4 | 24/24 | 100.0% | 86.2% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.8% | 2.7 s | $2.31 |
| nvidia | 4 | 24/24 | 100.0% | 86.2% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 98.3% | 6.9 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

**Saturated:** every measured provider is at 100%. The suite confirms that nothing is broken; it cannot rank these providers on accuracy. Cost and time are the only columns that separate them.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|---|
| cerebras | on | 9 | 9/9 (70.1% to 100.0%) | 297 / 407 ms | 336 / 438 ms | 0 | 1810 | 1 |
| groq | on | 9 | 9/9 (70.1% to 100.0%) | 416 / 694 ms | 592 / 799 ms | 0 | 529 | 1 |
| gemini | on | 9 | 9/9 (70.1% to 100.0%) | 3891 / 4916 ms | 4126 / 5222 ms | 0 | 263 | 1 |
| nvidia | off | 9 | 9/9 (70.1% to 100.0%) | 163 / 320 ms | 1382 / 1838 ms | 0 | 83 | 1 |

Ping method version 3, output cap 1000 tokens (thinking included). A cut-off ping's time is when the tokens ran out, not the time to a complete answer.

A P90 from fewer than 29 samples has no proper 95% interval: read it as "the two or three slowest requests", not as a stable figure.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
