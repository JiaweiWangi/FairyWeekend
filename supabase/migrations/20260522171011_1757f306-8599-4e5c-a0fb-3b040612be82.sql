
CREATE TABLE public.quest_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_key TEXT NOT NULL DEFAULT 'default',
  character_class TEXT NOT NULL,
  emotion TEXT,
  city TEXT,
  quest JSONB NOT NULL,
  stages_unlocked INT NOT NULL DEFAULT 0,
  rating INT,
  feedback TEXT,
  liked_stage_orders INT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quest_history_player ON public.quest_history (player_key, created_at DESC);

CREATE TABLE public.dm_memory (
  player_key TEXT NOT NULL PRIMARY KEY,
  profile TEXT NOT NULL DEFAULT '',
  loved_tags TEXT[] DEFAULT '{}',
  disliked_tags TEXT[] DEFAULT '{}',
  visited_pois TEXT[] DEFAULT '{}',
  total_runs INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quest_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_memory ENABLE ROW LEVEL SECURITY;
-- No policies = no anon access; edge functions use service role to bypass RLS.
