CREATE TABLE IF NOT EXISTS admin_roles (
  id CHAR(24) NOT NULL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_permissions (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(160) NOT NULL,
  area VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id CHAR(24) NOT NULL,
  role_id CHAR(24) NOT NULL,
  assigned_by CHAR(24) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, role_id),
  KEY idx_admin_user_roles_role (role_id),
  CONSTRAINT fk_admin_user_roles_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_user_roles_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_admin_user_roles_actor FOREIGN KEY (assigned_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id CHAR(24) NOT NULL,
  permission_id VARCHAR(80) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_admin_role_permissions_permission (permission_id),
  CONSTRAINT fk_admin_role_permissions_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id CHAR(24) NOT NULL PRIMARY KEY,
  actor_id CHAR(24) NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(60) NOT NULL,
  target_id VARCHAR(100) NOT NULL DEFAULT '',
  details JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_admin_audit_actor_date (actor_id, created_at),
  KEY idx_admin_audit_target_date (target_type, target_id, created_at),
  CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO admin_roles (id, slug, name, description, is_system, created_at, updated_at)
VALUES ('000000000000000000000001', 'superadmin', 'Superadministrador', 'Acceso completo al panel y gestión de usuarios, roles y permisos.', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));

INSERT IGNORE INTO admin_permissions (id, code, label, area, sort_order) VALUES
('dashboard.view','dashboard.view','Ver dashboard','Principal',10),
('sales.view','sales.view','Ver ventas y analítica','Comercio',20),
('sales.payments.record','sales.payments.record','Registrar pagos','Comercio',21),
('sales.export','sales.export','Exportar reportes de ventas','Comercio',22),
('products.view','products.view','Ver productos','Catálogo',30),
('products.create','products.create','Crear productos','Catálogo',31),
('products.edit','products.edit','Editar productos','Catálogo',32),
('products.delete','products.delete','Desactivar o eliminar productos','Catálogo',33),
('products.personalization','products.personalization','Configurar personalización','Catálogo',34),
('inventory.view','inventory.view','Ver inventario','Comercio',40),
('inventory.import','inventory.import','Importar existencias','Comercio',41),
('inventory.export','inventory.export','Exportar inventario','Comercio',42),
('categories.view','categories.view','Ver categorías','Catálogo',50),
('categories.create','categories.create','Crear categorías','Catálogo',51),
('categories.edit','categories.edit','Editar categorías','Catálogo',52),
('categories.delete','categories.delete','Eliminar categorías','Catálogo',53),
('orders.view','orders.view','Ver pedidos','Comercio',60),
('orders.edit','orders.edit','Actualizar pedidos','Comercio',61),
('reviews.view','reviews.view','Ver reseñas','Clientes',70),
('reviews.moderate','reviews.moderate','Moderar reseñas','Clientes',71),
('reviews.delete','reviews.delete','Eliminar reseñas','Clientes',72),
('settings.view','settings.view','Ver configuración','Administración',80),
('settings.edit','settings.edit','Editar configuración','Administración',81),
('users.manage','users.manage','Administrar usuarios','Administración',90),
('roles.manage','roles.manage','Administrar roles y permisos','Administración',91),
('account.password.change','account.password.change','Cambiar contraseña propia','Cuenta',100),
('admin.access','admin.access','Acceder a otras secciones del panel','Administración',110);

INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
SELECT '000000000000000000000001', id FROM admin_permissions;

INSERT IGNORE INTO admin_user_roles (user_id, role_id, assigned_by, created_at)
SELECT id, '000000000000000000000001', NULL, UTC_TIMESTAMP(3) FROM admin_users;
