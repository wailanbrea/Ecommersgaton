ALTER TABLE orders
  ADD COLUMN checkout_key CHAR(64) NULL AFTER id,
  ADD UNIQUE KEY uq_orders_checkout_key (checkout_key);
