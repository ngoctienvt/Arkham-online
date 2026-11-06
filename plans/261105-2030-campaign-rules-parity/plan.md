---
title: Hoàn thiện Arkham Gathering từ bản tham chiếu
status: in-progress
---
# Hoàn thiện Arkham Gathering

Giữ UI bàn chơi 2.5D, bản chạy offline và khả năng mở ván cũ. Đưa toàn bộ nội dung chơi được từ snapshot tham chiếu vào danh mục, phát hành nội dung tiếng Anh trước và làm tiếng Việt sau. Hoàn thiện luật chung và effect riêng của các lá trong phạm vi danh mục, có theo dõi tiến độ đến từng kịch bản và từng lá. Kế hoạch này chưa thay đổi mã game.

## Mốc và thứ tự

| Mốc | Phụ thuộc | Kết quả |
|---|---|---|
| [01. Kiểm kê và hợp đồng dữ liệu](phase-01-inventory.md) | — | Danh mục chuẩn có nguồn gốc, trạng thái và tiêu chí hoàn thành |
| [02. Engine, timing và lưu ván](phase-02-engine.md) | 01 | Night of the Zealot chạy trên nền mới, tương thích ván v1 |
| [03. Card effect và deck](phase-03-cards.md) | 02 | Pipeline effect, Bonded/Permanent, bộ kiểm thử và tiến độ theo card code |
| [04. Chiến dịch tiếng Anh](phase-04-campaigns.md) | 01–02, 03 theo từng đợt | Các gói hoàn chỉnh, mở từ UI hiện tại |
| [05. Báo lỗi và nghiệm thu](phase-05-release.md) | Bắt đầu cùng 02, chốt sau 03–04 | Tái hiện lỗi, kiểm thử offline, nghiệm thu toàn danh mục |
| [06. Một người điều khiển nhiều điều tra viên](phase-06-multi-investigator.md) | Thiết kế cùng 02, trước khi mở các gói 04 | Bàn 1–4 điều tra viên chơi được |
| [07. Deck builder, thư viện và import](phase-07-deck-library.md) | 01, 03 và 06 cho nhiều deck | Dựng, nhập và nâng cấp deck cho từng ghế |
| [08. Undo, lịch sử, replay, nhập ván và debug](phase-08-history-debug.md) | 02, dùng chung checkpoint với 05 | Quản lý ván và sandbox từ UI |
| [09. Luật tùy chọn và thành tích](phase-09-optional-achievements.md) | 02–04, 08 cho ghi tiến độ | Tarot, Ultimatums & Boons và thành tích |
| [10. Multiplayer online](phase-10-online.md) | 06–08 | Phòng chơi 2–4 người, nhận ghế và kết nối lại |

## Bằng chứng và lựa chọn

Nguồn đọc tại `D:/SteamLibrary/steamapps/common/Return 2 Games/TouchMenuIcons/demo/arkham horror online/arkham horror online`. Git trả ref ngắn `bf708dd537` khi truy vấn từ thư mục nguồn, nhưng không xác nhận được working tree. Mốc 01 phải ghi hash file thực tế trước khi trích dữ liệu. README tự ghi một số nội dung Beta và chỉ tuyên bố độ phủ player cards trước 2026. Phải kiểm kê phần đăng ký trong code, kể cả nội dung ngoài README.

| Hạng mục | Nguồn tham chiếu | Bản hiện tại và cách tích hợp | Rủi ro nếu bỏ qua |
|---|---|---|---|
| Chiến dịch | Registry Haskell, `frontend/src/arkham/data/campaigns.json`, locale EN | Thay giả định ba màn trong `dist/campaign*.js` bằng registry theo ID, giữ lớp UI | Mất nhánh, interlude hoặc mở nhầm màn |
| Timing | `Arkham/{Phase,Window,Queue,Message}.hs` | Chuyển từng nhóm hành vi vào JS, nối với pending dialog | Trigger sai thứ tự, lặp khi reload |
| Effect | `Ability.hs`, `Modifier.hs`, module từng lá và tests Haskell | Handler JS theo card code và ability ID, primitive dùng chung | Hiển thị được lá nhưng luật sai |
| Bonded và Permanent | `Card/CardDef.hs`, `Investigator/Runner.hs` | Định nghĩa lá tách khỏi instance và zone theo chủ sở hữu | Nhân bản, rút sai pile, bỏ nhầm Permanent |
| Báo lỗi | `Game.vue` có debug export basic/scenario/full, `Api/Arkham/Export.hs` | Nâng cấp JSON hiện có ở `dist/app.js` theo phạm vi offline | Có ảnh chụp trạng thái nhưng thiếu dữ liệu tái hiện |
| UI và đóng gói | Frontend Vue, engine Haskell | Giữ `dist/view.js`, scene/map/dialog và `tools/build-offline.py` | Làm mất trải nghiệm 2.5D hoặc file offline |

Baseline: `npm test` pass 51/51. Nguồn sửa là module trong `dist/`. `the-gathering-offline.html` sinh từ build. Xem hai plan solo và location actions như baseline để bảo toàn hành vi.

## Tiến độ triển khai

- [Danh mục nguồn v2](source-inventory.json) có fingerprint, 25 ID chiến dịch, 210 ID kịch bản, 2 alias và mẫu setup The Gathering. Export MCP có 5.928 mã lá; chưa đối chiếu đủ registry Haskell để dùng làm mẫu số độ phủ. [Mốc 01](phase-01-inventory.md) vẫn mở; mốc 02–10 chưa có thay đổi trong lượt này.
- Bản solo lưu RNG và phase step, xuất báo cáo v2 có checkpoint và command trace. Có CLI tái hiện với cùng bản game. Chưa hoàn thành scheduler timing windows, registry đa chiến dịch, Bonded/Permanent hoặc các gói EN.
- Đã có thư viện tra cứu cho dữ liệu hiện tại, bốn ô lưu, lịch sử theo bước, undo có xác nhận và sandbox ép token. Mốc 07 vẫn thiếu dựng/nhập deck. Mốc 08 đã nối xuất ván có seed và nhập vào ô trống. Còn replay trên bàn, xuất ván cũ thiếu seed và các công cụ dựng fixture/chỉnh zone.

Thiết kế actor/owner ID ngay ở mốc engine, bảo toàn ván solo một điều tra viên, rồi dùng cùng nền cho solo nhiều điều tra viên và multiplayer online. Kiểm kê Return to, standalone, challenge và homebrew đăng ký trong snapshot, phân loại rõ khi phát hành. Nghiệm thu toàn bộ phạm vi sau khi qua các cổng ở mốc 01–10.

Rủi ro cao ở timing, lưu ván và parity theo từng lá. Ra theo gói nhỏ, giữ bản lưu nguồn để quay lui, dùng Night of the Zealot làm cổng kiểm tra trước khi mở rộng.
