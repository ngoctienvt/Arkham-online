export const optionalRules={
 TabooList25:{name:'Taboo 2.5',description:'Dùng các thay đổi Taboo của snapshot tháng 2/2026 cho bộ lá đang hỗ trợ.'},
 UltimatumOfHardship:{name:'Ultimatum of Hardship',description:'Bắt đầu mỗi màn với ít hơn 2 resource.'},
 UltimatumOfForbiddenKnowledge:{name:'Ultimatum of Forbidden Knowledge',description:'Tay bài đầu mỗi màn ít hơn 1 lá.'},
 UltimatumOfInduction:{name:'Ultimatum of Induction',description:'Không nhận XP trong chiến dịch.'},
 UltimatumOfBrokenPromises:{name:'Ultimatum of Broken Promises',description:'Bỏ Elder Sign khỏi túi token.'},
 UltimatumOfFailure:{name:'Ultimatum of Failure',description:'Thêm một Auto-fail vào túi token.'},
 UltimatumOfDread:{name:'Ultimatum of Dread',description:'Chạy pha Mythos ngay ở vòng đầu của mỗi màn.'},
 UltimatumOfAgony:{name:'Ultimatum of Agony',description:'Gán hết mức có thể vào cùng một mục tiêu trước khi chuyển mục tiêu, riêng cho damage và horror.'},
 UltimatumOfFinality:{name:'Ultimatum of Finality',description:'Gục vì damage thì thiệt mạng, gục vì horror thì mất trí. Cả hai đều kết thúc chiến dịch solo.'},
 UltimatumOfTheScream:{name:'Ultimatum of the Scream',description:'Ally độc nhất bị hạ sẽ bị loại khỏi ván và cấm trong phần còn lại của chiến dịch, trừ lá cốt truyện và Điểm yếu.'},
 BoonOfHades:{name:'Boon of Hades',description:'Bắt đầu mỗi màn với thêm 2 resource.'},
 BoonOfThoth:{name:'Boon of Thoth',description:'Tay bài đầu mỗi màn thêm 1 lá.'},
 BoonOfAthena:{name:'Boon of Athena',description:'Lần đầu lật Auto-fail mỗi màn, có thể hủy token đó, trả vào túi rồi rút lại.'},
 BoonOfDestiny:{name:'Boon of Destiny',description:'Trước khi rút tay bài đầu mỗi màn, có thể tìm thêm 1 lá trong deck. Lá đó không được đổi khi mulligan.'},
 BoonOfOsiris:{name:'Boon of Osiris',description:'Lần đầu sắp gục mỗi màn, chịu 1 trauma rồi hồi toàn bộ damage và horror. Chặn damage đến đầu lượt kế tiếp.'},
 BoonOfTheChild:{name:'Boon of the Child',description:'Mỗi vòng một lần, chơi Event trên cùng trong chồng bài bỏ, trả chi phí như thường rồi đặt lá xuống đáy deck.'},
 BoonOfHermes:{name:'Boon of Hermes',description:'Mỗi lượt có thêm 1 action chỉ để di chuyển.'},
 BoonOfPersephone:{name:'Boon of Persephone',description:'Nhận thêm 3 XP nếu bị đánh bại trong màn.'}
};
export const taboo25Text={
 '01050':'Fast. Play only during your turn. Disengage from each enemy engaged with you and move to a connecting location with no enemies.'
};

export const optionalRulesVersion=1;

export function validOptionalRules(settings){
 return settings===undefined||(settings?.version===optionalRulesVersion&&Array.isArray(settings.active)&&
  settings.active.length===new Set(settings.active).size&&
  settings.active.every(rule=>Object.hasOwn(optionalRules,rule)));
}
