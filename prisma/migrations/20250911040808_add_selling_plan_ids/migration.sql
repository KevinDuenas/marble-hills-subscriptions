/*
  Warnings:

  - You are about to drop the column `milestone1SubscriptionId` on the `SubscriptionConfig` table. All the data in the column will be lost.
  - You are about to drop the column `milestone2SubscriptionId` on the `SubscriptionConfig` table. All the data in the column will be lost.
  - Added the required column `milestone1_2weeks` to the `SubscriptionConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `milestone1_4weeks` to the `SubscriptionConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `milestone1_6weeks` to the `SubscriptionConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `milestone2_2weeks` to the `SubscriptionConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `milestone2_4weeks` to the `SubscriptionConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `milestone2_6weeks` to the `SubscriptionConfig` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubscriptionConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "milestone1Items" INTEGER NOT NULL DEFAULT 6,
    "milestone1Discount" REAL NOT NULL DEFAULT 5.0,
    "milestone2Items" INTEGER NOT NULL DEFAULT 10,
    "milestone2Discount" REAL NOT NULL DEFAULT 10.0,
    "milestone1_2weeks" TEXT NOT NULL,
    "milestone1_4weeks" TEXT NOT NULL,
    "milestone1_6weeks" TEXT NOT NULL,
    "milestone2_2weeks" TEXT NOT NULL,
    "milestone2_4weeks" TEXT NOT NULL,
    "milestone2_6weeks" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SubscriptionConfig" ("createdAt", "id", "milestone1Discount", "milestone1Items", "milestone2Discount", "milestone2Items", "shop", "updatedAt", "milestone1_2weeks", "milestone1_4weeks", "milestone1_6weeks", "milestone2_2weeks", "milestone2_4weeks", "milestone2_6weeks") 
SELECT "createdAt", "id", "milestone1Discount", "milestone1Items", "milestone2Discount", "milestone2Items", "shop", "updatedAt", 
       "689100587309", "689157964077", "689157996845", "689425580333", "689425613101", "689425645869" 
FROM "SubscriptionConfig";
DROP TABLE "SubscriptionConfig";
ALTER TABLE "new_SubscriptionConfig" RENAME TO "SubscriptionConfig";
CREATE UNIQUE INDEX "SubscriptionConfig_shop_key" ON "SubscriptionConfig"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
