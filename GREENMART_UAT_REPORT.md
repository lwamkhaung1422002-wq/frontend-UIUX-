# GreenMart Implementation and UAT Report

Generated: 2026-07-28 (Asia/Yangon)

## Tested release

- Commit: `fa00f4c` (plus this report-only evidence update)
- GitHub publication: `faceff9` on `General-Store-Managment/main`; application/API/migrations/tests are published
- Environment: local Windows development/UAT
- Database: PostgreSQL `online_shop_local_dev`, schema `public`
- Migration state: `17 migrations found`, schema up to date
- Latest feature migration: `20260728000710_order_item_modifiers`
- Demo cutover high-water mark: `2026-07-01T09:00:00.000Z`
- Frontend: `http://127.0.0.1:5173` — `PASS` (`HTTP 200`)
- API: `http://127.0.0.1:3108/health` — `PASS` (`{"status":"ok"}`)

## Release-gate results

| Gate | Status | Evidence |
| --- | --- | --- |
| Fresh App `npm ci` | PASS | 232 packages installed from an isolated Git archive; audit 0 |
| App lint/typecheck/unit/build | PASS | 9 test files, 36 tests, production build |
| Full Playwright | PASS | 18 passed, 2 intentionally skipped mobile duplicates of desktop-only full journeys |
| Fresh API `npm ci` | PASS | 282 packages installed from an isolated Git archive; audit 0 |
| Prisma validate/generate/status | PASS | Schema valid; client generated; 17 migrations up to date |
| API build | PASS | Prisma generation and TypeScript build |
| API integration/security suite | PASS | Inventory, finance, purchases, restaurant, idempotency and cross-owner IDOR |
| Ledger-first decimal operations | PASS | Decimal receipt/adjustment, duplicate replay, optimistic-version conflict and reservation-to-sale ordering |
| Dependency security audit | PASS | App 0 vulnerabilities; API 0 vulnerabilities |
| Eight-store reconciliation | PASS | Eight stores passed; unexplained differences `0` |
| Serious/critical Axe violations | PASS | `0` on login and authenticated critical workspaces |
| Staging deployment/smoke | BLOCKED | No staging target or deployment credentials are configured in this workspace |
| GitHub workflow publication | BLOCKED | OAuth token lacks GitHub `workflow` scope; the two local workflow files are therefore not present in the publication commit |
| Backup restore drill | PASS | 41 tables and 3,540 rows restored into a freshly migrated isolated database; SHA-256 comparison differences `0` |

## Demo environment

Run only against an allowed local/test/staging database:

```powershell
$env:NODE_ENV='development'
$env:CONFIRM_DEMO_SEED='eight-isolated-greenmart-stores'
$env:DEMO_OWNER_EMAIL='greenmart-demo@example.local'
$env:DEMO_OWNER_PASSWORD='<environment-controlled password>'
npm run demo:seed:eight
$env:RECONCILE_SHOP_PREFIX='demo-'
npm run inventory:reconcile
```

Deterministic stores:

1. General Store Demo
2. Mini-market Demo
3. Fashion Demo
4. Electronics Demo
5. Pharmacy Demo
6. Cosmetics Demo
7. Online Restaurant Demo
8. Wholesale Demo

Seed data includes template capabilities, units, products/variants, opening inventory, purchases and receipts, partial payments, receivables/payables, expenses, returns/refunds/adjustments, low-stock data, lots/expiry, serial/IMEI/warranty, restaurant recipes/modifiers and wholesale tiers.

## Functional scenario status

| Scenario | Status | Coverage |
| --- | --- | --- |
| General Store | PASS | Simple catalog, opening stock, sale, purchase, payment and finance fixtures |
| Mini-market | PASS | Pack/carton conversions, lots, expiry and FEFO fixtures/API behavior |
| Fashion | PASS | Color/size variant matrix and variant inventory |
| Electronics | PASS | Serial/IMEI uniqueness, atomic sale/return and warranty lifecycle |
| Pharmacy | PASS | FEFO, expired blocking, quarantine policy and non-clinical warning |
| Cosmetics | PASS | Variants combined with lot/expiry tracking |
| Online Restaurant | PASS | Delivery/pickup lifecycle, recipes, modifiers, reservation and atomic completion |
| Wholesale | PASS | MOQ, customer group tiers, unit snapshots, partial payment and receivable |

