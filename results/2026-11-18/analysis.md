# Eval boards: what the numbers support

Source: saved responses. Reasoning board updated 2026-11-18T08:00:57.103Z, latency board updated 2026-11-18T15:00:10.002Z.

## Reasoning eval

| Provider | Runs | Correct answers | Accuracy | 95% interval, answers | Items always passed | 95% interval, items | Cut off | Reasoning share | Time to answer | Cost / 1,000 correct |
|---|---|---|---|---|---|---|---|---|---|---|
| groq | 9 | 54/54 | 100.0% | 93.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.3% | 0.5 s | $0.08 |
| cerebras | 9 | 54/54 | 100.0% | 93.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 89.3% | 0.2 s | $0.11 |
| gemini | 9 | 54/54 | 100.0% | 93.4% to 100.0% | 6/6 | 61.0% to 100.0% | 0 | 97.9% | 2.5 s | $2.33 |
| nvidia | 9 | 53/54 | 98.1% | 90.2% to 99.7% | 5/6 | 43.6% to 97.0% | 0 | 98.5% | 6.2 s | no published price |

Both intervals are Wilson intervals. The answer-level one treats every answer as independent, which it is not: the same 6 items repeat every run. The item-level one counts an item as passed only if it was right every time, and is the one to quote for a claim about ability.

Items that separate providers: strict-format.

## Latency board

| Provider | Thinking in the ping | Samples | Success | First token (median / P90) | Complete short answer (median / P90) | Pings cut off at the cap | Tokens per second | Samples behind the P90 |
|---|---|---|---|---|---|---|---|---|
| cerebras | on | 29 | 29/29 (88.3% to 100.0%) | 301 / 407 ms | 356 / 459 ms | 0 | 1745 | 3 |
| groq | on | 29 | 29/29 (88.3% to 100.0%) | 461 / 694 ms | 654 / 866 ms | 0 | 525 | 3 |
| gemini | on | 29 | 29/29 (88.3% to 100.0%) | 3545 / 4419 ms | 3842 / 4716 ms | 0 | 280 | 3 |
| nvidia | off | 29 | 29/29 (88.3% to 100.0%) | 161 / 289 ms | 953 / 1759 ms | 0 | 107 | 3 |

Ping method version 3, output cap 1000 tokens (thinking included). A cut-off ping's time is when the tokens ran out, not the time to a complete answer.

## Where the two boards disagree

- By first token: nvidia < cerebras < groq < gemini
- By complete short answer: cerebras < groq < nvidia < gemini
- By complete answer with thinking on: cerebras < groq < gemini < nvidia
- First token: nvidia leads. Complete short answer: cerebras leads. A badge that says "fastest" has to say which of the two it means.
- nvidia is first to the first token (thinking off, short answer) and last to a complete answer in the reasoning eval (thinking on). Both are real; they are different clocks.
- nvidia was pinged with thinking switched off; cerebras, groq, gemini still think before their first visible token. The first-token column is not like for like.
