ALTER TABLE `users`
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `session_version` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `customer_outlets` (
  `customer_id` INTEGER NOT NULL,
  `outlet_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`customer_id`, `outlet_id`),
  INDEX `customer_outlets_outlet_id_customer_id_idx` (`outlet_id`, `customer_id`),
  CONSTRAINT `customer_outlets_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_outlets_outlet_id_fkey` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `customer_outlets` (`customer_id`, `outlet_id`)
SELECT `customer_id`, `outlet_id` FROM `transactions` WHERE `customer_id` IS NOT NULL AND `outlet_id` IS NOT NULL
UNION SELECT `customer_id`, `outlet_id` FROM `services` WHERE `customer_id` IS NOT NULL AND `outlet_id` IS NOT NULL
UNION SELECT `customer_id`, `outlet_id` FROM `bank_transfers` WHERE `customer_id` IS NOT NULL AND `outlet_id` IS NOT NULL
UNION SELECT `customer_id`, `outlet_id` FROM `receivables` WHERE `customer_id` IS NOT NULL AND `outlet_id` IS NOT NULL;

INSERT IGNORE INTO `customer_outlets` (`customer_id`, `outlet_id`)
SELECT c.`id`, o.`id`
FROM `customers` c
JOIN (SELECT MIN(`id`) AS `id` FROM `outlets`) o
WHERE NOT EXISTS (SELECT 1 FROM `customer_outlets` co WHERE co.`customer_id` = c.`id`);

INSERT IGNORE INTO `user_permissions` (`user_id`, `key`)
SELECT u.`id`, p.`key`
FROM `users` u
JOIN `roles` r ON r.`id` = u.`role_id`
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
WHERE r.`name` = 'staff'
  AND NOT EXISTS (SELECT 1 FROM `user_permissions` up WHERE up.`user_id` = u.`id`);

ALTER TABLE `transaction_items`
  ADD COLUMN `cost_price` DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE `service_parts`
  ADD COLUMN `cost_price` DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE `transactions`
  ADD COLUMN `gross_profit` DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD INDEX `transactions_outlet_id_status_created_at_idx` (`outlet_id`, `status`, `created_at`);

ALTER TABLE `services`
  ADD COLUMN `gross_profit` DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD INDEX `services_outlet_id_payment_status_paid_at_idx` (`outlet_id`, `payment_status`, `paid_at`),
  ADD INDEX `services_outlet_id_status_received_date_idx` (`outlet_id`, `status`, `received_date`);

ALTER TABLE `bank_transfers`
  ADD INDEX `bank_transfers_outlet_id_status_completed_at_idx` (`outlet_id`, `status`, `completed_at`);

ALTER TABLE `finance_records`
  ADD INDEX `finance_records_outlet_id_type_date_idx` (`outlet_id`, `type`, `date`);

ALTER TABLE `audit_logs`
  ADD INDEX `audit_logs_action_user_email_created_at_idx` (`action`, `user_email`, `created_at`);

UPDATE `transaction_items` ti
JOIN `items` i ON i.`id` = ti.`item_id`
SET ti.`cost_price` = i.`harga_modal`;

UPDATE `service_parts` sp
JOIN `items` i ON i.`id` = sp.`item_id`
SET sp.`cost_price` = i.`harga_modal`;

UPDATE `transactions` t
LEFT JOIN (
  SELECT ti.`transaction_id`, SUM(ti.`qty` * (ti.`price` - ti.`cost_price`)) AS `profit`
  FROM `transaction_items` ti
  GROUP BY ti.`transaction_id`
) p ON p.`transaction_id` = t.`id`
SET t.`gross_profit` = COALESCE(p.`profit`, 0) - t.`diskon`;

UPDATE `services` s
LEFT JOIN (
  SELECT sp.`service_id`, SUM(sp.`qty` * (sp.`price` - sp.`cost_price`)) AS `profit`
  FROM `service_parts` sp
  GROUP BY sp.`service_id`
) p ON p.`service_id` = s.`id`
SET s.`gross_profit` = s.`labor_cost` + COALESCE(p.`profit`, 0);
