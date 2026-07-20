-- Scope inventory stock to outlets. Existing rows are assigned to the default outlet.
SET @default_outlet_id := (SELECT id FROM outlets ORDER BY id ASC LIMIT 1);

ALTER TABLE items ADD COLUMN outlet_id INTEGER NULL;
UPDATE items SET outlet_id = @default_outlet_id WHERE outlet_id IS NULL;

ALTER TABLE items DROP INDEX items_kode_barang_key;
ALTER TABLE items ADD INDEX items_outlet_id_idx(outlet_id);
ALTER TABLE items ADD UNIQUE INDEX items_outlet_id_kode_barang_key(outlet_id, kode_barang);
ALTER TABLE items ADD CONSTRAINT items_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL ON UPDATE CASCADE;
