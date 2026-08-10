# 📊 Báo Cáo Phân Tích Dataset Alobo Venues & Ma Trận Ánh Xạ Database SportHubAI

**Tệp dữ liệu:** `alobo_venues_134_san_2026-08-09.json`  
**Dung lượng:** ~132 KB  
**Ngày cập nhật:** 2026-08-10  
**Đối tượng phân tích:** Cấu trúc JSON Crawled vs CSDL MySQL / Sequelize (Phase 03 - 14) của dự án SportHubAI.

---

## 1. TỔNG QUAN DATASET (DATASET OVERVIEW)

Bảng dữ liệu chứa thông tin 134 cơ sở thể thao được cào từ nền tảng Alobo. Nội dung cung cấp đầy đủ thông tin tên sân, địa chỉ, tọa độ GPS, hình ảnh avatar/cover, khung giờ mở cửa và khoảng giá niêm yết.

### 📈 Thống Kê Chi Tiết

| Chỉ Số (Metric) | Giá Trị (Value) | Ghi Chú (Notes) |
| :--- | :--- | :--- |
| **Tổng số Địa điểm (Venues)** | **134** | 134 thương hiệu/chi nhánh sân |
| **Tổng số Sân con ước tính (Courts)** | **536** | Trung bình `court.total = 4` sân/venue |
| **Số bản ghi thiếu Số Điện Thoại** | **106** (79.1%) | Trường `phone = null` |
| **Tọa độ Địa lý (GPS)** | **134/134** (100%) | Đầy đủ Latitude & Longitude |
| **Bộ sưu tập Hình ảnh (Images)** | **134/134** (100%) | Đều có từ 1-2 hình ảnh (avatar, cover) |

