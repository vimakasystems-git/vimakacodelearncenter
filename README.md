# Vimaka Code Academy / CodePath

A free, open-source learning center for Python, Go, JavaScript and Java, by Vimaka Sistemas Inteligentes.

## Included

- Responsive learning dashboard and an IDE-style editor with code export.
- 24 explained source examples and 24 exercise prompts.
- Python execution with Pyodide and JavaScript execution in browser Web Workers.
- External playground links and manual output checks for Go and Java.
- Output-based reviews, basic style hints, lesson ratings, local progress, XP and badges.
- Six professional project roadmaps: data, web, cloud, enterprise, health technology and finance.
- AWS, Microsoft Azure, Google Cloud and Oracle Cloud architecture models with Python starter templates, requirements exports, documentation and pattern-based exercises.
- Public GitHub repository lookup and a manual code export/upload workflow.

## Run locally

Requires Python 3 for the static development server; no build step or npm dependencies.

```sh
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. The source is in `dist/` and can be hosted by any static host. Python runtime loading, Google Fonts and GitHub repository lookup require internet access. Pyodide is pinned to 0.27.7 from jsDelivr.

## Project files

- `dist/index.html`: application shell
- `dist/style.css`: responsive styles
- `dist/app.js`: language content, editor, workers, reviews and local persistence
- `dist/cloud.js`: cloud models, templates and exercises

## Verification

```sh
node --check dist/app.js
node --check dist/cloud.js
```

Browser checks performed: Python example execution, JavaScript solution output check and XP award, public GitHub repository retrieval and career roadmap navigation. Cloud templates are illustrative, not deployed or integration-tested.

## Honest scope

This release is a foundation curriculum with introductory intermediate/advanced concepts, not a complete professional certification course. Professional journeys are project roadmaps. There is no backend, account sync, AI reviewer or shared leaderboard. Go/Java use manual external checks and cannot earn verified XP yet; badges requiring those languages stay locked. Output checks use one expected output and do not prove algorithmic correctness. Cloud exercise reviews check text patterns only.

Progress and personal ratings are stored in browser localStorage. Browser workers terminate after 30 seconds. JavaScript execution is intended for learner-authored code, not a hardened service for running hostile code. Do not add authenticated backend APIs without reviewing execution isolation.

GitHub lookup reads public repositories using the unauthenticated API and is subject to rate limits. OAuth, private repository reads, automatic commits and account linking are not implemented. Never put GitHub tokens or cloud credentials in the frontend.

Cloud learning is free; external cloud resources may incur provider charges. Templates do not provision resources. Follow each provider's official runtime and authentication documentation before deployment.

## Contributing

Read CONTRIBUTING.md. Contributions to lesson coverage, accessibility, test cases and isolated language runtimes are welcome.

## License

MIT. Copyright (c) 2026 Vimaka Sistemas Inteligentes.

Third-party runtimes, fonts and providers retain their own licenses and trademarks. This project is not affiliated with or endorsed by the cloud providers.
