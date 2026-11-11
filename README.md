# Vimaka Code Learn Center

Free, MIT-licensed education for Python, Go, JavaScript and Java, by Vimaka Sistemas Inteligentes.

## Features

- 24 explained examples and 24 practice prompts, exercise output checks, personal ratings, XP and badges.
- Browser IDE with standard input, terminal output, runtime errors, cancellation and source export.
- Python using Pyodide 0.27.7 in a dedicated browser worker; JavaScript supports top-level await in a fresh worker.
- Go 1.22.8 and Java 22 compile through a server-side Wandbox adapter. Python has an optional Wandbox fallback.
- Shared interview rooms: company and candidate invitation links, candidate-owned code, shared stdin/output, two-way chat, presence, suggested timer, session export and company-controlled ending.
- Six career roadmaps and AWS, Azure, Google Cloud and Oracle Cloud models with editable Python templates.
- Public GitHub repository lookup and source export.

## Development

Requires Node.js 24+. There are no npm dependencies.

```sh
npm run dev
```

Open http://localhost:4173. Development uses a file-backed local storage adapter under ignored `.sites-runtime/`. It is not a production database. Run on localhost or behind HTTPS to use the clipboard and browser workers.

```sh
npm test
npm run build
```

Source assets are in `public/`, the HTTP API in `worker/index.js`, and tests in `tests/`. The deterministic build embeds assets into `dist/server/index.js`, a Cloudflare Worker ES module. `dist/` is generated and not edited directly.

## Deployment

Deploy `dist/server/index.js` as a Cloudflare Worker with an R2 bucket binding named `BUCKET`. `wrangler.example.json` is a sample configuration; replace the bucket name with your own. The app needs no provider credentials for its current compiler adapter. Do not commit cloud credentials or API tokens.

The ChatGPT Sites deployment uses its own `.openai/hosting.json` and preserves its existing access policy. Both company and candidate must have permission to visit the hosted site as well as a valid room invitation. A private site cannot be accessed by an external candidate merely by copying an interview link.

## Execution behavior

Dedicated same-origin worker files replace blob-generated workers. The worker response permits Pyodide's runtime compilation while the document does not allow eval. Stdout is joined with real newline characters. Python supports line-based input through the stdin panel; JavaScript receives stdin as a string. Empty stdin returns end-of-input.

Local Python downloads its runtime from jsDelivr on first run. A slow or blocked network produces a visible error; the optional cloud fallback sends code and stdin to Wandbox. Java and Go always use Wandbox when Run is clicked. Source is not intentionally saved by our adapter (`save: false`), but external processing is still subject to Wandbox's policies and availability. Do not submit confidential code. Remote compilation can take up to 90 seconds; Stop cancels the local request and cannot guarantee cancellation of an already submitted remote job.

Wandbox compiles Java as `prog.java`. The adapter removes the public modifier from top-level class declarations so single-file examples using `public class Main` compile; source exports keep the original text. Multi-file projects and Java package layouts are not supported.

Output checks compare a single expected stdout after successful execution. Style hints and cloud template checks are basic heuristics, not an AI review or proof of algorithmic correctness. Career journeys are project roadmaps; this release is not a complete professional certification course.

## Interview sessions and privacy

Company creates a room; the candidate can edit and run code, both roles can chat, and only the company can end it. The company has a read-only solution view. Updates poll about every two seconds. Revision checks and R2 ETag compare-and-swap prevent stale writes; unsaved candidate drafts are preserved in sessionStorage. This is a single-writer interview editor, not a simultaneous multi-author CRDT editor.

Invitation tokens are random bearer capabilities, carried in URL fragments and hashed before storage. Anyone with the company link has company access; anyone with the candidate link has candidate access. Keep them separate and private. Room access expires 24 hours after creation. Records remain in the R2 bucket until deleted by your storage retention policy; configure a lifecycle rule for the `interviews/` prefix if deploying independently. There is no recording, automated hiring score, or identity verification. Export includes the room's challenge, code, output and shared conversation, not invitation tokens.

Progress/ratings are localStorage-only and not account-synced. Interview invitations and unsaved drafts use sessionStorage. GitHub lookup is public-only; OAuth, automatic commits and private repository reads are not included.

## Verification

Tests cover two roles sharing code/chat, invalid tokens, company/candidate permissions, stale revisions, session expiry and cross-origin write rejection. Browser QA covers local Python input/multiline output, async JavaScript and a company/candidate session with synchronized edits, chat and output. Provider compilers depend on external service availability.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE), copyright 2026 Vimaka Sistemas Inteligentes. Third-party runtimes, fonts and cloud providers retain their licenses and trademarks.
