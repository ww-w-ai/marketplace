// ww-w Slide Gen deck builder. Origin: https://github.com/ww-w-ai/ax-lecture deck engine (MIT).
const fs = require('fs');
const path = require('path');
const { validateConfig, compileCss, embedMarkup, escapeHtml } = require('./assets.js');
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'html');
const profileArg = process.argv.indexOf('--config');
const configPath = profileArg < 0 ? path.join(ROOT, 'deck.config.json') : path.resolve(process.argv[profileArg + 1]);
const CFG = JSON.parse(fs.readFileSync(configPath, 'utf8'));
validateConfig(CFG);
// Editor UI language: "auto" detects from the browser at runtime, "en"/"ko" pin it. Any other value falls back to "auto".
const UI_LANG = ['auto', 'en', 'ko'].includes(CFG.uiLang) ? CFG.uiLang : 'auto';
const SLIDES = CFG.slides;
const styles = CFG.stylesheets.map(file => compileCss(path.join(HTML, file), ROOT)).join('\n');
const notices = ['LICENSE', 'assets/fonts/OFL.txt'].map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n').replace(/--/g, '—');
const applyBrand = html => html.replace(/\{\{footerBrand\}\}/g, () => escapeHtml(CFG.footerBrand));

function extractSection(file) {
  const full = path.join(HTML, file);
  if (!fs.existsSync(full)) throw new Error('Missing slide: ' + file);
  const html = fs.readFileSync(full, 'utf8');
  const m = html.match(/<section class="slide[^"]*"[\s\S]*?<\/section>/);
  if (!m) throw new Error(`no <section class="slide"> in ${file}`);
  return m[0];
}

function slideMarkup(s, idx) {
  // Footer page number is auto-injected from the deck position (1-based); overrides any hardcoded
  // s-pagenum in the page file. (Image slides carry a baked-in number, so they're skipped.)
  const pageNo = idx + 1;
  if (s.file) {
    let sec = extractSection(s.file);
    if (sec) {
      // Position-based auto numbering (overrides the hardcoded value)
      sec = sec.replace(/(<span class="s-pagenum">)[^<]*(<\/span>)/, '$1' + pageNo + '$2');
      sec = sec.replace(/<section class="slide/, '<section data-idx="' + idx + '" class="slide');
      return '      <!-- ' + s.file + ' -->\n      ' + sec.replace(/\n/g, '\n      ');
    }
    // Fallback
  }
  const src = escapeHtml(s.img);
  return `      <!-- image ${src} -->\n      <section data-idx="${idx}" class="slide"><img class="s-bg" src="${src}" alt=""></section>`;
}

const sectionsHtml = SLIDES.map((s, idx) => slideMarkup(s, idx)).join('\n\n')
  // Cache-bust (always): append the file's mtime as ?v= to image URLs. If a file's content changes
  // (regeneration or renumbering can put different content under the same filename), the mtime differs
  // so the browser re-fetches it; unchanged files keep their cache (precise invalidation).
  .replace(/\bsrc="(\.\.\/(?:final|generated)\/[^"?]+)"/g, (m, url) => {
    try { const v = Math.floor(fs.statSync(path.join(HTML, url)).mtimeMs); return `src="${url}?v=${v}"`; }
    catch { return m; }
  })
  // Performance: keep slide images as data-src so HTML parsing doesn't eager-load ~70MB immediately.
  // The runtime window manager (setWindow) assigns src only to the current ±2 slides and releases the rest.
  .replace(/<img\b([^>]*?)\ssrc=/g, '<img$1 data-src=');

const deck = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(CFG.deckTitle)}</title>
<!-- ${notices} -->
<style>${styles}</style>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{height:100%;background:#0a0a0a;overflow:hidden;font-family:var(--sans);}
  /* Scale the whole 16:9 slide to fit the viewport. Absolute position + translate(-50%,-50%) centers it */
  #stage{position:fixed;inset:0;overflow:hidden;background:#0a0a0a;}
  #viewport{position:absolute;top:50%;left:50%;width:1920px;height:1080px;overflow:hidden;background:#fff;
            box-shadow:0 12px 70px rgba(0,0,0,.55);transform-origin:center center;}
  #track{position:absolute;top:0;left:0;height:1080px;display:flex;
         transition:transform .45s cubic-bezier(.45,0,.2,1);}
  #track>.slide{box-shadow:none;}
  /* Step-by-step reveal within a slide (fragment) */
  .frag{opacity:0;transition:opacity .55s ease;}
  .frag.shown{opacity:1;}
  #print-pages{display:none;}   /* Print-expansion clone container — hidden on screen, shown only under @media print (pp-on) */
  /* Images outside the load window: hide instead of a broken-icon (reappears once loaded) */
  img[data-src]:not([src]){visibility:hidden;}
  /* Left/right nav zones */
  .nav{position:fixed;top:0;bottom:0;width:11%;border:0;background:transparent;cursor:pointer;z-index:10;
       display:flex;align-items:center;justify-content:center;color:#fff;opacity:0;transition:opacity .2s;}
  body:hover .nav{opacity:.55;}
  .nav:hover{opacity:1!important;background:rgba(0,0,0,.06);}
  .nav.prev{left:0;justify-content:flex-start;padding-left:22px;}
  .nav.next{right:0;justify-content:flex-end;padding-right:22px;}
  .nav span{font-size:46px;line-height:1;text-shadow:0 1px 6px rgba(0,0,0,.5);}
  /* Hide the nav zones while edit mode (E) is active (page-nav lock itself is handled in JS) */
  body.editing .nav{display:none!important;}
  /* Format toolbar for the current text selection */
  #fmtbar{position:fixed;z-index:60;display:none;gap:2px;align-items:center;
    background:#1c1c1f;border:1px solid #3a3a3e;border-radius:10px;padding:5px 7px;
    box-shadow:0 8px 28px rgba(0,0,0,.45);font-family:var(--sans);}
  #fmtbar.on{display:flex;}
  #fmtbar button{min-width:32px;height:30px;border:0;background:transparent;color:#ededed;
    font-size:15px;border-radius:6px;cursor:pointer;padding:0 7px;line-height:30px;}
  #fmtbar button:hover{background:#37373c;}
  #fmtbar button.sw{min-width:22px;width:22px;height:22px;border-radius:50%;padding:0;border:1px solid #666;}
  #fmtbar i{width:1px;height:20px;background:#3a3a3e;margin:0 4px;display:inline-block;}
  #fmtbar select{height:28px;background:#2a2a2e;color:#ededed;border:1px solid #4a4a4e;border-radius:6px;font-size:13px;padding:0 6px;cursor:pointer;max-width:170px;font-family:var(--sans);}
  #fmtbar input[type=color]{width:26px;height:26px;padding:0;border:1px solid #4a4a4e;border-radius:50%;background:#2a2a2e;cursor:pointer;overflow:hidden;}
  #fmtbar input[type=color]::-webkit-color-swatch-wrapper{padding:2px;}
  #fmtbar input[type=color]::-webkit-color-swatch{border:none;border-radius:50%;}
  #fmtbar #fmtrecent{display:inline-flex;gap:3px;align-items:center;}
  #fmtbar .sw.empty{background:transparent!important;border:1px dashed #4a4a4e;cursor:default;opacity:.55;}
  #counter{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:#fff;
           background:rgba(0,0,0,.42);padding:6px 16px;border-radius:999px;font-size:15px;
           letter-spacing:.04em;z-index:10;opacity:.5;transition:opacity .2s;}
  body:hover #counter{opacity:1;}
  /* ===== Edit mode (toggled with E) ===== */
  body.editing #track{transition:none;}
  body.editing .slide > *{outline:1px dashed rgba(230,0,18,.45);cursor:move;}
  body.editing .slide > *.sel{outline:2px solid #E60012;}
  /* Direct text editing (double-click) */
  .slide > *[contenteditable="true"]{outline:2px solid #0B5FD9!important;cursor:text!important;}
  body.text-editing .slide > *{cursor:default;}
  /* Image crop frame — puts the original image in a clip window for live cropping (rounded + outline). Edit: Shift+drag = pan / wheel = zoom / corner = resize the window */
  .imgframe{ position:absolute; overflow:hidden; border-radius:18px;
    box-shadow:0 0 0 1.5px rgba(0,0,0,.09), 0 16px 44px rgba(0,0,0,.12); }
  .imgframe > img{ position:absolute; display:block; max-width:none; user-select:none; -webkit-user-drag:none; }
  body.editing .imgframe{ cursor:move; }
  body.editing .imgframe.sel{ outline:2px solid #E60012; outline-offset:-2px; }
  body.editing .imgframe.sel::after{ content:"Corner ● proportional resize (with content) · Right/bottom ○ frame size only (crop) · Shift+drag to pan · Wheel to zoom · X to cover"; position:absolute; left:0; top:0;
    background:#0B5FD9; color:#fff; font-size:15px; font-weight:700; padding:3px 8px; border-radius:0 0 8px 0; pointer-events:none; z-index:5; }
  html[data-ui-lang="ko"] body.editing .imgframe.sel::after{ content:"모서리● 비율크기(콘텐츠 함께) · 우/하○ 창 크기만(크롭) · Shift+드래그 이동 · 휠 확대 · X 덮개"; }
  /* Cover (patch) tool — a rectangle that covers any part of the slide (white by default, changeable via the color picker). Covers outside the frame too. Turning X off returns to normal edit (move/resize/delete) */
  .patch{ position:absolute; z-index:20; background:#fff; background-size:100% 100%; background-position:center; background-repeat:no-repeat; }
  body.erasing{ cursor:crosshair; }
  body.erasing #track, body.erasing #track *{ cursor:crosshair !important; } /* Cover mode: keep the cursor consistent whether over or outside an image */
  body.erasing .patch{ pointer-events:auto; outline:1px dashed rgba(11,95,217,.6); outline-offset:-1px; }
  body.editing:not(.erasing) .patch{ cursor:move; }
  body.erasing #edit-hud::after{ content:" · Cover ON (drag to draw · Alt+click to delete · X to exit → move/resize)"; color:#7FE0FF; }
  html[data-ui-lang="ko"] body.erasing #edit-hud::after{ content:" · 덮개 ON (드래그=그리기 · Alt+클릭=삭제 · X 종료 → 이동/크기)"; }
  /* Cover toolbar (shown in cover mode) */
  #cover-bar{position:fixed;top:52px;left:50%;transform:translateX(-50%);display:none;z-index:52;
    align-items:center;gap:8px;background:rgba(0,0,0,.86);color:#fff;padding:6px 10px;border-radius:10px;
    font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.4);}
  body.erasing #cover-bar{display:flex;}
  #cover-bar .cb-lb{font-weight:700;opacity:.85;}
  #cover-bar input[type=color]{width:26px;height:22px;padding:0;border:1px solid rgba(255,255,255,.4);border-radius:5px;background:none;cursor:pointer;}
  #cover-bar .cb-btn{font:inherit;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:6px;padding:3px 9px;cursor:pointer;}
  #cover-bar .cb-btn.on{background:#0B5FD9;border-color:#0B5FD9;}
  #cover-bar .cb-hint{opacity:.6;font-size:12px;}

  /* Page-move mode — shrunk filmstrip (shows neighbors) + highlights the slide being moved */
  #viewport{transition:transform .3s cubic-bezier(.45,0,.2,1);}
  body.moving #viewport{overflow:visible;}
  body.moving #track{transition:transform .28s cubic-bezier(.45,0,.2,1);}
  body.moving #track>.slide{opacity:.5;outline:2px solid rgba(0,0,0,.14);outline-offset:-2px;}
  body.moving #track>.slide.cur{opacity:1;outline:6px solid #0B5FD9;outline-offset:-6px;box-shadow:0 24px 80px rgba(0,0,0,.55);}
  #edit-hud{position:fixed;top:10px;left:50%;transform:translateX(-50%);display:none;
    background:rgba(0,0,0,.82);color:#fff;padding:8px 16px;border-radius:8px;font-size:14px;z-index:50;white-space:nowrap;}
  #rz-handle{position:fixed;width:16px;height:16px;background:#E60012;border:2px solid #fff;border-radius:50%;
    cursor:nwse-resize;z-index:51;display:none;box-shadow:0 1px 4px rgba(0,0,0,.4);} /* Filled dot = proportional scale (with content) */
  /* Hollow dot = crop only (frame size only, content fixed). Left = width · bottom = height */
  .rz-crop{position:fixed;width:15px;height:15px;background:#fff;border:2px solid #E60012;border-radius:50%;
    z-index:51;display:none;box-shadow:0 1px 4px rgba(0,0,0,.4);}
  #rz-w{cursor:ew-resize;} #rz-h{cursor:ns-resize;}
  /* Text blocks that scale font+size together (.sc, tables, etc.) — blue guide + top-left label on select (a separate element, unaffected by the scale) */
  body.editing .sc.sel{ outline:2px dashed #0B5FD9; outline-offset:4px; }
  #sc-guide{position:fixed;display:none;background:#0B5FD9;color:#fff;font-size:14px;font-weight:700;
    padding:3px 9px;border-radius:8px;z-index:52;white-space:nowrap;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.4);}
  /* Normal/multi selection outline (imgframe/sc keep their own outline priority) · groups use a dashed outline */
  body.editing .sel{ outline:2px solid rgba(230,0,18,.65); outline-offset:2px; }
  body.editing .grp{ cursor:move; }
  body.editing .grp.sel{ outline:2px dashed #E60012; outline-offset:3px; }
  /* ===== Master guide lines (toggled with G) — design-system §1 grid/margin ===== */
  #guide{position:absolute;inset:0;pointer-events:none;z-index:40;display:none;}
  body.show-guide #guide{display:block;}
  #guide .gv{position:absolute;top:0;bottom:0;width:2px;background:rgba(11,95,217,.45);}
  #guide .gh{position:absolute;left:0;right:0;height:2px;background:rgba(11,95,217,.45);}
  #guide .gcol{background:rgba(11,95,217,.22);}
  #guide .gbox{position:absolute;left:120px;top:96px;width:1680px;height:888px;border:2px solid rgba(232,92,52,.5);}
  #guide .glabel{position:absolute;font:600 18px/1 var(--sans);color:rgba(11,95,217,.85);
    background:rgba(255,255,255,.85);padding:2px 6px;border-radius:4px;}

  /* ===== Print (Cmd+P) — only the currently viewed slide, one 16:9 page ===== */
  /* Printing every slide is heavy enough to freeze the preview, so Cmd+P prints only the current slide (fast). Full PDF export goes through the deck-pdf.js CLI. */
  @media print {
    @page { size: 13.333in 7.5in; margin: 0; }   /* 1280x720 @96dpi = 16:9 (PPT standard) */
    html, body { width:auto !important; height:auto !important; overflow:visible !important;
      background:#fff !important; }
    #stage { position:static !important; inset:auto !important; overflow:visible !important; background:#fff !important; }
    #viewport { position:static !important; inset:auto !important; top:auto !important; left:auto !important;
      width:1920px !important; height:auto !important; transform:none !important; zoom:0.66667;
      box-shadow:none !important; overflow:visible !important; background:#fff !important; }
    #track { position:static !important; display:block !important; width:1920px !important; height:auto !important;
      transform:none !important; transition:none !important; }
    /* Remove all shadows for print — drop shadows (.imgframe, etc.) render as gray smudges */
    #track *, #print-pages * { box-shadow:none !important; }
    /* Also remove backdrop-filter — headless print applies backdrop blur tile by tile, leaving a visible
       vertical seam inside cards (observed on a glass-card slide in production). Once the blur disappears
       the background shows through, so slides that depend on it should raise the card background's
       opacity in their own @media print block to compensate. */
    #track *, #print-pages * { backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
    /* Default (Cmd+P): show only the current slide (.cur) */
    #track > .slide { display:none !important; }
    #track > .slide.cur { display:block !important; width:1920px !important; height:1080px !important;
      position:relative !important; overflow:hidden; box-shadow:none !important; }
    /* Full mode (deck-pdf.js CLI sets body.print-all): every slide, one page each */
    body.print-all #track > .slide { display:block !important; width:1920px !important; height:1080px !important;
      position:relative !important; overflow:hidden; box-shadow:none !important;
      break-after:page; page-break-after:always; }
    body.print-all #track > .slide:last-child { break-after:auto; page-break-after:auto; }
    /* fragment: keep only .shown frames visible in print too (Cmd+P = current step / PDF = one page per frame) */
    .frag { opacity:0 !important; }
    .frag.shown { opacity:1 !important; }
    /* Animation-expanded print (pp-on): hide the original track and show one frame clone per page */
    body.pp-on #track { display:none !important; }
    body.pp-on #print-pages { display:block !important; }
    body.pp-on #print-pages > .slide.pp { display:block !important; width:1920px !important; height:1080px !important;
      position:relative !important; overflow:hidden; box-shadow:none !important; break-after:page; page-break-after:always; }
    body.pp-on #print-pages > .slide.pp:last-child { break-after:auto; page-break-after:auto; }
    /* Exclude edit/nav UI from print */
    .nav, #counter, #fmtbar, #edit-hud, #rz-handle, .rz-crop, #sc-guide, #guide, #cover-bar,
    body.editing .nav { display:none !important; }
    /* Keep cover patches in print but remove the editing dashed outline */
    .patch { outline:none !important; }
    #track .slide *, #print-pages .slide * { outline:none !important; }
    .export-toast, #help, #jump, #move-bar, body.editing .imgframe.sel::after { display:none !important; }
    /* Print background colors/illustrations as-is (browsers skip backgrounds by default) */
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  }
</style>
</head>
<body>
<div id="stage">
  <div id="viewport">
    <div id="track">

