# MPK System - Technical Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│                    React + TypeScript + Vite                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │   Pages     │  │  Components  │  │   Contexts          │   │
│  │             │  │              │  │                     │   │
│  │ - Dashboard │  │ - Layout     │  │ - AuthContext       │   │
│  │ - Scoring   │  │ - Modals     │  │                     │   │
│  │ - Programs  │  │ - Tables     │  │                     │   │
│  │ - Panitia   │  │ - Forms      │  │                     │   │
│  │ - Bulk      │  │              │  │                     │   │
│  │ - Workload  │  │              │  │                     │   │
│  │ - Members   │  │              │  │                     │   │
│  │ - Settings  │  │              │  │                     │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                   Supabase Client
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                      Supabase Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │    Auth     │  │  Realtime    │  │   Storage           │   │
│  │             │  │              │  │                     │   │
│  │ - JWT       │  │ - Changes    │  │ - Files (future)    │   │
│  │ - Sessions  │  │ - Events     │  │ - Exports           │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    PostgreSQL Database                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    Tables (11)                          │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ commissions │ users │ programs │ scores                │    │
│  │ scoring_rubrics │ final_scores │ panitia_assignments   │    │
│  │ panitia_revisions │ panitia_assignment_batches         │    │
│  │ user_availability │ system_settings                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Functions (4)                         │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ - calculate_final_score()                              │    │
│  │ - check_time_conflicts()                               │    │
│  │ - get_available_members_for_timerange()                │    │
│  │ - update_user_workload() [trigger]                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Row Level Security (RLS)                   │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ - Admin: Full access to all tables                     │    │
│  │ - Grader: Read all, write own scores                   │    │
│  │ - Member: Read relevant data                           │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Scoring Flow with Comments

```
User (Grader)
    │
    ├──> Login → Get JWT Token → Fetch Programs
    │
    ├──> Select Program → Load Rubrics
    │
    ├──> Enter Scores + Comments
    │         │
    │         ├──> Real-time calculation
    │         │
    │         └──> Auto-save (draft)
    │
    ├──> Submit Final Score
    │         │
    │         └──> scores table (with comments)
    │
    └──> Trigger: calculate_final_score()
              │
              └──> final_scores table
```

### 2. Panitia Assignment with Time-Conflict Prevention

```
Admin
    │
    ├──> Select Program → Get program timing
    │
    ├──> Click "Generate Panitia"
    │         │
    │         ├──> Call: get_available_members_for_timerange()
    │         │         │
    │         │         ├──> Filter by is_active = true
    │         │         │
    │         │         ├──> Check user_availability table
    │         │         │
    │         │         └──> Call: check_time_conflicts()
    │         │                   │
    │         │                   └──> Find overlapping programs
    │         │
    │         ├──> Apply constraints:
    │         │     ├──> Min 3 members
    │         │     ├──> Min 3 commissions
    │         │     └──> Komisi B for divisi_acara
    │         │
    │         └──> Generate assignment list
    │
    ├──> Display assignments + conflicts
    │
    ├──> Manual adjustments (optional)
    │
    └──> Save → panitia_assignments table
              │
              └──> Trigger: update_user_workload()
                        │
                        └──> Update users.total_assigned_programs
```

### 3. Bulk Assignment Flow

```
Admin
    │
    ├──> Select Multiple Programs (checkbox)
    │
    ├──> Click "Generate for Selected"
    │         │
    │         ├──> Sort programs by start_datetime
    │         │
    │         ├──> For each program:
    │         │     │
    │         │     ├──> Get available members
    │         │     │
    │         │     ├──> Check time conflicts with previous
    │         │     │
    │         │     └──> Assign members
    │         │
    │         └──> Create panitia_assignment_batches record
    │
    ├──> Preview all assignments
    │
    └──> Save → Atomic transaction
              │
              └──> All programs assigned or none
```

## Database Schema Details

### Relationships

```
commissions
    │
    └──> users (commission_id)
            │
            ├──> programs (proposer_id)
            │       │
            │       ├──> scores (program_id)
            │       │       │
            │       │       └──> final_scores (program_id)
            │       │
            │       └──> panitia_assignments (program_id)
            │               │
            │               ├──> panitia_revisions (program_id)
            │               │
            │               └──> panitia_assignment_batches (batch_id)
            │
            └──> user_availability (user_id)
```

### Key Indexes

```sql
-- Users
CREATE INDEX idx_users_commission ON users(commission_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Programs
CREATE INDEX idx_programs_dates ON programs(start_datetime, end_datetime);
CREATE INDEX idx_programs_status ON programs(status);

-- Scores
CREATE INDEX idx_scores_program ON scores(program_id);
CREATE INDEX idx_scores_grader ON scores(grader_id);

-- Panitia
CREATE INDEX idx_panitia_program ON panitia_assignments(program_id);
CREATE INDEX idx_panitia_user ON panitia_assignments(user_id);
```

## Security Architecture

### Row Level Security Policies

```sql
-- Example: Programs table
CREATE POLICY "Programs viewable by authenticated"
  ON programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage programs"
  ON programs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles @> '["admin"]'
    )
  );
```

### Authentication Flow

```
1. User enters credentials
   │
2. Supabase Auth validates
   │
3. JWT token generated with claims
   │
4. Token stored in localStorage
   │
5. Every API call includes token
   │
6. RLS policies check auth.uid()
   │
7. Access granted/denied
```

