-- Enable real-time updates for the references table
ALTER TABLE public.references REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.references;