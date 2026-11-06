# 03. Card effect và deck

- Dùng source `Ability.hs`, `Modifier.hs`, `SkillTest.hs`, module theo card code và `backend/arkham-api/tests/Arkham` làm oracle hành vi. Port theo cụm primitive: eligibility/target, trả cost, gắn modifier và thời hạn, resolve success/fail, trigger/timing, zone move, search/reveal, cancel/replace và choice. Effect đặc thù dùng handler rõ ràng, có test, theo card code/ability ID.
- Tách CardDef và instance. Mỗi instance có owner/controller, zone, trạng thái exhausted, token, attachment và mặt đang dùng. Dùng registry thống nhất cho player, investigator, weakness, encounter, location, act/agenda và story. Deck builder/import offline kiểm tra size, level, XP, faction/restriction, weakness/signature, taboo khi áp dụng, và báo card thiếu trước khi setup.
- Bonded: lấy số lượng và liên kết từ `cdBondedWith`, pool theo điều tra viên, setup theo quy tắc của nguồn và giới hạn lá. Chuyển instance ra/vào pool chỉ qua effect được phép. Test nhiều bản lá cha, thiếu mục tiêu, trả về đúng zone, và lưu giữa hiệu ứng.
- Permanent: kiểm tra quy tắc deck size, XP và setup riêng của từng lá. Vào play lúc setup với điều kiện tương ứng, loại khỏi luồng rút/mulligan, áp dụng targeting và giới hạn rời play đúng loại. Test cả Permanent player và encounter/story khi danh mục yêu cầu, gồm khả năng dùng ability ngay khi vào play và qua scenario transition.
- Mỗi card code có phân loại metadata-only hợp lệ hoặc implemented + fixture. Lá có effect chưa xong được đánh dấu và chặn khỏi gói playable. Test cả eligibility âm, không trả cost khi lựa chọn bất hợp lệ, modifier hết hạn đúng window, trigger một lần và thứ tự nhiều nguồn. Đối chiếu với hành vi nguồn, ghi sai khác xác nhận được.

## Tiến độ

- Charisma là Permanent đầu tiên trong runtime. Mua giữa màn với XP mà không thay lá thường, tự vào chơi ở màn tiếp theo, không vào deck rút và thêm chỗ Ally. Crypt Chill chỉ cho chọn asset có thể bỏ.
- Hallowed Mirror và Soothing Melody chạy theo pool Bonded của ván solo. Ba lá được đặt riêng ở setup, chuyển vào tay/deck khi Mirror vào chơi, và trở lại pool khi Mirror rời play. Fixture bao phủ giới hạn deck, tải lại khi đang chọn hồi phục và thu hồi đủ ba lá.
- Occult Lexicon và Blood-Rite dùng cùng pool. Fixture bao phủ rút trước khi bỏ, tải lại giữa lựa chọn, nhận resource hoặc chi resource gây damage, và miễn đòn đánh cơ hội.
- Còn mở pool theo từng owner và instance ID, các cặp Bonded khác, Permanent có setup/ability riêng, registry effect và coverage theo mã lá.
