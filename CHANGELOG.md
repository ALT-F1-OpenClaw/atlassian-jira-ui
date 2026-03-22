## [1.57.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.11...v1.57.0) (2026-03-22)

### Features

* smart startup — login screen when no auth, no 401 spam ([92c2b19](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/92c2b193cdeb087f28fd693e4ca9fad008cf5611))
## [1.56.11](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.10...v1.56.11) (2026-03-22)

### Bug Fixes

* service worker no longer caches error responses (401/500) ([32ae233](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/32ae233e5ffff5dc454845fdd6a888ed26c75f82))
## [1.56.10](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.9...v1.56.10) (2026-03-17)

### Bug Fixes

* persist OAuth state tokens to file — fixes invalid_state on callback ([a604c61](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/a604c612e8f09ea6b078eda35222904c2d83155b))
## [1.56.9](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.8...v1.56.9) (2026-03-17)

### Bug Fixes

* persist OAuth sessions to file — survive container restarts ([24b626a](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/24b626ae09f420e791f585a05caad9377f1aceec))
## [1.56.8](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.7...v1.56.8) (2026-03-17)
## [1.56.7](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.6...v1.56.7) (2026-03-17)

### Features

* list all OAuth scopes in Settings + move About below Settings in nav ([1d73269](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/1d7326980e7ccb097999e6f52b53634d6fb66557))
## [1.56.6](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.5...v1.56.6) (2026-03-17)

### Features

* show OAuth scope help when no sprints visible ([4f68007](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/4f6800722fbfad974c62f0478a94309253ca0194))
## [1.56.5](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.4...v1.56.5) (2026-03-17)

### Bug Fixes

* add Jira Software (Agile) OAuth scopes — boards, sprints, epics ([8b19a57](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/8b19a57d4d910a71fc7ad7285c4458677b040594))
## [1.56.4](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.3...v1.56.4) (2026-03-17)

### Bug Fixes

* OAuth cookie — set secure=False behind Traefik TLS termination ([78dcc7f](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/78dcc7f189ee4b40259e32db64a9ede6a93b1dae))
## [1.56.3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.2...v1.56.3) (2026-03-17)

### Bug Fixes

* add manage:jira-project scope to OAuth — required for project creation ([3c4bc12](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/3c4bc12c24f2c2074cfe28e5f6564d6603cc9612))
## [1.56.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.1...v1.56.2) (2026-03-17)

### Bug Fixes

* OAuth login routing — add /auth to Traefik + fix callback URL detection ([1dce2dc](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/1dce2dc935040304e2045e34ce06fe7df01031ff))
## [1.56.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.56.0...v1.56.1) (2026-03-17)

### Bug Fixes

* friendly error screen for 401 — guides user to Login or Settings ([2169cf5](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/2169cf5751e79766fffd43a6185dc65043ffd636))
## [1.56.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.55.0...v1.56.0) (2026-03-17)

### Features

* Strategy Pattern for dual auth — API Token + OAuth coexist with toggles ([9218161](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/92181612da646fe57b557ae713c16311f9783516))
## [1.55.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.54.2...v1.55.0) (2026-03-17)

### Features

