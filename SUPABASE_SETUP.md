# Supabase Setup Instructions

1. **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Enter project name: `vinayaka-transport`
   - Set region: Choose closest to your users (e.g., Singapore, Mumbai)
   - Wait for project to initialize

2. **Get Credentials**
   - In project settings, copy:
     - `SUPABASE_URL` (Project URL)
     - `SUPABASE_ANON_KEY` (Anon public key)
     - `SUPABASE_SERVICE_ROLE_KEY` (Service role secret key)

3. **Create Database Schema**
   - Go to SQL Editor in Supabase dashboard
   - Create new query
   - Paste entire contents from `services/api/supabase/schema.sql`
   - Click "Run"
   - Wait for tables to be created

4. **Enable Auth**
   - Go to Authentication → Settings
   - Ensure Email authentication is enabled
   - Set JWT expiry to 1 hour for sessions

5. **Set Environment Variables**
   - Create `.env.local` in each app directory with:
     ```
     NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
     SUPABASE_URL=your_project_url
     SUPABASE_ANON_KEY=your_anon_key
     ```
   - Create `.env` in `services/api/` with:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     REDIS_URL=redis://localhost:6379 (for dev)
     ```

6. **Test Connection**
   - Run `npm run dev` in any portal
   - Try login flow (auth endpoint should respond)
