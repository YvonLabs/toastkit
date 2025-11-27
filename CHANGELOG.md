# Changelog

All notable changes to ToastKit are documented here.

ToastKit uses semantic-style versioning during pre-1.0:
- PATCH 0.2.1 → 0.2.2: bug fix or security fix
- MINOR 0.2.x → 0.3.0: new capability or behavior change
- 1.0.0: first fully stable line

---

## [0.2.2] – 2025-11-27
### Documentation
- Refreshed README with updated branding and visuals
- Updated repository structure for consistency

### Changed
- Updated all ToastKit icons and visual assets for improved clarity
- Refined `manifest.json` metadata and extension configuration
- Synchronized codebase with current Chrome extension best practices

---

## [0.2.1] – 2025-10-28
Security and hardening release
- Escape and sanitize DOM output in popup to prevent untrusted HTML injection
- No new permissions
- No telemetry or remote calls

---

## [0.2.0] – 2025-10-26
First public release
- Targeted site reset for a single domain or subdomains
- Clear cookies, cache, localStorage, sessionStorage, service workers, and site permissions
- Privacy policy and security contact
- Chrome Web Store submission build

---

## [Unreleased]
### Documentation
- Linked to unified global privacy and security policies
- Updated README, logo, and repo structure
- No functional or release changes; extension remains at version 0.2.1

### Changed
- Updated logo and image references for consistency

---

## [Unreleased]
- Firefox build target
- Favorite domains list stored locally
- Minor UX text refinements