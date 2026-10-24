# Security Policy & Architecture

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Kick To Tech, please do not file a public issue.
Instead, report the issue directly to the security team at **security@kicktotech.in** or contact the administrators.

Please provide:
- A description of the vulnerability and its potential impact.
- Exact steps to reproduce the issue.
- Any relevant request/response traces.

## Security Architecture & Controls

### 1. Authentication & Sessions
- **Password Storage**: PBKDF2-SHA512 key derivation with 210,000 iterations and per-user 16-byte random salt.
- **Session Tokens**: Cryptographically signed HMAC-SHA256 tokens stored in HTTP-only, SameSite=Lax, Secure cookies, with fallback to `Authorization: Bearer <token>`.
- **Session Revocation**: Real-time database revocation in MongoDB upon logout.

### 2. Authorization (RBAC)
- **Role Enforcement**: Fail-closed role verification. Unrecognized roles receive zero permissions.
- **Data Minimization**: Public endpoints strip password hashes, salts, and private contact info via `publicUser()`.

### 3. Payment Integrity
- **Authoritative Validation**: Hardcoded server-side price enforcement for hackathons and internships.
- **Cryptographic Signatures**: Razorpay payment and webhook signatures verified using constant-time `timingSafeEqual`.
- **Ownership Checks**: IDOR defense ensures students can only pay for and verify their own registrations.

### 4. Network & Browser Hardening
- **CORS Whitelist**: Origin validation restricted to official Kick To Tech domains (`kicktotech.in`, `onrender.com`, `*.vercel.app`).
- **Security Headers**: HSTS, X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Permissions-Policy, and Referrer-Policy configured on all routes.
