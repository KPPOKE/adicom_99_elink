-- AlterTable
ALTER TABLE `finance_records` ADD COLUMN `fund_account_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `fund_account_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `finance_records_fund_account_id_idx` ON `finance_records`(`fund_account_id`);

-- CreateIndex
CREATE INDEX `transactions_fund_account_id_idx` ON `transactions`(`fund_account_id`);

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_fund_account_id_fkey` FOREIGN KEY (`fund_account_id`) REFERENCES `fund_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_records` ADD CONSTRAINT `finance_records_fund_account_id_fkey` FOREIGN KEY (`fund_account_id`) REFERENCES `fund_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
