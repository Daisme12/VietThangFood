# HƯỚNG DẪN DỰ ÁN & QUY TẮC PHÁT TRIỂN (PROJECT CONTEXT & RULES)
> Dành cho AI Assistant / Developer trước khi tham gia viết code hoặc chỉnh sửa dự án.

---

## 1. TỔNG QUAN HỆ THỐNG
* **Tên dự án:** Phần mềm quản lý sản xuất, bán hàng & kho xưởng trà sữa.
* **Mục tiêu:** Quản lý quy trình khép kín từ đặt hàng, duyệt khả năng đáp ứng kho/nguyên liệu, kế hoạch sản xuất của bếp, xuất kho giao hàng (hỗ trợ giao bù), kiểm kê tồn kho và đối soát công nợ/doanh thu.
* **Quy mô:** Gồm 23 trang chức năng chia làm 6 phân hệ (Nhóm menu).

---

## 2. KIẾN TRÚC KỸ THUẬT (TECH STACK CONVENTIONS)
* **Frontend:** React (SPA, Tailwind CSS / UI Component Library, Vite).
* **Backend:** NestJS (Node.js framework, TypeScript, kiến trúc Modular / Controller - Service - Repository).
* **Database:** MySQL 8.x (Quản lý qua Prisma ORM hoặc TypeORM).
* **State & Data Management:** 
  * Sử dụng Database Transactions (`BEGIN ... COMMIT / ROLLBACK`) cho toàn bộ các thao tác luân chuyển kho, trừ nguyên liệu và tính toán công nợ để tránh sai lệch dữ liệu khi có concurrency.

---

## 3. CƠ CHẾ NGHIỆP VỤ CỐT LÕI (BẮT BUỘC TUÂN THỦ)

### 3.1. Thuật toán Duyệt đơn hàng (Đơn Xanh - Vàng - Đỏ)
* **Thứ tự ưu tiên duyệt:**
  1. Đơn có thời hạn giao trong ngưỡng cấu hình khẩn cấp (24h hoặc 48h) được duyệt trước.
  2. Các đơn còn lại xét theo thứ tự thời gian tạo sớm hơn (`created_at ASC`).
* **Trạng thái màu:**
  * **Xanh (Đủ hàng):** Tồn kho thành phẩm $\ge$ số lượng đặt. Cấp phát từ tồn kho (`qty_from_stock`).
  * **Vàng (Cần sản xuất):** Tồn kho thành phẩm thiếu, nhưng kiểm tra công thức (BOM) thấy tồn nguyên liệu đủ để sản xuất phần thiếu. Ghi nhận số cần sản xuất vào `qty_to_produce`.
  * **Đỏ (Thiếu nguyên vật liệu):** Không đủ nguyên liệu để sản xuất. Bắt buộc hiển thị rõ thiếu nguyên liệu nào và thiếu số lượng bao nhiêu. Đơn chuyển sang trạng thái **Bị chặn**.
* **Nguyên tắc giữ chỗ kho:** Sau khi mỗi đơn được duyệt (xanh/vàng), hệ thống phải **giữ tồn kho ngay lập tức** trước khi chuyển sang xét đơn tiếp theo để tránh xung đột tồn thực tế.

### 3.2. Luồng Giao hàng, Phiếu xuất kho & Giao bù
* **Hóa đơn / Phiếu xuất:** Cho phép sửa số thực giao trên từng dòng sản phẩm.
* **Khi xác nhận xuất kho:**
  1. Ghi nhận thời điểm giao `delivered_at`.
  2. Trừ tồn kho thành phẩm theo **số lượng thực giao**.
  3. Tính tổng tiền, thuế VAT và ghi nhận công nợ khách hàng theo **số lượng thực giao** (không tính theo số đặt).
* **Giao thiếu & Giao bù:**
  * Nếu `thực_giao < đặt_hàng`, bắt buộc kích hoạt popup: "Giao bù phần thiếu?".
  * **Chọn "Có":** Tự động sinh một đơn hàng mới (loại đơn: Giao bù, gắn kèm mã đơn gốc). Đơn này tự động đẩy vào trang Duyệt đơn hàng.
  * **Chọn "Không":** Yêu cầu nhập lý do đóng phần thiếu và kết thúc đơn.

