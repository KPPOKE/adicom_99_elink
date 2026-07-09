CREATE TABLE `outlets` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `address` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `outlets_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `outlets` (`code`, `name`, `address`, `updated_at`)
VALUES ('ADICOM99_CIPUTAT', 'ADICOM99_CIPUTAT', 'Outlet default migrasi data lama', CURRENT_TIMESTAMP(3));

ALTER TABLE `users` ADD COLUMN `outlet_id` INTEGER NULL;
ALTER TABLE `transactions` ADD COLUMN `outlet_id` INTEGER NULL;
ALTER TABLE `services` ADD COLUMN `outlet_id` INTEGER NULL;
ALTER TABLE `bank_transfers` ADD COLUMN `outlet_id` INTEGER NULL;
ALTER TABLE `finance_records` ADD COLUMN `outlet_id` INTEGER NULL;

UPDATE `users` SET `outlet_id` = (SELECT `id` FROM `outlets` WHERE `code` = 'ADICOM99_CIPUTAT' LIMIT 1) WHERE `outlet_id` IS NULL;
UPDATE `transactions` SET `outlet_id` = (SELECT `id` FROM `outlets` WHERE `code` = 'ADICOM99_CIPUTAT' LIMIT 1) WHERE `outlet_id` IS NULL;
UPDATE `services` SET `outlet_id` = (SELECT `id` FROM `outlets` WHERE `code` = 'ADICOM99_CIPUTAT' LIMIT 1) WHERE `outlet_id` IS NULL;
UPDATE `bank_transfers` SET `outlet_id` = (SELECT `id` FROM `outlets` WHERE `code` = 'ADICOM99_CIPUTAT' LIMIT 1) WHERE `outlet_id` IS NULL;
UPDATE `finance_records` SET `outlet_id` = (SELECT `id` FROM `outlets` WHERE `code` = 'ADICOM99_CIPUTAT' LIMIT 1) WHERE `outlet_id` IS NULL;

CREATE TABLE `bank_transfer_deposits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `note` TEXT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `bank_transfer_deposits_outlet_id_date_idx`(`outlet_id`, `date`),
  INDEX `bank_transfer_deposits_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `users_outlet_id_idx` ON `users`(`outlet_id`);
CREATE INDEX `transactions_outlet_id_idx` ON `transactions`(`outlet_id`);
CREATE INDEX `services_outlet_id_idx` ON `services`(`outlet_id`);
CREATE INDEX `bank_transfers_outlet_id_idx` ON `bank_transfers`(`outlet_id`);
CREATE INDEX `finance_records_outlet_id_idx` ON `finance_records`(`outlet_id`);

ALTER TABLE `users` ADD CONSTRAINT `users_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `services` ADD CONSTRAINT `services_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `finance_records` ADD CONSTRAINT `finance_records_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bank_transfer_deposits` ADD CONSTRAINT `bank_transfer_deposits_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `bank_transfer_deposits` ADD CONSTRAINT `bank_transfer_deposits_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
