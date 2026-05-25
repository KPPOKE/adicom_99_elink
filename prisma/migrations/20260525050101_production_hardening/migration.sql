-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `user_email` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_user_id_idx`(`user_id`),
    INDEX `audit_logs_entity_entity_id_idx`(`entity`, `entity_id`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `customers_name_idx` ON `customers`(`name`);

-- CreateIndex
CREATE INDEX `customers_phone_idx` ON `customers`(`phone`);

-- CreateIndex
CREATE INDEX `finance_records_date_idx` ON `finance_records`(`date`);

-- CreateIndex
CREATE INDEX `finance_records_type_idx` ON `finance_records`(`type`);

-- CreateIndex
CREATE INDEX `finance_records_date_type_idx` ON `finance_records`(`date`, `type`);

-- CreateIndex
CREATE INDEX `finance_records_category_idx` ON `finance_records`(`category`);

-- CreateIndex
CREATE INDEX `items_stok_idx` ON `items`(`stok`);

-- CreateIndex
CREATE INDEX `items_created_at_idx` ON `items`(`created_at`);

-- CreateIndex
CREATE INDEX `services_created_at_idx` ON `services`(`created_at`);

-- CreateIndex
CREATE INDEX `services_received_date_idx` ON `services`(`received_date`);

-- CreateIndex
CREATE INDEX `services_status_idx` ON `services`(`status`);

-- CreateIndex
CREATE INDEX `services_payment_status_idx` ON `services`(`payment_status`);

-- CreateIndex
CREATE INDEX `services_status_payment_status_received_date_idx` ON `services`(`status`, `payment_status`, `received_date`);

-- CreateIndex
CREATE INDEX `suppliers_name_idx` ON `suppliers`(`name`);

-- CreateIndex
CREATE INDEX `transactions_created_at_idx` ON `transactions`(`created_at`);

-- CreateIndex
CREATE INDEX `transactions_tanggal_idx` ON `transactions`(`tanggal`);

-- CreateIndex
CREATE INDEX `transactions_status_idx` ON `transactions`(`status`);

-- CreateIndex
CREATE INDEX `transactions_created_at_status_idx` ON `transactions`(`created_at`, `status`);

-- CreateIndex
CREATE INDEX `transactions_customer_id_created_at_idx` ON `transactions`(`customer_id`, `created_at`);
