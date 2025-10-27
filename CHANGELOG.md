# Changelog

All notable changes to ToastKit will be documented here.

ToastKit uses semantic-style versioning during pre-1.0:
- PATCH (0.2.1 → 0.2.2): bug fix or security fix
- MINOR (0.2.0 → 0.3.0): new capability or behavior change
- 1.0.0: first fully stable line

---

## [0.2.0] – 2025-10-26
First public release.

### Added
- Targeted site reset for a single domain (or domain + subdomains).
- Ability to clear: cookies, cache, localStorage, sessionStorage, service workers, and site permissions without wiping the entire browser.
- Privacy policy and security contact.
- Chrome Web Store submission build.

### Notes
- `0.2.x` is now the supported public line.
- Earlier 0.1.x builds were internal/experimental and are not supported.

---

## [Unreleased]
Planned / in development:
- Improve visibility and configuration of the existing Quick Reset shortcut.
- Local-only “favorite domains” option for people who repeatedly wipe the same test or staging environments.
- Firefox build, to support users outside Chromium.
- Small UX and wording refinements based on Chrome Web Store review and user trust feedback.
