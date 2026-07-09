-- CreateTable
CREATE TABLE `bank_transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode_transfer` VARCHAR(191) NOT NULL,
    `customer_id` INTEGER NULL,
    `sender_name` VARCHAR(191) NULL,
    `sender_phone` VARCHAR(191) NULL,
    `destination_bank` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `admin_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_received` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('Pending', 'Berhasil', 'Gagal') NOT NULL DEFAULT 'Pending',
    `note` TEXT NULL,
    `completed_at` DATETIME(3) NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_transfers_kode_transfer_key`(`kode_transfer`),
    INDEX `bank_transfers_customer_id_idx`(`customer_id`),
    INDEX `bank_transfers_user_id_idx`(`user_id`),
    INDEX `bank_transfers_status_idx`(`status`),
    INDEX `bank_transfers_created_at_idx`(`created_at`),
    INDEX `bank_transfers_destination_bank_idx`(`destination_bank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `finance_records` ADD COLUMN `bank_transfer_id` INTEGER NULL;
CREATE UNIQUE INDEX `finance_records_bank_transfer_id_key` ON `finance_records`(`bank_transfer_id`);
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `finance_records` ADD CONSTRAINT `finance_records_bank_transfer_id_fkey` FOREIGN KEY (`bank_transfer_id`) REFERENCES `bank_transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
