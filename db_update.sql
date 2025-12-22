-- 1. Add last_watched_season column to watchlist (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'watchlist' AND column_name = 'last_watched_season') THEN
        ALTER TABLE "watchlist" ADD COLUMN "last_watched_season" INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Update the status Check Constraint to include new V3 statuses
ALTER TABLE "watchlist" DROP CONSTRAINT IF EXISTS "watchlist_status_check";

ALTER TABLE "watchlist"
ADD CONSTRAINT "watchlist_status_check"
CHECK (status IN (
    -- Legacy / Unified
    'watched', 
    'unwatched', 
    'plan_to_watch', 
    'dropped', 
    'watching',

    -- Movie Specific
    'movie_on_ott', 
    'movie_coming_soon',

    -- TV Specific (V3)
    'show_finished', 
    'show_ongoing', 
    'show_watched', 
    'show_watching', 
    'show_returning', 
    'show_new'
));
