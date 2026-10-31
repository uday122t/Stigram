# Stigram

A sticker-first social platform foundation with an Arabic-first responsive interface.

## Included
- Responsive Arabic/English RTL/LTR UI
- Sticker discovery, categories, search, browser-local favorites and profile screens
- Image upload preview/editor: erase, restore, rotate, transparent PNG export
- Supabase schema for profiles, stickers, posts, likes, comments, follows, collections and groups
- Supabase email authentication and sticker storage integration hooks

## Backend setup
Follow [DEPLOY.md](DEPLOY.md). In brief:
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create a public Storage bucket named `stigrams` and run `supabase/storage-policies.sql`.
4. In `index.html`, replace the empty `SUPABASE_URL` and `SUPABASE_ANON_KEY` values in the CONFIG constant with your Supabase Project URL and anon/public key. Never expose a service_role key.
5. Enable email authentication.

## Deployment
Enable GitHub Pages in repository Settings → Pages, deploying branch `main` from the root folder. Expected URL: https://uday122t.github.io/Stigram/

## Current limitations
This is a working frontend foundation, not yet a finished production social network. Demo content and unsynced saved stickers are browser-local. Comments, likes, follows, group messaging, moderation, full server-side search, video processing and automatic AI background removal remain to be implemented. Instagram does not offer a public API for inserting arbitrary stickers into native sticker favorites; sharing/download is the supported path.
