INSERT INTO interaction_permissions (from_role, to_role, mode) VALUES
  ('artist', 'artist', 'blocked'),
  ('artist', 'gallery', 'pitch_only'),
  ('artist', 'art_professional', 'blocked'),
  ('artist', 'collector', 'blocked'),
  ('gallery', 'artist', 'open'),
  ('gallery', 'gallery', 'blocked'),
  ('gallery', 'art_professional', 'blocked'),
  ('gallery', 'collector', 'blocked'),
  ('art_professional', 'artist', 'open'),
  ('art_professional', 'gallery', 'open'),
  ('art_professional', 'art_professional', 'blocked'),
  ('art_professional', 'collector', 'blocked'),
  ('collector', 'artist', 'request_only'),
  ('collector', 'gallery', 'request_only'),
  ('collector', 'art_professional', 'blocked'),
  ('collector', 'collector', 'blocked')
ON CONFLICT (from_role, to_role)
DO UPDATE SET mode = EXCLUDED.mode;
