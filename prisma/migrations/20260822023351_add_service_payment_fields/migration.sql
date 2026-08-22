-- AlterTable
ALTER TABLE `services` ADD COLUMN `payment_method` ENUM('Cash', 'Transfer', 'QRIS', 'Ewallet') NULL;
ALTER TABLE `services` ADD COLUMN `paid_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE `services` ADD COLUMN `change_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE `services` ADD COLUMN `fund_account_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `services_fund_account_id_idx` ON `services`(`fund_account_id`);

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_fund_account_id_fkey` FOREIGN KEY (`fund_account_id`) REFERENCES `fund_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
