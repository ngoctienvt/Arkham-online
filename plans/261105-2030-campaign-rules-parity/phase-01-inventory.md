# 01. Kiểm kê và hợp đồng dữ liệu

- Đối chiếu `Arkham/Campaign/Campaigns`, `Arkham/Scenario/Scenarios`, locale EN, campaign selector, registry encounter/player cards và `frontend/homebrew`. Ghi nguồn và hash, campaign/scenario/card ID, biến thể, số bản lá, asset, trạng thái nguồn, các nhánh và cơ chế phụ thuộc. Tách nội dung đăng ký được khỏi thư mục thử nghiệm. Chốt mẫu số của báo cáo coverage theo snapshot.
- Với từng scenario, kê setup, encounter sets, act/agenda, mặt lá, map/link, token theo độ khó, story, log keys, resolution và điều kiện mở màn tiếp theo. Thống kê thiếu locale, ảnh, ID trùng, code có suffix/mặt sau và bản in tương đương. Không suy ra thứ tự campaign từ tên thư mục.
- Chuẩn hoá dữ liệu build-time theo ID ổn định. Tách metadata EN, keys locale, map presentation và rule handler. Thử trích một scenario hiện có trước, so dữ liệu với hành vi local. Ghi nguồn và điều kiện dùng lại code, text và art trước khi đóng gói chia sẻ.
- Cổng qua mốc: tái tạo manifest từ snapshot cố định, validator phát hiện ID mồ côi và số lượng sai, mỗi item có trạng thái và owner triển khai. Phần Beta/thiếu ở nguồn có backlog kiểm chứng riêng.

## Tiến độ 2026-11-05

- Manifest v2: 25 ID chiến dịch, 210 ID kịch bản (161 builder gốc, 49 đăng ký homebrew), 2 alias riêng. Không còn builder gốc chưa đọc được trong snapshot này.
- MCP xuất 6.487 dòng cho 5.928 mã lá. 105 mã có nhiều dòng; validator giữ chúng theo mã và kiểm tra ID dòng riêng. Đây là số liệu của export, chưa phải mẫu số registry player/encounter Haskell. Danh sách thiếu dòng kịch bản so theo mã chính xác; alias hoặc code dùng chung có thể có dòng dưới mã khác.
- Mẫu The Gathering ghi setup gốc, map, túi token theo độ khó, locale và chương tiếp. So với setup local: khớp 12 mã, 26 lá Encounter lúc bắt đầu. Chưa xác nhận parity effect, token và resolution.
- Có thêm mẫu setup cho The Midnight Masks và The Devourer Below. Fixture solo đối chiếu thành phần chồng Encounter, vị trí bắt đầu và màn kế tiếp. Mẫu cũng ghi các nhánh setup và điều kiện theo số người lấy từ nguồn.
- `scenarioEvidence` ghi số dòng và symbol của setup, Encounter, act/agenda, map, token, story, log và resolution trong file nguồn theo từng ID. Kết quả tìm theo tên cho 111 ứng viên locale, 99 mục chưa xác định. Đây là chỉ dẫn đối chiếu. Homebrew mới được đọc từ file đăng ký, và thứ tự campaign không suy từ tên thư mục.
- `tools/extract-card-printings.py` lấy 56 mã bản in tương đương của các lá đã đóng gói từ khai báo CardDef, kèm symbol và file nguồn. Import deck chuẩn hóa mã này trước khi kiểm tra số bản. Chưa dùng kết quả để suy ra toàn bộ registry lá.
- Đã đối chiếu nhánh Skill tích hợp trong `allPlayerSkillCards`: 157 định nghĩa, 186 mã gồm bản in thay thế, tất cả có trong export MCP. Báo cáo coverage ghi 7/157 định nghĩa có dữ liệu trong bản hiện tại. Nhánh Skill homebrew và các loại lá khác vẫn cần đối chiếu.
- Đã đối chiếu nhánh Event tích hợp trong `allPlayerEventCards`: 518 định nghĩa, 570 mã phân biệt, tất cả có trong MCP. Mã `60420` xuất hiện trong hai định nghĩa Eldritch Inspiration theo thứ tự registry. Báo cáo ghi mã trùng riêng và dùng mã không trùng để tính độ phủ. Bản hiện tại đóng gói 9/518 định nghĩa Event.
- Còn mở: đối chiếu registry lá và selector, chuyển dẫn chiếu thành dữ liệu setup/nhánh đã xác minh, audit locale/ảnh và điều kiện đóng gói, phân loại Beta và xác nhận mẫu số coverage. Chưa qua cổng mốc 01.

Tái tạo từ thư mục game (PowerShell):

```powershell
python tools/inventory-reference.py '../arkham horror online/arkham horror online' --output plans/261105-2030-campaign-rules-parity/source-inventory.json
```
