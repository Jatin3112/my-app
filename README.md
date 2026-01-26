# Task Manager - Todos & Timesheet

A modern Next.js application for managing todos with projects and tracking timesheet entries. Built with Next.js 14, TypeScript, Supabase, and shadcn/ui.

## Features

### 🏠 Home Page
- Clean, professional landing page
- Navigation cards to Todos and Timesheet pages
- Responsive design

### ✅ Todos Page
- **Project Management** (at the top of the page)
  - Create, edit, and delete projects
  - Expandable/collapsible project list
  - Projects can be assigned to todos
  
- **Todo Management**
  - Create, edit, and delete todos
  - Assign todos to projects
  - Mark todos as complete/incomplete
  - Filter todos by project
  - View all todos in a clean table layout

### ⏰ Timesheet Page
- **Date-wise Entry System**
  - Add work entries with date, project name, task description, and hours
  - Entries automatically grouped by date
  - Total hours calculated per day
  - Add optional notes to each entry
  
- **Full CRUD Operations**
  - Create, edit, and delete timesheet entries
  - Date picker for easy date selection
  - Hours tracking with decimal support (e.g., 2.5 hours)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form + Zod
- **Date Utilities**: date-fns
- **Icons**: Lucide React
- **Notifications**: Sonner

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works fine)

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to **Project Settings** > **API**
3. Copy your **Project URL** and **anon/public key**
4. Go to the **SQL Editor** in your Supabase dashboard
5. Run the SQL schema from `lib/supabase/schema.sql` to create the tables

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

Replace the values with your actual Supabase credentials from step 1.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
my-app/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout with Toaster
│   ├── page.tsx                 # Home page
│   ├── todos/
│   │   └── page.tsx            # Todos page
│   └── timesheet/
│       └── page.tsx            # Timesheet page
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── todos/
│   │   ├── project-manager.tsx # Project CRUD component
│   │   └── todo-list.tsx       # Todo CRUD component
│   └── timesheet/
│       └── timesheet-list.tsx  # Timesheet CRUD component
├── lib/
│   ├── api/                     # API functions
│   │   ├── projects.ts         # Project CRUD operations
│   │   ├── todos.ts            # Todo CRUD operations
│   │   └── timesheet.ts        # Timesheet CRUD operations
│   └── supabase/
│       ├── client.ts           # Supabase client setup
│       ├── types.ts            # TypeScript types
│       └── schema.sql          # Database schema
└── .env.local                   # Environment variables (create this)
```

## Database Schema

### Projects Table
- `id` (UUID, Primary Key)
- `name` (Text, Required)
- `description` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Todos Table
- `id` (UUID, Primary Key)
- `title` (Text, Required)
- `description` (Text, Optional)
- `project_id` (UUID, Foreign Key to Projects)
- `completed` (Boolean, Default: false)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Timesheet Entries Table
- `id` (UUID, Primary Key)
- `date` (Date, Required)
- `project_name` (Text, Required)
- `task_description` (Text, Required)
- `hours` (Decimal, Required)
- `notes` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Usage Guide

### Managing Projects
1. Go to the **Todos** page
2. At the top, you'll see the **Projects** section
3. Click **Add Project** to create a new project
4. Click the expand/collapse button to view all projects
5. Edit or delete projects using the action buttons

### Managing Todos
1. On the **Todos** page, click **Add Todo**
2. Fill in the title, description (optional), and select a project (optional)
3. Click **Create** to save
4. Use the project filter dropdown to view todos by project
5. Click the checkbox to mark todos as complete/incomplete
6. Edit or delete todos using the action buttons

### Managing Timesheet Entries
1. Go to the **Timesheet** page
2. Click **Add Entry**
3. Select the date, enter project name, task description, and hours worked
4. Optionally add notes
5. Click **Create** to save
6. Entries are automatically grouped by date with daily totals
7. Edit or delete entries using the action buttons

## Features Highlights

- ✨ **Clean, Professional UI**: Minimalist design with shadcn/ui components
- 📱 **Fully Responsive**: Works great on desktop, tablet, and mobile
- 🔄 **Real-time Updates**: All changes reflect immediately
- ✅ **Form Validation**: Client-side validation with helpful error messages
- 🎨 **Toast Notifications**: Success and error messages for all actions
- 🗂️ **Project Organization**: Group todos by projects for better organization
- 📅 **Date Grouping**: Timesheet entries grouped by date with totals
- 💾 **Persistent Storage**: All data stored securely in Supabase

## Development

To build for production:

```bash
npm run build
npm start
```

## License

MIT
