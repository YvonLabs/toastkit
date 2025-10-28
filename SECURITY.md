# Security Policy

## Supported Versions

ToastKit ships security fixes for the current release line and the current development branch (`main`).  
Older builds may still run, but they do not receive fixes or dependency updates.

| Version        | Supported | Notes |
|---------------|-----------|-------|
| 0.2.1          | ✅ Active | Latest hardening release (DOM sanitization, popup safety) |
| main           | ✅ Active | In-development, reviewed before publishing to the store |
| 0.2.0          | ⚠︎ Superseded | First public release; replaced by 0.2.1 for security reasons |
| ≤ 0.1.x        | ❌ Unsupported | Internal / pre-release builds, not maintained |

Security fixes land in `main` first, and then are published as a patch release (for example `0.2.1`).  
Once a new version is submitted / approved in the Chrome Web Store, that becomes the supported version.

## What “security issue” means here

ToastKit does not collect analytics, does not exfiltrate data, and does not call remote services.

Security issues for this project usually mean:
- A way the extension could expose or mis-handle data from a site you're cleaning
- A way the popup UI could inject or render untrusted content
- Anything that breaks the “only reset the current site / domain” scope
- A permissions overreach or privilege escalation in the extension

If you believe you’ve found one of these, please report it privately.

## Reporting a Vulnerability

Please **do not open a public GitHub issue** for potential security or privacy problems.

Instead, email:
**237143566+yvon-l@users.noreply.github.com**

Include:
- Steps to reproduce  
- Expected behavior  
- Actual behavior  
- Browser + OS version  
- ToastKit version (`chrome://extensions` → Details)

You will get an acknowledgment. High-impact issues are prioritized first.

## Patch and Disclosure

Validated fixes are released as patch updates (for example `0.2.1`) and submitted to the Chrome Web Store.

If a report results in a user-facing change that matters for safety or privacy, that change will be mentioned in the public changelog / release notes for that version.