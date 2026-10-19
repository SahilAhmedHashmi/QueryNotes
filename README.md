# Query Notes

A personal MySQL problem-solving showcase for **Sahil Ahmed Hashmi**, designed for recruiters and hiring managers. Includes a responsive light/dark theme, search, difficulty/topic filters, complete solution pages, and a private publishing workspace.

## 1. Run locally on Windows

Install **Node.js 22.12 or later** (a current LTS release is recommended). This project uses npm; Python and Anaconda are not needed.

Extract this folder, open it in VS Code, and run in PowerShell:

```powershell
cd "D:\query-notes"
npm ci
npm run dev
```

Open **http://localhost:5173**. Adjust the folder path to wherever you extracted the project. Vite will print the actual address if that port is occupied.

Without configuration, the public site shows three clearly labelled sample problems. Go to **/admin** and click **Try the local editor demo** to try writing, tables, drafts, preview, publishing, updates, unpublishing, and deletion. Demo changes are stored only in that browser. The demo is enabled only on localhost/127.0.0.1; it is not a production authentication bypass. Connect Supabase for shared, durable storage. Demo content is separate and is not uploaded automatically.

## 2. Connect authentication and storage

Vercel hosts the website. **Supabase supplies the database and authentication.** You need a Supabase account/project and public connection values; no paid search or LLM API is involved. Your displayed solutions use **MySQL**. Supabase's PostgreSQL database only stores website content; visitors do not execute the showcased queries.

