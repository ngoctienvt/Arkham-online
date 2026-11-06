import {fastButtons,skillTestView} from './test-presentation.js';
import {campaignOutcomeExtra} from './campaign-view.js';
import {campaignStoryVi} from './campaign-story-vi.js';
import {campaignStoryEn} from './campaign-story-en.js';
import {campaignCardFace} from './campaign-card-vi.js';
import {INVESTIGATORS,VI,plain} from './rules-data.js';
import {notzBags} from './campaign-data.js';
import {optionalRules,taboo25Text} from './optional-rules.js';
import {libraryPackName} from './card-library.js';
import {esc,command,img,skillIcon} from './ui-utils.js';
const shell=body=>`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Lựa chọn ván chơi">${body}</section></div>`;
const windowLabels={
 'before-enemy-attacks':'Sau khi Hunter di chuyển, trước khi kẻ địch tấn công.',
 'after-enemy-attacks':'Sau khi kẻ địch tấn công, trước khi kết thúc pha Enemy.',
 'before-upkeep-ready':'Đầu pha Upkeep, trước khi làm mới bài.',
 'after-upkeep':'Cuối vòng, trước khi bắt đầu Mythos.',
 'after-encounter':'Sau khi xử lý Encounter, trước lượt điều tra.',
 'turn-start':'Đầu lượt điều tra.'
};
function storyText(text) {
 return text.split(/\n+/).filter(Boolean).map(part=>`<p>${esc(plain(part))}</p>`).join('');
}
function openingStory(engine,page) {
 const chapter=engine.chapter();
 if(engine.storyLanguage()==='en'){
  if(chapter===1&&page===0)return ['Campaign Prologue',campaignStoryEn.prologue];
  const {title,body}=campaignStoryEn.scenarios[engine.chapterInfo().id].intro;
  return [title,body];
 }
 if(chapter===1)return page===0
  ? ['Mở đầu chiến dịch',campaignStoryVi.campaign.opening.prologue]
  : [engine.chapterInfo().name,campaignStoryVi.torch.opening.prologue];
 if(chapter===2){
  const {house_burned,intro_2,intro_3}=campaignStoryVi.arkham.opening;
  return [engine.chapterInfo().name,[engine.s.campaign.history[0]?.houseBurned?house_burned:'',intro_2,intro_3].filter(Boolean).join('\n')];
 }
 return [engine.chapterInfo().name,campaignStoryVi.tentacles.opening.intro];
}
export function pendingDialog(engine,selected=new Set()){
 const s=engine.s,p=s.pending,cards=engine.cards;
 if(!p)return '';
 if(p.kind==='investigator'){
  const difficulties=Object.keys(notzBags).map(difficulty=>
   `<button ${command('selectDifficulty',{difficulty})} aria-pressed="${difficulty===engine.difficulty()}"${difficulty===engine.difficulty()?' class="primary"':''}>${difficulty}</button>`
  ).join('');
  const variants=Object.entries(optionalRules).map(([rule,{name,description}])=>
   `<button ${command('toggleOptionalRule',{rule})} aria-pressed="${engine.hasOptionalRule(rule)}"
    class="${engine.hasOptionalRule(rule)?'primary':''}">${esc(name)}<br><small>${esc(description)}</small></button>`
  ).join('');
  return shell(`<span class="eyebrow">${esc(engine.campaignInfo().name.toUpperCase())} · SOLO</span><h2>Chọn điều tra viên</h2>
   <div class="actions" role="group" aria-label="Độ khó">${difficulties}</div>
   <div class="actions" role="group" aria-label="Ngôn ngữ dẫn truyện">
    ${[['vi','Dẫn truyện tiếng Việt'],['en','English story']].map(([language,label])=>
     `<button ${command('selectStoryLanguage',{language})} aria-pressed="${language===engine.storyLanguage()}"${language===engine.storyLanguage()?' class="primary"':''}>${label}</button>`
    ).join('')}
   </div>
   <details ${s.optionalRules?.active.length?'open':''}><summary>Luật tùy chọn cho cả chiến dịch</summary>
    <div class="actions">${variants}</div></details>
   <p>Chọn điều tra viên để chơi ngay với deck dựng sẵn, hoặc mở thư viện deck.</p><div class="investigator-picker">${Object.keys(INVESTIGATORS).map(code=>`<button ${command('selectInvestigator',{code})}>${img(code,cards[code].name)}<strong>${esc(cards[code].name)}</strong><span>${esc(VI[code]??'Sau khi hạ kẻ địch, có thể tìm 1 manh mối tại vị trí của bạn (mỗi vòng một lần).')}</span></button>`).join('')}</div>
   <div class="actions"><button data-deck-editor>Quản lý deck</button></div>`);
 }
 if(p.kind==='story'){
  const [title,story]=openingStory(engine,p.page);
  return shell(`<span class="eyebrow">DẪN TRUYỆN · ${engine.chapter()} / 3</span><h2>${esc(title)}</h2><div class="campaign-narrative">${storyText(story)}</div><div class="actions"><button class="primary" ${command('continueStory')}>${engine.chapter()===1&&p.page===0?'Tiếp tục':'Chuẩn bị vào màn'} →</button></div>`);
 }
 if(p.kind==='encounter'){
  const c=engine.card(p.code);
  return shell(`<div class="inspect-grid encounter-preview"><div>${img(p.code,c.name)}</div><div><span class="eyebrow">MYTHOS · RÚT ENCOUNTER</span><h2>${esc(c.name)}</h2><p>${esc(plain(c.text??c.flavor??''))}</p><div class="actions"><button class="primary" ${command('resolveEncounter')}>Xử lý lá bài →</button></div></div></div>`);
 }
 if(p.kind==='mulligan')return shell(`<span class="eyebrow">SOLO · ${esc(engine.investigator().name)} · ${esc(engine.difficulty().toUpperCase())}</span><h2>${esc(engine.chapterInfo().name)}</h2><div class="intro-meta"><span>◈ 1 người chơi</span><span>◷ Khoảng 30–60 phút</span><span>▣ Core Set</span></div><p>Bạn có ${s.resources} resource và ${s.hand.length} lá bài. Bấm những lá muốn đổi, rồi bắt đầu. Mỗi vòng có 3 action. ${engine.chapter()===1?'Tìm 2 manh mối để thoát Study.':s.lateOpening?'Quá nửa đêm: bạn sẽ bỏ 2 lá ngẫu nhiên sau bước đổi bài.':''}</p><div class="mulligan-grid">${s.hand.map((code,index)=>`<button class="mulligan-card ${selected.has(index)?'selected':''}" data-mulligan="${index}" ${s.destinyCard&&index===0?'disabled':''} aria-pressed="${selected.has(index)}">${img(code,cards[code].name)}<span>${s.destinyCard&&index===0?'Boon of Destiny':selected.has(index)?'↻ Đổi lá này':'Giữ lại'}</span></button>`).join('')}</div><p class="log-info">Bộ bài dựng sẵn cho điều tra viên bạn đã chọn.</p><div class="actions"><button data-help>Đọc cách chơi</button><button data-layout-preview>Xem bàn 4 người</button><button class="primary" data-start>${selected.size?'Đổi '+selected.size+' lá & bắt đầu':'Giữ bài & bắt đầu'} →</button></div>`);
 if(p.kind==='window')return shell(`<span class="eyebrow">CỬA SỔ KHẢ NĂNG NHANH</span><h2>Bạn muốn dùng lá nào?</h2>
  ${Object.hasOwn(windowLabels,p.point)?`<p>${windowLabels[p.point]}</p>`:''}
  <div class="choices">${fastButtons(engine,p)}</div><div class="actions"><button class="primary" ${command('closeWindow')}>Tiếp tục →</button></div>`);
 if(p.kind==='test'||p.kind==='result')return shell(skillTestView(engine,p));
 if(p.kind==='choice')return shell(`<span class="eyebrow">LỰA CHỌN CỦA BẠN</span><h2>${esc(p.title)}</h2>${p.story?`<div class="campaign-narrative">${storyText(p.story)}</div>`:''}<div class="choices">${p.options.map((o,index)=>`<button ${command('choose',{index})}>${esc(o.label)} →</button>`).join('')}</div>`);
 return '';
}
export function cardDialog(cards,code,{fromLibrary=false}={}){
 const back=!cards[code]&&code.endsWith('b'),base=back?code.slice(0,-1):code,c=cards[base];if(!c)return '';
 const face=campaignCardFace(c,back);
 const cardText=text=>esc(plain(text)).replace(/\[(willpower|intellect|combat|agility)\]/g,(_,skill)=>skillIcon(skill));
 const paragraphs=[face.text,face.flavor].filter(Boolean).map(text=>`<p class="card-inspect-text">${cardText(text)}</p>`).join('');
 const english=back?c.back_text:c.text;
 const original=fromLibrary&&english&&english!==face.text?`<details><summary>Luật tiếng Anh</summary><p>${cardText(english)}</p></details>`:'';
 const taboo=fromLibrary&&!back&&Object.hasOwn(taboo25Text,base)?
  `<details><summary>Taboo 2.5 · tháng 2/2026</summary><p>${cardText(taboo25Text[base])}</p></details>`:'';
 return shell(`<button class="quiet close" data-close-inspect aria-label="Đóng">✕</button><div class="inspect-grid"><div>${img(code,c.name)}${(c.double_sided||base==='01121a')?`<button class="small back" data-inspect="${base==='01121a'?'01121b':base==='01121b'?'01121a':base+(back?'':'b')}">Lật mặt bài ↻</button>`:''}</div><div><span class="eyebrow">${esc(c.type_code)} · ${esc(libraryPackName(c.pack_code))} ${esc(base)}</span><h2>${esc(face.name)}</h2>${VI[base]?`<p>${esc(VI[base])}</p>`:''}${paragraphs}${original}${taboo}${c.traits?`<p class="muted">${esc(c.traits)}</p>`:''}${fromLibrary?'<button data-library-back>Về thư viện</button>':'<p class="muted">Bấm bên ngoài hoặc Escape để đóng.</p>'}</div></div>`);
}
export function helpDialog(){return shell(`<button class="quiet close" data-close-inspect aria-label="Đóng">✕</button><span class="eyebrow">HƯỚNG DẪN NHANH · 2.5D</span><h2>Sống sót qua đêm đầu tiên</h2><div class="help-text"><p><strong>Tương tác trong cảnh.</strong> Bấm tên địa điểm hoặc hình điều tra viên để mở bảng thao tác. Tại đó bạn có thể điều tra, chuyển địa điểm, hoặc chọn Hành động trên một kẻ địch cùng chỗ. Threat và Play mở từ cụm điều tra viên, còn nút mũi tên cạnh tay bài dùng để xem các lá tiếp theo.</p><p><strong>Chuẩn bị.</strong> Đổi bài đầu ván một lần. Chơi asset từ tay bài bên dưới. Magnifying Glass có Fast nên không tốn action.</p><p><strong>Ba action mỗi lượt.</strong> Điều tra, chuyển phòng, đánh, né, rút bài, nhận resource hoặc chơi bài thường tốn 1 action. Bấm Kết thúc lượt khi đã xong.</p><p><strong>Kiểm tra kỹ năng.</strong> Kỹ năng + bài góp + token phải bằng hoặc lớn hơn độ khó. Auto-fail luôn thất bại. Bài skill chỉ được góp khi kiểm tra.</p><p><strong>Kẻ địch.</strong> Quái sẵn sàng cùng vị trí sẽ giao chiến. Làm việc khác đánh / né / thuyết phục / rút lui khi đang giao chiến gây đòn đánh cơ hội. Né thành công làm quái kiệt sức. Hunter đuổi theo trong pha kẻ địch. Ghoul Priest có Retaliate: đánh trượt sẽ bị đánh lại.</p><p><strong>Các pha.</strong> Cuối lượt, kiểm tra Frozen in Fear. Kẻ địch đánh. Upkeep làm mới, rút 1 bài, nhận 1 resource. Sang vòng mới, Mythos tăng 1 doom và rút 1 encounter.</p><p><strong>Mục tiêu từng màn.</strong> The Gathering: tìm đường ra khỏi Study, mở Parlor và đối đầu Ghoul Priest. The Midnight Masks: dùng manh mối lần ra giáo phái rồi rút lui trước nửa đêm. The Devourer Below: tìm nơi hành lễ và ngăn nghi thức. Bấm Toàn cảnh để xem đường đi và vị trí kẻ địch.</p><p><strong>Trang bị.</strong> Tối đa 2 Hand và 1 Ally. Chọn asset để thay hoặc chịu damage/horror khi được hỏi. Cover Up cho phép xóa manh mối trên điểm yếu thay vì lấy tại vị trí.</p><p><strong>Túi Standard.</strong> +1, 0×2, −1×3, −2×2, −3, −4, Skull×2, Cultist, Tablet, Auto-fail, Elder Sign. Các token đặc biệt đổi hiệu ứng theo từng màn. Hiệu ứng Elder Sign ghi trên lá điều tra viên.</p><p><strong>Lưu và dò lỗi.</strong> Tự lưu sau mỗi thao tác luật. Nhật ký tải trạng thái và thao tác để báo lỗi. Ván cũ tiếp tục được trong giao diện mới.</p><p class="log-info">Night of the Zealot · solo · Standard. Chuyển động hiện dùng ảnh cutout với hiệu ứng, chưa có bộ animation từng động tác.</p></div>`);}
export function outcomeDialog(engine){
 const s=engine.s,o=s.outcome,chapter=engine.chapter();
 const titles={R1:'Ngôi nhà chìm trong lửa',R2:'Bảo vệ ngôi nhà',R3:'Bị mắc kẹt trong bóng tối',resigned:'Rút lui khỏi ngôi nhà',defeated:'Điều tra viên đã gục ngã',escaped:'Thoát khỏi bầy Ghoul'};
 let heading=chapter===1?titles[o.resolution]:chapter===2?'Cuộc săn ở Arkham kết thúc':
  ({win:'Arkham sống sót qua đêm',survived:'Một cái giá khủng khiếp',loss:'Arkham thất thủ'})[o.result];
 const endings=[campaignStoryVi.torch,campaignStoryVi.arkham,campaignStoryVi.tentacles][chapter-1].ending;
 let story=endings[o.resolution]??endings.no_resolution??endings.R1;
 if(engine.storyLanguage()==='en'){
  const english=campaignStoryEn.scenarios[engine.chapterInfo().id].ending;
  const ending=english['resolution'+o.resolution.slice(1)]??english.noResolution;
  heading=ending.title;story=ending.body;
 }
 return shell(`<span class="eyebrow">${esc(engine.chapterInfo().name)} · ${esc(o.resolution)}</span><h2>${heading}</h2><div class="campaign-narrative">${storyText(story)}</div><div class="test-equation"><div class="test-number">${o.xp}<small>XP</small></div><div class="test-number">${o.mentalTrauma}<small>MENTAL TRAUMA</small></div><div class="test-number">${o.physicalTrauma}<small>PHYSICAL TRAUMA</small></div></div><p>Ghoul Priest: ${o.priestAlive?'còn sống':'đã bị hạ'} · Lita: ${chapter===3&&o.resolution==='R3'?'đã bị hiến tế':o.lita?'có trong bộ bài màn sau':'không có trong bộ bài'}${s.cover?' · Cover Up chưa được giải quyết.':''}</p>${campaignOutcomeExtra(engine)}<div class="actions"><button data-download-log>Tải nhật ký</button><button data-dismiss-outcome>Xem lại bàn chơi</button><button class="primary" data-restart>Chơi ván mới</button></div>`);
}