## Component Architecture

### Page Hierarchy

```
App
├── AuthProvider
│   └── AppContent
│       ├── LoginPage (if not authenticated)
│       │
│       └── Layout (if authenticated)
│           ├── Sidebar Navigation
│           │   ├── Dashboard
│           │   ├── My Scoring
│           │   ├── Programs (admin only)
│           │   ├── Panitia (admin only)
│           │   ├── Bulk Panitia (admin only)
│           │   ├── Workload (admin only)
│           │   ├── Members (admin only)
│           │   └── Settings (admin only)
│           │
│           └── Main Content
│               └── [Current Page Component]
```

### State Management

```
AuthContext
├── user (User | null)
├── loading (boolean)
├── signIn (function)
├── signOut (function)
├── isAdmin (boolean)
└── isGrader (boolean)

Page State (useState)
├── data (from Supabase)
├── loading (boolean)
├── error (string | null)
└── UI state (modals, selections, etc.)
```

## API Patterns

### Query Pattern

```typescript
// Standard query
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
  .order('created_at', { ascending: false });

// With joins
const { data, error } = await supabase
  .from('programs')
  .select(`
    *,
    proposer:users!proposer_id(name, nis),
    scores(*)
  `);

// RPC call
const { data, error } = await supabase.rpc('function_name', {
  param1: value1,
  param2: value2
});
```

### Mutation Pattern

```typescript
// Insert
const { error } = await supabase
  .from('table_name')
  .insert({ ...data });

// Update
const { error } = await supabase
  .from('table_name')
  .update({ ...data })
  .eq('id', id);

// Upsert
const { error } = await supabase
  .from('table_name')
  .upsert({ ...data }, {
    onConflict: 'unique_column'
  });

// Delete
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);
```

## Algorithm: Panitia Assignment

### Pseudocode

```
function generatePanitia(program):
  // Step 1: Get available members
  availableMembers = getAvailableMembersForTimerange(
    program.start_datetime,
    program.end_datetime
  )

  // Step 2: Check minimum requirements
  if availableMembers.length < 3:
    return error("Not enough available members")

  // Step 3: Group by commission
  commissionGroups = groupByCommission(availableMembers)

  if commissionGroups.size < 3:
    return error("Not enough commission diversity")

  // Step 4: Check Komisi B availability
  komisiBMembers = filterByCommission(availableMembers, "Komisi B")

  if komisiBMembers.length == 0:
    return error("No Komisi B members available")

  // Step 5: Assign required roles
  assignments = []
  assignedUserIds = new Set()

  requiredRoles = ["ketua", "sekretaris", "bendahara", "divisi_acara"]

  for role in requiredRoles:
    if role == "divisi_acara":
      member = selectFromList(komisiBMembers, assignedUserIds)
    else:
      member = selectFromList(availableMembers, assignedUserIds)

    if member:
      assignments.add({
        user_id: member.id,
        role: role,
        commission_id: member.commission_id
      })
      assignedUserIds.add(member.id)

  // Step 6: Validate assignments
  if assignments.length < 3:
    return error("Could not form minimum committee")

  return assignments

function selectFromList(members, excludeIds):
  // Select member with lowest workload not in excludeIds
  available = members.filter(m => !excludeIds.has(m.id))
  if available.length == 0:
    return null
  return available.sortBy(m => m.total_assigned_programs)[0]
```

## Performance Considerations

### Database Optimization

1. **Indexes on frequently queried columns**
   - Foreign keys
   - Date ranges
   - Status fields

2. **RLS policies optimized**
   - Use EXISTS for subqueries
   - Index on auth.uid() lookups

3. **Functions for complex logic**
   - Move calculations to database
   - Reduce network round trips

### Frontend Optimization

1. **Code splitting** (Vite automatic)
2. **Lazy loading** (future: React.lazy)
3. **Optimistic updates** (future: React Query)
4. **Debounced search** (future enhancement)

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                   │
│                    (SSL/HTTPS via certbot)               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  /api/*  ──────────> FastAPI Backend (port 8000)        │
│                      (Future: Python workers)            │
│                                                          │
│  /*      ──────────> Static React Build                 │
│                      (dist/ folder)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            │
                            │
┌───────────────────────────┴─────────────────────────────┐
│                    Supabase Cloud                        │
│                                                          │
│  - PostgreSQL Database                                  │
│  - Authentication Service                               │
│  - Realtime Subscriptions                               │
│  - Storage (future)                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | UI framework |
| Language | TypeScript | Type safety |
| Build | Vite | Fast dev & build |
| Styling | Tailwind CSS | Utility-first CSS |
| Icons | Lucide React | Icon library |
| Database | PostgreSQL | Relational data |
| Backend | Supabase | BaaS platform |
| Auth | Supabase Auth | JWT authentication |
| Hosting | Static (future) | CDN-ready |

## Conclusion

This architecture provides:
- ✅ Scalable database design
- ✅ Secure authentication & authorization
- ✅ Efficient query patterns
- ✅ Time-conflict prevention
- ✅ Workload balancing
- ✅ Comment system
- ✅ Revision tracking
- ✅ Type-safe frontend
- ✅ Production-ready build

The system is designed for growth and can handle:
- Hundreds of programs
- Thousands of scores
- Complex assignment scenarios
- High concurrent users
- Real-time updates (via Supabase)