1. Create a project at [Supabase](https://supabase.com/).
2. Open its **SQL Editor** and run **supabase/schema.sql** once. This creates protected drafts, public published snapshots, owner permissions, and publishing functions. Do not run the file repeatedly against an existing schema.
3. Optionally run **supabase/seed.sql** to populate the three demonstration posts. They remain marked as samples and can be edited, unpublished, or deleted in your editor. If you skip seeding, your connected notebook starts empty. Static samples do not reappear when the connected notebook is empty.
4. Copy `.env.example` to `.env.local`:

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. Replace the example values with your **Project URL** and **publishable key** (or legacy **anon/public** key), available from the project's Connect dialog or API settings. Never use a secret or `service_role` key in a `VITE_` variable. These browser variables are public; database grants and row-level security enforce access.
6. Restart `npm run dev` after changing environment variables.

### Email and password

In Supabase **Authentication → Users**, create your owner account with an email and password (confirm the email as appropriate). The site has no public signup form. Configure your email delivery settings in Supabase for password reset emails. Reset emails can be requested from the sign-in screen after entering the account email. Production email delivery/provider configuration must be verified in your project.

### Google sign-in

Follow the [official Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google):

1. Configure a Google OAuth consent screen and web application client in Google Cloud.
2. Add the Supabase callback URL shown in its Google provider settings as an **Authorized redirect URI** (typically `https://YOUR-PROJECT.supabase.co/auth/v1/callback`). Add the localhost and production website origins where required by Google.
3. Enter the Google client ID and secret in **Supabase Authentication → Sign In / Providers → Google**, and enable the provider. Google secrets belong in Supabase, never in this repository or Vercel's public variables.
4. In Supabase **Authentication → URL Configuration**, set your production site URL after deployment, and allow `http://localhost:5173/admin` plus `https://YOUR-SITE.vercel.app/admin` as redirect URLs. Include your custom domain's `/admin` if you use one.
5. If the Google app remains in testing, add your Google account as a test user. For public OAuth use, complete Google's applicable publishing requirements.
6. Sign in once with your Google account. Until you authorize its UUID below, the site correctly reports that the account has no editor access.

### Authorize only your account

From Supabase **Authentication → Users**, copy the **User UID** of your owner account and run this in the SQL Editor:

```sql
insert into public.note_admins (user_id)
values ('REPLACE-WITH-YOUR-USER-UUID')
on conflict do nothing;
```

Sign out and sign back in (or reload). The editor should open. Only accounts listed in `note_admins` can read or write drafts or publish. An arbitrary authenticated user cannot grant themselves access. If your email/password and Google methods create different users, authorize only the account IDs you intend to use. A displayed email address or a frontend environment variable does not grant ownership.

## 3. Deploy to Vercel

1. Push this folder to your own GitHub repository. Keep `.env.local`, `node_modules`, and `dist` out of Git; `.gitignore` is included.
2. Import the repository into Vercel. If the project folder is nested in a repository, set **Root Directory** to `query-notes`.
3. Select **Vite** as the framework, **npm run build** as the build command, and **dist** as the output directory. `vercel.json` includes the SPA rewrite so direct links such as `/notes/customers-who-never-ordered`, `/about`, and `/admin` resolve correctly.
4. Add these environment variables in Vercel before building:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

5. Deploy. Set your Supabase Site URL and redirect allowlist to the resulting production URL as described above. If you change Vercel environment variables later, redeploy: Vite embeds them at build time.
6. Verify a public note link in a private browser window, sign in as the owner, and publish a small test post. Confirm a non-owner account cannot access the editor.

You can also deploy with Vercel CLI from this folder (`npx vercel`, then `npx vercel --prod`) after configuring the same variables in Vercel.

## 4. Write and publish

- Open **/admin** and click **New problem**.
- Set a title, summary, and URL slug. The title generates an initial slug; you can edit it manually. Slugs must be unique, lowercase, and use only letters, numbers, and separating hyphens.
- Manually choose **Easy**, **Moderate**, or **Hard**. Add preset or custom SQL topic tags.
- Write the problem, approach, explanation, and takeaways with the visual editor. SQL has its own field.
- Add one or more **Before / sample data** tables and **After / expected output** tables. Name the tables and columns. Add/delete rows or columns, or choose **Paste data** to paste a copied Excel range (tab-separated) or CSV. Include column names in the first row. Pasting replaces that table's current cells. CSV quoting is supported; inconsistent row widths are rejected. Values are displayed as text, not executed.
- Optionally add another SQL solution and performance notes.
- **Save draft** saves the private working version. Saving is explicit, not automatic. **Preview** displays the current working content privately.
- **Publish** saves the latest changes and creates a separate public snapshot. On a published note, saving edits changes only the private draft. **Update published post** replaces the public snapshot. Required publishing fields: title, valid slug, problem, SQL solution, explanation, and names for any tables/columns you include.
- Notes are listed newest **first published** first. Updating an existing note preserves its original position; unpublishing and publishing again gives it a new publication date. No featured-post controls are included.
- **Unpublish** removes the public copy and keeps the draft. **Delete** permanently removes both after confirmation.
- A version check prevents an old browser tab from silently overwriting a newer saved draft. If a conflict occurs, copy any unsaved work elsewhere, reload the editor, and reapply it.
- Empty optional alternative/performance sections are omitted on the public page. Leave the sample checkbox enabled only for demonstration posts.

## 5. Checks and implementation

```powershell
npm run build
npm test
```

The tests run the actual PostgreSQL schema and publishing functions in an isolated PGlite database. They check anonymous/non-owner access, owner access, private draft isolation, version conflicts, preserving publication order, unpublishing, cascading deletion, and seed idempotence. These emulate Supabase's `auth.uid()` and client roles; they do not exercise hosted Google OAuth or email delivery. Those require your configured accounts and project.

Browser checks performed during delivery cover search/filtering, local editor save/preview/publish/update/unpublish/delete, CSV import, mobile overflow, and light/dark layouts. The example queries are written for MySQL (window/CTE examples require 8.0+); this platform does not run SQL. Review your own result tables before publishing.

Key source files:

- `src/App.tsx`: public notebook, profile, navigation, and note routes.
- `src/Admin.tsx`: sign-in, workspace, and editor.
- `src/components/RichEditor.tsx`: Tiptap visual editor.
- `src/components/TableEditor.tsx`: table editing and CSV/spreadsheet pasting.
- `src/components/Content.tsx`: safe rich-text rendering, tables, and SQL highlighting.
- `src/data.ts`: Supabase data operations and explicitly local demo mode.
- `src/samples.json`: sample content.
- `src/style.css`: responsive design and themes.
- `supabase/schema.sql`: permissions, private drafts, public snapshots, and transactional functions.
- `supabase/seed.sql`: optional sample seed. Regenerate with `npm run seed:sql` after editing `src/samples.json`.

Edit the short bio or public contact email in `src/App.tsx`. No résumé PDF, phone number, or undisclosed social links are bundled. The display font loads from Google Fonts when available and falls back to system fonts if unavailable.

Rich text is sanitized with DOMPurify on display; SQL is syntax-highlighted but never executed. Public readers query only `published_notes`, not the draft table. Publishing is transactional in PostgreSQL. Owner UUIDs live in a protected database table. This is a Vite SPA, so per-note metadata is set in the browser rather than server-rendered for social crawlers.

Official references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
