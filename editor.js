/* KP Motion v19 — tiny, folder-driven text editor. */
(()=>{
  'use strict';
  const original=window.KP_CONTENT;
  if(!original){document.querySelector('#panel').textContent='Missing content.js';return}
  const clone=v=>JSON.parse(JSON.stringify(v));
  let state=clone(original),folder=null,active='sync',selected='intros',previewSection='intros',previewPage='home',previewReady=false,busy=false;
  if(state.site && String(state.site.accentColor||'').toUpperCase()==='#D1FB61')state.site.accentColor='#C8FF3D';
  state.workDescriptions=state.workDescriptions||{};
  state.featuredDescriptions=state.featuredDescriptions||{};
  state.featuredTitles=state.featuredTitles||{};
  state.workTitles=state.workTitles||{};
  const $=s=>document.querySelector(s),panel=$('#panel');
  const ids=()=>state.sectionOrder.filter(id=>state.categories[id]);
  const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
  const natural=(a,b)=>collator.compare(a,b);
  const stem=s=>String(s).replace(/\.[^.]+$/,'');
  const title=s=>stem(s).replace(/[_-]+/g,' ');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify=(t,isError=false)=>{const el=$('#status');el.textContent=t;el.style.color=isError?'#ffad9e':'#C8FF3D'};
  const intro=(t,d)=>`<h2>${esc(t)}</h2><p class="intro">${esc(d)}</p>`;
  const get=p=>p.split('.').reduce((v,k)=>v?.[k],state);
  const field=(p,label,kind='text')=>{
    const v=get(p)??'',id='field-'+p.replace(/[^a-z0-9]/gi,'-');
    if(kind==='checkbox')return `<div class="field check"><input type="checkbox" id="${id}" data-path="${esc(p)}" ${v?'checked':''}><label for="${id}">${esc(label)}</label></div>`;
    const control=kind==='textarea'?`<textarea id="${id}" rows="3" data-path="${esc(p)}">${esc(v)}</textarea>`:`<input id="${id}" type="text" data-path="${esc(p)}" value="${esc(v)}">`;
    return `<div class="field"><label for="${id}">${esc(label)}</label>${control}</div>`;
  };
  const arrows=(id,index,length)=>`<div class="rowactions" aria-label="Порядок отображения"><button data-action="top" data-list="${esc(id)}" data-index="${index}" ${index===0?'disabled':''} title="В самый верх" aria-label="Переместить в начало">TOP</button><button data-action="up" data-list="${esc(id)}" data-index="${index}" ${index===0?'disabled':''} title="На одну позицию вверх" aria-label="Вверх">↑</button><button data-action="down" data-list="${esc(id)}" data-index="${index}" ${index===length-1?'disabled':''} title="На одну позицию вниз" aria-label="Вниз">↓</button><button data-action="bottom" data-list="${esc(id)}" data-index="${index}" ${index===length-1?'disabled':''} title="В самый низ" aria-label="Переместить в конец">BOTTOM</button></div>`;
  function syncPanel(){return intro('Контент','Папки — источник истины. Никакой ручной регистрации файлов или изменения имён.')+
    `<div class="notice">Видео: <b>assets/sections/intros</b>, <b>openers</b>, <b>motion-ads</b>.<br>Превью: <b>assets/PREVIEW</b> (имя видео + .webp).<br>Featured: <b>assets/FEATURED WORK</b> (.txt с путём относительно sections).<br>Нажми «ОБНОВИТЬ КОНТЕНТ»: список синхронизируется и сохраняется в content.js.</div>`+
    `<button class="secondary" data-action="choose-folder">${folder?'Сменить папку сайта':'Выбрать папку сайта'}</button><p class="muted">${folder?'Папка: '+esc(folder.name):'Папка ещё не выбрана'}</p>`+
    `<button class="primary sync-button" data-action="sync" ${busy?'disabled':''}>ОБНОВИТЬ КОНТЕНТ</button><div class="line"></div>`+
    ids().map(id=>`<div class="tile"><div class="tile-head"><b>${esc(state.categories[id].title)}</b><span class="muted">${state.items?.[id]?.length||0} MP4</span></div><div class="muted">assets/sections/${esc(id)}/</div></div>`).join('')+
    `<div class="tile"><b>Featured Work: ${(state.featured||[]).length}</b><p class="muted">В TXT-файле укажи, например: intros/BBM.mp4. Windows .lnk не поддерживается.</p></div>`;}
  function heroPanel(){return intro('Главная','Текст и названия. Showreel определяется по первому MP4 в assets/SHOWREEL.')+
    field('hero.eyebrow','Подпись')+'<h3>Заголовок</h3>'+(state.hero.titleLines||[]).map((_,i)=>field('hero.titleLines.'+i,'Строка '+(i+1))).join('')+
    field('hero.description','Описание','textarea')+field('hero.showreelTitle','Название Showreel')+field('hero.showreelDescription','Описание Showreel в окне просмотра','textarea')+field('hero.showreelLabel','Подпись Showreel');}
  function categoriesPanel(){return intro('Разделы','Оставлены только Intros, Openers и Motion Ads. Здесь можно отключать разделы и менять текст.')+
    ids().map(id=>`<div class="tile"><div class="tile-head"><b>${esc(state.categories[id].title)}</b></div><p class="muted">assets/sections/${esc(id)}/</p>${field('categories.'+id+'.visible','Показывать на главной','checkbox')}${field('categories.'+id+'.title','Название карточки')}${field('categories.'+id+'.description','Описание страницы','textarea')}</div>`).join('');}
  function worksPanel(){if(!ids().includes(selected))selected=ids()[0];const list=state.items?.[selected]||[];
    return intro('Работы','Редактируй название, описание и порядок. Подпись показывается под видео и в окне просмотра. MP4 и WebP берутся из папок.')+
    `<div class="field"><label>Раздел</label><select id="select-work">${ids().map(id=>`<option value="${esc(id)}" ${selected===id?'selected':''}>${esc(state.categories[id].title)}</option>`).join('')}</select></div>`+
    `<button data-action="natural" data-list="${esc(selected)}">Сортировать по имени (1, 2, 10)</button> <span class="muted">${list.length} работ</span><div class="line"></div>`+
    (list.map((it,i)=>`<div class="tile"><div class="tile-head"><div><b>${esc(it.file)}</b><div class="muted">${esc(it.poster||'Превью отсутствует')}</div></div>${arrows(selected,i,list.length)}</div><div class="field"><label>Название работы</label><input data-title="${esc(selected+'/'+it.file)}" value="${esc(state.workTitles?.[selected+'/'+it.file]||title(it.file))}"></div><div class="field"><label>Краткое описание (1–2 строки)</label><textarea rows="2" data-description="${esc(selected+'/'+it.file)}" placeholder="Например: Logo reveal · Kinetic typography">${esc(state.workDescriptions?.[selected+'/'+it.file]||'')}</textarea></div></div>`).join('')||'<p class="muted">В разделе пока нет MP4.</p>');}
  function featuredPanel(){const list=state.featured||[];
    return intro('Featured Work','Подписи по умолчанию наследуются из «Работы». Здесь можно изменить их отдельно для Featured Work или оставить поля пустыми.')+
    `<button data-action="natural" data-list="FEATURED">Сортировать по имени (1, 2, 10)</button> <span class="muted">${list.length} работ</span><div class="line"></div>`+
    (list.map((it,i)=>`<div class="tile"><div class="tile-head"><div><b>${esc(it.shortcut)}</b><div class="muted">${esc(it.ref)}</div></div>${arrows('FEATURED',i,list.length)}</div><div class="field"><label>Отдельное название (необязательно)</label><input data-featured-title="${esc(it.shortcut)}" value="${esc(state.featuredTitles?.[it.shortcut]||'')}" placeholder="Название из раздела"></div><div class="field"><label>Отдельное описание (необязательно)</label><textarea rows="2" data-featured-description="${esc(it.shortcut)}" placeholder="Описание из раздела">${esc(state.featuredDescriptions?.[it.shortcut]||'')}</textarea></div></div>`).join('')||'<p class="muted">Добавь *.txt в assets/FEATURED WORK и синхронизируй.</p>');}
  function socialsPanel(){return intro('Соцсети','Внешние ссылки и кнопки без изменений в медиа.')+
    (state.socials||[]).map((s,i)=>`<div class="tile"><b>${esc(s.label)}</b>${field('socials.'+i+'.visible','Показывать','checkbox')}${field('socials.'+i+'.label','Название')}${field('socials.'+i+'.url','URL')}</div>`).join('');}
  function contactPanel(){return intro('Контакты','Тексты и ссылки двух кнопок.')+field('contact.eyebrow','Подпись')+field('contact.heading','Заголовок')+field('contact.highlighted','Акцент')+field('contact.description','Описание','textarea')+field('contact.button','Первая кнопка')+field('contact.url','Ссылка 1')+field('contact.button2','Вторая кнопка')+field('contact.url2','Ссылка 2');}
  function sitePanel(){return intro('Сайт','Заголовки и SEO; стили управляются в style.css.')+field('site.browserTitle','Заголовок вкладки')+field('site.seoDescription','SEO-описание','textarea')+field('site.featuredTitle','Название Featured')+field('site.footer','Подпись внизу')+field('site.logoText','Текст бренда');}
  function browserPanel(){const secure=window.isSecureContext,picker=typeof window.showDirectoryPicker==='function';
    return intro('Проверка браузера','Проверка поддержки доступа к папкам сайта.')+
    `<div class="tile"><b>Текущая среда</b><p class="muted">${esc(navigator.userAgent)}</p>`+
    `<p>File System Access: <b>${picker?'OK':'НЕТ'}</b></p><p>Secure Context: <b>${secure?'Да':'Нет'}</b></p>`+
    `<p>Рабочая область: <b>${innerWidth} × ${innerHeight}</b></p></div>`+
    `<div class="notice">Прокрутка стандартная, без замедления. Для синхронизации файлов необходима поддержка доступа к локальной папке.</div>`;}
  const views={sync:syncPanel,hero:heroPanel,categories:categoriesPanel,works:worksPanel,featured:featuredPanel,socials:socialsPanel,contact:contactPanel,site:sitePanel,browser:browserPanel};
  function render(){panel.innerHTML=views[active]();
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===active));
    const idsNow=ids();if(!idsNow.includes(previewSection))previewSection=idsNow[0];
    const select=$('#preview-category');select.innerHTML=idsNow.map(id=>`<option value="${esc(id)}" ${id===previewSection?'selected':''}>${esc(state.categories[id].title)}</option>`).join('');
    select.hidden=previewPage!=='category';$('#preview-caption').textContent=(previewPage==='home'?'Главная':state.categories?.[previewSection]?.title||'Раздел')+' · '+($('#preview').classList.contains('mobile')?'Mobile':'Desktop');
  }
  // Preview may contain dozens of media cards; avoid redrawing them on every keystroke.
  let liveTimer=null;
  const live=()=>{if(!previewReady)return;
    clearTimeout(liveTimer);
    liveTimer=setTimeout(()=>{
      if(previewReady)$('#preview').contentWindow.postMessage({type:'KP_EDITOR_SYNC',content:clone(state)},'*');
    },120);
  };
  const changed=()=>{notify('Изменения не сохранены. Нажми «Сохранить».');live()};
  function move(which,i,target){
    const list=which==='FEATURED'?state.featured:state.items?.[which];
    if(!Array.isArray(list)||!Number.isInteger(i)||i<0||i>=list.length)return;
    const j=target==='top'?0:target==='bottom'?list.length-1:i+target;
    if(!Number.isInteger(j)||j<0||j>=list.length||j===i)return;
    const [item]=list.splice(i,1);
    list.splice(j,0,item);
    state.customOrder=state.customOrder||{};
    state.customOrder[which]=true;
    changed();render();
  }
  function sort(which){const list=which==='FEATURED'?state.featured:state.items?.[which];if(!list)return;
    list.sort((a,b)=>natural(which==='FEATURED'?a.shortcut:a.file,which==='FEATURED'?b.shortcut:b.file));delete state.customOrder[which];changed();render()}
  async function choose(){if(!window.showDirectoryPicker)throw Error('В Opera/Chrome нет доступа к выбору папки. Открой редактор через localhost или обнови браузер.');
    const picked=await window.showDirectoryPicker({mode:'readwrite'});
    try{await picked.getFileHandle('index.html');await picked.getFileHandle('content.js');await picked.getDirectoryHandle('assets')}catch{throw Error('Выбери папку проекта с index.html, content.js и assets.')}folder=picked;render();notify('Папка выбрана: '+folder.name);}
  async function ensure(){if(!folder)await choose();return folder}
  async function save(){const dir=await ensure(),f=await dir.getFileHandle('content.js'),w=await f.createWritable();
    try{await w.write('/* KP Motion v19 */\nwindow.KP_CONTENT = '+JSON.stringify(state,null,2)+';\n');await w.close()}catch(e){try{await w.abort()}catch{};throw e}
    notify('Сохранено в content.js · '+dir.name);live()}
  function download(){const b=new Blob(['/* KP Motion v19 */\nwindow.KP_CONTENT = '+JSON.stringify(state,null,2)+';\n'],{type:'application/javascript;charset=utf-8'});
    const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='content.js';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
  async function filesIn(dir,rx){const out=[];for await(const [name,handle] of dir.entries())if(handle.kind==='file'&&rx.test(name))out.push(name);return out.sort(natural)}
  function merge(existing,fresh,manual,key){if(!manual)return fresh;const byKey=new Map(fresh.map(x=>[x[key],x]));const keep=(existing||[]).map(x=>byKey.get(x[key])).filter(Boolean);const seen=new Set(keep.map(x=>x[key]));return keep.concat(fresh.filter(x=>!seen.has(x[key])))}
  const aliases={logo:'intros',intro:'openers',promo:'motion-ads'};
  function normalizeRef(raw){let v=raw.trim().split(/\r?\n/)[0].trim().replaceAll('\\','/').replace(/^\.\//,'').replace(/^assets\//i,'').replace(/^sections\//i,'');
    if(v.startsWith('/')||v.includes('..')||v.includes(':'))return '';
    const slash=v.indexOf('/');if(slash<0)return '';const id=v.slice(0,slash);return (aliases[id]||id)+v.slice(slash)}
  async function scan(){if(busy)return;busy=true;
    try{const dir=await ensure(),assets=await dir.getDirectoryHandle('assets'),sections=await assets.getDirectoryHandle('sections'),posters=await assets.getDirectoryHandle('PREVIEW'),featuredDir=await assets.getDirectoryHandle('FEATURED WORK'),showreelDir=await assets.getDirectoryHandle('SHOWREEL');
      const next=clone(state),warnings=[],posterNames=await filesIn(posters,/\.webp$/i),posterIndex=new Map();
      for(const f of posterNames){const key=stem(f).toLowerCase();if(posterIndex.has(key))warnings.push('Повторяющееся имя превью: '+f);else posterIndex.set(key,f)}
      next.items=next.items||{};next.customOrder=next.customOrder||{};
      const refs=new Set();let count=0;
      for(const id of ids()){
        let section;
        try{section=await sections.getDirectoryHandle(id)}catch{throw Error('Не найдена папка assets/sections/'+id+'. Создай её перед синхронизацией.')}
        const files=await filesIn(section,/\.mp4$/i);
        const fresh=files.map(file=>{const poster=posterIndex.get(stem(file).toLowerCase())||'';if(!poster)warnings.push('Нет превью для '+id+'/'+file);return {file,poster}});
        next.items[id]=merge(next.items[id],fresh,next.customOrder[id],'file');count+=files.length;
        next.items[id].forEach(item=>refs.add(id+'/'+item.file));
      }
      const shortcutFiles=await filesIn(featuredDir,/\.(txt|ref|lnk)$/i),freshFeatured=[];
      for(const short of shortcutFiles){if(/\.lnk$/i.test(short)){warnings.push('Windows .lnk не поддерживается: '+short);continue}
        const file=await (await featuredDir.getFileHandle(short)).getFile(),ref=normalizeRef(await file.text());
        if(!ref||!refs.has(ref)){warnings.push('Недействительная ссылка FEATURED: '+short+' → '+ref);continue}
        freshFeatured.push({shortcut:short,ref});
      }
      next.featured=merge(next.featured,freshFeatured,next.customOrder.FEATURED,'shortcut');
      const reels=await filesIn(showreelDir,/\.mp4$/i);
      next.hero.showreelFile=reels[0]||'';next.hero.showreelPoster=reels[0]?posterIndex.get(stem(reels[0]).toLowerCase())||'':'';
      if(reels.length>1)warnings.push('В SHOWREEL несколько MP4, выбран первый');
      if(reels.length&&!next.hero.showreelPoster)warnings.push('Нет превью Showreel');
      state=next;await save();render();live();
      const message='Синхронизировано '+count+' видео, '+next.featured.length+' Featured.';
      notify(message+(warnings.length?' Предупреждений: '+warnings.length:''));
      if(warnings.length)alert(message+'\n\n'+warnings.slice(0,15).join('\n'));
    }finally{busy=false}}
  async function action(f){try{await f()}catch(e){if(e?.name==='AbortError')return;notify('Ошибка: '+e.message,true);alert('Ошибка: '+e.message)}}
  panel.addEventListener('input',e=>{const el=e.target;
    if(el.dataset.path){const parts=el.dataset.path.split('.');let at=state;for(let i=0;i<parts.length-1;i++)at=at[parts[i]];at[parts.at(-1)]=el.type==='checkbox'?el.checked:el.value;changed()}
    if(el.dataset.title){state.workTitles[el.dataset.title]=el.value;changed()}
    if(el.dataset.description){state.workDescriptions[el.dataset.description]=el.value;changed()}
    if(el.dataset.featuredTitle){state.featuredTitles[el.dataset.featuredTitle]=el.value;changed()}
    if(el.dataset.featuredDescription){state.featuredDescriptions[el.dataset.featuredDescription]=el.value;changed()}
  });
  panel.addEventListener('change',e=>{if(e.target.id==='select-work'){selected=e.target.value;render()}});
  panel.addEventListener('click',e=>{const button=e.target.closest('button[data-action]');if(!button)return;
    const op=button.dataset.action;
    if(op==='choose-folder')action(choose);if(op==='sync')action(scan);
    if(['top','up','down','bottom'].includes(op))move(button.dataset.list,Number(button.dataset.index),op==='top'||op==='bottom'?op:(op==='up'?-1:1));
    if(op==='natural')sort(button.dataset.list);
  });
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.tab;render()}));
  $('#choose-folder-top').addEventListener('click',()=>action(choose));$('#sync-top').addEventListener('click',()=>action(scan));$('#save-folder').addEventListener('click',()=>action(save));$('#download').addEventListener('click',download);
  $('#restore').addEventListener('click',()=>{if(!confirm('Сбросить несохранённые изменения?'))return;state=clone(original);changed();render()});
  function preview(){previewReady=false;$('#preview').src=previewPage==='home'?'index.html?preview=19-masonry-hover-20261112':'category.html?id='+encodeURIComponent(previewSection)+'&preview=19-masonry-hover-20261112';render()}
  document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{previewPage=b.dataset.page;document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('selected',x===b));preview()}));
  $('#preview-category').addEventListener('change',e=>{previewSection=e.target.value;preview()});
  document.querySelectorAll('[data-viewport]').forEach(b=>b.addEventListener('click',()=>{$('#preview').classList.toggle('mobile',b.dataset.viewport==='mobile');document.querySelectorAll('[data-viewport]').forEach(x=>x.classList.toggle('selected',x===b));render()}));
  $('#reload-preview').addEventListener('click',preview);
  window.addEventListener('message',e=>{
    if(e.source!==$('#preview').contentWindow)return;
    if(e.data?.type==='KP_PREVIEW_READY'){previewReady=true;live()}
  });
  render();
})();
