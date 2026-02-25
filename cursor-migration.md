# TrouveTonToit - Base44 Migration Guide

> **Migration Status: COMPLETED**
> All Base44 dependencies have been removed from the codebase. The app now uses
> Supabase as its backend (auth, database, storage, edge functions). The Vite
> build compiles cleanly and the dev server starts without errors.

---

## What You Need to Do Next

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Copy `.env.example` to `.env.local`** and fill in your Supabase URL and anon key
3. **Run the SQL schema** (see Phase 4 below) in the Supabase SQL Editor to create tables
4. **Enable Row-Level Security** and add policies for each table
5. **Deploy Edge Functions** from the `functions/` folder if you need backend logic
6. **Run `npm install && npm run dev`** to start the dev server

---

## Codebase Overview

**TrouveTonToit** is a French real estate CRM (Customer Relationship Management) web application originally built on the **Base44** low-code platform, now migrated to **Supabase**. It manages leads (potential buyers/renters), property listings, lead-listing matching, activity tracking, and includes a public-facing social page for lead capture.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18.2 (JSX) |
| Build Tool | Vite 6.1 |
| Routing | React Router DOM 6.26 |
| State/Data Fetching | TanStack React Query 5.84 |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS 3.4) |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS + `tailwind-merge` |
| Backend (current) | Deno serverless functions (via Base44) |
| Backend SDK | `@base44/sdk` 0.8.3 |
| Build Plugin | `@base44/vite-plugin` 0.2.5 |

### Key Libraries

- **Maps**: `react-leaflet` (OpenStreetMap)
- **Charts**: `recharts`
- **Drag & Drop**: `@hello-pangea/dnd`
- **PDF Export**: `jspdf` + `html2canvas`
- **Rich Text**: `react-quill`, `react-markdown`
- **Animations**: `framer-motion`
- **Notifications**: `sonner`, `react-hot-toast`
- **Date Handling**: `date-fns`, `moment`

---

## Application Architecture

### Directory Structure

```
trouve-ton-toit/
├── src/
│   ├── api/                          # Base44 client & service exports
│   │   ├── base44Client.js           # ⚠️ Base44 SDK client initialization
│   │   ├── entities.js               # ⚠️ Entity exports (Query, User)
│   │   └── integrations.js           # ⚠️ Integration exports (LLM, Email, SMS, etc.)
│   ├── components/
│   │   ├── activity/                 # Activity CRUD modals & tabs (8 files)
│   │   ├── dashboard/                # Dashboard widgets (6 files)
│   │   ├── leads/                    # Lead components (5 files)
│   │   ├── listing/                  # Listing components (2 files)
│   │   ├── matching/                 # Matching components (2 files)
│   │   ├── notifications/            # Notification components (2 files)
│   │   ├── social/                   # Social page components (2 files)
│   │   └── ui/                       # shadcn/ui components (100+ files, NO changes needed)
│   ├── hooks/                        # Custom React hooks
│   ├── lib/
│   │   ├── AuthContext.jsx           # ⚠️ Authentication (uses Base44 auth)
│   │   ├── NavigationTracker.jsx     # ⚠️ Page view logging (Base44 appLogs)
│   │   ├── VisualEditAgent.jsx       # ⚠️ Base44 IDE visual editor (REMOVE)
│   │   ├── PageNotFound.jsx          # ⚠️ Uses Base44 auth check
│   │   ├── app-params.js             # ⚠️ Base44 app configuration
│   │   ├── query-client.js           # ✅ React Query client (keep as-is)
│   │   └── utils.js                  # ✅ Utility functions (keep as-is)
│   ├── pages/                        # Page components (15 files, all use Base44)
│   │   ├── Activity.jsx
│   │   ├── AddLead.jsx
│   │   ├── AddListing.jsx
│   │   ├── Dashboard.jsx
│   │   ├── EditListing.jsx
│   │   ├── Home.jsx
│   │   ├── Integration.jsx
│   │   ├── LeadDetail.jsx
│   │   ├── Leads.jsx
│   │   ├── ListingDetail.jsx
│   │   ├── Listings.jsx
│   │   ├── Matching.jsx
│   │   ├── Settings.jsx
│   │   ├── SocialBuilder.jsx
│   │   └── SocialPage.jsx
│   ├── utils/
│   │   └── index.ts                  # ✅ createPageUrl helper (keep as-is)
│   ├── App.jsx                       # ⚠️ Root component (remove VisualEditAgent/NavigationTracker)
│   ├── Layout.jsx                    # ⚠️ Sidebar layout (uses Base44 auth)
│   ├── pages.config.js               # ✅ Route configuration (keep as-is)
│   ├── main.jsx                      # ✅ Entry point (keep as-is)
│   └── index.css                     # ✅ Global styles (keep as-is)
├── functions/                        # ⚠️ Deno serverless functions (6 files, all use Base44 SDK)
│   ├── cleanDuplicateLeads.ts
│   ├── getAmenities.ts
│   ├── leadScoring.ts
│   ├── matchListingWithLeads.ts
│   ├── notifyNewMatches.ts
│   └── scrapeBienImmobilier.ts
├── package.json                      # ⚠️ Has Base44 dependencies
├── vite.config.js                    # ⚠️ Uses @base44/vite-plugin
├── tailwind.config.js                # ✅ Keep as-is
├── postcss.config.js                 # ✅ Keep as-is
├── eslint.config.js                  # ✅ Keep as-is
├── jsconfig.json                     # ✅ Keep as-is (has @/* path alias)
├── components.json                   # ✅ shadcn/ui config (keep as-is)
└── index.html                        # ✅ Keep as-is
```

