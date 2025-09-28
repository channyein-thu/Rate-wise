/*
  Warnings:

  - You are about to drop the column `title` on the `Professor` table. All the data in the column will be lost.
  - Added the required column `image` to the `Professor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Professor` DROP COLUMN `title`,
    ADD COLUMN `image` VARCHAR(255) NOT NULL;
