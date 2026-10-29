import type { CollectionConfig } from 'payload'

// Triggers repro 5: a relationship field to a collection whose `labels.singular` is a record.
export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'text',
  },
  fields: [
    {
      name: 'text',
      type: 'text',
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
    },
  ],
}
