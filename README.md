# Project Library

Personal library for books, manga and anime.

Stack: Next.js 16, TypeScript, Neon Postgres, Managed Neon Auth, Vercel.

## Environment

Copy `.env.example` to `.env.local` and configure Neon/Auth variables. Never commit secrets.

## Catalog providers

- Books: Open Library with Italian-edition-aware search and ISBN support
- Manga: MyAnimeList (`MAL_CLIENT_ID`), with Jikan development fallback only
- Anime: TVmaze

Application data uses an internal `profiles.id` UUID separated from the authentication provider identity so the backend remains portable.
