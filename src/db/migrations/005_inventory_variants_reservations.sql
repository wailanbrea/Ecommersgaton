CREATE TABLE IF NOT EXISTS inventory_locations (
  id CHAR(24) NOT NULL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO inventory_locations (id, code, name, active, created_at, updated_at)
VALUES ('000000000000000000000101', 'main', 'Ubicación principal', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));

CREATE TABLE IF NOT EXISTS product_variants (
  id CHAR(24) NOT NULL PRIMARY KEY,
  product_id CHAR(24) NOT NULL,
  legacy_key VARCHAR(191) NOT NULL,
  sku VARCHAR(100) NULL,
  sku_normalized VARCHAR(100) NULL,
  label VARCHAR(191) NOT NULL DEFAULT '',
  attributes JSON NOT NULL,
  price_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
  compare_at_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_product_variant_legacy_key (product_id, legacy_key),
  UNIQUE KEY uq_product_variant_sku_normalized (sku_normalized),
  KEY idx_product_variants_product_active (product_id, active),
  CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT chk_product_variant_sku_pair CHECK ((sku IS NULL AND sku_normalized IS NULL) OR (sku IS NOT NULL AND sku_normalized IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_balances (
  variant_id CHAR(24) NOT NULL,
  location_id CHAR(24) NOT NULL,
  on_hand INT UNSIGNED NOT NULL DEFAULT 0,
  reserved INT UNSIGNED NOT NULL DEFAULT 0,
  available INT UNSIGNED AS (CAST(on_hand AS SIGNED) - CAST(reserved AS SIGNED)) PERSISTENT,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (variant_id, location_id),
  KEY idx_inventory_balances_location_available (location_id, available),
  CONSTRAINT fk_inventory_balances_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_balances_location FOREIGN KEY (location_id) REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  CONSTRAINT chk_inventory_balance_invariant CHECK (on_hand >= reserved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id CHAR(24) NOT NULL PRIMARY KEY,
  order_id CHAR(24) NOT NULL,
  idempotency_key CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  released_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_inventory_reservation_idempotency (idempotency_key),
  KEY idx_inventory_reservation_expiry (status, expires_at),
  KEY idx_inventory_reservation_order (order_id),
  CONSTRAINT fk_inventory_reservation_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT chk_inventory_reservation_status CHECK (status IN ('active','consumed','released','expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_reservation_lines (
  id CHAR(24) NOT NULL PRIMARY KEY,
  reservation_id CHAR(24) NOT NULL,
  variant_id CHAR(24) NOT NULL,
  location_id CHAR(24) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_inventory_reservation_lines_reservation (reservation_id),
  KEY idx_inventory_reservation_lines_variant (variant_id, location_id, status),
  CONSTRAINT fk_inventory_reservation_lines_reservation FOREIGN KEY (reservation_id) REFERENCES inventory_reservations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_reservation_lines_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_reservation_lines_location FOREIGN KEY (location_id) REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  CONSTRAINT chk_inventory_reservation_line_quantity CHECK (quantity > 0),
  CONSTRAINT chk_inventory_reservation_line_status CHECK (status IN ('active','consumed','released','expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id CHAR(24) NOT NULL PRIMARY KEY,
  batch_id CHAR(24) NULL,
  reservation_id CHAR(24) NULL,
  variant_id CHAR(24) NOT NULL,
  location_id CHAR(24) NOT NULL,
  action VARCHAR(32) NOT NULL,
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  quantity_delta INT NOT NULL,
  reason VARCHAR(500) NOT NULL DEFAULT '',
  actor_id CHAR(24) NULL,
  idempotency_key VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_inventory_ledger_idempotency (idempotency_key),
  KEY idx_inventory_ledger_variant_date (variant_id, created_at),
  KEY idx_inventory_ledger_batch (batch_id),
  KEY idx_inventory_ledger_reservation (reservation_id),
  CONSTRAINT fk_inventory_ledger_reservation FOREIGN KEY (reservation_id) REFERENCES inventory_reservations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_ledger_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_ledger_location FOREIGN KEY (location_id) REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_ledger_actor FOREIGN KEY (actor_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