Legend: ⚠️ = Needs migration changes | ✅ = No changes needed

---

## Data Model (Base44 Entities)

The app uses these 10 Base44 entities that need to be replaced with a local database:

| Entity | Description | Key Fields |
|--------|-------------|------------|
| **Lead** | Potential buyer/renter | first_name, last_name, email, phone, city, budget_min/max, property_type, surface_min/max, rooms_min, lead_type, status, categorie, score, financing_status, notes, matched_listings, created_by |
| **Listing** | Property listing | title, price, city, surface, rooms, property_type, transaction_type, status, images, amenities, description, created_by |
| **Activity** | Activity log entries | type (call/email/etc), linked_to_id, linked_to_type, description, created_by |
| **Event** | Calendar events | type (visit/meeting), title, description, date, location, status, linked_to_id |
| **Task** | To-do items | title, description, status, priority, due_date, linked_to_id, linked_to_type |
| **Note** | Text notes | content, linked_to_id, linked_to_type |
| **Notification** | In-app notifications | type, title, message, read, linked_lead_id, linked_listing_id, created_by |
| **SocialPageConfig** | Public page config | (social page settings, theme, content) |
| **MatchingConfig** | Matching algorithm config | weights, thresholds, tolerance, financing_bonus |
| **Query** | Saved queries | (exported but rarely used directly) |

### Entity API Methods Used

All entities use the same CRUD pattern through Base44:
- `base44.entities.{Name}.list(sortField)` — List all records
- `base44.entities.{Name}.filter(criteria, sortField, limit)` — Filter records
- `base44.entities.{Name}.get(id)` — Get single record by ID
- `base44.entities.{Name}.create(data)` — Create new record
- `base44.entities.{Name}.update(id, data)` — Update record
- `base44.entities.{Name}.delete(id)` — Delete record
- `base44.entities.Notification.subscribe(callback)` — Real-time subscription

---

## All Base44 Dependencies (Complete Inventory)

### 1. NPM Packages
- `@base44/sdk` (^0.8.3) — Core SDK for auth, entities, functions, integrations
- `@base44/vite-plugin` (^0.2.5) — Vite build plugin

