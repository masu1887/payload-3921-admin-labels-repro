import type { CollectionConfig } from 'payload'

// Triggers:
// - repro 1 and 2: `admin.useAsTitle: 'title'`, no `versions`/drafts, `title` is not required
// - repro 3 and 5: `labels.plural` / `labels.singular` are `{ en, sv }` records
// - repro 4: the `title` field has an `{ en, sv }` `label` and is a list column
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: { en: 'Post', sv: 'Inlägg' },
    plural: { en: 'Posts', sv: 'Inlägg' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { en: 'Title', sv: 'Titel' },
    },
  ],
}
