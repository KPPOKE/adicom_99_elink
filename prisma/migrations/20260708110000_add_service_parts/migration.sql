ALTER TABLE `items` ADD COLUMN `reserved_stock` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `services` ADD COLUMN `labor_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0;

CREATE TABLE `service_parts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `service_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `qty` INTEGER NOT NULL,
    `price` DECIMAL(14, 2) NOT NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `service_parts_service_id_item_id_key`(`service_id`, `item_id`),
    INDEX `service_parts_item_id_idx`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `service_parts` ADD CONSTRAINT `service_parts_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `service_parts` ADD CONSTRAINT `service_parts_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
