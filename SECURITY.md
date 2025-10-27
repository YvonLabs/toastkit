# Security Policy

## Supported Versions
ToastKit provides security updates for the most recent public release line and for the current development branch (`main`).  
Older builds may still run, but they do not receive fixes or dependency updates.

| Version      | Supported | Notes |
|--------------|-----------|-------|
| main         | ✅ Active | Ongoing development and hardening |
| 0.2.x        | ✅ Public release line | First public release series (Chrome Web Store) |
| ≤ 0.1.x      | ❌ Unsupported | Internal / experimental builds before public availability |

Security fixes will land in `main` first, and then be rolled into the next `0.2.x` patch release (for example `0.2.1`).

## Reporting a Vulnerability
If you believe you’ve found a security or privacy issue (for example, data exposure, permission overreach, or domain isolation flaws), please **do not open a public issue**.

Instead, email: **yvonlabs.plentiful987@passmail.net**

Include:
- Steps to reproduce  
- Expected behavior  
- Actual behavior  
- Browser + OS version  
- ToastKit version (see extension details / manifest)

Reports will be acknowledged and reviewed in order of impact.

## Handling
Issues that affect user privacy, domain isolation, or data security are treated as high priority.  
Validated fixes are released as patch updates (for example `0.2.1`) and published to the Chrome Web Store.