### 2. Authentication (`base44.auth.*`)
Used in: `AuthContext.jsx`, `Layout.jsx`, `Dashboard.jsx`, `Settings.jsx`, `Integration.jsx`, `PageNotFound.jsx`, `LeadDetail.jsx`, `Leads.jsx`, `Listings.jsx`, `Matching.jsx`, `AddLead.jsx`, `AddListing.jsx`, `EditListing.jsx`, `ListingDetail.jsx`

| Method | Description |
|--------|-------------|
| `base44.auth.me()` | Get current authenticated user |
| `base44.auth.logout(redirectUrl?)` | Logout user |
| `base44.auth.redirectToLogin(returnUrl)` | Redirect to Base44 login page |
| `base44.auth.updateMe(data)` | Update current user profile |
| `createAxiosClient(...)` from SDK | HTTP client for public settings API |

### 3. Entity CRUD Operations (`base44.entities.*`)
Used in: **All 15 pages** + **10 components** (see file list above)

Entities: Lead, Listing, Activity, Event, Task, Note, Notification, SocialPageConfig, MatchingConfig, Query

### 4. Integrations (`base44.integrations.Core.*`)
Used in: `AIAssistantTabs.jsx`, `LeadExtractionAssistant.jsx`, `AddListing.jsx`, `EditListing.jsx`, `SocialBuilder.jsx`

| Integration | Description | Replacement Needed |
|-------------|-------------|-------------------|
| `InvokeLLM(prompt)` | Call AI/LLM model | OpenAI API or similar |
| `SendEmail(data)` | Send emails | Resend, SendGrid, or Nodemailer |
| `SendSMS(data)` | Send SMS | Twilio or similar |
| `UploadFile(file)` | Upload files/images | Supabase Storage, S3, or Cloudinary |
| `GenerateImage(prompt)` | AI image generation | DALL-E API or similar |
| `ExtractDataFromUploadedFile(file)` | Extract data from files | Custom implementation |

### 5. Serverless Functions (`base44.functions.invoke()`)
The `functions/` directory contains 6 Deno serverless functions that run on Base44's infrastructure:

| Function | Trigger | Purpose |
|----------|---------|---------|
| `leadScoring` | On Lead/Activity change | Calculate lead scores (0-100) |
| `matchListingWithLeads` | On Listing create/update | Match listings with leads |
| `notifyNewMatches` | On Lead/Listing create | Create notification for matches |
| `cleanDuplicateLeads` | Manual invoke | Remove duplicate leads |
| `getAmenities` | Manual invoke | Fetch nearby amenities (OpenStreetMap) |
| `scrapeBienImmobilier` | Manual invoke | Scrape property listings (BrightData) |

### 6. Agents (`base44.agents.*`)
Used in: `Integration.jsx`
- `base44.agents.getWhatsAppConnectURL('email_lead_capturer')` — WhatsApp bot connection

### 7. App Logging (`base44.appLogs.*`)
Used in: `NavigationTracker.jsx`
- `base44.appLogs.logUserInApp(pageName)` — Track page views

### 8. Configuration (`src/lib/app-params.js`)
- `VITE_BASE44_APP_ID` — Base44 application ID
- `VITE_BASE44_BACKEND_URL` — Base44 backend server URL
- localStorage keys: `base44_app_id`, `base44_server_url`, `base44_access_token`

### 9. Vite Plugin (`vite.config.js`)
- `@base44/vite-plugin` with `legacySDKImports` option

### 10. Visual Edit Agent (`src/lib/VisualEditAgent.jsx`)
- Base44 IDE feature for visual editing via iframe `postMessage`
- **Can be entirely removed** — only used in Base44's hosted IDE

---

## Files Requiring Changes (42 total)

### Must Replace / Rewrite (Core Infrastructure — 7 files)
1. `src/api/base44Client.js` → Replace with local API client
2. `src/api/entities.js` → Replace with local entity service layer
3. `src/api/integrations.js` → Replace with local integration wrappers
4. `src/lib/AuthContext.jsx` → Replace with local auth (e.g. Supabase Auth, Firebase Auth, or JWT)
5. `src/lib/app-params.js` → Replace with local env config
6. `vite.config.js` → Remove Base44 plugin
7. `package.json` → Remove Base44 deps, add new deps

