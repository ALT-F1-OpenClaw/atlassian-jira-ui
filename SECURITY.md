# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| Latest  | ✅ Yes             |
| < Latest| ❌ No (upgrade)    |

Only the latest release receives security updates. Please upgrade to the latest version before reporting.

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **git-repo-security@alt-f1.be**

### What to include

- Description of the vulnerability
- Steps to reproduce
- Impact assessment (what an attacker could do)
- Suggested fix (if you have one)

### What to expect

- **Acknowledgment**: within 48 hours
- **Assessment**: within 7 days
- **Fix**: critical issues within 14 days, others in the next release cycle

### What qualifies as a security issue

- Authentication bypass
- Credential exposure (API tokens, secrets)
- Cross-site scripting (XSS)
- SQL/NoSQL injection
- Server-side request forgery (SSRF)
- Unauthorized data access

### What is NOT a security issue

- Bugs that don't have security impact → open a regular [GitHub issue](https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/issues)
- Feature requests
- Performance issues

## Security Measures

- API tokens are never sent to the frontend — the backend acts as a proxy
- CORS is restricted to the frontend origin
- No credentials are stored in the browser
- `.env` files are gitignored
- CI/CD uses dummy credentials only

## Author

[ALT-F1 SRL](https://www.alt-f1.be), Brussels 🇧🇪
