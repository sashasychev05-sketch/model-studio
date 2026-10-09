# Разработка

Запуск веб-версии не требует установки внешних пакетов. Нужен Node.js 22.13+; интерфейс использует стандартные ES-модули браузера.

## Карта файлов

- `server.mjs` — локальный HTTP-сервис, статика, API и изолированный показ HTML.
- `lib/model.js`, `lib/authoring.js` — схема модели, проверка и редактирование ссылок.
- `lib/engine.js`, `lib/interaction.js` — численный расчёт и взаимодействия.
- `lib/teaching.js`, `lib/measurements.js`, `lib/audit.js` — построения, измерения и аудит.
- `lib/storage.mjs` — атомарное сохранение, ревизии и история.
- `gallery/` — ровно 20 подготовленных примеров и восемь разделов.
- `lib/public-gallery.mjs` — загрузка начальной публичной библиотеки.
- `web/` — каталог, инспектор, сцена, экспорт, темы и встроенное руководство.
- `tools/*.test.mjs` — проверки законов, файлового сервиса, редактора и экспорта.
- `tools/test-examples.mjs` — небольшие расчётные фикстуры; они не добавляются в каталог.

Фабрики в lib содержат расчётные определения для регрессионных проверок и миниатюр. Библиотека пользователя определяется gallery/catalog.json при первом запуске, затем файлами data/. Установщики старых больших наборов из публичной версии удалены.

## Запуск проверок

```sh
pnpm install --frozen-lockfile --ignore-scripts
node --test tools/*.test.mjs
node tools/check-gallery.mjs
node tools/build-guide.mjs
```

Проверки хранилища создают изолированные каталоги под work/. Не запускайте проверки с реальными пользовательскими данными. Численные тесты не заменяют браузерную проверку: проверьте тему, малый экран, сохранение, импорт, экспорт и встроенные HTML.

## Обновить пример

Редактируйте один JSON в gallery/ и сохраните исходный id/folderId. В библиотеке должно оставаться 10–20 моделей. Проверьте выражения, весь диапазон параметров и неизменность масштаба. Укажите допущения, единицы и понятную идею опыта в docs/MODELS.md. Изменение gallery/ не перезаписывает пользовательские data/; для просмотра новой начальной библиотеки используйте отдельный MODEL_STUDIO_DATA_DIR.

## API и CLI

```sh
node tools/model-cli.mjs list
node tools/model-cli.mjs get MODEL_ID draft.json
node tools/model-cli.mjs save draft.json
```

Адрес по умолчанию http://127.0.0.1:4189; изменяется через MODEL_STUDIO_URL. Обновление требует id, revision, folderId и spec из текущей записи. POST /api/library использует action и expectedRevision. MCP доступен локально на /mcp; интеграция с каким-либо ассистентом не обязательна.

Файлы моделей, импортированные пользовательские документы, черновики и история сохранений не должны попадать в публичные коммиты. Проверяйте git status перед публикацией. Обсуждения разработки не являются данными для приложения.

## Научные сборки 2.1

Runtime JS уже включён в web/vendor/. Для пересборки установите pnpm 11.25.0, выполните `pnpm install --frozen-lockfile --ignore-scripts`, затем `node tools/build-science.mjs`. esbuild закреплён, lockfile проверяется вместе с локальными сборками. `node tools/science-benchmark.mjs` обновляет измерения ядра. Проверки: `node --test tools/*.test.mjs`, `node tools/check-gallery.mjs`.

lib/compute/ содержит схемы и адаптер statistics-js/1; web/workers/ — worker; web/data/ — UI/клиент. Браузер и Node используют те же вычислительные модули. Маршрут /web/vendor/ нужен относительным импортам из lib/compute; не удаляйте его без изменения import-путей и HTTP-тестов. Пользовательские analysis сохраняются только через обычный versioned API. См. [первый этап](SCIENCE-STAGE-1.md).

## Desktop и проверки пользовательских сценариев

См. [Модельная 2.3](DESKTOP.md). Для разработки отдельного окна: pnpm install --frozen-lockfile, node node_modules/electron/install.js, pnpm desktop. Для Chromium: pnpm exec playwright install chromium, pnpm test:browser. Windows-приложение проверяется pnpm test:desktop. GitHub Actions проверяет также собранный exe и выдаёт ZIP-артефакт. Все проверки используют отдельные каталоги work/.

Сервер экспортирует startServer для desktop, но прямой node server.mjs сохраняет прежнее поведение. GET/POST /api/analysis используют optimistic revision. GET /api/backup выгружает библиотеку; POST /api/backup/preview валидирует и возвращает expectedState; POST /api/backup/restore проверяет этот снимок, сохраняет прежний каталог и заменяет библиотеку. Подробные лимиты и восстановление после прерывания описаны в DESKTOP.md.

Версия 2.3.1 добавляет pnpm package:installer (NSIS), desktop/preload.cjs с ограниченным IPC и desktop/updates.mjs с явными подтверждениями. tools/desktop-stage.mjs собирает минимальную поставку и лицензии updater. Продуктовые данные остаются вне установки; ZIP не обновляется автоматически. На теге vVERSION CI публикует проверенный установщик и latest.yml через tools/publish-release.mjs. Для цифровой подписи и процедуры выпуска см. DESKTOP.md.
