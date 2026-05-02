-- Document versioning: tracks every upload as a version record.
-- Run this migration in the Supabase SQL editor after schema.sql.

CREATE TABLE IF NOT EXISTS public.document_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  storage_path    text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  content_type    text,
  uploaded_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document_id
  ON public.document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_doc_versions_created_at
  ON public.document_versions(document_id, created_at DESC);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'doc_versions_select_owner'
  ) THEN
    CREATE POLICY "doc_versions_select_owner"
      ON public.document_versions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_id
            AND d.created_by = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'doc_versions_insert_owner'
  ) THEN
    CREATE POLICY "doc_versions_insert_owner"
      ON public.document_versions FOR INSERT
      WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_id
            AND d.created_by = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'doc_versions_delete_owner'
  ) THEN
    CREATE POLICY "doc_versions_delete_owner"
      ON public.document_versions FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_id
            AND d.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Atomically inserts/updates a document row AND a document_versions row in one
-- transaction. p_document_id=NULL creates a new document; a non-null value
-- updates the existing document (re-upload / new version of existing file).
CREATE OR REPLACE FUNCTION public.upsert_document_with_version(
  p_document_id     uuid,
  p_title           text,
  p_storage_path    text,
  p_file_size_bytes bigint,
  p_content_type    text,
  p_created_by      uuid,
  p_content_text    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_id         uuid;
  v_version_number integer;
  v_doc            jsonb;
BEGIN
  IF p_document_id IS NOT NULL THEN
    UPDATE public.documents
    SET storage_path    = p_storage_path,
        file_size_bytes = p_file_size_bytes,
        content_text    = COALESCE(p_content_text, content_text),
        updated_at      = now()
    WHERE id = p_document_id
      AND created_by = p_created_by
    RETURNING id INTO v_doc_id;

    IF v_doc_id IS NULL THEN
      RAISE EXCEPTION 'document_not_found';
    END IF;
  ELSE
    INSERT INTO public.documents (title, storage_path, file_size_bytes, created_by, content_text)
    VALUES (p_title, p_storage_path, p_file_size_bytes, p_created_by, p_content_text)
    RETURNING id INTO v_doc_id;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM public.document_versions
  WHERE document_id = v_doc_id;

  INSERT INTO public.document_versions
    (document_id, version_number, storage_path, file_size_bytes, content_type, uploaded_by)
  VALUES
    (v_doc_id, v_version_number, p_storage_path, p_file_size_bytes, p_content_type, p_created_by);

  SELECT to_jsonb(d) INTO v_doc
  FROM public.documents d
  WHERE d.id = v_doc_id;

  RETURN v_doc;
END;
$$;

-- Restores a document to a previous version by updating the document row to point
-- at the version's storage path, then inserting a new version record (non-destructive
-- — history is always preserved and version numbers are monotonically increasing).
CREATE OR REPLACE FUNCTION public.restore_document_version(
  p_document_id uuid,
  p_version_id  uuid,
  p_restored_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version      public.document_versions%ROWTYPE;
  v_next_version integer;
  v_doc          jsonb;
BEGIN
  SELECT dv.* INTO v_version
  FROM public.document_versions dv
  JOIN public.documents d ON d.id = dv.document_id
  WHERE dv.id = p_version_id
    AND dv.document_id = p_document_id
    AND d.created_by = p_restored_by;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'version_not_found';
  END IF;

  UPDATE public.documents
  SET storage_path    = v_version.storage_path,
      file_size_bytes = v_version.file_size_bytes,
      updated_at      = now()
  WHERE id = p_document_id
    AND created_by = p_restored_by;

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.document_versions
  WHERE document_id = p_document_id;

  INSERT INTO public.document_versions
    (document_id, version_number, storage_path, file_size_bytes, content_type, uploaded_by)
  VALUES
    (p_document_id, v_next_version, v_version.storage_path, v_version.file_size_bytes,
     v_version.content_type, p_restored_by);

  SELECT to_jsonb(d) INTO v_doc
  FROM public.documents d
  WHERE d.id = p_document_id;

  RETURN v_doc;
END;
$$;
