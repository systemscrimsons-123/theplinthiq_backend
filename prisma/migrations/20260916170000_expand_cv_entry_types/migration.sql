-- AlterEnum
ALTER TYPE "cv_entry_type" ADD VALUE IF NOT EXISTS 'publication';
ALTER TYPE "cv_entry_type" ADD VALUE IF NOT EXISTS 'collection';
ALTER TYPE "cv_entry_type" ADD VALUE IF NOT EXISTS 'additional';

