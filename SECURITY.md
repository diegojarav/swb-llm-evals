# Security

## What to report here

A problem in the scripts or workflows of this repository: `src/reproduce.ts`, `analysis/analyze-leaderboard.mjs`, `scripts/snapshot.mjs` and `.github/workflows/`. For example, a way to make one of them leak a key, write outside `results/` or run something that came from a response.

## How

Use the "Report a vulnerability" button under the Security tab of this repository. That report is private. Please do not open a public issue for it, and never put an API key or any other secret in an issue or a pull request.

The website itself is not in this repository. For a problem with the site, use the contact page of https://www.saharaworldbusiness.com.

## Before you run the script with your key

`src/reproduce.ts` sends your API key only to the endpoint you pass with `--base-url`. Read it before you run it, and prefer a key you can revoke.
