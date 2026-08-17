-- Client wants full parity with a competitor app (E-Link MiniATM)'s "Jenis
-- Transaksi" list. Adds:
--   Mode_Pulsa / Pembayaran_Digital: two-account "modal vs jual" flow
--     (source loses cost_amount, target gains amount, profit = amount - cost_amount)
--   Operasional: single-account withdrawal-with-fee (mirrors the existing
--     "Ambil Saldo" fund-mutation formula), kept in the same bank_transfers
--     table so it shows in the unified MiniATM history like E-Link does.
ALTER TABLE `bank_transfers`
  MODIFY COLUMN `kind` ENUM('Transfer', 'Tarik_Tunai', 'Jasa_Transfer', 'Fee_Brilink', 'Mode_Pulsa', 'Pembayaran_Digital', 'Operasional') NOT NULL DEFAULT 'Transfer';

ALTER TABLE `bank_transfers`
  ADD COLUMN `cost_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0 AFTER `amount`;
