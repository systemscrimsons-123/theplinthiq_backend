-- Drop the strict role requirement for follows to allow Artists and Galleries
CREATE OR REPLACE FUNCTION enforce_follow_role_pairs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Disabled strict role checking. Logic is now handled securely in social.service.ts
  RETURN NEW;
END;
$$;
