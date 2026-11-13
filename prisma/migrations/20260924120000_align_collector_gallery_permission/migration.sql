UPDATE interaction_permissions
SET mode = 'request_only'
WHERE from_role = 'collector'
  AND to_role = 'gallery';

INSERT INTO interaction_permissions (from_role, to_role, mode)
VALUES ('collector', 'gallery', 'request_only')
ON CONFLICT (from_role, to_role)
DO UPDATE SET mode = EXCLUDED.mode;
