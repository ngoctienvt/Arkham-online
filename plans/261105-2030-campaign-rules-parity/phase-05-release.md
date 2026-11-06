# 05. Báo lỗi và nghiệm thu

- Giữ nút tải log hiện tại, thêm form mô tả, bước tái hiện, expected/actual, preview và export JSON theo phiên bản. Mặc định chỉ tải cục bộ. Gói có build/content version, campaign/scenario, phase/window, checkpoint, command/choice trace, RNG và lỗi; phân biệt export ngắn và đầy đủ. Loại bỏ dữ liệu ngoài game và lọc stack/path cục bộ mặc định.
- Import debug vào phiên riêng, xác thực schema, version, size, command IDs và state trước khi chạy. Import lỗi không được ghi đè ván đang chơi. Replay checkpoint + trace đến cùng kết quả và báo bước đầu lệch. Log v1 chỉ phân tích snapshot nếu thiếu RNG/trace.
- Với mỗi pack, chạy `npm test`, build bằng `python tools/build-offline.py`, kiểm syntax bundle, thử offline không mạng. Kiểm tra browser desktop/mobile cho map/scene, phase tracker, keyboard/focus, overlay chọn effect và bug report. Chơi xuyên campaign đại diện và bao phủ các nhánh còn lại bằng fixtures có trạng thái xác định.
- Chốt coverage theo manifest, gồm campaign, biến thể, scenario, card effect, phase/window, locale, save và mode. Item chưa đủ fixture hoặc asset phải hiển thị rõ trong báo cáo. Hoàn tất khi tất cả item trong phạm vi đã chốt qua gate, có test hồi quy cho lỗi phát hiện và mở được ván v1.
- Quyết định cần chốt trước khi phát hành đầy đủ: phạm vi homebrew/Beta và cách phân phối asset theo quyền sử dụng/kích thước. Kiểm thử solo nhiều điều tra viên theo mốc 06. Báo cáo v2 và chức năng replay trong UI dùng chung hợp đồng ở mốc 08.

## Tiến độ

- Form báo lỗi có mô tả, bước tái hiện, mong đợi, thực tế và xem trước JSON. Mặc định xuất ngắn với bối cảnh và lỗi đã lọc đường dẫn. Bản đầy đủ thêm checkpoint, trace, RNG và trạng thái để CLI phát lại.
- Test xác nhận báo cáo ngắn bỏ dữ liệu replay và đường dẫn cục bộ trong lỗi tự ghi. Báo cáo v2 đầy đủ có thể nhập vào Sandbox. Game kiểm tra kích thước, cấu trúc, phiên bản và danh sách lệnh, rồi so trạng thái sau phát lại trước khi mở phiên riêng.
- Ván mới ghi fingerprint khi từng lệnh hoàn tất. Nhập vào Sandbox và phát lại bằng CLI dừng tại bước đầu sai khác. Lịch sử cũ thiếu fingerprint vẫn được so ở trạng thái cuối.
- Báo cáo v1 dạng `{app,version,state}` mở được ở chế độ đọc tóm tắt, kể cả thiếu RNG và trace. Chưa có tệp xuất v1 lịch sử để xác minh biến thể định dạng. Còn mở xác minh trình duyệt và nghiệm thu theo từng gói.
- `node tools/report-coverage.mjs --summary` đối chiếu runtime với manifest. Bỏ `--summary` để lấy JSON theo ID, gồm biến thể, dẫn truyện EN, mã lá thiếu, mặt ảnh, fixture đã theo dõi và các bước timing đã đặt tên. MCP export vẫn là mẫu số tạm cho card, và số mục đăng ký không biểu thị đã qua nghiệm thu.
