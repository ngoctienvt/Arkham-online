# 10. Multiplayer online

- Đối chiếu `JoinGame.vue`, `ClaimSeat.vue` và `Game.vue` ở nguồn. Thêm phòng cho 2–4 người, link mời, nhận ghế, chọn deck và resume phòng. Dùng engine nhiều điều tra viên chung với bản offline. Server giữ trạng thái chuẩn và kiểm tra mọi lệnh theo ghế, timing window và phiên bản trạng thái.
- Chỉ gửi view theo quyền từng ghế, bảo vệ tay bài và thông tin ẩn trong event, snapshot, log và replay. Lệnh có ID để retry không lặp, đồng bộ lại khi reconnect, giữ pending choice và nhất quán khi hai người gửi lệnh cùng lúc. Undo online có quy trình xác nhận chung.
- Qua mốc khi ít nhất hai trình duyệt chơi trọn một màn, lệnh trái ghế bị từ chối, thông tin ẩn không có trong payload, mất kết nối giữa lựa chọn có thể quay lại, gửi trùng chỉ thực thi một lần, và phòng mở lại sau restart server. Kiểm thử đủ 4 ghế và hồi quy bản offline.
- Cần chốt trước khi vận hành công khai cách lưu phòng, cơ chế truy cập và nơi host. Các quyết định này không chặn prototype và kiểm thử phòng trong môi trường local.

## Tiến độ

- Launcher cục bộ phục vụ `http://127.0.0.1:8786/rooms.html` để tạo phòng 2–4 ghế, gửi link mời và nhận ghế. Phiên ghế tiếp tục khi tải lại trang. Kho cục bộ lưu hash của lời mời và phiên ghế; fixture kiểm tra đủ bốn ghế và mở lại kho sau restart.
- Đây là sảnh chờ cục bộ. Còn mở nối engine nhiều điều tra viên, lệnh và view theo quyền, undo đồng thuận, xác minh nhiều trình duyệt và vận hành mạng.
- Mỗi ghế có thể chọn deck dựng sẵn hoặc nhập JSON. Máy chủ dùng chung validator với game offline, xác thực ghế, từ chối revision cũ và xử lý gửi lại cùng request ID mà không tăng revision. Ghế khác chỉ thấy trạng thái đã chọn. Fixture kiểm tra quyền và retry sau khi mở lại kho phòng.
