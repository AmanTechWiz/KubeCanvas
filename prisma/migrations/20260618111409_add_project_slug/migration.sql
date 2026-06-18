-- AlterTable
ALTER TABLE "Project" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Backfill existing rows from name
UPDATE "Project" SET "slug" = LOWER(REPLACE(REPLACE(REPLACE("name", ' ', '-'), '.', ''), '_', '-'));

-- Remove the default now that all rows have values
ALTER TABLE "Project" ALTER COLUMN "slug" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_slug_idx" ON "Project"("slug");
