CREATE TABLE public.saga_archive (
  chapter_id TEXT NOT NULL PRIMARY KEY,
  player_key TEXT NOT NULL DEFAULT 'default',
  chapter JSONB NOT NULL,
  city TEXT,
  card_identity TEXT,
  completed_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saga_archive_player ON public.saga_archive (player_key, archived_at DESC);

ALTER TABLE public.saga_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon saga archive read"
ON public.saga_archive
FOR SELECT
USING (true);

CREATE POLICY "Allow anon saga archive insert"
ON public.saga_archive
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anon saga archive update"
ON public.saga_archive
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon saga archive delete"
ON public.saga_archive
FOR DELETE
USING (true);

CREATE TABLE public.postchain_shares (
  id TEXT NOT NULL PRIMARY KEY,
  player_key TEXT NOT NULL DEFAULT 'default',
  chapter_id TEXT,
  payload JSONB NOT NULL,
  privacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_postchain_shares_player ON public.postchain_shares (player_key, created_at DESC);

ALTER TABLE public.postchain_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon postchain share read"
ON public.postchain_shares
FOR SELECT
USING (true);

CREATE POLICY "Allow anon postchain share insert"
ON public.postchain_shares
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anon postchain share update"
ON public.postchain_shares
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE TABLE public.postchain_consents (
  player_key TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  auth_level TEXT NOT NULL DEFAULT 'basic',
  privacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.postchain_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon postchain consent read"
ON public.postchain_consents
FOR SELECT
USING (true);

CREATE POLICY "Allow anon postchain consent insert"
ON public.postchain_consents
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anon postchain consent update"
ON public.postchain_consents
FOR UPDATE
USING (true)
WITH CHECK (true);
