```sql
-- Create the watchlist table
create table watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
    tmdb_id INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('movie', 'show')),
    title VARCHAR(255) NOT NULL,
    poster_path VARCHAR(255),
    vote_average DECIMAL(3, 1),
    status VARCHAR(20) DEFAULT 'plan_to_watch' CHECK (status IN ('watched', 'plan_to_watch', 'dropped')),
    metadata JSONB, -- Store full TMDB object for offline/detailed view
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, tmdb_id, type)
);

-- Enable Row Level Security (RLS)
alter table watchlist enable row level security;

-- Create Policies
create policy "Users can view their own watchlist" on watchlist
  for select using (auth.uid() = user_id);

create policy "Users can insert into their own watchlist" on watchlist
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own watchlist" on watchlist
  for update using (auth.uid() = user_id);

create policy "Users can delete their own watchlist" on watchlist
  for delete using (auth.uid() = user_id);

-- Create the watched_seasons table
create table watched_seasons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  tmdb_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, tmdb_id, season_number)
);

-- Enable RLS for watched_seasons
alter table watched_seasons enable row level security;

-- Policies for watched_seasons
create policy "Users can view their own watched seasons" on watched_seasons
  for select using (auth.uid() = user_id);

create policy "Users can insert their own watched seasons" on watched_seasons
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own watched seasons" on watched_seasons
  for update using (auth.uid() = user_id);

create policy "Users can delete their own watched seasons" on watched_seasons
  for delete using (auth.uid() = user_id);
```
