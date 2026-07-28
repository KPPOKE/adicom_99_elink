ALTER TABLE `audit_logs`
    ADD COLUMN `outlet_id` INTEGER NULL;

CREATE INDEX `audit_logs_outlet_id_created_at_idx`
    ON `audit_logs`(`outlet_id`, `created_at`);
