CREATE TABLE `user_permissions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `user_permissions_user_id_key_key`(`user_id`, `key`),
  INDEX `user_permissions_key_idx`(`key`),
  CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `user_permissions` (`user_id`, `key`)
SELECT u.id, p.`key`
FROM `users` u
JOIN `roles` r ON r.id = u.role_id
JOIN (
  SELECT 'dashboard.view' AS `key` UNION ALL
  SELECT 'customers.view' UNION ALL
  SELECT 'customers.manage' UNION ALL
  SELECT 'transactions.view' UNION ALL
  SELECT 'transactions.manage' UNION ALL
  SELECT 'bankTransfers.view' UNION ALL
  SELECT 'bankTransfers.manage' UNION ALL
  SELECT 'services.view' UNION ALL
  SELECT 'services.manage' UNION ALL
  SELECT 'settings.view' UNION ALL
  SELECT 'settings.backup'
) p
WHERE r.name = 'staff';

INSERT INTO `fund_accounts` (`outlet_id`, `name`, `type`, `balance`, `opening_balance`, `note`, `is_active`, `created_at`, `updated_at`)
SELECT o.id, 'SEABANK', 'Bank', 0, 0, 'Saldo bank SEABANK', 1, NOW(3), NOW(3)
FROM `outlets` o
WHERE NOT EXISTS (
  SELECT 1 FROM `fund_accounts` f WHERE f.`outlet_id` = o.id AND f.`name` = 'SEABANK'
);
