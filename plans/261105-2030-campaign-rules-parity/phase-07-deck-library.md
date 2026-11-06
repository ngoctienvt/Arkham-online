# 07. Deck builder, thư viện lá và import deck

- Đối chiếu `Cards.vue`, `Deck.vue`, `NewDeck.vue`, `ChooseDeck.vue` và `UpgradeDeck.vue` ở bản tham chiếu. Xây thư viện từ card registry, có tìm kiếm, lọc theo pack, faction, loại, trait, level và trạng thái effect, xem hai mặt, chữ EN và phiên bản Taboo.
- Tạo, sao chép, sửa, lưu và xuất deck. Hỗ trợ deckbuilding theo điều tra viên, tùy chọn mặt/phiên bản, giới hạn bản sao, signature, weakness, ngoại lệ, Bonded/Permanent, XP và Taboo. Dùng cùng validator ở builder, import, setup và nâng cấp.
- Nhập tệp deck offline và hỗ trợ URL/ID từ ArkhamDB và arkham.build khi có mạng. Xác nhận hợp đồng tích hợp trước khi viết adapter. Kiểm tra định dạng, giới hạn kích thước, chỉ chấp nhận nguồn URL được hỗ trợ, báo rõ lá thiếu và lỗi kết nối. Giữ deck nhập dưới dạng draft đến khi qua validation.
- Qua mốc khi import fixture thật từ cả hai nguồn, mở và sửa lại deck khi offline, chọn deck riêng cho từng ghế, và nâng cấp đúng XP giữa hai màn. Giữ đường bắt đầu nhanh bằng deck dựng sẵn.

## Tiến độ

- Có trình chỉnh deck offline cho Roland và Skids, lưu bản nháp, sao chép, nhập/xuất JSON dạng `investigator_code` và `slots`, và chọn deck lúc bắt đầu. Deck chơi phải có 30 lá thường trong bộ đang hỗ trợ, tối đa hai lá cùng tên. Engine bổ sung signature và weakness.
- Knife mở thêm lựa chọn cho cả hai điều tra viên và dùng mặt chữ trong bản offline. Deck đã chọn theo ván lưu, replay và chuyển màn.
- Thư viện lọc theo pack, faction, loại, trait, level và fixture theo mã. Có thể xem luật tiếng Anh nếu có trong dữ liệu, rồi quay về bộ lọc hiện tại.
- Thư viện hiển thị bản Taboo 2.5 của Elusive. Tùy chọn chiến dịch áp dụng điều kiện điểm đến của bản Taboo khi chơi và theo bản lưu sang màn sau.
- Bảng nâng cấp dùng cùng phép kiểm tra với engine, chỉ liệt kê cặp thay hợp lệ và giá XP thực tế. Giới hạn số bản theo tên dùng chung với validator deck đầu ván.
- Launcher có adapter nhập link/ID ArkhamDB và share arkham.build vào bản nháp. Endpoint HTTPS cố định, chặn redirect và giới hạn thời gian/dữ liệu. Kiểm tra hợp đồng với tài liệu và mã nguồn của hai dịch vụ. Kiểm thử adapter pass với payload mẫu, môi trường kiểm thử chưa kết nối được hai API công khai để lấy fixture thật.
- Còn mở fixture trực tiếp từ hai dịch vụ, danh mục đầy đủ, thay đổi Taboo khác và chi phí XP theo Taboo, coverage fixture toàn bộ lá, luật deckbuilding mở rộng và chọn deck riêng cho bàn nhiều người.
