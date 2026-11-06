// Presentation coordinates are percentages of a 16:9 plate; they never alter rules.
// The floor is a convex trapezoid below the furniture. Actor anchors mark their feet.
export const FLOOR={top:65,bottom:91,left:12,right:88};
export const ROOMS={
 study:{title:'Study',subtitle:'Cánh cửa đã biến mất.',spawn:[48,85],narration:'Đèn bàn hắt lên những hồ sơ mất tích. Từ dưới sàn, tiếng cào vang lên từng nhịp.',hotspots:[
  {id:'desk',name:'Bàn làm việc',x:25,y:48,stand:[34,77],kind:'investigate',detail:'Lục tìm hồ sơ và những ghi chú còn dang dở.'},
  {id:'books',name:'Giá sách',x:57,y:30,stand:[53,71],kind:'investigate',detail:'Những trang sách nhắc đến các nghi thức cổ xưa.'},
  {id:'rug',name:'Tấm thảm',x:53,y:77,stand:[43,86],kind:'advance',detail:'Một mép thảm bị xô lệch. Có thứ gì đó bên dưới.'},
  {id:'fire',name:'Lò sưởi',x:90,y:43,stand:[75,77],kind:'look',detail:'Tro vẫn còn ấm. Luồng khí lạnh đang thổi vào từ nơi khác.'}
 ]},
 hallway:{title:'Hallway',subtitle:'Đất bùn dưới chân. Lửa ở cuối hành lang.',spawn:[48,84],narration:'Ngôi nhà đang biến đổi. Mùi gỗ cháy trộn lẫn với mùi đất ẩm và mục rữa.',hotspots:[
  {id:'attic-exit',name:'Lên Attic',x:16,y:43,stand:[27,75],kind:'move',to:'attic'},
  {id:'cellar-exit',name:'Xuống Cellar',x:82,y:63,stand:[74,81],kind:'move',to:'cellar'},
  {id:'parlor-exit',name:'Cửa Parlor',x:53,y:36,stand:[50,71],kind:'move',to:'parlor'},
  {id:'barrier',name:'Rào chắn',x:56,y:52,stand:[54,76],kind:'barrier',detail:'Ngọn lửa thiêu rụi mọi thứ chạm vào nó. Có thể tìm cách dập lửa ở Attic và Cellar.'}
 ]},
 attic:{title:'Attic',subtitle:'Gỗ cũ. Bụi lạnh. Mùi thịt thối.',spawn:[48,85],narration:'Dưới những vì kèo, một vật nặng đong đưa rất khẽ. Bước vào đây nhận 1 horror.',hotspots:[
  {id:'trunks',name:'Những chiếc rương',x:24,y:53,stand:[32,77],kind:'investigate',detail:'Lần theo những dấu vết giữa đống đồ phủ bụi.'},
  {id:'barrel',name:'Chiếc thùng gỗ',x:65,y:57,stand:[61,79],kind:'investigate',detail:'Một chiếc thùng có thể giúp chuyển băng từ tầng hầm.'},
  {id:'hall-exit',name:'Về Hallway',x:89,y:51,stand:[81,78],kind:'move',to:'hallway'}
 ]},
 cellar:{title:'Cellar',subtitle:'Cái lạnh này không thuộc về mùa hạ.',spawn:[46,85],narration:'Tường gạch hóa thành những đường hầm băng. Bước vào đây nhận 1 damage.',hotspots:[
  {id:'shelves',name:'Kệ chai lọ',x:29,y:47,stand:[34,75],kind:'investigate',detail:'Băng phủ lên những dấu móng vuốt trong đá.'},
  {id:'ice',name:'Băng tuyết',x:78,y:57,stand:[70,80],kind:'investigate',detail:'Một hơi lạnh buốt xuyên qua lớp áo khoác.'},
  {id:'hall-exit',name:'Lên Hallway',x:14,y:43,stand:[24,75],kind:'move',to:'hallway'}
 ]},
 parlor:{title:'Parlor',subtitle:'Một ngọn đuốc trong ngôi nhà tối.',spawn:[42,85],narration:'Phía ngoài cửa là đêm mưa Arkham. Lita biết nhiều hơn những gì cô ấy nói.',hotspots:[
  {id:'hall-exit',name:'Về Hallway',x:9,y:48,stand:[23,79],kind:'move',to:'hallway'},
  {id:'front-exit',name:'Chạy ra ngoài',x:92,y:46,stand:[81,78],kind:'resign',detail:'Rút lui khỏi màn chơi bằng cửa trước.'}
 ]}
};
export function sceneRoom(engine,id) {
 const base=ROOMS[id];
 if(base)return base;
 const s=engine.s, location=s.locations[id];
 const links=location.links.filter(next=>s.locations[next]);
 const hotspots=links.map((to,index)=>({
  id:'exit-'+to, name:s.locations[to].name, kind:'move', to,
  x:12+76*(index+1)/(links.length+1),y:46,stand:[46,79]
 }));
 hotspots.push({id:'search-area',name:'Điều tra địa điểm',kind:'investigate',x:44,y:66,stand:[44,79]});
 return {title:location.name,spawn:[46,83],hotspots,subtitle:location.revealed?(engine.card(location.code).subname??''):'',
  narration:engine.chapterInfo().intro};
}
export function monsterArt(code,card){
 if(code==='01159')return 'rats';
 if(code==='01116')return 'priest';
 if(code==='01157')return 'umordhoth';
 if(card?.traits?.includes('Cultist'))return 'cultist';
 if(['01172','01175'].includes(code))return 'nightgaunt';
 return 'ghoul';
}
export function enemyPosition(index){const points=[[69,82],[82,72],[75,91],[58,72],[87,89],[60,92]];return points[index%points.length];}
