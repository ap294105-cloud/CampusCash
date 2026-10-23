# Campus Cash

Campus Cash is a student finance workspace for tracking spending, planning budgets, saving toward goals, and understanding college costs. It combines a practical finance dashboard with an interactive Three.js campus scene.

## Live demo

[Open Campus Cash](https://campus-cash-student-budget.ap294105.chatgpt.site)

Netlify alias: <https://campus-cash-e4c38212.netlify.app>

## Features

- Transaction, income, savings, and account tracking
- Monthly budgets, safe-to-spend daily allowance, and spending insights
- Savings goals with animated 3D progress feedback
- Recurring bill reminders and roommate expense splitting
- CSV bank-statement import with review and duplicate protection
- Local receipt OCR and offline expense drafts
- College fee planning, reports, and CSV exports
- Admin directory with provisioning, status controls, and role assignments
- Audit search, compliance report export, retention policy, backup policy, and system health panels
- Communication, developer, workspace, and infrastructure control panels
- Responsive layout, installable web app metadata, reduced-motion support, and light mode

## Local development

Requirements:

- Node.js 22.13 or newer
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Create a production build with:

```bash
npm run build
```

The project uses Vinext, React, Three.js, Tailwind CSS, Recharts, and Cloudflare Workers-compatible output. Persistent finance data is stored in the configured D1 database, and ChatGPT identity authentication protects private workspaces.

## Project structure

- `app/page.tsx` — main dashboard and admin experience
- `app/api/finance/route.ts` — authenticated finance operations
- `app/api/planner/route.ts` — recurring bills and roommate split data
- `app/api/admin/route.ts` — administrator controls and audit data
- `components/spatial-backdrop.tsx` — animated 3D background scene
- `components/campus-explorer.tsx` — interactive 3D navigation landmarks
- `public/3d/` — GLB models used by the scene
- `db/` and `drizzle/` — database schema and migrations

## Security notes

User finance queries are scoped to the authenticated user. Admin routes are restricted to the configured administrator identity and record administrative actions in the audit log. Provider-dependent controls such as SMS delivery, SSO, CAPTCHA, cloud backups, vulnerability feeds, and canary routing remain gated until their external provider is connected.

Do not commit provider credentials, tokens, local environment files, database exports, or generated build artifacts.

## Deployment

The hosted version is published through OpenAI Sites using the project manifest in `.openai/hosting.json`. A deployment should run the production build, package the generated output, and publish the saved version through the Sites workflow.
