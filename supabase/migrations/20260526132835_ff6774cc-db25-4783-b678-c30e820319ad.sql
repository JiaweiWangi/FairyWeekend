
CREATE TABLE public.saga_archive (
  chapter_id TEXT PRIMARY KEY,
  player_key TEXT NOT NULL DEFAULT 'default',
  chapter JSONB NOT NULL,
  city TEXT,
  card_identity TEXT NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saga_archive TO anon, authenticated;
GRANT ALL ON public.saga_archive TO service_role;
ALTER TABLE public.saga_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saga read all" ON public.saga_archive FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "saga insert all" ON public.saga_archive FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "saga update all" ON public.saga_archive FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "saga delete all" ON public.saga_archive FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.postchain_consents (
  player_key TEXT PRIMARY KEY,
  auth_level TEXT NOT NULL,
  privacy JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postchain_consents TO anon, authenticated;
GRANT ALL ON public.postchain_consents TO service_role;
ALTER TABLE public.postchain_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent read all" ON public.postchain_consents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "consent insert all" ON public.postchain_consents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "consent update all" ON public.postchain_consents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.postchain_shares (
  id TEXT PRIMARY KEY,
  player_key TEXT NOT NULL DEFAULT 'default',
  chapter_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  privacy JSONB NOT NULL,
  share_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postchain_shares TO anon, authenticated;
GRANT ALL ON public.postchain_shares TO service_role;
ALTER TABLE public.postchain_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share read all" ON public.postchain_shares FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "share insert all" ON public.postchain_shares FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "share update all" ON public.postchain_shares FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