## Inventory and finance integrity

- `PASS` Movement IN minus OUT reconciles to on-hand for all demo stores.
- `PASS` Reservation totals reconcile to reserved balances.
- `PASS` On-hand minus reserved reconciles to available.
- `PASS` Lot/serial ownership and tenant scope are validated.
- `PASS` Financial refunds do not create stock movements.
- `PASS` Confirmed product returns create explicit inventory movements.
- `PASS` Duplicate receipt/return/completion requests do not duplicate mutations.
- `PASS` Optimistic version conflicts are rejected.
- `PASS` New stores and deterministic demos use flagged `LEDGER` reads; decimal on-hand/reserved balances remain canonical in the UI.
- `PASS` Decimal multi-location transfers create atomic OUT/IN movement pairs; physical counts reconcile through audited optimistic adjustments.
- `PASS` Expired and modified JWTs are rejected; existing/missing-account login failures use the same safe error.
- `PASS` Authentication brute-force rate limiting returns `429` after the configured threshold.
- `PASS` Completed sales are recognized by completion/recognition date.
- `PASS` Revenue, cash received, refunds, receivable, payable and inventory valuation are separate metrics.

## Responsive and accessibility

- `PASS` Playwright exercised widths `360`, `390`, `768`, `820`, `1024`, `1280`, and `1440`.
- `PASS` No horizontal document overflow in the tested core workspaces.
- `PASS` Mobile/tablet temporary navigation and desktop sidebar breakpoint behavior.
- `PASS` Fresh-owner registration, invalid/duplicate registration, wrong/correct login and session restoration.
- `PASS` Product Wizard creation, opening inventory and reload persistence.
- `PASS` The demo owner switched among all eight isolated stores through the real responsive UI; active-store selection persisted and each template configuration passed Axe.
- `PASS` Axe serious/critical violations: `0` on login plus Dashboard, POS, Inventory, Purchases, Products, Finance, Balance and Settings.

## Commands executed

```text
App: npm ci (isolated), npm run verify, npm run test:e2e, npm audit --audit-level=high
API: npm ci (isolated), npm run build, npm run test:api, npx prisma validate,
     npx prisma migrate status, npm run inventory:reconcile, npm run db:backup:local,
     npm run db:restore-drill:local, npm audit --audit-level=high
Health: GET / and GET /health
```

## Defects found and fixed during final UAT

- New owners did not receive template default units/categories.
- API restaurant fixture duplicated the newly automatic `Piece` unit.
- Settings and finance/select controls lacked accessible names.
- Several status/action chips failed minimum color contrast.
- Frontend transitive `brace-expansion` and `postcss` advisories were patched without forced upgrades.
- The previous backup exported only 15 legacy tables and had no restore proof; it now discovers all 41 application tables, preserves legacy schema-drift columns/tables, restores into a freshly migrated isolated database and verifies every table digest.
- Reserved ledger balances were consumed before reservation release during sale completion; the transaction now releases the reservation before the atomic OUT movement.
- Decimal inventory receipts were rounded in the legacy UI read path; new stores now read canonical ledger balances and use idempotent, optimistic decimal adjustments.
- Re-running the deterministic demo under a different environment-controlled email could conflict with its stable owner ID; owner seeding is now idempotent by stable ID.
- Store switching UAT used the default assertion timeout during full parallel execution; it now waits for the real post-switch data reload while preserving a bounded timeout.
- Four concurrent browser workers could starve parallel bcrypt/database flows on small runners; the release gate now uses two bounded workers and the full suite passes reliably.

## Known limitations and production recommendation

- Refresh-token rotation is `NOT IMPLEMENTED` by approved scope; the current owner-only JWT flow remains.
- Staff membership/roles and subscription/billing remain separate future releases.
- Barcode and full restaurant POS (tables, waiters, dine-in, KDS) remain intentionally excluded.
- Staging deployment/smoke is not evidenced because no staging target is configured.
- The source release is on GitHub main, but publishing `.github/workflows/production-gate.yml` and `staging-smoke.yml` still requires a GitHub token with `workflow` scope.

Production recommendation: **NO-GO (external release)** until staging deployment and smoke testing pass.
Local implementation/UAT recommendation: **PASS** for continued staging preparation; no unexplained inventory differences, high/critical dependency advisories, or serious/critical Axe violations remain.
