-- CreateTable
CREATE TABLE `admin_fee_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `admin_fee_settings_outlet_id_key` (`outlet_id`),
  CONSTRAINT `admin_fee_settings_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_fee_rules` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `outlet_id` INTEGER NOT NULL,
  `kind` ENUM('Tarik_Tunai', 'Transfer') NOT NULL,
  `nominal_from` DECIMAL(14, 2) NOT NULL,
  `nominal_to` DECIMAL(14, 2) NOT NULL,
  `admin_amount` DECIMAL(14, 2) NOT NULL,
  `admin_type` ENUM('Dalam', 'Luar') NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `admin_fee_rules_outlet_id_kind_idx` (`outlet_id`, `kind`),
  CONSTRAINT `admin_fee_rules_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