### Must Remove (Base44 IDE features — 2 files)
8. `src/lib/VisualEditAgent.jsx` → DELETE (Base44 IDE only)
9. `src/lib/NavigationTracker.jsx` → DELETE or strip Base44 logging

### Must Update (Auth/Layout — 3 files)
10. `src/App.jsx` → Remove VisualEditAgent, NavigationTracker references
11. `src/Layout.jsx` → Replace `base44.auth.me()` and `base44.auth.logout()`
12. `src/lib/PageNotFound.jsx` → Replace `base44.auth.me()` call

### Must Update (All Pages — 15 files)
13-27. All files in `src/pages/` → Replace `base44.entities.*` and `base44.auth.*` calls

### Must Update (Components — 14 files)
28. `src/components/activity/CreateNoteModal.jsx`
29. `src/components/activity/CreateTaskModal.jsx`
30. `src/components/activity/TimelineTab.jsx`
31. `src/components/activity/CreateActivityModal.jsx`
32. `src/components/activity/EventsTab.jsx`
33. `src/components/activity/NotesTab.jsx`
34. `src/components/activity/CalendarTab.jsx`
35. `src/components/activity/TasksTab.jsx`
36. `src/components/activity/CreateEventModal.jsx`
37. `src/components/notifications/NotificationPopover.jsx`
38. `src/components/notifications/NotificationToast.jsx`
39. `src/components/leads/LeadActivityTimeline.jsx`
40. `src/components/social/LeadCaptureForm.jsx`
41. `src/components/dashboard/AIAssistantTabs.jsx`
42. `src/components/dashboard/RecentActivity.jsx`
43. `src/components/dashboard/LeadExtractionAssistant.jsx`

### Must Rewrite (Backend Functions — 6 files)
44-49. All files in `functions/` → Convert from Deno + Base44 SDK to Node.js/Express API routes

---

## Step-by-Step Migration Plan

### Phase 1: Project Setup & Build System (Get It Running)

#### Step 1.1 — Initialize Git

```bash
git init
git add .
git commit -m "Initial commit: Base44 export"
```

#### Step 1.2 — Remove Base44 Build Dependencies

**`vite.config.js`** — Remove the Base44 plugin:
```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**`package.json`** — Remove Base44 packages:
```bash
npm uninstall @base44/sdk @base44/vite-plugin
```

#### Step 1.3 — Choose and Install a Backend

**Recommended: Supabase** (closest to Base44's model — hosted Postgres + Auth + Storage + Realtime)

```bash
npm install @supabase/supabase-js
```

Alternatives:
- **Firebase** — Firestore + Firebase Auth + Cloud Functions
- **Custom Express + PostgreSQL** — Full control, more work
- **Convex** — Similar real-time data model to Base44

#### Step 1.4 — Set Up Environment Variables

Create `.env.local`:
```env
# If using Supabase:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# If using custom backend:
VITE_API_URL=http://localhost:3001/api

# For AI integrations:
VITE_OPENAI_API_KEY=your-key  # (use server-side proxy in production)
```

---

### Phase 2: Replace Core Infrastructure

#### Step 2.1 — Replace the API Client

Replace `src/api/base44Client.js` with your chosen backend client.

**Example with Supabase:**
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### Step 2.2 — Create Entity Service Layer

Replace `src/api/entities.js` with a service that wraps your database calls and **matches the Base44 API surface** to minimize changes in pages/components.

Create `src/api/entities.js`:
```js
import { supabase } from './supabaseClient'

