INSERT IGNORE INTO admin_permissions (id, code, label, area, sort_order)
VALUES ('inventory.adjust', 'inventory.adjust', 'Ajustar existencias con auditoría', 'Comercio', 42);

INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
SELECT '000000000000000000000001', 'inventory.adjust'
WHERE EXISTS (SELECT 1 FROM admin_roles WHERE id='000000000000000000000001');