${sectionsHtml}

    </div>
    <div id="guide">
      <div class="gbox"></div>
      <div class="gv" style="left:120px"></div>
      <div class="gv" style="left:1800px"></div>
      <div class="gv gcol" style="left:960px"></div>
      <div class="gh" style="top:540px;opacity:.5"></div>
      <div class="gh" style="top:120px"></div>
      <div class="gh" style="top:300px"></div>
      <div class="gh" style="top:976px"></div>
      <div class="glabel" style="left:128px;top:126px" data-i18n="guideTitleLabel"></div>
      <div class="glabel" style="left:128px;top:306px" data-i18n="guideBodyLabel"></div>
      <div class="glabel" style="left:128px;top:982px" data-i18n="guideFooterLabel"></div>
      <div class="glabel" style="left:980px;top:100px" data-i18n="guideRightZoneLabel"></div>
    </div>
  </div>
</div>

<button class="nav prev" data-i18n-aria="navPrev"><span>‹</span></button>
<button class="nav next" data-i18n-aria="navNext"><span>›</span></button>
<div id="counter">1 / 1</div>

<script>
  // Editor UI language dictionary. English is the default; Korean is used only when the browser's
  // primary language is Korean (or the config pins it). Slide CONTENT language never depends on this.
  const UI_TEXT = {
    en: {
      navPrev: 'Previous',
      navNext: 'Next',
      jumpMove: 'Go to',
      helpTitle: 'Keyboard shortcuts',
      hkPrevNext: 'Previous / next page',
      hkJumpPage: 'Jump straight to that page',
      hkHomeEnd: 'First / last page',
      hkFullscreen: 'Fullscreen',
      hkGuideToggle: 'Toggle alignment guide (lines)',
      hkEditMode: 'Edit mode (Esc = exit)',
      hkMoveMode: 'Page-move mode (← → reposition · Enter/M apply · Esc cancel · say "save" to commit to source)',
      hkEditGestures: 'Move / resize / nudge · D duplicate · Del delete · ⌘Z undo',
      hkImageCrop: 'Shift+drag to pan · wheel to zoom (Alt = fine) · corner = frame size — frame-less images auto-crop on gesture too',
      hkCoverTool: 'Drag to draw a rectangle over it. Toolbar: <b>solid</b> = fill with the color picker / <b>AI eraser</b> = when the background is not a solid color (gradient/pattern), inpaint the covered area. Alt+click = delete · turn X off to move/resize by clicking',
      hkTextEdit: 'Edit text (Esc = done)',
      hkToggleHelp: 'Open/close this help',
      helpFooterHint: 'Click anywhere · Esc to close',
      exportPreparing: 'Preparing download… inlining images',
      exportDonePrefix: 'Download complete · ',
      failedPrefix: 'Failed: ',
      moveBarPrefix: '📦 Moving: "',
      moveBarPosition: '"  → position ',
      moveBarHint: '    (← → move · Enter/M apply · Esc cancel · say "save" to commit to source)',
      coverLabel: 'Cover',
      coverSolid: 'Solid',
      coverAI: 'AI eraser',
      coverColorTitle: 'Solid fill color (white by default)',
      brushPrefix: 'Brush ',
      brushSmallerTitle: 'Smaller brush',
      brushLargerTitle: 'Larger brush',
      applyBtn: 'Apply',
      cancelBtn: 'Cancel',
      coverHintFull: 'Solid: drag to cover · AI eraser: paint the area to remove, then apply · Alt+click = delete cover · turn X off to move/resize',
      coverHintBasic: 'Drag to cover · Alt+click = delete · turn X off to move/resize',
      aiLoadingModel: 'Loading model… (first time only, ~28MB)',
      aiPaintFirst: 'Paint the area to remove first',
      aiErasing: 'Erasing…',
      fmtFontTitle: 'Font (pick after selecting text)',
      fmtFontPlaceholder: 'Font…',
      fmtFontDefault: 'Project default font',
      fmtBoldTitle: 'Bold',
      fmtUnderlineTitle: 'Underline',
      fmtStrikeTitle: 'Strikethrough',
      fmtHighlightTitle: 'Highlight',
      fmtColorPickerTitle: 'Color picker (more colors)',
      fmtRecentTitle: 'Recent colors',
      fmtSizeDownTitle: 'Size-',
      fmtSizeUpTitle: 'Size+',
      fmtLhDownTitle: 'Line height-',
      fmtLhUpTitle: 'Line height+',
      fmtAlignLeftTitle: 'Left',
      fmtAlignCenterTitle: 'Center',
      fmtAlignRightTitle: 'Right',
      recentColorPrefix: 'Recent ',
      recentColorEmptyTitle: 'Recent color (empty slot)',
      hudMultiSelected: '{n} selected · drag to move together · G to group · Shift/Cmd+click to add or remove · Del to delete all · Esc to deselect',
      hudGroup: 'Group · drag to move · G to ungroup · D duplicate · Del delete · arrow keys = nudge',
      hudSingleSuffix: '   (arrow keys ⅓px · Shift 12px / corner = resize / D duplicate / Del delete / Cmd+click = multi / E to exit)',
      hudEditDefault: 'Edit mode: click an element then drag to move · Shift/Cmd+click = multi-select · corner = resize · G = group · L = guide · E/Esc = exit · ? = shortcuts',
      scGuideHint: '+ / − font/table size · arrow keys to move · D duplicate',
      hudTextEditing: 'Editing text: type to edit / Enter = line break / Esc = done — say "save" when finished.',
      guideTitleLabel: 'Title y120 · x120',
      guideBodyLabel: 'Body y300',
      guideFooterLabel: 'Footer y976',
      guideRightZoneLabel: 'Right zone x972'
    },
    ko: {
      navPrev: '이전',
      navNext: '다음',
      jumpMove: '이동',
      helpTitle: '단축키',
      hkPrevNext: '이전 / 다음 페이지',
      hkJumpPage: '해당 페이지로 바로 이동',
      hkHomeEnd: '처음 / 마지막 페이지',
      hkFullscreen: '전체화면',
      hkGuideToggle: '정렬 가이드(라인) 토글',
      hkEditMode: '편집 모드 (Esc = 종료)',
      hkMoveMode: '페이지 이동 모드 (← → 재배치 · Enter/M 적용 · Esc 취소 · “저장”이라 말하면 소스 확정)',
      hkEditGestures: '이동 / 크기 / 미세조정 · D 복제 · Del 삭제 · ⌘Z 되돌리기',
      hkImageCrop: 'Shift+드래그 이동 · 휠 확대(Alt 미세) · 모서리 창크기 — 프레임 없는 이미지도 제스처 시 자동 크롭',
      hkCoverTool: '드래그로 사각형을 그려 가림. 툴바: <b>단색</b>=색상 피커로 채움 / <b>AI 지우개</b>=배경이 단색이 아닐 때(그라데이션·무늬) 지운 영역을 합성. Alt+클릭=삭제 · X 끄면 클릭해 이동/크기',
      hkTextEdit: '글자 편집 (Esc = 완료)',
      hkToggleHelp: '이 도움말 열기/닫기',
      helpFooterHint: '아무 곳이나 클릭 · Esc 로 닫기',
      exportPreparing: '다운로드 준비 중… 이미지 인라인',
      exportDonePrefix: '다운로드 완료 · ',
      failedPrefix: '실패: ',
      moveBarPrefix: '📦 이동 중: "',
      moveBarPosition: '"  → 위치 ',
      moveBarHint: '    (← → 이동 · Enter/M 적용 · Esc 취소 · “저장”해야 소스 확정)',
      coverLabel: '덮개',
      coverSolid: '단색',
      coverAI: 'AI 지우개',
      coverColorTitle: '단색 채움 색 (기본 흰색)',
      brushPrefix: '브러시 ',
      brushSmallerTitle: '브러시 작게',
      brushLargerTitle: '브러시 크게',
      applyBtn: '적용',
      cancelBtn: '취소',
      coverHintFull: '단색: 드래그로 덮기 · AI 지우개: 지울 곳을 칠하고 적용 · Alt+클릭=덮개 삭제 · X 끄면 이동/크기',
      coverHintBasic: '드래그로 덮기 · Alt+클릭=삭제 · X 끄면 이동/크기',
      aiLoadingModel: '모델 로딩…(최초 1회, ~28MB)',
      aiPaintFirst: '먼저 지울 곳을 칠하세요',
      aiErasing: '지우는 중…',
      fmtFontTitle: '폰트 (텍스트 선택 후 고르기)',
      fmtFontPlaceholder: '폰트…',
      fmtFontDefault: '프로젝트 기본 글꼴',
      fmtBoldTitle: '볼드',
      fmtUnderlineTitle: '밑줄',
      fmtStrikeTitle: '취소선',
      fmtHighlightTitle: '형광배경',
      fmtColorPickerTitle: '색상 팔레트 (더 많은 색)',
      fmtRecentTitle: '최근 색상',
      fmtSizeDownTitle: '크기-',
      fmtSizeUpTitle: '크기+',
      fmtLhDownTitle: '줄간격-',
      fmtLhUpTitle: '줄간격+',
      fmtAlignLeftTitle: '왼쪽',
      fmtAlignCenterTitle: '가운데',
      fmtAlignRightTitle: '오른쪽',
      recentColorPrefix: '최근 ',
      recentColorEmptyTitle: '최근 색상(빈 자리)',
      hudMultiSelected: '{n}개 선택 · 드래그=함께 이동 · G=그룹 묶기 · Shift/Cmd+클릭=추가·해제 · Del=모두 삭제 · Esc=선택 해제',
      hudGroup: '그룹 · 드래그=이동 · G=그룹 해제 · D 복제 · Del 삭제 · 방향키=미세',
      hudSingleSuffix: '   (방향키 ⅓px·Shift 12px / 모서리=크기 / D 복제 / Del 삭제 / Cmd+클릭=멀티 / E 종료)',
      hudEditDefault: '편집 모드: 요소 클릭→드래그 이동 · Shift/Cmd+클릭=멀티 선택 · 모서리=크기 · G=그룹 · L=가이드 · E·Esc=종료 · ?=단축키',
      scGuideHint: '＋ / － 폰트·표 크기 · 방향키 이동 · D 복제',
      hudTextEditing: '텍스트 편집 중: 입력·수정 / Enter=줄바꿈 / Esc=완료 — 다 되면 “저장”이라고 말하세요.',
      guideTitleLabel: '제목 y120 · x120',
      guideBodyLabel: '본문 y300',
      guideFooterLabel: '푸터 y976',
      guideRightZoneLabel: '우측 존 x972'
    }
  };
  const UI_LANG_CONFIG = ${JSON.stringify(UI_LANG)};
  function detectLang(){
    if (UI_LANG_CONFIG === 'en' || UI_LANG_CONFIG === 'ko') return UI_LANG_CONFIG;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^ko/i.test(nav) ? 'ko' : 'en';
  }
  const LANG = detectLang();
  document.documentElement.setAttribute('data-ui-lang', LANG);
  function t(key){
    const dict = UI_TEXT[LANG] || UI_TEXT.en;
    const v = dict[key];
    return (v !== undefined && v !== '') ? v : UI_TEXT.en[key];
  }
  function applyStaticI18n(){
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
  }
  applyStaticI18n();

  const slides = [...document.querySelectorAll('#track > .slide')];
  const N = slides.length;
  const track = document.getElementById('track');
  const viewport = document.getElementById('viewport');
  const counter = document.getElementById('counter');
  const frags = slides.map(s => [...s.querySelectorAll('.frag')]);
  let i = 0, step = 0;

  const MOVE_ZOOM = 0.46; // Move mode: zoom out so neighboring slides show too (filmstrip)
  function fit(){
    let s = Math.min(innerWidth / 1920, innerHeight / 1080);
    if (document.body.classList.contains('moving')) s *= MOVE_ZOOM;
    viewport.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }
  function render(){
    track.style.transform = 'translateX(' + (-i * 1920) + 'px)';
    slides.forEach((s, si) => frags[si].forEach((f, fi) => {
      f.classList.toggle('shown', si < i || (si === i && fi < step));
    }));
    counter.textContent = (i + 1) + ' / ' + N;
    /* [disabled 2026-07-05] Animation-slide sub-numbering (base-step, e.g. 51-1..51-6). Decided to drop
    numbering on animated pages entirely — source kept as a comment for reference.
    const curPn = slides[i].querySelector('.s-pagenum');
    if (curPn) curPn.textContent = frags[i].length ? ((i + 1) + '-' + (step + 1)) : ('' + (i + 1));
    */
    slides.forEach((s, si) => s.classList.toggle('cur', si === i)); // Print (Cmd+P) = current slide only
    typingBurst = false; // Prevent a typing burst from leaking into the next page transition
    try { localStorage.setItem('deckSlide', i); } catch(_){}  // Remember the current page
    setWindow();  // Load images only for the current ±N slides, release the rest
  }
  // ===== Image window loading — src for current ±2 (±3 in move mode), release the rest (reclaim memory) =====
  // Markup only carries data-src so parsing loads nothing. Here, slides inside the window get src;
  // slides outside it get removeAttribute('src').
  function setWindow(){
    const r = document.body.classList.contains('moving') ? 3 : 2;   // Move mode covers the side filmstrip
    const lo = Math.max(0, i - r), hi = Math.min(N - 1, i + r);
    slides.forEach((s, si) => {
      const on = si >= lo && si <= hi;
      s.querySelectorAll('img[data-src]').forEach(img => {
        if (on){ if (!img.getAttribute('src')) img.src = img.getAttribute('data-src'); }   // Load
        else if (img.getAttribute('src')){ img.removeAttribute('src'); }                    // Release (reclaims decode memory)
      });
    });
  }
  function loadAll(){ document.querySelectorAll('img[data-src]').forEach(img => { if (!img.getAttribute('src')) img.src = img.getAttribute('data-src'); }); }
  window.__loadAllImages = loadAll;                 // For an external PDF export tool (called before print-all)
  // ===== Frame expansion for full PDF printing =====
  // Clones animated (frag) slides into "one page per frame" so every step prints separately.
  //  - Collapsing is declared by the page itself, not a CLI flag: a <section data-print-collapse>
  //    attribute collapses that animation to a single final page on print (deterministic every time).
  //    Without it, every frame is expanded.
  //  - Skip specific frames with data-print-skip="1,3" (1-based frame numbers).
  //  - Animated pages drop their page number (no element) — non-animated pages keep the baked base number.
  //  - Does not affect Cmd+P (current slide, not print-all) — keeps that path fast.
  let __ppEl = null;
  function buildPrintPages(){
    clearPrintPages(); loadAll();
    const wrap = document.createElement('div'); wrap.id = 'print-pages';
    slides.forEach((s, si) => {
      const nf = frags[si].length;
      const collapse = s.hasAttribute('data-print-collapse');  // The page itself declares print-collapse (deterministic)
      let uptos;   // Number of frags to show per print page
      if (nf === 0 || collapse){ uptos = [nf]; }               // One page: final state (all frags)
      else {
        const skip = String(s.dataset.printSkip || '').split(',').map(x => parseInt(x, 10)).filter(Boolean);
        const keep = []; for (let f = 1; f <= nf + 1; f++){ if (!skip.includes(f)) keep.push(f); }  // f = frame (1..nf+1)
        uptos = (keep.length ? keep : [1]).map(f => f - 1);
      }
      // Numbering: animated pages drop their number (no element). Non-animated pages keep the baked build-time number.
      uptos.forEach(upto => {
        const c = s.cloneNode(true);
        c.classList.remove('cur', 'sel'); c.classList.add('pp'); c.removeAttribute('data-idx');
        [...c.querySelectorAll('.frag')].forEach((f, fi) => f.classList.toggle('shown', fi < upto));
        c.querySelectorAll('img[data-src]').forEach(img => { if (!img.getAttribute('src')) img.src = img.getAttribute('data-src'); });
        wrap.appendChild(c);
      });
    });
    track.parentNode.appendChild(wrap); __ppEl = wrap;
    document.body.classList.add('pp-on');
    return wrap.children.length;
  }
  function clearPrintPages(){ if (__ppEl){ __ppEl.remove(); __ppEl = null; } document.body.classList.remove('pp-on'); }
  window.__buildPrintPages = buildPrintPages;   // Called by deck-pdf.js before page.pdf() (in case beforeprint doesn't fire)
  window.__clearPrintPages = clearPrintPages;
  // Browser Cmd+P: expand only when print-all is set (full PDF). Otherwise keep the current slide as-is (no loadAll, stays fast).
  addEventListener('beforeprint', () => { if (document.body.classList.contains('print-all')) buildPrintPages(); });
  addEventListener('afterprint', clearPrintPages);
  function next(){ if (step < frags[i].length) step++; else if (i < N-1){ i++; step = 0; } else return; render(); }
  function prev(){ if (step > 0) step--; else if (i > 0){ i--; step = frags[i].length; } else return; render(); }
  function toggleFull(){ if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
  // ===== Page jump: type a number then Enter (jumps directly, no scrolling) =====
  function goTo(p){ p = (p|0); if(!p) return; i = Math.max(0, Math.min(N-1, p-1)); step = 0; render(); }
  window.deckGoTo = goTo; // Called directly by an external tool (deck-goto.js)
  let jumpBuf = '', jumpT = 0;
  const jumpEl = document.createElement('div'); jumpEl.id = 'jump';
  jumpEl.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;'
    + 'background:rgba(0,0,0,.82);color:#fff;padding:16px 30px;border-radius:12px;font-size:34px;'
    + 'font-weight:700;letter-spacing:.04em;display:none;pointer-events:none;';
  document.body.appendChild(jumpEl);
  function showJump(){
    jumpEl.textContent = jumpBuf ? (t('jumpMove') + ' → ' + jumpBuf + ' / ' + N + '  ⏎') : '';
    jumpEl.style.display = jumpBuf ? 'block' : 'none';
    clearTimeout(jumpT); if (jumpBuf) jumpT = setTimeout(() => { jumpBuf = ''; showJump(); }, 1800);
  }
  // ===== Hotkey guide (open/close with ?) =====
  function hkRow(k, d){ return '<tr><td style="padding:4px 34px 4px 0;font-weight:700;white-space:nowrap;">' + k + '</td><td style="color:#3A3A3A;">' + d + '</td></tr>'; }
  const helpEl = document.createElement('div'); helpEl.id = 'help';
  helpEl.style.cssText = 'position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);';
  helpEl.innerHTML = '<div style="background:#fff;color:#151515;border-radius:16px;padding:34px 44px;font-family:var(--sans);box-shadow:0 20px 60px rgba(0,0,0,.4);">'
    + '<div style="font-size:30px;font-weight:800;margin-bottom:18px;">' + t('helpTitle') + '</div>'
    + '<table style="font-size:22px;line-height:1.7;border-collapse:collapse;">'
    + hkRow('← →  ·  Space  ·  PgUp/PgDn', t('hkPrevNext'))
    + hkRow('0-9 → Enter', t('hkJumpPage'))
    + hkRow('Home / End', t('hkHomeEnd'))
    + hkRow('F', t('hkFullscreen'))
    + hkRow('L', t('hkGuideToggle'))
    + hkRow('E', t('hkEditMode'))
    + hkRow('M', t('hkMoveMode'))
    + hkRow('While editing: drag · corner · arrow keys', t('hkEditGestures'))
    + hkRow('Image crop (any image)', t('hkImageCrop'))
    + hkRow('X (while editing) = cover tool', t('hkCoverTool'))
    + hkRow('Double-click text', t('hkTextEdit'))
    + hkRow('?', t('hkToggleHelp'))
    + '</table><div style="font-size:18px;color:#6E6D72;margin-top:18px;">' + t('helpFooterHint') + '</div></div>';
  document.body.appendChild(helpEl);
  function toggleHelp(){ helpEl.style.display = (helpEl.style.display === 'flex') ? 'none' : 'flex'; }
  helpEl.addEventListener('click', () => { helpEl.style.display = 'none'; });
  addEventListener('resize', fit);
  if (window.visualViewport) visualViewport.addEventListener('resize', fit); // Refit on browser zoom/pinch changes too
  addEventListener('pageshow', fit);                                          // Refit when restored from bfcache
  // ── Cmd/Ctrl+S = download the edited deck as a single self-contained .html file (edit in Pages, save immediately) ──
  // Serializes the live DOM (text edits, magic-eraser base64 included) + inlines slides.css/components.css + base64 every image.
  // Note: the eraser needs an external vendor (ONNX), so the download can't "erase more" (already-erased areas stay as base64). Basic editing still works.
  async function exportSelfContained(){
    const toast = document.createElement('div');
    toast.className = 'export-toast';
    toast.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;background:#141417;color:#fff;padding:22px 34px;border-radius:14px;font:600 20px/1.4 sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)';
    toast.textContent = t('exportPreparing');
    document.body.appendChild(toast);
    try {
      // 1) Force-load every slide image and wait for decode
      document.querySelectorAll('img[data-src]').forEach(im => { if (!im.getAttribute('src')) im.src = im.getAttribute('data-src'); });
      const imgs = [...document.querySelectorAll('img')];
      await Promise.all(imgs.map(im => im.decode()));
      if (textEditing) endTextEdit();
      // 2) External images -> base64 (data: URLs pass through unchanged, preserving eraser results)
      const cache = new Map();
      const toDataURL = async (u) => { if (cache.has(u)) return cache.get(u); const r = await fetch(u); if (!r.ok) throw new Error('Asset download failed: ' + u); const b = await r.blob(); const d = await new Promise(rs => { const f = new FileReader(); f.onload = () => rs(f.result); f.readAsDataURL(b); }); cache.set(u, d); return d; };
      // 3) Inline CSS (slides.css + @import components.css)
      let cssText = '';
      try { const link = document.querySelector('link[rel="stylesheet"]'); if (link) { const base = new URL(link.getAttribute('href'), location.href); const scss = await (await fetch(base)).text(); const comp = await (await fetch(new URL('components.css', base))).text(); cssText = comp + '\\n' + scss.replace(/@import[^;]+;/g, ''); } } catch (err) {}
      // 4) Clone + substitute
      const root = document.documentElement.cloneNode(true);
      const link2 = root.querySelector('link[rel="stylesheet"]');
      if (link2 && cssText) { const st = document.createElement('style'); st.textContent = cssText; link2.replaceWith(st); }
      for (const im of [...root.querySelectorAll('img')]) {
        let s = im.getAttribute('src') || im.getAttribute('data-src'); if (!s) continue;
        if (s.startsWith('data:')) { im.setAttribute('src', s); im.removeAttribute('data-src'); continue; }
        try { im.setAttribute('src', await toDataURL(new URL(s, location.href).href)); im.removeAttribute('data-src'); } catch (err) { throw new Error('Cannot embed image: ' + s); }
      }
      // Clean up edit-mode residue (.cur stays — it's the initial view)
      root.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      root.querySelectorAll('.sel').forEach(el => el.classList.remove('sel'));
      const bd = root.querySelector('body'); if (bd) bd.classList.remove('editing', 'erasing', 'show-guide');
      root.querySelectorAll('.export-toast, #print-pages, #fmtbar, #help, #jump, #move-bar, #edit-hud, #cover-bar, #rz-handle, #rz-w, #rz-h, #sc-guide').forEach(el => el.remove());
      if (bd) bd.classList.remove('moving', 'text-editing', 'pp-on', 'print-all');
      // 5) Download
      const html = '<!doctype html>\\n' + root.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ${JSON.stringify(CFG.exportFilename)}; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 8000);
      toast.textContent = t('exportDonePrefix') + Math.max(1, Math.round(html.length / 1048576)) + 'MB';
    } catch (err) { toast.textContent = t('failedPrefix') + (err && err.message || err); }
    setTimeout(() => toast.remove(), 2600);
  }

  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); exportSelfContained(); return; } // Cmd/Ctrl+S = self-contained download
    if (document.activeElement && document.activeElement.isContentEditable) return; // Let typing through while editing text
    // ── Page-move mode: arrows reposition the slide, Enter/Esc/M puts it down ──
    if (moveMode) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); moveCur(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveCur(+1); return; }
      if (e.key === 'Escape')     { e.preventDefault(); cancelMove(); return; }   // Cancel -> restore to the state at entry
      if (e.key === 'Enter' || e.key === 'm' || e.key === 'M') { e.preventDefault(); setMove(false); return; } // Apply (keep)
      e.preventDefault(); return; // Ignore other keys while moving
    }
    const navLock = editMode || moveMode; // Block page navigation while editing/moving
    if (!navLock && /^[0-9]$/.test(e.key)) { e.preventDefault(); jumpBuf = (jumpBuf + e.key).slice(0, 3); showJump(); return; }
    if (!navLock && e.key === 'Enter' && jumpBuf) { e.preventDefault(); goTo(parseInt(jumpBuf, 10)); jumpBuf = ''; showJump(); return; }
    if (!navLock && e.key === 'Escape' && jumpBuf) { e.preventDefault(); jumpBuf = ''; showJump(); return; }
    if (!navLock && (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) { e.preventDefault(); next(); }
    else if (!navLock && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); prev(); }
    else if (!navLock && e.key === 'Home') { i = 0; step = 0; render(); }
    else if (!navLock && e.key === 'End') { i = N - 1; step = frags[i].length; render(); }
    else if ((e.key === 'm' || e.key === 'M') && !navLock) { e.preventDefault(); setMove(true); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFull(); }
    else if (e.key === 'l' || e.key === 'L') { document.body.classList.toggle('show-guide'); } // Guide lines (L for "line") — G is taken by group
    else if (e.key === '?') { e.preventDefault(); toggleHelp(); }
    else if (e.key === 'Escape' && helpEl.style.display === 'flex') { helpEl.style.display = 'none'; }
    else if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
  });
  document.querySelector('.nav.prev').onclick = prev;
  document.querySelector('.nav.next').onclick = next;

  // ===== Page-move mode (M) — reposition the current slide forward/back (in-memory, tentative until saved) =====
  // Saving happens only when the user says "save": a save tool reads the permutation via window.deckOrder(),
  // rewrites build-deck.js's SLIDES array, and rebuilding auto-corrects the footer numbers (position-based).
  // Reloading the page discards any unsaved move.
  let moveMode = false, moveSnapshot = null, moveStartI = 0;
  const moveBar = document.createElement('div'); moveBar.id = 'move-bar';
  moveBar.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:76;'
    + 'background:#0B5FD9;color:#fff;padding:12px 26px;border-radius:12px;font-size:23px;font-weight:800;'
    + 'display:none;box-shadow:0 10px 34px rgba(0,0,0,.45);white-space:nowrap;pointer-events:none;';
  document.body.appendChild(moveBar);
  const trackSlides = () => [...track.querySelectorAll(':scope > .slide')];
  function moveBarText(){
    const c = trackSlides()[i];
    const titleEl = c && c.querySelector('.s-title');
    const label = titleEl ? titleEl.textContent.trim().slice(0, 24) : ((c && c.id) || ('#' + (i + 1)));
    moveBar.textContent = t('moveBarPrefix') + label + t('moveBarPosition') + (i + 1) + ' / ' + N + t('moveBarHint');
  }
  function setMove(on){
    if (on) { moveSnapshot = trackSlides(); moveStartI = i; } // Snapshot the order at entry (for Esc to cancel back to)
    moveMode = on;
    document.body.classList.toggle('moving', on);
    moveBar.style.display = on ? 'block' : 'none';
    setWindow(); // Move mode = load ±3 (side filmstrip) / exit = back to ±2
    fit(); // Entering move mode = zoom out / exiting = zoom back to the current page
    if (on) moveBarText();
  }
  function moveCur(dir){ // dir: -1 = forward / +1 = backward
    const j = i + dir;
    if (j < 0 || j >= N) return;
    const list = trackSlides();
    const a = list[i], b = list[j];
    if (dir < 0) track.insertBefore(a, b); else track.insertBefore(b, a);
    // Resync the slides/frags arrays to the new DOM order (render reads from these arrays)
    const nl = trackSlides();
    slides.length = 0; slides.push(...nl);
    frags.length = 0; nl.forEach(s => frags.push([...s.querySelectorAll('.frag')]));
    i = j; step = 0;
    render();
    renumber();      // Recompute footer numbers live right after the move, in sync with what's shown
    moveBarText();
  }
  function cancelMove(){ // Esc = cancel this move session -> restore the order from entry
    if (moveSnapshot){
      moveSnapshot.forEach(el => track.appendChild(el)); // Reposition in snapshot order
      const nl = trackSlides();
      slides.length = 0; slides.push(...nl);
      frags.length = 0; nl.forEach(s => frags.push([...s.querySelectorAll('.frag')]));
      i = moveStartI; step = 0; renumber();
    }
    setMove(false);
    render();
  }
  // Accessor a save tool reads when saving: the current DOM order's original indices = the SLIDES reorder permutation
  window.deckOrder = () => trackSlides().map(s => +s.dataset.idx);
  window.deckMoveMode = () => moveMode;
  // ===== Page numbers = computed live from the current position (syncs instantly on move; source is only committed on "save") =====
  // The build bakes in the build-time position, but it goes stale after a live move — recompute on every
  // move plus once at startup to keep it consistent. Image slides with no .s-pagenum are baked and untouched.
  function renumber(){
    trackSlides().forEach((s, si) => { const pn = s.querySelector('.s-pagenum'); if (pn) pn.textContent = si + 1; });
  }
  renumber();

  // ===== Edit mode (toggled with E) — drag to move / corner to resize / arrow keys to nudge =====
  function getScale(){ return Math.min(innerWidth / 1920, innerHeight / 1080); }
  const hud = document.createElement('div'); hud.id = 'edit-hud'; document.body.appendChild(hud);
  const rz = document.createElement('div'); rz.id = 'rz-handle'; document.body.appendChild(rz);
  const rzW = document.createElement('div'); rzW.id = 'rz-w'; rzW.className = 'rz-crop'; document.body.appendChild(rzW); // Left = width only (crop, content fixed)
  const rzH = document.createElement('div'); rzH.id = 'rz-h'; rzH.className = 'rz-crop'; document.body.appendChild(rzH); // Bottom = height only (crop, content fixed)
  const scGuide = document.createElement('div'); scGuide.id = 'sc-guide'; scGuide.textContent = t('scGuideHint'); document.body.appendChild(scGuide); // Top-left guide shown when a .sc block is selected
  let editMode = false, sel = null, drag = null, textEditing = null;
  let selSet = new Set(); // Multi-select set (sel = the primary/last one in it)
  const cur = () => slides[i];
  const selName = el => el.id || (el.className && String(el.className).trim().split(' ')[0]) || el.tagName.toLowerCase();
  function toLeftTop(el){ el.style.left = el.offsetLeft + 'px'; el.style.top = el.offsetTop + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }
  // Wraps a plain <img> (no frame, sized to itself) in a crop frame so it can be panned/zoomed —
  // returns it unchanged if it's already inside .imgframe. Initially frame size = image size, so it
  // looks identical (keeps the original shadow/rounding, adds no crop decoration).
  function ensureCropFrame(img){
    const par = img.parentElement;
    if (par && par.classList.contains('imgframe')) return par;
    if (!par || !cur().contains(img)) return null;
    const cs = getComputedStyle(img);
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return null; // Excludes flow (flex/inline) images — wrapping them would break the layout
    const L = img.offsetLeft, T = img.offsetTop, W = img.offsetWidth, H = img.offsetHeight; // Display box before wrapping
    const frame = document.createElement('div');
    frame.className = 'imgframe';
    frame.style.left = L + 'px'; frame.style.top = T + 'px'; frame.style.width = W + 'px'; frame.style.height = H + 'px';
    frame.style.boxShadow = 'none';                                                   // The original image had no shadow, so don't add one
    frame.style.borderRadius = (cs.borderRadius && cs.borderRadius !== '0px') ? cs.borderRadius : '0px';
    par.insertBefore(frame, img); frame.appendChild(img);
    img.style.left = '0px'; img.style.top = '0px'; img.style.width = W + 'px'; img.style.height = 'auto';
    img.style.right = 'auto'; img.style.bottom = 'auto';
    return frame;
  }
  function placeHandle(){
    if (editMode && selSet.size > 1){ rz.style.display='none'; rzW.style.display='none'; rzH.style.display='none'; scGuide.style.display='none'; return; } // Multi-select = move only (no handles)
    if (editMode && sel){ const r = sel.getBoundingClientRect(); rz.style.display = 'block'; rz.style.left = (r.right - 8) + 'px'; rz.style.top = (r.bottom - 8) + 'px';
      if (sel.classList.contains('imgframe')){ // Crop-only handles: left-center = width, bottom-center = height
        rzW.style.display = 'block'; rzW.style.left = (r.right - 7) + 'px';              rzW.style.top = (r.top + r.height/2 - 7) + 'px';
        rzH.style.display = 'block'; rzH.style.left = (r.left + r.width/2 - 7) + 'px';    rzH.style.top = (r.bottom - 7) + 'px';
      } else { rzW.style.display = 'none'; rzH.style.display = 'none'; }
      if (sel.classList.contains('sc')){ scGuide.style.display = 'block'; scGuide.style.left = r.left + 'px'; scGuide.style.top = (r.top - 26) + 'px'; }
      else scGuide.style.display = 'none';
    }
    else { rz.style.display = 'none'; rzW.style.display = 'none'; rzH.style.display = 'none'; scGuide.style.display = 'none'; }
  }
  function hudText(){
    if (!editMode){ hud.style.display = 'none'; return; }
    hud.style.display = 'block';
    if (selSet.size > 1){ hud.textContent = t('hudMultiSelected').replace('{n}', selSet.size); return; }
    if (sel && sel.classList.contains('grp')){ hud.textContent = t('hudGroup'); return; }
    hud.textContent = sel
      ? selName(sel) + '  x:' + Math.round(sel.offsetLeft) + '  y:' + Math.round(sel.offsetTop) + '  w:' + Math.round(sel.offsetWidth) + t('hudSingleSuffix')
      : t('hudEditDefault');
  }
  function select(el){ selSet.forEach(x => x.classList.remove('sel')); selSet.clear();
    if (sel) sel.classList.remove('sel'); sel = el; if (el){ el.classList.add('sel'); selSet.add(el); } placeHandle(); hudText(); }
  // Multi-select toggle (Cmd/Ctrl+click)
  function toggleSel(el){ if (!el) return;
    if (selSet.has(el)){ selSet.delete(el); el.classList.remove('sel'); sel = selSet.size ? [...selSet][selSet.size-1] : null; }
    else { selSet.add(el); el.classList.add('sel'); sel = el; }
    placeHandle(); hudText();
  }
  // Group the selected elements into a .grp container — compute the bounding box, then reparent children
  function groupSel(){
    const els = [...selSet].filter(el => el.parentElement && cur().contains(el) && el.classList.contains('slide') === false);
    if (els.length < 2) return;
    snapshot(); els.forEach(toLeftTop);
    let minL=Infinity, minT=Infinity, maxR=-Infinity, maxB=-Infinity;
    els.forEach(el => { minL=Math.min(minL,el.offsetLeft); minT=Math.min(minT,el.offsetTop);
      maxR=Math.max(maxR,el.offsetLeft+el.offsetWidth); maxB=Math.max(maxB,el.offsetTop+el.offsetHeight); });
    const grp = document.createElement('div'); grp.className='grp';
    grp.style.position='absolute'; grp.style.left=minL+'px'; grp.style.top=minT+'px';
    grp.style.width=(maxR-minL)+'px'; grp.style.height=(maxB-minT)+'px';
    cur().appendChild(grp);
    els.forEach(el => { const l=el.offsetLeft-minL, t=el.offsetTop-minT; grp.appendChild(el);
      el.style.left=l+'px'; el.style.top=t+'px'; el.style.right='auto'; el.style.bottom='auto'; });
    select(grp);
  }
  // Ungroup — return children to the parent and restore their absolute coordinates
  function ungroupSel(g){
    snapshot(); const gl=g.offsetLeft, gt=g.offsetTop, parent=g.parentNode;
    [...g.children].forEach(el => { const l=el.offsetLeft+gl, t=el.offsetTop+gt; parent.insertBefore(el, g);
      el.style.left=l+'px'; el.style.top=t+'px'; });
    g.remove(); select(null);
  }
  function setEdit(on){ editMode = on; document.body.classList.toggle('editing', on); if (!on){ select(null); setErase(false); } placeHandle(); hudText(); }
  // Cover (patch) mode — cover any rectangle on the slide (white by default, changeable via the color picker)
  let eraseMode = false;
  function setErase(on){ eraseMode = !!on && editMode; document.body.classList.toggle('erasing', eraseMode); }
  // Cover toolbar (color picker) — shown automatically in cover mode (body.erasing CSS)
  let coverColor = '#ffffff', coverMode = 'solid';
  const coverBar = document.createElement('div'); coverBar.id = 'cover-bar';
  coverBar.innerHTML = '<span class="cb-lb">' + t('coverLabel') + '</span>'
    + '<button class="cb-btn on" data-mode="solid">' + t('coverSolid') + '</button>'
    + '<button class="cb-btn" data-mode="ai">' + t('coverAI') + '</button>'
    + '<input type="color" id="cb-color" value="#ffffff" title="' + t('coverColorTitle') + '">'
    + '<span id="cb-ai" style="display:none;align-items:center;gap:8px;">'
    +   '<button id="cb-brush-dn" class="cb-btn" title="' + t('brushSmallerTitle') + '">−</button>'
    +   '<span id="cb-brush" style="opacity:.75;">' + t('brushPrefix') + '24</span>'
    +   '<button id="cb-brush-up" class="cb-btn" title="' + t('brushLargerTitle') + '">＋</button>'
    +   '<button id="cb-apply" class="cb-btn" style="background:#E60012;border-color:#E60012;">' + t('applyBtn') + '</button>'
    +   '<button id="cb-cancel" class="cb-btn">' + t('cancelBtn') + '</button>'
    +   '<span id="cb-status" style="opacity:.75;"></span>'
    + '</span>'
    + '<span class="cb-hint">' + t('coverHintFull') + '</span>';
  document.body.appendChild(coverBar);
  const aiCtl = coverBar.querySelector('#cb-ai');
  const aiEnabled = ${JSON.stringify(CFG.features?.aiEraser === true)};
  coverBar.querySelector('[data-mode="ai"]').hidden = !aiEnabled;
  if (!aiEnabled) coverBar.querySelector('.cb-hint').textContent = t('coverHintBasic');
  coverBar.querySelectorAll('.cb-btn[data-mode]').forEach(b => b.addEventListener('click', () => {
    coverMode = b.dataset.mode;
    coverBar.querySelectorAll('.cb-btn[data-mode]').forEach(x => x.classList.toggle('on', x === b));
    aiCtl.style.display = (coverMode === 'ai') ? 'inline-flex' : 'none';
    if (coverMode !== 'ai') aiCancel();
  }));
  coverBar.querySelector('#cb-color').addEventListener('input', ev => {
    coverColor = ev.target.value;
    if (sel && sel.classList.contains('patch')){ snapshot(); sel.style.background = coverColor; } // Recolor the selected cover to the solid color (erases the image behind it)
  });
  // ===== AI eraser (MI-GAN inpaint via onnxruntime-web WASM, vendored locally, offline) =====
  // Paint the area to remove with the brush (a mask); the model inpaints it from the surrounding context —
  // the same approach as a phone's magic eraser. Model/runtime lazy-load only on first use (zero impact on
  // initial deck load). Mask polarity: painted = 0 (hole), kept = 255 (MI-GAN convention).
  let aiBrush = 24, aiSession = null, aiLoading = null, aiMask = null;
  const aiStatus = m => { const s = coverBar.querySelector('#cb-status'); if (s) s.textContent = m || ''; };
  function loadScript(src){ return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script load ' + src)); document.head.appendChild(s); }); }
  function ensureAI(){
    if (aiSession) return Promise.resolve(aiSession);
    if (aiLoading) return aiLoading;
    aiLoading = (async () => {
      aiStatus(t('aiLoadingModel'));
      if (!window.ort) await loadScript('./vendor/ort/ort.wasm.min.js');
      /* wasmPaths left unset: ORT auto-discovers its sibling wasm/mjs files next to its own script
         (vendor/ort/ort.wasm.min.js) — avoids an absolute/relative dual-path issue (works on both
         Pages and localhost) */
      ort.env.wasm.numThreads = 1;
      aiSession = await ort.InferenceSession.create('./vendor/migan_pipeline_v2.onnx', { executionProviders: ['wasm'] });
      aiStatus(''); return aiSession;
    })();
    return aiLoading;
  }
  function aiCancel(){ if (aiMask){ aiMask.canvas.remove(); aiMask = null; } aiStatus(''); }
  function aiBegin(img){
    aiCancel();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;                 // Internal resolution = original (mask precision)
    c.style.cssText = 'position:absolute;z-index:26;pointer-events:none;left:' + img.offsetLeft + 'px;top:' + img.offsetTop + 'px;width:' + img.offsetWidth + 'px;height:' + img.offsetHeight + 'px;';
    img.parentElement.appendChild(c);                                        // Overlaid in the same parent/box as the image
    aiMask = { img, canvas: c, ctx: c.getContext('2d'), painted: false };
  }
  function aiPaintAt(clientX, clientY){
    if (!aiMask) return;
    const r = aiMask.canvas.getBoundingClientRect();
    const nx = (clientX - r.left) / r.width * aiMask.canvas.width;
    const ny = (clientY - r.top) / r.height * aiMask.canvas.height;
    const nr = aiBrush / r.width * aiMask.canvas.width;                       // Brush radius (screen px) -> original px
    const g = aiMask.ctx; g.fillStyle = 'rgba(230,0,18,.5)';
    g.beginPath(); g.arc(nx, ny, nr, 0, Math.PI * 2); g.fill();
    aiMask.painted = true;
  }
  async function aiApply(){
    if (!aiMask || !aiMask.painted){ aiStatus(t('aiPaintFirst')); return; }
    const img = aiMask.img, nW = img.naturalWidth, nH = img.naturalHeight, plane = nW * nH;
    try {
      const sess = await ensureAI();
      aiStatus(t('aiErasing'));
      await new Promise(r => setTimeout(r, 20));                             // Yield so the status renders
      const ic = document.createElement('canvas'); ic.width = nW; ic.height = nH;
      const ig = ic.getContext('2d'); ig.drawImage(img, 0, 0, nW, nH);
      const id = ig.getImageData(0, 0, nW, nH).data;
      const rgb = new Uint8Array(3 * plane);                                 // Image -> uint8 CHW RGB
      for (let p = 0; p < plane; p++){ rgb[p] = id[p*4]; rgb[plane+p] = id[p*4+1]; rgb[2*plane+p] = id[p*4+2]; }
      const md = aiMask.ctx.getImageData(0, 0, nW, nH).data;
      const mask = new Uint8Array(plane);                                    // Painted (alpha>20) = hole = 0, else keep = 255
      for (let p = 0; p < plane; p++){ mask[p] = md[p*4+3] > 20 ? 0 : 255; }
      const feed = {};
      feed[sess.inputNames[0]] = new ort.Tensor('uint8', rgb, [1, 3, nH, nW]);
      feed[sess.inputNames[1]] = new ort.Tensor('uint8', mask, [1, 1, nH, nW]);
      const out = await sess.run(feed);
      const rd = out[sess.outputNames[0]].data;                             // [1,3,nH,nW] uint8 CHW (already fully blended)
      const oc = document.createElement('canvas'); oc.width = nW; oc.height = nH;
      const og = oc.getContext('2d'); const oi = og.createImageData(nW, nH);
      for (let p = 0; p < plane; p++){ oi.data[p*4] = rd[p]; oi.data[p*4+1] = rd[plane+p]; oi.data[p*4+2] = rd[2*plane+p]; oi.data[p*4+3] = 255; }
      og.putImageData(oi, 0, 0);
      const url = oc.toDataURL('image/png');
      snapshot();
      img.src = url; img.setAttribute('data-src', url);                     // Also update data-src so window loading doesn't revert to the original
      aiCancel();
    } catch(err){ aiStatus(t('failedPrefix') + (err && err.message || err)); }
  }
  coverBar.querySelector('#cb-apply').addEventListener('click', aiApply);
  coverBar.querySelector('#cb-cancel').addEventListener('click', aiCancel);
  const aiBrushLbl = () => { const b = coverBar.querySelector('#cb-brush'); if (b) b.textContent = t('brushPrefix') + aiBrush; };
  coverBar.querySelector('#cb-brush-dn').addEventListener('click', () => { aiBrush = Math.max(6, aiBrush - 6); aiBrushLbl(); });
  coverBar.querySelector('#cb-brush-up').addEventListener('click', () => { aiBrush = Math.min(80, aiBrush + 6); aiBrushLbl(); });
  // Cover target image = the selected image (frame/img) first, else the image under the pointer. (A cover "edits" that image.)
  function coverTargetImg(clientX, clientY){
    let el = null;
    if (sel && sel.classList.contains('imgframe')) el = sel;
    else if (sel && sel.tagName === 'IMG') el = sel.parentElement.classList.contains('imgframe') ? sel.parentElement : sel;
    if (!el){ const hit = document.elementFromPoint(clientX, clientY); const im = hit && hit.closest && hit.closest('.slide img'); if (im && cur().contains(im)) el = im.parentElement.classList.contains('imgframe') ? im.parentElement : im; }
    return (el && cur().contains(el)) ? el : null;
  }
  // Clip the cover box to the target image's area (drawing outside it is fine; only the part over the image actually covers). Removes it if there's no overlap.
  function clampPatchToImage(pt, el, sl){
    const er = el.getBoundingClientRect(), sr = sl.getBoundingClientRect(), s = sr.width / sl.offsetWidth; // Target rect in slide space
    const L = (er.left - sr.left)/s, T = (er.top - sr.top)/s, R = (er.right - sr.left)/s, B = (er.bottom - sr.top)/s;
    const nl = Math.max(pt.offsetLeft, L), nt = Math.max(pt.offsetTop, T);
    const nr = Math.min(pt.offsetLeft + pt.offsetWidth, R), nb = Math.min(pt.offsetTop + pt.offsetHeight, B);
    if (nr - nl < 3 || nb - nt < 3){ pt.remove(); return; }             // No overlap with the image -> cancel the cover
    pt.style.left = Math.round(nl)+'px'; pt.style.top = Math.round(nt)+'px';
    pt.style.width = Math.round(nr - nl)+'px'; pt.style.height = Math.round(nb - nt)+'px';
  }
  // ===== Pin a cover (patch) to the image content — keep it as a frame child and store its ratio to the image =====
  // When the image moves/zooms/pans/wheels, the cover is recomputed from that ratio — effectively moving with the image as part of it.
  function frameImg(fr){ return fr && fr.querySelector(':scope > img'); }
  function setPatchRatios(pt, fr){ const im = frameImg(fr); if(!im) return;
    const w = im.offsetWidth||1, h = im.offsetHeight||1;
    pt.dataset.rl = (pt.offsetLeft - im.offsetLeft)/w; pt.dataset.rt = (pt.offsetTop - im.offsetTop)/h;
    pt.dataset.rw = pt.offsetWidth/w; pt.dataset.rh = pt.offsetHeight/h;
  }
  function syncFramePatches(fr){ const im = frameImg(fr); if(!im) return;
    const w = im.offsetWidth, h = im.offsetHeight, il = im.offsetLeft, it = im.offsetTop;
    fr.querySelectorAll(':scope > .patch').forEach(pt => {
      if (pt.dataset.rw == null) return;
      pt.style.left  = Math.round(il + parseFloat(pt.dataset.rl)*w)+'px';
      pt.style.top   = Math.round(it + parseFloat(pt.dataset.rt)*h)+'px';
      pt.style.width = Math.round(parseFloat(pt.dataset.rw)*w)+'px';
      pt.style.height= Math.round(parseFloat(pt.dataset.rh)*h)+'px';
    });
  }

  // ===== Unified undo/redo history — a separate stack per page =====
  // Native contenteditable undo only catches execCommand and typing; it can't see direct style/DOM
  // manipulation (resize, line-height, alignment, highlight, drag), so Cmd+Z was inconsistent. Snapshotting
  // the slide's innerHTML instead makes every edit undo consistently.
  // Each page has its own stack (Map<slide, {u,r}>), so history survives moving between pages, and
  // undo/redo only touches the stack of the page currently being viewed (never injects the wrong content).
  const hist = new Map();
  let typingBurst = false, typingTimer = null, suppressSnap = false;
  function stacksFor(sl){ let h = hist.get(sl); if(!h){ h = { u:[], r:[] }; hist.set(sl, h); } return h; }
  function snapshot(){
    const sl = cur(); if(!sl) return;
    const h = stacksFor(sl);
    h.u.push(sl.innerHTML); // No cap — keeps the full history for the session (until reload)
    h.r.length = 0; // A new edit invalidates that page's redo stack
  }
  function afterRestore(){
    const sl = cur();
    sl.querySelectorAll('[contenteditable="true"]').forEach(n => n.removeAttribute('contenteditable'));
    sl.querySelectorAll('.sel').forEach(n => n.classList.remove('sel'));
    textEditing = null; sel = null; selSet.clear(); savedRange = null; drag = null; typingBurst = false;
    document.body.classList.remove('text-editing');
    rz.style.display = 'none'; fmtbar.classList.remove('on');
    placeHandle(); hudText();
  }
  function undo(){ const sl = cur(); const h = sl && hist.get(sl); if(!h || !h.u.length) return; h.r.push(sl.innerHTML); sl.innerHTML = h.u.pop(); afterRestore(); }
  function redo(){ const sl = cur(); const h = sl && hist.get(sl); if(!h || !h.r.length) return; h.u.push(sl.innerHTML); sl.innerHTML = h.r.pop(); afterRestore(); }
  function hasHist(){ const h = hist.get(cur()); return !!h && (h.u.length || h.r.length); }
  // Track which pages were edited (so a save doesn't skip any) — a slide whose undo stack isn't empty
  // was edited this session. No need for detailed history, just "was it edited": the save tool
  // (save-live-edits.js) overwrites each page's source with its final state.
  // Returns only a lightweight list (no html) to save tokens — the tool reads each page's final
  // outerHTML separately.
  window.__deckEdits = () => [...hist.entries()]
    .filter(([sl, h]) => h && h.u.length)
    .map(([sl, h]) => ({ id: sl.id, idx: +sl.dataset.idx, edits: h.u.length }));
  addEventListener('keydown', e => {
    if(!(e.metaKey || e.ctrlKey)) return;
    const z = (e.key === 'z' || e.key === 'Z'), y = (e.key === 'y' || e.key === 'Y');
    if(!z && !y) return;
    if(!editMode && !hasHist()) return; // Defer to the browser's native undo outside an edit context
    e.preventDefault(); e.stopPropagation();
    if(y || (z && e.shiftKey)) redo(); else undo();
  }, true);
  // Typing is snapshotted once per burst (beforeinput = right before the change). suppressSnap prevents
  // a duplicate snapshot from the beforeinput that execCommand itself fires.
  document.addEventListener('beforeinput', e => {
    if(suppressSnap) return;
    const tgt = e.target; if(!tgt || !(tgt.closest && tgt.closest('.slide [contenteditable="true"], .slide[contenteditable="true"]'))) return;
    if(!typingBurst){ snapshot(); typingBurst = true; }
    clearTimeout(typingTimer); typingTimer = setTimeout(() => { typingBurst = false; }, 700);
  }, true);

  addEventListener('pointerdown', e => {
    if (!editMode) return;
    if (e.target.closest && e.target.closest('#fmtbar')) return; // Clicking the format toolbar keeps editing active
    if (textEditing){ if (textEditing.contains(e.target)) return; else endTextEdit(); } // Clicking outside the edit area ends editing
    // Cover: dragging on empty space covers a rectangle on the slide / Alt+click removes an existing cover
    if (eraseMode){
      const sl = cur(); if (!sl){ e.preventDefault(); return; }
      const p = e.target.closest('.patch');
      if (p && sl.contains(p) && e.altKey){ snapshot(); if (p === sel) select(null); p.remove(); e.preventDefault(); return; }
      if (coverMode === 'ai'){                                   // AI eraser: paint the removal mask over the image
        const im = e.target.closest('img');
        if (im && sl.contains(im) && im.naturalWidth){
          if (!aiMask || aiMask.img !== im) aiBegin(im);
          aiPaintAt(e.clientX, e.clientY);
          drag = { mode:'aimask' };
        }
        e.preventDefault(); return;
      }
      snapshot();
      const sr = sl.getBoundingClientRect(), s = sr.width / sl.offsetWidth; // Measured slide scale = accurate cursor mapping
      const px = (e.clientX - sr.left)/s, py = (e.clientY - sr.top)/s;
      const pt = document.createElement('div'); pt.className = 'patch';
      pt.style.left = Math.round(px)+'px'; pt.style.top = Math.round(py)+'px'; pt.style.width = '0px'; pt.style.height = '0px';
      pt.style.background = coverColor;
      sl.appendChild(pt); // Direct child of the slide (draws outside its bounds while dragging) — pointerup clips it to the target image
      drag = { mode:'cover', el:pt, ox:px, oy:py, sr, s, sl, tf: coverTargetImg(e.clientX, e.clientY) };
      e.preventDefault(); return;
    }
    if (e.target === rz){ if (!sel) return; snapshot(); drag = { mode:'rz', el:sel, sx:e.clientX, sy:e.clientY, bw:sel.offsetWidth, bh:sel.offsetHeight, s:getScale() };
      if (sel.classList.contains('imgframe')){ const im = sel.querySelector('img'); if (im){ drag.im = im; drag.iw = im.offsetWidth; drag.il = im.offsetLeft; drag.it = im.offsetTop; } } // Frame resize also scales the inner image by the same factor — store the baseline values for that
      e.preventDefault(); return; }
    if (e.target === rzW){ if (!sel) return; snapshot(); drag = { mode:'rzw', el:sel, sx:e.clientX, bw:sel.offsetWidth, s:getScale() }; e.preventDefault(); return; } // Right handle: width only (crop, left edge fixed, content fixed)
    if (e.target === rzH){ if (!sel) return; snapshot(); drag = { mode:'rzh', el:sel, sy:e.clientY, bh:sel.offsetHeight, s:getScale() }; e.preventDefault(); return; } // Bottom handle: height only (crop)
    // Shift+drag = pan the inner image. A frame-less plain image gets a frame on the fly, same behavior
    if (e.shiftKey){
      const frameEl0 = e.target.closest('.imgframe');
      const plainImg = frameEl0 ? null : e.target.closest('.slide img');
      const anchor = frameEl0 || plainImg;
      if (anchor && cur().contains(anchor)){
        snapshot();
        const frameEl = frameEl0 || ensureCropFrame(plainImg);
        const img = frameEl && frameEl.querySelector('img');
        if (img){
          select(frameEl);
          img.style.left = img.offsetLeft + 'px'; img.style.top = img.offsetTop + 'px';
          drag = { mode:'pan', img, sx:e.clientX, sy:e.clientY, bl:img.offsetLeft, bt:img.offsetTop, s:getScale() };
          e.preventDefault(); return;
        }
      }
    }
    // Clicking an image = wrap it in a crop frame and select it (so even a 100%-fit image gets guides/crop/cover targeting). ensureCropFrame excludes flow (flex) images.
    const cim = e.target.closest('.slide img');
    if (cim && cur().contains(cim) && !cim.parentElement.classList.contains('imgframe')) ensureCropFrame(cim);
    const el = e.target.closest('.slide > *');
    if (!el || !cur().contains(el)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey){ toggleSel(el); e.preventDefault(); return; } // Shift/Cmd/Ctrl+click = toggle multi-select
    if (selSet.has(el) && selSet.size > 1){ // Clicking a multi-selected element moves the whole set together
      snapshot(); [...selSet].forEach(toLeftTop);
      drag = { mode:'mv', el, sx:e.clientX, sy:e.clientY, s:getScale(), multi:[...selSet].map(x=>({el:x, bl:x.offsetLeft, bt:x.offsetTop})) };
      e.preventDefault(); return;
    }
    snapshot();
    select(el); toLeftTop(el);
    drag = { mode:'mv', el, sx:e.clientX, sy:e.clientY, bl:el.offsetLeft, bt:el.offsetTop, s:getScale() };
    // Snap lines: margins/center + other components' edges + a standard gap (spacing between components)
    const GAPS = [12, 24, 34, 48];
    const xs = new Set([120, 960, 1800]), ys = new Set([120, 300, 540, 976]);
    [...cur().children].forEach(o => {
      if (o === el || o.tagName === 'STYLE' || !o.offsetWidth) return;
      const l=o.offsetLeft, r=o.offsetLeft+o.offsetWidth, cx=Math.round(o.offsetLeft+o.offsetWidth/2);
      const oTop=o.offsetTop, bo=o.offsetTop+o.offsetHeight, cy=Math.round(o.offsetTop+o.offsetHeight/2);
      xs.add(l); xs.add(r); xs.add(cx); ys.add(oTop); ys.add(bo); ys.add(cy);
      GAPS.forEach(g => { xs.add(r+g); xs.add(l-g); ys.add(bo+g); ys.add(oTop-g); }); // Offsets the standard gap away from a neighbor
    });
    drag.xs = [...xs]; drag.ys = [...ys];
    if (!document.body.classList.contains('show-guide')) { document.body.classList.add('show-guide'); drag.autoGuide = true; }
    e.preventDefault();
  });
  function snap1(val, w, lines, T){ // val = candidate left/top, w = width/height -> snap to the nearest line among (start/end/center) edges
    let best=null, bd=T+1;
    for(const g of lines){
      for(const [edge,adj] of [[val,0],[val+w,-w],[val+Math.round(w/2),-Math.round(w/2)]]){
        const d=Math.abs(edge-g); if(d<bd){ bd=d; best=g+adj; }
      }
    }
    return best===null ? val : best;
  }
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.mode === 'aimask'){ aiPaintAt(e.clientX, e.clientY); return; } // Paint the AI eraser mask
    if (drag.mode === 'cover'){ // Resizing the cover rectangle (slide-local coordinates)
      const px = (e.clientX - drag.sr.left)/drag.s, py = (e.clientY - drag.sr.top)/drag.s;
      drag.el.style.left = Math.round(Math.min(px, drag.ox))+'px'; drag.el.style.top = Math.round(Math.min(py, drag.oy))+'px';
      drag.el.style.width = Math.round(Math.abs(px - drag.ox))+'px'; drag.el.style.height = Math.round(Math.abs(py - drag.oy))+'px';
      return;
    }
    if (drag.mode === 'rzw'){ // Right handle: change only the window width (left edge fixed), content fixed -> crop
      drag.el.style.width = Math.max(60, Math.round(drag.bw + (e.clientX - drag.sx) / drag.s)) + 'px';
      placeHandle(); hudText(); return;
    }
    if (drag.mode === 'rzh'){ // Bottom handle: change only the window height (top edge fixed), content fixed -> crop
      drag.el.style.height = Math.max(60, Math.round(drag.bh + (e.clientY - drag.sy) / drag.s)) + 'px';
      placeHandle(); hudText(); return;
    }
    if (drag.mode === 'pan'){ // Pan the image inside the crop frame
      drag.img.style.left = Math.round(drag.bl + (e.clientX - drag.sx) / drag.s) + 'px';
      drag.img.style.top  = Math.round(drag.bt + (e.clientY - drag.sy) / drag.s) + 'px';
      syncFramePatches(drag.img.parentElement); // Covers follow the image too
    } else if (drag.mode === 'mv'){
      if (drag.multi){ // Multi-select: move all by the same delta (no snapping)
        const dx = (e.clientX - drag.sx) / drag.s, dy = (e.clientY - drag.sy) / drag.s;
        drag.multi.forEach(m => { m.el.style.left = Math.round(m.bl + dx) + 'px'; m.el.style.top = Math.round(m.bt + dy) + 'px'; m.el.style.right='auto'; m.el.style.bottom='auto'; });
      } else {
        let nl = Math.round(drag.bl + (e.clientX - drag.sx) / drag.s);
        let nt = Math.round(drag.bt + (e.clientY - drag.sy) / drag.s);
        const T = e.altKey ? 0 : 8;  // Alt turns off snapping
        if (T) { nl = snap1(nl, drag.el.offsetWidth, drag.xs, T); nt = snap1(nt, drag.el.offsetHeight, drag.ys, T); }
        drag.el.style.left = nl + 'px';
        drag.el.style.top  = nt + 'px';
      }
    } else if (drag.el.classList.contains('imgframe')){
      if (drag.im && !e.altKey){ // Default: scale the frame + inner image by the same factor (content grows/shrinks together) — fine-tune afterward with the wheel
        const nw = Math.max(60, drag.bw + (e.clientX - drag.sx) / drag.s);
        const k = nw / drag.bw;
        drag.el.style.width  = Math.round(nw) + 'px';
        drag.el.style.height = Math.round(drag.bh * k) + 'px';
        drag.im.style.width  = Math.round(drag.iw * k) + 'px';
        drag.im.style.left   = Math.round(drag.il * k) + 'px';
        drag.im.style.top    = Math.round(drag.it * k) + 'px';
        syncFramePatches(drag.el); // Covers scale by the same factor
      } else { // Alt: free resize the frame (crop window) in both directions, content fixed
        drag.el.style.width  = Math.max(60, Math.round(drag.bw + (e.clientX - drag.sx) / drag.s)) + 'px';
        drag.el.style.height = Math.max(60, Math.round(drag.bh + (e.clientY - drag.sy) / drag.s)) + 'px';
      }
    } else if (drag.el.classList.contains('patch')){ // Free resize of the cover rectangle (both directions, can shrink too)
      drag.el.style.width  = Math.max(6, Math.round(drag.bw + (e.clientX - drag.sx) / drag.s)) + 'px';
      drag.el.style.height = Math.max(6, Math.round(drag.bh + (e.clientY - drag.sy) / drag.s)) + 'px';
    } else {
      drag.el.style.width = Math.max(40, Math.round(drag.bw + (e.clientX - drag.sx) / drag.s)) + 'px';
      if (drag.el.tagName === 'IMG') drag.el.style.height = 'auto';
    }
    placeHandle(); hudText();
  });
  addEventListener('pointerup', () => {
    if (drag && drag.mode === 'cover'){ // End of drawing a (solid) cover
      if (drag.el.offsetWidth < 4 || drag.el.offsetHeight < 4) drag.el.remove();       // Click-sized = remove
      else if (drag.tf){ clampPatchToImage(drag.el, drag.tf, cur());                   // Clip to inside the target image
        const pt = drag.el;
        if (pt.isConnected && drag.tf.classList.contains('imgframe') && pt.parentElement !== drag.tf){ // Reparent under the frame -> pinned to the image
          const nl = pt.offsetLeft - drag.tf.offsetLeft, nt = pt.offsetTop - drag.tf.offsetTop;
          drag.tf.appendChild(pt); pt.style.left = Math.round(nl)+'px'; pt.style.top = Math.round(nt)+'px';
          setPatchRatios(pt, drag.tf);
        }
      }
    }
    if (drag && drag.autoGuide) document.body.classList.remove('show-guide');
    drag = null;
  });

  // ===== Crop frame: wheel = zoom the inner image (pins the cursor point) =====
  let wheelBurst = false, wheelT = null;
  addEventListener('wheel', e => {
    if (!editMode) return;
    let frame = e.target.closest && e.target.closest('.imgframe');
    let plainImg = null;
    if (frame){ if (!cur().contains(frame)) return; }
    else { plainImg = e.target.closest && e.target.closest('.slide img'); if (!(plainImg && cur().contains(plainImg))) return; }
    e.preventDefault();
    if (!wheelBurst){ snapshot(); wheelBurst = true; } // One snapshot per continuous wheel burst (before wrapping the frame)
    clearTimeout(wheelT); wheelT = setTimeout(() => { wheelBurst = false; }, 500);
    if (!frame) frame = ensureCropFrame(plainImg);          // Frame-less plain image -> frame it on the fly
    if (!frame) return;
    const img = frame.querySelector('img'); if (!img) return;
    select(frame);
    const s = getScale(), fr = frame.getBoundingClientRect();
    const cx = (e.clientX - fr.left) / s, cy = (e.clientY - fr.top) / s; // Frame-local coordinates (1x)
    const oldW = img.offsetWidth, il = img.offsetLeft, it = img.offsetTop;
    const step = e.altKey ? 1.012 : 1.045;              // Alt = fine (slow) zoom
    const factor = e.deltaY < 0 ? step : 1/step;
    const newW = Math.max(80, Math.round(oldW * factor)), ratio = newW / oldW;
    img.style.width = newW + 'px';
    img.style.left = Math.round(cx - (cx - il) * ratio) + 'px'; // Pins the point under the cursor
    img.style.top  = Math.round(cy - (cy - it) * ratio) + 'px';
    syncFramePatches(frame); // Covers zoom together with the image
    placeHandle();
  }, { passive:false });
  addEventListener('keydown', e => {
    if (textEditing) return; // While editing text, let typing through instead of arrow keys/shortcuts
    if (e.key === 'e' || e.key === 'E'){ setEdit(!editMode); e.preventDefault(); e.stopPropagation(); return; }
    if ((e.key === 'x' || e.key === 'X') && editMode){ setErase(!eraseMode); e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === 'Escape' && eraseMode){ setErase(false); e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === 'Escape' && editMode){ if (selSet.size){ select(null); } else setEdit(false); e.preventDefault(); e.stopPropagation(); return; }
    if (!editMode || !sel) return;
    // Group/ungroup (G) — groups when multi-selected, ungroups when a group is selected
    if (e.key === 'g' || e.key === 'G'){
      if (sel.classList.contains('grp')) ungroupSel(sel);
      else if (selSet.size >= 2) groupSel();
      e.preventDefault(); e.stopPropagation(); return;
    }
    // Delete the selected component(s) (Delete/Backspace) — all of them if multi-selected. snapshot lets Cmd+Z restore them
    if (e.key === 'Delete' || e.key === 'Backspace'){
      snapshot(); const victims = selSet.size ? [...selSet] : [sel]; select(null); victims.forEach(v => v && v.remove());
      placeHandle(); hudText(); e.preventDefault(); e.stopPropagation(); return;
    }
    // Duplicate the selected component (D or Cmd/Ctrl+D) — +24px offset on the same slide, selects the copy
    if (e.key === 'd' || e.key === 'D'){
      snapshot();
      toLeftTop(sel);                          // Commit the original to inline left/top (so the clone inherits the coordinates)
      const clone = sel.cloneNode(true);
      clone.classList.remove('sel');
      if (clone.id) clone.removeAttribute('id');
      clone.style.left = (sel.offsetLeft + 24) + 'px';
      clone.style.top  = (sel.offsetTop + 24) + 'px';
      sel.parentNode.insertBefore(clone, sel.nextSibling);
      select(clone);
      placeHandle(); hudText(); e.preventDefault(); e.stopPropagation(); return;
    }
    // .sc text blocks (tables, etc.): +/- scales the font+table together proportionally (transform-origin top-left keeps position fixed)
    if (sel.classList.contains('sc') && (e.key==='+'||e.key==='='||e.key==='-'||e.key==='_')){
      snapshot();
      let k = parseFloat(sel.dataset.scale)||1;
      k = (e.key==='-'||e.key==='_') ? Math.max(0.4, k/1.08) : Math.min(3, k*1.08);
      sel.dataset.scale = k; sel.style.transformOrigin = 'top left'; sel.style.transform = 'scale('+k.toFixed(3)+')';
      placeHandle(); hudText(); e.preventDefault(); e.stopPropagation(); return;
    }
    const isArrow = e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown';
    if (isArrow && !e.repeat) snapshot();
    const st = e.shiftKey ? 12 : (1/3); let u = true;   // Nudge is 3x finer (1px -> ⅓px), Shift = the usual 12px
    if (isArrow){
      const r2 = v => Math.round(v * 100) / 100;
      let dx=0, dy=0;
      if (e.key === 'ArrowLeft') dx=-st; else if (e.key === 'ArrowRight') dx=st;
      else if (e.key === 'ArrowUp') dy=-st; else if (e.key === 'ArrowDown') dy=st;
      (selSet.size ? [...selSet] : [sel]).forEach(el => { // All together if multi-selected
        if (!el.style.left) el.style.left = el.offsetLeft + 'px';  // Keeps fractional accumulation (avoids offset re-rounding)
        if (!el.style.top)  el.style.top  = el.offsetTop + 'px';
        el.style.right = 'auto'; el.style.bottom = 'auto';
        el.style.left = r2((parseFloat(el.style.left) || 0) + dx) + 'px';
        el.style.top  = r2((parseFloat(el.style.top)  || 0) + dy) + 'px';
      });
    } else u = false;
    if (u){ e.preventDefault(); e.stopPropagation(); placeHandle(); hudText(); }
  }, true);
  addEventListener('resize', placeHandle);

  // ===== Format toolbar for a text selection (double-click text -> edit state -> drag-select) =====
  const fmtbar = document.createElement('div');
  fmtbar.id = 'fmtbar';
  const themeStyle = getComputedStyle(document.documentElement);
  const themePalette = ['--text', '--muted', '--primary', '--accent', '--bg', '--surface'].map(token => {
    const color = themeStyle.getPropertyValue(token).trim();
    return '<button class="sw" data-fc="' + color + '" style="background:' + color + '" title="' + token + '"></button>';
  }).join('');
  fmtbar.innerHTML =
    '<select id="fmtfont" title="' + t('fmtFontTitle') + '">' +
    '<option value="">' + t('fmtFontPlaceholder') + '</option>' +
    '<option value="pretendard">' + t('fmtFontDefault') + '</option>' +
    '</select>' +
    '<i></i>' +
    '<button data-c="bold" title="' + t('fmtBoldTitle') + '"><b>B</b></button>' +
    '<button data-c="underline" title="' + t('fmtUnderlineTitle') + '"><u>U</u></button>' +
    '<button data-c="strikeThrough" title="' + t('fmtStrikeTitle') + '"><s>S</s></button>' +
    '<button data-c="hl" title="' + t('fmtHighlightTitle') + '" style="background:#FFE15A;color:#000">H</button>' +
    '<i></i>' +
    (${JSON.stringify(CFG.textPalette || null)} ? ${JSON.stringify((CFG.textPalette || []).map(({color,label}) => '<button class="sw" data-fc="'+color+'" style="background:'+color+';border-color:#8a8a8e" title="'+label+'"></button>').join(''))} :
    themePalette) +
    '<input type="color" class="fmtpick" value="${CFG.textPalette ? '#1536B8' : '#E60012'}" title="' + t('fmtColorPickerTitle') + '">' +
    '<i></i>' +
    '<span id="fmtrecent" title="' + t('fmtRecentTitle') + '"></span>' +
    '<i></i>' +
    '<button data-c="size-" title="' + t('fmtSizeDownTitle') + '">A−</button>' +
    '<button data-c="size+" title="' + t('fmtSizeUpTitle') + '">A+</button>' +
    '<button data-c="lh-" title="' + t('fmtLhDownTitle') + '">↕−</button>' +
    '<button data-c="lh+" title="' + t('fmtLhUpTitle') + '">↕+</button>' +
    '<i></i>' +
    '<button data-c="justifyLeft" title="' + t('fmtAlignLeftTitle') + '">⇤</button>' +
    '<button data-c="justifyCenter" title="' + t('fmtAlignCenterTitle') + '">≡</button>' +
    '<button data-c="justifyRight" title="' + t('fmtAlignRightTitle') + '">⇥</button>';
  document.body.appendChild(fmtbar);
  let savedRange = null;

  // ── Recent colors (kept in localStorage, max 8) — reselect a color picked via the picker/swatches ──
  let recentColors = [];
  try { recentColors = (JSON.parse(localStorage.getItem('deckRecentColors')||'[]')||[]).filter(c=>/^#[0-9a-fA-F]{6}$/.test(c)); } catch(_){}
  function renderRecents(){
    const box = fmtbar.querySelector('#fmtrecent'); if(!box) return;
    let h='';   // 8 fixed slots — empty ones show a dashed placeholder, filled ones show up to the last 8 (picker-chosen colors only)
    for(let i=0;i<8;i++){
      const c = recentColors[i];
      h += c
        ? '<button class="sw" data-fc="'+c+'" style="background:'+c+(/^#f{6}$/i.test(c)?';border-color:#8a8a8e':'')+'" title="' + t('recentColorPrefix') + c+'"></button>'
        : '<button class="sw empty" disabled title="' + t('recentColorEmptyTitle') + '"></button>';
    }
    box.innerHTML = h;
  }
  function pushRecent(c){
    if(!c || !/^#[0-9a-fA-F]{6}$/.test(c)) return;   // 6-digit hex only (guards against XSS/pollution)
    c = c.toLowerCase();
    recentColors = [c, ...recentColors.filter(x=>x.toLowerCase()!==c)].slice(0,8);
    try { localStorage.setItem('deckRecentColors', JSON.stringify(recentColors)); } catch(_){}
    renderRecents();
  }
  renderRecents();

  function editableBlock(){
    const s = window.getSelection();
    if(!s || !s.rangeCount) return null;
    let n = s.getRangeAt(0).commonAncestorContainer;
    n = n.nodeType===3 ? n.parentElement : n;
    return n ? n.closest('[contenteditable="true"]') : null;
  }
  function showFmt(){
    const s = window.getSelection();
    if(!editMode || !s || s.isCollapsed || !s.rangeCount){ fmtbar.classList.remove('on'); return; }
    const blk = editableBlock();
    if(!blk || !blk.closest('#track .slide')){ fmtbar.classList.remove('on'); return; }
    const r = s.getRangeAt(0).getBoundingClientRect();
    if(!r.width && !r.height){ fmtbar.classList.remove('on'); return; }
    fmtbar.classList.add('on');
    savedRange = s.getRangeAt(0).cloneRange(); // Save the selection (restored on apply)
    const bw = fmtbar.offsetWidth, bh = fmtbar.offsetHeight;
    let x = r.left + r.width/2 - bw/2, y = r.top - bh - 10;
    x = Math.max(8, Math.min(x, innerWidth - bw - 8));
    if(y < 8) y = r.bottom + 10;
    fmtbar.style.left = x + 'px'; fmtbar.style.top = y + 'px';
  }
  document.addEventListener('selectionchange', showFmt);
  // Clicking outside the edit area/toolbar hides the popup (losing the selection/text-box focus also closes the toolbar)
  document.addEventListener('mousedown', e => {
    if(e.target.closest('#fmtbar')) return;                 // Interacting with the toolbar (font/color/swatch) keeps it open
    if(e.target.closest('[contenteditable="true"]')) return; // Clicking inside the text box being edited keeps it open
    fmtbar.classList.remove('on');                          // Anywhere else (empty slide, other elements) = close it
  }, true);
  fmtbar.addEventListener('mousedown', e => { if(!e.target.closest('select, input')) e.preventDefault(); }); // Preserve the selection (select/color-picker are exceptions — they need to open)
  function wrapRange(range, styler){
    try {
      const span = document.createElement('span'); styler(span);
      span.appendChild(range.extractContents()); range.insertNode(span);
      const sel = window.getSelection(); sel.removeAllRanges();
      const r = document.createRange(); r.selectNodeContents(span); sel.addRange(r);
      savedRange = r.cloneRange(); return true;
    } catch(err){ return false; }
  }
  const rangeNode = () => { const n = savedRange.commonAncestorContainer; return n.nodeType===3 ? n.parentElement : n; };
  const lineBlock = (n) => n.closest('.btxt, .s-sub, .s-title, .s-qbox-text, .s-eyebrow') || n.closest('[contenteditable="true"]');
  function changeSize(delta){
    if(!savedRange || savedRange.collapsed) return;
    // Baseline size = an existing font-size we already set inside the selection if there is one, else the rendered size at the start point
    const probe = savedRange.cloneContents();
    const inner = probe.querySelector ? probe.querySelector('span[style*="font-size"]') : null;
    let cur;
    if(inner){ cur = parseFloat(inner.style.fontSize) || 36; }
    else { const sc = savedRange.startContainer; const refEl = sc.nodeType===3 ? sc.parentElement : sc; cur = parseFloat(getComputedStyle(refEl).fontSize) || 36; }
    const nv = Math.max(12, cur+delta);
    // Extract the selection -> flatten any existing inline font-size inside it (avoids nested accumulation) -> rewrap in a single span
    const frag = savedRange.extractContents();
    if(frag.querySelectorAll) frag.querySelectorAll('span[style*="font-size"]').forEach(s=>{
      s.style.removeProperty('font-size');
      if(!(s.getAttribute('style')||'').trim()){ const p=s.parentNode; while(s.firstChild) p.insertBefore(s.firstChild, s); p.removeChild(s); }
    });
    const span = document.createElement('span'); span.style.fontSize = nv+'px';
    span.appendChild(frag); savedRange.insertNode(span);
    // Line-height auto-follows the "largest font in the line". line-height is unitless (a ratio), so it
    // scales automatically with the block's font-size. If the whole block was resized (no bare text left),
    // set the block's font-size to the actual max font so the strut shrinks/grows and line spacing follows.
    // If only part was resized (bare text remains), keep the block's font — the larger run then dominates the line height (still tracking the max font).
    try {
      const blk = lineBlock(span);
      if(blk){
        let maxF = 0;
        blk.querySelectorAll('span[style*="font-size"]').forEach(s2=>{ const f=parseFloat(s2.style.fontSize)||0; if(f>maxF) maxF=f; });
        let bare = false;
        (function walk(el){ el.childNodes.forEach(n=>{
          if(n.nodeType===3){ if(n.textContent.trim()) bare=true; }
          else if(n.nodeType===1 && !((n.getAttribute&&n.getAttribute('style'))||'').includes('font-size')) walk(n);
        }); })(blk);
        if(maxF>0 && !bare) blk.style.fontSize = maxF+'px';
        const lh = blk.style.lineHeight;
        if(lh && /px$/.test(lh)){ const cs=getComputedStyle(blk); blk.style.lineHeight = (parseFloat(lh)/(parseFloat(cs.fontSize)||36)).toFixed(3); }
      }
    } catch(e){}
    const s = window.getSelection(); s.removeAllRanges();
    const r = document.createRange(); r.selectNode(span); s.addRange(r); savedRange = r.cloneRange();
  }
  function changeLh(delta){
    const blk = lineBlock(rangeNode()); if(!blk) return;
    if(blk.classList.contains('btxt')) blk.style.display='block';
    let lh = parseFloat(blk.dataset.lh);
    if(isNaN(lh)){ const cs=getComputedStyle(blk); lh = (parseFloat(cs.lineHeight)/(parseFloat(cs.fontSize)||36)) || 1.4; }
    lh = Math.max(0.8, lh+delta); blk.dataset.lh = lh.toFixed(2); blk.style.lineHeight = lh.toFixed(2);
  }
  function setAlign(dir){
    const blk = lineBlock(rangeNode()); if(!blk) return;
    blk.style.display = 'block';
    if(blk.classList.contains('btxt')) blk.style.flex = '1';
    blk.style.textAlign = dir==='justifyLeft'?'left':dir==='justifyCenter'?'center':'right';
  }
  function toggleHl(){
    const hl = rangeNode().closest('.hl');
    if(hl){ const pa=hl.parentNode; while(hl.firstChild) pa.insertBefore(hl.firstChild, hl); pa.removeChild(hl); }
    else wrapRange(savedRange, sp => sp.className='hl');
  }
  // Font picker (dropdown after selecting text) — wraps the selection range in a span with the font-family
  const FONTS = {
    pretendard:themeStyle.getPropertyValue('--sans').trim(),
    blackhan:"'Black Han Sans',sans-serif",
    dohyeon:"'Do Hyeon',sans-serif",
    jua:"'Jua',sans-serif",
    serif:"'Noto Serif KR',serif",
    myeongjo:"'Nanum Myeongjo',serif",
    songmyung:"'Song Myung',serif",
    gowun:"'Gowun Dodum',sans-serif"
  };
  // Color picker (input[type=color]) — applies the chosen color to the selected text live
  fmtbar.addEventListener('input', e => {
    const pick = e.target.closest('.fmtpick'); if(!pick) return;
    if(!savedRange || savedRange.collapsed) return;
    const blk = rangeNode().closest('[contenteditable="true"]'); if(!blk) return;
    snapshot();
    blk.focus();
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange);
    try { document.execCommand('styleWithCSS', false, true); } catch(_){}
    document.execCommand('foreColor', false, pick.value);
  });
  fmtbar.addEventListener('change', e => {
    const pk = e.target.closest('.fmtpick'); if(pk){ pushRecent(pk.value); return; }  // The picker's final color goes into the recent-colors list
    const selEl = e.target.closest('#fmtfont'); if(!selEl) return;
    const font = FONTS[selEl.value]; selEl.selectedIndex = 0;
    if(!font || !savedRange || savedRange.collapsed) return;
    const blk = rangeNode().closest('[contenteditable="true"]'); if(!blk) return;
    snapshot();
    blk.focus();
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange);
    wrapRange(savedRange, sp => sp.style.fontFamily = font);
  });
  fmtbar.addEventListener('click', e => {
    const btn = e.target.closest('button'); if(!btn) return;
    if(!savedRange || savedRange.collapsed) return;
    const blk = rangeNode().closest('[contenteditable="true"]'); if(!blk) return;
    snapshot();              // <- undo point (one formatting action = one step)
    suppressSnap = true;     // Prevents a duplicate snapshot from the beforeinput that execCommand fires
    blk.focus();
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange);
    const fc = btn.dataset.fc, c = btn.dataset.c;
    try { document.execCommand('styleWithCSS', false, true); } catch(_){}
    if(fc){ document.execCommand('foreColor', false, fc); }  // Color (default swatch/recent-color click — recent colors aren't re-added)
    else if(c==='bold') document.execCommand('bold');             // Toggle
    else if(c==='underline') document.execCommand('underline');   // Toggle
    else if(c==='strikeThrough') document.execCommand('strikeThrough'); // Toggle
    else if(c==='hl') toggleHl();                                  // Toggle (highlight)
    else if(c==='size+'||c==='size-') changeSize(c==='size+'?2:-2);
    else if(c==='lh+'||c==='lh-') changeLh(c==='lh+'?0.1:-0.1);
    else if(c) setAlign(c);                                        // Alignment
    suppressSnap = false;
    const ns = window.getSelection(); if(ns.rangeCount && !ns.isCollapsed) savedRange = ns.getRangeAt(0).cloneRange();
    showFmt();
  });

  // ===== Direct text editing (double-click an element in edit mode) =====
  function startTextEdit(el){
    if (!editMode) setEdit(true);
    select(el);
    textEditing = el;
    el.setAttribute('contenteditable', 'true');
    document.body.classList.add('text-editing');
    el.focus();
    rz.style.display = 'none';
    hud.style.display = 'block';
    hud.textContent = t('hudTextEditing');
  }
  function endTextEdit(){
    if (textEditing){ textEditing.removeAttribute('contenteditable'); textEditing.blur(); textEditing = null; }
    document.body.classList.remove('text-editing');
    fmtbar.classList.remove('on'); savedRange = null;   // Also closes the format popup when editing ends
    hudText(); placeHandle();
  }
  addEventListener('dblclick', e => {
    if (!editMode) return;
    const el = e.target.closest('.slide > *');
    if (!el || !cur().contains(el) || el.tagName === 'IMG') return;
    startTextEdit(el);
    // Select the double-clicked word so the format toolbar shows immediately (the default word-select is blocked by preventDefault, so select it manually)
    try {
      const cr = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (cr) {
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(cr);
        sel.modify('move', 'backward', 'word'); sel.modify('extend', 'forward', 'word');
        showFmt();
      }
    } catch (_) {}
    e.preventDefault();
  });
  addEventListener('keydown', e => {
    if (!textEditing) return;
    if (e.key === 'Escape'){ endTextEdit(); e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === 'Enter' && !e.shiftKey){ snapshot(); suppressSnap = true; document.execCommand('insertLineBreak'); suppressSnap = false; e.preventDefault(); e.stopPropagation(); }
  }, true);

  try { const sv = parseInt(localStorage.getItem('deckSlide')); if(!isNaN(sv) && sv>=0 && sv<N) i = sv; } catch(_){}  // Keeps the page across a reload
  fit(); render();
</script>
</body>
</html>
`;

const output = path.join(HTML, CFG.output);
const result = embedMarkup(applyBrand(deck), HTML, ROOT)
  .replace(/deckSlide/g, CFG.storageKey)
  .replace(/deckRecentColors/g, CFG.storageKey + ':colors');
fs.writeFileSync(output, result);
console.log('built', output, '—', SLIDES.length, 'slides');
