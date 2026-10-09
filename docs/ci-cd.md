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
| `Lint` | `ci.yml` | `npm run lint` (oxlint), `npm run typecheck` (tsc), `pyflakes` для збирача, `deno check` для Edge Function `jobsearch-api` у Deno 2.1.4, як у Supabase Edge Runtime (див. [нижче](#перевірка-edge-function-у-deno)). |
| `Unit tests` | `ci.yml` | `npm test` (Vitest, включно з PGlite-перевірками міграцій) і Python-тести збирача. |
| `Smoke tests` | `ci.yml` | Збирає сайт для цільового середовища та запускає Playwright (`e2e/`) на desktop і mobile. |
| `Code review` | `code-review.yml` | Автоматичне рев'ю зовнішньою LLM, результат публікується коментарем у PR. |

`Smoke tests` перевіряють: завантаження без помилок у консолі, визначення мови браузера, перемикання uk/en/fr/de та збереження вибору, усі розділи, відсутність горизонтального скролу, додавання вакансії вручну, німецьку у списку мов документів. Стрічка вакансій підміняється синтетичною (`e2e/fixtures/jobs.json`), тож перевірка не залежить від Job Bank.

### Перевірка Edge Function у Deno

`supabase/functions/jobsearch-api/index.ts` і `supabase/functions/_shared/*.ts` виконуються в Supabase Edge Runtime (Deno). `npm run typecheck` не бачить `index.ts`, а `_shared/*.ts` перевіряє лише як код вебзастосунку: через імпорти з `src/`, з типами DOM і Node та з `@supabase/supabase-js` із `node_modules`. Тому job `Lint` запускає ще й `deno check` і резолвить імпорти так само, як рантайм:

- **Deno 2.1.4.** Цю версію вбудовано в Supabase Edge Runtime (`deno/Cargo.toml` у [supabase/edge-runtime](https://github.com/supabase/edge-runtime); перевірено для v1.77.4 на 2026-10-02), тож перевірка використовує типи API `Deno` і JavaScript тієї ж версії Deno, що й рантайм: API новіших версій Deno її не пройде. Deno встановлює `denoland/setup-deno`, закріплений за SHA коміту.
- **Import map із `supabase/functions/deno.json`.** Саме цей файл `supabase/config.toml` задає як `import_map` для `jobsearch-api`, а Edge Runtime під час бандлингу використовує його як конфігурацію Deno; він відображає `@supabase/supabase-js` на `npm:@supabase/supabase-js@2.117.2`. Тому CI передає його через `--config`. Без цього прапорця Deno, запущений із кореня репозиторію, узяв би `package.json` і `node_modules` вебзастосунку.
- **Версії з `supabase/functions/deno.lock`.** Edge Runtime читає lock-файл поруч із цією конфігурацією, а формат v5 спершу перетворює на v4: Deno 2.1.4 читає лише до v4. CI робить те саме перетворення скриптом [`deno_lock_v4.py`](../.github/scripts/deno_lock_v4.py) у тимчасовий файл; закомічений lock не змінюється.
- **`--frozen`.** Перевірка червона, якщо lock не фіксує весь граф залежностей, наприклад після зміни версії в `deno.json` без оновлення `deno.lock`.

Щоб оновити lock після зміни `deno.json`, виконайте з кореня репозиторію команду нижче в Deno 2.3 або новішому (вони читають і пишуть формат v5; Deno 2.1.4 lock v5 не прочитає) і закомітьте `supabase/functions/deno.lock`:

```bash
deno check --config supabase/functions/deno.json supabase/functions/jobsearch-api/index.ts
```

Коли Supabase оновить Deno у рантаймі, змініть `deno-version` у `ci.yml` і цей розділ. Зелена перевірка типів не означає, що функцію розгорнуто: Edge Function розгортається вручну (див. [Середовища](#середовища)).

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

Коли дерево `scripts/` однакове у main і stage, Deploy отримує публічну вибірку Job Bank один раз і копіює її в обидві збірки. Це запобігає різним статусам через збій другого послідовного запиту. Якщо у stage змінено збирач або його перевірки, для stage виконується окремий збирач, щоб перевірити зміну до промоції. Статус джерела й час отримання зберігаються без змін; спільна копія не перетворює `stale` на `success`.

Нинішній збирач використовує лише стандартну бібліотеку Python; його код і константи джерела повністю містяться у `scripts/`, без зовнішньої конфігурації чи environment-змінних. Якщо з’являться залежності або налаштування за межами цієї директорії, їх треба включити до умови порівняння. `prepare_stage_feed.py` перевіряє файл і мінімальну схему JSON перед копіюванням; логує ідентифікатори дерев, статус і час отримання. Окремі CI-тести перевіряють спільну копію, запуск зміненого збирача, збереження застарілого статусу й відмову на відсутньому або некоректному файлі.

Helper запускається з checkout stage, тому його власні зміни також проходять stage PR. Production і stage collector виконуються в одному runner тим самим Python без встановлення окремих залежностей. Snapshot замінюється після запису тимчасового файлу; помилка collector зупиняє deployment.

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

Edge Function і міграції Supabase **не** розгортаються з CI: для цього потрібен management token, якого в репозиторії немає. Зміни в `supabase/` розгортаються вручну за [admin-llm.md](admin-llm.md). Якщо розгорнута функція працює з іншою версією правил LLM, ніж опублікований сайт, адміністратор бачить попередження у вкладці «Зовнішній LLM» (розділ «Версія правил розгорнутої функції» в [admin-llm.md](admin-llm.md)); інших змін коду функції ця перевірка не виявляє.

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

Deno-перевірка Edge Function так, як у CI, потребує встановленого Deno 2.1.4. Перша команда кладе lock у форматі v4 в ігнорований `work/`, друга перевіряє типи:

```bash
python .github/scripts/deno_lock_v4.py supabase/functions/deno.lock work/deno.lock
```

```bash
deno check --frozen --config supabase/functions/deno.json --lock=work/deno.lock supabase/functions/jobsearch-api/index.ts
```

Перед першим запуском smoke-тестів один раз встановіть браузер: `npx playwright install chromium`. Тести використовують збірку з `dist`, тому спершу виконайте `npm run build`. Для stage-варіанта задайте `JOBSEARCH_BASE=/JobSearch/stage/` та `VITE_APP_ENV=stage` і для збірки, і для тестів (у Git Bash на Windows додайте `MSYS2_ENV_CONV_EXCL=JOBSEARCH_BASE`, інакше шлях буде перетворено).

## Правила гілок

Для `stage` і `main` діє ruleset «stage and main»: зміни лише через pull request, п'ять обов'язкових перевірок, заборона force-push і видалення. Кількість обов'язкових людських схвалень — 0 (власник один, а схвалити власний PR GitHub не дозволяє); обов'язковим є автоматичне рев'ю. Якщо з'явиться другий учасник, збільште кількість схвалень у ruleset.

У середовищі `github-pages` дозволено деплой із гілок `main` і `stage`.

Аварійний обхід: власник може тимчасово вимкнути ruleset у Settings → Rules. Після цього поверніть його.

## Що перевірено

- Локально: `npm run lint`, `npm run typecheck`, `npm test`, Python-тести, `npm run build`, smoke-тести для прод-збірки (з публічною конфігурацією Supabase і без неї) та для stage-збірки.
- Workflow-файли перевірено на синтаксис YAML; генерацію промпта для рев'ю виконано локально на синтетичних даних.
- Deno-перевірку Edge Function (2026-10-02) виконано лише в GitHub Actions, бо локально Deno не встановлено. У [запуску CI](https://github.com/Dolzhenkovital/JobSearch/actions/runs/37070019154) job `Lint` встановив Deno 2.1.4, завантажив з npm `@supabase/supabase-js` 2.117.2 і його залежності у версіях із `deno.lock` і помилок типів не знайшов. Негативний контроль у тимчасовій гілці: з навмисною помилкою типу в `index.ts` `npm run lint` і `npm run typecheck` пройшли, а `deno check` зробив `Lint` червоним ([запуск](https://github.com/Dolzhenkovital/JobSearch/actions/runs/37070210039)). Перетворення lock перевірено локально на прикладах із тестів Edge Runtime, `ci.yml` — actionlint 1.7.12.
- Виконання `Code review` у GitHub Actions залежить від налаштувань LLM, яких на момент написання ще не додано: цей workflow наживо не перевірено.
- Перший спільний деплой прод + stage відбудеться після злиття у `stage`. Поки нові workflow не потраплять у `main`, старий workflow на `main` (за розкладом двічі на добу) публікує сайт без `stage/`, тож адреса stage може тимчасово зникати до наступного запуску `Deploy`.
