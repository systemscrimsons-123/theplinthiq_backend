ALTER TABLE collections
ADD COLUMN collection_type VARCHAR(30) NOT NULL DEFAULT 'moodboard';

ALTER TABLE collections
ADD CONSTRAINT collections_type_check
CHECK (collection_type IN ('collection', 'moodboard', 'private_viewing'));

ALTER TABLE shortlists
ADD COLUMN description TEXT;