function createEntityService(tableName) {
  return {
    async list(sortField) {
      const descending = sortField?.startsWith('-')
      const column = sortField?.replace(/^-/, '') || 'created_date'
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(column, { ascending: !descending })
      if (error) throw error
      return data
    },

    async filter(criteria, sortField, limit) {
      let query = supabase.from(tableName).select('*')
      for (const [key, value] of Object.entries(criteria)) {
        query = query.eq(key, value)
      }
      if (sortField) {
        const descending = sortField.startsWith('-')
        const column = sortField.replace(/^-/, '')
        query = query.order(column, { ascending: !descending })
      }
      if (limit) query = query.limit(limit)
      const { data, error } = await query
      if (error) throw error
      return data
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      if (error) throw error
    },

    subscribe(callback) {
      return supabase
        .channel(tableName)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
        .subscribe()
    }
  }
}

// Recreate the Base44 entity interface so pages/components need minimal changes
export const entities = {
  Lead: createEntityService('leads'),
  Listing: createEntityService('listings'),
  Activity: createEntityService('activities'),
  Event: createEntityService('events'),
  Task: createEntityService('tasks'),
  Note: createEntityService('notes'),
  Notification: createEntityService('notifications'),
  SocialPageConfig: createEntityService('social_page_configs'),
  MatchingConfig: createEntityService('matching_configs'),
  Query: createEntityService('queries'),
}

export const Query = entities.Query
```

#### Step 2.3 — Replace Authentication

Replace `src/lib/AuthContext.jsx` with local auth.

**Example with Supabase Auth:**
```jsx
import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsAuthenticated(!!session?.user)
      setIsLoadingAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setIsAuthenticated(!!session?.user)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
  }

  const navigateToLogin = () => {
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
```

#### Step 2.4 — Replace app-params.js

Replace `src/lib/app-params.js` — this file is entirely Base44-specific and can be simplified or removed. If you need env config:

```js
export const appConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}
```

#### Step 2.5 — Replace Integrations

Replace `src/api/integrations.js` with local wrappers:

```js
// Placeholder implementations — wire up to real services as needed
export const InvokeLLM = async ({ prompt, response_json_schema }) => {
  const response = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, response_json_schema }),
  })
  return response.json()
}

export const UploadFile = async ({ file }) => {
  // Use Supabase Storage, S3, Cloudinary, etc.
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })
  return response.json()
}

export const SendEmail = async (data) => {
  return fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json())
}

export const SendSMS = async (data) => {
  return fetch('/api/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json())
}

export const GenerateImage = async (data) => {
  return fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json())
}

