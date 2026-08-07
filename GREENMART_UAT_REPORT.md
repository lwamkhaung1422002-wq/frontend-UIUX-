# GreenMart Implementation and UAT Report

Generated: 2026-07-29 (Asia/Yangon)

## Tested release

- Verified implementation commit: `c0b6fe1`
- GitHub publication: `General-Store-Managment/main` (publication status confirmed in the final handoff)
- Environment: local Windows development/UAT
- Database: PostgreSQL `online_shop_local_dev`, schema `public`
- Migration state: `18 migrations found`, schema up to date
- Latest feature migration: `20260729000100_decimal_transaction_allocations`
- Demo cutover high-water mark: `2026-07-01T09:00:00.000Z`
- Frontend: `http://127.0.0.1:5173` — `PASS` (`HTTP 200`)
- API: `http://127.0.0.1:3108/health` — `PASS` (`{"status":"ok"}`)

## Release-gate results

| Gate | Status | Evidence |
| --- | --- | --- |
| Fresh App `npm ci` | PASS | 232 packages installed from an isolated Git archive; audit 0 |
| App lint/typecheck/unit/build | PASS | 9 test files, 36 tests, production build |
| Full Playwright | PASS | Responsive/auth/template suites passed; 2 intentional mobile duplicates of desktop-only full journeys are skipped |
| Fresh API `npm ci` | PASS | 282 packages installed from an isolated Git archive; audit 0 |
| Prisma validate/generate/status | PASS | Schema valid; client generated; 17 migrations up to date |
| API build | PASS | Prisma generation and TypeScript build |
| API integration/security suite | PASS | Inventory, finance, purchases, restaurant, idempotency and cross-owner IDOR |
| Ledger-first decimal operations | PASS | Exact fractional sales, customer returns, purchases, receipts and supplier returns plus duplicate replay and optimistic conflict |
| Dependency security audit | PASS | App 0 vulnerabilities; API 0 vulnerabilities |
| Eight-store reconciliation | PASS | Eight stores passed; unexplained differences `0` |
| Serious/critical Axe violations | PASS | `0` on login and authenticated critical workspaces |
| Staging deployment/smoke | BLOCKED | No staging target or deployment credentials are configured in this workspace |
| GitHub workflow publication | BLOCKED | Production-gate and staging-smoke workflow files are committed locally; the current GitHub credential is invalid, so commit publication remains blocked |
| Backup restore drill | PASS | 18 migrations; 41 tables and 5,004 rows restored into a fresh isolated database; digest differences `0` |
| Tenant query performance | PASS | Product/movement/order/purchase/lot queries completed in `0.36–9.24ms` against the seeded local dataset; `250ms` gate |
| Screenshot evidence | PASS | 11 deterministic desktop/tablet/mobile and eight-template captures in `App/uat-evidence/screenshots` |

## Demo environment

Run only against an allowed local/test/staging database:

```powershell
$env:NODE_ENV='development'
$env:CONFIRM_DEMO_SEED='eight-isolated-greenmart-stores'
$env:DEMO_OWNER_EMAIL='greenmart-demo@example.local'
$env:DEMO_OWNER_PASSWORD='<environment-controlled password>'
npm run demo:seed:eight
$env:RECONCILE_SHOP_SUFFIX=' Demo'
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

The current local demo records are intentionally retained for owner inspection. The seed and UAT commands do not delete those stores or their transactions. They must only be removed after an explicit owner request.

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

Independent real-API transaction UAT also passed for all eight stores. It created inspectable purchase receipts, partial supplier payments, sales/orders, customer payments, ledger movements and report entries. Online Restaurant has no supplier purchase in this scenario by design; its order lifecycle and atomic ingredient consumption passed.

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
- `PASS` Fractional selling/purchase units preserve entered quantity, conversion factor and exact base quantity through sale, receipt and return workflows.
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
- `PASS` Evidence screenshots cover `390`, `820`, `1280` widths and all eight template settings/capability views.

## Commands executed

```text
App: npm ci (isolated), npm run verify, npm run test:e2e, npm audit --audit-level=high
API: npm ci (isolated), npm run build, npm run test:api, npx prisma validate,
     npx prisma migrate status, npm run inventory:reconcile, npm run db:backup:local,
     npm run db:restore-drill:local, npm run performance:check, npm run uat:eight-stores,
     npm audit --audit-level=high
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
- Parallel browser workers could starve bcrypt/Prisma transactions on a small shared test database; the deterministic default is now one worker, with explicit opt-in parallelism for provisioned CI pools.
- Registration template-default creation could exceed Prisma's default five-second interactive transaction budget under CI load; the atomic transaction now has bounded `maxWait`/`timeout` values.
- Order and purchase compatibility columns silently constrained measured products to integers; additive exact-base columns, decimal-safe allocation logic and unit-aware UI controls now preserve fractional sales, receipts and returns.
- Several template fixtures could not prove their specialized paths: lot stores used the compatibility `EXPIRY` label, Fashion/Cosmetics lacked variant balances, Restaurant ingredients lacked ledger stock, Wholesale customers lacked a price-group assignment, Pharmacy lacked an expired quarantine lot, and Electronics lacked a deterministic warranty. The non-destructive seed now creates all of these records.
- The original eight-template browser test only switched stores and did not exercise transactions. `npm run uat:eight-stores` now executes independent purchase/sale/order/payment/inventory/report scenarios for all templates, including idempotent receipt replay, FEFO expiry rejection, exact variant/serial allocation, restaurant ingredient consumption and wholesale tier resolution.
- Demo browser credentials used two historical environment-variable names, allowing the eight-store test to be skipped accidentally. The test now accepts both `E2E_DEMO_*` and `DEMO_OWNER_*` names.
- The Restaurant ingredient assertion exposed harmless JavaScript display precision (`0.3500000000000014`); the UAT assertion now uses the same bounded decimal tolerance as the persisted three-decimal quantity policy. Persisted inventory reconciliation remained exact.
- The final API audit detected one high `fast-uri` advisory and four moderate transitive Prisma-tooling advisories. A non-forced lockfile update patched the dependency graph; the subsequent audit reported `0` vulnerabilities and API typecheck/build/integration tests passed.

## Known limitations and production recommendation

- Refresh-token rotation is `NOT IMPLEMENTED` by approved scope; the current owner-only JWT flow remains.
- Staff membership/roles and subscription/billing remain separate future releases.
- Barcode and full restaurant POS (tables, waiters, dine-in, KDS) remain intentionally excluded.
- Staging deployment/smoke is not evidenced because no staging target is configured.
- The source release has a newer local commit containing `.github/workflows/production-gate.yml` and `staging-smoke.yml`; GitHub publication still requires restoring a valid credential with workflow permission.

Production recommendation: **NO-GO (external release)** until staging deployment and smoke testing pass.
Local implementation/UAT recommendation: **PASS** for continued staging preparation; no unexplained inventory differences, high/critical dependency advisories, or serious/critical Axe violations remain.
