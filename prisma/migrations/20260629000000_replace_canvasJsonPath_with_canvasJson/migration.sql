-- AlterTable: Replace canvasJsonPath (blob URL) with canvasJson (JSON)
ALTER TABLE "Project" DROP COLUMN "canvasJsonPath";
ALTER TABLE "Project" ADD COLUMN "canvasJson" JSONB;
