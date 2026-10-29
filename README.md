# Payload 3.92.1: admin untitled label, id comparison and `[object Object]` labels

Minimal reproduction for five defects in `@payloadcms/ui`.

- Payload `3.92.1` (`payload`, `@payloadcms/next`, `@payloadcms/ui`, `@payloadcms/db-postgres`,
  `@payloadcms/richtext-lexical`, `@payloadcms/translations` all pinned to `3.92.1`), Next.js `16.3.3`,
  React `19.2.1`, Node 22, pnpm 11.
- Database: `@payloadcms/db-postgres` with no `idType`, so ids are serial (numbers).
- Admin languages: `en` and `sv` (`@payloadcms/translations/languages/sv`).
- Seed data: none. Everything below is done by hand in the admin.

## Run

```sh
docker run --rm --name payload-repro-db -p 5432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=repro \
  postgres:16

cp .env.example .env     # DATABASE_URI=postgres://postgres:postgres@localhost:5432/repro
pnpm install
pnpm dev                 # http://localhost:3000/admin
```

Open the admin at `localhost`, not `127.0.0.1`: Next dev blocks the dev assets for `127.0.0.1`
and the page never hydrates there.

In dev the Postgres adapter pushes the schema on start, so no migration is needed.
Create the first user when `/admin` asks for it. Change the admin language under
Account > Language.

## Collections

- `posts`: `labels: { singular: { en: 'Post', sv: 'Inlägg' }, plural: { en: 'Posts', sv: 'Inlägg' } }`,
  `admin.useAsTitle: 'title'`, no `versions`/drafts, field `title` (not required) with
  `label: { en: 'Title', sv: 'Titel' }` (`src/collections/Posts.ts`).
- `comments`: a `relationship` field `post` to `posts` (`src/collections/Comments.ts`).
- `users`: auth collection, only so the admin can be entered.

Vendor line numbers below are the built files in `node_modules/@payloadcms/ui/dist/` of 3.92.1;
the matching source is `packages/ui/src/...` in the Payload repository at tag `v3.92.1`
(same files, the TSX line numbers differ slightly and are given in brackets).

## Repro 1: brackets around the untitled label

1. Set the admin language to Swedish.
2. Open `/admin/collections/posts/create`.
3. Expected: the heading reads `Namnlös`, and a translation override of `general:untitled` can control the text.
4. Actual: the `h1` reads `[Namnlös]` (the breadcrumb reads `Skapa ny` and is not affected). The brackets are a template literal around the translation, so no translation override removes them.
5. Vendor: `dist/utilities/formatDocTitle/index.js:48` (source `utilities/formatDocTitle/index.ts:76`):
   `` title = typeof fallback === 'string' ? fallback : `[${i18n.t('general:untitled')}]` ``.

## Repro 2: `title === id` is never true on numeric ids

1. On the create screen of `posts`, leave `Titel` / `Title` empty and save.
2. The document opens at `/admin/collections/posts/1`. Inspect the heading in the browser.
3. Expected: the `render-title--has-id` class on the `h1` and an `ID: 1` label (the branch meant for an untitled saved document).
4. Actual: the `h1` shows a bare `1` with no `render-title--has-id` class and no `ID:` label. `DocumentTitleProvider` seeds the title with `id?.toString()` (a string) and `id` is a number, so the comparison is false.
5. Vendor: `dist/elements/RenderTitle/index.js:28` (source `elements/RenderTitle/index.tsx:27`): `const idAsTitle = title === id`. The branch is reachable only with text ids.

## Repro 3: dashboard card, `aria-label` is `[object Object]`

1. Open `/admin` (the dashboard) in Swedish, then in English.
2. Inspect the plus link on the `Posts` / `Inlägg` card (`labels.plural` is an `{ en, sv }` record).
3. Expected: `aria-label` and `title` contain the resolved plural label (for example `Create new Posts`).
4. Actual: `aria-label` and `title` read `Skapa ny [object Object]` in Swedish and `Create new [object Object]` in English. The card title is correct.
5. Vendor: `dist/widgets/CollectionCards/index.js:111` (source `widgets/CollectionCards/index.tsx:109-111`): `t('general:createNewLabel', { label })` with the raw label; the title of the same card uses `getTranslation(label, i18n)` (source `:124`). `Button` copies `aria-label` into `title`.

## Repro 4: sort buttons, `aria-label` is `[object Object]`

1. Open `/admin/collections/posts` in Swedish, then in English.
2. Inspect the two buttons in the `Titel` / `Title` column header (`label` is an `{ en, sv }` record).
3. Expected: `Sortera efter Titel Stigande` / `Sort by Title Ascending`, and the descending equivalents.
4. Actual: `Sortera efter [object Object] Stigande` and `... Fallande` in Swedish, `Sort by [object Object] Ascending` and `... Descending` in English. The visible header text is correct (`FieldLabel` uses `getTranslation`).
5. Vendor: `dist/elements/SortColumn/index.js:82` and `:93` (source `elements/SortColumn/index.tsx:54-57` and `:65-68`): `t('general:sortByLabelDirection', { direction, label })` with the raw field label, passed in by `dist/providers/TableColumns/buildColumnState/index.js:115,122`.

## Repro 5: document drawer toggler, `aria-label` is `[object Object]`

1. Open `/admin/collections/comments/create` in Swedish, then in English.
2. Inspect the add-new button next to the `post` relationship field (`posts` has `labels.singular` as an `{ en, sv }` record).
3. Expected: an accessible name containing the resolved singular label (`Lägg till ny Inlägg` / `Add new Post`).
4. Actual: `Lägg till ny [object Object]` in Swedish and `Add new [object Object]` in English. The tooltip is correct (`AddNewRelation` uses `getTranslation`). The `edit` branch passes the same value to `general:editLabel`.
5. Vendor: `dist/elements/DocumentDrawer/index.js:37-38` (source `elements/DocumentDrawer/index.tsx:48-50`): `t(operation === 'create' ? 'fields:addNewLabel' : 'general:editLabel', { label: collectionConfig?.labels.singular })`. The template function joins the value it is given, so a record prints `[object Object]`.

## Suggested fixes

- Repros 3 to 5: resolve the label with `getTranslation(label, i18n)` before it reaches `t()`, at the three sites.
- Repro 2: compare as strings, for example `String(title) === String(id)`.
- Repro 1: let the label be overridden as a whole (a translation that carries the brackets, or a `fallback` / `title` prop reachable from `admin.components`).

## Observed

All five were observed on 2026-10-29 in a running admin (this project, Postgres 16, Chromium
headless), in Swedish and, for repros 3 to 5, also in English, with the text quoted above.

## Checks run without a database

`pnpm install`, `pnpm exec tsc --noEmit` and `pnpm build` all complete without a running database.
