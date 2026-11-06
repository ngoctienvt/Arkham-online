# 06. Một người điều khiển nhiều điều tra viên

- Đối chiếu chế độ solitaire ở `frontend/src/arkham/views/NewCampaign.vue` và các bước của `Arkham/Phase.hs`. Trong bản hiện tại, chuyển dữ liệu riêng của người chơi từ `engine.s` sang từng investigator ID, giữ round, act/agenda và map ở trạng thái chung. Tách điều tra viên đang điều khiển, đang đến lượt, trưởng nhóm và người phải quyết định.
- Cho chọn 1–4 điều tra viên và deck riêng trước setup. Tích hợp chuyển ghế vào bàn 2.5D hiện tại. Hiển thị rõ ai có thể hành động, ai đang góp bài và lựa chọn đang chờ thuộc về ai.
- Kiểm thử thứ tự lượt, mythos mỗi người, scaling theo số người, giao chiến/chuyển mục tiêu, góp bài chéo, clue nhóm, giới hạn theo điều tra viên, defeat, resume giữa một lựa chọn và carry-over qua màn. Di trú save solo hiện có sang một ghế, giữ backup.
- Qua mốc khi chơi trọn Night of the Zealot với 1, 2 và 4 điều tra viên, đồng thời fixture bao phủ luồng 3 ghế. Mỗi chiến dịch mới kiểm tra các cơ chế phụ thuộc số người trước khi gắn Playable.

## Tiến độ

- Lệnh mới ghi ghế gửi lệnh vào trace. Engine xác định ghế theo loại lệnh trước khi thay đổi trạng thái. Lệnh sai ghế bị từ chối, kể cả khi có lựa chọn đang chờ. Trace solo cũ thiếu ghế vẫn phát lại được.
- Ô lưu v2 tách tay bài, deck, tài nguyên, vị trí và trạng thái riêng của điều tra viên vào ghế `seat-1`. Ván cũ dạng phẳng vẫn đọc được. Fixture kiểm tra lưu lại cả ba màn mà không đổi fingerprint.
- Chia tay bài đầu màn và mulligan dùng chung quy tắc trên dữ liệu từng ghế. Kiểm thử xác nhận ghế khác không bị thay đổi, điểm yếu và bài vừa đổi không xuất hiện trong lượt rút thay thế.
- Khi dựng deck, bài riêng, điểm yếu và kho Bonded lấy từ dữ liệu của ghế. Fixture kiểm tra một ghế có deck tùy chỉnh và một ghế dùng deck dựng sẵn.
- Còn mở mô hình nhiều điều tra viên, lựa chọn và chuyển ghế trên bàn, vòng Mythos/lượt theo từng người, scaling và các fixture 2–4 ghế.
