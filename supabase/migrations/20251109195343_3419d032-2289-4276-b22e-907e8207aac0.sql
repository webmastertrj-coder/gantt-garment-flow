-- Create table for import history
CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  records_count integer NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your needs)
CREATE POLICY "Allow public read access on import_history"
ON public.import_history
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access on import_history"
ON public.import_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_import_history_created_at ON public.import_history(created_at DESC);