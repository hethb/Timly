# AutoScheduler

Smart Google Calendar Task Auto-Blocker. Automatically schedule time blocks for your tasks by finding open gaps in your Google Calendar.

## Features

- **Google Calendar Sync** — Pull existing events and create new ones via OAuth
- **Task Management** — Create tasks with duration, frequency, priority, and preferred time windows
- **Smart Scheduling Algorithm** — Greedy scoring-based algorithm that respects preferences and avoids conflicts
- **Schedule Preview** — Review auto-generated blocks before committing to your calendar
- **One-Click Reschedule** — Delete all AutoScheduler events and regenerate when plans change
- **Configurable Settings** — Time boundaries, buffer between events, scheduling horizon

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS v4, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM v7
- **Auth**: NextAuth.js v5 (beta) with Google OAuth
- **Calendar API**: Google Calendar API via `googleapis`

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use `npx prisma dev` for local Prisma Postgres)
- Google Cloud project with Calendar API enabled

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` — From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — From Google Cloud Console

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env`

### 4. Set Up Database

```bash
# Start local Prisma Postgres (easiest option)
npx prisma dev

# Or push schema to your own PostgreSQL
npm run db:push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app pages
│   │   ├── dashboard/      # Main dashboard
│   │   ├── tasks/          # Task CRUD
│   │   ├── schedule/       # Schedule preview & commit
│   │   └── settings/       # User settings
│   ├── api/
│   │   ├── auth/           # NextAuth handlers
│   │   ├── calendar/       # Google Calendar endpoints
│   │   ├── schedule/       # Preview, commit, reset
│   │   ├── settings/       # User settings CRUD
│   │   └── tasks/          # Task CRUD
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── app-shell.tsx       # Authenticated app layout
│   ├── landing-page.tsx    # Landing/marketing page
│   └── providers.tsx       # Session & tooltip providers
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── google-calendar.ts  # Google Calendar API wrapper
│   ├── prisma.ts           # Prisma client singleton
│   ├── scheduler.ts        # Scheduling algorithm
│   ├── session.ts          # Auth session helpers
│   └── utils.ts            # Utility functions
└── generated/
    └── prisma/             # Generated Prisma client (gitignored)

prisma/
└── schema.prisma           # Database schema
```

## Scheduling Algorithm

The scheduling engine uses a **greedy scoring algorithm**:

1. **Generate Free Slots** — For each day, subtract busy events from the day bounds (earliest to latest time)
2. **Expand Tasks** — Convert frequency-based tasks (e.g., "4x/week") into individual sessions
3. **Score Each Slot** — Each free slot gets scored based on:
   - Preferred time window match (+30 points)
   - Preferred day match (+20 points)
   - Even spread across the horizon (+15 points)
   - Spacing from same-task blocks (+10 points)
   - Deadline urgency bonus (+25 points)
4. **Greedy Placement** — Place highest-priority tasks first into their best-scoring slots

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/calendar/events` | Fetch busy calendar events |
| GET | `/api/calendar/list` | List user's calendars |
| POST | `/api/schedule/preview` | Generate schedule preview |
| POST | `/api/schedule/commit` | Push preview to Google Calendar |
| POST | `/api/schedule/reset` | Delete all AutoScheduler events |
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |
