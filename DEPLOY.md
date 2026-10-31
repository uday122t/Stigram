# Stigram deployment checklist

## 1. Supabase backend
- Create a Supabase project.
- Run `supabase/schema.sql` in SQL Editor.
- Create a Storage bucket called `stigrams` and make it public for the current public-media flow.
- Run `supabase/storage-policies.sql`.
- In the repository root, open `config.js` and paste your Supabase Project URL into `SUPABASE_URL` and the anon/public key into `SUPABASE_ANON_KEY`. Never put a service_role key in frontend code.
- The signup trigger in `supabase/schema.sql` automatically creates each user profile. Re-run the updated schema in SQL Editor if you already ran an older version.
- Enable Email auth in Supabase. Configure the allowed redirect URLs for your deployed domain.

## 2. Publish the frontend
- In GitHub open Settings → Pages.
- Under Build and deployment choose Deploy from a branch.
- Select branch `main` and folder `/ (root)`, then Save.
- Wait for the Pages deployment to finish. The expected URL is https://uday122t.github.io/Stigram/

## 3. Current implementation boundaries
- The site includes a responsive UI, Arabic/English toggle, local sticker preview/editor (eraser, restore, rotate, PNG export), browser-local saved stickers, and Supabase auth/upload hooks.
- Demo cards and locally created stickers are local preview data. The social feed is not yet a complete production social network: comments, likes, follows, group messaging, moderation, video transcoding, and full server-side search still need implementation.
- The browser editor currently erases pixels; automatic AI background removal is not included.
- Instagram does not expose a public API to insert arbitrary stickers into Instagram's native sticker favorites. Users can download/share media instead.
