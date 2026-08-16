-- CreateTable
CREATE TABLE "ReloadingComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "caliber" TEXT,
    "spec" TEXT,
    "quantity" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "purchasePrice" REAL,
    "pricePerUnit" REAL,
    "purchaseDate" DATETIME,
    "storageLocation" TEXT,
    "lowStockAlert" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReloadingComponentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "previousQty" REAL NOT NULL,
    "newQty" REAL NOT NULL,
    "note" TEXT,
    "batchId" TEXT,
    "transactedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePrice" REAL,
    "pricePerUnit" REAL,
    "purchaseDate" DATETIME,
    CONSTRAINT "ReloadingComponentTransaction_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ReloadingComponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReloadingComponentTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ReloadingBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReloadingRecipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "caliber" TEXT NOT NULL,
    "bulletComponentId" TEXT,
    "bulletDesc" TEXT,
    "powderComponentId" TEXT,
    "powderDesc" TEXT,
    "chargeWeightGrains" REAL NOT NULL,
    "primerComponentId" TEXT,
    "primerDesc" TEXT,
    "brassComponentId" TEXT,
    "brassDesc" TEXT,
    "overallLengthInches" REAL,
    "targetVelocityFps" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReloadingRecipe_bulletComponentId_fkey" FOREIGN KEY ("bulletComponentId") REFERENCES "ReloadingComponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReloadingRecipe_powderComponentId_fkey" FOREIGN KEY ("powderComponentId") REFERENCES "ReloadingComponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReloadingRecipe_primerComponentId_fkey" FOREIGN KEY ("primerComponentId") REFERENCES "ReloadingComponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReloadingRecipe_brassComponentId_fkey" FOREIGN KEY ("brassComponentId") REFERENCES "ReloadingComponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReloadingBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "batchDate" DATETIME NOT NULL,
    "quantityProduced" INTEGER NOT NULL,
    "reusedBrass" BOOLEAN NOT NULL DEFAULT false,
    "totalCost" REAL,
    "costPerRound" REAL,
    "notes" TEXT,
    "ammoStockId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReloadingBatch_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ReloadingRecipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReloadingBatch_ammoStockId_fkey" FOREIGN KEY ("ammoStockId") REFERENCES "AmmoStock" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReloadingComponent_componentType_idx" ON "ReloadingComponent"("componentType");

-- CreateIndex
CREATE INDEX "ReloadingComponent_caliber_idx" ON "ReloadingComponent"("caliber");

-- CreateIndex
CREATE INDEX "ReloadingComponentTransaction_componentId_idx" ON "ReloadingComponentTransaction"("componentId");

-- CreateIndex
CREATE INDEX "ReloadingComponentTransaction_transactedAt_idx" ON "ReloadingComponentTransaction"("transactedAt");

-- CreateIndex
CREATE INDEX "ReloadingComponentTransaction_batchId_idx" ON "ReloadingComponentTransaction"("batchId");

-- CreateIndex
CREATE INDEX "ReloadingRecipe_caliber_idx" ON "ReloadingRecipe"("caliber");

-- CreateIndex
CREATE INDEX "ReloadingBatch_recipeId_idx" ON "ReloadingBatch"("recipeId");

-- CreateIndex
CREATE INDEX "ReloadingBatch_batchDate_idx" ON "ReloadingBatch"("batchDate");

-- CreateIndex
CREATE INDEX "ReloadingBatch_ammoStockId_idx" ON "ReloadingBatch"("ammoStockId");
