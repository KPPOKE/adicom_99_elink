-- AlterTable
ALTER TABLE `services` ADD COLUMN `paid_at` DATETIME(3) NULL,
    ADD COLUMN `payment_status` ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid';

-- AlterTable
ALTER TABLE `settings` ADD COLUMN `default_print_format` VARCHAR(191) NOT NULL DEFAULT 'thermal_80';

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `status` ENUM('Berhasil', 'Pending', 'Batal') NOT NULL DEFAULT 'Berhasil';
