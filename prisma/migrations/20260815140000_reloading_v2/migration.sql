-- DropIndex
DROP INDEX "ReloadingComponent_caliber_idx";

-- DropIndex
DROP INDEX "ReloadingComponent_componentType_idx";

-- DropIndex
DROP INDEX "ReloadingComponentTransaction_batchId_idx";

-- DropIndex
DROP INDEX "ReloadingComponentTransaction_transactedAt_idx";

-- DropIndex
DROP INDEX "ReloadingComponentTransaction_componentId_idx";

-- DropIndex
DROP INDEX "ReloadingRecipe_caliber_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ReloadingComponent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ReloadingComponentTransaction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ReloadingRecipe";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PowderInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturer" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "powderType" TEXT NOT NULL,
    "burnRateCategory" TEXT,
    "burnRateNumber" INTEGER,
    "granuleShape" TEXT,
    "color" TEXT,
    "quantityOnHandGrains" REAL NOT NULL DEFAULT 0,
    "numberOfContainers" INTEGER,
    "containerSizeLbs" TEXT,
    "lotNumber" TEXT,
    "dateAcquired" DATETIME,
    "storageLocation" TEXT,
    "condition" TEXT,
    "purchasePrice" REAL,
    "hazmatFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "vendor" TEXT,
    "intendedCalibersOrApplications" TEXT,
    "compatibleBulletWeightMin" REAL,
    "compatibleBulletWeightMax" REAL,
    "typicalChargeMin" REAL,
    "typicalChargeMax" REAL,
    "loadDataReference" TEXT,
    "notes" TEXT,
    "maxStorageQuantityLbs" REAL,
    "hazardClassification" TEXT,
    "reorderThreshold" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PowderTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "powderId" TEXT NOT NULL,
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
    CONSTRAINT "PowderTransaction_powderId_fkey" FOREIGN KEY ("powderId") REFERENCES "PowderInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PowderTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ReloadingBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrimerInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturer" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "primerType" TEXT NOT NULL,
    "isMagnum" BOOLEAN NOT NULL DEFAULT false,
    "isMatch" BOOLEAN NOT NULL DEFAULT false,
    "primerSystem" TEXT NOT NULL DEFAULT 'Boxer',
    "sensitivityRating" TEXT,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "numberOfBoxes" INTEGER,
    "numberOfSleeves" INTEGER,
    "numberOfBricks" INTEGER,
    "countPerContainer" TEXT,
    "lotNumber" TEXT,
    "dateAcquired" DATETIME,
    "storageLocation" TEXT,
    "condition" TEXT,
    "purchasePrice" REAL,
    "hazmatFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "vendor" TEXT,
    "intendedCalibersOrApplications" TEXT,
    "compatiblePowderTypes" TEXT,
    "seatingDepthNotes" TEXT,
    "loadDataReference" TEXT,
    "notes" TEXT,
    "maxStorageQuantityCount" INTEGER,
    "hazardClassification" TEXT,
    "reorderThreshold" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrimerTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "primerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "note" TEXT,
    "batchId" TEXT,
    "transactedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePrice" REAL,
    "pricePerUnit" REAL,
    "purchaseDate" DATETIME,
    CONSTRAINT "PrimerTransaction_primerId_fkey" FOREIGN KEY ("primerId") REFERENCES "PrimerInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrimerTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ReloadingBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrassInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caliber" TEXT NOT NULL,
    "headstamp" TEXT,
    "manufacturer" TEXT,
    "caseMaterial" TEXT NOT NULL DEFAULT 'Brass',
    "primerSystem" TEXT NOT NULL DEFAULT 'Boxer',
    "caseOrigin" TEXT,
    "isMilitaryBrass" BOOLEAN NOT NULL DEFAULT false,
    "isMixedHeadstamp" BOOLEAN NOT NULL DEFAULT false,
    "firingCount" INTEGER NOT NULL DEFAULT 0,
    "maxFiringCount" INTEGER,
    "preparationStatus" TEXT,
    "isAnnealed" BOOLEAN NOT NULL DEFAULT false,
    "annealingCount" INTEGER NOT NULL DEFAULT 0,
    "isNeckTurned" BOOLEAN NOT NULL DEFAULT false,
    "isFlashHoleDeburred" BOOLEAN NOT NULL DEFAULT false,
    "isPrimerPocketUniformed" BOOLEAN NOT NULL DEFAULT false,
    "isPrimerPocketSwaged" BOOLEAN NOT NULL DEFAULT false,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReadyToLoad" INTEGER NOT NULL DEFAULT 0,
    "quantityInProcess" INTEGER NOT NULL DEFAULT 0,
    "quantityRetired" INTEGER NOT NULL DEFAULT 0,
    "lotIdentifier" TEXT,
    "dateAcquired" DATETIME,
    "storageLocation" TEXT,
    "trimToLengthIn" REAL,
    "maxCaseLengthIn" REAL,
    "currentAvgLengthIn" REAL,
    "headDiameterIn" REAL,
    "neckWallThicknessIn" REAL,
    "dimensionalNotes" TEXT,
    "purchasePrice" REAL,
    "vendor" TEXT,
    "source" TEXT,
    "intendedLoad" TEXT,
    "compatibleDies" TEXT,
    "loadDataReference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BrassTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brassId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "note" TEXT,
    "batchId" TEXT,
    "transactedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePrice" REAL,
    "pricePerUnit" REAL,
    "purchaseDate" DATETIME,
    CONSTRAINT "BrassTransaction_brassId_fkey" FOREIGN KEY ("brassId") REFERENCES "BrassInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BrassTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ReloadingBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulletInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturer" TEXT NOT NULL,
    "productLine" TEXT,
    "productName" TEXT NOT NULL,
    "caliberDiameterIn" REAL NOT NULL,
    "caliberLabel" TEXT,
    "weightGrains" REAL NOT NULL,
    "bulletType" TEXT NOT NULL,
    "baseStyle" TEXT,
    "noseStyle" TEXT,
    "intendedUse" TEXT,
    "coreConstruction" TEXT,
    "jacketMaterial" TEXT,
    "isLeadFree" BOOLEAN NOT NULL DEFAULT false,
    "hasCannelure" BOOLEAN NOT NULL DEFAULT false,
    "hasBoattailGasCheck" BOOLEAN NOT NULL DEFAULT false,
    "bcG1" REAL,
    "bcG7" REAL,
    "bulletLengthIn" REAL,
    "baseToOgiveIn" REAL,
    "twistRateMin" TEXT,
    "twistRateRecommended" TEXT,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "numberOfBoxes" INTEGER,
    "countPerBox" TEXT,
    "lotNumber" TEXT,
    "dateAcquired" DATETIME,
    "storageLocation" TEXT,
    "condition" TEXT,
    "purchasePrice" REAL,
    "vendor" TEXT,
    "intendedCalibersOrCartridges" TEXT,
    "recommendedCoalIn" REAL,
    "recommendedHundredthsJump" REAL,
    "compatiblePowders" TEXT,
    "loadDataReference" TEXT,
    "notes" TEXT,
    "reorderThreshold" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BulletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bulletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "note" TEXT,
    "batchId" TEXT,
    "transactedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePrice" REAL,
    "pricePerUnit" REAL,
    "purchaseDate" DATETIME,
    CONSTRAINT "BulletTransaction_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "BulletInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BulletTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ReloadingBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoadRecipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeName" TEXT NOT NULL,
    "caliberCartridge" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Development',
    "intendedUse" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "bulletId" TEXT,
    "bulletWeightGrains" REAL,
    "bulletDiameterIn" REAL,
    "powderId" TEXT,
    "chargeWeightGrains" REAL NOT NULL,
    "primerId" TEXT,
    "brassId" TEXT,
    "brassFireCount" INTEGER,
    "coalIn" REAL NOT NULL,
    "cbtoIn" REAL,
    "jumpToLandsIn" REAL,
    "crimpType" TEXT,
    "crimpAmountIn" REAL,
    "publishedChargeMinGrains" REAL,
    "publishedChargeMaxGrains" REAL,
    "publishedVelocityFps" INTEGER,
    "expectedVelocityFps" INTEGER,
    "publishedPressurePsi" INTEGER,
    "publishedPressureCup" INTEGER,
    "publishedBarrelLengthIn" REAL,
    "loadDataSource" TEXT,
    "primerAppearance" TEXT,
    "ejectorMarks" TEXT,
    "extractionDifficulty" TEXT,
    "caseHeadExpansionIn" REAL,
    "pressureAssessment" TEXT,
    "pressureNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadRecipe_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "BulletInventory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRecipe_powderId_fkey" FOREIGN KEY ("powderId") REFERENCES "PowderInventory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRecipe_primerId_fkey" FOREIGN KEY ("primerId") REFERENCES "PrimerInventory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRecipe_brassId_fkey" FOREIGN KEY ("brassId") REFERENCES "BrassInventory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChronographSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "sessionDate" DATETIME NOT NULL,
    "sessionLabel" TEXT,
    "firearmId" TEXT,
    "barrelLengthIn" REAL,
    "testDistanceYards" REAL,
    "chronographModel" TEXT,
    "temperatureFahrenheit" REAL,
    "altitudeFt" INTEGER,
    "humidityPercent" REAL,
    "weatherConditions" TEXT,
    "shotVelocities" TEXT NOT NULL,
    "groupSizeIn" REAL,
    "groupDistanceYards" INTEGER,
    "numberOfShotsInGroup" INTEGER,
    "pointOfImpactNotes" TEXT,
    "sessionNotes" TEXT,
    "isConfirmationSession" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChronographSession_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "LoadRecipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChronographSession_firearmId_fkey" FOREIGN KEY ("firearmId") REFERENCES "Firearm" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReloadingBatch" (
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
    CONSTRAINT "ReloadingBatch_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "LoadRecipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReloadingBatch_ammoStockId_fkey" FOREIGN KEY ("ammoStockId") REFERENCES "AmmoStock" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReloadingBatch" ("ammoStockId", "batchDate", "costPerRound", "createdAt", "id", "notes", "quantityProduced", "recipeId", "reusedBrass", "totalCost") SELECT "ammoStockId", "batchDate", "costPerRound", "createdAt", "id", "notes", "quantityProduced", "recipeId", "reusedBrass", "totalCost" FROM "ReloadingBatch";