### 3.3. Luồng Sản xuất của Bếp
* **Công thức tổng sản xuất ngày:**
  $$\text{Cần sản xuất} = \max(0, \text{Tổng số lượng đơn hôm nay} + \text{Định mức an toàn} - \text{Tồn thành phẩm đầu ngày})$$
* **Ghi nhận sản xuất:** Khi bếp bấm xác nhận số lượng thực tế đã làm:
  * **Cộng** tồn kho thành phẩm.
  * **Tự động trừ** tồn kho nguyên vật liệu tương ứng theo tỷ lệ khai báo trong bảng *Định mức nguyên liệu (BOM)*.
  * Cảnh báo ngay lập tức nếu kho nguyên liệu bị âm.

### 3.4. Kiểm kê cuối ngày & Sổ kho
* Hệ thống tính tồn lý thuyết dựa trên biến động: $\text{Tồn đầu} + \text{Nhập} - \text{Sản xuất} - \text{Xuất giao} - \text{Hủy/Hao hụt}$.
* Khi thủ kho nhập "Tồn thực tế":
  * Ghi nhận chênh lệch vào nhật ký/sổ kho.
  * Tồn thực tế sẽ chốt thành **Tồn đầu ngày** của ngày hôm sau.

---

## 4. BẢN ĐỒ PHÂN HỆ & 23 TRANG CHỨC NĂNG

### Nhóm 1: Tổng quan
* `1. Dashboard`: KPI thẻ màu xanh/vàng/đỏ hôm nay, doanh thu ngày/tháng, cảnh báo nguyên liệu dưới mức min_stock, đơn hạn 24h/48h, đơn chờ duyệt. Click thẻ dẫn sang trang chi tiết.

### Nhóm 2: Bán hàng
* `2. Danh sách đơn hàng`: Quản lý đơn, bộ lọc nâng cao. Đơn Đã giao cấm sửa. Hủy đơn bắt buộc có lý do.
* `3. Duyệt đơn hàng`: Chạy thuật toán xét tồn & định mức. Duyệt đơn lẻ hoặc duyệt hàng loạt đơn xanh/vàng.
* `4. Đơn hôm nay (Đi đơn)`: Danh sách đơn giao trong ngày gom theo khách hàng và địa điểm. In phiếu giao hàng (đủ thông tin thuế, công ty, chữ ký).
* `5. Phiếu xuất kho (Giao hàng)`: Chốt số thực giao, trừ tồn thành phẩm, ghi nhận công nợ, xử lý logic giao bù.
* `6. Đơn đã hủy`: Xem lý do hủy, cho phép khôi phục về trạng thái Nháp (nếu có quyền).

### Nhóm 3: Sản xuất
* `7. Tổng sản xuất`: Bảng tính khối lượng cần làm cho bếp và danh sách nguyên liệu cần chuẩn bị. Cho phép in phiếu bếp, xuất Excel.
* `8. Ghi nhận sản xuất`: Nhập số thực làm -> tự động trigger trừ nguyên liệu và cộng thành phẩm.
* `9. Định mức nguyên liệu (BOM)`: Khai báo công thức (1 thành phẩm cần bao nhiêu gram/ml từng nguyên liệu). Tính toán số sản phẩm tối đa làm được theo tồn hiện tại.
* `10. Định mức an toàn`: Cài đặt lượng tồn đệm an toàn cho từng thành phẩm.

### Nhóm 4: Kho
* `11. Danh sách hàng nhập`: Lập phiếu nhập từ nhà cung cấp -> cộng tồn nguyên vật liệu (chuyển các đơn đỏ thành vàng/xanh khi duyệt lại).
* `12. Kiểm kê cuối ngày`: Nhập tồn thực tế, chốt sổ kho ngày.
* `13. Hủy và hao hụt`: Trừ kho thành phẩm/nguyên liệu hỏng, hết hạn, rơi vỡ.
* `14. Báo cáo tồn kho`: 2 tab riêng biệt (Thành phẩm / Nguyên liệu), lọc theo ngày và nhóm hàng, xuất file Excel.

