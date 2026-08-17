-- Add "Jasa_Transfer" and "Fee_Brilink" to bank_transfers.kind. These are
-- one-sided commission/fee income entries (no source fund debited), unlike
-- Transfer/Tarik_Tunai which move money between two fund accounts.
ALTER TABLE `bank_transfers`
  MODIFY COLUMN `kind` ENUM('Transfer', 'Tarik_Tunai', 'Jasa_Transfer', 'Fee_Brilink') NOT NULL DEFAULT 'Transfer';
