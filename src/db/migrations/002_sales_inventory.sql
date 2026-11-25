CREATE TABLE IF NOT EXISTS order_payments (
  id CHAR(24) NOT NULL PRIMARY KEY,
  order_id CHAR(24) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(80) NOT NULL,
  reference VARCHAR(191) NOT NULL DEFAULT '',
  recorded_by CHAR(24) NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  KEY idx_order_payments_order_date (order_id, recorded_at),
  KEY idx_order_payments_date (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id CHAR(24) NOT NULL PRIMARY KEY,
  batch_id CHAR(24) NOT NULL,
  product_id CHAR(24) NOT NULL,
  variant_index INT NULL,
  variant_signature VARCHAR(191) NOT NULL DEFAULT '',
  product_name VARCHAR(191) NOT NULL,
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  quantity_delta INT NOT NULL,
  action VARCHAR(32) NOT NULL,
  actor_id CHAR(24) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_inventory_movements_product_date (product_id, created_at),
  KEY idx_inventory_movements_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
