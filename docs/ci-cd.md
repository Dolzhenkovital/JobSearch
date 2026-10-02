# CI/CD: stage → main

Стан на 2026-10-02. Описано, що налаштовано в репозиторії; що саме перевірено наживо, зазначено в розділі «Що перевірено».

## Шлях зміни

```text
feature-гілка ──PR──▶ stage ──(деплой)──▶ https://dolzhenkovital.github.io/JobSearch/stage/
                        │
                        └──PR (лише зі stage)──▶ main ──(деплой)──▶ https://dolzhenkovital.github.io/JobSearch/
```

1. Робота ведеться у feature-гілці. Pull request відкривається у `stage`.
2. Після злиття у `stage` публікується тестове середовище.
3. Промоція у прод — pull request зі `stage` у `main`. PR у `main` з будь-якої іншої гілки не пройде перевірку `Promotion path`.
4. Прямі пуші у `stage` та `main` заборонені правилами гілок (rulesets); видалення гілок і force-push також.

Для `stage → main` використовуйте звичайний merge commit (не squash), щоб історії гілок не розходилися.

## Обов'язкові перевірки

Усі п'ять перевірок мають бути зеленими для PR і в `stage`, і в `main`.

| Перевірка | Workflow | Що робить |
| --- | --- | --- |
| `Promotion path` | `ci.yml` | У `main` приймає лише PR зі `stage` цього репозиторію. |
| `Lint` | `ci.yml` | `npm run lint` (oxlint), `npm run typecheck` (tsc), `pyflakes` для збирача. |
| `Unit tests` | `ci.yml` | `npm test` (Vitest, включно з PGlite-перевірками міграцій) і Python-тести збирача. |
| `Smoke tests` | `ci.yml` | Збирає сайт для цільового середовища та запускає Playwright (`e2e/`) на desktop і mobile. |
| `Code review` | `code-review.yml` | Автоматичне рев'ю зовнішньою LLM, результат публікується коментарем у PR. |

`Smoke tests` перевіряють: завантаження без помилок у консолі, визначення мови браузера, перемикання uk/en/fr/de та збереження вибору, усі розділи, відсутність горизонтального скролу, додавання вакансії вручну, німецьку у списку мов документів. Стрічка вакансій підміняється синтетичною (`e2e/fixtures/jobs.json`), тож перевірка не залежить від Job Bank.

## Код-рев'ю зовнішньою LLM

Workflow зроблено за зразком `codex-code-review.yml`: Codex CLI (закріплена версія з перевіркою SHA-256) викликає OpenAI-сумісний endpoint, отримує diff PR і перелік проєктних правил з [`.github/code-review-prompt.md`](../.github/code-review-prompt.md), а відповідь публікує в PR.

Налаштування додає власник репозиторію (Settings → Secrets and variables → Actions):

| Назва | Тип | Обов'язково | Значення |
| --- | --- | --- | --- |
| `CODEX_TOKEN` | secret | так | API-ключ провайдера. |
| `CODEX_BASE_URL` | secret (або variable) | так | Базова адреса OpenAI-сумісного API, наприклад `https://api.openai.com/v1`. Репозиторій публічний, тому адресу приватного проксі зберігайте як secret. |
| `CODEX_MODEL` | variable (або secret) | так | Ідентифікатор моделі. Як secret він маскується в публічних логах Actions. |
| `CODEX_WIRE_API` | variable | ні | `responses` (типово) або `chat`. |
| `CODE_REVIEW_LANGUAGE` | variable | ні | Мова рев'ю; типово Ukrainian. |

```bash
gh secret set CODEX_TOKEN
```

```bash
gh secret set CODEX_BASE_URL
```

```bash
gh variable set CODEX_MODEL --body "ІДЕНТИФІКАТОР_МОДЕЛІ"
```

Поведінка:

- Доки налаштувань немає, перевірка `Code review` червона з поясненням, і злиття неможливе. Це навмисно: рев'ю обов'язкове.
- Перевірка зелена, коли рев'ю створено й опубліковано. Зауваження дорадчі; рішення про злиття ухвалює власник. Якщо модель не відповіла або повернула порожній результат, перевірка червона.
- З diff для рев'ю вилучено перекладені словники `src/i18n/en.ts`, `fr.ts`, `de.ts` (їх повноту контролюють типи та `src/i18n.test.ts`) і `package-lock.json`. Український словник-джерело рев'юється.
- PR із форків та від Dependabot не отримують секретів, тому перевірка для них не пройде, доки власник не перенесе гілку у цей репозиторій.
- Текст PR і diff потрапляють у промпт як дані. Рев'юер запускається в sandbox лише для читання, а git-облікові дані перед запуском видаляються з робочої копії.

