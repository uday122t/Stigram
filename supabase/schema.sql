create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (char_length(username) between 3 and 24),
 display_name text not null default '', bio text not null default '', avatar_url text,
 created_at timestamptz not null default now()
);
create table if not exists public.stickers (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, description text default '', media_url text not null, media_type text not null check(media_type in ('image','gif','video')),
 is_public boolean not null default true, tags text[] not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 sticker_id uuid references public.stickers(id) on delete set null, caption text default '', media_url text,
 visibility text not null default 'public' check(visibility in ('public','private')), created_at timestamptz not null default now()
);
create table if not exists public.follows (follower_id uuid references auth.users(id) on delete cascade, following_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), primary key(follower_id,following_id), check(follower_id<>following_id));
create table if not exists public.likes (user_id uuid references auth.users(id) on delete cascade, post_id uuid references public.posts(id) on delete cascade, created_at timestamptz default now(), primary key(user_id,post_id));
create table if not exists public.comments (id uuid primary key default gen_random_uuid(), post_id uuid references public.posts(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, body text not null, created_at timestamptz default now());
create table if not exists public.collections (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, name text not null, created_at timestamptz default now());
create table if not exists public.collection_stickers (collection_id uuid references public.collections(id) on delete cascade, sticker_id uuid references public.stickers(id) on delete cascade, primary key(collection_id,sticker_id));
create table if not exists public.groups (id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete cascade, name text not null, description text default '', is_public boolean default true, created_at timestamptz default now());
create table if not exists public.group_members (group_id uuid references public.groups(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, role text default 'member', primary key(group_id,user_id));
create table if not exists public.group_posts (id uuid primary key default gen_random_uuid(), group_id uuid references public.groups(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, sticker_id uuid references public.stickers(id) on delete set null, body text default '', created_at timestamptz default now());

alter table public.profiles enable row level security;
alter table public.stickers enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.collections enable row level security;
alter table public.collection_stickers enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;

create policy "profiles readable" on public.profiles for select using (true);
create policy "profile owner write" on public.profiles for all using (auth.uid()=id) with check(auth.uid()=id);
create policy "public stickers or owner" on public.stickers for select using (is_public or auth.uid()=user_id);
create policy "sticker owner manage" on public.stickers for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "public posts or owner" on public.posts for select using (visibility='public' or auth.uid()=user_id);
create policy "post owner manage" on public.posts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "follows readable" on public.follows for select using(true);
create policy "follow self manage" on public.follows for all using(auth.uid()=follower_id) with check(auth.uid()=follower_id);
create policy "likes readable" on public.likes for select using(true);
create policy "like self manage" on public.likes for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "comments readable" on public.comments for select using(true);
create policy "comment self manage" on public.comments for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "collections owner" on public.collections for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "collection items owner" on public.collection_stickers for all using(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid())) with check(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid()));
create policy "public groups or member" on public.groups for select using(is_public or exists(select 1 from public.group_members m where m.group_id=id and m.user_id=auth.uid()));
create policy "group owner manage" on public.groups for all using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
create policy "members visible" on public.group_members for select using(true);
create policy "self join group" on public.group_members for insert with check(auth.uid()=user_id);
create policy "self leave group" on public.group_members for delete using(auth.uid()=user_id);
create policy "group posts visible to members" on public.group_posts for select using(exists(select 1 from public.groups g where g.id=group_id and (g.is_public or exists(select 1 from public.group_members m where m.group_id=g.id and m.user_id=auth.uid()))));
create policy "group posts author write" on public.group_posts for insert with check(auth.uid()=user_id and exists(select 1 from public.group_members m where m.group_id=group_id and m.user_id=auth.uid()));
