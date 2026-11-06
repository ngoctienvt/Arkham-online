# 02. Engine, timing và lưu ván

- Đọc luồng `dist/engine.js` → `actions.js`, `effects.js`, `skill-tests.js`, `campaign-rounds.js`. Dùng `Arkham/Phase.hs` làm bản đồ bước. Persist round, phase, step, active investigator, timing window và queue continuation; UI đọc cùng state để hiển thị pha, bước và lý do đang chờ.
- Chuyển dần Mythos, Investigation, Enemy và Upkeep sang các bước resumable, gồm mở/đóng phase, doom threshold, encounter draw, hunter/attack, ready, draw/resource và hand size. Xử lý setup, resolution và interlude riêng. Đặc tả When/After, Forced, reaction, fast, pass, ability limit và nested skill test từ source và test fixtures.
- Command đi qua kiểm tra quyền thực hiện và tính hợp lệ của lựa chọn, rồi áp dụng nguyên tử đến điểm dừng. Snapshot lưu cả instance ID, queue và RNG version/state. Reload giữa lựa chọn, retry command và effect lồng nhau không được lặp cost hoặc reward. Dùng RNG có thể tái hiện, giữ đường inject RNG cho tests.
- Di trú v1 theo fixture cho cả ba màn, gồm pending skill test, damage assignment, outcome và chapter transition. Sao lưu nguyên bản trước khi ghi v2, báo lỗi có thể tải save nếu migration thất bại. Rollback mở backup v1 với build cũ.
- Qua mốc khi baseline giữ nguyên, test theo từng phase/window và reload giữa các điểm dừng đều pass; UI không bật action sai thời điểm. Giữ debug trace có command, bước, window và nguồn effect.

## Tiến độ

- Cửa sổ Fast đang dùng lưu điểm timing và hiển thị lý do dừng. Cửa sổ mở lại sau khi trả cost vẫn giữ điểm timing và phần queue còn lại.
- Fixture kiểm tra tải lại trước/sau đợt tấn công Enemy và ở giới hạn tay bài Upkeep. Tải lại không lặp cost, draw hay resource. Replay tiếp tục chấp nhận dữ liệu cũ thiếu nhãn cửa sổ.
- Ô lưu v2 dùng khóa riêng và ghi phiên bản RNG. Khi đọc v1, giữ nguyên dữ liệu dưới khóa cũ để bản game trước mở lại được. Khi ô không đọc được, giao diện cho tải nguyên tệp và không ghi đè khi chơi tạm. Fixture kiểm tra cả ba màn, gồm pending skill test, chuyển màn và outcome.
- Fixture di trú bao phủ một lựa chọn gán damage đang chờ, gồm queue tiếp tục và kiểm tra Agony sau khi mở bản lưu.
- Registry timing xử lý Forced trước Reaction ở các sự kiện After asset vào play và After enemy bị hạ. Fixture xác nhận horror bắt buộc hoàn tất trước phản ứng Roland, kể cả qua reload.
- Timing When đầu tiên cho phép Dodge hủy một đòn tấn công trước lúc gán damage/horror. Fixture tải lại giữa cửa sổ, tiếp tục hành động đã gây đòn cơ hội và giữ bước làm kiệt sức của Enemy.
- Survival Knife (2) và Dodge cùng có thể xuất hiện trước một đòn tấn công trong pha Enemy. Fixture tải lại khi skill test lồng đang chờ và xác nhận đòn cũ tiếp tục đúng nếu kẻ địch sống.
- Evidence! và Roland cùng xuất hiện sau khi hạ địch. Sau khi áp dụng lựa chọn đầu, engine kiểm tra lại lựa chọn còn hợp lệ. Fixture thử cả hai thứ tự và tải lại giữa hai phản ứng.
- Còn mở: các điểm When khác, thứ tự nhiều Forced cùng điểm, phân quyền nhiều actor, schema trạng thái engine v2 và các lựa chọn lồng nhau còn lại.