## Середовища

GitHub Pages дає один сайт на репозиторій, тому workflow `deploy.yml` за кожного запуску збирає **обидві** гілки й публікує їх разом: `main` у корінь сайту, `stage` у підкаталог `stage/`. Запуск відбувається після пушу в `main` або `stage`, двічі на добу за розкладом (оновлення стрічки Job Bank) і вручну.

| | Прод | Stage |
| --- | --- | --- |
| Гілка | `main` | `stage` |
| Адреса | `/JobSearch/` | `/JobSearch/stage/` |
| Supabase | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `STAGE_VITE_SUPABASE_URL`, `STAGE_VITE_SUPABASE_PUBLISHABLE_KEY` |
| Локальне сховище браузера | `jobsearch.workspace.v1` | `jobsearch.stage.workspace.v1` |
| Індексація | звичайна | `noindex`, позначка STAGE у шапці |

Stage і прод мають спільний origin (`dolzhenkovital.github.io`), тому stage-збірка використовує окремий ключ локального сховища й не читає та не змінює локальну копію проду.

**Бекенд stage.** Поки змінні `STAGE_VITE_SUPABASE_*` не задані, stage працює без хмари: дані лише в браузері, вхід і AI-функції недоступні. Щоб перевіряти на stage синхронізацію та Edge Function, створіть окремий проєкт Supabase, застосуйте міграції, розгорніть `jobsearch-api`, додайте `https://dolzhenkovital.github.io/JobSearch/stage/` у Redirect URLs і задайте дві змінні. Не підключайте stage до прод-проєкту: неперевірений код отримав би доступ до реальних даних.

**Після публікації** job `Post-deploy smoke` чекає, доки сайт віддасть саме цю збірку (`version.json`), перевіряє сторінку та `jobs.json` і запускає ті самі Playwright-тести проти опублікованих адрес. Це перевірка після факту: автоматичного відкату немає, червоний результат означає, що опублікований сайт треба виправляти наступним PR.

Edge Function і міграції Supabase **не** розгортаються з CI: для цього потрібен management token, якого в репозиторії немає. Зміни в `supabase/` розгортаються вручну за [admin-llm.md](admin-llm.md).

## Локальні команди

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
python -m unittest discover -s scripts -p "test_*.py"
```

```bash
npm run build
```

```bash
npm run test:smoke
```

Перед першим запуском smoke-тестів один раз встановіть браузер: `npx playwright install chromium`. Тести використовують збірку з `dist`, тому спершу виконайте `npm run build`. Для stage-варіанта задайте `JOBSEARCH_BASE=/JobSearch/stage/` та `VITE_APP_ENV=stage` і для збірки, і для тестів (у Git Bash на Windows додайте `MSYS2_ENV_CONV_EXCL=JOBSEARCH_BASE`, інакше шлях буде перетворено).

## Правила гілок

Для `stage` і `main` діє ruleset «stage and main»: зміни лише через pull request, п'ять обов'язкових перевірок, заборона force-push і видалення. Кількість обов'язкових людських схвалень — 0 (власник один, а схвалити власний PR GitHub не дозволяє); обов'язковим є автоматичне рев'ю. Якщо з'явиться другий учасник, збільште кількість схвалень у ruleset.

У середовищі `github-pages` дозволено деплой із гілок `main` і `stage`.

Аварійний обхід: власник може тимчасово вимкнути ruleset у Settings → Rules. Після цього поверніть його.

## Що перевірено

- Локально: `npm run lint`, `npm run typecheck`, `npm test`, Python-тести, `npm run build`, smoke-тести для прод-збірки (з публічною конфігурацією Supabase і без неї) та для stage-збірки.
- Workflow-файли перевірено на синтаксис YAML; генерацію промпта для рев'ю виконано локально на синтетичних даних.
- Виконання `Code review` у GitHub Actions залежить від налаштувань LLM, яких на момент написання ще не додано: цей workflow наживо не перевірено.
- Перший спільний деплой прод + stage відбудеться після злиття у `stage`. Поки нові workflow не потраплять у `main`, старий workflow на `main` (за розкладом двічі на добу) публікує сайт без `stage/`, тож адреса stage може тимчасово зникати до наступного запуску `Deploy`.
