# Stigram deployment checklist

## 1. Supabase backend
- Create a Supabase project.
- Run `supabase/schema.sql` in SQL Editor.
- Run `supabase/storage.sql` in SQL Editor. It creates the public `stigrams` bucket and applies per-user upload/update/delete policies.
- In `index.html`, find `const CONFIG={SUPABASE_URL:"",SUPABASE_ANON_KEY:""};` and replace the empty strings with your Supabase Project URL and anon/public key. Never put a service_role key in frontend code.
- Enable Email auth in Supabase. Configure the allowed redirect URLs for your deployed domain.

## 2. Publish the frontend
- In GitHub open Settings → Pages.
- Under Build and deployment choose GitHub Actions as the source.
- Wait for the Pages deployment workflow to finish successfully. The expected URL is https://uday122t.github.io/Stigram/

## 3. Current implementation boundaries
- The site includes a responsive UI, Arabic/English toggle, local sticker preview/editor (eraser, restore, rotate, PNG export), browser-local saved stickers, and Supabase auth/upload hooks.
- Demo cards and locally created stickers are local preview data. The social feed is not yet a complete production social network: comments, likes, follows, group messaging, moderation, video transcoding, and full server-side search still need implementation and end-to-end testing.
- The browser editor currently erases pixels; automatic AI background removal is not included.
- Instagram does not expose a public API to insert arbitrary stickers into Instagram's native sticker favorites. Users can download/share media instead.