* per-user session management — OAuth tokens route API calls ([#31](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/31)) ([45519c9](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/45519c9adce4bed9f277f3e661b5fa5d522559cb))
## [1.54.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.54.1...v1.54.2) (2026-03-17)

### Bug Fixes

* add Save button to OAuth section in Settings ([f111bd6](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/f111bd617ea88db2007479f20e01ed989f6edb45))
## [1.54.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.54.0...v1.54.1) (2026-03-17)
## [1.54.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.53.5...v1.54.0) (2026-03-17)

### Features

* OAuth 2.0 (3LO) — Login with Atlassian ([#30](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/30)) ([8d2ff36](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/8d2ff36627c87a31362ddbdca64ebfe09dcf0b9d))
## [1.53.5](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.53.4...v1.53.5) (2026-03-17)

### Bug Fixes

* Settings breadcrumb + auth explanation section ([f9264d3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/f9264d3eecbacb2cc4482f2a7d2a7bf7f4d17870))
## [1.53.4](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.53.3...v1.53.4) (2026-03-16)
## [1.53.3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.53.2...v1.53.3) (2026-03-16)

### Bug Fixes

* **ci:** ci-autofix HEREDOC quoting crash — use --body-file instead (fixes [#33](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/33)) ([449ed5b](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/449ed5bd37a4c10d0f483a4a41377687a7f91373))
## [1.53.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.53.1...v1.53.2) (2026-03-16)

### Bug Fixes

* pin @tiptap/* to 3.20.1 — v3.20.3 ships without dist/ files ([efb423b](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/efb423b72014dfe4684feede38b9a9527f28b0ef)), closes [#29](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/29)
## [1.53.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.53.0...v1.53.1) (2026-03-16)

### Features

* ALT-F1 footer branding on every page ([#40](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/40)) ([e2d57de](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/e2d57de2449869def2a68e4dab4e4b7bd5ce9a9c))
## [1.53.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.52.3...v1.53.0) (2026-03-16)

### Features

* 'Open in Jira' button on issues — list view, board cards, detail panel ([#51](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/51)) ([26bb920](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/26bb9207b51e714c3284c05656d6bc870ee6694b))
## [1.52.3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.52.2...v1.52.3) (2026-03-16)
## [1.52.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.52.1...v1.52.2) (2026-03-16)

### Features

* move timer inline next to issue key in detail panel header ([a857ad0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/a857ad060b5079546e126abc3f89a116cac59c39))
## [1.52.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.52.0...v1.52.1) (2026-03-16)

### Features

* issue detail panel now opens at 90% page width ([0ff5dac](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/0ff5dacff27b2364570d66865a38b67f63fa99b4))
## [1.52.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.51.0...v1.52.0) (2026-03-16)

### Features

* OAuth 2.0 config in Settings — Client ID, Client Secret, callback URL ([6a3682c](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/6a3682c33524ac3a792157e06c0871b0dd428d95))
## [1.51.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.50.1...v1.51.0) (2026-03-16)

### Features

* searchable sprint selector — type-to-filter on Sprint Dashboard ([#50](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/50)) ([967d824](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/967d824cfb1f488e2f8bf7079bb4eed11f56ed37)), closes [#29](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/29) [#41](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/41)
## [1.50.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.50.0...v1.50.1) (2026-03-16)

### Bug Fixes

* truncate masked API token display to prevent overflow ([d21cfa8](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/d21cfa8c16d2bc423c81b1c878230bc70ca1d71f))
## [1.50.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.49.2...v1.50.0) (2026-03-16)

### Features

* Settings page — view/edit Jira connection with Test Connection ([d354266](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/d3542669306c30d6ce285725b620c3c51d031a8a))
## [1.49.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.49.1...v1.49.2) (2026-03-16)
## [1.49.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.49.0...v1.49.1) (2026-03-16)
## [1.49.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.48.2...v1.49.0) (2026-03-12)

### Features

* searchable autocomplete dropdowns + Create submenu with Project creation ([c3d4f67](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/c3d4f67608b36d6e647a5e7f5bd525fdaf8845f2))
## [1.48.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.48.1...v1.48.2) (2026-03-11)
## [1.48.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.48.0...v1.48.1) (2026-03-11)
## [1.48.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.47.1...v1.48.0) (2026-03-11)

### Features

* CI auto-fix workflow — auto-detect failures, extract logs, create issues ([783a288](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/783a2889069f8a8ac6e037d480f13bd7d93e8f30)), closes [#FF6B6B](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/FF6B6B)
## [1.47.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.47.0...v1.47.1) (2026-03-11)

### Bug Fixes

* vitest no longer picks up Playwright e2e specs ([#29](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/29)) ([52b7887](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/52b7887ca71e6508a6290caae0ba9c10e856c988))
## [1.47.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.46.0...v1.47.0) (2026-03-11)

### Features

* add 22 Playwright E2E tests with full API mocking ([f4ba3d5](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/f4ba3d54ebd6d89e220c5570d4e84a3679bf5a5f)), closes [#27](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/27)
## [1.46.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.45.0...v1.46.0) (2026-03-11)

### Features

* add 25 backend pytest tests for all API endpoints ([c393f7e](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/c393f7e95c549b4182ccae5dafc7409b6725bdce)), closes [#26](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/26)
## [1.45.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.44.3...v1.45.0) (2026-03-11)

### Features

* display project avatars from Jira API instead of letter badges ([0a8f9c2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/0a8f9c2b3313ecedf9c49cfbb4de52601baa7437)), closes [#20](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/20)
## [1.44.3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.44.2...v1.44.3) (2026-03-11)

### Bug Fixes

* always show rich text editor for description editing ([4555451](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/4555451530f4131ac30a9b7ba2b9de197668702a)), closes [#23](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/23)
## [1.44.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.44.1...v1.44.2) (2026-03-11)

### Features

* add explanatory hints to sprint dashboard charts ([6fbc719](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/6fbc719574265962bed41ab52f296d05ba022439)), closes [#22](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/22)
## [1.44.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.44.0...v1.44.1) (2026-03-11)

### Bug Fixes

* correct GitHub URL in About page — was pointing to anthropics/jira-ui ([9045400](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/9045400c075868812e7bc7465d26191029dadbc7)), closes [#21](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/21)
## [1.44.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.43.1...v1.44.0) (2026-03-11)

### Features

* smart data caching — tiered staleTime for all queries ([3583f4b](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/3583f4b37e3e5863426b7e1eeac95f981d09be1f)), closes [#19](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/19)
## [1.43.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.43.0...v1.43.1) (2026-03-11)

### Bug Fixes

* recalibrate light mode zinc palette for WCAG AA contrast ([69d7175](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/69d717598b781d8ffdd7a7c738defa3c38dfdb94)), closes [#3f3f46](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/3f3f46) [#52525b](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/52525b) [#71717a](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/71717a) [#09090b](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/09090b) [#18](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/18)
## [1.43.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.42.0...v1.43.0) (2026-03-11)

### Features

* loading spinner while fetching data from backend ([ed3e73d](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/ed3e73d1e3b340dc48bc77562bcb23b15e06c7c9)), closes [#15](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/15)
## [1.42.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.41.0...v1.42.0) (2026-03-11)

### Features

* loading spinner for all data-fetching views + wider command palette ([09e58e9](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/09e58e99c974757982e5a78e2e733518b4a004ff)), closes [#15](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/15) [#16](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/16)
## [1.41.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.40.0...v1.41.0) (2026-03-11)

### Features

* clickable issue keys in Manage Sprint Scope modal ([a92e945](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/a92e945c16d03d81199df2511e224d80c90e337b)), closes [#14](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues/14)

### Bug Fixes

* bump-version script skips no-commit-to-branch pre-commit hook ([7a31517](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/7a3151706359cac8041d894db9074426d1ffb876))
## [1.40.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.39.2...v1.40.0) (2026-03-11)

### Features

* publish Docker images to GHCR with multi-arch support ([84e59da](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/84e59dab4c6d09545685adae696de9c671fac0ba))
## [1.39.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.39.1...v1.39.2) (2026-03-11)

### Bug Fixes

* upgrade GitHub Actions to Node.js 24 compatible versions ([3c67757](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/3c67757386e573d833bc13b03ab4f33ba25d5a26))
## [1.39.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.39.0...v1.39.1) (2026-03-11)

### Bug Fixes

* CI/CD workflows — add dummy env vars for backend, Docker builds ([107360a](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/107360ad1210162e634c076ec7e8815da21ef0cb))
## [1.39.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.38.0...v1.39.0) (2026-03-11)
## [1.38.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.37.0...v1.38.0) (2026-03-11)

### Features

* About/Features page with version history (tasks 14.1-14.4) ([3ce5a76](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/3ce5a760007b8da0c8b103773cef87b88facef7f))
## [1.37.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.36.0...v1.37.0) (2026-03-11)

### Features

* UI visibility with sidebar, breadcrumbs, dashboard, empty states (tasks 13.1-13.5) ([3788bcc](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/3788bccb09be7c54e375bac998cfcb817989e049))
## [1.36.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.35.0...v1.36.0) (2026-03-11)

### Features

* sprint CRUD with create, edit, start, complete, delete, scope management (tasks 9b.1-9b.5) ([1df82dc](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/1df82dcd231b0345965c4fbd44d8e53f72b3e0a9))

### Bug Fixes

* handle kanban boards that don't support sprints (400 error) ([6e9fcb1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/6e9fcb16cf9d5de0a324c964fea0474d6b7ecfc6))
## [1.35.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.34.0...v1.35.0) (2026-03-11)

### Features

* offline mode with mutation queue and auto-sync (tasks 12.1-12.5) ([2e6f3a8](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/2e6f3a84cc2afdd2e7f10d6c8ca4e76b05791ac8))
## [1.34.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.33.0...v1.34.0) (2026-03-11)

### Features

* dark/light mode toggle with system preference detection (tasks 11.2-11.5) ([dc6a5a4](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/dc6a5a471424a4110a879b8d05adb7c237fed882))
## [1.33.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.32.0...v1.33.0) (2026-03-11)

### Features

* time tracking with timer, worklog, and progress bar (tasks 10.1-10.4) ([265cf38](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/265cf3887ba4793168d86837ff072a1072fd7618))
## [1.32.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.31.0...v1.32.0) (2026-03-11)

### Features

* sprint dashboard with burndown and velocity charts (tasks 9.1-9.4) ([b120634](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/b120634b5fb46c01a0adef3074e95bbfb963e313))
## [1.31.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.30.0...v1.31.0) (2026-03-11)

### Features

* saved filters with localStorage persistence (tasks 8.1-8.4) ([c55dcc6](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/c55dcc657e7abe9a7d6a985a774f1b66f7e79d0a))
## [1.30.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.29.0...v1.30.0) (2026-03-11)

### Features

* bulk actions with floating action bar (tasks 7.1-7.5) ([e0b23c3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/e0b23c350057331072c89b842d5056f2546c2411))
## [1.29.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.28.0...v1.29.0) (2026-03-11)

### Features

* quick create modal with form validation and optimistic UI (tasks 6.1-6.4) ([fa3d3ed](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/fa3d3ed04383511e3b6f7c5b5dbe766bf6ecfcc3))
## [1.28.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.27.0...v1.28.0) (2026-03-11)

### Features

* keyboard shortcuts with help overlay (tasks 5.1-5.5) ([73f9484](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/73f948458d8a91e9ac2118adac4ec6e6cb8ba96f))
## [1.27.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.26.0...v1.27.0) (2026-03-11)

### Features

* command palette with fuzzy search, keyboard nav, recent history (tasks 4.1-4.4) ([f7578bb](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/f7578bb397f13bc3b68d0b20822a843e02f94595))
## [1.26.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.25.1...v1.26.0) (2026-03-11)

### Features

* mobile quick-action arrows on Kanban cards for status transitions ([3042614](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/30426145ce7dcd1134dcfd48485a2ca55bd1d3d6))
## [1.25.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.25.0...v1.25.1) (2026-03-11)

### Bug Fixes

* raise max_results limit to 200 for Board view ([47f8338](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/47f83383d1ca509061725cb93f6e930967347c2c))
## [1.25.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.24.0...v1.25.0) (2026-03-11)

### Features

* Kanban board view with drag-and-drop and swimlanes (tasks 3.1-3.4) ([5a28547](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/5a28547d45e9b8e37dca59e9c4f191413a3df840))
## [1.24.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.23.0...v1.24.0) (2026-03-11)

### Features

* editable labels with autocomplete and add/remove ([7c3c4f2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/7c3c4f23b4b87456e2d1b70dc98a0a01f3b7b883))
## [1.23.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.22.0...v1.23.0) (2026-03-11)

### Features

* editable due date with native date picker widget ([1597d8d](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/1597d8d3b746dc1be732d3a55d1bfc96a795d95d))
## [1.22.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.21.0...v1.22.0) (2026-03-11)

### Features

* proper dropdowns for assignee and priority in issue detail ([b1a2220](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/b1a2220e3afda7f854bc2dbb93373ba50f364d1d))
## [1.21.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.20.2...v1.21.0) (2026-03-11)

### Features

* convert to PWA with manifest, service worker, and install prompt ([6a806eb](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/6a806eb849686e5c8e13d09f27f72ed25d73d49e))
## [1.20.2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.20.1...v1.20.2) (2026-03-11)

### Bug Fixes

* exclude test files from production tsc build ([32225ac](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/32225ac050b7e377ac2472dacb1a3d9961119bef))
## [1.20.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.20.0...v1.20.1) (2026-03-11)

### Bug Fixes

* ADF conversion stripping invalid attrs, backend returns Jira error details ([e6af5e2](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/e6af5e2c9b6ac9bbe79e5b4bb286cda56d8e66dc))
## [1.20.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.19.0...v1.20.0) (2026-03-11)

### Features

* rich text editor for ADF descriptions (TipTap) ([5c31ed3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/5c31ed3fb673220404776b1e695a946122492495))
## [1.19.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.18.0...v1.19.0) (2026-03-11)

### Features

* add edit button for ADF descriptions in issue detail panel ([f4f3e21](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/f4f3e21f56de8afd30c6804dbecbe90e3c0d1805))
## [1.18.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.17.0...v1.18.0) (2026-03-11)

### Features

* implement issue detail panel (tasks 2.1-2.5) ([fe379e6](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/fe379e6fbb02afcb965f08de014e74a54142a895))
## [1.17.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.16.0...v1.17.0) (2026-03-11)

### Features

* make frontend fully responsive (mobile-first cards, stacked filters, adaptive pagination) ([82e935e](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/82e935e8a64513b104142e50c7ca4ed58dfeba41))
## [1.16.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.15.0...v1.16.0) (2026-03-11)

### Features

* expose Vite dev server on Tailscale network (allowedHosts) ([c009788](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/c009788037ee56ed796e34db242c5642e291e0f7))
## [1.15.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.14.0...v1.15.0) (2026-03-10)
## [1.14.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.13.0...v1.14.0) (2026-03-10)

### Features

* use mock data for screenshots, never production data ([35c824c](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/35c824ce32ff87b351b41085fb5cc37b37f0746b))
## [1.13.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.12.0...v1.13.0) (2026-03-10)
## [1.12.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.11.0...v1.12.0) (2026-03-10)
## [1.11.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.10.0...v1.11.0) (2026-03-10)
## [1.10.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.9.0...v1.10.0) (2026-03-10)
## [1.9.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.8.0...v1.9.0) (2026-03-10)
## [1.8.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.7.0...v1.8.0) (2026-03-10)

### Features

* add Playwright screenshot capture script ([796e688](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/796e68826c1352245983e3a58219a0d08d0e9e8d))
## [1.7.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.6.1...v1.7.0) (2026-03-10)

### Features

* add offset-based pagination with next/previous controls (task 1.4) ([4db462e](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/4db462e2a67b3854d4631e26ca79d3901758a64b))
## [1.6.1](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.6.0...v1.6.1) (2026-03-10)

### Bug Fixes

* fallback to issue count when Jira API omits total field ([5091baf](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/5091bafc1c6766ea76727b0e6f7a02e94d37aa58))
## [1.6.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.5.0...v1.6.0) (2026-03-10)

### Features

* add filter dropdowns to header bar (task 1.3) ([9549d58](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/9549d5825c33ff923d51e3faa517995e06c3cf4d))
## [1.5.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.4.0...v1.5.0) (2026-03-10)

### Features

* add column sorting to list view (task 1.2) ([7ab109e](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/7ab109e2c825cd6294cbcd5748783470607f80fa))
## [1.4.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.3.0...v1.4.0) (2026-03-10)
## [1.3.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.2.0...v1.3.0) (2026-03-10)

### Features

* add backend start script and annotate roadmap with BDD test coverage ([12196c3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/12196c32d6e3f94ff57239dec37d8c543c7496e7))
## [1.2.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.1.0...v1.2.0) (2026-03-10)

### Features

* add BDD tests for list view and project roadmap ([ff7e68e](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/ff7e68ecb3a48681ee4405662d47b2c7ca95b55f))
## [1.1.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/v1.0.0...v1.1.0) (2026-03-10)

### Features

* add app versioning with single source of truth ([164d512](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/164d512402b5d72c02e94e398da0a273a841de0f))
* add CHANGELOG generation and release script ([2d6f4d3](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/2d6f4d3bfe203e47e7effc3521aac5498f5563ca))
* add shortcut scripts for patch/minor/major/push ([91dd762](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/91dd762fbd059046ca5adc1ae22a69bdeab2c71a))

## [1.0.0](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/compare/c5a855c05afc89f615c14ed5bb8e140b8e0383c7...v1.0.0) (2026-03-09)

### Features

* initial Jira UI — modern alternative frontend for Jira Cloud ([c5a855c](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/c5a855c05afc89f615c14ed5bb8e140b8e0383c7))

### Bug Fixes

* adapt to Jira REST API v3 /search/jql endpoint ([af03a9e](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/af03a9e39191b78f33a94c70ebccdb33430017e6))
* redact personal credentials from .env.example files ([5b4ba29](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/commit/5b4ba29434c309ec43a53313510b125feefde25f))