export const ExtractDataFromUploadedFile = async (data) => {
  return fetch('/api/extract-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json())
}
```

---

### Phase 3: Update Frontend Code

#### Step 3.1 — Clean Up App.jsx

Remove `VisualEditAgent` and `NavigationTracker`:

```jsx
// REMOVE these imports:
// import VisualEditAgent from '@/lib/VisualEditAgent'
// import NavigationTracker from '@/lib/NavigationTracker'

// REMOVE from JSX:
// <NavigationTracker />
// <VisualEditAgent />
```

#### Step 3.2 — Delete Base44-Only Files

- Delete `src/lib/VisualEditAgent.jsx`
- Delete `src/lib/NavigationTracker.jsx` (or keep as a no-op)
- Delete `src/lib/app-params.js` (after replacing with Step 2.4)

#### Step 3.3 — Update All Page & Component Imports

In every file that currently imports from `@/api/base44Client`, change:

**Before:**
```js
import { base44 } from '@/api/base44Client'
// then: base44.entities.Lead.filter(...)
// then: base44.auth.me()
```

**After:**
```js
import { entities } from '@/api/entities'
import { supabase } from '@/api/supabaseClient'
// then: entities.Lead.filter(...)
// then: supabase.auth.getUser()
```

This is the largest part of the migration — every page and component needs its imports and calls updated. The entity service layer (Step 2.2) is designed to keep the API surface as similar as possible to minimize changes.

#### Step 3.4 — Search-and-Replace Patterns

These are the most common patterns to find and replace across all files:

| Find | Replace With |
|------|-------------|
| `import { base44 } from '@/api/base44Client'` | `import { entities } from '@/api/entities'` (+ auth import if needed) |
| `base44.entities.Lead.` | `entities.Lead.` |
| `base44.entities.Listing.` | `entities.Listing.` |
| `base44.entities.Activity.` | `entities.Activity.` |
| `base44.entities.Event.` | `entities.Event.` |
| `base44.entities.Task.` | `entities.Task.` |
| `base44.entities.Note.` | `entities.Note.` |
| `base44.entities.Notification.` | `entities.Notification.` |
| `base44.entities.SocialPageConfig.` | `entities.SocialPageConfig.` |
| `base44.entities.MatchingConfig.` | `entities.MatchingConfig.` |
| `await base44.auth.me()` | Auth: use `useAuth()` hook or `supabase.auth.getUser()` |
| `base44.auth.logout()` | `supabase.auth.signOut()` or `logout()` from useAuth |
| `base44.auth.updateMe(data)` | `supabase.auth.updateUser({ data })` |
| `base44.auth.redirectToLogin(url)` | `window.location.href = '/login'` |
| `base44.functions.invoke('name', args)` | `fetch('/api/functions/name', { method: 'POST', body: JSON.stringify(args) })` |
| `base44.agents.getWhatsAppConnectURL(...)` | Remove or replace with custom WhatsApp integration |
| `base44.appLogs.logUserInApp(...)` | Remove (analytics) or replace with PostHog/Mixpanel |

#### Step 3.5 — Update Layout.jsx

Replace:
```js
const userData = await base44.auth.me();
```
With the `useAuth()` hook from your new AuthContext.

Replace:
```js
base44.auth.logout();
```
With `logout()` from `useAuth()`.

#### Step 3.6 — Update Integration.jsx

This page has the deepest Base44 integration:
- `base44.auth.me()` / `base44.auth.updateMe()` — replace with local auth
- `base44.agents.getWhatsAppConnectURL(...)` — remove or build custom WhatsApp integration

---

### Phase 4: Database Setup

#### Step 4.1 — Create Database Tables

Whether using Supabase, PostgreSQL, or another database, create tables matching the entity model:

```sql
-- Leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  property_type TEXT,
  surface_min NUMERIC,
  surface_max NUMERIC,
  rooms_min INTEGER,
  lead_type TEXT CHECK (lead_type IN ('acheteur', 'locataire', 'vendeur', 'bailleur')),
  status TEXT DEFAULT 'nouveau',
  categorie TEXT DEFAULT 'FROID',
  score INTEGER DEFAULT 0,
  score_initial INTEGER DEFAULT 0,
  score_engagement INTEGER DEFAULT 0,
  score_progression INTEGER DEFAULT 0,
  financing_status TEXT,
  apport_percentage NUMERIC,
  delai TEXT,
  disponibilite TEXT,
  notes TEXT,
  source TEXT,
  blocking_criteria JSONB DEFAULT '[]',
  matched_listings JSONB DEFAULT '[]',
  match_score INTEGER DEFAULT 0,
  scoring_logs JSONB DEFAULT '[]',
  date_scoring TIMESTAMPTZ,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  city TEXT,
  address TEXT,
  surface NUMERIC,
  rooms INTEGER,
  property_type TEXT,
  transaction_type TEXT CHECK (transaction_type IN ('vente', 'location')),
  status TEXT DEFAULT 'brouillon',
  images JSONB DEFAULT '[]',
  amenities JSONB DEFAULT '[]',
  latitude NUMERIC,
  longitude NUMERIC,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  description TEXT,
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  title TEXT,
  description TEXT,
  date TIMESTAMPTZ,
  location TEXT,
  status TEXT DEFAULT 'pending',
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT,
  linked_to_id TEXT,
  linked_to_type TEXT,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  linked_lead_id TEXT,
  linked_listing_id TEXT,
  match_count INTEGER,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Social Page Config table
CREATE TABLE social_page_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config JSONB DEFAULT '{}',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Matching Config table
CREATE TABLE matching_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  weights JSONB DEFAULT '{"budget": 35, "city": 25, "surface": 20, "rooms": 10, "property_type": 10}',
  thresholds JSONB DEFAULT '{"chaud_min": 75, "tiede_min": 40}',
  tolerance JSONB DEFAULT '{"budget_percentage": 15, "surface_percentage": 20, "rooms_difference": 1}',
  blocking_criteria_weight INTEGER DEFAULT 100,
  financing_bonus JSONB DEFAULT '{"valide": 15, "en_cours": 5}',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);