### 🏸 Phân Loại Bộ Môn Thể Thao (Sport Categories Breakdown)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ SPORT CATEGORIES DISTRIBUTION                                          │
├───────────────────────────────┬─────────────────┬──────────────────────┤
│ Môn Thể Thao (Sport)          │ Số Lượng Sân    │ Tỷ Lệ (%)            │
├───────────────────────────────┼─────────────────┼──────────────────────┤
│ Pickleball                    │ 65              │ 48.5%                │
│ Thể thao (Tổng hợp / Đa năng) │ 40              │ 29.9%                │
│ Cầu lông (Badminton)          │ 25              │ 18.7%                │
│ Quần vợt (Tennis)             │ 4               │ 3.0%                 │
│ Bóng đá (Football)            │ 1               │ 0.7%                 │
└───────────────────────────────┴─────────────────┴──────────────────────┘
```

---

## 2. CHÊNH LỆCH CẤU TRÚC: JSON CRAWLED VS SPORTHUBAI DB SCHEMA

Cấu trúc JSON đầu vào là dạng phẳng (Flat JSON Object). Trong khi đó, **SportHubAI** áp dụng mô hình CSDL chuẩn hóa (3NF) phân cấp Multi-Branch: `User (Owner)` ➔ `Venue` ➔ `Branch` ➔ `Court`.

### Cấu trúc 1 phần tử JSON mẫu:

```json
{
  "id": "sport_ballburn_pickleball_club_bistro",
  "venue": "BallBurn Pickle Club & Bistro",
  "branch": "Cơ sở chính",
  "court": { "total": 4, "summary": "4 sân (Thể thao)" },
  "sport_type": ["Pickleball"],
  "address": "614 Lạc Long Quân, Quận Tây Hồ, Hà Nội",
  "phone": null,
  "location": { "city": "Hà Nội", "latitude": 21.076795, "longitude": 105.814995 },
  "images": [
    "https://m-files.alobo.vn/branch/.../avatar-thumb.jpg",
    "https://m-files.alobo.vn/branch/.../cover-thumb.jpg"
  ],
  "opening_hours": "5:00 – 23:00",
  "price": { "range": "80,000đ – 180,000đ/giờ", "note": "Theo khung giờ" },
  "booking_url": "https://datlich.alobo.vn/san/sport_ballburn_pickleball_club_bistro"
}
```

---

## 3. MA TRẬN ÁNH XẠ DỮ LIỆU (DATA MAPPING MATRIX)

Dưới đây là quy tắc mapping chi tiết từ JSON sang các bảng vật lý trong MySQL / Sequelize của SportHubAI:

### 3.1 Bảng `venues` (Thương Hiệu / Cơ Sở)

| Trường JSON Crawled | Thuộc Tính CSDL SportHubAI | Kiểu Dữ Liệu DB | Quy Tắc Chuyển Đổi (Transformation Rule) |
| :--- | :--- | :--- | :--- |
| `id` | `venue_id` | `VARCHAR(36)` | Sử dụng `id` làm `venue_id` (hoặc tạo UUID) |
| *(Không có)* | `owner_user_id` | `VARCHAR(36)` | Gán với `user_id` của 1 tài khoản Owner mặc định (Seeder) |
| `venue` | `venue_name` | `VARCHAR(255)` | Trích xuất trực tiếp tên thương hiệu |
| `phone` | `contact_phone` | `VARCHAR(20)` | Nếu `null` ➔ gán sđt mặc định: `"0900000000"` |
| `booking_url` | `venue_description` | `TEXT` | Tạo chuỗi mô tả: `"Đặt lịch tại " + venue + ". Nguồn: " + booking_url` |
| *(Mặc định)* | `operating_status` | `ENUM` | Gán cứng `'APPROVED'` để hiển thị ngay trên Customer App |

---

### 3.2 Bảng `branches` (Chi Nhánh Địa Lý)

| Trường JSON Crawled | Thuộc Tính CSDL SportHubAI | Kiểu Dữ Liệu DB | Quy Tắc Chuyển Đổi (Transformation Rule) |
| :--- | :--- | :--- | :--- |
| *(Sinh tự động)* | `branch_id` | `VARCHAR(36)` | Sinh UUID mới (Ví dụ: `branch_<venue_id>`) |
| `id` | `venue_id` | `VARCHAR(36)` | Tham chiếu `venues.venue_id` |
| `branch` | `branch_name` | `VARCHAR(255)` | Lấy giá trị `branch` (thường là `"Cơ sở chính"`) |
| `address` | `street_address` | `VARCHAR(255)` | Địa chỉ số nhà / tên đường |
| `location.city` / `address` | `ward_district_city` | `VARCHAR(255)` | Lấy `location.city` (Hà Nội, TP.HCM...) hoặc cắt từ `address` |
| `location.latitude`, `longitude`| `geo_coordinates` | `JSON` | Format thành JSON String: `{"lat": latitude, "lng": longitude}` |
| `phone` | `branch_phone` | `VARCHAR(20)` | Lấy `phone` hoặc dùng SĐT mặc định |
| *(Mặc định)* | `branch_status` | `ENUM` | Gán cứng `'ACTIVE'` |

---

### 3.3 Bảng `courts` (Danh Sách Sân Con)

| Trường JSON Crawled | Thuộc Tính CSDL SportHubAI | Kiểu Dữ Liệu DB | Quy Tắc Chuyển Đổi (Transformation Rule) |
| :--- | :--- | :--- | :--- |
| *(Sinh tự động)* | `court_id` | `VARCHAR(36)` | Sinh UUID mới cho từng sân con |
| *(Tự sinh)* | `branch_id` | `VARCHAR(36)` | Tham chiếu `branches.branch_id` tương ứng |
| `court.total` | `court_name` | `VARCHAR(255)` | Vòng lặp từ 1..total ➔ Tạo tên sân: `"Sân 1"`, `"Sân 2"`... |
| `sport_type[0]` | `sport_category` | `VARCHAR(100)` | Lấy phần tử đầu tiên (Ví dụ: `'Pickleball'`, `'Cầu lông'`) |
| *(Mặc định)* | `court_status` | `ENUM` | Gán cứng `'ACTIVE'` |

---

### 3.4 Bảng `operating_schedules` (Khung Giờ & Bảng Giá)

| Trường JSON Crawled | Thuộc Tính CSDL SportHubAI | Kiểu Dữ Liệu DB | Quy Tắc Chuyển Đổi (Transformation Rule) |
| :--- | :--- | :--- | :--- |
| *(Sinh tự động)* | `schedule_id` | `VARCHAR(36)` | Sinh UUID mới |
| *(Mặc định)* | `scope_target_type` | `ENUM` | `'VENUE'` |
| `id` | `scope_target_id` | `VARCHAR(36)` | Tham chiếu `venues.venue_id` |
| *(Mặc định)* | `day_scope` | `VARCHAR(50)` | `'EVERYDAY'` |
| `opening_hours` | `opening_time` | `TIME` | Parse regex `"6:00 – 22:00"` ➔ `"06:00:00"` |
| `opening_hours` | `closing_time` | `TIME` | Parse regex `"6:00 – 22:00"` ➔ `"22:00:00"` |
| `price.range` | `base_hourly_price` | `DECIMAL(10,2)` | Parse chuỗi `"80,000đ – 180,000đ/giờ"` ➔ Lấy min price: `80000` |

---

### 3.5 Bảng `venue_images` (Bộ Sưu Tập Ảnh)

| Trường JSON Crawled | Thuộc Tính CSDL SportHubAI | Kiểu Dữ Liệu DB | Quy Tắc Chuyển Đổi (Transformation Rule) |
| :--- | :--- | :--- | :--- |
| *(Sinh tự động)* | `image_id` | `VARCHAR(36)` | Sinh UUID mới |
| *(Mặc định)* | `target_type` | `ENUM` | `'VENUE'` |
| `id` | `target_id` | `VARCHAR(36)` | Tham chiếu `venues.venue_id` |
| `images[i]` | `image_url` | `TEXT` | Lấy các URL ảnh trong mảng `images` |
| `i === 0` | `is_primary` | `BOOLEAN` | Ảnh đầu tiên = `true` (Avatar), các ảnh sau = `false` |
| `i` | `display_order` | `INT` | Thứ tự `0, 1, 2...` |

---

## 4. XỬ LÝ NHÁNH VÀ CÁC THÁCH THỨC DỮ LIỆU (DATA GAPS & CHALLENGES)

1. **Vấn đề Thiếu Tài Khoản Owner (No Owner User ID):**
   - *Giải pháp:* Tệp Seeder sẽ tự động tìm hoặc tạo mới 1 User mẫu có vai trò `OWNER` (Ví dụ: `owner_alobo_system@sporthub.ai`) để đứng tên sở hữu toàn bộ 134 Venues này.
2. **Vấn đề SĐT bị NULL (106 sân):**
   - *Giải pháp:* Gán số hotline mặc định hệ thống (ví dụ: `0901234567`) khi dữ liệu crawl bị `null`.
3. **Phân tích Tọa Độ GPS (Haversine Distance Support):**
   - Tọa độ `latitude` và `longitude` trong JSON rất chuẩn. Khi insert vào cột `branches.geo_coordinates`, sẽ lưu dưới dạng JSON `{"lat": 21.076795, "lng": 105.814995}`. Điều này giúp tính năng Tìm sân gần đây (`GET /api/v1/venues?lat=...&lng=...&radius=...`) hoạt động chuẩn xác 100%.

---

## 5. KẾ HOẠCH TRIỂN KHAI SEEDING DỮ LIỆU (IMPORT PLAN)

Nếu bạn muốn Import toàn bộ 134 sân thực tế này vào CSDL của SportHubAI để test giao diện Frontend:

1. **Tạo script Node.js Seeder:** `backend/src/seeders/import_alobo_venues.js`
2. **Quy trình chạy:**
   - Bước 1: Khởi tạo 1 Owner User trong bảng `users`.
   - Bước 2: Duyệt mảng JSON 134 phần tử.
   - Bước 3: Bulk Create vào `venues`, `branches`, `courts`, `operating_schedules`, và `venue_images` trong 1 Database Transaction.
3. **Kết quả:** Hệ thống sẽ ngay lập tức có **134 Venues**, **134 Branches**, **536 Courts**, và hàng trăm bức ảnh thực tế giúp trang chủ và trang tìm kiếm đẹp mắt và đầy đủ dữ liệu thực tế!

---
*Báo cáo phân tích được lập tự động bởi Antigravity AI Assistant cho hệ thống SportHubAI.*
