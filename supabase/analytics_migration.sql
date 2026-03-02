-- Analytics migration
CREATE TABLE IF NOT EXISTS document_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'download', 'export', 'preview')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users see own analytics') THEN
    CREATE POLICY "Users see own analytics" ON document_analytics
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analytics_document_id ON document_analytics(document_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON document_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON document_analytics(created_at);