```

#### Step 4.2 — Row-Level Security (if using Supabase)

Enable RLS so users only see their own data:

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own leads" ON leads
  FOR ALL USING (created_by = auth.jwt()->>'email');

-- Repeat for all tables...
```

---

### Phase 5: Backend Functions Migration

The 6 Deno serverless functions need to be converted to run locally. Choose one of:

1. **Supabase Edge Functions** (if using Supabase) — keeps Deno, just replace `@base44/sdk` imports with `@supabase/supabase-js`
2. **Express.js API routes** — convert to Node.js
3. **Next.js API routes** — if migrating to Next.js

#### Step 5.1 — Convert Functions

Each function in `functions/` follows this pattern:

**Before (Base44/Deno):**
```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const lead = await base44.asServiceRole.entities.Lead.get(id);
  // ...
});
```

**After (Express + Supabase):**
```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role for backend
)

export async function leadScoring(req, res) {
  const { leadId } = req.body
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  // ... same scoring logic ...
  await supabase.from('leads').update({ score: scoreTotal }).eq('id', leadId)
  res.json({ success: true })
}
```

#### Step 5.2 — Function-by-Function Notes

| Function | Migration Complexity | Notes |
|----------|---------------------|-------|
| `getAmenities.ts` | **Easy** | Pure HTTP calls to OpenStreetMap — just replace auth check |
| `cleanDuplicateLeads.ts` | **Easy** | Simple DB queries — replace entity calls |
| `leadScoring.ts` | **Medium** | Complex scoring logic but straightforward DB replacement |
| `matchListingWithLeads.ts` | **Medium** | Complex matching algorithm, same DB replacement pattern |
| `notifyNewMatches.ts` | **Medium** | DB queries + notification creation |
| `scrapeBienImmobilier.ts` | **Hard** | Uses Puppeteer + BrightData proxy — needs external browser service |

---

### Phase 6: Create a Login Page

Base44 handles login externally. You need to create a login page:

1. Create `src/pages/Login.jsx` with email/password form
2. Add `/login` route to `pages.config.js`
3. Implement sign-up flow if needed
4. Update `AuthContext` to redirect unauthenticated users to `/login`

---

### Phase 7: Test & Verify

#### Step 7.1 — Start the Dev Server

```bash
npm install
npm run dev
```

#### Step 7.2 — Test Checklist

- [ ] App loads without errors
- [ ] Login/logout works
- [ ] Dashboard loads with data
- [ ] Create, read, update, delete leads
- [ ] Create, read, update, delete listings
- [ ] Activity tracking (events, tasks, notes)
- [ ] Matching algorithm works
- [ ] Notifications appear
- [ ] Social page renders
- [ ] File uploads work
- [ ] AI features work (LLM calls)
- [ ] Lead scoring calculates correctly

---

## Quick Start Commands

```bash
# 1. Install dependencies (after removing Base44 packages)
npm install

# 2. Create .env.local with your config

# 3. Start development server
npm run dev

# 4. Build for production
npm run build

# 5. Preview production build
npm run preview
```

---

## Migration Priority Order

For the most efficient migration path, tackle changes in this order:

