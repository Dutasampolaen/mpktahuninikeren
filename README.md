# MPK Scoring & Panitia Assignment System

A comprehensive web application for managing MPK (Student Council) program proposals, scoring workflows, and intelligent committee member assignments with time-conflict prevention.

## Features

### Core Functionality

1. **Authentication System**
   - Secure login with JWT-based authentication
   - Role-based access control (Admin, Grader, Member)
   - Session management with Supabase Auth

2. **Program Management**
   - Create and manage program proposals
   - Track program types (Kegiatan Besar, Kegiatan Kecil, Advokasi)
   - Multiple categories (Pendidikan, Sosial, Olahraga, etc.)
   - Status workflow (Draft → Submitted → Under Review → Approved/Rejected)
   - Program timing with start/end datetime

3. **Scoring System with Comments**
   - Dynamic scoring rubrics per program type
   - Weighted scoring standards (Std1, Std2, etc.)
   - Real-time final score calculation
   - Comment fields for each scoring criterion (up to 1000 characters)
   - Draft and final submission modes
   - Prevents editing after final submission

4. **Intelligent Panitia Assignment**
   - Automatic committee member assignment
   - Time-conflict prevention (no double-booking)
   - Hard constraints:
     - Minimum 3 members per program
     - At least 3 different commissions represented
     - Komisi B required for "divisi_acara" role
     - Member availability checking
   - Soft constraints:
     - Workload balancing across members
     - Fair role distribution
   - Lock/unlock individual assignments
   - Manual override capability

5. **Bulk Panitia Assignment**
   - Assign committees to multiple programs at once
   - Preview assignments before saving
   - Atomic operations (all or nothing)
   - Conflict detection across batch

6. **Revision History System**
   - Complete audit trail of all panitia changes
   - Revision numbering and snapshots
   - Compare different revisions
   - Rollback to previous states
   - Change reason tracking

7. **Workload Management**
   - Per-member assignment tracking
   - Visual indicators for overloaded members
   - Role distribution statistics
   - Commission-based filtering

8. **Time-Conflict Prevention**
   - Database function checks for overlapping assignments
   - Preparation and cleanup period support
   - Visual conflict warnings
   - Alternative member suggestions

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **ORM**: Direct Supabase client queries

## Database Schema

### Main Tables

1. **users** - MPK members with workload tracking
2. **commissions** - MPK commissions (Komisi A, B, C)
3. **programs** - Program proposals with timing
4. **scoring_rubrics** - Scoring standards per type
5. **scores** - Individual grader scores with comments
6. **final_scores** - Calculated weighted scores
7. **panitia_assignments** - Committee assignments
8. **panitia_revisions** - Assignment history
9. **panitia_assignment_batches** - Bulk operation tracking
10. **user_availability** - Member unavailable periods
11. **system_settings** - Global configuration

### Key Database Functions

- `calculate_final_score(program_id)` - Automatic weighted score calculation
- `check_time_conflicts(user_id, start, end)` - Time overlap detection
- `get_available_members_for_timerange(start, end)` - Available member lookup

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (already configured)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Environment variables are already configured in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Demo Accounts

All user accounts are now properly created through Supabase Auth:

**Admin Account:**
- Email: `admin@mpk.school`
- Password: `admin123`
- Roles: Admin, Grader
- Can access all features

**Grader Accounts:**
- Email: `budi@mpk.school` / Password: `password123`
- Email: `siti@mpk.school` / Password: `password123`
- Roles: Grader, Member
- Can score programs and view assignments

**Member Accounts:**
- Email: `ahmad@mpk.school`, `dewi@mpk.school`, `rizki@mpk.school`, `maya@mpk.school`, `eko@mpk.school`, `linda@mpk.school`, `farhan@mpk.school`
- Password: `password123` (all members)
- Role: Member
- Can view relevant data

**Total: 10 members across 3 commissions (Komisi A, B, C)**

## Usage Guide

### For Graders

1. **Login** with your grader credentials
2. Navigate to **My Scoring**
3. Select a program to score
4. Fill in scores for each criterion
5. Add comments explaining your scores (optional)
6. Save as draft or submit final score
7. View real-time weighted score calculation

### For Admins

1. **Login** with admin credentials
2. **Dashboard** - View system overview
3. **Programs** - Create and manage programs
   - Set program timing (start/end datetime)
   - Configure preparation and cleanup periods
4. **Panitia Assignment** - Assign committees
   - Select a program
   - Click "Generate Panitia" for automatic assignment
   - Review assignments and conflicts
   - Lock specific assignments to prevent changes
   - Manually adjust if needed
5. **Bulk Assignment** - Assign multiple programs
   - Select programs using checkboxes
   - Generate assignments for all selected
   - Review and save batch
6. **Workload** - Monitor member assignments
   - View per-member statistics
   - Identify overloaded members
7. **Members** - Manage MPK members
8. **Settings** - Configure system parameters

## Key Features Implementation

### Comment System on Scoring

Each scoring criterion has an optional comment field:
- Up to 1000 characters per comment
- Character counter
- Auto-save to draft
- Visible in admin dashboard
- Exportable with scores

### Time-Conflict Prevention

The system prevents double-booking through:
- Database-level conflict checking via RPC functions
- Automatic exclusion of conflicted members
- Visual warning indicators
- Preparation/cleanup period consideration
- Real-time availability calculation

### Revision History

Every panitia assignment change creates a revision:
- Automatic revision numbering
- Full assignment snapshot in JSON
- Change reason field
- Rollback capability
- Comparison between revisions

### Bulk Operations

Assign multiple programs efficiently:
- Select programs with checkboxes
- Preview all assignments
- Conflict detection across batch
- Atomic save operation
- Workload balancing consideration

## API Endpoints (via Supabase)

All data operations use Supabase client with RLS policies:

- `supabase.from('programs').select()` - Query programs
- `supabase.from('scores').insert()` - Submit scores
- `supabase.from('panitia_assignments')` - Manage assignments
- `supabase.rpc('check_time_conflicts')` - Check conflicts
- `supabase.rpc('get_available_members_for_timerange')` - Get available members

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based policies (admin, grader, member)
- Authentication required for all operations
- Admins can manage everything
- Graders can only manage own scores
- Members can view relevant data

## Future Enhancements

- PDF export functionality
- CSV export with formatting
- Email notifications
- Advanced analytics dashboards
- Mobile responsive improvements
- Real-time collaboration
- Integration with school calendar

## Project Structure

```
src/
├── components/          # Reusable components
│   └── Layout.tsx      # Main layout with sidebar
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state
├── lib/                # Libraries and utilities
│   └── supabase.ts    # Supabase client
├── pages/              # Page components
│   ├── DashboardPage.tsx
│   ├── MyScoringPage.tsx
│   ├── ProgramsPage.tsx
│   ├── PanitiaPage.tsx
│   ├── BulkPanitiaPage.tsx
│   ├── WorkloadPage.tsx
│   ├── MembersPage.tsx
│   └── SettingsPage.tsx
├── types/              # TypeScript types
│   └── index.ts
├── App.tsx             # Root component
└── main.tsx            # Entry point
```

## Database Migrations

All migrations are in Supabase dashboard. Key migrations:
1. `create_initial_schema` - Core tables and RLS
2. `add_helper_functions_and_seed_data` - Functions and initial data

## Contributing

This is a custom MPK system. For modifications:
1. Update database schema via Supabase migrations
2. Update TypeScript types to match schema
3. Implement UI components
4. Test thoroughly with various scenarios
5. Build and deploy

## License

Custom project for MPK organization.

## Support

For issues or questions, contact the development team.
