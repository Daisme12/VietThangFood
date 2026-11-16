-- ============================================================================
-- VIETTHANGFOOD ERP - MYSQL 8.0 INITIALIZATION & SAMPLE SEED DATA
-- Tự động chạy khi khởi tạo container Docker MySQL lần đầu
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `vietthangfood`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `vietthangfood`;

-- ----------------------------------------------------------------------------
-- 1. BẢNG USERS (Trang 22, 23)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'manager', 'staff', 'kitchen') NOT NULL DEFAULT 'staff',
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_username_key` (`username`),
  INDEX `idx_users_role_hidden` (`role`, `is_hidden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. BẢNG SUPPLIERS (Trang 20)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `address` VARCHAR(255) NULL,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `suppliers_code_key` (`code`),
  INDEX `idx_suppliers_hidden` (`is_hidden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. BẢNG MATERIALS (Trang 19)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `materials` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `supplier_id` INT NULL,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `min_stock` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `materials_code_key` (`code`),
  INDEX `idx_materials_supplier_id` (`supplier_id`),
  INDEX `idx_materials_hidden` (`is_hidden`),
  CONSTRAINT `materials_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. BẢNG PURCHASE_ITEMS (Trang 11)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `receipt_code` VARCHAR(30) NOT NULL,
  `receipt_date` DATE NOT NULL,
  `supplier_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `qty` DECIMAL(15, 3) NOT NULL,
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `line_total` DECIMAL(15, 2) NOT NULL,
  `note` VARCHAR(255) NULL,
  `created_by` INT NOT NULL,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  INDEX `idx_purchase_items_receipt_date` (`receipt_date`),
  INDEX `idx_purchase_items_receipt_code` (`receipt_code`),
  INDEX `idx_purchase_items_supplier_id` (`supplier_id`),
  INDEX `idx_purchase_items_material_id` (`material_id`),
  INDEX `idx_purchase_items_created_by` (`created_by`),
  CONSTRAINT `purchase_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. BẢNG CATEGORIES (Trang 18)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  INDEX `idx_categories_sort_hidden` (`sort_order`, `is_hidden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. BẢNG PRODUCTS (Trang 18 & Trang 10)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `package_spec` VARCHAR(50) NULL,
  `unit` VARCHAR(30) NOT NULL,
  `price` DECIMAL(15, 2) NOT NULL,
  `vat_rate` DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  `safety_stock` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `products_code_key` (`code`),
  INDEX `idx_products_category_id` (`category_id`),
  INDEX `idx_products_hidden` (`is_hidden`),
  CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. BẢNG RECIPE_ITEMS - BOM (Trang 9)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `recipe_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `qty` DECIMAL(15, 4) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_recipe_items_product_material` (`product_id`, `material_id`),
  INDEX `idx_recipe_items_product_id` (`product_id`),
  INDEX `idx_recipe_items_material_id` (`material_id`),
  CONSTRAINT `recipe_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `recipe_items_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. BẢNG CUSTOMERS (Trang 17)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `tax_code` VARCHAR(30) NULL,
  `phone` VARCHAR(30) NULL,
  `note` TEXT NULL,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `customers_code_key` (`code`),
  INDEX `idx_customers_hidden` (`is_hidden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. BẢNG CUSTOMER_LOCATIONS (Trang 17: Quan hệ 1 - N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_locations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `receiver_name` VARCHAR(100) NULL,
  `receiver_phone` VARCHAR(30) NULL,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  INDEX `idx_customer_locations_customer_hidden` (`customer_id`, `is_hidden`),
  CONSTRAINT `customer_locations_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. BẢNG ORDERS (Trang 2, 3, 4, 5, 6)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `order_type` ENUM('standard', 'compensation') NOT NULL DEFAULT 'standard',
  `parent_order_id` BIGINT NULL,
  `customer_id` INT NOT NULL,
  `location_id` INT NOT NULL,
  `order_date` DATE NOT NULL,
  `delivery_at` DATETIME(0) NOT NULL,
  `status` ENUM('draft', 'pending', 'approved', 'blocked', 'in_production', 'ready', 'delivered', 'cancelled') NOT NULL DEFAULT 'draft',
  `check_level` ENUM('green', 'yellow', 'red') NULL,
  `note` TEXT NULL,
  `cancel_reason` VARCHAR(500) NULL,
  `cancelled_at` DATETIME(0) NULL,
  `delivery_code` VARCHAR(30) NULL,
  `delivered_at` DATETIME(0) NULL,
  `total_before_vat` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_vat` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_by` INT NOT NULL,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `orders_code_key` (`code`),
  INDEX `idx_orders_order_date` (`order_date`),
  INDEX `idx_orders_delivery_at` (`delivery_at`),
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_customer_id` (`customer_id`),
  INDEX `idx_orders_location_id` (`location_id`),
  INDEX `idx_orders_parent_order_id` (`parent_order_id`),
  INDEX `idx_orders_status_check_delivery` (`status`, `check_level`, `delivery_at`),
  CONSTRAINT `orders_parent_order_id_fkey` FOREIGN KEY (`parent_order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orders_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `customer_locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orders_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. BẢNG ORDER_ITEMS (Trang 2, 3, 5)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT NOT NULL,
  `product_id` INT NOT NULL,
  `qty_ordered` DECIMAL(15, 3) NOT NULL,
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `vat_rate` DECIMAL(5, 2) NOT NULL,
  `qty_from_stock` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
  `qty_to_produce` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
  `qty_delivered` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
  `qty_short` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
  `short_action` ENUM('compensate', 'close') NULL,
  `short_close_reason` VARCHAR(500) NULL,
  `make_up_order_id` BIGINT NULL,
  `note` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_order_items_order_id` (`order_id`),
  INDEX `idx_order_items_product_id` (`product_id`),
  INDEX `idx_order_items_make_up_order_id` (`make_up_order_id`),
  CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `order_items_make_up_order_id_fkey` FOREIGN KEY (`make_up_order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. BẢNG STOCK_MOVEMENTS (Trang 11, 12, 13, 14)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `movement_date` DATE NOT NULL,
  `movement_type` ENUM('import', 'production_in', 'production_out', 'export_delivery', 'waste_loss', 'adjustment') NOT NULL,
  `product_id` INT NULL,
  `material_id` INT NULL,
  `qty` DECIMAL(15, 3) NOT NULL,
  `ref_table` VARCHAR(50) NULL,
  `ref_id` BIGINT NULL,
  `note` VARCHAR(255) NULL,
  `created_by` INT NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  INDEX `idx_stock_movements_date` (`movement_date`),
  INDEX `idx_stock_movements_type` (`movement_type`),
  INDEX `idx_stock_movements_product_type` (`product_id`, `movement_type`),
  INDEX `idx_stock_movements_material_type` (`material_id`, `movement_type`),
  INDEX `idx_stock_movements_ref` (`ref_table`, `ref_id`),
  CONSTRAINT `stock_movements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. BẢNG SETTINGS (Trang 21)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `settings_setting_key_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DỮ LIỆU MẪU KHỞI TẠO (SEED DATA) CHO XƯỞNG TRÀ SỮA VIỆT THẮNG
-- ============================================================================

INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `full_name`, `role`, `is_hidden`) VALUES
  (1, 'admin', '123456', 'Nguyễn Văn Thắng (Admin Tổng)', 'admin', FALSE),
  (2, 'quanly', '123456', 'Trần Thị Mai (Quản Lý Điều Phối)', 'manager', FALSE),
  (3, 'bepkho', '123456', 'Lê Hoàng Nam (Tổ Trưởng Bếp & Kho)', 'kitchen', FALSE),
  (4, 'nhanvien', '123456', 'Phạm Thu Hà (Nhân Viên Đi Đơn)', 'staff', FALSE);

INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
  ('urgent_hours_threshold', '24', 'Ngưỡng giờ ưu tiên duyệt đơn khẩn cấp (24h hoặc 48h)'),
  ('order_prefix', 'DH', 'Tiền tố sinh mã đơn hàng tự động'),
  ('invoice_prefix', 'PXK', 'Tiền tố sinh mã phiếu xuất kho tự động'),
  ('company_name', 'CÔNG TY TNHH SẢN XUẤT & THỰC PHẨM VIỆT THẮNG', 'Tên doanh nghiệp in trên hóa đơn'),
  ('company_tax_code', '0316889900', 'Mã số thuế công ty'),
  ('company_address', 'KCN Tân Bình, Quận Tân Phú, TP. Hồ Chí Minh', 'Địa chỉ xưởng trung tâm'),
  ('company_phone', '1900 6868', 'Hotline điều phối kho'),
  ('invoice_logo_url', '/assets/logo-vietthang.png', 'Logo in phiếu giao hàng'),
  ('invoice_footer', 'Quý khách vui lòng kiểm đếm kỹ số lượng thực giao và bảo quản lạnh 2-6°C.', 'Chân trang phiếu xuất kho');

INSERT IGNORE INTO `suppliers` (`id`, `code`, `name`, `phone`, `address`, `is_hidden`) VALUES
  (1, 'NCC-001', 'Công ty Nông Sản Tinh Bột Thái Việt', '0903112233', 'KCN Sóng Thần 2, Dĩ An, Bình Dương', FALSE),
  (2, 'NCC-002', 'Nông Trường Trà Cao Nguyên Bảo Lộc', '0918223344', 'Lộc Tiến, TP. Bảo Lộc, Lâm Đồng', FALSE),
  (3, 'NCC-003', 'Công ty Nhập Khẩu Nguyên Liệu Pha Chế Á Châu', '0989776655', 'Quận 7, TP. Hồ Chí Minh', FALSE);

INSERT IGNORE INTO `materials` (`id`, `supplier_id`, `code`, `name`, `unit`, `min_stock`, `is_hidden`) VALUES
  (1, 1, 'NL-BOT-NANG', 'Tinh Bột Năng Thái Lan Cao Cấp', 'kg', 100.000, FALSE),
  (2, 3, 'NL-DUONG-DEN', 'Đường Đen Hàn Quốc Nguyên Chất', 'kg', 50.000, FALSE),
  (3, 2, 'NL-TRA-OOLONG', 'Lá Trà Oolong Bảo Lộc Thượng Hạng', 'kg', 30.000, FALSE),
  (4, 3, 'NL-BOT-SUA', 'Bột Kem Béo Thực Vật Indo', 'kg', 40.000, FALSE);

INSERT IGNORE INTO `categories` (`id`, `name`, `sort_order`, `is_hidden`) VALUES
  (1, 'Topping & Trân Châu Đóng Túi', 1, FALSE),
  (2, 'Sốt & Syrup Pha Chế', 2, FALSE),
  (3, 'Cốt Trà Sữa Ủ Sẵn', 3, FALSE);

INSERT IGNORE INTO `products` (`id`, `category_id`, `code`, `name`, `package_spec`, `unit`, `price`, `vat_rate`, `safety_stock`, `is_hidden`) VALUES
  (10, 1, 'TP-TC-HOANGKIM-1KG', 'Trân Châu Hoàng Kim (Túi 1kg)', 'Túi 1kg hút chân không', 'tui', 68000.00, 10.00, 30.000, FALSE),
  (11, 2, 'TP-SYRUP-DUONGDEN-2L', 'Sốt Đường Đen Hàn Quốc (Can 2L)', 'Can nhựa HDPE 2 Lít', 'can', 135000.00, 10.00, 20.000, FALSE),
  (12, 3, 'TP-COT-TRASUA-OOLONG-5L', 'Cốt Trà Sữa Oolong Rang Đậm (Can 5L)', 'Can 5 Lít bảo quản lạnh', 'can', 245000.00, 10.00, 15.000, FALSE);

INSERT IGNORE INTO `recipe_items` (`id`, `product_id`, `material_id`, `qty`) VALUES
  (1, 10, 1, 0.6500), -- 1 túi Trân Châu cần 0.65kg Bột năng
  (2, 10, 2, 0.2500), -- 1 túi Trân Châu cần 0.25kg Đường đen
  (3, 11, 2, 1.2000), -- 1 can Sốt Đường Đen cần 1.20kg Đường đen
  (4, 12, 3, 0.3500), -- 1 can Cốt Trà Sữa cần 0.35kg Trà Oolong
  (5, 12, 4, 0.5000); -- 1 can Cốt Trà Sữa cần 0.50kg Bột sữa

INSERT IGNORE INTO `customers` (`id`, `code`, `name`, `tax_code`, `phone`, `note`, `is_hidden`) VALUES
  (1, 'KH-GONGCHA', 'Chuỗi Trà Sữa GongCha Vietnam', '0312998877', '02838228899', 'Khách hàng chuỗi VIP giao hàng mỗi sáng', FALSE),
  (2, 'KH-KOITHE', 'Hệ Thống Koi Thé Vietnam', '0314556677', '02839112233', 'Yêu cầu kiểm tra nhiệt độ xe lạnh khi giao', FALSE),
  (3, 'KH-PHUCLONG', 'Đối Tác Nhượng Quyền Phúc Long', '0318889900', '02837776688', 'Đối soát công nợ vào ngày 25 hàng tháng', FALSE);

INSERT IGNORE INTO `customer_locations` (`id`, `customer_id`, `name`, `address`, `receiver_name`, `receiver_phone`, `is_hidden`) VALUES
  (101, 1, 'GongCha Nguyễn Huệ Q1', '68 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM', 'Anh Minh (Cửa hàng trưởng)', '0909111222', FALSE),
  (102, 1, 'GongCha Phan Xích Long', '180 Phan Xích Long, Quận Phú Nhuận, TP.HCM', 'Chị Lan (Ca trưởng sáng)', '0909333444', FALSE),
  (201, 2, 'Koi Thé Thảo Điền Q2', '12 Xuân Thủy, Thảo Điền, TP. Thủ Đức', 'Anh Tuấn (Quản lý quầy)', '0918555666', FALSE),
  (301, 3, 'Phúc Long Phú Mỹ Hưng Q7', '105 Nguyễn Đức Cảnh, Quận 7, TP.HCM', 'Chị Hương (Thủ kho quầy)', '0988777999', FALSE);

-- Phiếu nhập kho nguyên vật liệu mẫu (Trang 11)
INSERT IGNORE INTO `purchase_items` (`id`, `receipt_code`, `receipt_date`, `supplier_id`, `material_id`, `qty`, `unit_price`, `line_total`, `note`, `created_by`, `is_hidden`) VALUES
  (1, 'PN-20261108-001', '2026-11-08', 1, 1, 200.000, 22000.00, 4400000.00, 'Nhập bột năng lô đầu tháng 11', 3, FALSE),
  (2, 'PN-20261108-001', '2026-11-08', 3, 2, 45.000, 48000.00, 2160000.00, 'Nhập đường đen Hàn Quốc', 3, FALSE),
  (3, 'PN-20261109-001', '2026-11-09', 2, 3, 60.000, 185000.00, 11100000.00, 'Nhập trà Oolong Bảo Lộc', 3, FALSE),
  (4, 'PN-20261109-001', '2026-11-09', 3, 4, 80.000, 65000.00, 5200000.00, 'Nhập bột kem béo Indo', 3, FALSE);

-- Biến động kho ban đầu (stock_movements) cho Nguyên liệu & Thành phẩm
INSERT IGNORE INTO `stock_movements` (`id`, `movement_date`, `movement_type`, `product_id`, `material_id`, `qty`, `ref_table`, `ref_id`, `note`, `created_by`) VALUES
  (1, '2026-11-08', 'import', NULL, 1, 200.000, 'purchase_items', 1, 'Nhập kho PN-20261108-001', 3),
  (2, '2026-11-08', 'import', NULL, 2, 45.000, 'purchase_items', 2, 'Nhập kho PN-20261108-001 (Đường đen < min_stock 50kg để test cảnh báo)', 3),
  (3, '2026-11-09', 'import', NULL, 3, 60.000, 'purchase_items', 3, 'Nhập kho PN-20261109-001', 3),
  (4, '2026-11-09', 'import', NULL, 4, 80.000, 'purchase_items', 4, 'Nhập kho PN-20261109-001', 3),
  (5, '2026-11-09', 'production_in', 10, NULL, 120.000, 'production_batches', 1, 'Tồn thành phẩm Trân Châu Hoàng Kim đầu kỳ', 3),
  (6, '2026-11-09', 'production_in', 11, NULL, 40.000, 'production_batches', 2, 'Tồn thành phẩm Sốt Đường Đen đầu kỳ', 3),
  (7, '2026-11-09', 'production_in', 12, NULL, 30.000, 'production_batches', 3, 'Tồn thành phẩm Cốt Trà Sữa Oolong đầu kỳ', 3),
  (8, '2026-11-09', 'export_delivery', 10, NULL, 50.000, 'orders', 500, 'Xuất giao đơn hàng mẫu đã hoàn tất DH-20261109-001', 4);

-- Đơn hàng mẫu (Đủ trạng thái: delivered, pending Xanh, pending Vàng, blocked Đỏ, cancelled)
INSERT IGNORE INTO `orders` (`id`, `code`, `order_type`, `parent_order_id`, `customer_id`, `location_id`, `order_date`, `delivery_at`, `status`, `check_level`, `note`, `cancel_reason`, `cancelled_at`, `delivery_code`, `delivered_at`, `total_before_vat`, `total_vat`, `total_amount`, `created_by`, `is_hidden`) VALUES
  (500, 'DH-20261109-001', 'standard', NULL, 1, 101, '2026-11-09', '2026-11-09 14:00:00', 'delivered', 'green', 'Đơn đã giao thành công hôm qua', NULL, NULL, 'PXK-20261109-001', '2026-11-09 13:45:00', 3400000.00, 340000.00, 3740000.00, 4, FALSE),
  (501, 'DH-20261110-001', 'standard', NULL, 1, 101, '2026-11-10', '2026-11-10 16:00:00', 'pending', 'green', 'Đơn khẩn cấp giao chiều nay (Đủ tồn thành phẩm -> XANH)', NULL, NULL, NULL, NULL, 2720000.00, 272000.00, 2992000.00, 4, FALSE),
  (502, 'DH-20261110-002', 'standard', NULL, 2, 201, '2026-11-10', '2026-11-10 18:00:00', 'pending', 'yellow', 'Đơn thiếu thành phẩm nhưng đủ BOM -> VÀNG', NULL, NULL, NULL, NULL, 12250000.00, 1225000.00, 13475000.00, 4, FALSE),
  (503, 'DH-20261110-003', 'standard', NULL, 3, 301, '2026-11-10', '2026-11-11 09:00:00', 'blocked', 'red', 'Đơn đặt vượt tồn Đường Đen Hàn Quốc -> ĐỎ (Bị chặn)', NULL, NULL, NULL, NULL, 10800000.00, 1080000.00, 11880000.00, 4, FALSE),
  (504, 'DH-20261108-002', 'standard', NULL, 1, 102, '2026-11-08', '2026-11-08 17:00:00', 'cancelled', 'green', 'Đơn mẫu đã hủy để test Trang 6', 'Cửa hàng Phan Xích Long bảo trì hệ thống điện lạnh 2 ngày', '2026-11-08 11:00:00', NULL, NULL, 1360000.00, 136000.00, 1496000.00, 2, FALSE);

INSERT IGNORE INTO `order_items` (`id`, `order_id`, `product_id`, `qty_ordered`, `unit_price`, `vat_rate`, `qty_from_stock`, `qty_to_produce`, `qty_delivered`, `qty_short`, `short_action`, `short_close_reason`, `make_up_order_id`, `note`) VALUES
  (1001, 500, 10, 50.000, 68000.00, 10.00, 50.000, 0.000, 50.000, 0.000, NULL, NULL, NULL, 'Đã giao đủ 50 túi'),
  (1002, 501, 10, 40.000, 68000.00, 10.00, 0.000, 0.000, 0.000, 0.000, NULL, NULL, NULL, 'Chờ duyệt Xanh'),
  (1003, 502, 12, 50.000, 245000.00, 10.00, 0.000, 0.000, 0.000, 0.000, NULL, NULL, NULL, 'Tồn Cốt Trà Sữa còn 30 can, cần SX thêm 20 can'),
  (1004, 503, 11, 80.000, 135000.00, 10.00, 0.000, 40.000, 0.000, 0.000, NULL, NULL, NULL, 'Cần SX 40 can Sốt Đường Đen (tốn 48kg đường đen > 45kg tồn)'),
  (1005, 504, 10, 20.000, 68000.00, 10.00, 0.000, 0.000, 0.000, 0.000, NULL, NULL, NULL, 'Đơn đã hủy');

SET FOREIGN_KEY_CHECKS = 1;

