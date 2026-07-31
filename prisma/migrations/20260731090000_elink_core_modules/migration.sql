CREATE TABLE `receivables` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `customer_id` INTEGER NOT NULL,
  `loan_date` DATETIME(3) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('Belum_Lunas','Lunas') NOT NULL DEFAULT 'Belum_Lunas',
  `paid_at` DATETIME(3) NULL,
  `record_expense` BOOLEAN NOT NULL DEFAULT false,
  `source_fund_id` INTEGER NULL,
  `created_by_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `receivables_outlet_id_status_loan_date_idx` (`outlet_id`, `status`, `loan_date`),
  INDEX `receivables_customer_id_idx` (`customer_id`),
  INDEX `receivables_source_fund_id_idx` (`source_fund_id`),
  CONSTRAINT `receivables_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `receivables_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `receivables_source_fund_id_fkey` FOREIGN KEY (`source_fund_id`) REFERENCES `fund_accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `receivables_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payrolls` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `employee_id` INTEGER NOT NULL,
  `period` DATE NOT NULL,
  `base_salary` DECIMAL(14,2) NOT NULL,
  `allowance` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `deduction` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `total_salary` DECIMAL(14,2) NOT NULL,
  `payment_date` DATE NULL,
  `status` ENUM('Pending','Dibayar') NOT NULL DEFAULT 'Pending',
  `note` TEXT NULL,
  `created_by_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `payrolls_outlet_id_employee_id_period_key` (`outlet_id`, `employee_id`, `period`),
  INDEX `payrolls_outlet_id_status_period_idx` (`outlet_id`, `status`, `period`),
  CONSTRAINT `payrolls_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payrolls_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payrolls_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `receipt_bank_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `bank_name` VARCHAR(191) NOT NULL,
  `account_name` VARCHAR(191) NOT NULL,
  `account_number` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `receipt_bank_accounts_outlet_id_bank_name_account_number_key` (`outlet_id`, `bank_name`, `account_number`),
  INDEX `receipt_bank_accounts_outlet_id_bank_name_idx` (`outlet_id`, `bank_name`),
  CONSTRAINT `receipt_bank_accounts_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `receipt_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `store_name` VARCHAR(191) NOT NULL,
  `address` TEXT NULL,
  `footer` TEXT NULL,
  `logo` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `receipt_settings_outlet_id_key` (`outlet_id`),
  CONSTRAINT `receipt_settings_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `receipt_settings` (`outlet_id`, `store_name`, `address`, `footer`, `created_at`, `updated_at`)
SELECT `id`, `name`, `address`, 'Terima kasih atas kepercayaan Anda', NOW(3), NOW(3) FROM `outlets`;