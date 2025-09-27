/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Professor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Course` MODIFY `title` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `Professor` MODIFY `name` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Course_title_key` ON `Course`(`title`);

-- CreateIndex
CREATE UNIQUE INDEX `Professor_name_key` ON `Professor`(`name`);
