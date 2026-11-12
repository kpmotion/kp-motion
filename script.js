/* KP Motion v19 — static site. Folder scan/save lives only in editor.js. */
(() => {
  'use strict';
  const data = window.KP_CONTENT;
  if (!data) { document.body.textContent='Missing content.js'; return; }
  const $ = s => document.querySelector(s);
  const node = (tag, className, text) => {
    const el=document.createElement(tag); if(className)el.className=className;
    if(text!=null)el.textContent=text; return el;
  };
  const ids = () => (data.sectionOrder||[]).filter(id => data.categories?.[id]);
  const url = (...parts) => 'assets/'+parts.map(part=>encodeURIComponent(part)).join('/');
  const noExt = name => String(name).replace(/\.[^.]+$/,'');
  const titleFor = (id, file) => data.workTitles?.[id+'/'+file] || noExt(file).replace(/[_-]+/g,' ');
  // A neutral category label is shown until the owner writes a real description.
  // Never try to infer the actual video's content from its filename.
  const genericDescriptions = {
    intros: 'Intro animation',
    openers: 'Video opener',
    'motion-ads': 'Motion graphics / Advertising'
  };
  const descriptionFor = (id, file) => data.workDescriptions?.[id+'/'+file]?.trim()
    || genericDescriptions[id] || 'Motion graphics';
  const link = url => /^(https?:\/\/|mailto:|tel:)/i.test(String(url||''))?url:'#';
  const fallback = 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="#111619"/><path d="M20 20h920v500H20z" fill="none" stroke="#2c3438" stroke-width="2"/></svg>');
  const posterFor = p => p?url('PREVIEW',p):fallback;
  const project = (id,entry) => entry?.file?{
    id:id+'/'+entry.file, title:titleFor(id,entry.file),
    description:descriptionFor(id,entry.file),
    poster:posterFor(entry.poster),video:url('sections',id,entry.file),section:id,file:entry.file
  }:null;
  const projectsIn = id => (data.items?.[id]||[]).map(e=>project(id,e)).filter(Boolean);
  const featured = () => {
    const byId=new Map(ids().flatMap(id=>projectsIn(id).map(p=>[p.id,p])));
    return (data.featured||[]).map(entry=>{
      const item=byId.get(entry.ref);if(!item)return null;
      return {...item,shortcut:entry.shortcut,
        title:data.featuredTitles?.[entry.shortcut] || item.title,
        description:data.featuredDescriptions?.[entry.shortcut]?.trim() || item.description
      };
    }).filter(Boolean);
  };
  const set = (s,t)=>{const el=$(s);if(el)el.textContent=t??''};
  const heading = (s,lines) => {const el=$(s);if(!el)return;el.replaceChildren();
    (lines||[]).forEach((line,i)=>{if(i)el.append(document.createElement('br'));
      String(line).split(/(\[[^\]]+\])/).forEach(part=>{
        el.append(/^\[[^\]]+\]$/.test(part)?node('em','',part.slice(1,-1)):document.createTextNode(part));
      });
    });
  };
  const playSymbol=()=>node('span','play-icon');
  const addPoster=(container,src,title)=>{
    const img=node('img');img.src=src;img.alt=title;img.loading=container.classList.contains('hero-video')?'eager':'lazy';img.decoding='async';
    img.addEventListener('error',()=>{if(img.src!==fallback)img.src=fallback},{once:true});
    container.append(img);return img;
  };
  // Video has no player controls. Text information lives below the video frame.
  // Native pixel dimensions are used unless the video exceeds the viewport.
  const videoModal=$('#video-modal'),player=$('#modal-player');
  const modalDetails=$('#modal-details'), modalTitle=$('#modal-title'), modalDescription=$('#modal-description');
  let focusReturn=null;
  function fitVideo(){
    if(!player||!videoModal||videoModal.hidden)return;
    const width=player.videoWidth,height=player.videoHeight;
    if(!width||!height)return;
    // Reserve room for the discreet title and 1–2 lines of context.
    const availableWidth=Math.max(160,window.innerWidth-32);
    const availableHeight=Math.max(120,window.innerHeight-130);
    const scale=Math.min(1,availableWidth/width,availableHeight/height);
    const fittedWidth=Math.floor(width*scale);
    player.style.width=fittedWidth+'px';
    player.style.height=Math.floor(height*scale)+'px';
    if(modalDetails)modalDetails.style.width=fittedWidth+'px';
  }
  player?.addEventListener('loadedmetadata',fitVideo);
  window.addEventListener('resize',fitVideo);
  function openVideo(item,control){
    if(!videoModal||!player||!item.video)return;
    focusReturn=control;
    player.pause();player.removeAttribute('src');player.load();
    player.style.width='';player.style.height='';
    if(modalDetails)modalDetails.style.width='';
    if(modalTitle)modalTitle.textContent=item.title||'';
    if(modalDescription)modalDescription.textContent=item.description||'';
    player.src=item.video;
    videoModal.hidden=false;
    document.body.classList.add('modal-open');
    player.focus({preventScroll:true});
    const result=player.play();
    if(result?.catch)result.catch(error=>console.warn('Video playback was blocked or failed:',error));
  }
  function closeVideo(){
    if(!videoModal||videoModal.hidden)return;
    player.pause();player.removeAttribute('src');player.load();
    player.style.width='';player.style.height='';
    if(modalDetails)modalDetails.style.width='';
    videoModal.hidden=true;
    document.body.classList.remove('modal-open');
    focusReturn?.focus({preventScroll:true});
  }
  // No on-screen buttons: Escape or clicking outside the video closes the overlay.
  videoModal?.addEventListener('click',event=>{
    if(event.target===videoModal||event.target?.dataset.close==='true')closeVideo();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeVideo();});
  function videoCard(item,cls='gallery-card'){
    const btn=node('button',cls);btn.type='button';btn.setAttribute('aria-label','Play '+item.title);
    addPoster(btn,item.poster,item.title);btn.append(playSymbol());
    btn.addEventListener('click',()=>openVideo(item,btn));
    // Showreel stays as the original cover (the work gallery cards get captions).
    if(cls==='hero-video')return btn;
    const tile=node('article','project-tile');
    const meta=node('div','project-meta');
    meta.append(node('div','project-title',item.title));
    if(item.description)meta.append(node('p','project-description',item.description));
    tile.append(btn,meta);
    return tile;
  }
  // Row-first masonry: 1-2-3 across, then 4-5-6, while keeping each
  // thumbnail's natural height and without gaps below portrait images.
  const masonryHosts = new Set();
  const masonryCards = new WeakMap();
  let resizeQueued = false;
  function columnCount() {
    return window.innerWidth <= 700 ? 1 : window.innerWidth <= 960 ? 2 : 3;
  }
  function arrangeMasonry(host, force = false) {
    const cards = masonryCards.get(host);
    if (!cards) return;
    const count = columnCount();
    if (!force && host.dataset.columnCount === String(count)) return;
    const columns = Array.from({length: count}, () => node('div', 'masonry-column'));
    cards.forEach((card, index) => columns[index % count].append(card));
    host.replaceChildren(...columns);
    host.dataset.columnCount = String(count);
  }
  function renderGallery(host, items) {
    if (!host) return;
    masonryCards.set(host, items.map(item => videoCard(item)));
    masonryHosts.add(host);
    arrangeMasonry(host, true);
  }
  // Update only when the number of columns changes, not on every resize frame.
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      masonryHosts.forEach(host => {
        if (host.isConnected) arrangeMasonry(host);
        else masonryHosts.delete(host);
      });
    });
  }, {passive:true});
  // Featured and category galleries share captions; Featured can override a caption.
  function renderFeatured(){
    const host=$('#work-list');if(!host)return;
    const items=featured();renderGallery(host,items);
    $('#featured').hidden=!items.length;
  }
  function applyTypography(){
    const root=document.documentElement.style;
    Object.entries(data.typography||{}).forEach(([key,st])=>{
      if(!st)return;const p='--ty-'+key+'-';
      root.setProperty(p+'size',(Number(st.size)||16)+'px');
      root.setProperty(p+'mobile',(Number(st.mobileSize)||Number(st.size)||16)+'px');
      root.setProperty(p+'weight',Number(st.weight)||400);
      root.setProperty(p+'color',st.color||'#f4f4f6');
      root.setProperty(p+'spacing',(Number(st.letterSpacing)||0)+'px');
      root.setProperty(p+'line',Number(st.lineHeight)||1.2);
    });
    // Convert the transitional v19 lime to the restored original brand lime.
    const savedAccent=String(data.site?.accentColor||'#C8FF3D').toUpperCase();
    root.setProperty('--accent',savedAccent==='#D1FB61'?'#C8FF3D':savedAccent);
  }
  // Category images are editable assets; no embedded SVG code in the UI.
  function icon(id){
    const holder=node('span','service-icon');
    const picture=node('img');
    picture.className='service-cube';
    picture.src='assets/icons/categories/'+encodeURIComponent(id)+'.webp';
    picture.alt='';
    picture.setAttribute('aria-hidden','true');
    picture.decoding='async';
    holder.append(picture);
    return holder;
  }
  // Fixed site branding uses the existing external links configured in editor.html.
  function renderHeader(){
    set('#header-brand',data.site?.logoText||'KP MOTION');
    const social=$('#header-social-links');if(!social)return;
    social.replaceChildren();
    (data.socials||[]).filter(s=>s.visible!==false&&s.url).forEach(s=>{
      const a=node('a','social');a.href=link(s.url);a.title=s.label||s.id;
      a.setAttribute('aria-label',s.label||s.id);a.target='_blank';a.rel='noopener noreferrer';
      const img=node('img','social-icon');img.src=url('icons',s.id+'.svg');img.alt='';
      img.addEventListener('error',()=>{img.remove();a.append(node('span','social-fallback',(s.label||s.id).slice(0,2).toUpperCase()))},{once:true});
      a.append(img);social.append(a);
    });
  }
  function renderHome(){const h=data.hero||{},contact=data.contact||{},site=data.site||{};
    set('#hero-eyebrow',h.eyebrow);heading('#hero-title',h.titleLines);set('#hero-summary',h.description);
    const reelHost=$('#showreel-slot');if(reelHost){
      const reel={title:h.showreelTitle||'Showreel',description:h.showreelDescription||'',poster:posterFor(h.showreelPoster),video:h.showreelFile?url('SHOWREEL',h.showreelFile):''};
      const btn=videoCard(reel,'hero-video');
      if(h.showreelLabel)btn.append(node('span','showreel-label',h.showreelLabel));
      if(!reel.video)btn.disabled=true;
      reelHost.replaceChildren(btn);
    }
    const host=$('#services');if(host){host.replaceChildren();
      const visible=ids().filter(id=>data.categories[id]?.visible!==false);
      host.style.setProperty('--cols',String(Math.max(1,visible.length)));
      host.hidden=visible.length===0;
      visible.forEach(id=>{
        const cat=data.categories[id];const a=node('a','service-card');a.href='category.html?id='+encodeURIComponent(id);
        // No background cover: the 3D cube is the sole visual element of the category card.
        a.append(icon(id),node('span','service-title',cat.title),node('span','service-arrow','↗'));
        host.append(a);
      });
    }
    set('#featured-title',site.featuredTitle||'FEATURED WORK');renderFeatured();
    set('#contact-eyebrow',contact.eyebrow);const ch=$('#contact-heading');if(ch){ch.replaceChildren(document.createTextNode(contact.heading||''),document.createElement('br'),node('em','',contact.highlighted||''))}
    set('#contact-description',contact.description);const primary=$('#contact-link');if(primary){primary.href=link(contact.url);primary.hidden=!(contact.button&&contact.url)}
    set('#contact-button-label',contact.button);const secondary=$('#contact-link-2');if(secondary){secondary.textContent=contact.button2||'';secondary.href=link(contact.url2);secondary.hidden=!(contact.button2&&contact.url2)}
    set('#smallprint','© '+new Date().getFullYear()+' '+(site.footer||''));
  }
  function renderCategory(){const id=new URLSearchParams(location.search).get('id');const c=data.categories?.[id],ui=data.ui||{};
    set('#back-top',ui.back||'HOME');set('#back-bottom',ui.back||'HOME');
    set('#brand-top',data.site?.logoText||'KP MOTION');set('#brand-bottom',data.site?.logoText||'KP MOTION');
    set('#category-eyebrow',ui.galleryEyebrow||'SELECTED PROJECTS');
    if(!ids().includes(id)||!c){set('#category-title',ui.missingCategory||'Gallery not found');renderGallery($('#category-gallery'),[]);return}
    set('#category-title',c.title);set('#category-description',c.description||'');
    const items=projectsIn(id);set('#category-count',items.length+' '+(items.length===1?ui.projectsSingular||'PROJECT':ui.projectsPlural||'PROJECTS'));
    renderGallery($('#category-gallery'),items);const e=$('#category-empty');if(e){e.hidden=items.length>0;e.textContent=ui.empty||'No projects yet'}
  }

  // Technical Grid: the grid is fixed; the mouse illuminates ONLY its lines.
  // Unlike earlier versions this does not depend on (hover: hover), (pointer: fine)
  // or reduced-motion settings, which could suppress the effect in some browsers.
  let gridBackground;
  function initTechnicalGrid() {
    if (gridBackground) return;
    gridBackground = document.createElement('div');
    gridBackground.className = 'technical-grid-bg';
    gridBackground.setAttribute('aria-hidden', 'true');
    gridBackground.innerHTML = '<div class="technical-grid-lines"></div><div class="technical-grid-highlight"></div>';
    document.body.prepend(gridBackground);

    let pending = false;
    let cursorX = 0, cursorY = 0;
    function paintCursor() {
      pending = false;
      gridBackground.style.setProperty('--cursor-x', cursorX + 'px');
      gridBackground.style.setProperty('--cursor-y', cursorY + 'px');
    }
    function onMove(event) {
      if (event.pointerType === 'touch' || window.innerWidth <= 700) return;
      cursorX = event.clientX;
      cursorY = event.clientY;
      gridBackground.classList.add('has-pointer');
      if (!pending) {
        pending = true;
        requestAnimationFrame(paintCursor);
      }
    }
    function hide() { gridBackground.classList.remove('has-pointer'); }

    // Mousemove is a fallback for browsers where pointer media detection or
    // pointermove events are unreliable. Duplicate events share one RAF update.
    window.addEventListener('pointermove', onMove, {passive:true});
    window.addEventListener('mousemove', onMove, {passive:true});
    document.documentElement.addEventListener('mouseleave', hide);
    window.addEventListener('blur', hide);
  }

  function render(){applyTypography();renderHeader();
    const categoryName=document.body.dataset.page==='category'
      ?data.categories?.[new URLSearchParams(location.search).get('id')]?.title:'';
    document.title=(categoryName?categoryName+' | ':'')+(data.site?.browserTitle||'KP Motion');
    const meta=$('meta[name="description"]');if(meta)meta.content=data.site?.seoDescription||'';
    if(document.body.dataset.page==='category')renderCategory();else renderHome();
    initTechnicalGrid();
  }
  window.addEventListener('message',event=>{
    if(event.source!==window.parent)return;
    if(event.data?.type==='KP_EDITOR_SYNC'&&event.data.content&&typeof event.data.content==='object'){
      if(JSON.stringify(event.data.content)===JSON.stringify(data))return;
      for(const key of Object.keys(data))delete data[key];Object.assign(data,event.data.content);
      closeVideo();render();
    }
  });
  render();
  if(window.parent!==window)window.parent.postMessage({type:'KP_PREVIEW_READY'},'*');
})();
