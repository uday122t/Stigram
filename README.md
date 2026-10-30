# Stigram

A sticker-first social platform foundation.

## Included
- Responsive Arabic/English RTL/LTR UI
- Sticker discovery, categories, search, favorites and profile screens
- Upload/editor flow with transparent/background-preserving modes
- Supabase schema for profiles, stickers, posts, likes, comments, follows, collections and groups

## Backend setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a Storage bucket named `stigrams`.
4. Set the Supabase URL and anon key in `src/config.js`.
5. Enable email authentication.

GitHub Pages can host the frontend; authentication, uploads and social data require Supabase. Instagram does not provide a public API to insert arbitrary images into a user's Instagram sticker favorites, so sharing is via download/share-sheet.
