# Tiến độ campaign rules parity — 2026-11-05

Đang thực hiện mốc 01. Script đọc snapshot tham chiếu, sinh danh mục ID và fingerprint, giữ alias và nhóm các dòng in cùng mã. Validator kiểm tra ID đăng ký và dòng lá trùng, alias mồ côi và số lượng không hợp lệ.

Đối chiếu độc lập khớp 161 builder gốc. Có 49 ID kịch bản homebrew và hai alias. The Gathering khớp 26 lá Encounter qua 12 mã với setup local.

Kiểm tra: sinh lại manifest trùng SHA-256; `npm test` pass 55/55. Validator giữ hai dòng khác ID cùng mã lá, từ chối ID rỗng/trùng và số lượng âm hoặc boolean.

Mốc 01 chưa đạt cổng: cần đối chiếu registry lá với export, phân loại nội dung chưa hoàn chỉnh, kiểm tra locale/ảnh và trích thêm setup, nhánh, luật và resolution. Mốc 02–10 chưa được triển khai trong lượt này; không thay đổi runtime hay bản offline. `ak plan use` không chạy do workspace thiếu Git metadata; kế hoạch và tiến độ được ghi trực tiếp trong thư mục plan.
