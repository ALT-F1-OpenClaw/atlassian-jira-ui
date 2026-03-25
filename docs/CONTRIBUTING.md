# Contributing to Taskara

Thank you for your interest in contributing! Taskara is an open-source project by [ALT-F1 SRL](https://www.alt-f1.be).

## Getting Started

### Prerequisites

- Node.js 22+ and npm
- Python 3.11+ with pip
- Docker (for integration tests / deployment)
- A Jira Cloud account with an [API token](https://id.atlassian.com/manage-profile/security/api-tokens)

### Local Setup

```bash
# Clone
git clone https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui.git
cd atlassian-jira-ui

# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in Jira credentials
bash start.sh         # Runs on :35400

# Frontend (new terminal)
cd frontend
npm install
npm run dev           # Runs on :5173
```

## Development Workflow

### Branch Strategy

- `main` — stable, deployable. All CI must pass.
- Feature branches: `feat/description`, `fix/description`
- PRs welcome — CI runs automatically on push

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add backlog view with drag-and-drop
fix: sprint dashboard shows 0 issues for company-managed projects
docs: update deployment guide with Cloudflare setup
chore: upgrade Vite 7 to 8
```

Prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `perf:`, `ci:`

**Never include `Co-Authored-By` in commit messages.**

### Testing

```bash
# Frontend (255 unit tests)
cd frontend && npm test

# Backend (25 tests)
cd backend && source .venv/bin/activate
JIRA_HOST=https://test.atlassian.net JIRA_EMAIL=t@t.com JIRA_API_TOKEN=t python -m pytest tests/ -v

# E2E (22 tests — requires build)
cd frontend && npm run build && npx playwright test
```

- **BDD naming**: `"Given [context], when [action], then [expected result]"`
- All features must have tests before marking complete
- Target: 100% of new features covered

### Code Style

- **Frontend**: Single `App.tsx` file (don't split without discussion), Tailwind CSS, TypeScript strict
- **Backend**: Async FastAPI, Pydantic models, type hints everywhere
- **Both**: No unused imports, no commented-out code, descriptive variable names

### Bug Fix Workflow

1. **Create a GitHub Issue first** (use the bug template)
2. Fix the bug
3. Reference the issue in the commit: `fix: description (fixes #N)`
4. Issue closes automatically on merge

## Architecture Decisions

Major decisions are documented in [ADRs](./adr/README.md) (Architecture Decision Records). When proposing a significant change:

1. Check existing ADRs for context
2. If it changes architecture, create a new ADR
3. Reference the ADR in your PR

## What We Need Help With

- 🐛 Bug reports (especially Jira API edge cases)
- 🌍 Privacy policy translations (CCPA, PIPEDA, LGPD, POPIA, APPs)
- ♿ Accessibility improvements (WCAG AA compliance)
- 📱 Mobile UX testing
- 🧪 E2E test coverage
- 📖 Documentation improvements

## Code of Conduct

Be kind, be constructive, be respectful. This is an opinionated project — if you think Jira's UI could be faster and cleaner, you're in the right place.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](../LICENSE).
