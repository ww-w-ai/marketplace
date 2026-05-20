# DevMD Source Discovery Patterns

Shared by `devmd-scan` and `devmd-gap-analysis`. Each table maps a DevMD file to the source code artifacts it describes.

## How to use

1. Run the **Detect** Glob/Grep to find candidate files
2. If hits > 5, read the first 3 by size (largest = most information)
3. If hits = 0, skip — the file is not applicable to this project
4. **Count** command gives the denominator for gap-analysis scoring

## Language Detection

```bash
# Run once at scan start. Result determines which column to use below.
if [ -f package.json ]; then echo "JS/TS"
elif [ -f pyproject.toml ] || [ -f setup.py ] || [ -f requirements.txt ]; then echo "Python"
elif [ -f go.mod ]; then echo "Go"
elif [ -f Cargo.toml ]; then echo "Rust"
elif [ -f pom.xml ] || [ -f build.gradle ] || [ -f build.gradle.kts ]; then echo "Java/Kotlin"
else echo "Unknown"; fi
```

---

## SCHEMA.md

### Model/Table Discovery

| Lang | Detect (Glob) | Detect (Grep) | Count |
|------|--------------|---------------|-------|
| JS/TS | `prisma/schema.prisma`, `**/*.entity.ts`, `**/*.model.ts`, `**/drizzle/*.ts`, `**/schema/*.ts` | `@Entity\|@Table\|model ` in prisma files | `grep -rc "@Entity\|defineTable\|pgTable\|model " {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Python | `**/models.py`, `**/models/*.py`, `**/*_model.py`, `alembic/versions/*.py`, `**/schema.py` | `class.*db\.Model\|class.*Base\)` | `grep -rc "class.*Model\|class.*Base)" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Go | `**/*_model.go`, `**/models/*.go`, `**/ent/schema/*.go` | `type.*struct` in model files | `grep -c "type.*struct" {hits}` |
| Rust | `**/models.rs`, `**/schema.rs`, `diesel.toml` | `#\[derive.*Queryable\]\|table!` | `grep -c "table!\|#\[derive.*Queryable" {hits}` |
| Java | `**/entity/*.java`, `**/domain/*.java`, `**/model/*.java` | `@Entity\|@Table` | `grep -rc "@Entity" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Common | `**/migrations/*.sql`, `**/schema.sql`, `**/migrate/*.sql` | `CREATE TABLE` | `grep -c "CREATE TABLE" {hits}` |

### Enum/Value Object Discovery (MUST also check — enum values often live outside ORM models)

| Lang | Detect (Glob) | Detect (Grep) | Count |
|------|--------------|---------------|-------|
| JS/TS | `**/enums/*.ts`, `**/types/*.ts`, `**/constants/*.ts`, `**/enums.ts` | `export enum\|as const` | `grep -rc "export enum\|as const" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Python | `**/value_objects.py`, `**/value_objects/*.py`, `**/enums.py`, `**/enums/*.py`, `**/types.py`, `**/constants.py` | `class.*Enum\)\|VALID_\|Literal\[` | `grep -rc "class.*Enum)\|VALID_\|Literal\[" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Go | `**/enum*.go`, `**/types.go`, `**/constants.go` | `const.*=.*iota\|type.*int` | `grep -c "iota\|type.*string" {hits}` |
| Rust | `**/types.rs`, `**/enums.rs` | `enum\s` | `grep -c "^pub enum\|^enum" {hits}` |
| Java | `**/enums/*.java`, `**/*Type.java`, `**/*Status.java` | `public enum` | `grep -rc "public enum" {hits} \| awk -F: '{s+=$2}END{print s}'` |

**Important**: When enum values in ORM models differ from domain-layer value objects, the domain layer is authoritative. Always cross-check both layers and flag discrepancies.

## API.md

| Lang | Detect (Glob) | Detect (Grep) | Count |
|------|--------------|---------------|-------|
| JS/TS | `**/routes/*.ts`, `**/router/*.ts`, `**/api/**/*.ts`, `**/*.resolver.ts`, `**/trpc/*.ts`, `openapi.json`, `openapi.yaml`, `**/*.graphql` | `@Get\|@Post\|@Put\|@Delete\|router\.\|app\.\(get\|post\|put\|delete\)` | `grep -rc "@Get\|@Post\|@Put\|@Delete\|\.get(\|\.post(\|\.put(\|\.delete(" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Python | `**/urls.py`, `**/views.py`, `**/api/*.py`, `**/routes/*.py`, `**/endpoints/*.py` | `@app\.route\|@router\.\|path(\|url(` | `grep -rc "@app\.\|@router\.\|path(" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Go | `**/handler/*.go`, `**/routes.go`, `**/api/*.go` | `r\.HandleFunc\|r\.Get\|r\.Post\|gin\.` | `grep -rc "HandleFunc\|\.GET\|\.POST\|\.PUT\|\.DELETE" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Java | `**/controller/*.java`, `**/rest/*.java` | `@GetMapping\|@PostMapping\|@RequestMapping` | `grep -rc "@GetMapping\|@PostMapping\|@PutMapping\|@DeleteMapping\|@RequestMapping" {hits} \| awk -F: '{s+=$2}END{print s}'` |

## ARCHITECTURE.md

| Lang | Detect | Count |
|------|--------|-------|
| All | Top-level directories: `ls -d */` | `ls -d */ \| wc -l` |
| JS/TS monorepo | `packages/*/package.json`, `apps/*/package.json`, `workspaces` field in root package.json | `find packages apps -maxdepth 2 -name "package.json" \| wc -l` |
| Python | `**/apps/*/`, top-level modules with `__init__.py` | `find . -maxdepth 2 -name "__init__.py" \| wc -l` |
| Go | `cmd/*/main.go`, `internal/*/` | `ls cmd/ internal/ 2>/dev/null \| wc -l` |

## ERRORS.md

| Lang | Detect (Glob) | Detect (Grep) | Count |
|------|--------------|---------------|-------|
| JS/TS | `**/errors/*.ts`, `**/exceptions/*.ts`, `**/error-codes*.ts` | `extends Error\|extends HttpException\|ERROR_CODE\|ErrorCode` | `grep -rc "extends.*Error\|extends.*Exception\|ERROR_CODE" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Python | `**/exceptions.py`, `**/errors.py`, `**/exceptions/*.py` | `class.*Exception\|class.*Error\(` | `grep -rc "class.*Exception\|class.*Error(" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Go | `**/errors.go`, `**/error*.go` | `var Err.*= errors\.New\|var Err.*= fmt\.Errorf` | `grep -rc "var Err" {hits} \| awk -F: '{s+=$2}END{print s}'` |
| Java | `**/exception/*.java` | `extends.*Exception` | `grep -rc "extends.*Exception" {hits} \| awk -F: '{s+=$2}END{print s}'` |

## UI.md

| Lang | Detect (Glob) | Count |
|------|--------------|-------|
| React | `**/pages/*.tsx`, `**/app/**/page.tsx`, `**/views/*.tsx`, `**/screens/*.tsx` | `find . -name "page.tsx" -o -name "*.page.tsx" \| wc -l` |
| Vue | `**/pages/*.vue`, `**/views/*.vue` | `find . -name "*.vue" -path "*/pages/*" -o -name "*.vue" -path "*/views/*" \| wc -l` |
| Svelte | `**/routes/**/+page.svelte` | `find . -name "+page.svelte" \| wc -l` |

## CONFIG.md

| Lang | Detect (Grep) | Count |
|------|---------------|-------|
| JS/TS | `process\.env\.\w+` across all source | `grep -roh "process\.env\.\w\+" src/ \| sort -u \| wc -l` |
| Python | `os\.environ\|os\.getenv\|settings\.\w+` | `grep -roh "os\.environ\[.\w\+.\]\|os\.getenv(.\w\+.)" \| sort -u \| wc -l` |
| Go | `os\.Getenv\|viper\.Get` | `grep -roh 'os\.Getenv("\w\+")' \| sort -u \| wc -l` |
| All | `.env.example`, `.env.sample` | `cat .env.example 2>/dev/null \| grep -c "="` |

## SECURITY.md

| Lang | Detect (Glob) | Detect (Grep) |
|------|--------------|---------------|
| JS/TS | `**/auth/*.ts`, `**/middleware/auth*.ts`, `**/guards/*.ts` | `cors\|helmet\|csrf\|bcrypt\|jwt\|passport\|@UseGuards` |
| Python | `**/auth/*.py`, `**/middleware/*.py` | `authenticate\|permission_classes\|csrf\|jwt\|bcrypt` |
| Go | `**/middleware/auth*.go` | `jwt\|bcrypt\|cors\|csrf` |

## INFRA.md

| Detect (Glob) | What it tells |
|---------------|--------------|
| `Dockerfile`, `docker-compose*.yml` | Container-based deployment |
| `**/*.tf`, `terraform/` | Terraform IaC |
| `wrangler.toml` | Cloudflare Workers |
| `vercel.json`, `.vercel/` | Vercel deployment |
| `netlify.toml` | Netlify deployment |
| `k8s/`, `**/deployment.yaml`, `**/helm/` | Kubernetes |
| `fly.toml` | Fly.io |
| `.github/workflows/*.yml` | GitHub Actions CI/CD |
| `Procfile` | Heroku |

## TESTING.md

| Lang | Detect (Glob) | Count |
|------|--------------|-------|
| JS/TS | `jest.config.*`, `vitest.config.*`, `**/*.spec.ts`, `**/*.test.ts`, `playwright.config.*`, `cypress.config.*` | `find . -name "*.spec.*" -o -name "*.test.*" \| wc -l` |
| Python | `pytest.ini`, `**/test_*.py`, `**/tests/*.py`, `tox.ini` | `find . -name "test_*.py" -o -name "*_test.py" \| wc -l` |
| Go | `**/*_test.go` | `find . -name "*_test.go" \| wc -l` |
| Java | `**/test/**/*.java`, `**/Test*.java` | `find . -path "*/test/*" -name "*.java" \| wc -l` |

## DESIGN.md

| Detect (Glob) | What it tells |
|---------------|--------------|
| `.storybook/`, `**/*.stories.tsx` | Design system with Storybook |
| `**/tokens/*.ts`, `**/theme/*.ts`, `tailwind.config.*` | Design tokens |
| `**/*.css`, `**/global*.css`, `**/variables.css` | CSS custom properties |
| `**/*.styled.ts`, `**/styles.ts` | CSS-in-JS |

## LOGGING.md

| Detect (Grep) | What it tells |
|---------------|--------------|
| `winston\|pino\|bunyan\|log4j\|logrus\|slog\|tracing::` | Logger library |
| `opentelemetry\|@opentelemetry\|otel` | OpenTelemetry integration |
| `sentry\|@sentry` | Error tracking |

## FLOWS.md, SCREENS.md, BRAND.md, GLOSSARY.md, PRODUCT.md

These files rely primarily on **reading existing docs** (README, CLAUDE.md, about pages) and **interpreting code semantics** rather than pattern matching. No deterministic Glob/Grep patterns — LLM judgment required.

## HARNESS.md, RUNTIME.md, LIFECYCLE.md, AGENTS.md, OPERATIONS.md, DEVOPS.md, CHANGELOG.md

| File | Detect (Glob) |
|------|--------------|
| HARNESS.md | `**/.env*` containing `OPENAI\|ANTHROPIC\|LLM`, `**/rag/*.ts`, `**/tools/*.ts`, `**/guardrails/*` |
| RUNTIME.md | `**/worker*.ts`, `**/jobs/*.ts`, `**/cron*.ts`, `**/queue*.ts`, `Procfile`, `**/bull*.ts` |
| LIFECYCLE.md | N/A — synthesized from all other files |
| AGENTS.md | `AGENTS.md`, `**/agents/*.ts`, `**/skills/*.ts`, `**/*.agent.ts` |
| OPERATIONS.md | `**/runbooks/*`, `docs/ops/*`, `**/alerts/*`, `**/monitors/*` |
| DEVOPS.md | `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, `Makefile`, `scripts/deploy*` |
| CHANGELOG.md | `CHANGELOG.md`, `CHANGES.md`, `HISTORY.md`, git tags |
