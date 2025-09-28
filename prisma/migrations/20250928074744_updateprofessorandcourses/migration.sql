-- AlterTable
ALTER TABLE `Course` ADD COLUMN `totalReviews` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Professor` ADD COLUMN `totalReviews` INTEGER NOT NULL DEFAULT 0;
