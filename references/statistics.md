# Statistics for these boards

The guidance behind how `analysis/analyze-leaderboard.mjs` reports the numbers, with the sources and worked numbers. Collected on 2026-11-12. Every source in the table was opened that day; what was read is noted where it was less than the full text. Open a source again before citing it outside this repository.

## Contents

1. Sources
2. Formulas with our numbers
3. What was not verified

## 1. Sources

| Topic | Source | Guidance | Use here |
|---|---|---|---|
| Evals as experiments | Miller 2024, "Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations". https://arxiv.org/abs/2411.00640 (full text read) | Questions are a sample from a population. Report a standard error and an interval. When questions are related, use the clustered standard error; in his example it was about three times the naive one. Compare two models on the paired per-question differences. Re-asking the same question K times only shrinks the within-question part of the variance. | The six tasks are the independent units. Running them every day does not add items. |
| Small samples | Bowyer, Aitchison and Ivanova 2025, "Position: Don't Use the CLT in LLM Evals With Fewer Than a Few Hundred Datapoints", ICML. https://arxiv.org/abs/2503.01747 (main text read, appendices not) | Normal-approximation intervals under-cover with small N and collapse to zero width at 0% or 100%. Use Wilson or a Beta-Bernoulli Bayesian interval; Clopper-Pearson is wider than needed. For clustered data only a Bayesian clustered model kept correct coverage in their simulations. | The closest published match to a six-item board at 100%. |
| Which binomial interval | Brown, Cai and DasGupta 2001, "Interval Estimation for a Binomial Proportion", Statistical Science 16(2). https://doi.org/10.1214/ss/1009213286 (abstract and metadata only) | The Wald interval's coverage is erratic. Recommends Wilson or Jeffreys for small n. | Basis for Wilson in the script. |
| Power | Card et al. 2020, "With Little Power Comes Great Responsibility", EMNLP. https://arxiv.org/abs/2010.06595 | Underpowered comparisons are common in NLP; do the power analysis. | Supports stating the smallest difference the suite could detect. |
| Variance between runs | Madaan et al. 2024, "Quantifying Variance in Evaluation Benchmarks". https://arxiv.org/abs/2406.10229 (abstract only) | Small score gaps are over-interpreted; item analysis did not meaningfully reduce variance. | Do not expect item-response theory to rescue a small set. |
| Run-to-run instability | Atil et al. 2024, "Non-Determinism of Deterministic LLM Settings". https://arxiv.org/abs/2408.04667 | Accuracy moved by up to 15% between runs at settings meant to be deterministic. | Repeated runs measure stability. They are not new evidence about ability. |
| Choosing items | Polo et al. 2024, "tinyBenchmarks". https://arxiv.org/abs/2402.14992 | About 100 well-chosen items per scenario estimated large-benchmark accuracy within about 2%. | Argues for informative items. It does not show that six are enough. |
| Drift exists | Chen, Zaharia and Zou 2023, "How is ChatGPT's behavior changing over time?". https://arxiv.org/abs/2307.09009 | The same hosted model fell from 84% to 51% on a fixed task in three months. | Why a daily fixed set is worth running. Gives no detection method. |
| Detecting a shift | NIST/SEMATECH e-Handbook of Statistical Methods, section 6.3.2.3, CUSUM control charts. https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc323.htm | Accumulate deviations from a baseline beyond an allowance k; alarm past a threshold h. More sensitive to small sustained shifts than a single-point rule. | The simple method for "did this provider get worse". |
| Percentiles, not means | Ewaschuk, "Monitoring Distributed Systems", Site Reliability Engineering, chapter 6. https://sre.google/sre-book/monitoring-distributed-systems/ | An average can hide a slow tail. | Why the latency board shows median and P90. |
| Interval for a percentile | Ford 2025, "Distribution-Free Confidence Intervals for Percentiles", University of Virginia StatLab (teaching article). | The coverage of an interval between two order statistics follows the binomial distribution, with no assumption about the data. | How many samples a P90 needs. |
| Ratio metrics | von Luxburg and Franz 2009, "A Geometric Approach to Confidence Sets for Ratios", Statistica Sinica 19(3). https://arxiv.org/abs/0711.0198 | Confidence sets for a ratio of means; they can be unbounded when the denominator is near zero. | Cost per correct answer is a ratio; it is unstable when few answers are correct. |

## 2. Formulas with our numbers

**Wilson interval**, k correct of n, z = 1.96 (z² = 3.8415):

    centre = (k/n + z²/2n) / (1 + z²/n)
    half   = z * sqrt( (k/n)(1 - k/n)/n + z²/4n² ) / (1 + z²/n)

At 100% it reduces to: lower bound = n / (n + z²).

| Case | Wilson 95% | Notes |
|---|---|---|
| 18 of 18, counted as 18 independent answers | 82.4% to 100% | 18 / 21.84. Too narrow: the answers are not independent. |
| 6 of 6 items | 61.0% to 100% | The honest view of the same result: six items. Clopper-Pearson lower bound 54.1%. |
| 61 of 84 (an old version-1 row), counted as independent | 62.3% to 81.0% | Centre 0.716, half-width 0.094. |
| 28 of 28 successful requests | 87.9% to 100% | 28 / 31.84. |

**Clustering.** With items as clusters the standard error comes from the spread of the per-item pass rates, not from the count of answers. For an old version-1 row, a split such as 14, 14, 14, 14, 5, 0 passes of 14 gives a clustered standard error near 0.16, more than three times the naive 0.049, and a normal interval that runs past 100%. That is why the answer-level interval must not be read as the uncertainty of the score.

**Smallest detectable difference.** With Miller's illustrative between-question variance (1/9, his example value, not measured on our items) the smallest paired difference detectable at 80% power is about 38 points with 6 items, 22 with 18, 10 with 84. One task is 16.7 points. More daily runs do not move this floor; more items do.

**P90 from n samples.** The 90th percentile sits near rank 0.9 × (n + 1). With n = 28 that is between the 25th and 26th value: two or three slow requests set it. A two-sided distribution-free 95% interval for a P90 does not exist below n = 29 (0.9^28 + 0.1^28 = 0.052 > 0.05).

**Rule of three.** Zero failures in N independent trials gives a 95% upper bound of about 3/N on the failure rate: 3/18 = 16.7%, 3/6 = 50%.

**CUSUM, tabular form.** For a daily value x with baseline m and allowance k (half the shift worth detecting):

    S_hi(i) = max(0, S_hi(i-1) + x(i) - m - k)
    S_lo(i) = max(0, S_lo(i-1) + m - k - x(i))

Alarm when either passes the threshold h (a common choice is 4 to 5 standard deviations). At a 100% baseline the standard deviation is zero, so use a floor (for instance, treat the baseline failure rate as 1 in 20) instead of the observed zero.

**Cost per correct answer** is sum(cost) ÷ sum(correct). For an interval, resample whole days with replacement, recompute the ratio each time and take the 2.5th and 97.5th percentiles. Flag the figure when correct answers are few.

## 3. What was not verified

- Brown et al. 2001 full text; Hahn and Meeker, "Statistical Intervals" (the standard reference for percentile intervals); the original CUSUM and bootstrap texts. The guidance attributed to them above is the standard reading and the NIST handbook and the StatLab article were opened in their place.
- The rule of three was confirmed only through a 1995 JAMA letter that restates it.
- Time-of-day effects and autocorrelation in six-hourly latency samples are engineering judgement, not from a source.
