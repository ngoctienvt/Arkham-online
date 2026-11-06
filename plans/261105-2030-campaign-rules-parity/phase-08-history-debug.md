# 08. Undo, lịch sử, replay, nhập ván và debug

- Dựa trên `HistoryPanel.vue`, `ReplayGame.vue`, `ImportGame.vue` và `ScenarioDebug.vue` của nguồn. Dùng checkpoint + command log có phiên bản, RNG và content version. Ghi theo thao tác đã commit, giữ điểm khôi phục trước mốc lớn, lưu nhiều slot độc lập.
- Thêm lịch sử trong UI, undo một thao tác hoặc về mốc đã chọn, xem replay từng bước và nhập save vào slot mới. Khi chơi tiếp sau undo, tạo nhánh mới hoặc xác nhận bỏ phần lịch sử phía sau. Replay báo bước đầu lệch nếu dữ liệu khác phiên bản.
- Mở sandbox từ bản sao ván hoặc fixture. Cho dựng trạng thái để thử effect, ép token, chuyển lá giữa zone, chỉnh token và dựng lại phase/window. Gắn cờ debug, ghi lệnh debug vào trace và tách phiên này khỏi tiến độ/thành tích thật. Báo lỗi trong sandbox xuất được cùng checkpoint và lệnh.
- Qua mốc khi undo qua skill test, shuffle và chuyển màn cho kết quả xác định, replay chạy từ đầu đến cuối, import lỗi giữ nguyên các slot đang có và sandbox có thể tái tạo một timing bug từ báo cáo. Kiểm tra schema, phiên bản, kích thước và các command được phép trước khi nhập.

## Tiến độ

- Ô lưu hỗ trợ xuất JSON cho ván có seed và nhập vào ô trống. Tệp có phiên bản, seed, lệnh đã commit và fingerprint trạng thái theo bước. Khi phát lại, lệnh lỗi hoặc trạng thái lệch sẽ báo bước đầu tiên và dừng trước khi ghi ô lưu.
- Sandbox hỗ trợ chuyển lá giữa deck, tay và bài bỏ, sắp xếp lượt rút Encounter, thay túi token và chạy từ pha Enemy, Upkeep hay Mythos. Test CLI dựng lại báo cáo từ pha Upkeep đến đúng lựa chọn Encounter đang chờ.
- Replay từng bước đã có chế độ chỉ xem trên bàn, kèm nội dung lựa chọn đang chờ. Quay về ván đang chơi giữ nguyên tiến độ.
- Save portable kiểm tra trường bắt buộc, trường tùy chọn và kiểu dữ liệu cho từng lệnh và từng loại hành động trước khi phát lại.
- Báo cáo debug và CLI kiểm tra đối số theo từng lệnh, gồm lệnh riêng của Sandbox. Sandbox có thể dựng cửa sổ trước/sau đợt tấn công Enemy hoặc sau Encounter và chạy tiếp queue tại điểm đó.
- Ô lưu cũ thiếu seed có thể xuất portable v2 từ checkpoint. Import kiểm tra checkpoint, lệnh và fingerprint trước khi ghi ô trống. Fixture bao phủ tiếp tục skill test đang chờ.
- Trong Chỉnh Sandbox, có thể xuất và mở fixture JSON riêng. Import kiểm tra phiên bản, giới hạn dung lượng và phát lại trace trước khi thay thế Sandbox hiện tại. Fixture hồi quy mở đúng cửa sổ sau Encounter rồi tiếp tục với cùng fingerprint.
- Còn mở: xác minh thao tác trên trình duyệt.
