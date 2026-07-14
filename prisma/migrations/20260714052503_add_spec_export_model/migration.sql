-- CreateTable
CREATE TABLE "SpecExport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecExport_projectId_idx" ON "SpecExport"("projectId");

-- CreateIndex
CREATE INDEX "SpecExport_userId_createdAt_idx" ON "SpecExport"("userId", "createdAt");
