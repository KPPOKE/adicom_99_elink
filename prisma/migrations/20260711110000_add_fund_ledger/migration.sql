ALTER TABLE `bank_transfers`
  ADD COLUMN `kind` ENUM('Transfer','Tarik_Tunai') NOT NULL DEFAULT 'Transfer',
  ADD COLUMN `transaction_type` VARCHAR(191) NULL,
  ADD COLUMN `source_fund_id` INTEGER NULL,
  ADD COLUMN `target_fund_id` INTEGER NULL,
  ADD COLUMN `admin_bank_fee` DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN `external_admin_fee` DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TABLE `fund_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('Cash','Bank','Ewallet','Pulsa_Server','Other') NOT NULL,
  `balance` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `opening_balance` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `fund_accounts_outlet_id_name_key`(`outlet_id`, `name`),
  INDEX `fund_accounts_outlet_id_type_idx`(`outlet_id`, `type`),
  INDEX `fund_accounts_is_active_idx`(`is_active`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fund_mutations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `fund_account_id` INTEGER NOT NULL,
  `type` ENUM('Opening','Transfer_Out','Transfer_In','Cash_Out','Cash_In','Deposit_In','Withdraw_Out','Move_In','Move_Out','Adjustment','Reversal') NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `admin_fee` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `balance_before` DECIMAL(14,2) NOT NULL,
  `balance_after` DECIMAL(14,2) NOT NULL,
  `reference_type` VARCHAR(191) NULL,
  `reference_id` INTEGER NULL,
  `bank_transfer_id` INTEGER NULL,
  `note` TEXT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `fund_mutations_outlet_id_created_at_idx`(`outlet_id`, `created_at`),
  INDEX `fund_mutations_fund_account_id_created_at_idx`(`fund_account_id`, `created_at`),
  INDEX `fund_mutations_bank_transfer_id_idx`(`bank_transfer_id`),
  INDEX `fund_mutations_reference_type_reference_id_idx`(`reference_type`, `reference_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `bank_transfers_source_fund_id_idx` ON `bank_transfers`(`source_fund_id`);
CREATE INDEX `bank_transfers_target_fund_id_idx` ON `bank_transfers`(`target_fund_id`);
CREATE INDEX `bank_transfers_kind_idx` ON `bank_transfers`(`kind`);

ALTER TABLE `fund_accounts` ADD CONSTRAINT `fund_accounts_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `fund_mutations` ADD CONSTRAINT `fund_mutations_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `fund_mutations` ADD CONSTRAINT `fund_mutations_fund_account_id_fkey` FOREIGN KEY (`fund_account_id`) REFERENCES `fund_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `fund_mutations` ADD CONSTRAINT `fund_mutations_bank_transfer_id_fkey` FOREIGN KEY (`bank_transfer_id`) REFERENCES `bank_transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `fund_mutations` ADD CONSTRAINT `fund_mutations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_source_fund_id_fkey` FOREIGN KEY (`source_fund_id`) REFERENCES `fund_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bank_transfers` ADD CONSTRAINT `bank_transfers_target_fund_id_fkey` FOREIGN KEY (`target_fund_id`) REFERENCES `fund_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `fund_accounts` (`outlet_id`, `name`, `type`, `balance`, `opening_balance`, `note`)
SELECT `id`, 'LACI', 'Cash', 0, 0, 'Kas tunai outlet' FROM `outlets`
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `fund_accounts` (`outlet_id`, `name`, `type`, `balance`, `opening_balance`, `note`)
SELECT `id`, 'BRI', 'Bank', 0, 0, 'Saldo bank utama' FROM `outlets`
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `fund_accounts` (`outlet_id`, `name`, `type`, `balance`, `opening_balance`, `note`)
SELECT `id`, 'DANA', 'Ewallet', 0, 0, 'Saldo e-wallet' FROM `outlets`
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

UPDATE `fund_accounts` fa
JOIN (
  SELECT o.`id` AS outlet_id,
    GREATEST(COALESCE(d.total_deposit, 0) - COALESCE(t.total_used, 0), 0) AS legacy_balance
  FROM `outlets` o
  LEFT JOIN (SELECT `outlet_id`, SUM(`amount`) total_deposit FROM `bank_transfer_deposits` GROUP BY `outlet_id`) d ON d.`outlet_id` = o.`id`
  LEFT JOIN (SELECT `outlet_id`, SUM(`amount`) total_used FROM `bank_transfers` WHERE `status` = 'Berhasil' GROUP BY `outlet_id`) t ON t.`outlet_id` = o.`id`
) x ON x.outlet_id = fa.`outlet_id`
SET fa.`balance` = x.legacy_balance, fa.`opening_balance` = x.legacy_balance
WHERE fa.`name` = 'BRI' AND fa.`balance` = 0;