### Nhóm 5: Báo cáo
* `15. Báo cáo doanh thu`: Doanh thu trước VAT, VAT, tổng cộng. Chỉ tính trên phiếu xuất thực tế. Đổi trục báo cáo: Khách hàng, Địa điểm, Sản phẩm, Category.
* `16. Công nợ`: Đối soát tiền phải thu theo khách hàng hoặc địa điểm. Xuất phiếu/file công nợ riêng từng địa điểm.

### Nhóm 6: Danh mục & Cấu hình
* `17. Khách hàng và địa điểm`: Quan hệ $1 - N$ (1 khách hàng có nhiều địa điểm giao hàng).
* `18. Sản phẩm & Danh mục`: Quản lý SKU, quy cách (ví dụ 330ml), VAT mặc định 10%, định mức an toàn.
* `19. Nguyên vật liệu`: Đơn vị tính, ngưỡng cảnh báo tối thiểu (`min_stock`), nhà cung cấp mặc định.
* `20. Nhà cung cấp`: Thông tin liên hệ, lịch sử cung ứng.
* `21. Cấu hình hệ thống`: Ngưỡng giờ ưu tiên (24h/48h), thông tin in hóa đơn (logo, địa chỉ, footer), tiền tố sinh mã tự động (Order Prefix, Invoice Prefix).
* `22. Người dùng & Phân quyền`: 
  * `Admin`: Toàn quyền.
  * `Quản lý`: Bán hàng, duyệt đơn, báo cáo, danh mục.
  * `Bếp / Kho`: Sản xuất, nhập hàng, kiểm kê, hao hụt.
  * `Nhân viên`: Lên đơn, in đơn, tạo phiếu xuất kho.
* `23. Đăng nhập`: JWT Authentication, mã hóa mật khẩu bcrypt, đổi mật khẩu.

---

## 5. THỨ TỰ ƯU TIÊN PHÁT TRIỂN (ROADMAP)
Khi AI sinh code hoặc thực thi tác vụ, bắt buộc bám theo lộ trình chuẩn 3 giai đoạn sau:

* **Phase 1: Nền tảng & Dữ liệu gốc (Foundation)**
  * Xác thực & Phân quyền (`Trang 23, 22`).
  * Quản lý Danh mục: Khách hàng & Địa điểm, Sản phẩm, Nguyên vật liệu, Nhà cung cấp (`Trang 17, 18, 19, 20`).
  * Định mức nguyên liệu (BOM) & Nhập hàng (`Trang 9, 11`).
* **Phase 2: Luồng vận hành chính (Core Engine)**
  * Lên đơn hàng & Duyệt đơn Xanh/Vàng/Đỏ (`Trang 2, 3`).
  * Đơn hôm nay & Phiếu xuất kho / Giao bù (`Trang 4, 5`).
  * Kế hoạch Tổng sản xuất & Ghi nhận sản xuất (`Trang 7, 8, 10`).
  * Kiểm kê kho cuối ngày (`Trang 12`).
* **Phase 3: Báo cáo, Giám sát & Hoàn thiện (Reports & Tuning)**
  * Doanh thu & Công nợ theo địa điểm (`Trang 15, 16`).
  * Báo cáo tồn kho & Hao hụt (`Trang 13, 14`).
  * Dashboard tổng quan & Cấu hình hệ thống (`Trang 1, 21, 6`).

---

## 6. QUY TẮC VIẾT CODE CẦN NHỚ
1. **Soft Delete:** Không xóa vĩnh viễn (`HARD DELETE`) các bản ghi danh mục hay hóa đơn. Dùng cờ `is_active = false` hoặc `deleted_at` (hỗ trợ tính năng "Ẩn" và "Hiện cả mục đã ẩn" trên UI).
2. **Tiền tệ & Số lượng:** 
   * Số lượng nguyên vật liệu hỗ trợ số thập phân (float/decimal, ví dụ: 0.25 kg).
   * Giá tiền và VAT lưu trữ dạng số nguyên lớn hoặc `DECIMAL(15, 2)`, không làm tròn thô bạo gây lệch công nợ.
3. **Mã tự động:** Mã đơn hàng và mã phiếu xuất kho phải sinh theo tiền tố cấu hình kèm ngày tháng và số thứ tự tăng dần (ví dụ: `DH-20261109-001`).