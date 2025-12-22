-- Run this in your Supabase SQL Editor to update the allowed statuses from the refactor

ALTER TABLE watchlist DROP CONSTRAINT watchlist_status_check;

ALTER TABLE watchlist 
ADD CONSTRAINT watchlist_status_check 
CHECK (status IN ('watched', 'unwatched', 'movie_on_ott', 'movie_coming_soon', 'plan_to_watch', 'dropped', 'watching'));
