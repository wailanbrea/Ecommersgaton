CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(24) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  parent_id VARCHAR(24) NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  collection_featured TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  KEY idx_categories_active_order (active, sort_order, name),
  KEY idx_categories_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id CHAR(24) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  description LONGTEXT NOT NULL,
  category_id VARCHAR(24) NOT NULL DEFAULT '',
  gender VARCHAR(80) NOT NULL DEFAULT '',
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  main_image_url TEXT NOT NULL,
  video_url TEXT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  out_of_stock TINYINT(1) NOT NULL DEFAULT 0,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  KEY idx_products_catalog (active, created_at),
  KEY idx_products_category (category_id, active),
  KEY idx_products_gender (gender, active),
  KEY idx_products_featured (featured, active, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(24) NOT NULL PRIMARY KEY,
  customer_name VARCHAR(191) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  email VARCHAR(191) NOT NULL,
  notes TEXT NOT NULL,
  shipping_method VARCHAR(191) NOT NULL,
  shipping_description TEXT NOT NULL,
  shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(80) NOT NULL DEFAULT 'cash_on_delivery',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  KEY idx_orders_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id CHAR(24) NOT NULL PRIMARY KEY,
  product_id VARCHAR(24) NOT NULL DEFAULT '',
  customer_name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  province VARCHAR(100) NOT NULL DEFAULT '',
  rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
  comment TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  KEY idx_reviews_product_public (product_id, approved, visible, created_at),
  KEY idx_reviews_public (approved, visible, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id CHAR(24) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  KEY idx_admin_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  id CHAR(24) NOT NULL PRIMARY KEY,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_sessions (
  sid VARCHAR(128) NOT NULL PRIMARY KEY,
  expires BIGINT UNSIGNED NOT NULL,
  data LONGTEXT NOT NULL,
  KEY idx_app_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;