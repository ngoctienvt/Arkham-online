export const DECK = ['01016','01017','01018','01019','01020','01025','01030','01039','01087','01088','01089','01090','01091','01092','01093'];
export const INVESTIGATORS = {
 '01001': {deck:DECK, signature:'01006', weakness:'01007', upgrades:['01026','01027','01028','01043','01094','01095']},
 '01003': {deck:[...DECK.filter(code=>!['01030','01039'].includes(code)),'01048','01049'], signature:'01010', weakness:'01011', upgrades:['01026','01027','01028','01094','01095']}
};
export const BAG = ['+1','0','0','-1','-1','-1','-2','-2','-3','-4','skull','skull','cultist','tablet','auto_fail','elder_sign'];
export const LOCATIONS = {
 study:{code:'01111',name:'Study',vn:'Phòng làm việc',shroud:2,clues:2,links:[]},
 hallway:{code:'01112',name:'Hallway',vn:'Hành lang',shroud:1,clues:0,links:['attic','cellar','parlor']},
 attic:{code:'01113',name:'Attic',vn:'Gác mái',shroud:1,clues:2,links:['hallway']},
 cellar:{code:'01114',name:'Cellar',vn:'Tầng hầm',shroud:4,clues:2,links:['hallway']},
 parlor:{code:'01115',name:'Parlor',vn:'Phòng khách',shroud:2,clues:0,links:['hallway']}
};
export const SKILLS = {willpower:'Ý chí',intellect:'Trí tuệ',combat:'Chiến đấu',agility:'Nhanh nhẹn'};
export const SYMBOLS = {willpower:'◈',intellect:'▣',combat:'⚔',agility:'➶',wild:'★'};
export const VI = {
 '01003':'Trong lượt của bạn, chi 2 resource để có thêm 1 action (mỗi lượt một lần). Elder Sign: +2. Nếu thành công, nhận 2 resource.',
 '01010':'Fast, chơi ngay khi lượt của bạn bắt đầu. Đến hết vòng, kẻ địch không có Elite không thể tấn công bạn.',
 '01011':'Vào Threat Area khi rút. Chuyển tối đa 2 resource mỗi vòng vào lá này. Nếu có dưới 6 khi kết thúc màn, mất 2 XP.',
 '01048':'Bạn có thêm 1 action trong lượt của mình.',
 '01049':'Trong kiểm tra Chiến đấu hoặc Nhanh nhẹn: chi 1 resource để cộng 1 kỹ năng.',
 '01016':'4 đạn. Đánh: +1 chiến đấu, gây thêm 1 damage. Tốn 1 đạn.',
 '01006':'4 đạn. Đánh: +1 chiến đấu (+3 nếu vị trí có manh mối), thêm 1 damage.',
 '01017':'Trong kiểm tra Ý chí hoặc Chiến đấu: trả 1 resource để cộng 1 kỹ năng.',
 '01018':'+1 chiến đấu. Có thể bỏ Beat Cop để gây 1 damage trực tiếp. Chịu được 2 damage / 2 horror.',
 '01019':'3 lần sử dụng. Tốn 1 action và 1 lượt dùng để hồi 1 damage hoặc 1 horror.',
 '01020':'Đánh: +1 chiến đấu. Thêm 1 damage nếu mục tiêu là kẻ địch duy nhất đang giao chiến với bạn.',
 '01025':'Góp bài khi đánh. Nếu thành công: gây thêm 1 damage.',
 '01030':'Fast: không tốn action. +1 trí tuệ khi điều tra.',
 '01039':'Góp bài khi điều tra. Nếu thành công: tìm thêm 1 manh mối.',
 '01087':'3 pin. Điều tra: tiêu 1 pin để giảm 2 độ che phủ, tối thiểu 0.',
 '01088':'Nhận 3 resource.',
 '01089':'Góp 2 Ý chí. Thành công: rút 1 bài. Tối đa 1 Guts mỗi kiểm tra.',
 '01090':'Góp 2 Trí tuệ. Thành công: rút 1 bài. Tối đa 1 Perception mỗi kiểm tra.',
 '01091':'Góp 2 Chiến đấu. Thành công: rút 1 bài. Tối đa 1 Overpower mỗi kiểm tra.',
 '01092':'Góp 2 Nhanh nhẹn. Thành công: rút 1 bài. Tối đa 1 Manual Dexterity mỗi kiểm tra.',
 '01093':'Góp 2 kỹ năng bất kỳ. Tối đa 1 Unexpected Courage mỗi kiểm tra.',
 '01007':'Đặt 3 manh mối lên Cover Up. Khi tìm manh mối, có thể xóa manh mối ở đây thay thế. Còn manh mối lúc kết thúc: nhận 1 mental trauma.',
 '01097':'Khi rút: mất toàn bộ resource.',
 '01117':'+1 chiến đấu. Đánh thành công kẻ địch Monster: gây thêm 1 damage. Chịu được 3 damage / 3 horror.'
};
export function plain(text='') {return text.replace(/<[^>]+>/g,'').replace(/\[\[(.*?)\]\]/g,'$1');}
