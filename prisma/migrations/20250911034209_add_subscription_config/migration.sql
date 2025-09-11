-- CreateTable
CREATE TABLE "SubscriptionConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "milestone1Items" INTEGER NOT NULL DEFAULT 6,
    "milestone1Discount" REAL NOT NULL DEFAULT 5.0,
    "milestone1SubscriptionId" TEXT,
    "milestone2Items" INTEGER NOT NULL DEFAULT 10,
    "milestone2Discount" REAL NOT NULL DEFAULT 10.0,
    "milestone2SubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionConfig_shop_key" ON "SubscriptionConfig"("shop");