DROP TABLE "ReloadingBatch";
ALTER TABLE "new_ReloadingBatch" RENAME TO "ReloadingBatch";
CREATE INDEX "ReloadingBatch_recipeId_idx" ON "ReloadingBatch"("recipeId");
CREATE INDEX "ReloadingBatch_batchDate_idx" ON "ReloadingBatch"("batchDate");
CREATE INDEX "ReloadingBatch_ammoStockId_idx" ON "ReloadingBatch"("ammoStockId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PowderInventory_powderType_idx" ON "PowderInventory"("powderType");

-- CreateIndex
CREATE INDEX "PowderInventory_manufacturer_idx" ON "PowderInventory"("manufacturer");

-- CreateIndex
CREATE INDEX "PowderTransaction_powderId_idx" ON "PowderTransaction"("powderId");

-- CreateIndex
CREATE INDEX "PowderTransaction_transactedAt_idx" ON "PowderTransaction"("transactedAt");

-- CreateIndex
CREATE INDEX "PowderTransaction_batchId_idx" ON "PowderTransaction"("batchId");

-- CreateIndex
CREATE INDEX "PrimerInventory_primerType_idx" ON "PrimerInventory"("primerType");

-- CreateIndex
CREATE INDEX "PrimerInventory_manufacturer_idx" ON "PrimerInventory"("manufacturer");

-- CreateIndex
CREATE INDEX "PrimerTransaction_primerId_idx" ON "PrimerTransaction"("primerId");

-- CreateIndex
CREATE INDEX "PrimerTransaction_transactedAt_idx" ON "PrimerTransaction"("transactedAt");

-- CreateIndex
CREATE INDEX "PrimerTransaction_batchId_idx" ON "PrimerTransaction"("batchId");

-- CreateIndex
CREATE INDEX "BrassInventory_caliber_idx" ON "BrassInventory"("caliber");

-- CreateIndex
CREATE INDEX "BrassInventory_preparationStatus_idx" ON "BrassInventory"("preparationStatus");

-- CreateIndex
CREATE INDEX "BrassTransaction_brassId_idx" ON "BrassTransaction"("brassId");

-- CreateIndex
CREATE INDEX "BrassTransaction_transactedAt_idx" ON "BrassTransaction"("transactedAt");

-- CreateIndex
CREATE INDEX "BrassTransaction_batchId_idx" ON "BrassTransaction"("batchId");

-- CreateIndex
CREATE INDEX "BulletInventory_caliberLabel_idx" ON "BulletInventory"("caliberLabel");

-- CreateIndex
CREATE INDEX "BulletInventory_bulletType_idx" ON "BulletInventory"("bulletType");

-- CreateIndex
CREATE INDEX "BulletInventory_weightGrains_idx" ON "BulletInventory"("weightGrains");

-- CreateIndex
CREATE INDEX "BulletTransaction_bulletId_idx" ON "BulletTransaction"("bulletId");

-- CreateIndex
CREATE INDEX "BulletTransaction_transactedAt_idx" ON "BulletTransaction"("transactedAt");

-- CreateIndex
CREATE INDEX "BulletTransaction_batchId_idx" ON "BulletTransaction"("batchId");

-- CreateIndex
CREATE INDEX "LoadRecipe_caliberCartridge_idx" ON "LoadRecipe"("caliberCartridge");

-- CreateIndex
CREATE INDEX "LoadRecipe_status_idx" ON "LoadRecipe"("status");

-- CreateIndex
CREATE INDEX "LoadRecipe_bulletId_idx" ON "LoadRecipe"("bulletId");

-- CreateIndex
CREATE INDEX "LoadRecipe_powderId_idx" ON "LoadRecipe"("powderId");

-- CreateIndex
CREATE INDEX "LoadRecipe_primerId_idx" ON "LoadRecipe"("primerId");

-- CreateIndex
CREATE INDEX "LoadRecipe_brassId_idx" ON "LoadRecipe"("brassId");

-- CreateIndex
CREATE INDEX "ChronographSession_recipeId_idx" ON "ChronographSession"("recipeId");

-- CreateIndex
CREATE INDEX "ChronographSession_sessionDate_idx" ON "ChronographSession"("sessionDate");

-- CreateIndex
CREATE INDEX "ChronographSession_firearmId_idx" ON "ChronographSession"("firearmId");
