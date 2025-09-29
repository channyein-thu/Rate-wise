-- CreateTable
CREATE TABLE `Otp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(52) NOT NULL,
    `otp` VARCHAR(191) NOT NULL,
    `rememberToken` VARCHAR(191) NOT NULL,
    `verifyToken` VARCHAR(191) NULL,
    `count` SMALLINT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `error` SMALLINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `Otp_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(52) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `faculty` ENUM('School_of_Agro_Industry', 'school_of_Cosmetic_Science', 'School_of_Health_Science', 'School_of_Applied_Digital_Technology', 'School_of_Integrative_Medicine', 'School_of_Law', 'School_of_Liberal_Arts', 'School_of_Management', 'School_of_Nursing', 'School_of_Science', 'School_of_Sinology', 'School_of_Social_Innovation', 'School_of_Dentistry') NOT NULL,
    `year` VARCHAR(25) NOT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'INACTIVE', 'FREEZE') NOT NULL DEFAULT 'ACTIVE',
    `lastLogin` DATETIME(3) NULL,
    `errorLoginCount` SMALLINT NOT NULL DEFAULT 0,
    `randToken` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Professor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `image` VARCHAR(255) NOT NULL,
    `faculty` ENUM('School_of_Agro_Industry', 'school_of_Cosmetic_Science', 'School_of_Health_Science', 'School_of_Applied_Digital_Technology', 'School_of_Integrative_Medicine', 'School_of_Law', 'School_of_Liberal_Arts', 'School_of_Management', 'School_of_Nursing', 'School_of_Science', 'School_of_Sinology', 'School_of_Social_Innovation', 'School_of_Dentistry') NOT NULL,
    `email` VARCHAR(52) NOT NULL,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `averageRate` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Professor_name_key`(`name`),
    UNIQUE INDEX `Professor_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `code` VARCHAR(52) NOT NULL,
    `credits` TINYINT NOT NULL,
    `description` TEXT NOT NULL,
    `faculty` ENUM('School_of_Agro_Industry', 'school_of_Cosmetic_Science', 'School_of_Health_Science', 'School_of_Applied_Digital_Technology', 'School_of_Integrative_Medicine', 'School_of_Law', 'School_of_Liberal_Arts', 'School_of_Management', 'School_of_Nursing', 'School_of_Science', 'School_of_Sinology', 'School_of_Social_Innovation', 'School_of_Dentistry') NOT NULL,
    `totalReviews` INTEGER NOT NULL DEFAULT 0,
    `averageRate` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Course_title_key`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rating` TINYINT NOT NULL,
    `comment` TEXT NOT NULL,
    `courseId` INTEGER NULL,
    `professorId` INTEGER NULL,
    `authorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Review_authorId_courseId_key`(`authorId`, `courseId`),
    UNIQUE INDEX `Review_authorId_professorId_key`(`authorId`, `professorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_professorId_fkey` FOREIGN KEY (`professorId`) REFERENCES `Professor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
