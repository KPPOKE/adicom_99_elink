UPDATE `services` s
SET
  s.`payment_status` = 'paid',
  s.`paid_at` = COALESCE(
    (
      SELECT MIN(fr.`created_at`)
      FROM `finance_records` fr
      WHERE fr.`service_id` = s.`id`
        AND fr.`type` = 'income'
    ),
    s.`updated_at`
  )
WHERE EXISTS (
  SELECT 1
  FROM `finance_records` fr
  WHERE fr.`service_id` = s.`id`
    AND fr.`type` = 'income'
);
