-- Recreate watchlist table to reorder columns
-- PostgreSQL does not support moving columns, so we must recreate the table.

BEGIN;

-- 1. Create new table with desired column order
CREATE TABLE watchlist_new (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    tmdb_id INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('movie', 'show')),
    
    -- Desired Order: Title -> Status -> Last Watched Season
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'plan_to_watch',
    last_watched_season INTEGER DEFAULT 0,
    
    -- Remaining columns
    poster_path VARCHAR(255),
    vote_average DECIMAL(3, 1),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(user_id, tmdb_id, type)
);

-- 2. Copy data from old table to new table
INSERT INTO watchlist_new (id, user_id, tmdb_id, type, title, status, last_watched_season, poster_path, vote_average, metadata, created_at)
SELECT id, user_id, tmdb_id, type, title, status, last_watched_season, poster_path, vote_average, metadata, created_at
FROM watchlist;

-- 3. Drop old table (CASCADE to remove policies/constraints dependent on it)
DROP TABLE watchlist CASCADE;

-- 4. Rename new table to watchlist
ALTER TABLE watchlist_new RENAME TO watchlist;

-- 5. Re-apply Constraints
-- Status Check Constraint (Updating to include all V3 statuses)
ALTER TABLE watchlist
ADD CONSTRAINT "watchlist_status_check"
CHECK (status IN (
    'watched', 
    'unwatched', 
    'plan_to_watch', 
    'dropped', 
    'watching',
    'movie_on_ott', 
    'movie_coming_soon',
    'show_finished', 
    'show_ongoing', 
    'show_watched', 
    'show_watching', 
    'show_returning', 
    'show_new'
));

-- 6. Re-enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- 7. Re-create RLS Policies
CREATE POLICY "Users can view their own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist" ON watchlist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
