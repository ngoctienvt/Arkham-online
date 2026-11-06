# 09. Luật tùy chọn và thành tích

- Đối chiếu Tarot trong `NewCampaign.vue`, `Arkham/UltimatumsAndBoons` và `Achievements.vue` ở nguồn. Ghi rõ phạm vi toàn campaign hoặc một màn cho mỗi tùy chọn. Lưu lựa chọn và phiên bản luật vào save, replay và báo cáo lỗi.
- Tích hợp Tarot Readings, Ultimatums và Boons vào setup, modifiers, timing và tiến trình campaign. Kiểm tra tương thích với mode, số người và giữa các tùy chọn. Giao diện giải thích tác động trước khi chọn.
- Định nghĩa thành tích theo ID và điều kiện có thể kiểm thử. Hiển thị tiến độ, điều kiện và kết quả đã mở. Ghi một lần cho mỗi thành tích theo phạm vi, giữ đúng khi reload và undo, loại trừ sandbox và replay khỏi ghi mới.
- Qua mốc khi từng tùy chọn trong inventory có fixture, hiệu lực duy trì đúng qua save/chuyển màn, và chạy lại command hoặc import trùng không cấp thành tích hai lần.

## Tiến độ

- Night of the Zealot cho bật Hardship, Forbidden Knowledge, Induction, Hades và Thoth trước khi chọn điều tra viên. Thiết lập có phiên bản và được giữ trong bản lưu, replay và báo cáo. Fixture kiểm tra tổ hợp tăng/giảm tài nguyên, tay bài, và chặn XP qua chuyển màn.
- Hermes thêm một action chỉ để di chuyển mỗi lượt, lưu trạng thái đã dùng và làm mới ở lượt tiếp theo. Persephone cộng XP khi bị đánh bại, chịu giới hạn của Induction. Mulligan giữ đúng số lá đầu ván khi dùng Thoth hoặc Forbidden Knowledge.
- Broken Promises bỏ Elder Sign, Failure thêm Auto-fail, Dread mở pha Mythos ngay vòng đầu mỗi màn. Fixture kiểm tra tổ hợp với Expert, tải lại tại lựa chọn Encounter và chuyển màn.
- Agony giữ mục tiêu gán damage hoặc horror cho tới khi hết sức chứa. Hai loại có mục tiêu độc lập. Fixture lưu và tải lại giữa lúc gán.
- Finality kết thúc chiến dịch solo khi điều tra viên gục. Nhật ký ghi thiệt mạng do damage hoặc mất trí do horror, kể cả khi cả hai xảy ra cùng lúc. Fixture kiểm tra tải lại và chặn sang màn.
- Athena cho giữ hoặc hủy Auto-fail đầu tiên mỗi màn. Nếu hủy, token được trả vào túi trước khi rút lại và có thể xuất hiện lần nữa. Fixture kiểm tra tải lại giữa lựa chọn, hết quyền sau khi chọn và khôi phục quyền ở màn kế tiếp.
- Destiny mở tìm bài trước tay bài đầu màn. Lá chọn được cộng thêm, không được đổi trong mulligan và kích hoạt Điểm yếu khi bắt đầu chơi nếu vẫn trên tay. Fixture kiểm tra kết hợp với Thoth, tải lại giữa lúc chọn và bỏ qua ở màn tiếp theo.
- Osiris thay lần gục đầu mỗi màn bằng 1 trauma và hồi toàn bộ damage/horror nếu trauma chưa chạm ngưỡng loại. Chặn damage, kể cả damage trực tiếp, đến đầu lượt kế tiếp. Fixture kiểm tra tải lại giữa lựa chọn trauma, kết hợp với Finality và khôi phục quyền ở màn sau.
- Child chơi Event trên cùng trong chồng bài bỏ, giữ chi phí và đặt lá xuống đáy deck. Dodge và Evidence! dùng cửa sổ phản ứng của từng lá. Extra Ammunition giữ bước chọn súng và có thể tải lại tại lựa chọn đó. Fixture cũng kiểm tra giới hạn mỗi vòng và quay về skill test đang chờ.
- The Scream loại Ally độc nhất đủ điều kiện khi bị hạ, cấm chơi bản còn lại và lọc các bản đó khỏi deck chiến dịch. Fixture kiểm tra Leo De Luca qua tải lại và chuyển màn, cùng ngoại lệ cho Ally cốt truyện, Ally thường và Ally chỉ bị bỏ.
- Còn mở các luật tùy chọn khác, Tarot và hệ thống thành tích. Các thành tích Night of the Zealot trong nguồn chỉ áp dụng cho Return to, nên cần gói đó trước khi nghiệm thu các điều kiện này.
