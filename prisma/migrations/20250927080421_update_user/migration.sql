/*
  Warnings:

  - A unique constraint covering the columns `[year]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `faculty` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `faculty` ENUM('School_of_Agro_Industry', 'school_of_Cosmetic_Science', 'School_of_Health_Science', 'School_of_Applied_Digital_Technology', 'School_of_Integrative_Medicine', 'School_of_Law', 'School_of_Liberal_Arts', 'School_of_Management', 'School_of_Nursing', 'School_of_Science', 'School_of_Sinology', 'School_of_Social_Innovation', 'School_of_Dentistry') NOT NULL,
    ADD COLUMN `year` VARCHAR(25) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_year_key` ON `User`(`year`);