1. **Build system** (vite.config.js, package.json) — get it compiling
2. **API client + entities** — create the service layer
3. **Auth system** — get login/logout working
4. **App.jsx cleanup** — remove Base44-only components
5. **Layout.jsx** — fix auth in the shell
6. **Dashboard** — first page to work end-to-end
7. **Leads page + AddLead** — core CRUD
8. **Listings page + AddListing** — core CRUD
9. **Remaining pages** — one at a time
10. **Backend functions** — convert as features need them
11. **Integrations (LLM, email, etc.)** — wire up last

---

## Notes

- The `src/components/ui/` directory contains **100+ shadcn/ui components** that have **zero Base44 dependencies** — these need no changes at all.
- The `src/utils/index.ts` file with `createPageUrl()` has no Base44 dependency — keep as-is.
- The `src/lib/query-client.js` and `src/lib/utils.js` have no Base44 dependency — keep as-is.
- All Tailwind CSS styling, Radix UI components, and the overall UI will work identically after migration.
- The `pages.config.js` routing configuration is framework-agnostic and works with plain React Router — keep as-is.

---

## Migration Changelog (What Was Done)

### Files Created
| File | Purpose |
|------|---------|
| `src/api/supabaseClient.js` | Supabase client initialization |
| `src/pages/Login.jsx` | Login/signup page with Supabase Auth |
| `.env.example` | Environment variable template |
| `src/App.css` | Empty placeholder (was missing) |

### Files Rewritten (Core Infrastructure)
| File | Change |
|------|--------|
| `src/api/base44Client.js` | Now a compatibility shim — same `base44` export interface, delegates to Supabase |
| `src/api/entities.js` | Now exports all 10 entity services from the shim |
| `src/api/integrations.js` | Now wraps Supabase Functions + Storage |
| `src/lib/AuthContext.jsx` | Now uses Supabase Auth instead of Base44 auth |
| `src/lib/app-params.js` | Simplified to just Supabase config |
| `src/lib/PageNotFound.jsx` | Uses `useAuth()` hook instead of Base44 auth |
| `src/Layout.jsx` | Uses `useAuth()` hook instead of `base44.auth.me()` |
| `src/App.jsx` | Removed VisualEditAgent, NavigationTracker; added Login route |
| `vite.config.js` | Removed `@base44/vite-plugin`, added `@` path alias |
| `package.json` | Removed `@base44/sdk` and `@base44/vite-plugin`, added `@supabase/supabase-js` |

### Files Deleted
| File | Reason |
|------|--------|
| `src/lib/VisualEditAgent.jsx` | Base44 IDE-only feature |
| `src/lib/NavigationTracker.jsx` | Base44 analytics logging |

### Files Updated (Auth Pattern Replacement)
All 15 pages had `useState` + `useEffect` + `base44.auth.me()` replaced with `useAuth()` hook:

`Dashboard.jsx`, `Leads.jsx`, `Listings.jsx`, `Matching.jsx`, `AddLead.jsx`, `AddListing.jsx`, `ListingDetail.jsx`, `LeadDetail.jsx`, `Settings.jsx`, `Integration.jsx`

*(Activity.jsx, SocialBuilder.jsx, SocialPage.jsx, Home.jsx, EditListing.jsx — no auth changes needed)*

### Backend Functions Converted
All 6 functions in `functions/` converted from `@base44/sdk` to `@supabase/supabase-js`:

`leadScoring.ts`, `matchListingWithLeads.ts`, `notifyNewMatches.ts`, `cleanDuplicateLeads.ts`, `getAmenities.ts`, `scrapeBienImmobilier.ts`

### Key Architecture Decision: Compatibility Shim
Rather than rewriting every import in every file, `src/api/base44Client.js` was rebuilt as a **compatibility shim** that:
- Exports the same `base44` object shape (`base44.entities.Lead.filter(...)`, etc.)
- Internally delegates to Supabase
- Allows all 30+ page/component files to keep their `base44.entities.*` calls unchanged
- Only `base44.auth.*` calls were replaced with `useAuth()` since auth needed to change at the component level
