# 04. Chiến dịch tiếng Anh

- Tách hardcode `chapter()+1`, ba map và story VI khỏi `campaign.js`, `campaign-view.js`, `scene-data.js`, `dialogs.js` và `app.js`. Chọn campaign/difficulty/investigator/deck và resume từ UI hiện tại. Scenario khai báo map, liên kết, sprite/card art, camera và bố cục. Bản đồ động dùng các tương tác sẵn có của scene/overview. Giữ nội dung VI đang dùng ở Night of the Zealot và dùng EN cho nội dung mới. Tách text qua locale keys để dịch sau.
- Đợt A: Night of the Zealot đủ EN và hồi quy VI hiện có, Return to Night of the Zealot, Dunwich và Return to Dunwich. Kiểm tra carry-over XP, trauma, deck, story asset, campaign log và lựa chọn thứ tự.
- Đợt B: Carcosa, Forgotten Age, Circle Undone và ba bản Return to tương ứng. Đóng theo nhánh, interlude, supplies, Explore và các cơ chế riêng đã xác nhận từ inventory.
- Đợt C: Dream-Eaters, Innsmouth, Edge of the Earth và Scarlet Keys. Các cổng đặc thù gồm campaign song song, flashback/key/flood, partner/supply và world map/time/concealed theo campaign tương ứng.
- Đợt D: Hemlock Vale, Drowned City, Brethren of Ash, Children of Blood, các mục còn lại tìm được trong manifest, side stories, challenge và homebrew. README ghi Drowned City và một số standalone là Beta. Khép khoảng trống theo hành vi thực tế và fixture, có phân loại gói chính thức, biến thể và cộng đồng.
- Mỗi campaign có test từ setup đến ending, bao gồm nhánh loại trừ, skip/reorder, kết thúc do defeat/resign, XP và điều kiện sang màn. Với scenario có mode đặc biệt, theo dõi riêng fixture và hỗ trợ UI tương ứng. Chỉ gắn Playable khi toàn bộ scenario, dependency card, EN text, save/resume và chuyển màn của gói qua gate.
- Phát hành theo pack cục bộ. Giữ build single-file hiện có cho core, đo kích thước và thời gian tải trước khi chọn single-file toàn bộ hoặc các gói offline cài sẵn, kiểm tra cả file:// và local serve theo cách đóng gói đã chọn.

## Tiến độ

- Night of the Zealot dùng ID chiến dịch và kịch bản từ snapshot để tra metadata và xác định màn kế tiếp. Bản lưu v1 tiếp tục dùng số màn qua bộ chuyển đổi; bản lưu có cả ID và số màn được kiểm tra tính nhất quán.
- Night of the Zealot cho chọn Easy, Standard, Hard hoặc Expert trước khi chọn điều tra viên. Độ khó đi theo bản lưu và khi chuyển màn. Các biến thể token Hard/Expert của ba màn đã nối vào engine.
- Night of the Zealot có lựa chọn dẫn truyện tiếng Anh cho lời mở đầu, intro và kết thúc ba màn. Script `tools/extract-notz-en.py` tái tạo từ locale EN của snapshot. Tiếng Việt vẫn là mặc định. Tùy chọn ngôn ngữ theo bản lưu và replay.
- Fixture kiểm tra đầy đủ thành phần túi token ở Easy, Standard, Hard và Expert qua setup và tải lại cả ba màn Night of the Zealot, gồm Elder Thing ở màn cuối.
- Đối chiếu `NearestEnemyToFallback` trong snapshot và sửa lựa chọn đặt doom khi không có đường tới mục tiêu. Fixture bao phủ Cultist ở Midnight Masks, ưu tiên mục tiêu tới được của Mysterious Chanting, và Tablet trả 1 manh mối ở Easy hoặc toàn bộ ở Expert khi thất bại.
- Fixture Elder Thing kiểm tra mức trừ và điều kiện rút thêm ở Standard và Expert khi Umôrdhoth vào chơi. Hiệu ứng khi thất bại được xử lý cho từng token đã lật, theo cách `Arkham/SkillTest/Runner.hs` gửi kết quả đến từng token.
- Còn mở phần đăng ký gói, giao diện chọn campaign, nội dung luật và UI tiếng Anh đầy đủ, hành vi token theo từng độ khó và các đợt nội dung A–D.
