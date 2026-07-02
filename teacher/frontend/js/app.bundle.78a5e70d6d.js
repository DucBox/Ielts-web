const API_BASE="https://ielts-teacher-api.quangducngo0811.workers.dev",API_CACHE_TTL_MS=1e4,API_CACHE_PREFIX="ielts_teacher_api_cache:",TEACHER_AUTH_TOKEN_KEY="teacher_auth_token",api={_base:API_BASE,_cache:new Map,_authToken(){try{return sessionStorage.getItem(TEACHER_AUTH_TOKEN_KEY)||""}catch{return""}},setAuthToken(t){try{t?sessionStorage.setItem(TEACHER_AUTH_TOKEN_KEY,t):sessionStorage.removeItem(TEACHER_AUTH_TOKEN_KEY)}catch{}},_authHeaders(t={}){const e={...t},n=this._authToken();return n&&(e.Authorization=`Bearer ${n}`),e},_cacheKey(t){return API_CACHE_PREFIX+t},_readCache(t){const e=this._cacheKey(t),n=this._cache.get(e);if(n&&n.expires>Date.now())return n.data;try{const i=sessionStorage.getItem(e);if(!i)return null;const o=JSON.parse(i);return!o||o.expires<=Date.now()?(sessionStorage.removeItem(e),this._cache.delete(e),null):(this._cache.set(e,o),o.data)}catch{return null}},_writeCache(t,e){const n=this._cacheKey(t),i={expires:Date.now()+1e4,data:e};this._cache.set(n,i);try{sessionStorage.setItem(n,JSON.stringify(i))}catch{}},clearCache(){this._cache.clear();try{for(let t=sessionStorage.length-1;t>=0;t--){const e=sessionStorage.key(t);e&&e.startsWith(API_CACHE_PREFIX)&&sessionStorage.removeItem(e)}}catch{}},_handle401(t){t.status===401&&(this.clearCache(),window._onTeacherUnauthorized?.())},async _readJsonSafe(t){const e=await t.text();if(!e)return null;try{return JSON.parse(e)}catch{return{error:e}}},_fetchWithTimeout(t,e,n=3e4){const i=new AbortController,o=setTimeout(()=>i.abort(),n);return fetch(t,{...e,signal:i.signal}).finally(()=>clearTimeout(o))},async get(t){const e=this._readCache(t);if(e)return e;const n=await this._fetchWithTimeout(API_BASE+t,{headers:this._authHeaders(),credentials:"include"});if(!n.ok)throw this._handle401(n),await this._readJsonSafe(n)||{error:"Request failed"};const i=await this._readJsonSafe(n);return this._writeCache(t,i),i},async post(t,e,n={}){const i=await this._fetchWithTimeout(API_BASE+t,{method:"POST",headers:this._authHeaders({"Content-Type":"application/json"}),body:JSON.stringify(e),credentials:"include"},n.timeoutMs);if(!i.ok)throw this._handle401(i),await this._readJsonSafe(i)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(i)},async postForm(t,e){const n=await fetch(API_BASE+t,{method:"POST",headers:this._authHeaders(),body:e,credentials:"include"});if(!n.ok)throw this._handle401(n),await this._readJsonSafe(n)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(n)},async patch(t,e){const n=await this._fetchWithTimeout(API_BASE+t,{method:"PATCH",headers:this._authHeaders({"Content-Type":"application/json"}),body:JSON.stringify(e),credentials:"include"});if(!n.ok)throw this._handle401(n),await this._readJsonSafe(n)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(n)},async delete(t){const e=await this._fetchWithTimeout(API_BASE+t,{method:"DELETE",headers:this._authHeaders(),credentials:"include"});if(!e.ok)throw this._handle401(e),await this._readJsonSafe(e)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(e)},fileUrl(t){return t?t.startsWith("http")?t:API_BASE+t:null}};function $(t){return document.querySelector(t)}function escapeHtml(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function isSttFailedScript(t){return String(t||"").includes("[STT_FAILED]")}function renderMarkdownInline(t){return escapeHtml(t).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*\n]+)\*/g,"<em>$1</em>")}function renderSafeMarkdown(t){const e=String(t||"").replace(/\r\n/g,`
`).split(`
`),n=[];let i=null;const o=()=>{i&&(n.push(`</${i}>`),i=null)};for(const s of e){const a=s.trim();if(!a){o();continue}const r=a.match(/^[-*]\s+(.+)$/),l=a.match(/^\d+\.\s+(.+)$/);if(r||l){const d=r?"ul":"ol";i!==d&&(o(),n.push(`<${d}>`),i=d),n.push(`<li>${renderMarkdownInline((r||l)[1])}</li>`);continue}o();const c=a.match(/^(#{2,4})\s+(.+)$/);c?n.push(`<h5>${renderMarkdownInline(c[2])}</h5>`):n.push(`<p>${renderMarkdownInline(a)}</p>`)}return o(),n.join("")}function btnReset(t){t&&(t.disabled=!1,t.innerHTML=t._origHTML||t.innerHTML)}function toast(t,e="success"){const n=e==="error"?6e3:3500,i=document.createElement("div");i.className=`toast toast-${e}`,i.setAttribute("role","alert");const o=document.createElement("span");o.textContent=t;const s=document.createElement("button");s.className="toast-close",s.setAttribute("aria-label","\u0110\xF3ng th\xF4ng b\xE1o"),s.textContent="\xD7",s.onclick=()=>i.remove(),i.appendChild(o),i.appendChild(s),i.addEventListener("mouseenter",()=>i.classList.add("toast-paused")),i.addEventListener("mouseleave",()=>i.classList.remove("toast-paused")),$("#toast-container").appendChild(i);const a=setTimeout(()=>i.remove(),n);i.addEventListener("mouseenter",()=>clearTimeout(a)),i.addEventListener("mouseleave",()=>setTimeout(()=>i.remove(),1e3))}function setLoading(t="\u0110ang t\u1EA3i..."){$("#app").innerHTML=`
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>${t}</p>
    </div>`}function formatDateTime(t){return t?new Date(t).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"Kh\xF4ng c\xF3 h\u1EA1n"}function isOverdue(t){return t?new Date(t)<new Date:!1}function makeSortIcon(t,e,n){return e!==t?'<span class="sort-icon">\u2195</span>':`<span class="sort-icon active">${n==="asc"?"\u2191":"\u2193"}</span>`}window.makeSortIcon=makeSortIcon;function sanitizeBlockHtml(t){if(!t||typeof t!="string")return"";const e=document.createElement("div");e.innerHTML=t;const n=/^(javascript:|vbscript:|data:text\/html)/i;return e.querySelectorAll("script,style,iframe,object,embed,form,base,meta,link").forEach(i=>i.remove()),e.querySelectorAll("*").forEach(i=>{for(const o of[...i.attributes]){const s=o.name.toLowerCase();if(/^on\w+$/.test(s)||s.includes(":")||s==="action"||s==="formaction"){i.removeAttribute(o.name);continue}(s==="href"||s==="src"||s==="srcset")&&n.test(o.value.trim())&&i.removeAttribute(o.name)}}),e.innerHTML}function toggleSidebar(){const t=document.getElementById("sidebar");if((window.visualViewport?.width??window.innerWidth)<=768){openMobileSidebar();return}const e=t.classList.toggle("sidebar--collapsed");localStorage.setItem("sidebar-collapsed",e?"1":"0")}let _mobileSidebarPreviousFocus=null;function setMobileSidebarState(t){const e=document.getElementById("sidebar"),n=document.getElementById("sidebar-backdrop"),i=document.getElementById("mobile-hamburger");if(!(!e||!n)){if(e.classList.toggle("sidebar--mobile-open",t),n.classList.toggle("active",t),e.setAttribute("aria-hidden",String(!t)),i?.setAttribute("aria-expanded",String(t)),t){e.removeAttribute("inert"),document.body.style.overflow="hidden",requestAnimationFrame(()=>{e.querySelector(".nav-link, .sidebar-toggle, .btn-logout")?.focus()});return}(window.visualViewport?.width??window.innerWidth)<=768&&e.setAttribute("inert",""),document.body.style.overflow=""}}function openMobileSidebar(){_mobileSidebarPreviousFocus=document.activeElement,setMobileSidebarState(!0)}function closeMobileSidebar(){setMobileSidebarState(!1),_mobileSidebarPreviousFocus instanceof HTMLElement&&_mobileSidebarPreviousFocus.focus(),_mobileSidebarPreviousFocus=null}window.openMobileSidebar=openMobileSidebar,window.closeMobileSidebar=closeMobileSidebar,function(){localStorage.getItem("sidebar-collapsed")==="1"&&document.getElementById("sidebar")?.classList.add("sidebar--collapsed"),(window.visualViewport?.width??window.innerWidth)<=768&&(document.getElementById("sidebar")?.setAttribute("inert",""),document.getElementById("sidebar")?.setAttribute("aria-hidden","true"))}(),window.addEventListener("resize",()=>{const t=document.getElementById("sidebar"),e=document.getElementById("mobile-hamburger");if(t){if((window.visualViewport?.width??window.innerWidth)<=768){t.classList.contains("sidebar--mobile-open")||(t.setAttribute("inert",""),t.setAttribute("aria-hidden","true"),e?.setAttribute("aria-expanded","false"));return}t.removeAttribute("inert"),t.setAttribute("aria-hidden","false"),e?.setAttribute("aria-expanded","false"),document.body.style.overflow=""}});function btnLoading(t){if(!t)return;t._origHTML=t.innerHTML,t.disabled=!0;const e=t.classList.contains("btn-icon");t.innerHTML=e?'<span class="btn-spinner btn-spinner--dark"></span>':'<span class="btn-spinner"></span> \u0110ang x\u1EED l\xFD...'}let _chartJsLoadingPromise=null;function ensureChartJsLoaded(){return window.Chart?Promise.resolve(window.Chart):_chartJsLoadingPromise||(_chartJsLoadingPromise=new Promise((t,e)=>{const n=document.createElement("script");n.src="js/vendor/chart.umd.min.js",n.async=!0,n.onload=()=>t(window.Chart),n.onerror=()=>{_chartJsLoadingPromise=null,e(new Error("Kh\xF4ng th\u1EC3 t\u1EA3i Chart.js"))},document.head.appendChild(n)}),_chartJsLoadingPromise)}function renderRouteError(t,e,n=window.location.hash.slice(1)||"/classes"){const i=e?.error||e?.message||"Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u. Vui l\xF2ng th\u1EED l\u1EA1i.";$("#app").innerHTML=`
    <div class="empty-state-v2 route-error-state">
      <span class="empty-illu">\u26A0\uFE0F</span>
      <div class="empty-title">${escapeHtml(t)}</div>
      <div class="empty-desc">${escapeHtml(i)}</div>
      <div class="route-error-actions">
        <button class="btn btn-primary" onclick="router()">Th\u1EED l\u1EA1i</button>
        <button class="btn btn-outline" onclick="navigate('/classes')">V\u1EC1 l\u1EDBp h\u1ECDc</button>
      </div>
    </div>`,n&&(window._lastFailedRoute=n)}const SORTABLE_TH_ATTRS='class="sortable" role="button" tabindex="0"',QUESTION_DRAFT_PREFIX="ielts_teacher_question_draft:",QUESTION_DRAFT_TTL_MS=15*60*1e3,QUESTION_DRAFT_SAVE_INTERVAL_MS=15*1e3,QUESTION_DRAFT_SAVE_DEBOUNCE_MS=800;let _questionDraftContext=null,_questionDraftTimer=null,_questionDraftDebounceTimer=null,_suspendQuestionDraftSave=!1;function getQuestionDraftKey(t,e=""){return`${QUESTION_DRAFT_PREFIX}${t}:${e||"new"}`}function pruneTeacherQuestionDrafts(){try{for(let t=localStorage.length-1;t>=0;t--){const e=localStorage.key(t);if(!(!e||!e.startsWith(QUESTION_DRAFT_PREFIX)&&!e.startsWith(SP_DRAFT_PREFIX)))try{const n=localStorage.getItem(e);if(!n)continue;const i=JSON.parse(n);(!i?.expiresAt||i.expiresAt<=Date.now())&&localStorage.removeItem(e)}catch{localStorage.removeItem(e)}}}catch{}}function loadQuestionDraft(t){try{const e=localStorage.getItem(t);if(!e)return null;const n=JSON.parse(e);return!n?.expiresAt||n.expiresAt<=Date.now()?(localStorage.removeItem(t),null):n.data||null}catch{try{localStorage.removeItem(t)}catch{}return null}}function saveQuestionDraft(t,e){const n=Date.now();try{localStorage.setItem(t,JSON.stringify({data:e,savedAt:n,expiresAt:n+QUESTION_DRAFT_TTL_MS}))}catch{}}function clearQuestionDraft(t){if(t)try{localStorage.removeItem(t)}catch{}}function hasMeaningfulQuestionDraft(t){return t?String(t.title||"").trim()||String(t.skill||"").trim()||Array.isArray(t.tags)&&t.tags.length>0||String(t.script||"").trim()||Array.isArray(t.vocabulary)&&t.vocabulary.length>0||Array.isArray(t.questions_data)&&t.questions_data.some(n=>Array.isArray(n.answers)&&n.answers.length>0||String(n.location||"").trim()||String(n.explanation||"").trim())?!0:!!blocksToPlainText(t.content_blocks||[]).trim():!1}function getQuestionTagContainer(){return $("#q-tags-chip-edit")||$("#q-tags-chip")}function getQuestionTagInput(){return $("#q-tag-input-edit")||$("#q-tag-input")}function setQuestionChipValues(t,e,n=[]){!t||!e||(t.querySelectorAll(".chip").forEach(i=>i.remove()),n.forEach(i=>{const o=document.createElement("span");o.className="chip",o.dataset.value=String(i).trim(),o.innerHTML=`${escapeHtml(String(i).trim())} <button type="button" class="chip-remove" aria-label="Xo\xE1">\xD7</button>`,o.querySelector(".chip-remove").onclick=()=>o.remove(),t.insertBefore(o,e)}))}function snapshotCurrentQuestionDraft(){const t=$("#q-title");if(!t)return null;const e=$("#q-skill")?.value||_questionDraftContext?.skill||"";syncContentBlocksFromEditor();const n=normalizeContentBlocksForEditor(_contentBlocks);return{mode:_questionDraftContext?.mode||"new",question_id:_questionDraftContext?.questionId||"",title:t.value.trim(),skill:e,tags:(()=>{const o=getQuestionTagContainer();return o?getChipValues(o):[]})(),content_blocks:n,questions_data:e==="reading"||e==="listening"?collectAnswerGrid():[],vocabulary:Array.isArray(_vocabItems)?_vocabItems.map(o=>({...o})):[],script:e==="listening"?($("#listening-script")?.value||"").trim():""}}function flushQuestionDraftSave(){if(_questionDraftDebounceTimer&&(clearTimeout(_questionDraftDebounceTimer),_questionDraftDebounceTimer=null),_suspendQuestionDraftSave||!_questionDraftContext)return;const t=snapshotCurrentQuestionDraft();if(!hasMeaningfulQuestionDraft(t)){clearQuestionDraft(_questionDraftContext.key);return}saveQuestionDraft(_questionDraftContext.key,t)}function scheduleQuestionDraftSave(){_suspendQuestionDraftSave||!_questionDraftContext||(_questionDraftDebounceTimer&&clearTimeout(_questionDraftDebounceTimer),_questionDraftDebounceTimer=setTimeout(()=>{_questionDraftDebounceTimer=null,flushQuestionDraftSave()},QUESTION_DRAFT_SAVE_DEBOUNCE_MS))}function stopQuestionDraftAutosave(){flushQuestionDraftSave(),_questionDraftTimer&&clearInterval(_questionDraftTimer),_questionDraftDebounceTimer&&clearTimeout(_questionDraftDebounceTimer),_questionDraftTimer=null,_questionDraftDebounceTimer=null,_questionDraftContext=null}function startQuestionDraftAutosave(t,e="",n=""){stopQuestionDraftAutosave(),_questionDraftContext={mode:t,questionId:e,key:getQuestionDraftKey(t,e),skill:n},_questionDraftTimer=setInterval(flushQuestionDraftSave,QUESTION_DRAFT_SAVE_INTERVAL_MS)}function restoreQuestionDraftIntoForm(t,e="",n=""){const i=loadQuestionDraft(getQuestionDraftKey(t,e));if(!i)return!1;_suspendQuestionDraftSave=!0;try{const o=$("#q-title");o&&(o.value=i.title||"");const s=$("#q-skill"),a=i.skill||n||s?.value||"";s&&!s.disabled&&(s.value=a,onSkillChange(a));const r=getQuestionTagContainer(),l=getQuestionTagInput();r&&l&&setQuestionChipValues(r,l,i.tags||[]),initContentComposer(i.content_blocks||[],""),(a==="reading"||a==="listening")&&Array.isArray(i.questions_data)&&i.questions_data.length>0&&renderAnswerGridWithData(i.questions_data),_vocabItems=Array.isArray(i.vocabulary)?i.vocabulary.map(d=>({...d})):[],(a==="reading"||a==="listening")&&renderVocabList();const c=$("#listening-script");return c&&(c.value=i.script||"",a==="listening"&&(_speakerNames=[],_refreshSpeakerNames(),_renderSpeakerRenameUI())),attachChipListeners(),!0}finally{_suspendQuestionDraftSave=!1}}function isQuestionDraftTarget(t){return!!(_questionDraftContext&&t instanceof Element&&t.closest("#app .form-card"))}document.addEventListener("input",t=>{isQuestionDraftTarget(t.target)&&scheduleQuestionDraftSave()},!0),document.addEventListener("change",t=>{isQuestionDraftTarget(t.target)&&scheduleQuestionDraftSave()},!0),document.addEventListener("click",t=>{if(!(t.target instanceof Element))return;const e=t.target.closest(".chip-remove, .vocab-remove, .vocab-edit, .btn-clear-location");!e||!isQuestionDraftTarget(e)||setTimeout(scheduleQuestionDraftSave,0)});const SP_DRAFT_PREFIX="ielts_teacher_sp_draft:";let _spDraftContext=null,_spDraftTimer=null,_spDraftDebounceTimer=null,_suspendSpDraftSave=!1;function getSpDraftKey(t,e=""){return`${SP_DRAFT_PREFIX}${t}:${e||"new"}`}function snapshotCurrentSpDraft(){const t=$("#sp-title");if(!t)return null;const e=$("#sp-skill")?.value||_spDraftContext?.skill||"";syncContentBlocksFromEditor();const n=normalizeContentBlocksForEditor(_contentBlocks);return{mode:_spDraftContext?.mode||"new",sp_id:_spDraftContext?.spId||"",title:t.value.trim(),skill:e,time_limit_minutes:$("#sp-time-limit")?.value.trim()||"",tags:getChipValues($("#sp-tags-chip")),content_blocks:n,questions_data:e==="reading"||e==="listening"?collectAnswerGrid():[],vocabulary:Array.isArray(_vocabItems)?_vocabItems.map(i=>({...i})):[],script:e==="listening"?($("#listening-script")?.value||"").trim():""}}function flushSpDraftSave(){if(_spDraftDebounceTimer&&(clearTimeout(_spDraftDebounceTimer),_spDraftDebounceTimer=null),_suspendSpDraftSave||!_spDraftContext)return;const t=snapshotCurrentSpDraft();if(!hasMeaningfulQuestionDraft(t)){clearQuestionDraft(_spDraftContext.key);return}saveQuestionDraft(_spDraftContext.key,t)}function scheduleSpDraftSave(){_suspendSpDraftSave||!_spDraftContext||(_spDraftDebounceTimer&&clearTimeout(_spDraftDebounceTimer),_spDraftDebounceTimer=setTimeout(()=>{_spDraftDebounceTimer=null,flushSpDraftSave()},QUESTION_DRAFT_SAVE_DEBOUNCE_MS))}function stopSpDraftAutosave(){flushSpDraftSave(),_spDraftTimer&&clearInterval(_spDraftTimer),_spDraftDebounceTimer&&clearTimeout(_spDraftDebounceTimer),_spDraftTimer=null,_spDraftDebounceTimer=null,_spDraftContext=null}function startSpDraftAutosave(t,e="",n=""){stopSpDraftAutosave(),_spDraftContext={mode:t,spId:e,key:getSpDraftKey(t,e),skill:n},_spDraftTimer=setInterval(flushSpDraftSave,QUESTION_DRAFT_SAVE_INTERVAL_MS)}function restoreSpDraftIntoForm(t,e="",n="",i=null){const o=loadQuestionDraft(getSpDraftKey(t,e));if(!o)return!1;_suspendSpDraftSave=!0;try{const s=$("#sp-title");s&&(s.value=o.title||"");const a=$("#sp-time-limit");a&&o.time_limit_minutes&&(a.value=o.time_limit_minutes);const r=o.skill||n||"",l=$("#sp-skill");if(l&&r){l.value=r;const u={skill:r,content_blocks:o.content_blocks||[],content_text:"",questions_data:o.questions_data||[],vocabulary:o.vocabulary||[],script:o.script||"",content_urls:i?.content_urls,content_url:i?.content_url};onSharedSkillChange(r,u)}const c=$("#sp-tags-chip"),d=$("#sp-tag-input");return c&&d&&setQuestionChipValues(c,d,o.tags||[]),attachChipListeners($("#sp-tag-input"),$("#sp-tags-chip")),!0}finally{_suspendSpDraftSave=!1}}function isSpDraftTarget(t){return!!(_spDraftContext&&t instanceof Element&&t.closest("#app .form-card"))}document.addEventListener("input",t=>{isSpDraftTarget(t.target)&&scheduleSpDraftSave()},!0),document.addEventListener("change",t=>{isSpDraftTarget(t.target)&&scheduleSpDraftSave()},!0),document.addEventListener("click",t=>{if(!(t.target instanceof Element))return;const e=t.target.closest(".chip-remove, .vocab-remove, .vocab-edit, .btn-clear-location");!e||!isSpDraftTarget(e)||setTimeout(scheduleSpDraftSave,0)});function formatDate(t){return t?new Date(t).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}):"\u2014"}const SKILL_LABELS={reading:{icon:"\u{1F4D6}",label:"Reading",badge:"badge-reading"},listening:{icon:"\u{1F3A7}",label:"Listening",badge:"badge-listening"},writing:{icon:"\u270D\uFE0F",label:"Writing",badge:"badge-writing"},speaking:{icon:"\u{1F3A4}",label:"Speaking",badge:"badge-speaking"},composite:{icon:"\u{1F4CB}",label:"T\u1ED5ng h\u1EE3p",badge:"badge-composite"}},FILTERABLE_ASSIGNMENT_SKILLS=["reading","listening","writing","speaking","composite"];function skillBadge(t){const e=SKILL_LABELS[t]||{icon:"?",label:t,badge:""};return`<span class="badge ${e.badge}">${e.icon} ${e.label}</span>`}let _modalPreviousFocus=null;const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';function openModal(t,e){const n=$("#modal-overlay"),i=n?.querySelector(".modal");_modalPreviousFocus=document.activeElement,$("#modal-title").textContent=t,$("#modal-body").innerHTML=e,n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true"),n.setAttribute("aria-labelledby","modal-title"),n.classList.remove("hidden");const o=(i||n).querySelector(FOCUSABLE);o&&o.focus()}function confirmAction({title:t="X\xE1c nh\u1EADn thao t\xE1c",message:e,confirmText:n="X\xE1c nh\u1EADn",cancelText:i="Hu\u1EF7",danger:o=!1}={}){return new Promise(s=>{openModal(t,`
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="line-height:1.6;color:var(--text)">${e||""}</div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-outline" data-confirm-action="cancel">${escapeHtml(i)}</button>
          <button class="btn ${o?"btn-danger":"btn-primary"}" data-confirm-action="confirm">${escapeHtml(n)}</button>
        </div>
      </div>
    `);const a=$("#modal-overlay"),r=a?.querySelector('[data-confirm-action="cancel"]'),l=a?.querySelector('[data-confirm-action="confirm"]');let c=!1;const d=u=>{c||(c=!0,window._modalCloseCallback=null,closeModal(),s(u))};window._modalCloseCallback=()=>d(!1),r.onclick=()=>d(!1),l.onclick=()=>d(!0),a.onclick=u=>{u.target===a&&d(!1)}})}function promptAction({title:t="Nh\u1EADp th\xF4ng tin",message:e="",initialValue:n="",placeholder:i="",confirmText:o="L\u01B0u",cancelText:s="Hu\u1EF7",validate:a}={}){return new Promise(r=>{openModal(t,`
      <div style="display:flex;flex-direction:column;gap:16px">
        ${e?`<div style="line-height:1.6;color:var(--text)">${e}</div>`:""}
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="prompt-action-input" class="form-input" type="text" value="${escapeHtml(n)}" placeholder="${escapeHtml(i)}" />
          <div id="prompt-action-error" style="min-height:18px;font-size:12px;color:var(--danger)"></div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-outline" data-prompt-action="cancel">${escapeHtml(s)}</button>
          <button class="btn btn-primary" data-prompt-action="confirm">${escapeHtml(o)}</button>
        </div>
      </div>
    `);const l=$("#modal-overlay"),c=l?.querySelector("#prompt-action-input"),d=l?.querySelector("#prompt-action-error"),u=l?.querySelector('[data-prompt-action="cancel"]'),m=l?.querySelector('[data-prompt-action="confirm"]');let h=!1;const g=w=>{h||(h=!0,window._modalCloseCallback=null,closeModal(),r(w))};window._modalCloseCallback=()=>g(null);const f=()=>{const w=c?.value??"",y=w.trim(),C=typeof a=="function"?a(y,w):"";if(C){d&&(d.textContent=C),c?.focus(),c?.select?.();return}g(y)};u.onclick=()=>g(null),m.onclick=f,c?.addEventListener("keydown",w=>{w.key==="Enter"&&(w.preventDefault(),f())}),l.onclick=w=>{w.target===l&&g(null)},requestAnimationFrame(()=>{c?.focus(),c?.select?.()})})}let _oneTimeStudentCredentials=null;function closeModal(t){const e=$("#modal-overlay");t&&t.target!==e||(_oneTimeStudentCredentials=null,e&&(e.onclick=n=>closeModal(n)),window._modalCloseCallback&&(window._modalCloseCallback(),window._modalCloseCallback=null),e.classList.add("hidden"),$("#modal-body").innerHTML="",_modalPreviousFocus&&(_modalPreviousFocus.focus(),_modalPreviousFocus=null))}document.addEventListener("keydown",t=>{const e=$("#modal-overlay");if(!e||e.classList.contains("hidden"))return;const n=e.querySelector(".modal")||e;if(t.key==="Escape"){closeModal();return}if(t.key==="Tab"){const i=[...n.querySelectorAll(FOCUSABLE)];if(!i.length)return;const o=i[0],s=i[i.length-1];(t.shiftKey?document.activeElement===o:document.activeElement===s)&&(t.preventDefault(),(t.shiftKey?s:o).focus())}});function splitDelimitedList(t,e=/\n/){return String(t||"").split(e).map(n=>n.trim()).filter(Boolean)}function csvEscape(t){return`"${String(t??"").replace(/"/g,'""')}"`}function downloadCsvFile(t,e,n){const i=[e,...n].map(r=>r.map(csvEscape).join(",")).join(`
`),o=new Blob(["\uFEFF"+i],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(o),a=document.createElement("a");a.href=s,a.download=t,a.click(),URL.revokeObjectURL(s)}async function downloadAudioFile(t,e,n){if(!t)return;const i=n?n.innerHTML:"";try{n&&(n.disabled=!0,n.innerHTML="\u23F3");const o=await fetch(t,{cache:"no-store"});if(!o.ok)throw new Error("fetch failed");const s=await o.blob(),a=(t.split("?")[0].match(/\.([a-zA-Z0-9]+)$/)||[])[1],r=(s.type.split("/")[1]||"").split(";")[0],l=a||r||"webm",c=(e||"audio").replace(/\.[a-zA-Z0-9]{2,5}$/,""),d=URL.createObjectURL(s),u=document.createElement("a");u.href=d,u.download=`${c}.${l}`,document.body.appendChild(u),u.click(),u.remove(),URL.revokeObjectURL(d)}catch(o){toast("T\u1EA3i file th\u1EA5t b\u1EA1i: "+(o.message||"l\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh"),"error")}finally{n&&(n.disabled=!1,n.innerHTML=i)}}window.downloadAudioFile=downloadAudioFile;function buildStudentCredentialsFilename(t="student_accounts"){const e=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");return`${t}_${e}.csv`}function openStudentCredentialsModal(t,e,n="student_accounts"){const i=(Array.isArray(e)?e:[]).map(o=>({full_name:String(o?.full_name||"").trim(),username:String(o?.username||"").trim(),password:String(o?.password||"")})).filter(o=>o.full_name&&o.username&&o.password);_oneTimeStudentCredentials=i.length>0?{rows:i,fileName:buildStudentCredentialsFilename(n)}:null,openModal(t,`
    <div style="padding:2px 0 6px">
      <div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;background:#fff7e6;border:1px solid #f6d38b;color:#7a5600;font-size:13px;line-height:1.5">
        Th\xF4ng tin \u0111\u0103ng nh\u1EADp n\xE0y ch\u1EC9 hi\u1EC3n th\u1ECB \u0111\xFAng 1 l\u1EA7n. H\xE3y t\u1EA3i file ho\u1EB7c g\u1EEDi l\u1EA1i cho h\u1ECDc sinh ngay b\xE2y gi\u1EDD.
      </div>
      <div style="max-height:320px;overflow:auto;border:1px solid var(--gray-200);border-radius:14px">
        <table>
          <thead>
            <tr><th>H\u1ECD v\xE0 t\xEAn</th><th>Username</th><th>Password</th></tr>
          </thead>
          <tbody>
            ${i.map(o=>`
              <tr>
                <td>${escapeHtml(o.full_name)}</td>
                <td style="font-family:monospace">${escapeHtml(o.username)}</td>
                <td style="font-family:monospace">${escapeHtml(o.password)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
      <button class="btn btn-primary" onclick="downloadStudentCredentialsCsv()">\u{1F4E5} T\u1EA3i CSV</button>
    </div>`)}function downloadStudentCredentialsCsv(){_oneTimeStudentCredentials?.rows?.length&&downloadCsvFile(_oneTimeStudentCredentials.fileName,["H\u1ECD t\xEAn","Username","Password"],_oneTimeStudentCredentials.rows.map(t=>[t.full_name,t.username,t.password]))}function addChip(t,e){if(!e.trim())return;const n=document.createElement("span");n.className="chip",n.dataset.value=e.trim(),n.innerHTML=`${e.trim()} <button class="chip-remove" title="Xo\xE1">\xD7</button>`,n.querySelector(".chip-remove").onclick=()=>n.remove();const i=t.querySelector(".chip-input");t.insertBefore(n,i),scheduleQuestionDraftSave()}function getChipValues(t){return Array.from(t.querySelectorAll(".chip")).map(e=>e.dataset.value)}function _chipKeydown(t){t.isComposing||t.keyCode===229||t.key==="Enter"&&t.target.value.trim()&&(t.preventDefault(),addChip(t.target.parentElement,t.target.value.trim()),t.target.value="")}function _chipBlur(t){const e=t.target.value.trim();e&&(addChip(t.target.parentElement,e),t.target.value="")}function attachChipListeners(){document.querySelectorAll(".chip-input").forEach(t=>{t.removeEventListener("keydown",_chipKeydown),t.removeEventListener("blur",_chipBlur),t.addEventListener("keydown",_chipKeydown),t.addEventListener("blur",_chipBlur)})}function checkEmptyAnswers(){const t=document.querySelectorAll("#answer-grid .answer-row"),e=[];return t.forEach((n,i)=>{const o=n.querySelector(".chip-container"),s=o?o.querySelectorAll(".chip"):[],a=n.querySelector(".chip-input")?.value.trim()||"";s.length===0&&!a&&e.push(i+1)}),e}function confirmSaveWithEmptyAnswers(t,e){const n=t.map(o=>`Q${o}`).join(", "),i=document.createElement("div");i.className="modal-overlay",i.innerHTML=`
    <div class="modal" style="max-width:400px">
      <div class="modal-header"><h3>\u26A0\uFE0F C\xE2u ch\u01B0a c\xF3 \u0111\xE1p \xE1n</h3></div>
      <div class="modal-body">
        <p style="margin:0 0 8px">C\xE1c c\xE2u sau ch\u01B0a c\xF3 \u0111\xE1p \xE1n: <strong>${n}</strong></p>
        <p style="margin:0;font-size:13px;color:var(--gray-500)">B\u1EA1n v\u1EABn mu\u1ED1n l\u01B0u?</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="confirm-cancel-save">Quay l\u1EA1i \u0111i\u1EC1n</button>
        <button class="btn btn-primary" id="confirm-do-save">V\u1EABn l\u01B0u</button>
      </div>
    </div>`,document.body.appendChild(i),i.querySelector("#confirm-cancel-save").onclick=()=>i.remove(),i.querySelector("#confirm-do-save").onclick=()=>{i.remove(),e()},i.addEventListener("click",o=>{o.target===i&&i.remove()})}function collectAnswerGrid(){const t=document.querySelectorAll("#answer-grid .answer-row");return Array.from(t).map((e,n)=>{const i=e.querySelector(".chip-container"),o=getChipValues(i),s=e.querySelector(".answer-location")?.value.trim()||"",a=e.querySelector(".answer-location-meta")?.value.trim()||"",r=e.querySelector(".answer-explanation")?.value.trim()||"",l={q_no:n+1,answers:o};if(s&&(l.location=s),a)try{l.location_meta=JSON.parse(a)}catch{}return r&&(l.explanation=r),l})}function _createAnswerRow(t,e=null){const n=document.createElement("div");n.className="answer-row";const i=document.createElement("div");i.className="answer-row-main";const o=document.createElement("span");o.className="q-label",o.textContent=`Q${t}`;const s=document.createElement("div");if(s.className="chip-container",e?.answers)for(const m of e.answers){const h=document.createElement("span");h.className="chip",h.dataset.value=m,h.innerHTML=`${escapeHtml(m)} <button class="chip-remove" title="Xo\xE1" aria-label="Xo\xE1">\xD7</button>`,h.querySelector(".chip-remove").onclick=()=>h.remove(),s.appendChild(h)}const a=document.createElement("input");a.className="chip-input",a.placeholder="\u0110\xE1p \xE1n + Enter",s.appendChild(a);const r=document.createElement("button");r.className="btn-delete-row",r.title="Xo\xE1 c\xE2u n\xE0y",r.setAttribute("aria-label","Xo\xE1 c\xE2u n\xE0y"),r.textContent="\xD7",r.onclick=function(){removeAnswerRow(this.closest(".answer-row"))},i.appendChild(o),i.appendChild(s),i.appendChild(r);const l=document.createElement("div");l.className="location-row",l.innerHTML=`
    <span class="field-section-label">\u{1F4CD} V\u1ECB tr\xED:</span>
    <span class="location-text-display">${e?.location||"Ch\u01B0a ch\u1ECDn"}</span>
    <input type="hidden" class="answer-location" value="${escapeHtml(e?.location||"")}" />
    <input type="hidden" class="answer-location-meta" value="${e?.location_meta?escapeHtml(JSON.stringify(e.location_meta)):""}" />
    <button class="btn-clear-location${e?.location?"":" hidden"}" onclick="clearLocationValue(this.closest('.answer-row'))" aria-label="Xo\xE1 v\u1ECB tr\xED">\xD7</button>
    <button class="btn-pick-location" onclick="activateLocationPick(this.closest('.answer-row'))">Ch\u1ECDn</button>`;const c=document.createElement("div");c.className="explanation-row";const d=document.createElement("span");d.className="field-section-label",d.textContent="\u{1F4A1} Gi\u1EA3i th\xEDch:";const u=document.createElement("textarea");return u.className="answer-explanation",u.rows=2,u.placeholder="Nh\u1EADp gi\u1EA3i th\xEDch \u0111\xE1p \xE1n...",u.value=e?.explanation||"",c.appendChild(d),c.appendChild(u),n.appendChild(i),n.appendChild(l),n.appendChild(c),n}function renumberAnswerRows(){const t=document.querySelectorAll("#answer-grid .answer-row");t.forEach((n,i)=>{const o=n.querySelector(".q-label");o&&(o.textContent=`Q${i+1}`)});const e=$("#answer-count");e&&(e.value=t.length)}function removeAnswerRow(t){t.remove(),renumberAnswerRows()}function addAnswerRow(){const t=$("#answer-grid");if(!t)return;const e=t.querySelectorAll(".answer-row").length,n=_createAnswerRow(e+1);t.appendChild(n),attachChipListeners(),renumberAnswerRows(),n.scrollIntoView({behavior:"smooth",block:"nearest"})}function renderAnswerGrid(t){const e=$("#answer-grid");if(e){e.innerHTML="";for(let n=1;n<=t;n++)e.appendChild(_createAnswerRow(n));attachChipListeners()}}const routes={"/classes":showClasses,"/class/:id":showClassDetail,"/assignment/:id":showAssignmentSubmissions,"/grading/:id":showGradingPage,"/questions":showQuestions,"/questions/new":showQuestionForm,"/questions/:id":showQuestionDetail,"/shared-pool":showSharedPool,"/shared-pool/new":showSharedPoolForm,"/shared-pool/:id":showSharedPoolDetail,"/composite/:id":showCompositeSubmissions,"/inbox":showInbox,"/graded":showGraded,"/profile-fields":showProfileFields},routeLoadingMessages={"/classes":"\u0110ang t\u1EA3i danh s\xE1ch l\u1EDBp...","/class/:id":"\u0110ang t\u1EA3i th\xF4ng tin l\u1EDBp...","/assignment/:id":"\u0110ang t\u1EA3i danh s\xE1ch b\xE0i n\u1ED9p...","/grading/:id":"\u0110ang t\u1EA3i b\xE0i l\xE0m...","/questions":"\u0110ang t\u1EA3i kho \u0111\u1EC1...","/questions/new":"\u0110ang m\u1EDF form t\u1EA1o \u0111\u1EC1...","/questions/:id":"\u0110ang t\u1EA3i \u0111\u1EC1...","/shared-pool":"\u0110ang t\u1EA3i kho \u0111\u1EC1 luy\u1EC7n t\u1EADp...","/shared-pool/new":"\u0110ang m\u1EDF form t\u1EA1o \u0111\u1EC1...","/shared-pool/:id":"\u0110ang t\u1EA3i \u0111\u1EC1...","/inbox":"\u0110ang t\u1EA3i h\u1ED9p th\u01B0...","/graded":"\u0110ang t\u1EA3i b\xE0i \u0111\xE3 ch\u1EA5m...","/profile-fields":"\u0110ang t\u1EA3i h\u1ED3 s\u01A1 h\u1ECDc sinh..."};function navigate(t){flushQuestionDraftSave(),closeMobileSidebar(),window.location.hash=t}let _navSeq=0;function routeToken(){return _navSeq}function routeChanged(t){return t!==_navSeq}function router(){_navSeq++,stopQuestionDraftAutosave(),stopSpDraftAutosave(),document.getElementById("preview-sticky-float")?.classList.remove("is-visible"),document.getElementById("preview-sticky-toggle")?.classList.remove("is-visible");const t=window.location.hash.slice(1)||"/classes";try{hideTableFloatToolbar(),clearTableCellSelection(),_activeTableCell=null,document.querySelectorAll(".nav-link").forEach(e=>{const n=e.dataset.route;e.classList.toggle("active",n==="classes"&&t.startsWith("/class")||n==="questions"&&t.startsWith("/questions")||n==="shared-pool"&&t.startsWith("/shared-pool")||n==="inbox"&&t==="/inbox"||n==="graded"&&t.startsWith("/graded")||n==="profile-fields"&&t.startsWith("/profile-fields"))});for(const[e,n]of Object.entries(routes)){const i=matchRoute(e,t);if(i!==null){const o=routeLoadingMessages[e];o&&setLoading(o);const s=n(i);s&&typeof s.catch=="function"&&s.catch(a=>{console.error("Route error:",a),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c trang",a,t)});return}}setLoading(routeLoadingMessages["/classes"]),showClasses({})}catch(e){console.error("Router boot error:",e),renderRouteError("Kh\xF4ng m\u1EDF \u0111\u01B0\u1EE3c trang",e,t)}}function matchRoute(t,e){const n=t.split("/"),i=e.split("/");if(n.length!==i.length)return null;const o={};for(let s=0;s<n.length;s++)if(n[s].startsWith(":"))o[n[s].slice(1)]=i[s];else if(n[s]!==i[s])return null;return o}window.addEventListener("hashchange",router);let _inboxItems=[],_inboxSortCol="submitted_at",_inboxSortDir="desc",_inboxGradedItems=null,_inboxGradedSortCol="submitted_at",_inboxGradedSortDir="desc";const HIDDEN_GRADED_CLASSES=["TEST CLASS"];let _gradedShowHidden=!1;function isHiddenGradedClass(t){const e=String(t||"").trim().toLowerCase();return HIDDEN_GRADED_CLASSES.some(n=>n.toLowerCase()===e)}function visibleGradedItems(){const t=_inboxGradedItems||[];return _gradedShowHidden?t:t.filter(e=>!isHiddenGradedClass(e.class_name))}function toggleGradedHidden(){_gradedShowHidden=!_gradedShowHidden,renderGraded()}window.toggleGradedHidden=toggleGradedHidden;async function showInbox(){_inboxSortCol="submitted_at",_inboxSortDir="desc",setLoading("\u0110ang t\u1EA3i h\u1ED9p th\u01B0...");const t=routeToken();try{const e=await api.get("/inbox");if(routeChanged(t))return;_inboxItems=e,renderInbox(),updateInboxBadge(e.length)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i inbox: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c h\u1ED9p th\u01B0",e,"/inbox")}}async function showGraded(){_inboxGradedSortCol="submitted_at",_inboxGradedSortDir="desc",_gradedShowHidden=!1,setLoading("\u0110ang t\u1EA3i b\xE0i \u0111\xE3 ch\u1EA5m...");const t=routeToken();try{const e=await api.get("/inbox/graded");if(routeChanged(t))return;_inboxGradedItems=e,renderGraded()}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i b\xE0i \u0111\xE3 ch\u1EA5m: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\xE1ch \u0111\xE3 ch\u1EA5m",e,"/graded")}}function sortedInboxItems(){return _inboxSortCol?[..._inboxItems].sort((t,e)=>{let n,i;if(_inboxSortCol==="student_name")n=t.student_name.toLowerCase(),i=e.student_name.toLowerCase();else if(_inboxSortCol==="class_name")n=t.class_name.toLowerCase(),i=e.class_name.toLowerCase();else if(_inboxSortCol==="skill")n=t.skill||"",i=e.skill||"";else if(_inboxSortCol==="submitted_at")n=t.submitted_at||"",i=e.submitted_at||"";else return 0;return n<i?_inboxSortDir==="asc"?-1:1:n>i?_inboxSortDir==="asc"?1:-1:0}):_inboxItems}function sortInbox(t){_inboxSortCol===t?_inboxSortDir=_inboxSortDir==="asc"?"desc":"asc":(_inboxSortCol=t,_inboxSortDir=t==="student_name"||t==="class_name"?"asc":"desc");const e=document.getElementById("inbox-list-body");e&&(e.innerHTML=buildInboxRows(sortedInboxItems())),document.querySelectorAll("th[data-inbox-col]").forEach(n=>{const i=n.querySelector(".sort-icon");i&&i.remove(),n.insertAdjacentHTML("beforeend",makeSortIcon(n.dataset.inboxCol,_inboxSortCol,_inboxSortDir))})}window.sortInbox=sortInbox;function buildInboxRows(t){return t.length===0?`<tr><td colspan="5"><div class="empty-state-v2">
        <span class="empty-illu">\u2705</span>
        <div class="empty-title">Kh\xF4ng c\xF3 b\xE0i n\xE0o c\u1EA7n ch\u1EA5m!</div>
        <div class="empty-desc">T\u1EA5t c\u1EA3 b\xE0i Writing v\xE0 Speaking \u0111\xE3 \u0111\u01B0\u1EE3c ch\u1EA5m xong.</div>
      </div></td></tr>`:t.map(e=>`
      <tr>
        <td>${skillBadge(e.skill)}</td>
        <td><strong>${escapeHtml(e.student_name)}</strong></td>
        <td>
          ${escapeHtml(e.assignment_title)}
          ${(e.attempt_number||1)>1?`<span class="inbox-rewrite-badge">B\xC0I L\xC0M L\u1EA0I \xB7 L\u1EA7n ${e.attempt_number}</span>`:""}
        </td>
        <td><span class="inbox-class">${escapeHtml(e.class_name)}</span></td>
        <td style="font-size:12px;color:var(--gray-400)">${formatDateTime(e.submitted_at)}</td>
        <td>
          <button class="btn btn-sm btn-primary inbox-grade-btn"
            onclick="openInboxSubmission('${e.submission_kind||"assignment"}','${e.submission_id}','${e.skill}','${e.assignment_id||""}')">\u270F\uFE0F Ch\u1EA5m b\xE0i</button>
        </td>
      </tr>`).join("")}function openInboxSubmission(t,e,n,i){navigate(`/grading/${e}`)}window.openInboxSubmission=openInboxSubmission;function renderInbox(){const t=e=>makeSortIcon(e,_inboxSortCol,_inboxSortDir);$("#app").innerHTML=`
    <div class="page-header">
      <div>
        <div class="page-title">\u{1F4E5} C\u1EA7n ch\u1EA5m</div>
        <div class="page-subtitle">${_inboxItems.length} b\xE0i Writing/Speaking ch\u01B0a ch\u1EA5m \u0111i\u1EC3m</div>
      </div>
    </div>
    ${_inboxItems.length>0?`
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th ${SORTABLE_TH_ATTRS} data-inbox-col="skill" onclick="sortInbox('skill')">K\u1EF9 n\u0103ng ${t("skill")}</th>
          <th ${SORTABLE_TH_ATTRS} data-inbox-col="student_name" onclick="sortInbox('student_name')">H\u1ECDc sinh ${t("student_name")}</th>
          <th>B\xE0i t\u1EADp</th>
          <th ${SORTABLE_TH_ATTRS} data-inbox-col="class_name" onclick="sortInbox('class_name')">L\u1EDBp ${t("class_name")}</th>
          <th ${SORTABLE_TH_ATTRS} data-inbox-col="submitted_at" onclick="sortInbox('submitted_at')">Th\u1EDDi gian n\u1ED9p ${t("submitted_at")}</th>
          <th></th>
        </tr></thead>
        <tbody id="inbox-list-body">${buildInboxRows(sortedInboxItems())}</tbody>
      </table>
    </div>`:buildInboxRows([])}`}function renderGraded(){const e=(_inboxGradedItems||[]).filter(o=>isHiddenGradedClass(o.class_name)).length,n=visibleGradedItems().length,i=e>0?`
      <button class="btn btn-sm btn-outline" onclick="toggleGradedHidden()" title="L\u1EDBp test d\xF9ng \u0111\u1EC3 dev \u2014 m\u1EB7c \u0111\u1ECBnh \u1EA9n">
        ${_gradedShowHidden?"\u{1F648} \u1EA8n l\u1EDBp test":`\u{1F441} Hi\u1EC7n l\u1EDBp test (${e})`}
      </button>`:"";$("#app").innerHTML=`
    <div class="page-header">
      <div>
        <div class="page-title">\u2705 \u0110\xE3 ch\u1EA5m</div>
        <div class="page-subtitle">${n} b\xE0i Writing/Speaking \u0111\xE3 ch\u1EA5m</div>
      </div>
      ${i}
    </div>
    ${inboxGradedHtml()}`}function sortedGradedItems(){const t=visibleGradedItems();return _inboxGradedSortCol?[...t].sort((e,n)=>{let i,o;switch(_inboxGradedSortCol){case"student_name":i=e.student_name.toLowerCase(),o=n.student_name.toLowerCase();break;case"class_name":i=e.class_name.toLowerCase(),o=n.class_name.toLowerCase();break;case"skill":i=e.skill||"",o=n.skill||"";break;case"overall_score":i=Number(e.overall_score)||0,o=Number(n.overall_score)||0;break;case"submitted_at":i=e.submitted_at||"",o=n.submitted_at||"";break;default:return 0}return i<o?_inboxGradedSortDir==="asc"?-1:1:i>o?_inboxGradedSortDir==="asc"?1:-1:0}):t}function sortInboxGraded(t){_inboxGradedSortCol===t?_inboxGradedSortDir=_inboxGradedSortDir==="asc"?"desc":"asc":(_inboxGradedSortCol=t,_inboxGradedSortDir=t==="student_name"||t==="class_name"||t==="skill"?"asc":"desc");const e=document.getElementById("inbox-graded-body");e&&(e.innerHTML=buildGradedRows(sortedGradedItems())),document.querySelectorAll("th[data-graded-col]").forEach(n=>{const i=n.querySelector(".sort-icon");i&&i.remove(),n.insertAdjacentHTML("beforeend",makeSortIcon(n.dataset.gradedCol,_inboxGradedSortCol,_inboxGradedSortDir))})}window.sortInboxGraded=sortInboxGraded;function inboxGradedHtml(){if(sortedGradedItems().length===0)return`<div class="empty-state-v2">
      <span class="empty-illu">\u{1F4ED}</span>
      <div class="empty-title">Ch\u01B0a c\xF3 b\xE0i n\xE0o \u0111\xE3 ch\u1EA5m</div>
      <div class="empty-desc">C\xE1c b\xE0i Writing/Speaking \u0111\xE3 ch\u1EA5m \u0111i\u1EC3m s\u1EBD hi\u1EC3n th\u1ECB \u1EDF \u0111\xE2y.</div>
    </div>`;const e=n=>makeSortIcon(n,_inboxGradedSortCol,_inboxGradedSortDir);return`
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th ${SORTABLE_TH_ATTRS} data-graded-col="skill" onclick="sortInboxGraded('skill')">K\u1EF9 n\u0103ng ${e("skill")}</th>
          <th ${SORTABLE_TH_ATTRS} data-graded-col="student_name" onclick="sortInboxGraded('student_name')">H\u1ECDc sinh ${e("student_name")}</th>
          <th>B\xE0i t\u1EADp</th>
          <th ${SORTABLE_TH_ATTRS} data-graded-col="class_name" onclick="sortInboxGraded('class_name')">L\u1EDBp ${e("class_name")}</th>
          <th ${SORTABLE_TH_ATTRS} data-graded-col="submitted_at" onclick="sortInboxGraded('submitted_at')">Th\u1EDDi gian n\u1ED9p ${e("submitted_at")}</th>
          <th ${SORTABLE_TH_ATTRS} data-graded-col="overall_score" onclick="sortInboxGraded('overall_score')">\u0110i\u1EC3m ${e("overall_score")}</th>
          <th></th>
        </tr></thead>
        <tbody id="inbox-graded-body">${buildGradedRows(sortedGradedItems())}</tbody>
      </table>
    </div>`}function buildGradedRows(t){return t.map(e=>{const n=(e.attempt_number||1)>1?`<span class="inbox-rewrite-badge">B\xC0I L\xC0M L\u1EA0I \xB7 L\u1EA7n ${e.attempt_number}</span>`:"",i=e.rewrite_status==="requested"?'<span class="inbox-rewrite-pending-badge">\u270F\uFE0F \u0110\xE3 y\xEAu c\u1EA7u l\xE0m l\u1EA1i</span>':"";return`
    <tr>
      <td>${skillBadge(e.skill)}</td>
      <td><strong>${escapeHtml(e.student_name)}</strong></td>
      <td>
        ${escapeHtml(e.assignment_title)}
        ${n}${i}
      </td>
      <td><span class="inbox-class">${escapeHtml(e.class_name)}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${formatDateTime(e.submitted_at)}</td>
      <td><span class="inbox-score-pill">${e.overall_score!=null?Number(e.overall_score).toFixed(1):"\u2014"}</span></td>
      <td>
        <button class="btn btn-sm btn-outline"
          onclick="openInboxSubmission('${e.submission_kind||"assignment"}','${e.submission_id}','${e.skill}','${e.assignment_id||""}')">\u{1F441} Xem l\u1EA1i</button>
      </td>
    </tr>`}).join("")}function updateInboxBadge(t){const e=document.getElementById("inbox-badge");e&&(t>0?(e.textContent=t>99?"99+":t,e.classList.remove("hidden")):e.classList.add("hidden"))}window.updateInboxBadge=updateInboxBadge;async function refreshInboxBadge(){try{const t=await api.get("/inbox");updateInboxBadge(t.length)}catch{}}async function showClasses(){setLoading("\u0110ang t\u1EA3i danh s\xE1ch l\u1EDBp...");const t=routeToken();try{const e=await api.get("/classes");if(routeChanged(t))return;renderClasses(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i danh s\xE1ch l\u1EDBp: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\xE1ch l\u1EDBp",e,"/classes")}}function renderClasses(t){_allClasses=t,_applyClassFilter()}function _applyClassFilter(){let e=_allClasses.filter(l=>l.class_name.toLowerCase().includes(_classSearch.toLowerCase())||(l.description||"").toLowerCase().includes(_classSearch.toLowerCase()));_classSort==="name"?e=e.slice().sort((l,c)=>l.class_name.localeCompare(c.class_name)):_classSort==="students"&&(e=e.slice().sort((l,c)=>c.student_count-l.student_count));const n=`
    <div class="empty-state">
      <div class="empty-state-icon">\u{1F3EB}</div>
      <h3>${_classSearch?"Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp n\xE0o":"Ch\u01B0a c\xF3 l\u1EDBp h\u1ECDc n\xE0o"}</h3>
      <p>${_classSearch?"Th\u1EED t\xECm ki\u1EBFm v\u1EDBi t\u1EEB kh\xF3a kh\xE1c.":"T\u1EA1o l\u1EDBp \u0111\u1EA7u ti\xEAn \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u giao b\xE0i cho h\u1ECDc sinh."}</p>
      ${_classSearch?"":'<button class="btn btn-primary" onclick="openCreateClassModal()">+ T\u1EA1o l\u1EDBp h\u1ECDc m\u1EDBi</button>'}
    </div>`,i=e.map(l=>{const c=l.student_count>0?Math.round(l.submitted_student_count/l.student_count*100):0,d=l.upcoming_deadline_count>0?`<span class="card-deadline-chip">\u26A0\uFE0F ${l.upcoming_deadline_count} b\xE0i s\u1EAFp h\u1EA1n</span>`:"",u=l.pending_grading_count>0?`<span class="card-pending-chip" title="B\xE0i Writing/Speaking ch\u01B0a ch\u1EA5m">\u{1F4DD} ${l.pending_grading_count} c\u1EA7n ch\u1EA5m</span>`:"";return`
    <div class="card" onclick="navigate('/class/${l.id}')">
      <div class="card-icon">\u{1F3EB}</div>
      <div class="card-name">${escapeHtml(l.class_name)}</div>
      <div class="card-desc">${escapeHtml(l.description||"Ch\u01B0a c\xF3 m\xF4 t\u1EA3")}</div>
      <div class="card-meta">
        <span class="card-meta-item">\u{1F464} ${l.student_count} h\u1ECDc sinh</span>
        <span class="card-meta-item">\u{1F4CB} ${l.assignment_count} b\xE0i t\u1EADp</span>
        ${d}
        ${u}
      </div>
      ${l.student_count>0?`
      <div class="card-progress">
        <div class="card-progress-label">\u0110\xE3 n\u1ED9p \xEDt nh\u1EA5t 1 b\xE0i: ${l.submitted_student_count}/${l.student_count} HS</div>
        <div class="card-progress-bar"><div class="card-progress-fill" style="width:${c}%"></div></div>
      </div>`:""}
    </div>`}).join(""),o=e.length===0?n:`<div class="cards-grid">${i}</div>`,s=document.getElementById("classes-content");if(s){s.innerHTML=o;return}$("#app").innerHTML=`
    <div class="page-header">
      <div>
        <div class="page-title">L\u1EDBp h\u1ECDc</div>
        <div class="page-subtitle">Qu\u1EA3n l\xFD c\xE1c l\u1EDBp v\xE0 giao b\xE0i t\u1EADp</div>
      </div>
      <button class="btn btn-primary" onclick="openCreateClassModal()">
        + T\u1EA1o l\u1EDBp m\u1EDBi
      </button>
    </div>
    <div class="list-toolbar">
      <input id="class-search-input" class="form-input search-input" aria-label="T\xECm ki\u1EBFm l\u1EDBp"
        placeholder="\u{1F50D} T\xECm ki\u1EBFm l\u1EDBp..."
        value="${escapeHtml(_classSearch)}" />
      <select id="class-sort-select" class="form-input sort-select">
        <option value="newest" ${_classSort==="newest"?"selected":""}>M\u1EDBi nh\u1EA5t</option>
        <option value="name"    ${_classSort==="name"?"selected":""}>T\xEAn A-Z</option>
        <option value="students" ${_classSort==="students"?"selected":""}>Nhi\u1EC1u HS nh\u1EA5t</option>
      </select>
    </div>
    <div id="classes-content">${o}</div>`;const a=document.getElementById("class-search-input");a&&a.addEventListener("input",()=>{_classSearch=a.value,_applyClassFilter()});const r=document.getElementById("class-sort-select");r&&r.addEventListener("change",()=>{_classSort=r.value,_applyClassFilter()})}window._applyClassFilter=_applyClassFilter;function openCreateClassModal(){openModal("T\u1EA1o l\u1EDBp h\u1ECDc m\u1EDBi",`
    <div class="form-group">
      <label class="form-label">T\xEAn l\u1EDBp <span style="color:var(--danger)">*</span></label>
      <input id="cls-name" class="form-input" placeholder="VD: IELTS 5.5 - Th\xE1ng 4/2025" />
    </div>
    <div class="form-group">
      <label class="form-label">M\xF4 t\u1EA3</label>
      <input id="cls-desc" class="form-input" placeholder="VD: L\u1EDBp luy\u1EC7n thi IELTS band 5.5" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">H\u1EE7y</button>
      <button class="btn btn-primary" onclick="submitCreateClass(this)">T\u1EA1o l\u1EDBp</button>
    </div>`),setTimeout(()=>$("#cls-name")?.focus(),50)}async function submitCreateClass(t){const e=$("#cls-name").value.trim(),n=$("#cls-desc").value.trim();if(!e){toast("Vui l\xF2ng nh\u1EADp t\xEAn l\u1EDBp","error");return}btnLoading(t);try{await api.post("/classes",{class_name:e,description:n}),closeModal(),toast("T\u1EA1o l\u1EDBp th\xE0nh c\xF4ng!"),showClasses()}catch(i){btnReset(t),toast("L\u1ED7i: "+(i.error||"Kh\xF4ng th\u1EC3 t\u1EA1o l\u1EDBp"),"error")}}async function showClassDetail({id:t}){setLoading("\u0110ang t\u1EA3i th\xF4ng tin l\u1EDBp...");const e=routeToken();try{const[n,i]=await Promise.all([api.get(`/classes/${t}`),api.get(`/classes/${t}/students`)]);if(routeChanged(e))return;_cachedCls=n,_cachedStudents=i,_classDetailTab="assignments",_assignFilterSkill="",_assignFilterSearch="",_statsData=null,_statsSkillFilter="",_statsStatusFilter="",_statsModeFilter="",_statsScaleFilter="ielts",_assignTableSortCol="",_assignTableSortDir="desc",_assignListSortCol="",_assignListSortDir="desc",_classStudentsSortCol="",_classStudentsSortDir="asc",destroyStatsCharts(),renderClassDetail(n,i)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i l\u1EDBp: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c th\xF4ng tin l\u1EDBp",n,`/class/${t}`)}}function switchClassTab(t){_classDetailTab=t,document.querySelectorAll(".tab-content").forEach(n=>n.style.display="none");const e=document.getElementById(`tab-${t}`);e&&(e.style.display=""),document.querySelectorAll(".tab-btn").forEach(n=>n.classList.toggle("active",n.dataset.tab===t)),t==="stats"&&_cachedCls&&loadStatsTab(_cachedCls.id)}window.switchClassTab=switchClassTab;let _statsCharts=[],_statsData=null,_statsSkillFilter="",_statsStatusFilter="",_statsModeFilter="",_statsScaleFilter="ielts",_statsSortCol="",_statsSortDir="desc",_statsAllScoredSubs=[],_statsTrendSkill="",_closedAssignsExpanded=!1,_closedAssignsSearch="",_statsSubSortCol="",_statsSubSortDir="asc";function destroyStatsCharts(){_statsCharts.forEach(t=>{try{t.destroy()}catch{}}),_statsCharts=[]}function refreshStatsTab(){const t=document.getElementById("tab-stats");t&&delete t.dataset.loadedFor,_cachedCls&&loadStatsTab(_cachedCls.id)}window.refreshStatsTab=refreshStatsTab;async function loadStatsTab(t){const e=document.getElementById("tab-stats");if(e&&e.dataset.loadedFor!==t){destroyStatsCharts(),_statsData=null,e.innerHTML='<div class="stats-loading-placeholder"><div class="spinner"></div><p>\u0110ang t\u1EA3i th\u1ED1ng k\xEA...</p></div>';try{_statsData=await api.get(`/classes/${t}/analytics`),_statsSkillFilter="",_statsStatusFilter="",_statsModeFilter="",_statsScaleFilter="ielts",_statsSortCol="",_statsSortDir="desc",_closedAssignsExpanded=!1,_closedAssignsSearch="",_statsSubSortCol="",_statsSubSortDir="asc",_statsTrendSkill=["reading","listening","writing","speaking"].find(i=>_statsData.per_assignment.some(o=>o.skill===i))||"reading",renderStatsTab(e,_statsData),e.dataset.loadedFor=t}catch(n){e.innerHTML=`<div class="empty-state" style="padding:40px"><p>L\u1ED7i t\u1EA3i th\u1ED1ng k\xEA: ${escapeHtml(n.error||n.message)}</p></div>`}}}function applyStatsFilter(){const t=document.getElementById("tab-stats");!t||!_statsData||(renderStatsTab(t,_statsData),t.dataset.loadedFor=_cachedCls?.id||"")}window.applyStatsFilter=applyStatsFilter;function toggleClosedAssignsExpanded(){_closedAssignsExpanded=!_closedAssignsExpanded,applyStatsFilter()}window.toggleClosedAssignsExpanded=toggleClosedAssignsExpanded;function setClosedAssignsSearch(t){_closedAssignsSearch=t.toLowerCase().trim(),_closedAssignsExpanded=!0,applyStatsFilter()}window.setClosedAssignsSearch=setClosedAssignsSearch;function sortStudentTable(t){_statsSortCol===t?_statsSortDir=_statsSortDir==="asc"?"desc":"asc":(_statsSortCol=t,_statsSortDir=t==="name"?"asc":"desc"),applyStatsFilter()}window.sortStudentTable=sortStudentTable;function sortAssignTable(t){_assignTableSortCol===t?_assignTableSortDir=_assignTableSortDir==="asc"?"desc":"asc":(_assignTableSortCol=t,_assignTableSortDir=t==="title"||t==="skill"?"asc":"desc"),applyStatsFilter()}window.sortAssignTable=sortAssignTable;function toggleTrendStudent(t){const e=document.querySelector(`.stats-student-toggle[data-sid="${t}"]`);if(!e)return;e.classList.toggle("active");const n=_statsCharts.find(o=>o.canvas?.id==="chart-trend");if(!n)return;const i=n.data.datasets.findIndex(o=>o._studentId===t);i!==-1&&(n.setDatasetVisibility(i,e.classList.contains("active")),n.update())}window.toggleTrendStudent=toggleTrendStudent;function filterTrendSkill(t){_statsTrendSkill=t,document.querySelectorAll(".trend-skill-pill").forEach(e=>{e.classList.toggle("active",e.dataset.skill===t)}),rebuildTrendChart()}window.filterTrendSkill=filterTrendSkill;function rebuildTrendChart(){const t=_statsCharts.find(r=>r.canvas?.id==="chart-trend");if(!t||!_statsData)return;const{per_student:e,per_assignment:n}=_statsData,i=_statsTrendSkill,o=[...n].reverse().filter(r=>!(i&&r.skill!==i||_statsModeFilter&&r.mode!==_statsModeFilter||_statsScaleFilter&&(r.scoring_scale||"10")!==_statsScaleFilter)),s=document.getElementById("trend-empty-msg"),a=document.getElementById("chart-trend");if(o.length<1){a&&(a.style.display="none"),s&&(s.style.display="");return}a&&(a.style.display=""),s&&(s.style.display="none"),t.data.labels=o.map(r=>r.title.length>18?r.title.slice(0,16)+"\u2026":r.title),t.data.datasets.forEach(r=>{const l=e.find(c=>c.id===r._studentId);if(!l){r.data=[];return}r.data=o.map(c=>{const d=l.submissions.filter(u=>u.assignment_id===c.id).sort((u,m)=>(m.attempt_number||1)-(u.attempt_number||1))[0];return d&&d.overall_score!==null?Number(d.overall_score):null})}),t.update()}window.rebuildTrendChart=rebuildTrendChart;function showHistogramStudents(t){const e=[[0,2],[2,4],[4,6],[6,8],[8,10]],n=["0 \u2013 2","2 \u2013 4","4 \u2013 6","6 \u2013 8","8 \u2013 9"],[i,o]=e[t]||[0,10],s=document.getElementById("stats-hist-detail");if(!s)return;const a=_statsAllScoredSubs.filter(r=>{const l=Number(r.overall_score);return l>=i&&l<o});if(a.length===0){s.style.display="none";return}s.style.display="",s.innerHTML=`
    <div class="stats-hist-detail-header">
      \u0110i\u1EC3m <strong>${n[t]}</strong> \u2014 ${a.length} b\xE0i
      <button onclick="document.getElementById('stats-hist-detail').style.display='none'"
        style="float:right;background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:16px" aria-label="\u0110\xF3ng">\u2715</button>
    </div>
    <div class="stats-hist-detail-list">
      ${a.map(r=>`
        <div class="stats-hist-detail-item">
          <span class="student-avatar" style="width:22px;height:22px;font-size:10px;flex-shrink:0">
            ${escapeHtml(r.student_name.charAt(0).toUpperCase())}
          </span>
          <span style="font-weight:500">${escapeHtml(r.student_name)}</span>
          <span style="color:var(--gray-400);font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escapeHtml(r.assignment_title)}
          </span>
          <span class="stats-score-badge" style="margin-left:8px;flex-shrink:0">
            ${Number(r.overall_score).toFixed(1)}
          </span>
        </div>`).join("")}
    </div>`}window.showHistogramStudents=showHistogramStudents;function renderStatsTab(t,e){destroyStatsCharts();const{timeline:n,per_student:i,per_assignment:o}=e,s=_statsSkillFilter,a=_statsStatusFilter,r=_statsModeFilter,l=_statsScaleFilter,c=o.filter(p=>!(s&&p.skill!==s||a==="active"&&!p.is_active||a==="closed"&&p.is_active||r&&p.mode!==r||l&&(p.scoring_scale||"10")!==l)),d=new Set(c.map(p=>p.id)),u=p=>p.length?p.reduce((v,b)=>v+b,0)/p.length:null,m=i.length,h=c.length,g=c.filter(p=>p.is_active).length,f=h-g,w=new Map;i.forEach(p=>{p.submissions.forEach(v=>{if(!d.has(v.assignment_id))return;const b=`${p.id||p.student_id}:${v.assignment_id}`,k=w.get(b);(!k||(v.attempt_number||1)>(k.attempt_number||1))&&w.set(b,{...v,student_name:p.name})})});const y=Array.from(w.values()),C=y.filter(p=>p.overall_score!==null);_statsAllScoredSubs=C;const E=u(C.map(p=>Number(p.overall_score))),I=h*m,q=I>0?Math.round(y.length/I*100):0,N=[0,0,0,0,0];for(const p of C){const v=Number(p.overall_score),b=v>=9?4:Math.min(4,Math.floor(v/2));N[b]++}const F=["reading","listening","writing","speaking"],V={},Q={};for(const p of F){const v=C.filter(_=>_.skill===p);V[p]=u(v.map(_=>Number(_.overall_score)));const b=c.filter(_=>_.skill===p),k=y.filter(_=>_.skill===p),B=b.length*m;Q[p]={count:b.length,submitted:k.length,pct:B>0?Math.round(k.length/B*100):0}}let P=i.map(p=>{const v=p.submissions.filter(T=>d.has(T.assignment_id)),b=new Map;v.forEach(T=>{const x=b.get(T.assignment_id);(!x||(T.attempt_number||1)>(x.attempt_number||1))&&b.set(T.assignment_id,T)});const k=Array.from(b.values()),B=k.filter(T=>T.overall_score!==null),_=T=>u(B.filter(x=>x.skill===T).map(x=>Number(x.overall_score))),S=k.filter(T=>!T.is_active&&T.deadline),L=S.filter(T=>T.on_time).length;return{...p,submitted:k.length,total:h,avg_score:s?_(s):u(B.map(T=>Number(T.overall_score))),avg_reading:_("reading"),avg_listening:_("listening"),avg_writing:_("writing"),avg_speaking:_("speaking"),on_time:L,closed_total:S.length,on_time_rate:S.length>0?L/S.length:null}});_statsSortCol&&(P=[...P].sort((p,v)=>{let b=p[_statsSortCol],k=v[_statsSortCol];return b==null?1:k==null?-1:typeof b=="string"?_statsSortDir==="asc"?b.localeCompare(k):k.localeCompare(b):_statsSortDir==="asc"?b-k:k-b}));const H=p=>p!=null?Number(p).toFixed(1):"\u2014",U=(p,v)=>v>0?Math.round(p/v*100):0,M=p=>_statsSortCol!==p?'<span class="sort-icon">\u2195</span>':`<span class="sort-icon active">${_statsSortDir==="asc"?"\u2191":"\u2193"}</span>`,j={reading:"#3b82f6",listening:"#f59e0b",writing:"#8b5cf6",speaking:"#22c55e"},z=["#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#14b8a6","#f97316","#a3e635"],X={reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking",composite:"T\u1ED5ng h\u1EE3p"},Y=`
    <div class="stats-cards-grid">
      <div class="stats-card">
        <div class="stats-card-icon" style="background:#e0f2fe;color:#0284c7">\u{1F465}</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${m}</div>
          <div class="stats-card-label">H\u1ECDc sinh</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:#dcfce7;color:#16a34a">\u{1F4CB}</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${h}</div>
          <div class="stats-card-label">${g} \u0111ang m\u1EDF \xB7 ${f} \u0111\xE3 \u0111\xF3ng</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:#fef9c3;color:#ca8a04">\u{1F4CA}</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${q}%</div>
          <div class="stats-card-label">${y.length} / ${I} l\u01B0\u1EE3t n\u1ED9p</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:var(--primary-lt);color:var(--primary)">\u{1F3AF}</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${E!==null?Number(E).toFixed(2):"\u2014"}</div>
          <div class="stats-card-label">\u0110i\u1EC3m TB l\u1EDBp (${C.length} b\xE0i \u0111\xE3 ch\u1EA5m)</div>
        </div>
      </div>
    </div>`,Z=`
    <div class="stats-section-card">
      <div class="stats-section-title">T\u1EF7 l\u1EC7 n\u1ED9p b\xE0i theo k\u1EF9 n\u0103ng</div>
      <div class="stats-skill-chart">
        ${["reading","listening","writing","speaking"].map(p=>{const v=Q[p];return!v||v.count===0?"":`<div class="stats-skill-row">
            <div class="stats-skill-label">${skillBadge(p)}</div>
            <div class="stats-bar-wrap">
              <div class="stats-bar-fill" style="width:${v.pct}%;background:${j[p]}"></div>
            </div>
            <div class="stats-pct">${v.pct}% &nbsp;<span style="color:var(--gray-400)">(${v.submitted}/${v.count*m} n\u1ED9p)</span></div>
          </div>`}).join("")}
      </div>
    </div>`,tt=`
    <div class="stats-section-card stats-chart-card">
      <div class="stats-section-title">\u0110i\u1EC3m TB theo k\u1EF9 n\u0103ng</div>
      <canvas id="chart-skill-score" height="200"></canvas>
    </div>`,et=`
    <div class="stats-section-card stats-chart-card">
      <div class="stats-section-title">
        Ph\xE2n b\u1ED5 \u0111i\u1EC3m (${C.length} b\xE0i ch\u1EA5m)
        <span style="font-size:11px;font-weight:400;color:var(--gray-400);margin-left:6px">Click v\xE0o c\u1ED9t \u0111\u1EC3 xem chi ti\u1EBFt</span>
      </div>
      <canvas id="chart-score-dist" height="200" style="cursor:pointer"></canvas>
      <div id="stats-hist-detail" style="display:none;margin-top:12px"></div>
    </div>`,nt=n.length<2?"":`
    <div class="stats-section-card">
      <div class="stats-section-title">Xu h\u01B0\u1EDBng n\u1ED9p b\xE0i theo tu\u1EA7n</div>
      <canvas id="chart-timeline" height="100"></canvas>
    </div>`,O=c.filter(p=>!p.is_active&&p.deadline),D=_closedAssignsSearch?O.filter(p=>p.title.toLowerCase().includes(_closedAssignsSearch)):O,W=3,R=_closedAssignsExpanded?D:D.slice(0,W),it=D.length-R.length,ot=O.length===0?"":`
    <div class="stats-section-card">
      <div class="stats-section-title">\u0110\xFAng h\u1EA1n / mu\u1ED9n / ch\u01B0a n\u1ED9p (b\xE0i \u0111\xE3 \u0111\xF3ng)</div>
      <div class="stats-closed-controls">
        <input class="stats-closed-search" type="text" aria-label="T\xECm b\xE0i t\u1EADp" placeholder="\u{1F50D} T\xECm b\xE0i t\u1EADp..."
          value="${escapeHtml(_closedAssignsSearch)}"
          oninput="setClosedAssignsSearch(this.value)" />
      </div>
      ${D.length===0?'<p style="color:var(--gray-400);font-size:13px;padding:8px 0 4px">Kh\xF4ng t\xECm th\u1EA5y b\xE0i t\u1EADp ph\xF9 h\u1EE3p</p>':`<canvas id="chart-ontime" height="${Math.max(80,R.length*38)}"></canvas>`}
      ${D.length>W?`
        <button class="stats-closed-toggle-btn" onclick="toggleClosedAssignsExpanded()">
          ${_closedAssignsExpanded?"\u25B2 Thu g\u1ECDn":`\u25BC Xem th\xEAm ${it} b\xE0i t\u1EADp`}
        </button>`:""}
    </div>`,st=C.length>=1?`
    <div class="stats-section-card">
      <div class="stats-trend-header">
        <div class="stats-section-title" style="margin-bottom:0">Xu h\u01B0\u1EDBng \u0111i\u1EC3m t\u1EEBng h\u1ECDc sinh</div>
      </div>
      <div class="stats-trend-filters">
        <div class="stats-filter-group">
          <span class="stats-filter-label">K\u1EF9 n\u0103ng:</span>
          <div class="stats-filter-pills">
            ${[["reading","Reading"],["listening","Listening"],["writing","Writing"],["speaking","Speaking"]].map(([p,v])=>`
              <button class="stats-filter-pill trend-skill-pill${_statsTrendSkill===p?" active":""}"
                data-skill="${p}" onclick="filterTrendSkill('${p}')">
                ${v}
              </button>`).join("")}
          </div>
        </div>
      </div>
      <div class="stats-filter-group" style="margin-bottom:12px">
        <span class="stats-filter-label">H\u1ECDc sinh:</span>
        <div class="stats-student-toggles" id="stats-trend-toggles" style="margin-bottom:0">
          ${i.map((p,v)=>`
            <button class="stats-student-toggle active"
              data-sid="${p.id}"
              style="--sc:${z[v%z.length]}"
              onclick="toggleTrendStudent('${p.id}')">
              ${escapeHtml(p.name)}
            </button>`).join("")}
        </div>
      </div>
      <div id="trend-empty-msg" style="display:none;color:var(--gray-400);font-size:13px;padding:20px 0">
        Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u cho k\u1EF9 n\u0103ng n\xE0y
      </div>
      <canvas id="chart-trend" height="120"></canvas>
    </div>`:"",at=`
    <div class="stats-filter-bar">
      <div class="stats-filter-group">
        <span class="stats-filter-label">Lo\u1EA1i b\xE0i:</span>
        <div class="stats-filter-pills">
          ${[["ielts","\u{1F3AF} IELTS Test"],["10","\u{1F4CA} Practice Test"],["composite","\u{1F9E9} Mixed Skills"]].map(([p,v])=>`
            <button class="stats-filter-pill${_statsScaleFilter===p?" active":""}"
              onclick="_statsScaleFilter='${p}';applyStatsFilter()">
              ${v}
            </button>`).join("")}
        </div>
      </div>
      <div class="stats-filter-group">
        <span class="stats-filter-label">K\u1EF9 n\u0103ng:</span>
        <div class="stats-filter-pills">
          ${["",...FILTERABLE_ASSIGNMENT_SKILLS].map(p=>`
            <button class="stats-filter-pill${_statsSkillFilter===p?" active":""}"
              onclick="_statsSkillFilter='${p}';applyStatsFilter()">
              ${p?X[p]:"T\u1EA5t c\u1EA3"}
            </button>`).join("")}
        </div>
      </div>
      <div class="stats-filter-group">
        <span class="stats-filter-label">B\xE0i t\u1EADp:</span>
        <div class="stats-filter-pills">
          ${[["","T\u1EA5t c\u1EA3"],["active","\u0110ang m\u1EDF"],["closed","\u0110\xE3 \u0111\xF3ng"]].map(([p,v])=>`
            <button class="stats-filter-pill${_statsStatusFilter===p?" active":""}"
              onclick="_statsStatusFilter='${p}';applyStatsFilter()">
              ${v}
            </button>`).join("")}
        </div>
      </div>
      <div class="stats-filter-group">
        <span class="stats-filter-label">Ch\u1EBF \u0111\u1ED9:</span>
        <div class="stats-filter-pills">
          ${[["","T\u1EA5t c\u1EA3"],["exam","\u{1F4DD} Ki\u1EC3m tra"],["practice","\u{1F3A7} Luy\u1EC7n t\u1EADp"]].map(([p,v])=>`
            <button class="stats-filter-pill${_statsModeFilter===p?" active":""}"
              onclick="_statsModeFilter='${p}';applyStatsFilter()">
              ${v}
            </button>`).join("")}
        </div>
      </div>
      <button class="btn btn-sm btn-outline stats-refresh-btn" onclick="refreshStatsTab()" title="T\u1EA3i l\u1EA1i d\u1EEF li\u1EC7u th\u1ED1ng k\xEA">
        \u21BB L\xE0m m\u1EDBi
      </button>
    </div>`,rt=s?5:8,lt=`
    <div class="stats-section-card">
      <div class="stats-section-title">Ti\u1EBFn \u0111\u1ED9 t\u1EEBng h\u1ECDc sinh</div>
      ${P.length===0?'<div class="empty-state" style="padding:20px">Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u</div>':`<div class="table-wrap">
          <table class="stats-table">
            <thead><tr>
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('name')">H\u1ECDc sinh ${M("name")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('submitted')">\u0110\xE3 n\u1ED9p ${M("submitted")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('avg_score')">\u0110i\u1EC3m TB ${M("avg_score")}</th>
              ${s?"":`
                <th ${SORTABLE_TH_ATTRS} style="color:#3b82f6" onclick="sortStudentTable('avg_reading')">Reading ${M("avg_reading")}</th>
                <th ${SORTABLE_TH_ATTRS} style="color:#f59e0b" onclick="sortStudentTable('avg_listening')">Listening ${M("avg_listening")}</th>
                <th ${SORTABLE_TH_ATTRS} style="color:#8b5cf6" onclick="sortStudentTable('avg_writing')">Writing ${M("avg_writing")}</th>
                <th ${SORTABLE_TH_ATTRS} style="color:#22c55e" onclick="sortStudentTable('avg_speaking')">Speaking ${M("avg_speaking")}</th>`}
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('on_time_rate')">\u0110\xFAng h\u1EA1n ${M("on_time_rate")}</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${P.map(p=>{const v=U(p.submitted,p.total),b=p.on_time_rate!==null?Math.round(p.on_time_rate*100):null;return`<tr>
                  <td><span class="student-avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</span> ${escapeHtml(p.name)}</td>
                  <td>
                    <div class="stats-mini-bar-wrap">
                      <div class="stats-mini-bar" style="width:${v}%"></div>
                    </div>
                    <span class="stats-mini-label">${p.submitted}/${p.total}</span>
                  </td>
                  <td><span class="stats-score-badge">${H(p.avg_score)}</span></td>
                  ${s?"":`
                    <td style="color:#3b82f6">${H(p.avg_reading)}</td>
                    <td style="color:#f59e0b">${H(p.avg_listening)}</td>
                    <td style="color:#8b5cf6">${H(p.avg_writing)}</td>
                    <td style="color:#22c55e">${H(p.avg_speaking)}</td>`}
                  <td>${b!==null?`<span class="stats-ontime-pill ${b>=80?"good":b>=50?"mid":"bad"}">${b}%</span>`:'<span style="color:var(--gray-400)">\u2014</span>'}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="toggleStudentStatsRow('${p.id}')">Chi ti\u1EBFt</button>
                  </td>
                </tr>
                <tr id="stats-row-${p.id}" style="display:none">
                  <td colspan="${rt}" style="padding:0">
                    <div class="stats-expand-body">
                      <table class="stats-sub-table">
                            <thead id="stats-sub-thead-${p.id}"><tr>
                              <th ${SORTABLE_TH_ATTRS} onclick="sortStatsSubTable('${p.id}','title')">B\xE0i t\u1EADp ${makeSortIcon("title",_statsSubSortCol,_statsSubSortDir)}</th>
                              <th ${SORTABLE_TH_ATTRS} onclick="sortStatsSubTable('${p.id}','skill')">K\u1EF9 n\u0103ng ${makeSortIcon("skill",_statsSubSortCol,_statsSubSortDir)}</th>
                              <th ${SORTABLE_TH_ATTRS} onclick="sortStatsSubTable('${p.id}','score')">\u0110i\u1EC3m ${makeSortIcon("score",_statsSubSortCol,_statsSubSortDir)}</th>
                              <th ${SORTABLE_TH_ATTRS} onclick="sortStatsSubTable('${p.id}','submitted_at')">Ng\xE0y n\u1ED9p ${makeSortIcon("submitted_at",_statsSubSortCol,_statsSubSortDir)}</th>
                              <th ${SORTABLE_TH_ATTRS} onclick="sortStatsSubTable('${p.id}','on_time')">\u0110\xFAng h\u1EA1n ${makeSortIcon("on_time",_statsSubSortCol,_statsSubSortDir)}</th>
                              <th>Overtime</th>
                            </tr></thead>
                            <tbody id="stats-sub-tbody-${p.id}">${buildStatsSubRows(p.submissions.filter(k=>d.has(k.assignment_id)))}</tbody>
                          </table>
                    </div>
                  </td>
                </tr>`}).join("")}
            </tbody>
          </table>
        </div>`}
    </div>`,A=p=>makeSortIcon(p,_assignTableSortCol,_assignTableSortDir),G=[...c];_assignTableSortCol&&G.sort((p,v)=>{let b,k;switch(_assignTableSortCol){case"title":b=p.title.toLowerCase(),k=v.title.toLowerCase();break;case"skill":b=p.skill||"",k=v.skill||"";break;case"mode":b=p.mode||"",k=v.mode||"";break;case"submitted_rate":b=p.total?p.submitted/p.total:0,k=v.total?v.submitted/v.total:0;break;case"avg_score":b=p.avg_score??-1,k=v.avg_score??-1;break;case"on_time":b=p.on_time??-1,k=v.on_time??-1;break;case"late":b=p.late??-1,k=v.late??-1;break;case"missing":b=p.missing??-1,k=v.missing??-1;break;case"is_active":b=p.is_active?1:0,k=v.is_active?1:0;break;default:return 0}return b<k?_assignTableSortDir==="asc"?-1:1:b>k?_assignTableSortDir==="asc"?1:-1:0});const ct=`
    <div class="stats-section-card">
      <div class="stats-section-title">Chi ti\u1EBFt t\u1EEBng b\xE0i t\u1EADp</div>
      ${c.length===0?'<div class="empty-state" style="padding:20px">Kh\xF4ng c\xF3 b\xE0i t\u1EADp ph\xF9 h\u1EE3p</div>':`<div class="table-wrap">
          <table class="stats-table">
            <thead><tr>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('skill')">K\u1EF9 n\u0103ng ${A("skill")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('title')">T\xEAn b\xE0i t\u1EADp ${A("title")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('mode')">Ch\u1EBF \u0111\u1ED9 ${A("mode")}</th>
              <th>Th\u1EDDi gian</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('submitted_rate')">T\u1EF7 l\u1EC7 n\u1ED9p ${A("submitted_rate")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('avg_score')">\u0110i\u1EC3m TB ${A("avg_score")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('on_time')">\u0110\xFAng h\u1EA1n ${A("on_time")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('late')">Mu\u1ED9n ${A("late")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('missing')">Ch\u01B0a n\u1ED9p ${A("missing")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortAssignTable('is_active')">Tr\u1EA1ng th\xE1i ${A("is_active")}</th>
            </tr></thead>
            <tbody>
              ${G.map(p=>{const v=U(p.submitted,p.total);return`<tr>
                  <td>${skillBadge(p.skill)}</td>
                  <td style="font-weight:600">${escapeHtml(p.title)}</td>
                  <td>${p.mode==="practice"?'<span class="stats-mode-chip practice">\u{1F3A7} Luy\u1EC7n t\u1EADp</span>':'<span class="stats-mode-chip exam">\u{1F4DD} Ki\u1EC3m tra</span>'}</td>
                  <td>${p.time_limit_minutes?`${p.time_limit_minutes} ph\xFAt`:'<span style="color:var(--text-muted)">\u2014</span>'}</td>
                  <td>
                    <div class="stats-mini-bar-wrap">
                      <div class="stats-mini-bar" style="width:${v}%"></div>
                    </div>
                    <span class="stats-mini-label">${p.submitted}/${p.total}</span>
                  </td>
                  <td><span class="stats-score-badge">${H(p.avg_score)}</span></td>
                  <td>${!p.is_active&&p.deadline?`<span style="color:var(--success)">${p.on_time}</span>`:"\u2014"}</td>
                  <td>${!p.is_active&&p.deadline?`<span style="color:var(--accent)">${p.late}</span>`:"\u2014"}</td>
                  <td>${p.missing!==null?`<span style="color:var(--danger)">${p.missing}</span>`:"\u2014"}</td>
                  <td>${p.is_active?'<span class="badge badge-success">\u0110ang m\u1EDF</span>':'<span class="badge badge-gray">\u0110\xE3 \u0111\xF3ng</span>'}</td>
                </tr>`}).join("")}
            </tbody>
          </table>
        </div>`}
    </div>`;t.innerHTML=`
    ${at}
    ${Y}
    <div class="stats-charts-row">
      ${tt}
      ${et}
    </div>
    ${st}
    ${nt}
    ${ot}
    ${Z}
    ${lt}
    ${ct}`,ensureChartJsLoaded().then(()=>requestAnimationFrame(()=>{const p=document.getElementById("chart-skill-score");if(p){const _=["reading","listening","writing","speaking"].filter(S=>V[S]!==null);if(_.length>0){const S=new Chart(p.getContext("2d"),{type:"bar",data:{labels:_.map(L=>X[L]),datasets:[{data:_.map(L=>Number(V[L]).toFixed(2)),backgroundColor:_.map(L=>j[L]+"cc"),borderColor:_.map(L=>j[L]),borderWidth:1,borderRadius:6}]},options:{indexAxis:"y",responsive:!0,plugins:{legend:{display:!1}},scales:{x:{min:0,max:9,grid:{color:"#f3f4f6"},ticks:{font:{size:11}}},y:{ticks:{font:{size:12}}}}}});_statsCharts.push(S)}else p.insertAdjacentHTML("afterend",'<p style="color:var(--gray-400);font-size:13px;padding:20px 0">Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u \u0111i\u1EC3m</p>'),p.remove()}const v=document.getElementById("chart-score-dist");if(v)if(N.reduce((S,L)=>S+L,0)>0){const S=new Chart(v.getContext("2d"),{type:"bar",data:{labels:["0 \u2013 2","2 \u2013 4","4 \u2013 6","6 \u2013 8","8 \u2013 9"],datasets:[{label:"S\u1ED1 b\xE0i",data:N,backgroundColor:["#fca5a5","#fcd34d","#86efac","#67e8f9","#6ee7b7"],hoverBackgroundColor:["#f87171","#fbbf24","#4ade80","#22d3ee","#34d399"],borderRadius:6}]},options:{responsive:!0,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,ticks:{stepSize:1,font:{size:11}},grid:{color:"#f3f4f6"}},x:{ticks:{font:{size:11}}}},onClick:(L,T)=>{T.length&&showHistogramStudents(T[0].index)},onHover:(L,T)=>{L.native.target.style.cursor=T.length?"pointer":"default"}}});_statsCharts.push(S)}else v.insertAdjacentHTML("afterend",'<p style="color:var(--gray-400);font-size:13px;padding:20px 0">Ch\u01B0a c\xF3 b\xE0i n\xE0o \u0111\u01B0\u1EE3c ch\u1EA5m \u0111i\u1EC3m</p>'),v.remove();const b=document.getElementById("chart-trend");if(b){const _=[...o].reverse().filter(x=>!(_statsTrendSkill&&x.skill!==_statsTrendSkill||_statsModeFilter&&x.mode!==_statsModeFilter||_statsScaleFilter&&(x.scoring_scale||"10")!==_statsScaleFilter)),S=_.map(x=>x.title.length>18?x.title.slice(0,16)+"\u2026":x.title),L=i.map((x,dt)=>{const J=z[dt%z.length];return{label:x.name,_studentId:x.id,data:_.map(ut=>{const K=x.submissions.find(pt=>pt.assignment_id===ut.id);return K&&K.overall_score!==null?Number(K.overall_score):null}),borderColor:J,backgroundColor:J+"22",borderWidth:2,pointRadius:5,pointHoverRadius:7,fill:!1,tension:.3,spanGaps:!0}});if(_.length<1){b.style.display="none";const x=document.getElementById("trend-empty-msg");x&&(x.style.display="")}const T=new Chart(b.getContext("2d"),{type:"line",data:{labels:S,datasets:L},options:{responsive:!0,interaction:{mode:"index",intersect:!1},plugins:{legend:{display:!1},tooltip:{filter:x=>x.raw!==null,callbacks:{title:x=>x[0]?.label||"",label:x=>` ${x.dataset.label}: ${x.raw!==null?Number(x.raw).toFixed(1):"\u2014"}`}}},scales:{y:{min:0,max:9,ticks:{font:{size:11}},grid:{color:"#f3f4f6"}},x:{ticks:{font:{size:10},maxRotation:30}}}}});_statsCharts.push(T)}const k=document.getElementById("chart-timeline");if(k&&n.length>=2){const _=new Chart(k.getContext("2d"),{type:"line",data:{labels:n.map(S=>{const L=new Date(S.week);return`${L.getDate()}/${L.getMonth()+1}`}),datasets:[{label:"L\u01B0\u1EE3t n\u1ED9p",data:n.map(S=>S.count),borderColor:"#0f766e",backgroundColor:"#0f766e22",borderWidth:2,pointRadius:4,fill:!0,tension:.3}]},options:{responsive:!0,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,ticks:{stepSize:1,font:{size:11}},grid:{color:"#f3f4f6"}},x:{ticks:{font:{size:11}}}}}});_statsCharts.push(_)}const B=document.getElementById("chart-ontime");if(B&&R.length>0){const _=new Chart(B.getContext("2d"),{type:"bar",data:{labels:R.map(S=>S.title.length>22?S.title.slice(0,20)+"\u2026":S.title),datasets:[{label:"\u0110\xFAng h\u1EA1n",data:R.map(S=>S.on_time),backgroundColor:"#86efac",borderRadius:4},{label:"N\u1ED9p mu\u1ED9n",data:R.map(S=>S.late),backgroundColor:"#fcd34d",borderRadius:4},{label:"Ch\u01B0a n\u1ED9p",data:R.map(S=>S.missing||0),backgroundColor:"#fca5a5",borderRadius:4}]},options:{indexAxis:"y",responsive:!0,plugins:{legend:{position:"bottom",labels:{font:{size:11}}}},scales:{x:{stacked:!0,ticks:{stepSize:1,font:{size:11}},grid:{color:"#f3f4f6"}},y:{stacked:!0,ticks:{font:{size:11}}}}}});_statsCharts.push(_)}})).catch(()=>{const p=t.querySelector(".stats-charts-row");p&&p.insertAdjacentHTML("beforebegin",'<div class="empty-state" style="margin-bottom:16px"><p>Kh\xF4ng th\u1EC3 t\u1EA3i bi\u1EC3u \u0111\u1ED3 l\xFAc n\xE0y. B\u1EA1n v\u1EABn c\xF3 th\u1EC3 xem d\u1EEF li\u1EC7u d\u1EA1ng b\u1EA3ng b\xEAn d\u01B0\u1EDBi.</p></div>')})}function toggleStudentStatsRow(t){const e=document.getElementById(`stats-row-${t}`);e&&(e.style.display=e.style.display==="none"?"":"none")}window.toggleStudentStatsRow=toggleStudentStatsRow;function buildStatsSubRows(t){return t.length===0?'<tr><td colspan="5" style="color:var(--gray-400);padding:12px">Ch\u01B0a n\u1ED9p b\xE0i n\xE0o</td></tr>':(_statsSubSortCol?[...t].sort((n,i)=>{let o,s;if(_statsSubSortCol==="title")o=(n.assignment_title||"").toLowerCase(),s=(i.assignment_title||"").toLowerCase();else if(_statsSubSortCol==="skill")o=n.skill||"",s=i.skill||"";else if(_statsSubSortCol==="score")o=n.overall_score??-1,s=i.overall_score??-1;else if(_statsSubSortCol==="submitted_at")o=n.submitted_at||"",s=i.submitted_at||"";else if(_statsSubSortCol==="on_time")o=n.on_time===null?-1:n.on_time?1:0,s=i.on_time===null?-1:i.on_time?1:0;else return 0;return o<s?_statsSubSortDir==="asc"?-1:1:o>s?_statsSubSortDir==="asc"?1:-1:0}):t).map(n=>`<tr>
    <td>${escapeHtml(n.assignment_title)}</td>
    <td>${skillBadge(n.skill)}</td>
    <td><span class="stats-score-badge">${n.overall_score!==null?Number(n.overall_score).toFixed(1):"\u2014"}</span></td>
    <td style="color:var(--gray-400);font-size:12px">${formatDate(n.submitted_at)}</td>
    <td>${n.on_time===null?"\u2014":n.on_time?'<span class="stats-ontime-pill good">\u0110\xFAng h\u1EA1n</span>':'<span class="stats-ontime-pill bad">Mu\u1ED9n</span>'}</td>
    <td>${n.is_overtime?'<span class="stats-overtime-pill">\u23F0 Overtime</span>':"\u2014"}</td>
  </tr>`).join("")}function sortStatsSubTable(t,e){if(_statsSubSortCol===e?_statsSubSortDir=_statsSubSortDir==="asc"?"desc":"asc":(_statsSubSortCol=e,_statsSubSortDir=e==="title"||e==="skill"?"asc":"desc"),!_statsData)return;const n=_statsData.per_student.find(d=>d.id===t);if(!n)return;const i=_statsSkillFilter,o=_statsStatusFilter,s=_statsModeFilter,a=new Set(_statsData.per_assignment.filter(d=>(!i||d.skill===i)&&(o!=="active"||d.is_active)&&(o!=="closed"||!d.is_active)&&(!s||d.mode===s)).map(d=>d.id)),r=n.submissions.filter(d=>a.has(d.assignment_id)),l=document.getElementById(`stats-sub-tbody-${t}`);l&&(l.innerHTML=buildStatsSubRows(r));const c=document.getElementById(`stats-sub-thead-${t}`);c&&c.querySelectorAll("th.sortable").forEach(d=>{const u=d.querySelector(".sort-icon");u&&u.remove();const m=d.getAttribute("onclick").match(/'([^']+)'\)$/)?.[1];m&&d.insertAdjacentHTML("beforeend",makeSortIcon(m,_statsSubSortCol,_statsSubSortDir))})}window.sortStatsSubTable=sortStatsSubTable;function renderClassDetail(t,e=[]){const n=t.assignments.length===0?`<tr><td colspan="6">
        <div class="empty-state" style="padding:30px">
          <div class="empty-state-icon">\u{1F4CB}</div>
          <h3>Ch\u01B0a c\xF3 b\xE0i t\u1EADp n\xE0o</h3>
          <p>Nh\u1EA5n "Giao b\xE0i m\u1EDBi" \u0111\u1EC3 assign \u0111\u1EC1 cho l\u1EDBp n\xE0y.</p>
        </div>
       </td></tr>`:t.assignments.map(a=>{const r=isOverdue(a.deadline)&&a.is_active,l=t.student_count>0?Math.round(a.submission_count/t.student_count*100):0,c=a.skill==="composite",d=c&&Array.isArray(a.composite_sections)?a.composite_sections.map(m=>`<span class="badge" style="background:var(--surface);border:1px solid var(--border);font-size:10px;padding:1px 5px">${{reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"}[m.skill]||""} ${escapeHtml(m.label)}</span>`).join(" "):"",u=c?`/composite/${a.id}`:`/assignment/${a.id}`;return`
        <tr>
          <td>${skillBadge(a.skill)}</td>
          <td style="font-weight:600">
            ${escapeHtml(a.title)}
            ${c&&d?`<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:3px">${d}</div>`:""}
          </td>
          <td style="color:var(--gray-400);font-size:12px">${escapeHtml(a.question_title)}</td>
          <td>
            <span class="deadline${r?" overdue":""}">
              ${r?"\u26A0\uFE0F ":""}${formatDateTime(a.deadline)}
            </span>
          </td>
          <td>
            <label class="toggle" title="${a.is_active?"\u0110ang m\u1EDF":"\u0110\xE3 \u0111\xF3ng"}">
              <input type="checkbox" ${a.is_active?"checked":""}
                onchange="toggleAssignment('${a.id}', this.checked)" />
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>
            <div class="td-actions">
              <button class="btn btn-sm btn-outline" title="Xem b\xE0i n\u1ED9p"
                onclick="navigate('${u}')">
                <span class="sub-progress-wrap">
                  <span class="sub-progress-bar" style="width:${l}%"></span>
                </span>
                \u{1F4CA} ${a.submission_count}/${t.student_count} n\u1ED9p
              </button>
              <button class="btn-icon" title="\u0110\u1ED5i h\u1EA1n n\u1ED9p" aria-label="\u0110\u1ED5i h\u1EA1n n\u1ED9p"
                onclick="changeDeadline('${a.id}')">\u{1F4C5}</button>
              <button class="btn-icon danger" title="Xo\xE1" aria-label="Xo\xE1 b\xE0i t\u1EADp"
                onclick="deleteAssignment('${a.id}', '${t.id}', this)">\u{1F5D1}</button>
            </div>
          </td>
        </tr>`}).join(""),i=e.length===0?`<tr><td colspan="4">
        <div class="empty-state" style="padding:24px">
          <div class="empty-state-icon">\u{1F464}</div>
          <h3 style="font-size:14px">Ch\u01B0a c\xF3 h\u1ECDc sinh n\xE0o</h3>
          <p style="font-size:12px">Nh\u1EA5n "Th\xEAm h\u1ECDc sinh" \u0111\u1EC3 t\u1EA1o t\xE0i kho\u1EA3n cho h\u1ECDc sinh.</p>
        </div>
       </td></tr>`:buildStudentRows(e,t.id),o=`<div class="stats-loading-placeholder" id="stats-loading-placeholder">
      <div class="spinner"></div><p style="margin-top:12px;color:var(--gray-400)">\u0110ang t\u1EA3i th\u1ED1ng k\xEA...</p>
    </div>`,s=t.class_name.replace(/'/g,"\\'");$("#app").innerHTML=`
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">L\u1EDBp h\u1ECDc</a>
      <span class="breadcrumb-sep">\u203A</span>
      <span class="breadcrumb-item active">${escapeHtml(t.class_name)}</span>
    </nav>

    <div class="detail-header">
      <div class="detail-header-info">
        <h2>\u{1F3EB} ${escapeHtml(t.class_name)}</h2>
        <div class="detail-header-meta">
          <span>\u{1F464} ${t.student_count} h\u1ECDc sinh</span>
          <span>\u{1F4C5} T\u1EA1o ng\xE0y ${formatDate(t.created_at)}</span>
          ${t.description?`<span>\u{1F4DD} ${escapeHtml(t.description)}</span>`:""}
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary"
          onclick="openAssignModal('${t.id}', '${s}')">
          + Giao b\xE0i m\u1EDBi
        </button>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" data-tab="assignments" onclick="switchClassTab('assignments')">\u{1F4CB} B\xE0i t\u1EADp (${t.assignments.length})</button>
      <button class="tab-btn" data-tab="students" onclick="switchClassTab('students')">\u{1F464} H\u1ECDc sinh (${e.length})</button>
      <button class="tab-btn" data-tab="stats" onclick="switchClassTab('stats')">\u{1F4CA} Th\u1ED1ng k\xEA</button>
    </div>

    <div id="tab-assignments" class="tab-content">
      ${t.assignments.length>0?`
      <div class="assign-filter-bar">
        <input class="form-input assign-filter-search" aria-label="T\xECm theo t\xEAn b\xE0i" placeholder="\u{1F50D} T\xECm theo t\xEAn b\xE0i..."
          oninput="filterAssignments(this.value, null)" />
        <div class="assign-skill-pills">
          <button class="assign-skill-pill active" data-skill="" onclick="filterAssignments(null, '')">T\u1EA5t c\u1EA3</button>
          ${FILTERABLE_ASSIGNMENT_SKILLS.map(a=>`
            <button class="assign-skill-pill" data-skill="${a}" onclick="filterAssignments(null, '${a}')">${SKILL_LABELS[a].icon} ${SKILL_LABELS[a].label}</button>
          `).join("")}
        </div>
      </div>`:""}
      <div class="table-wrap assign-table-wrap">
        <table>
          <thead><tr>
            <th ${SORTABLE_TH_ATTRS} id="assign-th-skill" onclick="sortAssignList('skill')">K\u1EF9 n\u0103ng</th>
            <th ${SORTABLE_TH_ATTRS} id="assign-th-title" onclick="sortAssignList('title')">T\xEAn b\xE0i t\u1EADp</th>
            <th>\u0110\u1EC1</th>
            <th ${SORTABLE_TH_ATTRS} id="assign-th-deadline" onclick="sortAssignList('deadline')">H\u1EA1n n\u1ED9p</th>
            <th>M\u1EDF/\u0110\xF3ng</th><th>Thao t\xE1c</th>
          </tr></thead>
          <tbody id="assign-tbody">${n}</tbody>
        </table>
      </div>
    </div>

    <div id="tab-students" class="tab-content" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div id="bulk-action-bar" class="bulk-action-bar hidden">
          <span id="bulk-count-label" class="bulk-count-label">0 \u0111\xE3 ch\u1ECDn</span>
          <button class="btn btn-sm btn-outline" onclick="bulkRemoveStudents('${t.id}')">\u{1F5D1} Xo\xE1 kh\u1ECFi l\u1EDBp</button>
          <button class="btn btn-sm btn-outline" onclick="bulkExportCSV('${t.id}')">\u{1F4E5} Export CSV</button>
          <button class="btn btn-sm btn-outline" onclick="deselectAll()">\u2715 B\u1ECF ch\u1ECDn</button>
        </div>
        <div style="flex:1"></div>
        <button class="btn btn-outline" onclick="openAddStudentModal('${t.id}')">+ Th\xEAm h\u1ECDc sinh</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="width:36px"><input type="checkbox" id="select-all-students" onchange="toggleSelectAllStudents(this, '${t.id}')" title="Ch\u1ECDn t\u1EA5t c\u1EA3" /></th>
            <th ${SORTABLE_TH_ATTRS} id="student-th-name" onclick="sortClassStudentsTable('full_name')">H\u1ECD t\xEAn</th>
            <th ${SORTABLE_TH_ATTRS} id="student-th-username" onclick="sortClassStudentsTable('username')">Username</th>
            <th>Thao t\xE1c</th>
          </tr></thead>
          <tbody id="students-tbody">${i}</tbody>
        </table>
      </div>
    </div>

    <div id="tab-stats" class="tab-content" style="display:none">
      ${o}
    </div>`}let _assignFilterSkill="",_assignFilterSearch="";function filterAssignments(t,e){t!==null&&(_assignFilterSearch=t.toLowerCase().trim()),e!==null&&(_assignFilterSkill=e,document.querySelectorAll(".assign-skill-pill").forEach(s=>{s.classList.toggle("active",s.dataset.skill===e)}));const n=_cachedCls;if(!n)return;const i=n.assignments.filter(s=>{const a=!_assignFilterSkill||s.skill===_assignFilterSkill,r=!_assignFilterSearch||s.title.toLowerCase().includes(_assignFilterSearch)||(s.question_title||"").toLowerCase().includes(_assignFilterSearch);return a&&r}),o=document.getElementById("assign-tbody");if(o){if(i.length===0){o.innerHTML=`<tr><td colspan="6">
      <div class="empty-state" style="padding:20px">
        <div class="empty-state-icon">\u{1F50D}</div>
        <h3 style="font-size:14px">Kh\xF4ng t\xECm th\u1EA5y b\xE0i n\xE0o</h3>
      </div></td></tr>`;return}_assignListSortCol&&i.sort((s,a)=>{let r,l;if(_assignListSortCol==="skill")r=s.skill||"",l=a.skill||"";else if(_assignListSortCol==="title")r=s.title.toLowerCase(),l=a.title.toLowerCase();else if(_assignListSortCol==="deadline")r=s.deadline||"",l=a.deadline||"";else return 0;return r<l?_assignListSortDir==="asc"?-1:1:r>l?_assignListSortDir==="asc"?1:-1:0}),updateAssignListSortIcons(),o.innerHTML=i.map(s=>{const a=isOverdue(s.deadline)&&s.is_active,r=n.student_count>0?Math.round(s.submission_count/n.student_count*100):0,c=s.skill==="composite"?`/composite/${s.id}`:`/assignment/${s.id}`;return`
      <tr>
        <td>${skillBadge(s.skill)}</td>
        <td style="font-weight:600">${escapeHtml(s.title)}</td>
        <td style="color:var(--gray-400);font-size:12px">${escapeHtml(s.question_title)}</td>
        <td>
          <span class="deadline${a?" overdue":""}">
            ${a?"\u26A0\uFE0F ":""}${formatDateTime(s.deadline)}
          </span>
        </td>
        <td>
          <label class="toggle" title="${s.is_active?"\u0110ang m\u1EDF":"\u0110\xE3 \u0111\xF3ng"}">
            <input type="checkbox" ${s.is_active?"checked":""}
              onchange="toggleAssignment('${s.id}', this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <div class="td-actions">
            <button class="btn btn-sm btn-outline" title="Xem b\xE0i n\u1ED9p"
              onclick="navigate('${c}')">
              <span class="sub-progress-wrap">
                <span class="sub-progress-bar" style="width:${r}%"></span>
              </span>
              \u{1F4CA} ${s.submission_count}/${n.student_count} n\u1ED9p
            </button>
            <button class="btn-icon" title="\u0110\u1ED5i h\u1EA1n n\u1ED9p" aria-label="\u0110\u1ED5i h\u1EA1n n\u1ED9p"
              onclick="changeDeadline('${s.id}')">\u{1F4C5}</button>
            <button class="btn-icon danger" title="Xo\xE1" aria-label="Xo\xE1 b\xE0i t\u1EADp"
              onclick="deleteAssignment('${s.id}', '${n.id}', this)">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`}).join("")}}window.filterAssignments=filterAssignments;function updateAssignListSortIcons(){[["assign-th-skill","skill"],["assign-th-title","title"],["assign-th-deadline","deadline"]].forEach(([t,e])=>{const n=document.getElementById(t);if(!n)return;const i=n.querySelector(".sort-icon");i&&i.remove(),n.insertAdjacentHTML("beforeend",makeSortIcon(e,_assignListSortCol,_assignListSortDir))})}function sortAssignList(t){_assignListSortCol===t?_assignListSortDir=_assignListSortDir==="asc"?"desc":"asc":(_assignListSortCol=t,_assignListSortDir=t==="title"||t==="skill"?"asc":"desc"),filterAssignments(null,null)}window.sortAssignList=sortAssignList;function getSelectedStudentIds(){return Array.from(document.querySelectorAll(".student-bulk-check:checked")).map(t=>t.dataset.sid)}function updateBulkBar(t){const e=getSelectedStudentIds(),n=document.getElementById("bulk-action-bar"),i=document.getElementById("bulk-count-label"),o=document.getElementById("select-all-students"),s=document.querySelectorAll(".student-bulk-check").length;n&&n.classList.toggle("hidden",e.length===0),i&&(i.textContent=`${e.length} \u0111\xE3 ch\u1ECDn`),o&&(o.indeterminate=e.length>0&&e.length<s,o.checked=e.length===s&&s>0)}window.updateBulkBar=updateBulkBar;function toggleSelectAllStudents(t,e){document.querySelectorAll(".student-bulk-check").forEach(n=>{n.checked=t.checked}),updateBulkBar(e)}window.toggleSelectAllStudents=toggleSelectAllStudents;function deselectAll(){document.querySelectorAll(".student-bulk-check").forEach(n=>{n.checked=!1});const t=document.getElementById("select-all-students");t&&(t.checked=!1,t.indeterminate=!1);const e=document.getElementById("bulk-action-bar");e&&e.classList.add("hidden")}window.deselectAll=deselectAll;async function bulkRemoveStudents(t){const e=getSelectedStudentIds();if(!(e.length===0||!await confirmAction({title:"Xo\xE1 h\u1ECDc sinh kh\u1ECFi l\u1EDBp",message:`B\u1EA1n s\u1EAFp xo\xE1 <strong>${e.length}</strong> h\u1ECDc sinh kh\u1ECFi l\u1EDBp n\xE0y.`,confirmText:"Xo\xE1 kh\u1ECFi l\u1EDBp",danger:!0})))try{await Promise.all(e.map(i=>api.delete(`/student-classes?student_id=${i}&class_id=${t}`))),toast(`\u0110\xE3 xo\xE1 ${e.length} h\u1ECDc sinh kh\u1ECFi l\u1EDBp`),showClassDetail({id:t})}catch(i){toast("L\u1ED7i xo\xE1: "+(i.error||i.message),"error")}}window.bulkRemoveStudents=bulkRemoveStudents;function bulkExportCSV(t){const e=Array.from(document.querySelectorAll(".student-bulk-check:checked"));if(e.length===0)return;const n=e.map(r=>{const l=r.closest("tr"),c=l.querySelector(".student-avatar")?.nextSibling?.textContent?.trim()||l.cells[1]?.textContent?.trim()||"",d=l.cells[2]?.textContent?.trim()||"";return[c,d].map(u=>`"${u.replace(/"/g,'""')}"`).join(",")}),i=`H\u1ECD t\xEAn,Username
`+n.join(`
`),o=new Blob([i],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(o),a=document.createElement("a");a.href=s,a.download=`students_${t}.csv`,a.click(),URL.revokeObjectURL(s),toast(`\u0110\xE3 xu\u1EA5t ${n.length} h\u1ECDc sinh ra CSV`)}window.bulkExportCSV=bulkExportCSV;function buildStudentRows(t,e){return t.map(n=>`
    <tr data-student-id="${n.id}">
      <td style="width:36px">
        <input type="checkbox" class="student-bulk-check" data-sid="${n.id}"
          onchange="updateBulkBar('${e}')" />
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="student-avatar">${escapeHtml(n.full_name.charAt(0).toUpperCase())}</span>
          <button class="btn-student-profile" data-sid="${n.id}" data-sname="${escapeHtml(n.full_name)}"
            onclick="openStudentProfileModal(this.dataset.sid, this.dataset.sname)">
            ${escapeHtml(n.full_name)} <span class="btn-sp-icon">\u{1F441}</span>
          </button>
        </div>
      </td>
      <td style="color:var(--gray-400);font-size:12px;font-family:monospace">${escapeHtml(n.username)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-outline" title="\u0110\u1ED5i m\u1EADt kh\u1EA9u"
            data-sid="${n.id}" data-sname="${escapeHtml(n.full_name)}"
            onclick="openResetPasswordModal(this.dataset.sid, this.dataset.sname, this)">\u{1F511} \u0110\u1ED5i MK</button>
          <button class="btn-icon danger" title="Xo\xE1 kh\u1ECFi l\u1EDBp n\xE0y" aria-label="Xo\xE1 h\u1ECDc sinh kh\u1ECFi l\u1EDBp"
            onclick="removeStudentFromClass('${n.id}', '${e}', this)">\u{1F5D1}</button>
        </div>
      </td>
    </tr>`).join("")}function sortClassStudentsTable(t){if(_classStudentsSortCol===t?_classStudentsSortDir=_classStudentsSortDir==="asc"?"desc":"asc":(_classStudentsSortCol=t,_classStudentsSortDir="asc"),!_cachedStudents.length||!_cachedCls)return;const e=[..._cachedStudents].sort((i,o)=>{const s=(i[t]||"").toLowerCase(),a=(o[t]||"").toLowerCase();return s<a?_classStudentsSortDir==="asc"?-1:1:s>a?_classStudentsSortDir==="asc"?1:-1:0}),n=document.getElementById("students-tbody");n&&(n.innerHTML=buildStudentRows(e,_cachedCls.id)),[["student-th-name","full_name"],["student-th-username","username"]].forEach(([i,o])=>{const s=document.getElementById(i);if(!s)return;const a=s.querySelector(".sort-icon");a&&a.remove(),s.insertAdjacentHTML("beforeend",makeSortIcon(o,_classStudentsSortCol,_classStudentsSortDir))})}window.sortClassStudentsTable=sortClassStudentsTable;async function toggleAssignment(t,e){try{await api.patch(`/assignments/${t}`,{is_active:e}),toast(e?"\u0110\xE3 m\u1EDF b\xE0i t\u1EADp":"\u0110\xE3 \u0111\xF3ng b\xE0i t\u1EADp"),_cachedCls?.id&&await showClassDetail({id:_cachedCls.id})}catch(n){toast("L\u1ED7i c\u1EADp nh\u1EADt: "+(n.error||n.message),"error"),_cachedCls?.id&&await showClassDetail({id:_cachedCls.id})}}function changeDeadline(t){const e=_cachedCls?.assignments?.find(i=>i.id===t)?.deadline??null,n=e?new Date(new Date(e)-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):"";openModal("C\u1EADp nh\u1EADt h\u1EA1n n\u1ED9p",`
    <div style="padding:4px 0 16px">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">H\u1EA1n n\u1ED9p m\u1EDBi</label>
      <input id="new-deadline-input" type="datetime-local" class="form-input" value="${escapeHtml(n)}"
        style="width:100%" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Hu\u1EF7</button>
      <button class="btn btn-primary" onclick="saveDeadline('${escapeHtml(t)}', this)">L\u01B0u</button>
    </div>
  `)}window.changeDeadline=changeDeadline;async function saveDeadline(t,e){const n=$("#new-deadline-input")?.value;if(!n){toast("Vui l\xF2ng ch\u1ECDn th\u1EDDi gian","error");return}const i=new Date(n).toISOString(),o=new Date(i).getTime()>Date.now(),s=_cachedCls?.assignments?.find(r=>r.id===t)?.is_active===!1,a=o&&s;btnLoading(e);try{await api.patch(`/assignments/${t}`,a?{deadline:i,is_active:!0}:{deadline:i}),closeModal(),toast(a?"\u0110\xE3 c\u1EADp nh\u1EADt h\u1EA1n n\u1ED9p v\xE0 m\u1EDF l\u1EA1i b\xE0i t\u1EADp":"\u0110\xE3 c\u1EADp nh\u1EADt h\u1EA1n n\u1ED9p"),_cachedCls?.id&&await showClassDetail({id:_cachedCls.id})}catch(r){toast("L\u1ED7i: "+(r.error||r.message),"error"),btnReset(e)}}window.saveDeadline=saveDeadline;async function deleteAssignment(t,e,n){if(await confirmAction({title:"Xo\xE1 b\xE0i t\u1EADp",message:"B\xE0i t\u1EADp n\xE0y v\xE0 to\xE0n b\u1ED9 b\xE0i n\u1ED9p li\xEAn quan s\u1EBD b\u1ECB xo\xE1 v\u0129nh vi\u1EC5n.",confirmText:"Xo\xE1 b\xE0i t\u1EADp",danger:!0})){btnLoading(n);try{await api.delete(`/assignments/${t}`),toast("\u0110\xE3 xo\xE1 b\xE0i t\u1EADp"),showClassDetail({id:e})}catch(o){btnReset(n),toast("L\u1ED7i xo\xE1: "+(o.error||o.message),"error")}}}async function showAssignmentSubmissions({id:t}){_submissionsSortCol="",_submissionsSortDir="desc",setLoading("\u0110ang t\u1EA3i danh s\xE1ch b\xE0i n\u1ED9p...");const e=routeToken();try{const{assignment:n,students:i}=await api.get(`/assignments/${t}/submissions`);if(routeChanged(e))return;renderAssignmentSubmissions(n,i)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i d\u1EEF li\u1EC7u: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\xE1ch b\xE0i n\u1ED9p",n,`/assignment/${t}`)}}function exportSubmissionsCSV(t,e){const n=["H\u1ECD t\xEAn","Username","Tr\u1EA1ng th\xE1i","\u0110i\u1EC3m","Th\u1EDDi gian n\u1ED9p"],i=e.map(l=>[l.full_name,l.username,l.submission_id?"\u0110\xE3 n\u1ED9p":"Ch\u01B0a n\u1ED9p",l.overall_score!=null?l.overall_score:"",l.submitted_at?formatDateTime(l.submitted_at):""]),o=[n,...i].map(l=>l.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join(`
`),s=new Blob(["\uFEFF"+o],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(s),r=document.createElement("a");r.href=a,r.download=`${t.title.replace(/[^a-zA-Z0-9_\-]/g,"_")}_diem.csv`,r.click(),URL.revokeObjectURL(a)}window.exportSubmissionsCSV=exportSubmissionsCSV;function buildSubmissionRows(t,e){return t.length===0?`<tr><td colspan="5">
      <div class="empty-state" style="padding:30px">
        <div class="empty-state-icon">\u{1F464}</div>
        <h3>L\u1EDBp ch\u01B0a c\xF3 h\u1ECDc sinh n\xE0o</h3>
      </div>
     </td></tr>`:t.map(n=>{const i=!!n.submission_id,o=n.overall_score!=null?`<span style="font-weight:700;color:var(--primary)">${n.overall_score}/9</span>`:i?'<span style="color:var(--gray-400)">Ch\u1EDD ch\u1EA5m</span>':"\u2014",s=i?'<span class="badge" style="background:#d1fae5;color:#065f46">\u2713 \u0110\xE3 n\u1ED9p</span>':'<span class="badge" style="background:#fee2e2;color:#991b1b">\u2717 Ch\u01B0a n\u1ED9p</span>',a=i?`<button class="btn btn-sm btn-outline"
           onclick="openSubmissionModal('${n.submission_id}', '${e.skill}')">
           Xem b\xE0i
         </button>`:'<span style="font-size:12px;color:var(--gray-400)">\u2014</span>';return`
      <tr>
        <td>
          <div style="font-weight:600">${escapeHtml(n.full_name)}</div>
          <div style="font-size:11px;color:var(--gray-400);font-family:monospace">${escapeHtml(n.username)}</div>
        </td>
        <td>${s}</td>
        <td>${o}</td>
        <td style="font-size:12px;color:var(--gray-400)">${n.submitted_at?formatDateTime(n.submitted_at):"\u2014"}</td>
        <td>${a}</td>
      </tr>`}).join("")}function sortedSubmissionStudents(t){return _submissionsSortCol?[...t].sort((e,n)=>{let i,o;switch(_submissionsSortCol){case"full_name":i=e.full_name.toLowerCase(),o=n.full_name.toLowerCase();break;case"status":i=e.submission_id?1:0,o=n.submission_id?1:0;break;case"score":i=e.overall_score??-1,o=n.overall_score??-1;break;case"submitted_at":i=e.submitted_at||"",o=n.submitted_at||"";break;default:return 0}return i<o?_submissionsSortDir==="asc"?-1:1:i>o?_submissionsSortDir==="asc"?1:-1:0}):t}function sortSubmissionsTable(t){_submissionsSortCol===t?_submissionsSortDir=_submissionsSortDir==="asc"?"desc":"asc":(_submissionsSortCol=t,_submissionsSortDir=t==="full_name"?"asc":"desc");const e=window._currentAssignmentData;if(!e)return;const n=document.querySelector(".table-wrap table tbody");n&&(n.innerHTML=buildSubmissionRows(sortedSubmissionStudents(e.students),e.assignment)),document.querySelectorAll("th[data-sub-col]").forEach(i=>{i.querySelector(".sort-icon")?.remove(),i.insertAdjacentHTML("beforeend",makeSortIcon(i.dataset.subCol,_submissionsSortCol,_submissionsSortDir))})}window.sortSubmissionsTable=sortSubmissionsTable;function renderAssignmentSubmissions(t,e){const n=e.filter(r=>r.submission_id).length,i=e.length-n,o=isOverdue(t.deadline)&&t.is_active,s=r=>makeSortIcon(r,_submissionsSortCol,_submissionsSortDir),a=buildSubmissionRows(sortedSubmissionStudents(e),t);window._currentAssignmentData={assignment:t,students:e},$("#app").innerHTML=`
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">L\u1EDBp h\u1ECDc</a>
      <span class="breadcrumb-sep">\u203A</span>
      <a class="breadcrumb-item" onclick="navigate('/class/${t.class_id}')">
        ${escapeHtml(t.class_name)}
      </a>
      <span class="breadcrumb-sep">\u203A</span>
      <span class="breadcrumb-item active">${escapeHtml(t.title)}</span>
    </nav>

    <div class="detail-header">
      <div class="detail-header-info">
        <h2>${skillBadge(t.skill)} ${escapeHtml(t.title)}</h2>
        <div class="detail-header-meta">
          <span>\u{1F3EB} ${escapeHtml(t.class_name)}</span>
          <span>\u{1F4D6} ${escapeHtml(t.question_title)}</span>
          <span class="deadline${o?" overdue":""}">
            \u{1F5D3} ${o?"\u26A0\uFE0F ":""}${formatDateTime(t.deadline)}
          </span>
          <span>${t.is_active?'<span style="color:#065f46">\u25CF \u0110ang m\u1EDF</span>':'<span style="color:var(--gray-400)">\u25CF \u0110\xE3 \u0111\xF3ng</span>'}</span>
        </div>
      </div>
      <button class="btn btn-outline"
        onclick="exportSubmissionsCSV(window._currentAssignmentData.assignment, window._currentAssignmentData.students)">
        \u2B07 Export CSV
      </button>
    </div>

    <div style="display:flex;gap:16px;margin-bottom:20px">
      <div class="stat-chip">\u2713 <strong>${n}</strong> \u0111\xE3 n\u1ED9p</div>
      <div class="stat-chip">\u2717 <strong>${i}</strong> ch\u01B0a n\u1ED9p</div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th ${SORTABLE_TH_ATTRS} data-sub-col="full_name" onclick="sortSubmissionsTable('full_name')">H\u1ECDc sinh ${s("full_name")}</th>
            <th ${SORTABLE_TH_ATTRS} data-sub-col="status" onclick="sortSubmissionsTable('status')">Tr\u1EA1ng th\xE1i ${s("status")}</th>
            <th ${SORTABLE_TH_ATTRS} data-sub-col="score" onclick="sortSubmissionsTable('score')">\u0110i\u1EC3m ${s("score")}</th>
            <th ${SORTABLE_TH_ATTRS} data-sub-col="submitted_at" onclick="sortSubmissionsTable('submitted_at')">Th\u1EDDi gian n\u1ED9p ${s("submitted_at")}</th>
            <th>B\xE0i l\xE0m</th>
          </tr>
        </thead>
        <tbody>${a}</tbody>
      </table>
    </div>`}async function openSubmissionModal(t,e){if(e==="writing"||e==="speaking"){navigate(`/grading/${t}`);return}openModal("\u0110ang t\u1EA3i b\xE0i l\xE0m...",'<div class="loading-screen"><div class="spinner"></div></div>');try{const n=await api.get(`/submissions/${t}`);renderSubmissionModal(n,e)}catch(n){$("#modal-title").textContent="L\u1ED7i";const i=document.createElement("p");i.style.color="var(--danger)",i.textContent=n.error||n.message||"\u0110\xE3 x\u1EA3y ra l\u1ED7i",$("#modal-body").replaceChildren(i)}}function renderSubmissionModal(t,e){const n="";if(e==="reading"||e==="listening"){const i={};(t.questions_data||[]).forEach(r=>{i[r.q_no]=r.answers||[]});const o=(t.student_answers||[]).map(r=>{const l=i[r.q_no]||[],c=l.some(d=>d.toLowerCase().trim()===(r.answer||"").toLowerCase().trim());return`
        <tr>
          <td style="font-weight:600;text-align:center">Q${r.q_no}</td>
          <td>${escapeHtml(r.answer||"\u2014")}</td>
          <td style="color:var(--gray-400);font-size:12px">${l.join(" / ")}</td>
          <td style="text-align:center;font-size:16px">${c?"\u2705":"\u274C"}</td>
        </tr>`}).join(""),s=(t.student_answers||[]).filter(r=>(i[r.q_no]||[]).some(c=>c.toLowerCase().trim()===(r.answer||"").toLowerCase().trim())).length,a=(t.questions_data||[]).length;$("#modal-title").textContent=`B\xE0i l\xE0m \u2014 ${skillBadge(e).replace(/<[^>]+>/g,"")}`,$("#modal-body").innerHTML=`
      <div style="margin-bottom:12px;padding:12px 16px;background:var(--primary-lt);border-radius:8px;display:flex;gap:24px;align-items:center">
        <span style="font-size:20px;font-weight:700;color:var(--primary)">${t.overall_score??"\u2014"}/9</span>
        <span style="color:var(--gray-600);font-size:13px">\u0110\xFAng ${s}/${a} c\xE2u</span>
        <span style="color:var(--gray-400);font-size:12px">N\u1ED9p l\xFAc ${formatDateTime(t.submitted_at)}</span>
      </div>
      <div class="table-wrap" style="max-height:400px;overflow-y:auto">
        <table>
          <thead>
            <tr><th>C\xE2u</th><th>H\u1ECDc sinh tr\u1EA3 l\u1EDDi</th><th>\u0110\xE1p \xE1n \u0111\xFAng</th><th>K\u1EBFt qu\u1EA3</th></tr>
          </thead>
          <tbody>${o||'<tr><td colspan="4" style="text-align:center;color:var(--gray-400)">Kh\xF4ng c\xF3 \u0111\xE1p \xE1n</td></tr>'}</tbody>
        </table>
      </div>`}else if(e==="writing")$("#modal-title").textContent="B\xE0i lu\u1EADn Writing",$("#modal-body").innerHTML=`
      <div style="margin-bottom:8px;color:var(--gray-400);font-size:12px">
        N\u1ED9p l\xFAc ${formatDateTime(t.submitted_at)}
      </div>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;padding:16px;
                  background:var(--gray-50,#f9fafb);border-radius:8px;
                  border:1px solid var(--gray-200);min-height:200px;max-height:480px;overflow-y:auto">
        ${escapeHtml(t.writing_content||"(Tr\u1ED1ng)")}
      </div>
      <div style="margin-top:12px;padding:10px 14px;background:#fef9c3;border-radius:8px;font-size:12px;color:#713f12">
        \u270F\uFE0F Giao di\u1EC7n ch\u1EA5m v\xE0 nh\u1EADn x\xE9t writing s\u1EBD c\xF3 \u1EDF phi\xEAn b\u1EA3n ti\u1EBFp theo.
      </div>`;else if(e==="speaking"){$("#modal-title").textContent="B\xE0i Speaking";const i=Array.isArray(t.speaking_audio_urls)&&t.speaking_audio_urls.length>0?t.speaking_audio_urls:t.speaking_audio_url?[{url:t.speaking_audio_url,name:""}]:[],o=i.length>1,s=i.length>0?i.map((r,l)=>`
          <div style="${o?"margin-bottom:10px":""}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              ${o?`<div style="font-size:12px;font-weight:600;color:var(--gray-500)">${escapeHtml(r.name||"Ph\u1EA7n "+(l+1))}</div>`:"<div></div>"}
              <button type="button" class="btn-icon" title="T\u1EA3i xu\u1ED1ng" onclick="downloadAudioFile('${escapeHtml(r.url||"")}', '${escapeHtml((t.student_name||"speaking")+"_"+(r.name||"phan"+(l+1)))}', this)">\u{1F4E5}</button>
            </div>
            <audio controls src="${escapeHtml(r.url||"")}" style="width:100%;border-radius:8px"></audio>
          </div>`).join(""):'<div style="color:var(--gray-400);padding:16px;text-align:center">Kh\xF4ng c\xF3 file audio</div>',a=t.speaking_script?`<div style="margin-top:12px">
           <div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:6px">TRANSCRIPT</div>
           <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;padding:12px;
                       background:var(--gray-50,#f9fafb);border-radius:8px;
                       border:1px solid var(--gray-200);max-height:240px;overflow-y:auto">
             ${isSttFailedScript(t.speaking_script)?"\u26A0\uFE0F Kh\xF4ng t\u1EF1 \u0111\u1ED9ng tr\xEDch xu\u1EA5t \u0111\u01B0\u1EE3c transcript \u2014 vui l\xF2ng nghe audio tr\u1EF1c ti\u1EBFp \u0111\u1EC3 ch\u1EA5m.":escapeHtml(t.speaking_script)}
           </div>
         </div>`:"";$("#modal-body").innerHTML=`
      <div style="margin-bottom:8px;color:var(--gray-400);font-size:12px">
        N\u1ED9p l\xFAc ${formatDateTime(t.submitted_at)}
      </div>
      ${s}${a}
      <div style="margin-top:12px;padding:10px 14px;background:#fef9c3;border-radius:8px;font-size:12px;color:#713f12">
        \u270F\uFE0F Giao di\u1EC7n ch\u1EA5m v\xE0 nh\u1EADn x\xE9t speaking s\u1EBD c\xF3 \u1EDF phi\xEAn b\u1EA3n ti\u1EBFp theo.
      </div>`}}async function initWaveform(t,e){const i=document.createElement("canvas");i.className="waveform-canvas",i.height=56,t.innerHTML="",t.appendChild(i);const o=i.getContext("2d");function s(){i.width=t.clientWidth||600}s(),window.addEventListener("resize",s);let a=null;function r(l){const c=i.width,d=i.height;if(o.clearRect(0,0,c,d),!a){o.fillStyle="var(--gray-200)";for(let m=0;m<200;m++){const h=m/200*c,g=d*.15+Math.random()*d*.1;o.fillRect(h+1,(d-g)/2,c/200-2,g)}return}const u=c/200;for(let m=0;m<200;m++){const h=Math.max(3,a[m]*d*.9),g=m*u,f=m/200<(l||0);o.fillStyle=f?"#0f766e":"#d1d5db",o.fillRect(g+1,(d-h)/2,Math.max(1,u-2),h)}if(l>0){const m=l*c;o.strokeStyle="var(--primary-dk)",o.lineWidth=2,o.beginPath(),o.moveTo(m,4),o.lineTo(m,d-4),o.stroke()}}r(0),i.addEventListener("click",l=>{if(!e.duration)return;const c=i.getBoundingClientRect();e.currentTime=(l.clientX-c.left)/c.width*e.duration}),e.addEventListener("timeupdate",()=>{e.duration&&r(e.currentTime/e.duration)}),e.addEventListener("seeked",()=>{e.duration&&r(e.currentTime/e.duration)});try{const c=await(await fetch(e.src)).arrayBuffer(),d=new(window.AudioContext||window.webkitAudioContext),u=await d.decodeAudioData(c);d.close();const m=u.getChannelData(0),h=Math.floor(m.length/200),g=[];for(let y=0;y<200;y++){let C=0;for(let E=0;E<h;E++)C+=Math.abs(m[y*h+E]||0);g.push(C/h)}const f=Math.max(...g,.001);a=g.map(y=>y/f),a=a.map((y,C)=>{const E=a[C-1]??y,I=a[C+1]??y;return E*.25+y*.5+I*.25}),r(e.duration?e.currentTime/e.duration:0);const w=u.duration;if(w>0){const y=document.getElementById("audio-dur-0");if(y&&(y.textContent=`\xB7 ${formatAudioDur(w)}`),!isFinite(e.duration)||e.duration<1)try{e.currentTime=w,e.currentTime=0}catch{}}}catch{a=Array.from({length:200},()=>.2+Math.random()*.3),r(0)}}function formatAudioDur(t){const e=Math.round(t);return`${Math.floor(e/60)}:${String(e%60).padStart(2,"0")}`}async function fixTrackAudioDuration(t){const e=document.getElementById(`track-audio-${t}`),n=document.getElementById(`audio-dur-${t}`);if(!e||!e.src)return;const i=()=>isFinite(e.duration)&&e.duration>0?(n&&(n.textContent=`\xB7 ${formatAudioDur(e.duration)}`),!0):!1;if(i())return;e.addEventListener("loadedmetadata",()=>{i()||o()},{once:!0});async function o(){try{const a=await(await fetch(e.src)).arrayBuffer(),r=new(window.AudioContext||window.webkitAudioContext),l=await r.decodeAudioData(a);r.close(),l.duration>0&&n&&(n.textContent=`\xB7 ${formatAudioDur(l.duration)}`)}catch{}}setTimeout(()=>{n&&!n.textContent&&o()},1500)}let _gradingAnnotations=[],_gradingSubmissionId=null,_gradingText="",_gradingSkill="",_gradingAiFeedback=null,_gradingVoiceNotes=[],_voiceNoteMediaRecorder=null,_voiceNoteChunks=[],_voiceNoteRecordIdx=-1,_voiceNoteRecordSeconds=0,_voiceNoteRecordTimer=null,_gradingKeyHandler=null;function bindGradingShortcuts(){_gradingKeyHandler&&document.removeEventListener("keydown",_gradingKeyHandler),_gradingKeyHandler=t=>{const e=(t.target?.tagName||"").toUpperCase();if(e==="INPUT"||e==="TEXTAREA"){if((t.metaKey||t.ctrlKey)&&t.key.toLowerCase()==="s"){t.preventDefault();const n=document.querySelector('#save-btn, [onclick*="saveGrading"]');n&&saveGrading(n,"complete")}return}if((t.metaKey||t.ctrlKey)&&t.key.toLowerCase()==="s"){t.preventDefault();const n=document.querySelector('#save-btn, [onclick*="saveGrading"]');n&&saveGrading(n)}if((t.key==="ArrowDown"||t.key==="ArrowUp")&&_gradingAnnotations.length>0){t.preventDefault();const n=_gradingAnnotations.map(o=>o.id);let i=n.indexOf(window._gradingFocusAnnId);i<0&&(i=t.key==="ArrowDown"?-1:0),i=t.key==="ArrowDown"?(i+1)%n.length:(i-1+n.length)%n.length,window._gradingFocusAnnId=n[i],scrollToAnnotation(window._gradingFocusAnnId)}},document.addEventListener("keydown",_gradingKeyHandler)}function unbindGradingShortcuts(){_gradingKeyHandler&&document.removeEventListener("keydown",_gradingKeyHandler),_gradingKeyHandler=null}async function showGradingPage({id:t}){setLoading("\u0110ang t\u1EA3i b\xE0i l\xE0m...");const e=routeToken();try{const n=await api.get(`/submissions/${t}`);if(routeChanged(e))return;renderGradingPage(n),bindGradingShortcuts()}catch(n){if(routeChanged(e))return;toast("L\u1ED7i: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c b\xE0i l\xE0m",n,`/grading/${t}`)}}window.addEventListener("hashchange",()=>{window.location.hash.includes("/grading/")||unbindGradingShortcuts()});function prevAttemptsDropdownHtml(t,e){return!Array.isArray(t)||t.length===0?"":t.map(n=>{let i="";if(e==="speaking"){const a=Array.isArray(n.speaking_audio_urls)&&n.speaking_audio_urls.length?n.speaking_audio_urls:n.speaking_audio_url?[{url:n.speaking_audio_url,name:""}]:[];i=`${a.map((l,c)=>`
        <div style="margin-bottom:8px">
          ${a.length>1?`<div style="font-size:12px;color:var(--gray-500);margin-bottom:4px">${escapeHtml(l.name||"Ph\u1EA7n "+(c+1))}</div>`:""}
          <audio controls src="${escapeHtml(l.url||"")}" style="width:100%;height:34px"></audio>
        </div>`).join("")}
        ${isSttFailedScript(n.speaking_script)?'<div style="color:var(--gray-400);font-size:13px;margin-top:6px">\u26A0\uFE0F Kh\xF4ng t\u1EF1 \u0111\u1ED9ng tr\xEDch xu\u1EA5t \u0111\u01B0\u1EE3c transcript \u2014 nghe audio tr\u1EF1c ti\u1EBFp.</div>':n.speaking_script?`<div style="white-space:pre-wrap;font-size:14px;line-height:1.7;margin-top:6px">${escapeHtml(n.speaking_script)}</div>`:'<div style="color:var(--gray-400);font-size:13px">Kh\xF4ng c\xF3 transcript</div>'}`}else i=n.writing_content?`<div style="white-space:pre-wrap;font-size:14px;line-height:1.8">${escapeHtml(n.writing_content)}</div>`:'<div style="color:var(--gray-400);font-size:13px">Kh\xF4ng c\xF3 n\u1ED9i dung</div>';const o=n.overall_score!=null?` \xB7 ${n.overall_score} Band`:"",s=e!=="speaking"&&n.word_count!=null?` \xB7 ${n.word_count} t\u1EEB`:"";return`
      <details class="grading-question-details">
        <summary class="grading-panel-label grading-question-summary">
          \u{1F4C4} B\xE0i l\xE0m l\u1EA7n ${n.attempt_number}${o}${s} <span class="grading-select-hint">Nh\u1EA5n \u0111\u1EC3 m\u1EDF/thu g\u1ECDn</span>
        </summary>
        <div class="grading-question-body">${i}</div>
      </details>`}).join("")}function renderGradingPage(t){_gradingSubmissionId=t.id,_gradingSkill=t.skill,_gradingText=t.skill==="speaking"?t.speaking_script||"":t.writing_content||"";const e=t.teacher_feedback||{};_gradingAnnotations=e.annotations||[],_gradingAiFeedback=t.ai_feedback||null,_gradingVoiceNotes=(e.voice_notes||[]).map(u=>({displayName:u.name||"",file:null,name:u.name||"",size:0,status:"done",url:u.url||null,key:u.key||null,pct:100,eta:null,localUrl:null}));const n=t.submission_kind==="composite_section"?`/composite/${t.assignment_id}`:`/assignment/${t.assignment_id}`,i=t.supports_ai_feedback!==!1,o=t.skill==="speaking"?"\u{1F3A4} Ch\u1EA5m b\xE0i Speaking":"\u270F\uFE0F Ch\u1EA5m b\xE0i Writing",s=(t.attempt_number||1)>1,a=t.previous_attempts||[];let r="";if(t.skill==="speaking"){const u=Array.isArray(t.speaking_audio_urls)&&t.speaking_audio_urls.length>0?t.speaking_audio_urls:t.speaking_audio_url?[{url:t.speaking_audio_url,name:""}]:[],m=u.length>1;u.length>0&&(r=`
        <div style="margin-bottom:16px;padding:12px;background:var(--gray-50);border-radius:12px;border:1px solid var(--gray-200)">
          <div style="font-size:12px;font-weight:700;color:var(--gray-500);margin-bottom:8px;text-transform:uppercase">Audio ghi \xE2m</div>
          ${u.map((h,g)=>`
            <div style="${m?"margin-bottom:10px":""}">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                ${m?`<div style="font-size:12px;color:var(--gray-500)">${escapeHtml(h.name||"Ph\u1EA7n "+(g+1))} <span id="audio-dur-${g}" style="color:var(--gray-400)"></span></div>`:"<div></div>"}
                <button type="button" class="btn-icon" title="T\u1EA3i xu\u1ED1ng" onclick="downloadAudioFile('${escapeHtml(h.url||"")}', '${escapeHtml((t.student_name||"speaking")+"_"+(h.name||"phan"+(g+1)))}', this)">\u{1F4E5}</button>
              </div>
              ${g===0?'<div id="waveform-container" class="waveform-container"><div class="waveform-loading">\u0110ang t\u1EA3i waveform...</div></div>':""}
              <audio ${g===0?'id="waveform-audio"':`id="track-audio-${g}"`} controls src="${escapeHtml(h.url||"")}" preload="metadata" style="width:100%;height:36px;outline:none;${g===0?"margin-top:6px":""}"></audio>
            </div>`).join("")}
        </div>`)}$("#app").innerHTML=`
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">L\u1EDBp h\u1ECDc</a>
      <span class="breadcrumb-sep">\u203A</span>
      ${t.class_id?`<a class="breadcrumb-item" onclick="navigate('/class/${t.class_id}')">${escapeHtml(t.class_name||"L\u1EDBp h\u1ECDc")}</a><span class="breadcrumb-sep">\u203A</span>`:""}
      ${t.assignment_id?`<a class="breadcrumb-item" onclick="navigate('${n}')">${escapeHtml(t.assignment_title||"B\xE0i t\u1EADp")}</a><span class="breadcrumb-sep">\u203A</span>`:""}
      <span class="breadcrumb-item active">Ch\u1EA5m b\xE0i</span>
    </nav>

    <div class="page-header">
      <div>
        <div class="page-title">
          ${o}
          ${s?`<span class="rewrite-badge-title">B\xC0I L\xC0M L\u1EA0I \xB7 L\u1EA7n ${t.attempt_number}</span>`:""}
        </div>
        <div class="page-subtitle">
          ${escapeHtml(t.student_name||"")}
          ${t.student_username?`<span style="color:var(--gray-400);font-family:monospace;font-size:11px">(${escapeHtml(t.student_username)})</span>`:""}
          \u2014 ${escapeHtml(t.assignment_title||"")}
          <span style="color:var(--gray-400);font-size:12px">\xB7 N\u1ED9p ${formatDateTime(t.submitted_at)}</span>
        </div>
      </div>
      <button class="btn btn-primary" id="save-btn" onclick="saveGrading(this, 'complete')">\u2705 Ho\xE0n th\xE0nh</button>
    </div>

    <div class="grading-layout">
      <!-- Left: writing content with highlights -->
      <div class="grading-content-panel">
        ${t.content_blocks?.length||t.content_text?`
        <details class="grading-question-details">
          <summary class="grading-panel-label grading-question-summary">
            \u{1F4CB} \u0110\u1EC1 b\xE0i <span class="grading-select-hint">Nh\u1EA5n \u0111\u1EC3 m\u1EDF/thu g\u1ECDn</span>
          </summary>
          <div class="grading-question-body">
            ${renderRichQuestionContentHTML(t.content_blocks,t.content_text||"")}
          </div>
        </details>`:""}
        ${prevAttemptsDropdownHtml(a,t.skill)}
        ${r}
        <div class="grading-panel-label">
          \u{1F4DD} ${t.skill==="speaking"?"Transcript AI":"B\xE0i l\xE0m"}
          <span class="grading-select-hint">B\xF4i \u0111en \u0111o\u1EA1n v\u0103n \u0111\u1EC3 th\xEAm nh\u1EADn x\xE9t</span>
          ${t.skill==="writing"&&t.word_count!=null?`<span style="margin-left:auto;font-size:12px;color:var(--gray-500);font-weight:500">\u{1F4CA} ${t.word_count} t\u1EEB</span>`:""}
        </div>
        <div id="writing-display" class="writing-display"></div>
      </div>

      <!-- Right: annotations sidebar -->
      <div class="grading-sidebar">
        <div class="grading-panel-label">\u{1F4AC} Nh\u1EADn x\xE9t theo \u0111o\u1EA1n</div>
        <div id="annotations-list" class="annotations-list"></div>

        <div class="grading-sidebar-section">
          <label class="form-label">Nh\u1EADn x\xE9t t\u1ED5ng th\u1EC3</label>
          <textarea id="overall-feedback" class="form-textarea" rows="5"
            placeholder="Nh\u1EADn x\xE9t chung v\u1EC1 b\xE0i vi\u1EBFt...">${escapeHtml(e.overall||"")}</textarea>
        </div>

        <div class="grading-sidebar-section">
          <label class="form-label">\u{1F399}\uFE0F Nh\u1EADn x\xE9t b\u1EB1ng gi\u1ECDng n\xF3i <span style="font-size:11px;font-weight:400;color:var(--gray-400)">(tu\u1EF3 ch\u1ECDn \u2014 c\xF3 th\u1EC3 ghi nhi\u1EC1u b\u1EA3n)</span></label>
          <div id="voice-notes-list"></div>
          <button type="button" class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addVoiceNoteSlot()">+ Th\xEAm b\u1EA3n ghi</button>
        </div>

        <div class="grading-sidebar-section" style="display:flex;align-items:center;gap:10px">
          <label class="form-label" style="margin:0;white-space:nowrap">Band Score</label>
          <input id="grading-score" type="number" min="0" max="9" step="0.5"
            class="form-input" style="width:80px;text-align:center"
            value="${t.overall_score??e.score??""}"
            placeholder="0\u20139" />
          <span style="font-size:13px;color:var(--gray-400)">/9</span>
        </div>

        <div class="grading-action-buttons">
          <button class="btn btn-primary" style="flex:1" onclick="saveGrading(this, 'complete')">\u2705 Ho\xE0n th\xE0nh</button>
          ${t.skill==="writing"||t.skill==="speaking"?`<button class="btn btn-outline grading-rewrite-btn" onclick="saveGrading(this, 'request_rewrite')">\u270F\uFE0F Y\xEAu c\u1EA7u l\xE0m l\u1EA1i</button>`:""}
        </div>

        ${a.length>0?`
        <div class="prev-attempts-section">
          <div class="prev-attempts-title">\u{1F4CB} L\u1EA7n ch\u1EA5m tr\u01B0\u1EDBc</div>
          ${a.map(u=>`
            <div class="prev-attempt-card">
              <div class="prev-attempt-header">
                <span class="prev-attempt-label">L\u1EA7n ${u.attempt_number}</span>
                <span class="prev-attempt-score">${u.overall_score!=null?`${u.overall_score} Band`:"Ch\u01B0a c\xF3 \u0111i\u1EC3m"}</span>
                <span class="prev-attempt-date">${formatDateTime(u.submitted_at)}</span>
              </div>
              ${u.teacher_feedback?.overall?`<div class="prev-attempt-overall">${escapeHtml(u.teacher_feedback.overall)}</div>`:'<div class="prev-attempt-overall" style="color:var(--gray-400);font-style:italic">Kh\xF4ng c\xF3 nh\u1EADn x\xE9t t\u1ED5ng</div>'}
            </div>`).join("")}
        </div>`:""}

        ${i?`
        <div class="grading-sidebar-section ai-feedback-section" style="margin-top:16px;border-top:1px solid var(--gray-200);padding-top:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <button class="ai-feedback-toggle" onclick="toggleAiFeedback(this)" title="\u0110\xF3ng/M\u1EDF">
              \u{1F916} AI Feedback <span class="ai-toggle-icon">\u25B2</span>
            </button>
            <button class="btn btn-secondary" id="ai-feedback-btn" onclick="requestAiFeedback(this)"
              style="font-size:12px;padding:5px 12px">
              \u2728 Ph\xE2n t\xEDch AI
            </button>
          </div>
          <div id="ai-feedback-display"></div>
        </div>
        `:""}
      </div>
    </div>`,refreshWritingDisplay(),refreshAnnotationsList(),refreshAiFeedbackDisplay(),renderVoiceNotesList(),document.getElementById("writing-display").addEventListener("mouseup",handleTextSelection);const l=document.getElementById("waveform-container"),c=document.getElementById("waveform-audio");l&&c&&initWaveform(l,c);let d=1;for(;document.getElementById(`track-audio-${d}`);)fixTrackAudioDuration(d),d++}function refreshWritingDisplay(){const t=document.getElementById("writing-display");t&&(t.innerHTML=isSttFailedScript(_gradingText)?'<div style="color:var(--gray-400)">\u26A0\uFE0F Kh\xF4ng t\u1EF1 \u0111\u1ED9ng tr\xEDch xu\u1EA5t \u0111\u01B0\u1EE3c transcript \u2014 vui l\xF2ng nghe audio tr\u1EF1c ti\u1EBFp \u0111\u1EC3 ch\u1EA5m.</div>':buildAnnotatedHtml(_gradingText,_gradingAnnotations))}function refreshAnnotationsList(){const t=document.getElementById("annotations-list");if(!t)return;const e=[..._gradingAnnotations].sort((o,s)=>o.start-s.start);if(e.length===0){t.innerHTML='<div class="annotations-empty">Ch\u01B0a c\xF3 nh\u1EADn x\xE9t n\xE0o. B\xF4i \u0111en \u0111o\u1EA1n v\u0103n \u0111\u1EC3 th\xEAm.</div>';return}const n=_annColorMap(_gradingAnnotations);let i=0;t.innerHTML=e.map(o=>{const s=(o.type||"highlight")==="delete",a=s?'<span class="annotation-delete-badge">\u2715 G\u1EA1ch x\xF3a</span>':`<span class="annotation-number ann-num-c${n.get(o.id)}">${++i}</span>`;return`
    <div class="annotation-card ${s?"ann-card-delete":`ann-card-c${n.get(o.id)}`}" id="ann-card-${o.id}">
      <div class="annotation-card-header">
        ${a}
        <div class="annotation-actions">
          <button class="annotation-edit" onclick="editAnnotation('${o.id}')" title="S\u1EEDa nh\u1EADn x\xE9t" aria-label="S\u1EEDa nh\u1EADn x\xE9t"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 4l2 2" stroke="currentColor" stroke-width="1.4"/></svg></button>
          <button class="annotation-delete" onclick="removeAnnotation('${o.id}')" title="Xo\xE1 nh\u1EADn x\xE9t" aria-label="Xo\xE1 nh\u1EADn x\xE9t">\xD7</button>
        </div>
      </div>
      <div class="annotation-quote${s?" annotation-quote-delete":""}">"${escapeHtml(o.text.slice(0,70))}${o.text.length>70?"\u2026":""}"</div>
      <div class="annotation-comment" id="ann-comment-${o.id}">${escapeHtml(o.comment)}</div>
    </div>`}).join("")}const ANN_COLORS=["ann-c0","ann-c1","ann-c2","ann-c3","ann-c4","ann-c5"];function _annColorMap(t){if(!t||!t.length)return new Map;const e=t.filter(o=>(o.type||"highlight")==="highlight");if(!e.length)return new Map;const n=new Map(e.map(o=>[o.id,0])),i=[...e].sort((o,s)=>o.end-o.start-(s.end-s.start));for(const o of i)for(const s of e)s!==o&&s.start<=o.start&&s.end>=o.end&&n.set(s.id,Math.max(n.get(s.id),n.get(o.id)+1));return new Map(e.map(o=>[o.id,Math.min(n.get(o.id),ANN_COLORS.length-1)]))}function buildAnnotatedHtml(t,e){if(!t)return'<span style="color:var(--gray-400)">(Tr\u1ED1ng)</span>';if(!e.length)return escapeHtml(t);const n=_annColorMap(e),i=[...e].sort((r,l)=>r.start-l.start);let o=0;const s=new Map(i.map(r=>(r.type||"highlight")==="highlight"?[r.id,++o]:[r.id,null]));function a(r,l,c){if(r>=l)return"";if(!c.length)return escapeHtml(t.slice(r,l));const d=[...c].sort((g,f)=>g.start-f.start||f.end-f.start-(g.end-g.start));let u="",m=r;const h=new Set;for(const g of d){if(h.has(g.id))continue;const f=Math.max(g.start,m);if(f>=g.end)continue;u+=escapeHtml(t.slice(m,f));const w=d.filter(y=>!h.has(y.id)&&y!==g&&y.start>=g.start&&y.end<=g.end);if(w.forEach(y=>h.add(y.id)),h.add(g.id),(g.type||"highlight")==="delete")u+=`<span class="ann-delete" data-id="${g.id}" onclick="scrollToAnnotation('${g.id}')" title="${escapeHtml(g.comment)}">`,u+=a(f,g.end,w),u+="</span>";else{const y=ANN_COLORS[n.get(g.id)];u+=`<mark class="ann-highlight ${y}" data-id="${g.id}" onclick="scrollToAnnotation('${g.id}')" title="${escapeHtml(g.comment)}">`,u+=a(f,g.end,w),u+=`<sup class="ann-marker ann-marker-c${n.get(g.id)}">${s.get(g.id)}</sup>`,u+="</mark>"}m=g.end}return u+=escapeHtml(t.slice(m,l)),u}return a(0,t.length,e)}function _plainTextOffset(t,e,n){const i=document.createTreeWalker(t,NodeFilter.SHOW_TEXT,{acceptNode:a=>a.parentElement?.closest(".ann-marker")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let o=0,s;for(;s=i.nextNode();){if(s===e)return o+n;o+=s.length}return o}function handleTextSelection(){closeAnnotationPopup();const t=window.getSelection();if(!t||t.isCollapsed||!t.toString().trim())return;const e=t.getRangeAt(0),n=document.getElementById("writing-display");if(!n||!n.contains(e.commonAncestorContainer))return;const i=_plainTextOffset(n,e.startContainer,e.startOffset),o=_plainTextOffset(n,e.endContainer,e.endOffset),s=e.toString();if(!s.trim())return;const a=e.getBoundingClientRect();showAnnotationPopup(i,o,s,a)}function showAnnotationPopup(t,e,n,i){const o=document.createElement("div");o.id="annotation-popup",o.className="annotation-popup",o.innerHTML=`
    <div class="annotation-popup-quote">"${escapeHtml(n.slice(0,90))}${n.length>90?"\u2026":""}"</div>
    <textarea id="ann-comment-input" class="form-textarea" rows="3"
      placeholder="Nh\u1EADn x\xE9t cho \u0111o\u1EA1n n\xE0y... (Cmd/Ctrl+Enter \u0111\u1EC3 l\u01B0u, Esc \u0111\u1EC3 h\u1EE7y)"></textarea>
    <div class="annotation-popup-actions">
      <button class="btn btn-sm btn-outline" onclick="closeAnnotationPopup()">H\u1EE7y (Esc)</button>
      <button class="btn btn-sm btn-ann-delete" onclick="confirmAnnotation(${t},${e},'delete')">G\u1EA1ch x\xF3a</button>
      <button class="btn btn-sm btn-primary" onclick="confirmAnnotation(${t},${e},'highlight')">Highlight (\u2318\u21B5)</button>
    </div>`,document.body.appendChild(o);const s=window.visualViewport?.width??window.innerWidth,a=window.visualViewport?.height??window.innerHeight,r=o.offsetWidth||340,l=o.offsetHeight||200,c=Math.min(i.bottom+10,a-l-8),d=Math.max(8,Math.min(i.left,s-r-8));o.style.top=c+"px",o.style.left=d+"px",setTimeout(()=>{const u=document.getElementById("ann-comment-input");u?.focus(),u?.addEventListener("keydown",m=>{m.key==="Escape"?(m.preventDefault(),closeAnnotationPopup()):(m.metaKey||m.ctrlKey)&&m.key==="Enter"&&(m.preventDefault(),confirmAnnotation(t,e,"highlight"))}),document.addEventListener("mousedown",_popupOutsideClick)},60)}function _popupOutsideClick(t){const e=document.getElementById("annotation-popup");e&&!e.contains(t.target)&&closeAnnotationPopup()}function closeAnnotationPopup(){const t=document.getElementById("annotation-popup");t&&(t.remove(),window.getSelection()?.removeAllRanges()),document.removeEventListener("mousedown",_popupOutsideClick)}function confirmAnnotation(t,e,n="highlight"){const i=document.getElementById("ann-comment-input")?.value.trim();if(!i){toast("Vui l\xF2ng nh\u1EADp nh\u1EADn x\xE9t","error");return}if(n==="delete"&&_gradingAnnotations.some(s=>(s.type||"highlight")==="delete"&&s.start<e&&t<s.end)){toast("V\xF9ng g\u1EA1ch x\xF3a kh\xF4ng \u0111\u01B0\u1EE3c ch\u1ED3ng l\xEAn nhau","error");return}_gradingAnnotations.push({id:crypto.randomUUID(),start:t,end:e,text:_gradingText.slice(t,e),comment:i,type:n}),closeAnnotationPopup(),refreshWritingDisplay(),refreshAnnotationsList()}function removeAnnotation(t){_gradingAnnotations=_gradingAnnotations.filter(e=>e.id!==t),refreshWritingDisplay(),refreshAnnotationsList()}function editAnnotation(t){const e=_gradingAnnotations.find(o=>o.id===t);if(!e)return;const n=document.getElementById(`ann-comment-${t}`);if(!n||n.querySelector("textarea"))return;n.innerHTML=`
    <textarea class="annotation-edit-input" rows="3"></textarea>
    <div class="annotation-edit-actions">
      <button class="annotation-save-btn" onclick="saveAnnotation('${t}')">L\u01B0u</button>
      <button class="annotation-cancel-btn" onclick="refreshAnnotationsList()">Hu\u1EF7</button>
    </div>`;const i=n.querySelector("textarea");i.value=e.comment,i.focus()}function saveAnnotation(t){const e=document.getElementById(`ann-comment-${t}`)?.querySelector("textarea");if(!e)return;const n=e.value.trim();if(!n){toast("Vui l\xF2ng nh\u1EADp nh\u1EADn x\xE9t","error");return}const i=_gradingAnnotations.find(o=>o.id===t);i&&(i.comment=n),refreshWritingDisplay(),refreshAnnotationsList()}function scrollToAnnotation(t){document.getElementById(`ann-card-${t}`)?.scrollIntoView({behavior:"smooth",block:"nearest"})}function _newVoiceNoteSlot(){return{displayName:"",file:null,name:"",size:0,status:"idle",url:null,key:null,pct:0,eta:null,localUrl:null}}function addVoiceNoteSlot(){_gradingVoiceNotes.push(_newVoiceNoteSlot()),renderVoiceNotesList()}window.addVoiceNoteSlot=addVoiceNoteSlot;function removeVoiceNoteSlot(t){_gradingVoiceNotes[t]?.status!=="recording"&&(_gradingVoiceNotes.splice(t,1),renderVoiceNotesList())}window.removeVoiceNoteSlot=removeVoiceNoteSlot;function renderVoiceNotesList(){const t=$("#voice-notes-list");if(t){if(_gradingVoiceNotes.length===0){t.innerHTML='<div style="color:var(--gray-400);font-size:12px;padding:4px 0">Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o.</div>';return}t.innerHTML=_gradingVoiceNotes.map((e,n)=>{let i="";if(e.status==="idle"||e.status==="error")i=`${e.status==="error"?'<span style="color:var(--danger);font-size:12px">\u2717 L\u1ED7i upload \u2014 th\u1EED l\u1EA1i:</span> ':""}
        <input id="vn-file-input-${n}" type="file" accept="audio/*" style="display:none" onchange="onVoiceNoteFileSelected(this,${n})" />
        <button type="button" class="audio-pick-btn" onclick="startVoiceNoteRecording(${n})">\u{1F399}\uFE0F Ghi \xE2m</button>
        <button type="button" class="audio-pick-btn" onclick="document.getElementById('vn-file-input-${n}').click()">\u{1F3B5} Ch\u1ECDn file</button>`;else if(e.status==="recording")i=`<span style="font-size:13px;color:#dc2626;font-weight:600">\u25CF \u0110ang ghi \xE2m... <span id="vn-record-timer">0:00</span></span>
        <button type="button" class="btn btn-sm btn-danger" onclick="stopVoiceNoteRecording()">\u23F9 D\u1EEBng</button>`;else if(e.status==="checking")i='<span style="font-size:13px;color:var(--gray-500)">\u23F3 \u0110ang ki\u1EC3m tra file...</span>';else if(e.status==="uploading"){const o=e.pct<100&&e.eta!=null?` \xB7 ETA ${_fmtEta(e.eta)}`:"";i=`<div class="upload-progress-row" style="width:100%">
          <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" style="width:${e.pct}%"></div></div>
          <span class="upload-progress-label">${e.pct}%${o}</span>
        </div>`}else e.status==="done"&&(i=`<div class="audio-slot-done" style="width:100%">
          <span class="audio-upload-done">\u2713</span>
          <audio controls src="${escapeHtml(e.localUrl||e.url||"")}" style="height:32px;flex:1;min-width:0;border-radius:6px"></audio>
        </div>`);return`<div class="audio-slot" id="vn-slot-${n}">
      <div class="audio-slot-num">${n+1}</div>
      <div class="audio-slot-content">
        <input type="text" class="form-input audio-slot-name" placeholder="part_${n+1}"
               value="${escapeHtml(e.displayName)}" onchange="_gradingVoiceNotes[${n}].displayName=this.value" />
        <div class="audio-slot-file">${i}</div>
      </div>
      ${e.status!=="recording"?`<button type="button" class="remove-audio-slot" onclick="removeVoiceNoteSlot(${n})" title="Xo\xE1" aria-label="Xo\xE1">\xD7</button>`:""}
    </div>`}).join("")}}window.renderVoiceNotesList=renderVoiceNotesList;async function startVoiceNoteRecording(t){if(_voiceNoteRecordIdx>=0){toast("\u0110ang ghi \xE2m b\u1EA3n kh\xE1c, h\xE3y d\u1EEBng tr\u01B0\u1EDBc","warning");return}if(_gradingVoiceNotes[t]){_voiceNoteRecordIdx=t,_gradingVoiceNotes[t].status="recording",renderVoiceNotesList();try{const e=await navigator.mediaDevices.getUserMedia({audio:!0});_voiceNoteChunks=[];const n=pickAudioRecorderMime();_voiceNoteMediaRecorder=n?new MediaRecorder(e,{mimeType:n}):new MediaRecorder(e),_voiceNoteMediaRecorder.ondataavailable=i=>{i.data.size>0&&_voiceNoteChunks.push(i.data)},_voiceNoteMediaRecorder.onstop=()=>{e.getTracks().forEach(s=>s.stop());const i=(_voiceNoteMediaRecorder.mimeType||n||"audio/webm").split(";")[0],o=new Blob(_voiceNoteChunks,{type:i});_onVoiceNoteRecordingDone(_voiceNoteRecordIdx,o,i)},_voiceNoteMediaRecorder.start(),_voiceNoteRecordSeconds=0,clearInterval(_voiceNoteRecordTimer),_voiceNoteRecordTimer=setInterval(()=>{_voiceNoteRecordSeconds++;const i=Math.floor(_voiceNoteRecordSeconds/60),o=_voiceNoteRecordSeconds%60,s=document.getElementById("vn-record-timer");s&&(s.textContent=`${i}:${o.toString().padStart(2,"0")}`)},1e3)}catch(e){_gradingVoiceNotes[t].status="idle",_voiceNoteRecordIdx=-1,renderVoiceNotesList(),showMicErrorModal(t,e)}}}window.startVoiceNoteRecording=startVoiceNoteRecording;async function showMicErrorModal(t,e){const n=e?.name||"Error",i=e?.message||String(e||"");let o=-1;try{o=(await navigator.mediaDevices.enumerateDevices()).filter(r=>r.kind==="audioinput").length}catch{o=-1}let s="";n==="NotAllowedError"||n==="SecurityError"?s=`
      <p>Tr\xECnh duy\u1EC7t b\xE1o <strong>t\u1EEB ch\u1ED1i quy\u1EC1n micro</strong>. N\u1EBFu m\u1ECDi toggle quy\u1EC1n (trang web + macOS) \u0111\u1EC1u \u0111\xE3 b\u1EADt xanh m\xE0 v\u1EABn l\u1ED7i, th\u1EED theo th\u1EE9 t\u1EF1:</p>
      <ol style="padding-left:20px;margin:0">
        <li>B\u1EA5m <strong>T\u1EA3i l\u1EA1i trang</strong> \u2014 tab \u0111ang m\u1EDF c\xF3 th\u1EC3 gi\u1EEF tr\u1EA1ng th\xE1i quy\u1EC1n c\u0169, reload m\u1EDBi nh\u1EADn quy\u1EC1n m\u1EDBi.</li>
        <li>N\u1EBFu b\u1EA1n \u0111ang <strong>\u0111i\u1EC1u khi\u1EC3n m\xE1y n\xE0y t\u1EEB xa</strong> (Jump Desktop / TeamViewer / Screen Sharing...): micro th\u01B0\u1EDDng <strong>kh\xF4ng \u0111i qua \u0111\u01B0\u1EE3c phi\xEAn remote</strong> \u2014 ph\u1EA3i ghi \xE2m tr\u1EF1c ti\u1EBFp tr\xEAn m\xE1y c\xF3 mic, kh\xF4ng qua remote.</li>
        <li>\u0110\u1EA3m b\u1EA3o kh\xF4ng c\xF3 app/tab n\xE0o kh\xE1c \u0111ang chi\u1EBFm micro (Zoom, Meet, Teams...) r\u1ED3i reload.</li>
      </ol>`:n==="NotFoundError"||n==="OverconstrainedError"||o===0?s=`
      <p><strong>Kh\xF4ng t\xECm th\u1EA5y thi\u1EBFt b\u1ECB microphone n\xE0o</strong> m\xE0 tr\xECnh duy\u1EC7t d\xF9ng \u0111\u01B0\u1EE3c${o===0?" (0 mic \u0111\u01B0\u1EE3c ph\xE1t hi\u1EC7n)":""}.</p>
      <ul style="padding-left:20px;margin:0">
        <li>N\u1EBFu \u0111ang <strong>remote desktop</strong> (Jump Desktop...): mic c\u1EE7a m\xE1y b\u1EA1n ng\u1ED3i kh\xF4ng truy\u1EC1n sang m\xE1y \u0111\u01B0\u1EE3c \u0111i\u1EC1u khi\u1EC3n \u2014 h\xE3y ghi \xE2m tr\u1EF1c ti\u1EBFp tr\xEAn m\xE1y c\xF3 mic.</li>
        <li>C\u1EAFm/b\u1EADt m\u1ED9t micro r\u1ED3i th\u1EED l\u1EA1i.</li>
      </ul>`:n==="NotReadableError"||n==="AbortError"?s=`
      <p>Micro <strong>\u0111ang b\u1ECB m\u1ED9t \u1EE9ng d\u1EE5ng kh\xE1c chi\u1EBFm</strong> ho\u1EB7c l\u1ED7i ph\u1EA7n c\u1EE9ng (${escapeHtml(n)}).</p>
      <ul style="padding-left:20px;margin:0">
        <li>\u0110\xF3ng c\xE1c app \u0111ang d\xF9ng mic (Zoom, Meet, Teams, QuickTime...) r\u1ED3i b\u1EA5m Th\u1EED l\u1EA1i.</li>
      </ul>`:s='<p>Kh\xF4ng truy c\u1EADp \u0111\u01B0\u1EE3c micro. H\xE3y th\u1EED t\u1EA3i l\u1EA1i trang ho\u1EB7c d\xF9ng n\xFAt "Ch\u1ECDn file" \u0111\u1EC3 upload audio c\xF3 s\u1EB5n thay v\xEC ghi \xE2m.</p>',openModal("\u{1F399}\uFE0F Kh\xF4ng th\u1EC3 truy c\u1EADp microphone",`
    <div style="display:flex;flex-direction:column;gap:12px;line-height:1.6;color:var(--text)">
      ${s}
      <div style="font-size:12px;color:var(--gray-500);background:var(--gray-50);border-radius:6px;padding:8px 10px;font-family:monospace">
        L\u1ED7i k\u1EF9 thu\u1EADt: ${escapeHtml(n)}${i?" \u2014 "+escapeHtml(i):""}${o>=0?` \xB7 mic ph\xE1t hi\u1EC7n: ${o}`:""}
      </div>
      <p style="margin:0;font-size:13px;color:var(--gray-600)">\u{1F4A1} Ho\u1EB7c b\u1EA5m <strong>\u{1F3B5} Ch\u1ECDn file</strong> \u0111\u1EC3 upload m\u1ED9t file audio c\xF3 s\u1EB5n thay v\xEC ghi \xE2m tr\u1EF1c ti\u1EBFp.</p>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
        <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
        <button class="btn btn-outline" onclick="confirmReloadForMicPermission()">\u{1F504} T\u1EA3i l\u1EA1i trang</button>
        <button class="btn btn-primary" onclick="closeModal();startVoiceNoteRecording(${t})">Th\u1EED l\u1EA1i</button>
      </div>
    </div>
  `)}window.showMicErrorModal=showMicErrorModal;async function confirmReloadForMicPermission(){closeModal(),await confirmAction({title:"T\u1EA3i l\u1EA1i trang?",message:"Nh\u1EADn x\xE9t/\u0111i\u1EC3m ch\u01B0a l\u01B0u tr\xEAn trang ch\u1EA5m b\xE0i s\u1EBD b\u1ECB m\u1EA5t. C\xE1c b\u1EA3n ghi \xE2m \u0111\xE3 upload xong (tr\u1EA1ng th\xE1i \u2713) th\xEC v\u1EABn an to\xE0n.",confirmText:"T\u1EA3i l\u1EA1i trang",danger:!0})&&location.reload()}window.confirmReloadForMicPermission=confirmReloadForMicPermission;function stopVoiceNoteRecording(){clearInterval(_voiceNoteRecordTimer),_voiceNoteMediaRecorder?.stop()}window.stopVoiceNoteRecording=stopVoiceNoteRecording;function _onVoiceNoteRecordingDone(t,e,n){const i=_gradingVoiceNotes[t];if(_voiceNoteRecordIdx=-1,!i)return;if(!e||e.size===0){i.status="idle",renderVoiceNotesList(),toast("B\u1EA3n ghi r\u1ED7ng \u2014 vui l\xF2ng th\u1EED ghi \xE2m l\u1EA1i","error");return}const o=String(n||"audio/webm").split(";")[0].trim(),s=extFromAudioMime(o),a=new File([e],`voice-note-${t+1}.${s}`,{type:o});i.file=a,i.name=a.name,i.size=e.size,i.localUrl=URL.createObjectURL(e),i.status="uploading",i.pct=0,renderVoiceNotesList(),_uploadVoiceNoteSlot(t)}function pickAudioRecorderMime(){const t=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"];for(const e of t)try{if(window.MediaRecorder&&MediaRecorder.isTypeSupported(e))return e}catch{}return""}function extFromAudioMime(t){const e=String(t||"").split(";")[0].trim().toLowerCase();return e.includes("webm")?"webm":e.includes("ogg")?"ogg":e.includes("mp4")||e.includes("m4a")||e.includes("aac")?"m4a":e.includes("mpeg")||e.includes("mp3")?"mp3":e.includes("wav")?"wav":e.includes("flac")?"flac":"webm"}const BROWSER_PLAYABLE_AUDIO_EXTS=new Set(["mp3","mpeg","mpga","mp4","m4a","aac","wav","wave","ogg","oga","webm","flac"]);function probeAudioPlayable(t){return new Promise(e=>{const n=URL.createObjectURL(t),i=new Audio;let o=!1;const s=r=>{o||(o=!0,clearTimeout(a),i.removeAttribute("src"),URL.revokeObjectURL(n),e(r))},a=setTimeout(()=>s(!1),8e3);i.preload="metadata",i.onloadedmetadata=()=>s(isFinite(i.duration)&&i.duration>0),i.onerror=()=>s(!1),i.src=n})}async function onVoiceNoteFileSelected(t,e){const n=t.files?.[0];if(!n||!_gradingVoiceNotes[e])return;t.value="";const i=(n.name.split(".").pop()||"").toLowerCase();if(!BROWSER_PLAYABLE_AUDIO_EXTS.has(i)){showFeedbackAudioUnsupported(n.name,i);return}_gradingVoiceNotes[e].status="checking",renderVoiceNotesList();const o=await probeAudioPlayable(n);if(_gradingVoiceNotes[e]){if(!o){_gradingVoiceNotes[e].status="idle",renderVoiceNotesList(),showFeedbackAudioUnsupported(n.name,i,!0);return}_gradingVoiceNotes[e].file=n,_gradingVoiceNotes[e].name=n.name,_gradingVoiceNotes[e].size=n.size,_gradingVoiceNotes[e].localUrl=URL.createObjectURL(n),_gradingVoiceNotes[e].status="uploading",_gradingVoiceNotes[e].pct=0,renderVoiceNotesList(),_uploadVoiceNoteSlot(e)}}window.onVoiceNoteFileSelected=onVoiceNoteFileSelected;function showFeedbackAudioUnsupported(t,e,n=!1){openModal("\u26A0\uFE0F File audio kh\xF4ng ph\xE1t \u0111\u01B0\u1EE3c",`
    <div style="line-height:1.7;color:var(--text)">
      ${n?`<p>File <strong>${escapeHtml(t)}</strong> kh\xF4ng m\u1EDF/ph\xE1t \u0111\u01B0\u1EE3c trong tr\xECnh duy\u1EC7t \u2014 h\u1ECDc sinh s\u1EBD kh\xF4ng nghe \u0111\u01B0\u1EE3c n\u1EBFu v\u1EABn d\xF9ng. File c\xF3 th\u1EC3 b\u1ECB h\u1ECFng, \u0111\u1EB7t sai \u0111u\xF4i, ho\u1EB7c d\xF9ng codec tr\xECnh duy\u1EC7t kh\xF4ng h\u1ED7 tr\u1EE3.</p>`:`<p>File <strong>${escapeHtml(t)}</strong> c\xF3 \u0111\u1ECBnh d\u1EA1ng <strong>.${escapeHtml(e)}</strong> kh\xF4ng ph\xE1t \u0111\u01B0\u1EE3c tr\xEAn tr\xECnh duy\u1EC7t (h\u1ECDc sinh s\u1EBD kh\xF4ng nghe \u0111\u01B0\u1EE3c b\u1EA3n nh\u1EADn x\xE9t).</p>`}
      <p style="margin-top:8px">\u0110\u1ECBnh d\u1EA1ng n\xEAn d\xF9ng: <strong>mp3, m4a, wav, ogg, webm</strong>.</p>
      <p style="margin-top:8px;font-size:13px;color:var(--gray-600)">\u{1F4A1} Ho\u1EB7c b\u1EA5m <strong>\u{1F399}\uFE0F Ghi \xE2m</strong> \u0111\u1EC3 thu tr\u1EF1c ti\u1EBFp \u2014 b\u1EA3n ghi lu\xF4n ph\xE1t \u0111\u01B0\u1EE3c.</p>
    </div>
    <div style="margin-top:20px;text-align:right">
      <button class="btn btn-primary" onclick="closeModal()">\u0110\xE3 hi\u1EC3u</button>
    </div>`)}window.showFeedbackAudioUnsupported=showFeedbackAudioUnsupported;async function _uploadVoiceNoteSlot(t){const e=_gradingVoiceNotes[t];if(e)try{const n=await requestDirectAudioUpload(e.file,"teacher-feedback",{submission_id:_gradingSubmissionId});if(await putDirectAudioXHR(n.upload_url,e.file,n.headers?.["Content-Type"]||e.file.type,(i,o)=>{_gradingVoiceNotes[t]&&(_gradingVoiceNotes[t].pct=i,_gradingVoiceNotes[t].eta=o),renderVoiceNotesList()}),!_gradingVoiceNotes[t])return;_gradingVoiceNotes[t].status="done",_gradingVoiceNotes[t].url=n.public_url,_gradingVoiceNotes[t].key=n.key,renderVoiceNotesList()}catch(n){_gradingVoiceNotes[t]&&(_gradingVoiceNotes[t].status="error"),renderVoiceNotesList(),toast("L\u1ED7i upload b\u1EA3n ghi: "+(n.message||"Unknown error"),"error")}}async function saveGrading(t,e="complete"){const n=document.getElementById("overall-feedback")?.value.trim()||"",i=document.getElementById("grading-score")?.value,o=i!==""&&i!=null?parseFloat(i):null;if(o===null||i===""){toast("Vui l\xF2ng nh\u1EADp Band Score tr\u01B0\u1EDBc khi ho\xE0n th\xE0nh","error"),document.getElementById("grading-score")?.focus();return}if(isNaN(o)||o<0||o>9){toast("\u0110i\u1EC3m Band ph\u1EA3i t\u1EEB 0 \u0111\u1EBFn 9","error");return}if(_gradingVoiceNotes.some(a=>a.status==="recording"||a.status==="uploading"||a.status==="checking")){toast("\u0110ang x\u1EED l\xFD b\u1EA3n ghi \xE2m, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}const s=_gradingVoiceNotes.filter(a=>a.status==="done"&&a.url).map((a,r)=>({url:a.url,key:a.key,name:(a.displayName||"").trim()||`part_${r+1}`}));btnLoading(t);try{await api.patch(`/submissions/${_gradingSubmissionId}`,{teacher_feedback:{annotations:_gradingAnnotations,overall:n,score:o,voice_notes:s},overall_score:o,action:e}),toast(e==="request_rewrite"?"\u0110\xE3 y\xEAu c\u1EA7u h\u1ECDc sinh l\xE0m l\u1EA1i! \u2713":"\u0110\xE3 ho\xE0n th\xE0nh ch\u1EA5m b\xE0i! \u2713"),setTimeout(()=>navigate("/inbox"),800)}catch(a){btnReset(t),toast("L\u1ED7i l\u01B0u: "+(a.error||a.message),"error")}}function toggleAiFeedback(t){const e=document.getElementById("ai-feedback-display"),n=t.querySelector(".ai-toggle-icon"),i=document.getElementById("ai-feedback-btn");if(!e)return;const o=e.style.display!=="none";e.style.display=o?"none":"",i&&(i.style.display=o?"none":""),n&&(n.textContent=o?"\u25BC":"\u25B2")}function refreshAiFeedbackDisplay(){const t=document.getElementById("ai-feedback-display");if(!t)return;if(!_gradingAiFeedback){t.innerHTML=`<div class="ai-feedback-empty">
      Nh\u1EA5n "\u2728 Ph\xE2n t\xEDch AI" \u0111\u1EC3 nh\u1EADn g\u1EE3i \xFD t\u1EEB AI v\u1EC1 t\u1EEB v\u1EF1ng v\xE0 ng\u1EEF ph\xE1p.
    </div>`;return}const e=_gradingAiFeedback,n=getAiCriterionForDisplay(e,"lr"),i=getAiCriterionForDisplay(e,"gra"),o=e.generated_at?`<span class="ai-feedback-time">T\u1EA1o l\xFAc ${formatDateTime(e.generated_at)}</span>`:"";t.innerHTML=`
    <div class="ai-feedback-head">
      <div class="ai-feedback-chips">
        ${aiBandChip("LR",e.lr_score)}
        ${aiBandChip("GRA",e.gra_score)}
      </div>
      ${o}
    </div>
    ${renderAiCriterionCard("\u{1F4DA}","T\u1EEB v\u1EF1ng","LR",e.lr_score,n)}
    ${renderAiCriterionCard("\u{1F4D0}","Ng\u1EEF ph\xE1p","GRA",e.gra_score,i)}`}function aiBandChip(t,e){const n=parseFloat(e);return`<span class="ai-band-chip" style="--chip-color:${n>=7?"#16a34a":n>=5?"#ca8a04":"#dc2626"}">${t} ${e??"\u2014"}</span>`}function getAiCriterionForDisplay(t,e){const n=t?.[e];if(n&&typeof n=="object"&&["band_justification_md","strengths_md","errors_md","tips_md"].some(o=>n[o])){const o={band_justification_md:n.band_justification_md||"",strengths_md:n.strengths_md||"",errors_md:n.errors_md||"",tips_md:n.tips_md||""};return o.band_justification_md&&!o.strengths_md&&!o.errors_md&&!o.tips_md?parseLegacyAiFeedbackText(o.band_justification_md):o}return parseLegacyAiFeedbackText(t?.[`${e}_feedback`]||"")}function parseLegacyAiFeedbackText(t){const e=String(t||"").trim(),n={band_justification_md:"",strengths_md:"",errors_md:"",tips_md:""};if(!e)return n;const i={"band justification":"band_justification_md","l\xFD do band":"band_justification_md",strengths:"strengths_md","\u0111i\u1EC3m m\u1EA1nh":"strengths_md","errors & weaknesses":"errors_md","l\u1ED7i & \u0111i\u1EC3m y\u1EBFu":"errors_md","improvement tips":"tips_md","g\u1EE3i \xFD c\u1EA3i thi\u1EC7n":"tips_md"},o=/(?:\*\*)?(Band justification|Lý do band|Strengths|Điểm mạnh|Errors\s*&\s*weaknesses|Lỗi\s*&\s*điểm yếu|Improvement tips|Gợi ý cải thiện)(?:\*\*)?\s*:/gi,s=[...e.matchAll(o)];if(s.length===0)return{...n,band_justification_md:e};const a={...n};return s.forEach((r,l)=>{const c=i[r[1].toLowerCase().replace(/\s+/g," ")];if(!c)return;const d=r.index+r[0].length,u=l+1<s.length?s[l+1].index:e.length,m=e.slice(d,u).trim();m&&(a[c]=m)}),a}function renderAiCriterionCard(t,e,n,i,o){const s=[["L\xFD do band",o.band_justification_md],["\u0110i\u1EC3m m\u1EA1nh",o.strengths_md],["L\u1ED7i & \u0111i\u1EC3m y\u1EBFu",o.errors_md],["G\u1EE3i \xFD c\u1EA3i thi\u1EC7n",o.tips_md]].filter(([,a])=>String(a||"").trim());return`
    <div class="ai-feedback-card">
      <div class="ai-feedback-card-head">
        <div>
          <div class="ai-feedback-criterion">${t} ${e} (${n})</div>
          <div class="ai-feedback-score">${i??"\u2014"}/9</div>
        </div>
      </div>
      <div class="ai-feedback-sections">
        ${s.map(([a,r])=>`
          <section class="ai-feedback-md-section">
            <div class="ai-feedback-section-label">${escapeHtml(a)}</div>
            <div class="ai-feedback-markdown">${renderSafeMarkdown(r)}</div>
          </section>
        `).join("")}
      </div>
    </div>`}async function requestAiFeedback(t){btnLoading(t);try{_gradingAiFeedback=(await api.post(`/submissions/${_gradingSubmissionId}/ai-feedback`,{},{timeoutMs:15e4})).ai_feedback,refreshAiFeedbackDisplay(),toast("AI \u0111\xE3 ph\xE2n t\xEDch xong! \u2713")}catch(e){toast("L\u1ED7i AI: "+(e.error||e.message),"error")}finally{btnReset(t)}}let _assignClassId=null,_questions=[],_selectedQuestionId=null,_assignSkillFilter="",_assignTagFilter="",_assignSearch="",_assignSortCol="",_assignSortDir="asc";async function openAssignModal(t,e,n=null){_assignClassId=t,_selectedQuestionId=n,_questions=[],_assignSkillFilter="",_assignTagFilter="",_assignSearch="",_assignSortCol="",_assignSortDir="asc",openModal(`Giao b\xE0i cho l\u1EDBp "${e}"`,`
    <div class="form-group">
      <label class="form-label">T\xEAn b\xE0i t\u1EADp <span style="color:var(--danger)">*</span></label>
      <input id="assign-title" class="form-input" placeholder="VD: Reading th\xE1ng 5 - CAM 18 Test 1" />
    </div>
    <div class="form-group">
      <label class="form-label">Ch\u1ECDn \u0111\u1EC1 t\u1EEB kho</label>
      <div class="skill-tabs" id="assign-skill-tabs">
        ${["",...FILTERABLE_ASSIGNMENT_SKILLS].map((o,s)=>`
          <button class="skill-tab ${s===0?"active":""}"
            onclick="filterAssignQuestions('${o}', this)">
            ${s===0?"T\u1EA5t c\u1EA3":SKILL_LABELS[o].icon+" "+SKILL_LABELS[o].label}
          </button>`).join("")}
      </div>
      <input id="assign-search" class="form-input assign-search-input"
        placeholder="\u{1F50D} T\xECm theo t\xEAn \u0111\u1EC1 ho\u1EB7c tag..."
        oninput="filterAssignQuestionSearch(this.value)" />
      <div id="assign-tag-filter-bar" class="tag-filter-bar assign-tag-filter-bar"></div>
      <div id="assign-question-picker" class="question-picker">
        <div style="padding:20px;text-align:center;color:var(--gray-400)">
          <div class="spinner" style="margin:0 auto 8px"></div> \u0110ang t\u1EA3i...
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">H\u1EA1n n\u1ED9p b\xE0i</label>
      <input id="assign-deadline" class="form-input" type="datetime-local" />
      <div class="form-hint">\u0110\u1EC3 tr\u1ED1ng n\u1EBFu kh\xF4ng c\xF3 h\u1EA1n</div>
    </div>
    <div class="form-group">
      <label class="form-label">Ch\u1EBF \u0111\u1ED9 b\xE0i t\u1EADp <span class="form-hint-inline">(ch\u1EC9 \xE1p d\u1EE5ng cho Listening)</span></label>
      <div class="assign-mode-options">
        <label class="assign-mode-option">
          <input type="radio" name="assign-mode" value="exam" checked />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">\u{1F4DD}</span>
            <span>
              <strong>Ki\u1EC3m tra</strong>
              <span class="assign-mode-desc">Audio ph\xE1t 1 l\u1EA7n li\xEAn t\u1EE5c, kh\xF4ng tua/pause</span>
            </span>
          </span>
        </label>
        <label class="assign-mode-option">
          <input type="radio" name="assign-mode" value="practice" />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">\u{1F3A7}</span>
            <span>
              <strong>Luy\u1EC7n t\u1EADp</strong>
              <span class="assign-mode-desc">Cho ph\xE9p tua, pause, nghe l\u1EA1i tho\u1EA3i m\xE1i</span>
            </span>
          </span>
        </label>
      </div>
    </div>
    <div class="form-group" id="assign-time-limit-group">
      <label class="form-label">Th\u1EDDi gian l\xE0m b\xE0i <span class="form-hint-inline">(ch\u1EC9 \xE1p d\u1EE5ng cho Ki\u1EC3m tra)</span></label>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="assign-time-limit" class="form-input" type="number" min="1" max="300" placeholder="Kh\xF4ng gi\u1EDBi h\u1EA1n" style="width:140px" />
        <span style="color:var(--gray-400);font-size:13px">ph\xFAt \u2014 h\u1EBFt gi\u1EDD t\u1EF1 \u0111\u1ED9ng n\u1ED9p b\xE0i</span>
      </div>
    </div>
    <div class="form-group" id="assign-scale-group">
      <label class="form-label">Thang \u0111i\u1EC3m <span class="form-hint-inline">(Reading &amp; Listening)</span></label>
      <div class="assign-mode-options">
        <label class="assign-mode-option">
          <input type="radio" name="assign-scale" value="ielts" checked />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">\u{1F3AF}</span>
            <span>
              <strong>IELTS Test</strong>
              <span class="assign-mode-desc">B\u1EA3ng quy \u0111\u1ED5i IELTS chu\u1EA9n (40 c\xE2u \u2192 band 0\u20139)</span>
            </span>
          </span>
        </label>
        <label class="assign-mode-option">
          <input type="radio" name="assign-scale" value="10" />
          <span class="assign-mode-label">
            <span class="assign-mode-icon">\u{1F4CA}</span>
            <span>
              <strong>Practice Test</strong>
              <span class="assign-mode-desc">Thang \u0111i\u1EC3m 10 (\u0111\xFAng/t\u1ED5ng \xD7 10)</span>
            </span>
          </span>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">H\u1EE7y</button>
      <button class="btn btn-primary" onclick="submitAssign(this)">Giao b\xE0i</button>
    </div>`),document.querySelectorAll('input[name="assign-mode"]').forEach(o=>{o.addEventListener("change",_syncAssignTimeLimitVisibility)}),_syncAssignTimeLimitVisibility();const i=$("#assign-scale-group");i&&(i.style.display="none");try{if(_questions=await api.get("/questions"),renderAssignPicker(""),n){const s=_questions.find(r=>r.id===n)?.skill||"",a=$("#assign-scale-group");a&&(a.style.display=s==="reading"||s==="listening"||s==="composite"?"":"none")}}catch{toast("Kh\xF4ng th\u1EC3 t\u1EA3i kho \u0111\u1EC1","error")}}function renderAssignPicker(t){const e=_assignSearch.trim().toLowerCase(),n=_questions.filter(s=>{if(t&&s.skill!==t||_assignTagFilter&&!(Array.isArray(s.tags)&&s.tags.includes(_assignTagFilter)))return!1;if(!e)return!0;const a=String(s.title||"").toLowerCase(),r=Array.isArray(s.tags)?s.tags.join(" ").toLowerCase():"";return a.includes(e)||r.includes(e)}),i=$("#assign-question-picker");if(!i)return;if(renderAssignTagFilterBar(t),n.length===0){i.innerHTML=`<div style="padding:20px;text-align:center;color:var(--gray-400)">
      Kh\xF4ng c\xF3 \u0111\u1EC1 n\xE0o ph\xF9 h\u1EE3p v\u1EDBi b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i
    </div>`;return}_assignSortCol&&n.sort((s,a)=>{let r,l;if(_assignSortCol==="title")r=s.title.toLowerCase(),l=a.title.toLowerCase();else if(_assignSortCol==="created_at")r=s.created_at||"",l=a.created_at||"";else return 0;return r<l?_assignSortDir==="asc"?-1:1:r>l?_assignSortDir==="asc"?1:-1:0});const o=`<div class="assign-sort-pills">
    <span style="font-size:11px;font-weight:600;color:var(--gray-400)">S\u1EAFp x\u1EBFp:</span>
    ${[["","M\u1EB7c \u0111\u1ECBnh"],["title","A\u2192Z t\xEAn"],["created_at","M\u1EDBi nh\u1EA5t"]].map(([s,a])=>`
      <button type="button" class="stats-filter-pill${_assignSortCol===s?" active":""}"
        onclick="_assignSortCol='${s}'; _assignSortDir='asc'; renderAssignPicker(_assignSkillFilter)">
        ${a}
      </button>`).join("")}
  </div>`;i.innerHTML=o+n.map(s=>`
    <div class="question-picker-item ${_selectedQuestionId===s.id?"selected":""}"
      data-skill="${s.skill}" onclick="selectQuestion('${s.id}', this)">
      <input type="radio" name="assign-q" value="${s.id}"
        ${_selectedQuestionId===s.id?"checked":""} />
      <div>
        ${skillBadge(s.skill)}
        <div style="font-weight:600;margin-top:4px;font-size:13px">${s.title}</div>
        ${Array.isArray(s.tags)&&s.tags.length>0?`
          <div class="assign-question-tags">
            ${s.tags.map(a=>`
              <button type="button"
                class="tag-chip assign-tag-chip ${_assignTagFilter===a?"tag-chip-active":""}"
                onclick="event.stopPropagation(); setAssignTagFilter('${escapeHtml(a)}')">${escapeHtml(a)}</button>
            `).join("")}
          </div>
        `:""}
        <div style="font-size:11px;color:var(--gray-400)">${formatDate(s.created_at)}</div>
      </div>
    </div>`).join("")}function filterAssignQuestions(t,e){_assignSkillFilter=t,document.querySelectorAll("#assign-skill-tabs .skill-tab").forEach(n=>n.classList.remove("active")),e.classList.add("active"),renderAssignPicker(t)}function filterAssignQuestionSearch(t){_assignSearch=t||"",renderAssignPicker(_assignSkillFilter)}function renderAssignTagFilterBar(t){const e=$("#assign-tag-filter-bar");if(!e)return;const n=new Set;_questions.forEach(o=>{t&&o.skill!==t||Array.isArray(o.tags)&&o.tags.forEach(s=>s&&n.add(String(s)))});const i=Array.from(n).sort((o,s)=>o.localeCompare(s));if(i.length===0){e.innerHTML="",e.style.display="none";return}e.style.display="flex",e.innerHTML=`
    <span>L\u1ECDc tag:</span>
    <button type="button"
      class="tag-chip ${_assignTagFilter?"":"tag-chip-active"}"
      onclick="setAssignTagFilter('')">T\u1EA5t c\u1EA3</button>
    ${i.map(o=>`
      <button type="button"
        class="tag-chip ${_assignTagFilter===o?"tag-chip-active":""}"
        onclick="setAssignTagFilter('${escapeHtml(o)}')">${escapeHtml(o)}</button>
    `).join("")}
  `}function setAssignTagFilter(t){_assignTagFilter=t||"",renderAssignPicker(_assignSkillFilter)}function selectQuestion(t,e){_selectedQuestionId=t,document.querySelectorAll(".question-picker-item").forEach(o=>o.classList.remove("selected")),e.classList.add("selected"),e.querySelector("input[type=radio]").checked=!0;const n=e.dataset.skill||"",i=$("#assign-scale-group");i&&(i.style.display=n==="reading"||n==="listening"||n==="composite"?"":"none")}function _syncAssignTimeLimitVisibility(){const t=document.querySelector('input[name="assign-mode"]:checked'),e=!t||t.value!=="practice",n=$("#assign-time-limit-group");n&&(n.style.display=e?"":"none")}async function submitAssign(t,e=!1){const n=$("#assign-title")?.value.trim(),i=$("#assign-deadline")?.value,o=i?new Date(i).toISOString():null,a=document.querySelector('input[name="assign-mode"]:checked')?.value==="practice"?"practice":"exam",r=$("#assign-time-limit")?.value.trim(),l=a==="exam"&&r?Number(r):null,d=document.querySelector('input[name="assign-scale"]:checked')?.value||null;if(!n){toast("Vui l\xF2ng nh\u1EADp t\xEAn b\xE0i t\u1EADp","error");return}if(!_selectedQuestionId){toast("Vui l\xF2ng ch\u1ECDn m\u1ED9t \u0111\u1EC1 t\u1EEB kho","error");return}if(!e&&d==="ielts"){const u=_questions.find(f=>f.id===_selectedQuestionId),m=u?.question_count??0,h=u?.skill??"";if((h==="reading"||h==="listening")&&m!==40){let f=document.getElementById("assign-scale-warn");f||(f=document.createElement("div"),f.id="assign-scale-warn",document.getElementById("modal-body")?.appendChild(f)),f.innerHTML=`
        <div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-top:12px">
          <p style="margin:0 0 6px;font-weight:600;color:#92400e">\u26A0\uFE0F \u0110\u1EC1 ch\u1EC9 c\xF3 ${m} c\xE2u \u2014 thang IELTS chu\u1EA9n d\xF9ng 40 c\xE2u</p>
          <p style="margin:0 0 12px;font-size:.875em;color:#78350f">\u0110i\u1EC3m t\u1EF1 ch\u1EA5m s\u1EBD kh\xF4ng ch\xEDnh x\xE1c. N\xEAn ch\u1ECDn l\u1EA1i <strong>Practice Test (thang 10)</strong>, tr\u1EEB khi \u0111\xE2y l\xE0 \u0111\u1EC1 g\u1ED9p nhi\u1EC1u section \u0111\u1EE7 40 c\xE2u.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('assign-scale-warn')?.remove()">\u0110\u1ED5i thang \u0111i\u1EC3m</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('assign-scale-warn')?.remove(); submitAssign(null, true)">V\u1EABn giao (thang IELTS)</button>
          </div>
        </div>`,f.scrollIntoView({behavior:"smooth",block:"nearest"});return}}t&&btnLoading(t);try{await api.post("/assignments",{class_id:_assignClassId,question_id:_selectedQuestionId,title:n,deadline:o||null,mode:a,time_limit_minutes:l,scoring_scale:d}),closeModal(),toast("Giao b\xE0i th\xE0nh c\xF4ng!")}catch(u){t&&btnReset(t),toast("L\u1ED7i giao b\xE0i: "+(u.error||u.message),"error")}}let _currentSkillFilter="",_allQuestions=[],_allFolders=[],_currentFolderFilter=null,_questionSearch="",_questionTagFilter="",_questionSortCol="",_questionSortDir="asc",_allClasses=[],_classSearch="",_classSort="newest",_classDetailTab="assignments",_cachedCls=null,_cachedStudents=[],_assignTableSortCol="",_assignTableSortDir="desc",_submissionsSortCol="",_submissionsSortDir="desc",_assignListSortCol="",_assignListSortDir="desc",_classStudentsSortCol="",_classStudentsSortDir="asc";async function showQuestions(){_questionSortCol="",_questionSortDir="asc",setLoading("\u0110ang t\u1EA3i kho \u0111\u1EC1...");const t=routeToken();try{const[e,n]=await Promise.all([api.get("/questions"),api.get("/question-folders")]);if(routeChanged(t))return;_allQuestions=e,_allFolders=n,renderQuestions()}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i kho \u0111\u1EC1: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c kho \u0111\u1EC1",e,"/questions")}}function _getFolderSubtreeIds(t){const e=new Set([t]),n=[t];for(;n.length;){const i=n.shift();for(const o of _allFolders)o.parent_id===i&&(e.add(o.id),n.push(o.id))}return e}function _getFilteredQuestions(){let t=_allQuestions;if(_currentFolderFilter==="root")t=t.filter(e=>!e.folder_id);else if(_currentFolderFilter){const e=_getFolderSubtreeIds(_currentFolderFilter);t=t.filter(n=>e.has(n.folder_id))}if(_currentSkillFilter&&(t=t.filter(e=>e.skill===_currentSkillFilter)),_questionSearch){const e=_questionSearch.toLowerCase();t=t.filter(n=>n.title.toLowerCase().includes(e)||Array.isArray(n.tags)&&n.tags.some(i=>i.toLowerCase().includes(e)))}return _questionTagFilter&&(t=t.filter(e=>Array.isArray(e.tags)&&e.tags.includes(_questionTagFilter))),t}function _buildFolderSidebar(){const t=_allQuestions.length,e=_allQuestions.filter(n=>!n.folder_id).length;return`
    <div class="folder-sidebar-header">
      <span class="folder-sidebar-title">Th\u01B0 m\u1EE5c</span>
      <button class="btn-icon folder-add-root" title="Th\xEAm th\u01B0 m\u1EE5c" aria-label="Th\xEAm th\u01B0 m\u1EE5c" onclick="createFolderPrompt(null)">&#xff0b;</button>
    </div>
    <div class="folder-item ${_currentFolderFilter===null?"active":""}" onclick="setFolderFilter(null)" role="button" tabindex="0">
      <span class="folder-icon">\u{1F5C2}</span>
      <span class="folder-name">T\u1EA5t c\u1EA3</span>
      <span class="folder-count">${t}</span>
    </div>
    <div class="folder-item ${_currentFolderFilter==="root"?"active":""}" onclick="setFolderFilter('root')" role="button" tabindex="0">
      <span class="folder-icon">\u{1F4C4}</span>
      <span class="folder-name">Ch\u01B0a ph\xE2n lo\u1EA1i</span>
      <span class="folder-count">${e}</span>
    </div>
    ${_allFolders.filter(n=>!n.parent_id).length>0?'<div class="folder-divider"></div>':""}
    ${_buildFolderTreeItems(null,0)}
  `}function _buildFolderTreeItems(t,e){return _allFolders.filter(n=>n.parent_id===t).sort((n,i)=>n.display_order-i.display_order||n.name.localeCompare(i.name)).map(n=>{const i=_getFolderSubtreeIds(n.id),o=_allQuestions.filter(l=>i.has(l.folder_id)).length,s=_currentFolderFilter===n.id,a=_allFolders.some(l=>l.parent_id===n.id),r=escapeHtml(n.name).replace(/'/g,"&#39;");return`
        <div class="folder-item ${s?"active":""}" style="padding-left:${12+e*14}px"
             onclick="setFolderFilter('${n.id}')" role="button" tabindex="0">
          <span class="folder-icon">${a?"\u{1F4C2}":"\u{1F4C1}"}</span>
          <span class="folder-name">${escapeHtml(n.name)}</span>
          <span class="folder-count">${o}</span>
          <span class="folder-item-actions" onclick="event.stopPropagation()">
            <button class="folder-action-btn" title="Th\xEAm th\u01B0 m\u1EE5c con" aria-label="Th\xEAm th\u01B0 m\u1EE5c con" onclick="createFolderPrompt('${n.id}')">&#xff0b;</button>
            <button class="folder-action-btn" title="\u0110\u1ED5i t\xEAn" aria-label="\u0110\u1ED5i t\xEAn th\u01B0 m\u1EE5c" onclick="renameFolderPrompt('${n.id}','${r}')">&#x270f;</button>
            <button class="folder-action-btn danger" title="Xo\xE1" aria-label="Xo\xE1 th\u01B0 m\u1EE5c" onclick="deleteFolderConfirm('${n.id}','${r}')">&#x1f5d1;</button>
          </span>
        </div>
        ${_buildFolderTreeItems(n.id,e+1)}`}).join("")}function setFolderFilter(t){_currentFolderFilter=t,renderQuestions()}window.setFolderFilter=setFolderFilter;async function createFolderPrompt(t){const e=await promptAction({title:t?"T\u1EA1o th\u01B0 m\u1EE5c con":"T\u1EA1o th\u01B0 m\u1EE5c m\u1EDBi",message:t?"Nh\u1EADp t\xEAn cho th\u01B0 m\u1EE5c con m\u1EDBi.":"Nh\u1EADp t\xEAn cho th\u01B0 m\u1EE5c m\u1EDBi trong kho \u0111\u1EC1.",placeholder:t?"V\xED d\u1EE5: Reading Mock 01":"V\xED d\u1EE5: B\u1ED9 \u0111\u1EC1 th\xE1ng 6",confirmText:"T\u1EA1o th\u01B0 m\u1EE5c",validate:n=>n?"":"Vui l\xF2ng nh\u1EADp t\xEAn th\u01B0 m\u1EE5c."});if(e)try{const n=await api.post("/question-folders",{name:e,parent_id:t});_allFolders.push(n),renderQuestions(),toast('\u0110\xE3 t\u1EA1o th\u01B0 m\u1EE5c "'+n.name+'"')}catch(n){toast("L\u1ED7i: "+(n.error||n.message),"error")}}window.createFolderPrompt=createFolderPrompt;async function renameFolderPrompt(t,e){const n=await promptAction({title:"\u0110\u1ED5i t\xEAn th\u01B0 m\u1EE5c",message:`C\u1EADp nh\u1EADt t\xEAn m\u1EDBi cho th\u01B0 m\u1EE5c <strong>${escapeHtml(e)}</strong>.`,initialValue:e,confirmText:"L\u01B0u t\xEAn m\u1EDBi",validate:i=>i?i===e?"T\xEAn m\u1EDBi \u0111ang tr\xF9ng t\xEAn hi\u1EC7n t\u1EA1i.":"":"Vui l\xF2ng nh\u1EADp t\xEAn th\u01B0 m\u1EE5c."});if(n)try{const i=await api.patch(`/question-folders/${t}`,{name:n}),o=_allFolders.findIndex(s=>s.id===t);o>=0&&(_allFolders[o]=i),renderQuestions()}catch(i){toast("L\u1ED7i: "+(i.error||i.message),"error")}}window.renameFolderPrompt=renameFolderPrompt;async function deleteFolderConfirm(t,e){const n=_allFolders.filter(a=>a.parent_id===t).length,i=_allQuestions.filter(a=>a.folder_id===t).length;let o=`<p style="margin:0">Th\u01B0 m\u1EE5c <strong>${escapeHtml(e)}</strong> s\u1EBD b\u1ECB xo\xE1.</p>`;if((n>0||i>0)&&(o+='<ul style="margin:12px 0 0 18px;line-height:1.7">',n>0&&(o+=`<li>${n} th\u01B0 m\u1EE5c con c\u0169ng s\u1EBD b\u1ECB xo\xE1.</li>`),i>0&&(o+=`<li>${i} \u0111\u1EC1 s\u1EBD \u0111\u01B0\u1EE3c chuy\u1EC3n v\u1EC1 Ch\u01B0a ph\xE2n lo\u1EA1i.</li>`),o+="</ul>"),!!await confirmAction({title:"Xo\xE1 th\u01B0 m\u1EE5c",message:o,confirmText:"Xo\xE1 th\u01B0 m\u1EE5c",danger:!0}))try{await api.delete(`/question-folders/${t}`);const a=_getFolderSubtreeIds(t);_allFolders=_allFolders.filter(r=>!a.has(r.id)),_allQuestions.forEach(r=>{a.has(r.folder_id)&&(r.folder_id=null)}),a.has(_currentFolderFilter)&&(_currentFolderFilter=null),renderQuestions(),toast("\u0110\xE3 xo\xE1 th\u01B0 m\u1EE5c")}catch(a){toast("L\u1ED7i: "+(a.error||a.message),"error")}}window.deleteFolderConfirm=deleteFolderConfirm;function openMoveQuestionModal(t){const e=_allQuestions.find(i=>i.id===t);if(!e)return;const n=(i,o)=>_allFolders.filter(s=>s.parent_id===i).sort((s,a)=>s.display_order-a.display_order||s.name.localeCompare(a.name)).map(s=>`
        <option value="${s.id}" ${e.folder_id===s.id?"selected":""}>
          ${"\u3000".repeat(o)}${escapeHtml(s.name)}
        </option>${n(s.id,o+1)}`).join("");openModal("Di chuy\u1EC3n \u0111\u1EC1 v\xE0o th\u01B0 m\u1EE5c",`
    <div style="margin-bottom:8px;font-size:13px;color:var(--gray-500)">${escapeHtml(e.title)}</div>
    <div class="form-group">
      <label class="form-label">Ch\u1ECDn th\u01B0 m\u1EE5c \u0111\xEDch</label>
      <select id="move-folder-select" class="form-input">
        <option value="" ${e.folder_id?"":"selected"}>\u{1F4C4} Ch\u01B0a ph\xE2n lo\u1EA1i (g\u1ED1c)</option>
        ${n(null,0)}
      </select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-outline" onclick="closeModal()">Hu\u1EF7</button>
      <button class="btn btn-primary" onclick="confirmMoveQuestion('${t}')">Di chuy\u1EC3n</button>
    </div>
  `)}window.openMoveQuestionModal=openMoveQuestionModal;async function confirmMoveQuestion(t){const e=document.getElementById("move-folder-select")?.value||null;try{await api.patch(`/questions/${t}`,{folder_id:e||null});const n=_allQuestions.find(i=>i.id===t);n&&(n.folder_id=e||null),closeModal(),renderQuestions(),toast("\u0110\xE3 di chuy\u1EC3n \u0111\u1EC1")}catch(n){toast("L\u1ED7i: "+(n.error||n.message),"error")}}window.confirmMoveQuestion=confirmMoveQuestion;function _buildQuestionTableRows(t){return t.length===0?`<tr><td colspan="6">
        <div class="empty-state" style="padding:30px">
          <div class="empty-state-icon">\u{1F4DA}</div>
          <h3>Ch\u01B0a c\xF3 \u0111\u1EC1 n\xE0o${_currentSkillFilter||_questionSearch?" ph\xF9 h\u1EE3p":""}</h3>
          <p>Nh\u1EA5n "T\u1EA1o \u0111\u1EC1 m\u1EDBi" \u0111\u1EC3 th\xEAm \u0111\u1EC1 v\xE0o kho.</p>
        </div>
       </td></tr>`:t.map(e=>`
      <tr draggable="true"
        ondragstart="onQuestionDragStart('${e.id}', event, this)"
        ondragend="onQuestionDragEnd(this)"
        title="K\xE9o \u0111\u1EC3 giao b\xE0i cho l\u1EDBp">
        <td>${skillBadge(e.skill)}</td>
        <td>
          <span class="q-title-link" onclick="previewQuestion('${e.id}')" title="Xem nhanh">
            ${escapeHtml(e.title)}
          </span>
        </td>
        <td style="font-size:12px;color:var(--gray-400)">
          ${Array.isArray(e.tags)&&e.tags.length>0?e.tags.map(n=>`<span class="tag-chip tag-chip-sm" onclick="setQuestionTagFilter('${escapeHtml(n)}')" title="L\u1ECDc theo tag n\xE0y">${escapeHtml(n)}</span>`).join(""):"\u2014"}
        </td>
        <td style="font-size:12px;color:var(--gray-400)">
          ${e.skill==="composite"?"\u{1F4CB} T\u1ED5ng h\u1EE3p":e.question_count!=null?e.question_count+" c\xE2u":"\u2014"}
          ${e.content_url?" \xB7 \u{1F50A} Audio":""}
        </td>
        <td style="font-size:12px;color:var(--gray-400)">${formatDate(e.created_at)}</td>
        <td>
          <div class="td-actions">
            <button class="btn-icon" title="Xem / S\u1EEDa" aria-label="Xem v\xE0 s\u1EEDa c\xE2u h\u1ECFi"
              onclick="navigate('/questions/${e.id}')">\u270F\uFE0F</button>
            <button class="btn-icon" title="Di chuy\u1EC3n v\xE0o th\u01B0 m\u1EE5c" aria-label="Di chuy\u1EC3n v\xE0o th\u01B0 m\u1EE5c"
              onclick="openMoveQuestionModal('${e.id}')">\u{1F4C1}</button>
            <button class="btn-icon" title="Sao ch\xE9p \u0111\u1EC1" aria-label="Sao ch\xE9p c\xE2u h\u1ECFi"
              onclick="duplicateQuestion('${e.id}', this)">\u{1F4CB}</button>
            <button class="btn-icon danger" title="Xo\xE1 \u0111\u1EC1" aria-label="Xo\xE1 c\xE2u h\u1ECFi"
              onclick="deleteQuestion('${e.id}', this)">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`).join("")}async function duplicateQuestion(t,e){if(await confirmAction({title:"T\u1EA1o b\u1EA3n sao \u0111\u1EC1",message:"M\u1ED9t b\u1EA3n sao m\u1EDBi s\u1EBD \u0111\u01B0\u1EE3c t\u1EA1o trong kho \u0111\u1EC1 \u0111\u1EC3 b\u1EA1n ch\u1EC9nh s\u1EEDa ri\xEAng.",confirmText:"T\u1EA1o b\u1EA3n sao"})){btnLoading(e);try{const i=await api.post(`/questions/${t}/duplicate`,{});toast('\u0110\xE3 t\u1EA1o b\u1EA3n sao "'+i.title+'"'),await showQuestions()}catch(i){btnReset(e),toast("L\u1ED7i sao ch\xE9p: "+(i.error||i.message),"error")}}}window.duplicateQuestion=duplicateQuestion;let _dragQuestionId=null,_dragQuestionTitle="",_dragAutoScrollRaf=null,_dragAutoScrollDir=0;function onQuestionDragStart(t,e,n){_dragQuestionId=t,_dragQuestionTitle=_allQuestions.find(i=>i.id===t)?.title||n.querySelector(".q-title-link")?.textContent?.trim()||"\u0110\u1EC1 ch\u01B0a \u0111\u1EB7t t\xEAn",e.dataTransfer.effectAllowed="copy",e.dataTransfer.setData("text/plain",t),n.classList.add("dragging"),showDragAssignPanel()}function onQuestionDragEnd(t){t.classList.remove("dragging"),hideDragAssignPanel(),_dragQuestionId=null,_dragQuestionTitle=""}async function showDragAssignPanel(){hideDragAssignPanel();let t=_allClasses;if(!t.length)try{t=await api.get("/classes"),_allClasses=t}catch{return}if(!t.length)return;const e=document.createElement("div");e.id="drag-assign-panel",e.className="drag-assign-panel",e.innerHTML=`
    <div class="drag-assign-header">
      <div>
        <div class="drag-assign-label">\u{1F3AF} K\xE9o th\u1EA3 \u0111\u1EC3 giao b\xE0i nhanh</div>
        <div class="drag-assign-title">${escapeHtml(_dragQuestionTitle)}</div>
        <div class="drag-assign-hint">Th\u1EA3 v\xE0o l\u1EDBp \u0111\u1EC3 giao b\xE0i, ho\u1EB7c nh\u1EA5n Esc \u0111\u1EC3 hu\u1EF7.</div>
      </div>
      <div class="drag-assign-status">\u0110ang k\xE9o 1 \u0111\u1EC1</div>
    </div>
    <div id="drag-assign-scroll" class="drag-assign-scroll"
      ondragover="onDragAssignListOver(event)"
      ondragleave="onDragAssignListLeave(event)">
      <div class="drag-assign-classes">
        ${t.map(n=>`
          <div class="drag-class-target"
            ondragover="onDragOverClass(event, this)"
            ondragleave="onDragLeaveClass(event, this)"
            ondrop="onDropToClass('${n.id}', '${escapeHtml(n.class_name).replace(/'/g,"\\'")}', event)">
            <div class="drag-class-target-icon">\u{1F3EB}</div>
            <div class="drag-class-target-body">
              <div class="drag-class-target-title">${escapeHtml(n.class_name)}</div>
              <div class="drag-class-target-meta">${n.student_count||0} h\u1ECDc sinh</div>
              <div class="drag-class-target-drop-label">Th\u1EA3 \u0111\u1EC3 giao v\xE0o l\u1EDBp n\xE0y</div>
            </div>
          </div>`).join("")}
      </div>
    </div>
    <div class="drag-assign-footer">
      <div class="drag-assign-cancel">K\xE9o g\u1EA7n m\xE9p tr\xEAn/d\u01B0\u1EDBi \u0111\u1EC3 cu\u1ED9n danh s\xE1ch l\u1EDBp khi c\xF3 nhi\u1EC1u l\u1EDBp.</div>
      <div class="drag-cancel-target"
        ondragover="onDragOverCancel(event, this)"
        ondragleave="onDragLeaveCancel(event, this)"
        ondrop="onDropCancelDrag(event)">
        <div class="drag-cancel-target-icon">\u2715</div>
        <div>
          <div class="drag-cancel-target-title">Th\u1EA3 v\xE0o \u0111\xE2y \u0111\u1EC3 hu\u1EF7</div>
          <div class="drag-cancel-target-meta">Ho\u1EB7c nh\u1EA3 ra ngo\xE0i v\xF9ng drop</div>
        </div>
      </div>
    </div>`,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add("drag-assign-panel--visible"))}function hideDragAssignPanel(){_setDragAssignState(""),_setDragAssignAutoScroll(0);const t=document.getElementById("drag-assign-panel");t&&(t.classList.remove("drag-assign-panel--visible"),setTimeout(()=>t.remove(),220))}function cancelDragAssign(){hideDragAssignPanel(),document.querySelectorAll("tr.dragging").forEach(t=>t.classList.remove("dragging")),_dragQuestionId=null,_dragQuestionTitle=""}function _setDragAssignState(t,e=null){const n=document.getElementById("drag-assign-panel");n&&(n.dataset.dropMode=t||"",document.querySelectorAll(".drag-class-target.drag-over, .drag-cancel-target.drag-over").forEach(i=>i.classList.remove("drag-over")),e&&e.classList.add("drag-over"))}function _setDragAssignAutoScroll(t){if(_dragAutoScrollDir=t,!t){_dragAutoScrollRaf&&cancelAnimationFrame(_dragAutoScrollRaf),_dragAutoScrollRaf=null;return}if(_dragAutoScrollRaf)return;const e=()=>{const n=document.getElementById("drag-assign-scroll");if(!n||!_dragAutoScrollDir){_dragAutoScrollRaf=null;return}n.scrollTop+=_dragAutoScrollDir*14,_dragAutoScrollRaf=requestAnimationFrame(e)};_dragAutoScrollRaf=requestAnimationFrame(e)}function onDragAssignListOver(t){const e=document.getElementById("drag-assign-scroll");if(!e)return;const n=e.getBoundingClientRect(),i=64;let o=0;t.clientY<n.top+i?o=-1:t.clientY>n.bottom-i&&(o=1),_setDragAssignAutoScroll(o)}function onDragAssignListLeave(){_setDragAssignAutoScroll(0)}function onDragOverClass(t,e){t.preventDefault(),t.dataTransfer.dropEffect="copy",_setDragAssignState("class",e),onDragAssignListOver(t)}function onDragLeaveClass(t,e){e.contains(t.relatedTarget)||(e.classList.remove("drag-over"),_setDragAssignState(""))}function onDragOverCancel(t,e){t.preventDefault(),t.dataTransfer.dropEffect="move",_setDragAssignState("cancel",e),_setDragAssignAutoScroll(0)}function onDragLeaveCancel(t,e){e.contains(t.relatedTarget)||(e.classList.remove("drag-over"),_setDragAssignState(""))}function onDropToClass(t,e,n){n.preventDefault();const i=_dragQuestionId||n.dataTransfer.getData("text/plain");_dragQuestionId=null,_dragQuestionTitle="",hideDragAssignPanel(),document.querySelectorAll("tr.dragging").forEach(o=>o.classList.remove("dragging")),i&&openAssignModal(t,e,i)}function onDropCancelDrag(t){t.preventDefault(),cancelDragAssign()}window.onQuestionDragStart=onQuestionDragStart,window.onQuestionDragEnd=onQuestionDragEnd,window.onDropToClass=onDropToClass,window.onDragAssignListOver=onDragAssignListOver,window.onDragAssignListLeave=onDragAssignListLeave,window.onDragOverClass=onDragOverClass,window.onDragLeaveClass=onDragLeaveClass,window.onDragOverCancel=onDragOverCancel,window.onDragLeaveCancel=onDragLeaveCancel,window.onDropCancelDrag=onDropCancelDrag;async function previewAsStudent(t){const e=_allQuestions.find(l=>l.id==t);if(!e)return;const i=(!Array.isArray(e.content_blocks)&&!e.content_text?await api.get(`/questions/${t}`).catch(()=>e):e)||e,o=i.skill,s=Array.isArray(i.questions_data)?i.questions_data:[];let a;if(o==="reading"||o==="listening"){let l="";for(let c=1;c<=s.length;c++)l+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:30px;font-weight:600;color:var(--gray-400)">Q${c}</span><input class="form-input" placeholder="\u0110\xE1p \xE1n c\xE2u ${c}" style="flex:1" /></div>`;a=`
      <div class="preview-as-student">
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">\u26A0\uFE0F \u0110\xE2y l\xE0 ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc \u2014 kh\xF4ng l\u01B0u \u0111\xE1p \xE1n</div>
        <div style="display:grid;grid-template-columns:1fr 320px;gap:14px">
          <div>
            ${i.content_url?`<audio controls src="${i.content_url}" style="width:100%;margin-bottom:10px"></audio>`:""}
            <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;max-height:400px;overflow-y:auto">${renderRichQuestionContentHTML(i.content_blocks,i.content_text||"")}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:8px">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
            ${l||'<div style="color:var(--gray-400)">Kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>'}
          </div>
        </div>
      </div>`}else o==="writing"?a=`
      <div>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">\u26A0\uFE0F \u0110\xE2y l\xE0 ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">\u0110\u1EC1 b\xE0i</div>
        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;margin-bottom:14px">${renderRichQuestionContentHTML(i.content_blocks,i.content_text||"")}</div>
        <textarea class="form-input" placeholder="H\u1ECDc sinh s\u1EBD vi\u1EBFt b\xE0i \u1EDF \u0111\xE2y..." style="width:100%;min-height:200px;padding:12px"></textarea>
      </div>`:o==="speaking"&&(a=`
      <div>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">\u26A0\uFE0F \u0110\xE2y l\xE0 ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">Cue Card</div>
        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;margin-bottom:14px">${renderRichQuestionContentHTML(i.content_blocks,i.content_text||"")}</div>
        <div style="text-align:center;padding:24px;border:2px dashed var(--gray-300, var(--gray-200));border-radius:8px;color:var(--gray-400)">\u{1F399}\uFE0F H\u1ECDc sinh s\u1EBD thu \xE2m \u1EDF \u0111\xE2y</div>
      </div>`);const r=`Xem tr\u01B0\u1EDBc: ${i.title}`;openModal(r,a+`
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
      <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${t}')">Ch\u1EC9nh s\u1EEDa \u0111\u1EC1</button>
    </div>`)}window.previewAsStudent=previewAsStudent;function renderQuestions(){let t=_getFilteredQuestions();_questionSortCol&&(t=[...t].sort((i,o)=>{let s,a;if(_questionSortCol==="skill")s=i.skill||"",a=o.skill||"";else if(_questionSortCol==="title")s=i.title.toLowerCase(),a=o.title.toLowerCase();else if(_questionSortCol==="created_at")s=i.created_at||"",a=o.created_at||"";else return 0;return s<a?_questionSortDir==="asc"?-1:1:s>a?_questionSortDir==="asc"?1:-1:0}));const e=$("#app")?.querySelector(".question-bank-layout");if(e){e.querySelector(".folder-sidebar").innerHTML=_buildFolderSidebar(),e.querySelector("table tbody").innerHTML=_buildQuestionTableRows(t);const i=e.querySelector(".page-subtitle");i&&(i.textContent=`T\u1ED5ng c\u1ED9ng ${_allQuestions.length} \u0111\u1EC1 thi`),["skill","title","created_at"].forEach(s=>{const a=document.querySelector(`th[data-q-col="${s}"]`);if(!a)return;const r=a.querySelector(".sort-icon");r&&r.remove(),a.insertAdjacentHTML("beforeend",makeSortIcon(s,_questionSortCol,_questionSortDir))}),document.querySelectorAll(".skill-tab").forEach(s=>{s.classList.toggle("active",s.textContent.trim().includes(_currentSkillFilter?{reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking",composite:"T\u1ED5ng h\u1EE3p"}[_currentSkillFilter]:"T\u1EA5t c\u1EA3"))});const o=e.querySelector(".list-toolbar");if(o){let s=o.querySelector(".tag-filter-bar");_questionTagFilter&&!s&&(s=document.createElement("div"),s.className="tag-filter-bar",o.appendChild(s)),s&&(s.innerHTML=_questionTagFilter?`L\u1ECDc tag: <span class="tag-chip tag-chip-active">${escapeHtml(_questionTagFilter)}<button class="tag-chip-remove" onclick="setQuestionTagFilter('')" aria-label="Xo\xE1 b\u1ED9 l\u1ECDc tag">\xD7</button></span>`:"",_questionTagFilter||s.remove())}return}$("#app").innerHTML=`
    <div class="page-header">
      <div>
        <div class="page-title">Kho \u0111\u1EC1</div>
        <div class="page-subtitle">T\u1ED5ng c\u1ED9ng ${_allQuestions.length} \u0111\u1EC1 thi</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('/questions/new')">+ T\u1EA1o \u0111\u1EC1 m\u1EDBi</button>
    </div>

    <div class="question-bank-layout">
      <div class="folder-sidebar">${_buildFolderSidebar()}</div>

      <div class="question-main">
        <div class="list-toolbar">
          <input id="question-search-input" class="form-input search-input"
            placeholder="\u{1F50D} T\xECm theo t\xEAn \u0111\u1EC1 ho\u1EB7c tag..."
            value="${escapeHtml(_questionSearch)}" />
          ${_questionTagFilter?`<div class="tag-filter-bar">L\u1ECDc tag: <span class="tag-chip tag-chip-active">${escapeHtml(_questionTagFilter)}<button class="tag-chip-remove" onclick="setQuestionTagFilter('')" aria-label="Xo\xE1 b\u1ED9 l\u1ECDc tag">\xD7</button></span></div>`:""}
        </div>

        <div class="skill-tabs">
          ${[["","T\u1EA5t c\u1EA3"],["reading","\u{1F4D6} Reading"],["listening","\u{1F3A7} Listening"],["writing","\u270D\uFE0F Writing"],["speaking","\u{1F3A4} Speaking"],["composite","\u{1F4CB} T\u1ED5ng h\u1EE3p"]].map(([i,o])=>`
            <button class="skill-tab ${_currentSkillFilter===i?"active":""}"
              onclick="setSkillFilter('${i}')">${o}</button>`).join("")}
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th ${SORTABLE_TH_ATTRS} data-q-col="skill" onclick="sortQuestions('skill')">K\u1EF9 n\u0103ng ${makeSortIcon("skill",_questionSortCol,_questionSortDir)}</th>
                <th ${SORTABLE_TH_ATTRS} data-q-col="title" onclick="sortQuestions('title')">Ti\xEAu \u0111\u1EC1 <span style="font-size:11px;font-weight:400;color:var(--text-muted)">(click \u0111\u1EC3 xem nhanh)</span> ${makeSortIcon("title",_questionSortCol,_questionSortDir)}</th>
                <th>Tags</th>
                <th>Chi ti\u1EBFt</th>
                <th ${SORTABLE_TH_ATTRS} data-q-col="created_at" onclick="sortQuestions('created_at')">Ng\xE0y t\u1EA1o ${makeSortIcon("created_at",_questionSortCol,_questionSortDir)}</th>
                <th>Thao t\xE1c</th>
              </tr>
            </thead>
            <tbody>${_buildQuestionTableRows(t)}</tbody>
          </table>
        </div>
      </div>
    </div>`;const n=document.getElementById("question-search-input");n&&(n.addEventListener("input",()=>{_questionSearch=n.value,renderQuestions()}),_questionSearch&&n.focus())}function setQuestionTagFilter(t){_questionTagFilter=t,renderQuestions()}window.setQuestionTagFilter=setQuestionTagFilter;function sortQuestions(t){_questionSortCol===t?_questionSortDir=_questionSortDir==="asc"?"desc":"asc":(_questionSortCol=t,_questionSortDir="asc"),renderQuestions()}window.sortQuestions=sortQuestions;async function previewQuestion(t){const e=_allQuestions.find(l=>l.id==t);if(!e)return;const n=l=>{const c=Array.isArray(l.sections)?l.sections:[],d=c.map(u=>{const m=Array.isArray(u.questions_data)?u.questions_data.length:0;return`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-card)">
        <span>${_cqSkillIcon(u.skill)}</span>
        <span style="font-weight:600;font-size:13px">${escapeHtml(u.label||_cqSkillLabel(u.skill))}</span>
        <span style="color:var(--gray-400);font-size:12px">${_cqSkillLabel(u.skill)}${m?` \xB7 ${m} c\xE2u`:""}${u.time_limit_minutes?` \xB7 \u23F1${u.time_limit_minutes}ph`:""}</span>
      </div>`}).join("");return`
      <div style="margin-bottom:12px">${skillBadge(l.skill)}</div>
      <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
        <span class="stat-chip">\u{1F4CB} ${c.length} ph\u1EA7n thi</span>
        <span class="stat-chip">\u{1F4C5} T\u1EA1o ${formatDate(l.created_at)}</span>
      </div>
      ${c.length?`
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:8px">C\xE1c ph\u1EA7n thi</div>
      ${d}`:'<div style="color:var(--gray-400);font-size:13px">Ch\u01B0a c\xF3 ph\u1EA7n thi n\xE0o.</div>'}
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
        <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${t}')">Ch\u1EC9nh s\u1EEDa</button>
      </div>`},i=Array.isArray(e.questions_data)?e.questions_data:[],o=(l,c,d)=>`
    <div style="margin-bottom:12px">${skillBadge(l.skill)}</div>
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <span class="stat-chip">\u{1F4CB} ${i.length} c\xE2u h\u1ECFi</span>
      <span class="stat-chip">\u{1F4C5} T\u1EA1o ${formatDate(l.created_at)}</span>
      ${l.content_url?'<span class="stat-chip">\u{1F50A} C\xF3 audio</span>':""}
    </div>
    ${l.content_text||Array.isArray(l.content_blocks)&&l.content_blocks.length?`
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">\u{1F4C4} N\u1ED9i dung \u0111\u1EC1 b\xE0i</div>
      <div style="max-height:220px;overflow-y:auto;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.7;color:var(--gray-800)">${renderRichQuestionContentHTML(l.content_blocks,l.content_text||"")}</div>
    </div>`:""}
    ${c?`
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">\u{1F4DD} \u0110\xE1p \xE1n</div>
    <div class="preview-q-list">${c}${d?`<p style="color:var(--gray-400);font-size:12px;margin-top:8px">...v\xE0 ${i.length-20} c\xE2u n\u1EEFa</p>`:""}</div>`:""}
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
      <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${t}')">Ch\u1EC9nh s\u1EEDa</button>
    </div>`,s=l=>{const c=Array.isArray(l.questions_data)?l.questions_data:[];return c.length===0?{qRows:"",hasMore:!1}:{qRows:c.slice(0,20).map(u=>`
      <div class="preview-q-row">
        <span class="preview-q-num">Q${u.q_no??u.question_number??"?"}</span>
        <div class="preview-q-main">
          <div class="preview-q-ans-label">\u0110\xE1p \xE1n</div>
          <div class="preview-q-ans">${Array.isArray(u.answers)&&u.answers.length?u.answers.map(m=>`<span class="preview-answer-chip">${escapeHtml(m)}</span>`).join(""):Array.isArray(u.correct_answers)&&u.correct_answers.length?u.correct_answers.map(m=>`<span class="preview-answer-chip">${escapeHtml(m)}</span>`).join(""):'<span class="preview-answer-empty">Ch\u01B0a c\xF3 \u0111\xE1p \xE1n</span>'}</div>
        </div>
        <div class="preview-q-meta">
          ${u.location?`<span class="preview-q-loc"  title="${escapeHtml(u.location)}">\u{1F4CD}</span>`:""}
          ${u.explanation?`<span class="preview-q-expl" title="${escapeHtml(u.explanation)}">\u{1F4A1}</span>`:""}
        </div>
      </div>`).join(""),hasMore:c.length>20}};if(e.skill==="composite"){openModal(escapeHtml(e.title),'<div style="color:var(--gray-400)">\u0110ang t\u1EA3i...</div>');try{const l=await api.get(`/questions/${t}`);Object.assign(e,l);const c=document.getElementById("modal-body");c&&(c.innerHTML=n(l))}catch{}return}const{qRows:a,hasMore:r}=s(e);if(openModal(escapeHtml(e.title),o(e,a,r)),!e.content_text&&(e.skill==="reading"||e.skill==="listening"||e.skill==="writing"||e.skill==="speaking"))try{const l=await api.get(`/questions/${t}`);Object.assign(e,l);const c=document.getElementById("modal-body");if(c){const{qRows:d,hasMore:u}=s(l);c.innerHTML=o(l,d,u)}}catch{}}window.previewQuestion=previewQuestion;function setSkillFilter(t){_currentSkillFilter=t,renderQuestions()}async function deleteQuestion(t,e){if(await confirmAction({title:"Xo\xE1 \u0111\u1EC1 kh\u1ECFi kho",message:"N\u1EBFu \u0111\u1EC1 \u0111ang \u0111\u01B0\u1EE3c d\xF9ng trong b\xE0i t\u1EADp, h\u1EC7 th\u1ED1ng s\u1EBD ch\u1EB7n thao t\xE1c n\xE0y.",confirmText:"Xo\xE1 \u0111\u1EC1",danger:!0})){btnLoading(e);try{await api.delete(`/questions/${t}`),toast("\u0110\xE3 xo\xE1 \u0111\u1EC1"),showQuestions()}catch(i){btnReset(e),toast("L\u1ED7i xo\xE1: "+(i.error||i.message),"error")}}}let _contentBlocks=[],_contentBlockSeq=1,_contentImageUploadCount=0,_composerSavedRange=null,_composerCollapsed=!1,_keepFormatOnNextPaste=!1;function nextContentBlockId(){return`cb-${_contentBlockSeq++}`}function createTextBlock(t=""){return{id:nextContentBlockId(),type:"text",html:t}}function createImageBlock(t="",e="",n=100){return{id:nextContentBlockId(),type:"image",url:t,alt:e,width:n}}function repairImageTokensInBlocks(t){const e=[];for(const o of t){let r=function(){const c=a.innerHTML.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi,"").trim();c&&e.push({id:nextContentBlockId(),type:"text",html:c}),a=document.createElement("div")},l=function(c){c.nodeType===Node.ELEMENT_NODE&&c.classList?.contains("document-editor-image-token")?(r(),e.push({id:c.dataset.blockId||nextContentBlockId(),type:"image",url:c.dataset.url||"",alt:c.dataset.alt||"",width:Math.max(1,Number(c.dataset.width)||100)})):c.nodeType===Node.ELEMENT_NODE&&c.querySelector?.(".document-editor-image-token")?c.childNodes.forEach(d=>l(d)):a.appendChild(c.cloneNode(!0))};var n=r,i=l;if(o.type!=="text"||!o.html?.includes("document-editor-image-token")){e.push(o);continue}const s=document.createElement("div");s.innerHTML=o.html;let a=document.createElement("div");s.childNodes.forEach(c=>l(c)),r()}return e}function normalizeContentBlocksForEditor(t,e=""){const i=repairImageTokensInBlocks(Array.isArray(t)?t:[]).map(o=>{if(o?.type==="image"&&o?.url)return{id:o.id||nextContentBlockId(),type:"image",url:o.url,alt:o.alt||"",width:Number(o.width)||100};const s=normalizeIndentMarkupHtml(o?.html??(o?.text?textToEditorHtml(o.text):"")),a=(()=>{const r=document.createElement("div");return r.innerHTML=s,r.textContent||""})();return{id:o?.id||nextContentBlockId(),type:"text",html:s,text:a}}).filter(Boolean);return i.length>0?i:[createTextBlock(escapeHtml(e||""))]}function blocksToPlainText(t=_contentBlocks){return(t||[]).filter(e=>e.type==="text").map(e=>{if(e.html){const n=document.createElement("div");return n.innerHTML=e.html,(n.textContent||"").trim()}return String(e.text||"").trim()}).filter(Boolean).join(`

`).trim()}function renderRichQuestionContentHTML(t,e="",n=""){const i=normalizeContentBlocksForEditor(t,e);return(!Array.isArray(t)||t.length===0)&&e?`<div class="mixed-content ${n}"><div class="mixed-content-text">${escapeHtml(e)}</div></div>`:`
    <div class="mixed-content ${n}">
      ${i.map(o=>o.type==="image"?`<figure class="mixed-content-image-wrap" data-block-id="${escapeHtml(o.id)}" style="width:${Math.max(1,Number(o.width)||100)}%"><img class="mixed-content-image" src="${escapeHtml(o.url)}" alt="${escapeHtml(o.alt||"Question image")}" /></figure>`:`<div class="mixed-content-text" data-block-id="${escapeHtml(o.id)}">${sanitizeBlockHtml(o.html??"")||escapeHtml(o.text||"")}</div>`).join("")}
    </div>`}function contentComposerHtml(t,e=""){return`
    <div class="form-group">
      <label class="form-label">${t}</label>
      ${e?`<div class="form-hint" style="margin-bottom:8px">${e}</div>`:""}
      <div class="content-composer-shell">
        <div class="content-composer-toolbar">
          <button type="button" class="btn btn-outline btn-sm" onclick="openImagePicker()">+ Ch\xE8n \u1EA3nh</button>
          <button type="button" class="btn btn-outline btn-sm" id="content-composer-toggle" onclick="toggleComposerEditor()">Thu g\u1ECDn editor</button>
          <span class="content-composer-toolbar-note">So\u1EA1n nh\u01B0 m\u1ED9t t\xE0i li\u1EC7u duy nh\u1EA5t. C\xF3 th\u1EC3 paste text b\xECnh th\u01B0\u1EDDng v\xE0 d\xE1n \u1EA3nh t\u1EEB clipboard v\xE0o \u0111\xFAng v\u1ECB tr\xED con tr\u1ECF.</span>
        </div>
        <div class="content-composer-format-bar">
          <button type="button" class="fmt-btn" id="fmt-bold" onmousedown="event.preventDefault()" onclick="applyFormat('bold')" title="In \u0111\u1EADm (Ctrl+B)"><b>B</b></button>
          <button type="button" class="fmt-btn" id="fmt-italic" onmousedown="event.preventDefault()" onclick="applyFormat('italic')" title="In nghi\xEAng (Ctrl+I)"><i>I</i></button>
          <button type="button" class="fmt-btn" id="fmt-underline" onmousedown="event.preventDefault()" onclick="applyFormat('underline')" title="G\u1EA1ch ch\xE2n (Ctrl+U)"><u>U</u></button>
          <div class="fmt-sep"></div>
          <button type="button" class="fmt-btn" id="fmt-align-left"    onmousedown="event.preventDefault()" onclick="applyFormat('justifyLeft')"   title="C\u0103n tr\xE1i"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="9"  y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <button type="button" class="fmt-btn" id="fmt-align-center"  onmousedown="event.preventDefault()" onclick="applyFormat('justifyCenter')" title="C\u0103n gi\u1EEFa"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="12" x2="11" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <button type="button" class="fmt-btn" id="fmt-align-right"   onmousedown="event.preventDefault()" onclick="applyFormat('justifyRight')"  title="C\u0103n ph\u1EA3i"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="6" x2="13" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <button type="button" class="fmt-btn" id="fmt-align-justify" onmousedown="event.preventDefault()" onclick="applyJustify()"   title="C\u0103n \u0111\u1EC1u"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="13" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <div class="fmt-sep"></div>
          <button type="button" class="fmt-btn" id="fmt-list-ul" onmousedown="event.preventDefault()" onclick="applyFormat('insertUnorderedList')" title="Danh s\xE1ch g\u1EA1ch \u0111\u1EA7u d\xF2ng"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2" cy="3" r="1.3" fill="currentColor"/><line x1="5.5" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="2" cy="7" r="1.3" fill="currentColor"/><line x1="5.5" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="2" cy="11" r="1.3" fill="currentColor"/><line x1="5.5" y1="11" x2="13" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <button type="button" class="fmt-btn" id="fmt-list-ol" onmousedown="event.preventDefault()" onclick="applyFormat('insertOrderedList')" title="Danh s\xE1ch \u0111\xE1nh s\u1ED1"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><text x="0" y="4.3" font-size="4" fill="currentColor">1.</text><line x1="5.5" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><text x="0" y="8.3" font-size="4" fill="currentColor">2.</text><line x1="5.5" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><text x="0" y="12.3" font-size="4" fill="currentColor">3.</text><line x1="5.5" y1="11" x2="13" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
          <div class="fmt-sep"></div>
          <select class="fmt-select" id="fmt-fontfamily" onfocus="saveComposerRange()" onchange="applyFormatFontFamily(this.value)" title="Ph\xF4ng ch\u1EEF">
            <option value="">Ph\xF4ng ch\u1EEF</option>
            <option value="Arial, Helvetica, sans-serif">Arial</option>
            <option value="'Times New Roman', Times, serif">Times New Roman</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="Tahoma, sans-serif">Tahoma</option>
            <option value="'Courier New', Courier, monospace">Courier New</option>
          </select>
          <select class="fmt-select" id="fmt-fontsize" onfocus="saveComposerRange()" onchange="applyFormatFontSize(this.value)" title="C\u1EE1 ch\u1EEF">
            <option value="">C\u1EE1 ch\u1EEF (13)</option>
            <option value="11">11</option>
            <option value="12">12</option>
            <option value="13">13</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
          </select>
          <div class="fmt-sep"></div>
          <button type="button" class="fmt-btn" id="paste-keepformat-toggle" onmousedown="event.preventDefault()" onclick="togglePasteKeepFormat()" title="M\u1EB7c \u0111\u1ECBnh d\xE1n (Ctrl+V) lu\xF4n l\xE0 v\u0103n b\u1EA3n thu\u1EA7n. B\u1EADt n\xFAt n\xE0y \u0111\u1EC3 l\u1EA7n d\xE1n ti\u1EBFp theo gi\u1EEF nguy\xEAn \u0111\u1ECBnh d\u1EA1ng/m\xE0u/b\u1EA3ng t\u1EEB ngu\u1ED3n d\xE1n."><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="11" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="4.5" y="0.3" width="5" height="2.4" rx="0.5" fill="currentColor"/><text x="3.6" y="10" font-size="6.5" font-family="serif" font-weight="700" fill="currentColor">A</text></svg></button>
          <button type="button" class="fmt-btn" id="fmt-clear-format" onmousedown="event.preventDefault()" onclick="clearFormatSelection()" title="Xo\xE1 \u0111\u1ECBnh d\u1EA1ng v\xF9ng \u0111\xE3 ch\u1ECDn (v\u1EC1 l\u1EA1i v\u0103n b\u1EA3n thu\u1EA7n)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><text x="0" y="10.5" font-size="9" font-family="serif" fill="currentColor">T</text><line x1="1" y1="12.5" x2="13" y2="1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
          <div class="fmt-sep"></div>
          <div style="position:relative">
            <button type="button" class="fmt-color-wrap" id="fmt-color-btn" title="M\xE0u ch\u1EEF" onmousedown="saveComposerRange();event.preventDefault()" onclick="toggleColorPalette()">
              <span class="fmt-color-label" id="fmt-color-label">A</span>
            </button>
            <div id="fmt-color-palette" class="fmt-color-palette" style="display:none" onmousedown="event.preventDefault()">
              <div class="fmt-palette-swatches">
                ${["#000000","#434343","#666666","#999999","#ffffff","#ff0000","#e91e63","#9c27b0","#3f51b5","#2196f3","#03a9f4","#009688","#4caf50","#8bc34a","#ffeb3b","#ff9800","#ff5722","#795548","#607d8b","#1a237e"].map(n=>`<button type="button" class="fmt-swatch" style="background:${n}" title="${n}" onmousedown="event.preventDefault()" onclick="applyFormatColor('${n}');closeColorPalette()"></button>`).join("")}
              </div>
              <div class="fmt-palette-custom">
                <input type="color" id="fmt-color-input" value="#1a1a1a" class="fmt-color-input-custom">
                <button type="button" class="fmt-palette-apply" onclick="applyFormatColor(document.getElementById('fmt-color-input').value);closeColorPalette()">\xC1p d\u1EE5ng</button>
              </div>
            </div>
          </div>
          <div class="fmt-sep"></div>
          <div style="position:relative">
            <button type="button" class="fmt-btn fmt-table-btn" id="fmt-table-btn" title="Ch\xE8n b\u1EA3ng" onmousedown="saveComposerRange();event.preventDefault()" onclick="toggleTablePicker()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>
            </button>
            <div id="fmt-table-picker" class="fmt-table-picker" style="display:none" onmousedown="event.preventDefault()">
              <div class="fmt-table-grid" id="fmt-table-grid"></div>
              <div class="fmt-table-size-label" id="fmt-table-size-label">Ch\u1ECDn k\xEDch th\u01B0\u1EDBc b\u1EA3ng</div>
            </div>
          </div>
        </div>
        <input id="content-image-file-input" type="file" accept="image/*" style="display:none" />
        <div id="content-composer-editor-panel">
          <div id="content-composer-status" class="content-composer-status">So\u1EA1n n\u1ED9i dung trong m\u1ED9t khung duy nh\u1EA5t. \u1EA2nh s\u1EBD \u0111\u01B0\u1EE3c ch\xE8n inline v\xE0 khi l\u01B0u s\u1EBD t\u1EF1 parse th\xE0nh text/image blocks.</div>
          <div class="content-document-surface">
            <div id="content-composer-host" class="content-composer-host"
              contenteditable="true" spellcheck="false"
              data-placeholder="Nh\u1EADp n\u1ED9i dung \u1EDF \u0111\xE2y..."></div>
          </div>
        </div>
        <div class="content-composer-preview">
          <div class="content-composer-preview-title">Xem tr\u01B0\u1EDBc n\u1ED9i dung</div>
          <div id="content-composer-preview-body" class="content-composer-preview-body"></div>
        </div>
      </div>
    </div>`}const EMPTY_EDITOR_PLAIN_TAGS=new Set(["DIV","P"]);function normalizeEmptyEditorState(t){if(!t||t.querySelector("img,table")||t.textContent.replace(/​/g,"").trim()!==""||t.children.length===0)return;if(t.children.length===1){const o=t.firstElementChild;if(EMPTY_EDITOR_PLAIN_TAGS.has(o.tagName)&&!o.getAttribute("style"))return}t.innerHTML="";const n=document.createRange();n.selectNodeContents(t),n.collapse(!0);const i=window.getSelection();i.removeAllRanges(),i.addRange(n)}function setComposerStatus(t,e=""){const n=document.getElementById("content-composer-status");n&&(n.className=`content-composer-status${e?` is-${e}`:""}`,n.textContent=t)}const EDITOR_INDENT_NBSP_COUNT=4,EDITOR_INDENT_BLOCK_TAGS=new Set(["DIV","P","LI","H1","H2","H3","H4","H5","H6","BLOCKQUOTE","PRE"]);function createEditorIndentHtml(t=1){const e=Math.max(1,Number(t)||1);return Array.from({length:e},()=>'<span class="document-editor-indent" contenteditable="false" data-indent="1">&nbsp;</span>').join("")}function insertEditorIndentAtSelection(t,e=1){const n=window.getSelection();if(!t||!n?.rangeCount)return!1;const i=n.getRangeAt(0);if(!t.contains(i.commonAncestorContainer))return!1;i.deleteContents();const o=document.createDocumentFragment(),s=document.createElement("div");s.innerHTML=createEditorIndentHtml(e);const a=[];for(;s.firstChild;){const l=s.firstChild;a.push(l),o.appendChild(l)}if(!a.length)return!1;i.insertNode(o);const r=document.createRange();return r.setStartAfter(a[a.length-1]),r.collapse(!0),n.removeAllRanges(),n.addRange(r),!0}function extractLeadingIndentInfo(t=""){let e=0,n=0,i=0;for(;n<t.length;){const o=t[n];if(o==="	"){if(i)break;e+=1,n+=1;continue}if(o===" "||o==="\xA0"){i+=1,n+=1,i===EDITOR_INDENT_NBSP_COUNT&&(e+=1,i=0);continue}break}return n-=i,{units:e,consumedChars:n}}function normalizeLeadingIndentTextNodes(t){if(!t?.childNodes)return!0;let e=!0;return Array.from(t.childNodes).forEach(n=>{if(n.nodeType===Node.TEXT_NODE){const i=String(n.textContent||"");if(e&&i){const{units:o,consumedChars:s}=extractLeadingIndentInfo(i);if(o>0){const a=document.createDocumentFragment(),r=document.createRange().createContextualFragment(createEditorIndentHtml(o));a.appendChild(r);const l=i.slice(s);l&&a.appendChild(document.createTextNode(l)),n.replaceWith(a),e=!l||!/[^\s\u00a0]/.test(l);return}}/[^\s\u00a0]/.test(i)&&(e=!1);return}if(n.nodeType===Node.ELEMENT_NODE){if(n.tagName==="BR"){e=!0;return}if(!n.classList.contains("document-editor-indent")){if(EDITOR_INDENT_BLOCK_TAGS.has(n.tagName)){normalizeLeadingIndentTextNodes(n),e=!0;return}e=normalizeLeadingIndentTextNodes(n)}}}),e}function normalizeIndentTokensInElement(t){t?.querySelectorAll&&(t.querySelectorAll("span").forEach(e=>{const n=String(e.textContent||"").replace(/ /g,"").replace(/\n/g,""),i=n&&/^[\u00a0\t]+$/.test(n),o=/display\s*:\s*inline-block/i.test(e.getAttribute("style")||"");if(!(e.classList.contains("document-editor-indent")||o&&i))return;const a=Math.max(1,Math.round(n.length/EDITOR_INDENT_NBSP_COUNT)||1),r=document.createRange().createContextualFragment(createEditorIndentHtml(a));e.replaceWith(r)}),normalizeLeadingIndentTextNodes(t))}function normalizeIndentMarkupHtml(t=""){if(!t)return"";const e=document.createElement("div");return e.innerHTML=String(t),normalizeIndentTokensInElement(e),e.innerHTML}function textToEditorHtml(t=""){const e=String(t||"").replace(/\r/g,"");return e?escapeHtml(e).replace(/\n/g,"<br>"):""}function createEditorImageHtml(t){const e=Math.max(1,Number(t.width)||100);return`<figure class="document-editor-image-token" contenteditable="false" data-block-id="${escapeHtml(t.id)}" data-url="${escapeHtml(t.url)}" data-alt="${escapeHtml(t.alt||"")}" data-width="${e}" style="width:${e}%"><img class="document-editor-image-preview" src="${escapeHtml(t.url)}" alt="${escapeHtml(t.alt||"image")}" draggable="false" /><button type="button" class="document-editor-image-remove" title="Xo\xE1 \u1EA3nh" aria-label="Xo\xE1 \u1EA3nh">\xD7</button><button type="button" class="document-editor-image-resize" title="K\xE9o \u0111\u1EC3 \u0111\u1ED5i k\xEDch th\u01B0\u1EDBc" aria-label="Resize"></button></figure>`}function buildEditorDocumentHtml(t,e=""){const n=normalizeContentBlocksForEditor(t,e);let i="";for(const o of n)o.type==="text"?i+=o.html!==void 0?o.html:textToEditorHtml(o.text||""):o.type==="image"&&o.url&&(i+=createEditorImageHtml(o));return i}function normalizeEditorExtractedText(t=""){return String(t||"").replace(/ /g," ").replace(/​/g,"").replace(/\r/g,"").replace(/^\n+|\n+$/g,"")}function syncContentBlocksFromEditor(){const t=document.getElementById("content-composer-host");if(!t)return;const e=[];let n=document.createElement("div");function i(){const s=n.cloneNode(!0);normalizeIndentTokensInElement(s),s.querySelectorAll(".editor-table-wrap").forEach(r=>{const l=r.querySelector(".editor-table");l?(l.style.width=r.style.width||"100%",r.replaceWith(l.cloneNode(!0))):r.remove()}),s.querySelectorAll(".editor-table-resize-handle, .tbl-col-resize-handle, .tbl-row-resize-handle").forEach(r=>r.remove());const a=sanitizeBlockHtml(s.innerHTML).replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi,"").trim();a&&e.push({id:nextContentBlockId(),type:"text",html:a}),n=document.createElement("div")}function o(s){s.nodeType===Node.ELEMENT_NODE&&s.classList?.contains("document-editor-image-token")?(i(),e.push({id:s.dataset.blockId||nextContentBlockId(),type:"image",url:s.dataset.url||"",alt:s.dataset.alt||"",width:Math.max(1,Number(s.dataset.width)||100)})):s.nodeType===Node.ELEMENT_NODE&&s.querySelector?.(".document-editor-image-token")?s.childNodes.forEach(a=>o(a)):n.appendChild(s.cloneNode(!0))}t.childNodes.forEach(s=>o(s)),i(),_contentBlocks=e.length?e:[createTextBlock("")],refreshContentComposerPreview(),scheduleQuestionDraftSave()}function saveComposerRange(){const t=window.getSelection();if(!t?.rangeCount)return;const e=document.getElementById("content-composer-host"),n=t.getRangeAt(0);e?.contains(n.commonAncestorContainer)&&(_composerSavedRange=n.cloneRange())}function insertImageAtSavedRange(t){const e=document.getElementById("content-composer-host");if(!e)return;const i=document.createRange().createContextualFragment(createEditorImageHtml(t)).firstElementChild,o=_composerSavedRange;if(o&&e.contains(o.commonAncestorContainer)){o.deleteContents(),o.insertNode(i),i.nextSibling||e.appendChild(document.createTextNode(""));const s=window.getSelection(),a=document.createRange();a.setStartAfter(i),a.collapse(!0),s?.removeAllRanges(),s?.addRange(a)}else e.appendChild(i),i.nextSibling||e.appendChild(document.createTextNode(""));_composerSavedRange=null,bindImageEditorEvents(e),syncContentBlocksFromEditor()}function bindTableEditorEvents(t){t.querySelectorAll(".editor-table").forEach(e=>{if(e.closest(".editor-table-wrap"))return;const n=document.createElement("div");n.className="editor-table-wrap",n.style.width=e.style.width||"100%",e.style.width="100%",e.parentNode.insertBefore(n,e),n.appendChild(e);const i=document.createElement("button");i.type="button",i.className="editor-table-resize-handle",i.contentEditable="false",i.title="K\xE9o \u0111\u1EC3 \u0111\u1ED5i k\xEDch th\u01B0\u1EDBc b\u1EA3ng",i.innerHTML='<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 9L9 2M5 9L9 5M8 9L9 8" stroke="#475569" stroke-width="1.6" stroke-linecap="round"/></svg>',n.appendChild(i),i.onpointerdown=o=>{o.preventDefault(),o.stopPropagation();const s=t.clientWidth||1,a=o.clientX,r=n.getBoundingClientRect().width;n.classList.add("resizing"),document.body.classList.add("resizing-image");const l=d=>{const u=Math.max(60,r+(d.clientX-a)),m=Math.max(10,Math.min(100,Math.round(u/s*100)));n.style.width=m+"%",setComposerStatus(`\u0110\u1ED9 r\u1ED9ng b\u1EA3ng: ${m}%`,"loading")},c=()=>{document.removeEventListener("pointermove",l),document.removeEventListener("pointerup",c),n.classList.remove("resizing"),document.body.classList.remove("resizing-image"),syncContentBlocksFromEditor(),setComposerStatus("\u0110\xE3 c\u1EADp nh\u1EADt k\xEDch th\u01B0\u1EDBc b\u1EA3ng.","success")};document.addEventListener("pointermove",l),document.addEventListener("pointerup",c,{once:!0})},injectTableResizeHandles(e),e.addEventListener("mousedown",o=>{const s=o.target.closest("td,th");!s||!e.contains(s)||(o.shiftKey&&_activeTableCell&&_activeTableCell.closest("table")===e?(o.preventDefault(),selectTableCellRange(e,_activeTableCell,s),showTableFloatToolbar(e)):o.shiftKey||clearTableCellSelection())})})}function bindImageEditorEvents(t){t.querySelectorAll(".document-editor-image-token").forEach(e=>{const n=e.querySelector(".document-editor-image-remove");n&&!n._bound&&(n._bound=!0,n.addEventListener("mousedown",o=>{o.preventDefault(),o.stopPropagation()}),n.addEventListener("click",o=>{o.preventDefault(),o.stopPropagation(),e.remove(),syncContentBlocksFromEditor(),setComposerStatus("\u0110\xE3 xo\xE1 \u1EA3nh kh\u1ECFi n\u1ED9i dung.","success")}));const i=e.querySelector(".document-editor-image-resize");i&&!i._bound&&(i._bound=!0,i.onpointerdown=o=>{o.preventDefault(),o.stopPropagation();const s=t.clientWidth||1,a=o.clientX,r=e.getBoundingClientRect().width;document.body.classList.add("resizing-image");const l=d=>{const u=Math.max(40,r+(d.clientX-a)),m=Math.max(5,Math.min(100,Math.round(u/s*100)));e.style.width=m+"%",e.dataset.width=String(m);const h=_contentBlocks.find(g=>g.id===e.dataset.blockId&&g.type==="image");h&&(h.width=m),setComposerStatus(`\u0110\u1ED9 r\u1ED9ng \u1EA3nh: ${m}%`,"loading")},c=()=>{document.removeEventListener("pointermove",l),document.removeEventListener("pointerup",c),document.body.classList.remove("resizing-image"),syncContentBlocksFromEditor(),setComposerStatus("\u0110\xE3 c\u1EADp nh\u1EADt k\xEDch th\u01B0\u1EDBc \u1EA3nh.","success")};document.addEventListener("pointermove",l),document.addEventListener("pointerup",c,{once:!0})})})}function refreshContentComposerPreview(){const t=renderRichQuestionContentHTML(_contentBlocks),e=document.getElementById("content-composer-preview-body");e&&(e.innerHTML=t);const n=document.getElementById("preview-sticky-float-body");n&&(n.innerHTML=t)}let _stickyPreviewObserver=null,_stickyPreviewDismissed=!1;function initStickyPreview(){_stickyPreviewObserver&&(_stickyPreviewObserver.disconnect(),_stickyPreviewObserver=null),_stickyPreviewDismissed=!1;let t=document.getElementById("preview-sticky-float");t||(t=document.createElement("div"),t.id="preview-sticky-float",t.className="preview-sticky-float",document.body.appendChild(t)),t.innerHTML=`
    <div class="preview-sticky-float-header">
      <span class="content-composer-preview-title" style="margin:0">Xem tr\u01B0\u1EDBc n\u1ED9i dung</span>
      <button class="preview-sticky-close" onclick="dismissStickyPreview()" title="\u1EA8n" aria-label="\u1EA8n xem tr\u01B0\u1EDBc">\u2715</button>
    </div>
    <div id="preview-sticky-float-body" class="content-composer-preview-body"></div>`;const e=document.getElementById("content-composer-preview-body"),n=document.getElementById("preview-sticky-float-body");e&&n&&(n.innerHTML=e.innerHTML);let i=document.getElementById("preview-sticky-toggle");i||(i=document.createElement("button"),i.id="preview-sticky-toggle",i.className="preview-sticky-toggle",i.title="Xem tr\u01B0\u1EDBc n\u1ED9i dung",i.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',i.onclick=()=>{_stickyPreviewDismissed=!1,updateStickyPreviewVisibility()},document.body.appendChild(i));const o=document.querySelector(".content-composer-preview");if(!o)return;const s=a=>{t.classList.toggle("is-visible",a&&!_stickyPreviewDismissed),i.classList.toggle("is-visible",a&&_stickyPreviewDismissed),a||(_stickyPreviewDismissed=!1)};window._updateStickyPreviewVisibility=s,_stickyPreviewObserver=new IntersectionObserver(([a])=>{s(!a.isIntersecting&&a.boundingClientRect.top<0)},{threshold:0}),_stickyPreviewObserver.observe(o)}function updateStickyPreviewVisibility(){if(window._updateStickyPreviewVisibility){const t=document.querySelector(".content-composer-preview");if(!t)return;const e=t.getBoundingClientRect();window._updateStickyPreviewVisibility(!t.checkVisibility?.()||e.bottom<0)}}function dismissStickyPreview(){_stickyPreviewDismissed=!0,document.getElementById("preview-sticky-float")?.classList.remove("is-visible"),document.getElementById("preview-sticky-toggle")?.classList.add("is-visible")}window.dismissStickyPreview=dismissStickyPreview;function applyComposerCollapsedState(){const t=document.getElementById("content-composer-editor-panel"),e=document.getElementById("content-composer-toggle");t&&t.classList.toggle("collapsed",_composerCollapsed),e&&(e.textContent=_composerCollapsed?"M\u1EDF editor":"Thu g\u1ECDn editor")}function toggleComposerEditor(t){_composerCollapsed=typeof t=="boolean"?t:!_composerCollapsed,applyComposerCollapsedState()}function renderContentComposer(){const t=document.getElementById("content-composer-host");if(!t)return;t.innerHTML=buildEditorDocumentHtml(_contentBlocks),normalizeIndentTokensInElement(t),t.onkeydown=n=>{if(n.key==="Tab"){n.preventDefault(),insertEditorIndentAtSelection(t,1)&&(syncContentBlocksFromEditor(),saveComposerRange());return}if(n.key!=="Enter")return;const i=window.getSelection()?.getRangeAt(0)?.commonAncestorContainer,o=i?.nodeType===3?i.parentElement:i;if(o?.closest("td,th")||o?.closest("li"))return;n.preventDefault();const s=window.getSelection();if(!s?.rangeCount)return;const r=s.getRangeAt(0).cloneRange();r.setEnd(t,t.childNodes.length);const l=r.toString().trim().length>0||r.cloneContents().querySelector("img,table")!==null,c="__br_cursor__";document.execCommand("insertHTML",!1,l?`<br><span id="${c}"></span>`:`<br><span id="${c}"></span><br>`);const d=document.getElementById(c);if(d){const u=d.parentNode,m=Array.from(u.childNodes).indexOf(d);d.remove();const h=document.createRange();h.setStart(u,m),h.collapse(!0),s.removeAllRanges(),s.addRange(h)}syncContentBlocksFromEditor()},t.oninput=()=>{normalizeEmptyEditorState(t),syncContentBlocksFromEditor(),saveComposerRange()},t.onmouseup=saveComposerRange,t.onkeyup=saveComposerRange,t.onpaste=handleComposerPaste;const e=document.getElementById("content-image-file-input");e&&(e.onchange=onComposerImageSelected),bindImageEditorEvents(t),bindTableEditorEvents(t),bindFormatToolbarStateUpdater(),refreshContentComposerPreview()}let _formatSelListenerBound=!1,_activeTableCell=null,_selectedTableCells=[];function bindFormatToolbarStateUpdater(){_formatSelListenerBound||(_formatSelListenerBound=!0,document.addEventListener("selectionchange",()=>{const t=document.getElementById("content-composer-host");if(!t)return;const e=window.getSelection();e?.rangeCount&&t.contains(e.getRangeAt(0).commonAncestorContainer)&&updateFormatToolbarState()}))}function updateFormatToolbarState(){const t=document.getElementById("fmt-bold"),e=document.getElementById("fmt-italic"),n=document.getElementById("fmt-underline");t&&t.classList.toggle("is-active",document.queryCommandState("bold")),e&&e.classList.toggle("is-active",document.queryCommandState("italic")),n&&n.classList.toggle("is-active",document.queryCommandState("underline"));const i=document.getElementById("fmt-list-ul"),o=document.getElementById("fmt-list-ol");i&&i.classList.toggle("is-active",document.queryCommandState("insertUnorderedList")),o&&o.classList.toggle("is-active",document.queryCommandState("insertOrderedList")),["Left","Center","Right"].forEach(l=>{const c=document.getElementById(`fmt-align-${l.toLowerCase()}`);c&&c.classList.toggle("is-active",document.queryCommandState(`justify${l}`))});const s=document.getElementById("content-composer-host"),a=document.getElementById("fmt-align-justify");a&&s&&a.classList.toggle("is-active",document.queryCommandState("justifyFull")||s.style.textAlign==="justify");const r=window.getSelection();if(r?.rangeCount){const l=r.getRangeAt(0).commonAncestorContainer;_activeTableCell=(l.nodeType===3?l.parentElement:l)?.closest?.("td,th")||null}else _activeTableCell=null;_activeTableCell?showTableFloatToolbar(_activeTableCell.closest("table")):(clearTableCellSelection(),hideTableFloatToolbar())}function applyFormat(t){document.execCommand(t),syncContentBlocksFromEditor()}function applyJustify(){const t=document.getElementById("content-composer-host");if(!t)return;normalizeIndentTokensInElement(t);const n=document.queryCommandState("justifyFull")||t.style.textAlign==="justify"?"":"justify";t.style.textAlign=n,t.querySelectorAll("div, p, h1, h2, h3, h4, h5, h6").forEach(i=>{i.style.textAlign=n}),updateFormatToolbarState(),syncContentBlocksFromEditor()}window.applyJustify=applyJustify;function applyFormatFontSize(t){const e=document.getElementById("fmt-fontsize");if(!t)return;const n=document.getElementById("content-composer-host");if(!n)return;if(_composerSavedRange){const l=window.getSelection();l.removeAllRanges(),l.addRange(_composerSavedRange)}const i=window.getSelection();if(!i?.rangeCount||i.isCollapsed){e&&(e.value="");return}const o=i.getRangeAt(0),s=o.extractContents();s.querySelectorAll("[style]").forEach(l=>{l.style.fontSize="",l.getAttribute("style").trim()||l.removeAttribute("style")});const a=document.createElement("span");a.style.fontSize=t+"px",a.appendChild(s),o.insertNode(a);const r=document.createRange();r.selectNodeContents(a),i.removeAllRanges(),i.addRange(r),e&&(e.value=""),n.focus(),syncContentBlocksFromEditor()}function applyFormatFontFamily(t){const e=document.getElementById("fmt-fontfamily");if(!t)return;const n=document.getElementById("content-composer-host");if(!n)return;if(_composerSavedRange){const l=window.getSelection();l.removeAllRanges(),l.addRange(_composerSavedRange)}const i=window.getSelection();if(!i?.rangeCount||i.isCollapsed){e&&(e.value="");return}const o=i.getRangeAt(0),s=o.extractContents();s.querySelectorAll("[style]").forEach(l=>{l.style.fontFamily="",l.getAttribute("style").trim()||l.removeAttribute("style")});const a=document.createElement("span");a.style.fontFamily=t,a.appendChild(s),o.insertNode(a);const r=document.createRange();r.selectNodeContents(a),i.removeAllRanges(),i.addRange(r),e&&(e.value=""),n.focus(),syncContentBlocksFromEditor()}window.applyFormatFontFamily=applyFormatFontFamily;function togglePasteKeepFormat(){_keepFormatOnNextPaste=!_keepFormatOnNextPaste;const t=document.getElementById("paste-keepformat-toggle");t&&t.classList.toggle("is-active",_keepFormatOnNextPaste),setComposerStatus(_keepFormatOnNextPaste?"\u0110\xE3 b\u1EADt: l\u1EA7n d\xE1n ti\u1EBFp theo (Ctrl+V) s\u1EBD gi\u1EEF nguy\xEAn \u0111\u1ECBnh d\u1EA1ng t\u1EEB ngu\u1ED3n d\xE1n.":"So\u1EA1n n\u1ED9i dung trong m\u1ED9t khung duy nh\u1EA5t. \u1EA2nh s\u1EBD \u0111\u01B0\u1EE3c ch\xE8n inline v\xE0 khi l\u01B0u s\u1EBD t\u1EF1 parse th\xE0nh text/image blocks.")}window.togglePasteKeepFormat=togglePasteKeepFormat;const CLEAR_FORMAT_BLOCK_TAGS=new Set(["DIV","P","H1","H2","H3","H4","H5","H6","LI","BLOCKQUOTE","PRE","TR"]);function isClearFormatStructuralUnit(t){const e=t.tagName;return!!(e==="IMG"||e==="TABLE"||e==="FIGURE"&&t.classList.contains("document-editor-image-token"))}function clearFormatFlatten(t,e){for(const n of Array.from(t.childNodes)){if(n.nodeType===Node.TEXT_NODE){e.push(document.createTextNode(n.textContent));continue}if(n.nodeType!==Node.ELEMENT_NODE)continue;const i=n.tagName;if(i==="BR"){e.push(document.createElement("br"));continue}if(isClearFormatStructuralUnit(n)){e.push(n.cloneNode(!0));continue}const o=CLEAR_FORMAT_BLOCK_TAGS.has(i);o&&e.length&&e[e.length-1].nodeName!=="BR"&&e.push(document.createElement("br")),clearFormatFlatten(n,e),o&&e.length&&e[e.length-1].nodeName!=="BR"&&e.push(document.createElement("br"))}}function clearFormatSelection(){const t=document.getElementById("content-composer-host");if(!t)return;const e=window.getSelection();if(!e?.rangeCount||e.isCollapsed)return;const n=e.getRangeAt(0);if(!t.contains(n.commonAncestorContainer))return;const i=n.extractContents(),o=[];clearFormatFlatten(i,o);const s=[];for(const l of o)l.nodeName==="BR"&&s.length&&s[s.length-1].nodeName==="BR"||s.push(l);for(;s.length&&s[0].nodeName==="BR";)s.shift();for(;s.length&&s[s.length-1].nodeName==="BR";)s.pop();const a=document.createElement("span");a.style.fontSize="13px",s.forEach(l=>a.appendChild(l)),n.insertNode(a);const r=document.createRange();r.selectNodeContents(a),e.removeAllRanges(),e.addRange(r),bindImageEditorEvents(t),bindTableEditorEvents(t),t.focus(),updateFormatToolbarState(),syncContentBlocksFromEditor()}window.clearFormatSelection=clearFormatSelection;function toggleColorPalette(){const t=document.getElementById("fmt-color-palette");if(!t)return;if(t.style.display!=="none"){t.style.display="none";return}t.style.display="block";const n=i=>{!t.contains(i.target)&&i.target.id!=="fmt-color-btn"&&(t.style.display="none",document.removeEventListener("mousedown",n))};setTimeout(()=>document.addEventListener("mousedown",n),0)}function closeColorPalette(){const t=document.getElementById("fmt-color-palette");t&&(t.style.display="none")}function ensureTableFloatToolbar(){if(document.getElementById("editor-table-float-toolbar"))return;const t=document.createElement("div");t.id="editor-table-float-toolbar",t.className="editor-table-float-toolbar";const e=(n,i,o,s,a)=>`<button${a?` id="${a}"`:""} class="tft-btn${o?" tft-danger":""}" title="${n}" onmousedown="event.preventDefault()" onclick="${i}"><svg width="15" height="15" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">${s}</svg></button>`;t.innerHTML=e("Th\xEAm h\xE0ng ph\xEDa tr\xEAn","tableAddRowAbove()",!1,'<rect x="1" y="6" width="12" height="7" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M7 1v4M5 3h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("Th\xEAm h\xE0ng ph\xEDa d\u01B0\u1EDBi","tableAddRowBelow()",!1,'<rect x="1" y="1" width="12" height="7" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M7 13v-4M5 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("X\xF3a h\xE0ng hi\u1EC7n t\u1EA1i","tableDeleteRow()",!0,'<rect x="1" y="4" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M4 7h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+'<div class="tft-sep"></div>'+e("Th\xEAm c\u1ED9t b\xEAn tr\xE1i","tableAddColLeft()",!1,'<rect x="5" y="1" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M1 7h3M2 5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("Th\xEAm c\u1ED9t b\xEAn ph\u1EA3i","tableAddColRight()",!1,'<rect x="1" y="1" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M13 7h-3M12 5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("X\xF3a c\u1ED9t hi\u1EC7n t\u1EA1i","tableDeleteCol()",!0,'<rect x="4" y="1" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M6 7h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+'<div class="tft-sep" id="tft-merge-sep" style="display:none"></div>'+e("G\u1ED9p \xF4 \u0111\xE3 ch\u1ECDn (Shift+click \u0111\u1EC3 ch\u1ECDn nhi\u1EC1u \xF4)","tableMergeCells()",!1,'<rect x="1" y="1" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="1" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="8" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="8" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><path d="M5 5L9 9M9 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',"tft-merge-btn")+e("T\xE1ch \xF4","tableSplitCell()",!1,'<rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',"tft-split-btn")+'<div class="tft-sep"></div>'+e("Ki\u1EC3u vi\u1EC1n b\u1EA3ng","toggleTableBorderPicker()",!1,'<rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v12M9 1v12M1 5h12M1 9h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',"tft-border-btn"),document.body.appendChild(t)}function showTableFloatToolbar(t){ensureTableFloatToolbar();const e=document.getElementById("editor-table-float-toolbar"),i=(t.closest(".editor-table-wrap")||t).getBoundingClientRect();e.style.left=i.left+"px",e.style.top=i.top-44+window.scrollY+"px",e.style.position="absolute",e.style.display="flex";const o=document.getElementById("tft-merge-btn"),s=document.getElementById("tft-split-btn"),a=document.getElementById("tft-merge-sep"),r=_selectedTableCells.length>1,l=_selectedTableCells.length<=1&&_activeTableCell&&((_activeTableCell.colSpan||1)>1||(_activeTableCell.rowSpan||1)>1);o&&(o.style.display=r?"":"none"),s&&(s.style.display=l?"":"none"),a&&(a.style.display=r||l?"":"none")}function hideTableFloatToolbar(){const t=document.getElementById("editor-table-float-toolbar");t&&(t.style.display="none")}function toggleTablePicker(){const t=document.getElementById("fmt-table-picker");if(!t)return;if(t.style.display!=="none"){t.style.display="none";return}const e=document.getElementById("fmt-table-grid");if(e&&!e.children.length){for(let i=1;i<=5;i++)for(let o=1;o<=6;o++){const s=document.createElement("div");s.className="fmt-table-cell",s.dataset.row=i,s.dataset.col=o,s.onmouseover=()=>highlightTableGrid(i,o),s.onclick=()=>{insertTable(i,o),closeTablePicker()},e.appendChild(s)}e.onmouseleave=()=>{e.querySelectorAll(".fmt-table-cell").forEach(o=>o.classList.remove("is-selected"));const i=document.getElementById("fmt-table-size-label");i&&(i.textContent="Ch\u1ECDn k\xEDch th\u01B0\u1EDBc b\u1EA3ng")}}t.style.display="block";const n=i=>{!t.contains(i.target)&&i.target.id!=="fmt-table-btn"&&(t.style.display="none",document.removeEventListener("mousedown",n))};setTimeout(()=>document.addEventListener("mousedown",n),0)}function closeTablePicker(){const t=document.getElementById("fmt-table-picker");t&&(t.style.display="none")}function highlightTableGrid(t,e){const n=document.getElementById("fmt-table-grid"),i=document.getElementById("fmt-table-size-label");n&&(n.querySelectorAll(".fmt-table-cell").forEach(o=>{o.classList.toggle("is-selected",Number(o.dataset.row)<=t&&Number(o.dataset.col)<=e)}),i&&(i.textContent=`${t} \xD7 ${e} b\u1EA3ng`))}function insertTable(t,e){const n=document.getElementById("content-composer-host");if(!n)return;if(_composerSavedRange){const s=window.getSelection();s.removeAllRanges(),s.addRange(_composerSavedRange)}const i=Math.floor(100/e);let o='<table class="editor-table" style="width:100%"><colgroup>';for(let s=0;s<e;s++){const a=s===e-1?100-i*(e-1):i;o+=`<col style="width:${a}%">`}o+="</colgroup><tbody>";for(let s=0;s<t;s++){o+="<tr>";for(let a=0;a<e;a++)o+="<td><br></td>";o+="</tr>"}o+="</tbody></table><br>",document.execCommand("insertHTML",!1,o),_composerSavedRange=null,bindTableEditorEvents(n),syncContentBlocksFromEditor()}function getTableColCount(t){let e=0;return t.querySelectorAll("tr").forEach(n=>{let i=0;n.querySelectorAll("td,th").forEach(o=>{i+=o.colSpan||1}),i>e&&(e=i)}),e}function injectTableResizeHandles(t){t.querySelectorAll(".tbl-col-resize-handle, .tbl-row-resize-handle").forEach(o=>o.remove());const e=getTableColCount(t);let n=t.querySelector("colgroup");if(!n){n=document.createElement("colgroup");const o=t.querySelector("tr"),s=o?Array.from(o.querySelectorAll("td,th")):[],a=s.length===e&&s.every(r=>r.style.width);for(let r=0;r<e;r++){const l=document.createElement("col");if(a)l.style.width=s[r].style.width;else{const c=Math.floor(100/e);l.style.width=(r===e-1?100-c*(e-1):c)+"%"}n.appendChild(l)}t.prepend(n)}t.querySelectorAll("td,th").forEach(o=>{o.style.width&&(o.style.width="")});const i=Array.from(n.querySelectorAll("col"));t.querySelectorAll("tr").forEach(o=>{const s=Array.from(o.querySelectorAll("td,th"));let a=0;s.forEach((r,l)=>{const c=r.colSpan||1;if(!(l===s.length-1)){const u=a+c-1,m=document.createElement("div");m.className="tbl-col-resize-handle",m.onpointerdown=h=>{if(h.preventDefault(),h.stopPropagation(),u+1>=i.length)return;const g=t.getBoundingClientRect().width||1,f=h.clientX,w=i[u],y=i[u+1],C=parseFloat(w.style.width)||100/e,E=parseFloat(y.style.width)||100/e;m.classList.add("is-dragging"),document.body.style.cursor="col-resize";const I=N=>{const F=(N.clientX-f)/g*100;w.style.width=Math.max(3,C+F)+"%",y.style.width=Math.max(3,E-F)+"%"},q=()=>{m.classList.remove("is-dragging"),document.body.style.cursor="",document.removeEventListener("pointermove",I),document.removeEventListener("pointerup",q),syncContentBlocksFromEditor()};document.addEventListener("pointermove",I),document.addEventListener("pointerup",q,{once:!0})},r.appendChild(m)}if(l===0){const u=document.createElement("div");u.className="tbl-row-resize-handle",u.onpointerdown=m=>{m.preventDefault(),m.stopPropagation();const h=m.clientY,g=o.getBoundingClientRect().height;u.classList.add("is-dragging"),document.body.style.cursor="row-resize";const f=y=>{o.style.height=Math.max(24,g+(y.clientY-h))+"px"},w=()=>{u.classList.remove("is-dragging"),document.body.style.cursor="",document.removeEventListener("pointermove",f),document.removeEventListener("pointerup",w),syncContentBlocksFromEditor()};document.addEventListener("pointermove",f),document.addEventListener("pointerup",w,{once:!0})},r.appendChild(u)}a+=c})})}function _tableInsertRowAt(t,e){const{rows:n,grid:i}=getTableGridMap(t),o=Math.max(0,...i.map(d=>d.length),0),s=i[e-1]||[],a=i[e]||[],r=new Set,l=document.createElement("tr");for(let d=0;d<o;d++){const u=s[d]&&s[d]===a[d]?s[d]:null;if(u){r.has(u)||(u.rowSpan=Math.max(1,u.rowSpan||1)+1,r.add(u));continue}const m=document.createElement("td");m.innerHTML="<br>",l.appendChild(m)}const c=n[e]||null;c?c.parentNode.insertBefore(l,c):n.length?n[n.length-1].parentNode.appendChild(l):t.appendChild(l)}function tableAddRowAbove(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const e=getTableCellGridPos(t,_activeTableCell);e.row<0||(_tableInsertRowAt(t,e.row),syncContentBlocksFromEditor(),injectTableResizeHandles(t))}function tableAddRowBelow(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const e=getTableCellGridPos(t,_activeTableCell);if(e.row<0)return;const n=Math.max(1,_activeTableCell.rowSpan||1);_tableInsertRowAt(t,e.row+n),syncContentBlocksFromEditor(),injectTableResizeHandles(t)}function tableDeleteRow(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const{rows:e,grid:n}=getTableGridMap(t),i=e.indexOf(_activeTableCell.closest("tr"));if(i<0)return;const o=e[i],s=n[i]||[],a=new Set;s.forEach(r=>{if(!r||a.has(r))return;const l=Math.max(1,r.rowSpan||1);l>1&&r.parentElement!==o&&(r.rowSpan=l-1,a.add(r))}),o.remove(),t.querySelectorAll("tr").length?injectTableResizeHandles(t):(t.closest(".editor-table-wrap")||t).remove(),_activeTableCell=null,hideTableFloatToolbar(),syncContentBlocksFromEditor()}function _tableInsertColAt(t,e){const{rows:n,grid:i}=getTableGridMap(t),o=new Set;n.forEach((s,a)=>{const r=i[a]||[],l=e>0?r[e-1]:null,c=r[e]||null;if(l&&l===c){o.has(l)||(l.colSpan=Math.max(1,l.colSpan||1)+1,o.add(l));return}const u=Array.from(s.querySelectorAll("td,th")).find(h=>r.indexOf(h)>=e)||null,m=document.createElement("td");m.innerHTML="<br>",s.insertBefore(m,u)})}function tableAddColLeft(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const e=getTableCellGridPos(t,_activeTableCell).col;if(e<0)return;_tableInsertColAt(t,e);const n=t.querySelector("colgroup");if(n){const i=document.createElement("col");n.insertBefore(i,n.children[e]||null),equalizeColWidths(n)}syncContentBlocksFromEditor(),injectTableResizeHandles(t)}function tableAddColRight(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const e=getTableCellGridPos(t,_activeTableCell);if(e.col<0)return;const n=Math.max(1,_activeTableCell.colSpan||1),i=e.col+n;_tableInsertColAt(t,i);const o=t.querySelector("colgroup");if(o){const s=document.createElement("col");o.insertBefore(s,o.children[i]||null),equalizeColWidths(o)}syncContentBlocksFromEditor(),injectTableResizeHandles(t)}function tableDeleteCol(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const{rows:e,grid:n}=getTableGridMap(t),i=getTableCellGridPos(t,_activeTableCell).col;if(i<0)return;const o=new Set;e.forEach((a,r)=>{const l=(n[r]||[])[i];if(!l)return;const c=Math.max(1,l.colSpan||1);c>1?o.has(l)||(l.colSpan=c-1,o.add(l)):l.remove()});const s=t.querySelector("colgroup");s&&s.children[i]&&(s.children[i].remove(),redistributeColWidths(s)),_activeTableCell=null,hideTableFloatToolbar(),getTableColCount(t)===0?(t.closest(".editor-table-wrap")||t).remove():injectTableResizeHandles(t),syncContentBlocksFromEditor()}function redistributeColWidths(t){const e=Array.from(t.querySelectorAll("col"));if(!e.length)return;const i=100/(e.reduce((o,s)=>o+(parseFloat(s.style.width)||0),0)||100);e.forEach(o=>{o.style.width=((parseFloat(o.style.width)||0)*i).toFixed(2)+"%"})}function equalizeColWidths(t){const e=Array.from(t.querySelectorAll("col"));if(!e.length)return;const n=(100/e.length).toFixed(2)+"%";e.forEach(i=>{i.style.width=n})}function getTableGridMap(t){const e=Array.from(t.querySelectorAll("tr")),n=[];return e.forEach((i,o)=>{n[o]=n[o]||[];let s=0;Array.from(i.querySelectorAll("td,th")).forEach(a=>{for(;n[o][s];)s++;const r=Math.max(1,a.colSpan||1),l=Math.max(1,a.rowSpan||1);for(let c=o;c<o+l;c++){n[c]=n[c]||[];for(let d=s;d<s+r;d++)n[c][d]=a}s+=r})}),{rows:e,grid:n}}function getTableCellGridPos(t,e){const{rows:n,grid:i}=getTableGridMap(t),o=n.indexOf(e.parentElement),s=o>=0?(i[o]||[]).indexOf(e):-1;return{row:o,col:s}}function clearTableCellSelection(){_selectedTableCells.forEach(t=>t.classList.remove("is-td-selected")),_selectedTableCells=[]}function selectTableCellRange(t,e,n){const{rows:i,grid:o}=getTableGridMap(t);function s(h){const g=i.indexOf(h.parentElement),f=g>=0?(o[g]||[]).indexOf(h):-1;return{row:g,col:f}}const a=s(e),r=s(n);if(a.row<0||r.row<0||a.col<0||r.col<0)return;const l=Math.min(a.row,r.row),c=Math.max(a.row,r.row),d=Math.min(a.col,r.col),u=Math.max(a.col,r.col);document.querySelectorAll(".editor-table .is-td-selected").forEach(h=>h.classList.remove("is-td-selected")),_selectedTableCells=[];const m=new Set;for(let h=l;h<=c;h++)for(let g=d;g<=u;g++){const f=(o[h]||[])[g];f&&!m.has(f)&&(m.add(f),f.classList.add("is-td-selected"),_selectedTableCells.push(f))}}function tableMergeCells(){if(_selectedTableCells.length<2)return;const t=_selectedTableCells[0].closest("table");if(!t)return;const{rows:e,grid:n}=getTableGridMap(t),i=_selectedTableCells.map(d=>{const u=e.indexOf(d.parentElement),m=u>=0?(n[u]||[]).indexOf(d):-1;return{cell:d,rowIdx:u,colIdx:m}}),o=Math.min(...i.map(d=>d.rowIdx)),s=Math.max(...i.map(d=>d.rowIdx)),a=Math.min(...i.map(d=>d.colIdx)),r=Math.max(...i.map(d=>d.colIdx)),l=(n[o]||[])[a];if(!l)return;const c=_selectedTableCells.map(d=>d.innerHTML.replace(/^(<br\s*\/?>|\s)+|(<br\s*\/?>|\s)+$/gi,"").trim()).filter(d=>d&&d!=="<br>");l.colSpan=r-a+1,l.rowSpan=s-o+1,l.innerHTML=c.join(" ")||"<br>",_selectedTableCells.forEach(d=>{d!==l&&d.remove()}),clearTableCellSelection(),_activeTableCell=l,syncContentBlocksFromEditor(),injectTableResizeHandles(t),showTableFloatToolbar(t)}function tableSplitCell(){const t=_activeTableCell;if(!t)return;const e=t.colSpan||1,n=t.rowSpan||1;if(e===1&&n===1)return;const i=t.closest("table"),{rows:o,grid:s}=getTableGridMap(i),a=t.parentElement,r=o.indexOf(a),l=r>=0?(s[r]||[]).indexOf(t):-1,c=t.style.border||"";t.colSpan=1,t.rowSpan=1;for(let d=1;d<e;d++){const u=document.createElement("td");u.innerHTML="<br>",c&&(u.style.border=c),a.insertBefore(u,t.nextSibling)}if(l>=0)for(let d=1;d<n;d++){const u=o[r+d];if(!u)continue;const m=s[r+d]||[],g=Array.from(u.querySelectorAll("td,th")).find(f=>m.indexOf(f)>=l+e)||null;for(let f=0;f<e;f++){const w=document.createElement("td");w.innerHTML="<br>",c&&(w.style.border=c),u.insertBefore(w,g)}}syncContentBlocksFromEditor(),injectTableResizeHandles(i),showTableFloatToolbar(i)}function toggleTableBorderPicker(){let t=document.getElementById("editor-table-border-picker");if(t&&t.style.display!=="none"){hideTableBorderPicker();return}t||(t=document.createElement("div"),t.id="editor-table-border-picker",t.className="editor-table-border-picker",t.innerHTML=`<div class="tbp-label">Ki\u1EC3u vi\u1EC1n b\u1EA3ng</div><div class="tbp-options"><button class="tbp-btn" title="T\u1EA5t c\u1EA3 vi\u1EC1n" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('all')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h22M3 18h22M10 3v22M18 3v22" stroke="currentColor" stroke-width="1.5"/></svg><span>T\u1EA5t c\u1EA3 vi\u1EC1n</span></button><button class="tbp-btn" title="Kh\xF4ng vi\u1EC1n" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('none')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/></svg><span>Kh\xF4ng vi\u1EC1n</span></button><button class="tbp-btn" title="Ch\u1EC9 vi\u1EC1n ngo\xE0i" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('outer')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="2"/></svg><span>Vi\u1EC1n ngo\xE0i</span></button><button class="tbp-btn" title="Ch\u1EC9 vi\u1EC1n trong" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('inner')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M3 10h22M3 18h22M10 3v22M18 3v22" stroke="currentColor" stroke-width="1.5"/></svg><span>Vi\u1EC1n trong</span></button></div>`,document.body.appendChild(t));const e=document.getElementById("tft-border-btn");if(e){const n=e.getBoundingClientRect();t.style.left=n.left+"px",t.style.top=n.bottom+6+window.scrollY+"px"}t.style.display="block",setTimeout(()=>{const n=i=>{!t.contains(i.target)&&i.target.id!=="tft-border-btn"&&(hideTableBorderPicker(),document.removeEventListener("mousedown",n))};document.addEventListener("mousedown",n)},0)}function hideTableBorderPicker(){const t=document.getElementById("editor-table-border-picker");t&&(t.style.display="none")}function tableApplyBorderStyle(t){const e=_activeTableCell||_selectedTableCells[0];if(!e)return;const n=e.closest("table");if(!n)return;const i=Array.from(n.querySelectorAll("tr")),o=i.length,s="1px solid #cbd5e1";i.forEach((a,r)=>{const l=Array.from(a.querySelectorAll("td,th")),c=l.length;l.forEach((d,u)=>{d.style.removeProperty("border"),d.style.removeProperty("border-top"),d.style.removeProperty("border-right"),d.style.removeProperty("border-bottom"),d.style.removeProperty("border-left"),t==="all"?d.style.border=s:t==="none"?d.style.border="none":t==="outer"?(d.style.borderTop=r===0?s:"none",d.style.borderBottom=r===o-1?s:"none",d.style.borderLeft=u===0?s:"none",d.style.borderRight=u===c-1?s:"none"):t==="inner"&&(d.style.borderTop=r===0?"none":s,d.style.borderBottom=r===o-1?"none":s,d.style.borderLeft=u===0?"none":s,d.style.borderRight=u===c-1?"none":s)})}),syncContentBlocksFromEditor(),hideTableBorderPicker()}function applyFormatColor(t){if(!document.getElementById("content-composer-host"))return;if(_composerSavedRange){const i=window.getSelection();i.removeAllRanges(),i.addRange(_composerSavedRange)}document.execCommand("styleWithCSS",!1,!0),document.execCommand("foreColor",!1,t);const n=document.getElementById("fmt-color-label");n&&(n.style.borderBottomColor=t),syncContentBlocksFromEditor()}function initContentComposer(t,e=""){_contentBlocks=normalizeContentBlocksForEditor(t,e),_composerSavedRange=null,renderContentComposer(),applyComposerCollapsedState(),initStickyPreview()}function openImagePicker(){saveComposerRange(),document.getElementById("content-image-file-input")?.click()}async function uploadComposerImage(t){_contentImageUploadCount++,setComposerStatus(`\u0110ang upload \u1EA3nh "${t.name}"...`,"loading");try{const e=await api.post("/uploads/images/presign",{file_name:t.name,content_type:t.type||"image/png",size:t.size});return await fetch(e.upload_url,{method:"PUT",headers:{"Content-Type":t.type||"image/png"},body:t}),{url:e.public_url,name:t.name,content_type:t.type,size:t.size}}finally{_contentImageUploadCount=Math.max(0,_contentImageUploadCount-1)}}async function onComposerImageSelected(t){const e=t.target?.files?.[0];if(e){_composerSavedRange||saveComposerRange();try{const n=await uploadComposerImage(e),i=createImageBlock(n.url,n.name||"",100);insertImageAtSavedRange(i),setComposerStatus(`\u0110\xE3 ch\xE8n \u1EA3nh "${e.name}" v\xE0o n\u1ED9i dung.`,"success")}catch(n){setComposerStatus(n?.error||n?.message||"Kh\xF4ng th\u1EC3 upload \u1EA3nh.","error"),toast(n?.error||n?.message||"Kh\xF4ng th\u1EC3 upload \u1EA3nh","error")}finally{t.target&&(t.target.value="")}}}const UNSAFE_PASTE_STYLE_PROPS=/^(white-space|width|min-width|max-width|height|min-height|max-height|overflow(-x|-y)?|position|display|float|clear|transform|writing-mode|contain)$/i;function stripUnsafePasteStyles(t){t.querySelectorAll("[style]").forEach(e=>{e.style.whiteSpace="",e.style.width="",e.style.minWidth="",e.style.maxWidth="",e.style.height="",e.style.minHeight="",e.style.maxHeight="",e.style.overflow="",e.style.position="",e.style.display="",e.style.float="",e.style.clear="",e.style.transform="",e.style.writingMode="",Array.from(e.style).forEach(n=>{UNSAFE_PASTE_STYLE_PROPS.test(n)&&e.style.removeProperty(n)}),e.getAttribute("style")||e.removeAttribute("style")})}function normalizePastedTables(t){t.querySelectorAll("table").forEach(e=>{if(!e.classList.contains("editor-table")&&(e.classList.add("editor-table"),e.style.width||(e.style.width="100%"),!e.querySelector(":scope > colgroup"))){const n=getTableColCount(e)||1,i=document.createElement("colgroup"),o=Math.floor(100/n);for(let s=0;s<n;s++){const a=s===n-1?100-o*(n-1):o,r=document.createElement("col");r.style.width=a+"%",i.appendChild(r)}e.insertBefore(i,e.firstChild)}})}async function handleComposerPaste(t){const e=_keepFormatOnNextPaste;if(e){_keepFormatOnNextPaste=!1;const l=document.getElementById("paste-keepformat-toggle");l&&l.classList.remove("is-active"),setComposerStatus("So\u1EA1n n\u1ED9i dung trong m\u1ED9t khung duy nh\u1EA5t. \u1EA2nh s\u1EBD \u0111\u01B0\u1EE3c ch\xE8n inline v\xE0 khi l\u01B0u s\u1EBD t\u1EF1 parse th\xE0nh text/image blocks.")}const n=Array.from(t.clipboardData?.files||[]).filter(l=>l.type.startsWith("image/"));if(n.length){t.preventDefault(),saveComposerRange(),await onComposerImageSelected({target:{files:n,value:""}});return}const i=t.clipboardData?.getData("text/html"),o=t.clipboardData?.getData("text/plain");if(!i&&!o||(t.preventDefault(),!window.getSelection()?.rangeCount))return;let a;if(i&&e){const l=document.createElement("div");l.innerHTML=sanitizeBlockHtml(i),l.querySelectorAll("[contenteditable]").forEach(c=>c.removeAttribute("contenteditable")),l.querySelectorAll(".document-editor-image-remove, .document-editor-image-resize, .editor-table-resize-handle, .tbl-col-resize-handle, .tbl-row-resize-handle").forEach(c=>c.remove()),l.querySelectorAll(".document-editor-image-token[data-block-id]").forEach(c=>c.removeAttribute("data-block-id")),l.querySelectorAll(".editor-table-wrap").forEach(c=>c.replaceWith(...c.childNodes)),stripUnsafePasteStyles(l),normalizePastedTables(l),a=l.innerHTML}else a=(o||(()=>{const d=document.createElement("div");return d.innerHTML=i||"",d.textContent||""})()).replace(/\r/g,"").split(`
`).map(d=>escapeHtml(d)).join("<br>");document.execCommand("insertHTML",!1,a);const r=document.getElementById("content-composer-host");r&&(normalizeIndentTokensInElement(r),bindTableEditorEvents(r)),syncContentBlocksFromEditor(),saveComposerRange()}async function showQuestionDetail({id:t}){setLoading("\u0110ang t\u1EA3i \u0111\u1EC1...");const e=routeToken();try{const n=await api.get(`/questions/${t}`);if(routeChanged(e))return;renderQuestionDetail(n)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i \u0111\u1EC1: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c \u0111\u1EC1",n,`/questions/${t}`)}}function skillEditorHtml(t,e={}){const{composerHints:n={},writingHintBox:i="",speakingHintBox:o="",audioExtraHint:s="",scriptValue:a="",scriptPlaceholder:r="",scriptRows:l=8,scriptLabelExtra:c="",scriptTrailingHint:d="",includeSttSelector:u=!0,includeScriptLoading:m=!0,includeSpeakerRename:h=!0,includeLocationHint:g=!0,includeVocab:f=!0}=e;return t==="reading"?`
      ${contentComposerHtml("N\u1ED9i dung \u0111\u1EC1 (B\xE0i \u0111\u1ECDc + C\xE2u h\u1ECFi)",n.reading)}
      ${g?'<div id="location-pick-hint" class="location-pick-hint hidden"></div>':""}
      ${answerGridHtml()}
      ${f?vocabSectionHtml():""}`:t==="listening"?`
      <div class="form-group">
        <label class="form-label">File Audio <span style="color:var(--danger)">*</span></label>
        ${audioUploadHtml()}
        ${s}
      </div>
      <div class="form-group" id="script-section">
        <label class="form-label">Script Listening${c}</label>
        ${u?sttSelectorHtml():""}
        ${m?'<div id="script-loading" class="script-loading hidden"><span class="btn-spinner btn-spinner--dark"></span> <span id="script-loading-msg">\u0110ang tr\xEDch xu\u1EA5t script...</span></div>':""}
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="${l}"
          placeholder="${escapeHtml(r)}">${escapeHtml(a)}</textarea>
        ${h?speakerRenameSectionHtml():""}
        ${d}
      </div>
      ${contentComposerHtml("C\xE2u h\u1ECFi (text)",n.listeningQuestion)}
      ${g?'<div id="location-pick-hint" class="location-pick-hint hidden"></div>':""}
      ${answerGridHtml()}
      ${f?vocabSectionHtml():""}`:t==="writing"?`${contentComposerHtml("\u0110\u1EC1 b\xE0i Writing",n.writing)}${i}`:t==="speaking"?`${contentComposerHtml("C\xE2u h\u1ECFi / Cue Card",n.speaking)}${o}`:""}function renderQuestionDetail(t){_audioFile=null,_editingVocabIndex=-1,_vocabItems=Array.isArray(t.vocabulary)?[...t.vocabulary]:[];let e="";if(t.skill==="composite")_cqSections=Array.isArray(t.sections)?t.sections.map(o=>({label:o.label||"",skill:o.skill||"",time_limit_minutes:o.time_limit_minutes??null,questions_data:o.questions_data||[],content_blocks:o.content_blocks||[],content_text:o.content_text||"",content_url:o.content_url||null,content_urls:o.content_urls||[],script:o.script||"",vocabulary:o.vocabulary||[],_id:o.id})):[],_cqEditingIdx=-1,e='<div id="cq-sections-ui"></div>';else if(t.skill==="reading")e=skillEditorHtml("reading",{composerHints:{reading:"So\u1EA1n n\u1ED9i dung d\u1EA1ng text, v\xE0 ch\xE8n \u1EA3nh v\xE0o gi\u1EEFa khi c\u1EA7n. Location ch\u1EC9 \xE1p d\u1EE5ng cho ph\u1EA7n text."}});else if(t.skill==="listening"){const o=Array.isArray(t.content_urls)&&t.content_urls.length>0?t.content_urls:t.content_url?[{url:t.content_url,name:"",key:null}]:[];_audioSlots=o.length>0?o.map(s=>({..._newAudioSlot(),displayName:s.name||"",name:s.filename||s.name||"audio",url:s.url||null,key:s.key||null,status:"done",transcript:null})):[_newAudioSlot()],_audioFiles=_audioSlots,e=skillEditorHtml("listening",{composerHints:{listeningQuestion:"B\u1EA1n c\xF3 th\u1EC3 ch\xE8n \u1EA3nh minh ho\u1EA1 ho\u1EB7c b\u1EA3ng c\xE2u h\u1ECFi v\xE0o gi\u1EEFa c\xE1c \u0111o\u1EA1n text."},audioExtraHint:'<div class="form-hint">B\u1EA5m \u201C\u0110\u1ED5i file\u201D \u0111\u1EC3 thay, \u201C\xD7\u201D \u0111\u1EC3 xo\xE1 b\u1EDBt, \u201C+ Th\xEAm file audio\u201D \u0111\u1EC3 th\xEAm. \u0110\u1EC1 Listening c\u1EA7n \xEDt nh\u1EA5t 1 file audio.</div>',scriptLabelExtra:'<span style="font-size:12px;font-weight:400;color:var(--gray-400)"> \u2014 t\u1EF1 \u0111\u1ED9ng tr\xEDch xu\u1EA5t sau khi upload audio, c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa</span>',scriptValue:t.script||"",scriptPlaceholder:"Script listening...",scriptRows:8,scriptTrailingHint:'<div class="form-hint">H\u1ECDc sinh xem script sau khi n\u1ED9p b\xE0i. B\xF4i ch\u1ECDn text \u1EDF \u0111\xE2y \u0111\u1EC3 set Location cho \u0111\xE1p \xE1n.</div>'})}else t.skill==="writing"?e=skillEditorHtml("writing",{composerHints:{writing:"D\xF9ng text l\xE0m n\u1EC1n ch\xEDnh v\xE0 ch\xE8n chart/diagram/image v\xE0o \u0111\xFAng v\u1ECB tr\xED mong mu\u1ED1n."}}):t.skill==="speaking"&&(e=skillEditorHtml("speaking",{composerHints:{speaking:"B\u1EA1n c\xF3 th\u1EC3 ch\xE8n \u1EA3nh ho\u1EB7c cue card visual v\xE0o gi\u1EEFa n\u1ED9i dung."}}));if($("#app").innerHTML=`
    <a class="back-link" onclick="navigate('/questions')">\u2190 Kho \u0111\u1EC1</a>
    <div class="page-header">
      <div class="page-title">Xem / S\u1EEDa \u0111\u1EC1</div>
    </div>
    <div class="form-card">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Ti\xEAu \u0111\u1EC1 \u0111\u1EC1 thi <span style="color:var(--danger)">*</span></label>
          <input id="q-title" class="form-input" value="${escapeHtml(t.title)}" />
        </div>
        <div class="form-group">
          <label class="form-label">K\u1EF9 n\u0103ng</label>
          <select id="q-skill" class="form-select" disabled>
            <option value="reading"   ${t.skill==="reading"?"selected":""}>\u{1F4D6} Reading</option>
            <option value="listening" ${t.skill==="listening"?"selected":""}>\u{1F3A7} Listening</option>
            <option value="writing"   ${t.skill==="writing"?"selected":""}>\u270D\uFE0F Writing</option>
            <option value="speaking"  ${t.skill==="speaking"?"selected":""}>\u{1F3A4} Speaking</option>
            <option value="composite" ${t.skill==="composite"?"selected":""}>\u{1F4CB} T\u1ED5ng h\u1EE3p</option>
          </select>
          <div class="form-hint">K\u1EF9 n\u0103ng kh\xF4ng th\u1EC3 thay \u0111\u1ED5i sau khi t\u1EA1o.</div>
        </div>
      </div>
      <div id="skill-section" class="skill-section">${e}</div>
      <div class="form-group" style="margin-top:20px">
        <label class="form-label">Tags <span style="font-size:12px;font-weight:400;color:var(--gray-400)">(t\xF9y ch\u1ECDn \u2014 ph\xE2n lo\u1EA1i \u0111\u1EC1 theo ch\u1EE7 \u0111\u1EC1, level, ngu\u1ED3n...)</span></label>
        <div id="q-tags-chip-edit" class="chip-input-container">
          <input id="q-tag-input-edit" class="chip-input" placeholder="Nh\u1EADp tag r\u1ED3i Enter..." />
        </div>
      </div>
      <div style="margin-top:24px;display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-outline" onclick="navigate('/questions')">H\u1EE7y</button>
        <button class="btn btn-primary" onclick="submitQuestionEdit('${t.id}', this)">
          \u{1F4BE} L\u01B0u thay \u0111\u1ED5i
        </button>
      </div>
    </div>`,(t.skill==="reading"||t.skill==="listening")&&t.questions_data?.length>0&&renderAnswerGridWithData(t.questions_data),Array.isArray(t.tags)&&t.tags.length>0){const o=$("#q-tags-chip-edit"),s=$("#q-tag-input-edit");if(o&&s)for(const a of t.tags){const r=document.createElement("span");r.className="chip",r.dataset.value=a,r.innerHTML=`${escapeHtml(a)} <button type="button" class="chip-remove">\xD7</button>`,r.querySelector(".chip-remove").onclick=()=>r.remove(),o.insertBefore(r,s)}}if(t.skill==="composite"){renderCQSectionsUI(),attachChipListeners();return}(t.skill==="reading"||t.skill==="listening")&&(renderVocabList(),syncVocabEditorState()),t.skill==="listening"&&(_speakerNames=[],_refreshSpeakerNames(),_renderSpeakerRenameUI()),attachChipListeners(),initContentComposer(t.content_blocks,t.content_text||""),t.skill==="listening"&&_renderAudioSlots();const n=$("#answer-count");n&&(t.questions_data?.length>0&&(n.value=t.questions_data.length),n.addEventListener("input",()=>{const o=parseInt(n.value)||0;o>0&&o<=100&&renderAnswerGrid(o)}));const i=restoreQuestionDraftIntoForm("edit",t.id,t.skill);startQuestionDraftAutosave("edit",t.id,t.skill),syncVocabEditorState(),i&&toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p ch\u01B0a l\u01B0u trong 15 ph\xFAt g\u1EA7n nh\u1EA5t.","info")}function renderAnswerGridWithData(t){const e=$("#answer-grid");if(!e)return;const n=$("#answer-count");n&&(n.value=t.length),e.innerHTML="",t.forEach((i,o)=>{e.appendChild(_createAnswerRow(o+1,i))}),attachChipListeners()}async function submitQuestionEdit(t,e){const n=$("#q-title")?.value.trim(),i=$("#q-skill")?.value;if(!n){toast("Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1","error");return}const o=getChipValues($("#q-tags-chip-edit"));if(i==="composite"){if(_saveCQCurrentEditorState(),_cqEditingIdx>=0){toast("Vui l\xF2ng l\u01B0u ph\u1EA7n \u0111ang ch\u1EC9nh s\u1EEDa tr\u01B0\u1EDBc","warning");return}if(_cqSections.length===0){toast("Vui l\xF2ng th\xEAm \xEDt nh\u1EA5t 1 ph\u1EA7n thi","error");return}for(let l=0;l<_cqSections.length;l++){if(!_cqSections[l].label.trim()){toast(`Ph\u1EA7n ${l+1}: Ch\u01B0a \u0111\u1EB7t t\xEAn`,"error");return}if(!_cqSections[l].skill){toast(`Ph\u1EA7n ${l+1}: Ch\u01B0a ch\u1ECDn k\u1EF9 n\u0103ng`,"error");return}}btnLoading(e);try{await api.patch(`/questions/${t}`,{title:n,tags:o,sections:_cqSections.map(l=>({_id:l._id||null,label:l.label,skill:l.skill,time_limit_minutes:l.time_limit_minutes||null,questions_data:l.questions_data||[],content_blocks:l.content_blocks||[],content_text:l.content_text||null,content_url:l.content_url||null,content_urls:l.content_urls||[],script:l.script||null}))}),toast("\u0110\xE3 l\u01B0u thay \u0111\u1ED5i! \u2713"),navigate("/questions")}catch(l){btnReset(e),toast("L\u1ED7i l\u01B0u: "+(l.error||l.message),"error")}return}if(_contentImageUploadCount>0){toast("\u1EA2nh \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}if(i==="listening"){if(_audioUploading){toast("Audio v\u1EABn \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}if(_audioSlots.filter(l=>l.status==="done").length===0){toast("\u0110\u1EC1 Listening c\u1EA7n \xEDt nh\u1EA5t 1 file audio","error");return}}syncContentBlocksFromEditor();const s=normalizeContentBlocksForEditor(_contentBlocks),a=blocksToPlainText(s)||null;let r=[];if(i==="reading"||i==="listening"){r=collectAnswerGrid();const l=checkEmptyAnswers();if(l.length>0){confirmSaveWithEmptyAnswers(l,()=>submitQuestionEdit(t,e));return}}btnLoading(e);try{await api.patch(`/questions/${t}`,{title:n,content_text:a,content_blocks:s,questions_data:r,vocabulary:_vocabItems,tags:o,...i==="listening"?(()=>{const l=_audioSlots.filter(c=>c.status==="done");return{script:($("#listening-script")?.value||"").trim()||null,content_url:l[0]?.url||null,content_upload_key:l[0]?.key||null,content_urls:l.map(c=>({url:c.url,key:c.key,name:c.displayName||c.name,filename:c.name}))}})():{}}),stopQuestionDraftAutosave(),clearQuestionDraft(getQuestionDraftKey("edit",t)),toast("\u0110\xE3 l\u01B0u thay \u0111\u1ED5i! \u2713"),navigate("/questions")}catch(l){btnReset(e),toast("L\u1ED7i l\u01B0u: "+(l.error||l.message),"error")}}function _newAudioSlot(){return{displayName:"",file:null,name:"",size:0,status:"idle",url:null,key:null,pct:0,eta:null,transcript:void 0}}let _audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioUploading=!1,_scriptTranscribing=!1,_sttModel="mini",_speakerNames=[],_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_vocabItems=[],_editingVocabIndex=-1,_pendingLocationRow=null;function vocabSectionHtml(){return`
    <div class="form-group" style="margin-top:20px">
      <label class="form-label">T\u1EEB v\u1EF1ng <span style="font-size:12px;font-weight:400;color:var(--gray-400)">(t\xF9y ch\u1ECDn \u2014 h\u1ECDc sinh xem sau khi n\u1ED9p b\xE0i)</span></label>
      <div class="vocab-add-row">
        <input id="vocab-word"    class="form-input" aria-label="T\u1EEB v\u1EF1ng" placeholder="T\u1EEB v\u1EF1ng"         style="flex:1;min-width:0" />
        <input id="vocab-def"     class="form-input" aria-label="\u0110\u1ECBnh ngh\u0129a" placeholder="\u0110\u1ECBnh ngh\u0129a"       style="flex:2;min-width:0" />
        <input id="vocab-pronunciation" class="form-input" aria-label="Phi\xEAn \xE2m" placeholder="Phi\xEAn \xE2m (t\xF9y ch\u1ECDn)" style="flex:1.5;min-width:0" />
        <input id="vocab-collocation" class="form-input" aria-label="Collocation" placeholder="Collocation (t\xF9y ch\u1ECDn)" style="flex:2;min-width:0" />
        <input id="vocab-example" class="form-input" aria-label="V\xED d\u1EE5" placeholder="V\xED d\u1EE5 (t\xF9y ch\u1ECDn)" style="flex:2;min-width:0" />
        <button id="vocab-submit-btn" class="btn btn-primary btn-sm" onclick="addVocabItem()">+ Th\xEAm</button>
        <button id="vocab-cancel-btn" class="btn btn-outline btn-sm hidden" onclick="cancelVocabEdit()">H\u1EE7y s\u1EEDa</button>
      </div>
      ${vocabImportBoxHtml()}
      <div class="vocab-list-heading">Danh s\xE1ch t\u1EEB v\u1EF1ng</div>
      <div id="vocab-list" class="vocab-list"></div>
    </div>`}const ANSWER_IMPORT_AI_PROMPT=`T\u1EA1o gi\xFAp t\xF4i 1 file CSV \u0111\u1EC3 t\xF4i download v\u1EC1 v\xE0 \u0111\u1EC3 import \u0111\xE1p \xE1n v\xE0o h\u1EC7 th\u1ED1ng, v\u1EDBi \u0111\xFAng 4 c\u1ED9t theo th\u1EE9 t\u1EF1 sau: STT, \u0110\xE1p \xE1n, Gi\u1EA3i th\xEDch, Location
Y\xEAu c\u1EA7u:
- STT: s\u1ED1 th\u1EE9 t\u1EF1 c\xE2u h\u1ECFi, b\u1EAFt \u0111\u1EA7u t\u1EEB 1, t\u0103ng d\u1EA7n li\xEAn t\u1EE5c.
- \u0110\xE1p \xE1n: \u0111\xE1p \xE1n \u0111\xFAng c\u1EE7a c\xE2u \u0111\xF3. N\u1EBFu c\xF3 nhi\u1EC1u c\xE1ch vi\u1EBFt \u0111\u1EC1u \u0111\u01B0\u1EE3c ch\u1EA5p nh\u1EADn (vd TRUE/true, ho\u1EB7c c\xE1c c\xE1ch di\u1EC5n \u0111\u1EA1t kh\xE1c nhau c\u1EE7a c\xF9ng 1 \u0111\xE1p \xE1n), li\u1EC7t k\xEA c\xE1ch nhau b\u1EDFi d\u1EA5u "|". Kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.
- Gi\u1EA3i th\xEDch: gi\u1EA3i th\xEDch ng\u1EAFn g\u1ECDn v\xEC sao \u0111\xE1p \xE1n \u0111\xF3 \u0111\xFAng, d\u1EF1a v\xE0o b\xE0i \u0111\u1ECDc/script.
- Location: PH\u1EA2I l\xE0 m\u1ED9t \u0111o\u1EA1n tr\xEDch d\u1EABn NGUY\xCAN V\u0102N (copy ch\xEDnh x\xE1c c\u1EE5m t\u1EEB, kh\xF4ng di\u1EC5n gi\u1EA3i l\u1EA1i, kh\xF4ng d\u1ECBch) l\u1EA5y tr\u1EF1c ti\u1EBFp t\u1EEB b\xE0i \u0111\u1ECDc/audio script t\xF4i cung c\u1EA5p b\xEAn d\u01B0\u1EDBi \u2014 l\xE0 \u0111o\u1EA1n ch\u1EE9a b\u1EB1ng ch\u1EE9ng cho \u0111\xE1p \xE1n \u0111\xF3. Kh\xF4ng t\u1EF1 b\u1ECBa c\xE2u kh\xF4ng c\xF3 trong b\xE0i. \u01AFu ti\xEAn tr\xEDch \u0111\u1EE7 d\xE0i (5-15 t\u1EEB li\xEAn t\u1EE5c) \u0111\u1EC3 tr\xE1nh tr\xF9ng v\u1EDBi ch\u1ED7 kh\xE1c trong b\xE0i.
- D\xF9ng d\u1EA5u ph\u1EA9y (,) l\xE0m ng\u0103n c\xE1ch c\u1ED9t, b\u1ECDc trong d\u1EA5u ngo\u1EB7c k\xE9p "..." n\u1EBFu n\u1ED9i dung \xF4 c\xF3 ch\u1EE9a d\u1EA5u ph\u1EA9y ho\u1EB7c xu\u1ED1ng d\xF2ng.
- Xu\u1EA5t k\u1EBFt qu\u1EA3 d\u01B0\u1EDBi d\u1EA1ng code block CSV (kh\xF4ng k\xE8m gi\u1EA3i th\xEDch th\xEAm), d\xF2ng \u0111\u1EA7u l\xE0 header: STT,\u0110\xE1p \xE1n,Gi\u1EA3i th\xEDch,Location

--- D\xE1n b\xE0i \u0111\u1ECDc / audio script v\xE0o \u0111\xE2y ---
`,VOCAB_IMPORT_AI_PROMPT=`T\u1EA1o gi\xFAp t\xF4i 1 file CSV \u0111\u1EC3 t\xF4i download v\u1EC1 v\xE0 import t\u1EEB v\u1EF1ng v\xE0o h\u1EC7 th\u1ED1ng, v\u1EDBi \u0111\xFAng 5 c\u1ED9t theo th\u1EE9 t\u1EF1 sau: word, definition, pronunciation, collocation, example
Y\xEAu c\u1EA7u:
- word: t\u1EEB v\u1EF1ng ti\u1EBFng Anh, kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.
- definition: ngh\u0129a/\u0111\u1ECBnh ngh\u0129a ng\u1EAFn g\u1ECDn c\u1EE7a t\u1EEB, kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.
- pronunciation: phi\xEAn \xE2m IPA c\u1EE7a t\u1EEB (\u0111\u1EC3 tr\u1ED1ng n\u1EBFu kh\xF4ng ch\u1EAFc, \u0111\u1EEBng b\u1ECBa).
- collocation: 1-2 c\u1EE5m t\u1EEB \u0111i k\xE8m ph\u1ED5 bi\u1EBFn v\u1EDBi t\u1EEB n\xE0y (c\xF3 th\u1EC3 \u0111\u1EC3 tr\u1ED1ng).
- example: 1 c\xE2u v\xED d\u1EE5 d\xF9ng t\u1EEB n\xE0y, \u01B0u ti\xEAn l\u1EA5y ho\u1EB7c ph\u1ECFng theo ng\u1EEF c\u1EA3nh trong b\xE0i \u0111\u1ECDc/audio script b\xEAn d\u01B0\u1EDBi (c\xF3 th\u1EC3 \u0111\u1EC3 tr\u1ED1ng).
- Ch\u1EC9 ch\u1ECDn nh\u1EEFng t\u1EEB TH\u1EF0C S\u1EF0 xu\u1EA5t hi\u1EC7n trong b\xE0i \u0111\u1ECDc/audio script t\xF4i cung c\u1EA5p b\xEAn d\u01B0\u1EDBi, \u01B0u ti\xEAn t\u1EEB v\u1EF1ng band 6.5 tr\u1EDF l\xEAn ho\u1EB7c t\u1EEB h\u1ECDc thu\u1EADt/chuy\xEAn ng\xE0nh, kh\xF4ng ch\u1ECDn t\u1EEB qu\xE1 c\u01A1 b\u1EA3n.
- D\xF9ng d\u1EA5u ph\u1EA9y (,) l\xE0m ng\u0103n c\xE1ch c\u1ED9t, b\u1ECDc trong d\u1EA5u ngo\u1EB7c k\xE9p "..." n\u1EBFu n\u1ED9i dung \xF4 c\xF3 ch\u1EE9a d\u1EA5u ph\u1EA9y ho\u1EB7c xu\u1ED1ng d\xF2ng.
- Xu\u1EA5t k\u1EBFt qu\u1EA3 d\u01B0\u1EDBi d\u1EA1ng code block CSV (kh\xF4ng k\xE8m gi\u1EA3i th\xEDch th\xEAm), d\xF2ng \u0111\u1EA7u l\xE0 header: word,definition,pronunciation,collocation,example

--- D\xE1n b\xE0i \u0111\u1ECDc / audio script v\xE0o \u0111\xE2y ---
`;function showAiPromptHelper(t){openModal(t==="vocab"?"\u2728 Prompt t\u1EA1o CSV t\u1EEB v\u1EF1ng b\u1EB1ng AI":"\u2728 Prompt t\u1EA1o CSV \u0111\xE1p \xE1n b\u1EB1ng AI",`
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="font-size:13px;color:var(--text-muted)">Sao ch\xE9p prompt n\xE0y, d\xE1n v\xE0o ChatGPT/Claude k\xE8m theo b\xE0i \u0111\u1ECDc ho\u1EB7c audio script c\u1EE7a b\u1EA1n, r\u1ED3i t\u1EA3i file CSV m\xE0 AI tr\u1EA3 v\u1EC1 v\xE0 import v\xE0o \u0111\xE2y.</div>
      <textarea id="ai-prompt-helper-text" class="form-textarea" rows="14" readonly style="font-family:ui-monospace,monospace;font-size:12px;white-space:pre-wrap">${escapeHtml(t==="vocab"?VOCAB_IMPORT_AI_PROMPT:ANSWER_IMPORT_AI_PROMPT)}</textarea>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
        <button type="button" class="btn btn-primary" onclick="copyAiPromptHelperText()">\u{1F4CB} Sao ch\xE9p to\xE0n b\u1ED9</button>
      </div>
    </div>
  `)}window.showAiPromptHelper=showAiPromptHelper;async function copyAiPromptHelperText(){const t=document.getElementById("ai-prompt-helper-text");if(t)try{await navigator.clipboard.writeText(t.value),toast("\u0110\xE3 sao ch\xE9p prompt! D\xE1n v\xE0o ChatGPT/Claude \u0111\u1EC3 d\xF9ng.","success")}catch{t.removeAttribute("readonly"),t.focus(),t.select(),document.execCommand("copy"),t.setAttribute("readonly",""),toast("\u0110\xE3 sao ch\xE9p prompt!","success")}}window.copyAiPromptHelperText=copyAiPromptHelperText;function vocabImportBoxHtml(){return`
    <div class="pdf-import-box" style="margin-top:10px">
      <div class="pdf-import-head">
        <div>
          <div class="pdf-import-title">\u{1F4E5} Ho\u1EB7c import t\u1EEB file Excel/CSV</div>
          <div class="pdf-import-sub">L\u1EA5y sheet \u0111\u1EA7u ti\xEAn, d\xF2ng \u0111\u1EA7u l\xE0 t\xEAn c\u1ED9t ti\u1EBFng Anh: word, definition (b\u1EAFt bu\u1ED9c), pronunciation, collocation, example (t\xF9y ch\u1ECDn).</div>
          <button type="button" onclick="showAiPromptHelper('vocab')" style="margin-top:4px;background:none;border:none;color:var(--primary);font-size:12px;font-weight:600;cursor:pointer;padding:0">\u2728 G\u1EE3i \xFD prompt t\u1EA1o CSV b\u1EB1ng AI</button>
        </div>
        <div class="pdf-import-area" role="button" tabindex="0" aria-label="Upload Excel/CSV" onclick="if(event.target.tagName!=='INPUT')$('#vocab-file-input').click()">
          <input id="vocab-file-input" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onchange="handleVocabFileImport(this)" />
          <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation();$('#vocab-file-input').click()">Ch\u1ECDn file</button>
          <span class="pdf-import-meta">Excel (.xlsx/.xls) ho\u1EB7c CSV</span>
        </div>
      </div>
      <div id="vocab-import-status" class="pdf-import-status">Ch\u01B0a c\xF3 file n\xE0o \u0111\u01B0\u1EE3c import.</div>
    </div>`}function syncVocabEditorState(){const t=$("#vocab-submit-btn"),e=$("#vocab-cancel-btn");t&&(t.textContent=_editingVocabIndex>=0?"L\u01B0u s\u1EEDa":"+ Th\xEAm"),e&&e.classList.toggle("hidden",_editingVocabIndex<0)}function resetVocabInputs(){$("#vocab-word")&&($("#vocab-word").value=""),$("#vocab-def")&&($("#vocab-def").value=""),$("#vocab-pronunciation")&&($("#vocab-pronunciation").value=""),$("#vocab-collocation")&&($("#vocab-collocation").value=""),$("#vocab-example")&&($("#vocab-example").value="")}function cancelVocabEdit(){_editingVocabIndex=-1,resetVocabInputs(),syncVocabEditorState(),scheduleQuestionDraftSave()}function addVocabItem(){const t=$("#vocab-word")?.value.trim(),e=$("#vocab-def")?.value.trim(),n=$("#vocab-pronunciation")?.value.trim()||"",i=$("#vocab-collocation")?.value.trim()||"",o=$("#vocab-example")?.value.trim()||"";if(!t||!e){toast("Nh\u1EADp t\u1EEB v\u1EF1ng v\xE0 \u0111\u1ECBnh ngh\u0129a","warning");return}const s={word:t,definition:e,...n&&{pronunciation:n},...i&&{collocation:i},...o&&{example:o}};_editingVocabIndex>=0&&_vocabItems[_editingVocabIndex]?_vocabItems[_editingVocabIndex]=s:_vocabItems.push(s),_editingVocabIndex=-1,resetVocabInputs(),renderVocabList(),syncVocabEditorState(),scheduleQuestionDraftSave()}function removeVocabItem(t){_vocabItems.splice(t,1),_editingVocabIndex===t?(_editingVocabIndex=-1,resetVocabInputs()):_editingVocabIndex>t&&(_editingVocabIndex-=1),renderVocabList(),syncVocabEditorState(),scheduleQuestionDraftSave()}function editVocabItem(t){const e=_vocabItems[t];if(!e)return;_editingVocabIndex=t,$("#vocab-word")&&($("#vocab-word").value=e.word||""),$("#vocab-def")&&($("#vocab-def").value=e.definition||""),$("#vocab-pronunciation")&&($("#vocab-pronunciation").value=e.pronunciation||""),$("#vocab-collocation")&&($("#vocab-collocation").value=e.collocation||""),$("#vocab-example")&&($("#vocab-example").value=e.example||""),syncVocabEditorState();const n=$("#vocab-word");n?.closest(".vocab-add-row")?.scrollIntoView({behavior:"smooth",block:"center"}),n?.focus(),scheduleQuestionDraftSave()}function renderVocabList(){const t=$("#vocab-list");if(t){if(_vocabItems.length===0){t.innerHTML='<div style="color:var(--gray-400);font-size:12px;padding:8px 0">Ch\u01B0a c\xF3 t\u1EEB v\u1EF1ng n\xE0o.</div>';return}t.innerHTML=_vocabItems.map((e,n)=>`
    <div class="vocab-item">
      <span class="vocab-word">${escapeHtml(e.word)}</span>
      <span class="vocab-def">${escapeHtml(e.definition)}</span>
      ${e.pronunciation?`<span class="vocab-pronunciation">${escapeHtml(e.pronunciation)}</span>`:""}
      ${e.collocation?`<span class="vocab-collocation">${escapeHtml(e.collocation)}</span>`:""}
      ${e.example?`<span class="vocab-example">${escapeHtml(e.example)}</span>`:""}
      <div class="vocab-actions">
        <button class="vocab-edit" onclick="editVocabItem(${n})">S\u1EEDa</button>
        <button class="vocab-remove" onclick="removeVocabItem(${n})" aria-label="Xo\xE1 t\u1EEB v\u1EF1ng">\xD7</button>
      </div>
    </div>`).join("")}}let _xlsxLoadingPromise=null;function ensureXlsxLoaded(){return window.XLSX?Promise.resolve(window.XLSX):_xlsxLoadingPromise||(_xlsxLoadingPromise=new Promise((t,e)=>{const n=document.createElement("script");n.src="js/vendor/xlsx/xlsx.full.min.js",n.async=!0,n.onload=()=>t(window.XLSX),n.onerror=()=>{_xlsxLoadingPromise=null,e(new Error("Kh\xF4ng th\u1EC3 t\u1EA3i th\u01B0 vi\u1EC7n \u0111\u1ECDc Excel"))},document.head.appendChild(n)}),_xlsxLoadingPromise)}function parseVocabCsvText(t){const e=[];let n=[],i="",o=!1;for(let s=0;s<t.length;s++){const a=t[s];o?a==='"'?t[s+1]==='"'?(i+='"',s++):o=!1:i+=a:a==='"'?o=!0:a===","?(n.push(i),i=""):a==="\r"||(a===`
`?(n.push(i),i="",e.push(n),n=[]):i+=a)}return(i.length>0||n.length>0)&&(n.push(i),e.push(n)),e.filter(s=>s.some(a=>String(a).trim()!==""))}function vocabHeaderLevenshtein(t,e){const n=t.length,i=e.length;if(n===0)return i;if(i===0)return n;const o=Array.from({length:n+1},()=>new Array(i+1).fill(0));for(let s=0;s<=n;s++)o[s][0]=s;for(let s=0;s<=i;s++)o[0][s]=s;for(let s=1;s<=n;s++)for(let a=1;a<=i;a++)o[s][a]=t[s-1]===e[a-1]?o[s-1][a-1]:1+Math.min(o[s-1][a-1],o[s-1][a],o[s][a-1]);return o[n][i]}function mapHeadersByAliases(t,e,n){const i={};for(const s of Object.keys(e))i[s]=null;const o=new Set;return t.forEach((s,a)=>{const r=n(s);if(!r)return;let l=null,c=1/0;for(const[d,u]of Object.entries(e))if(!o.has(d))for(const m of u){const h=vocabHeaderLevenshtein(r,m);h<=1&&h<c&&(c=h,l=d)}l&&(i[l]=a,o.add(l))}),i}const VOCAB_FIELD_ALIASES={word:["word"],definition:["definition"],pronunciation:["pronunciation"],collocation:["collocation"],example:["example"]};function normalizeVocabHeader(t){return String(t??"").toLowerCase().trim().replace(/[^a-z]/g,"")}function mapVocabHeaders(t){return mapHeadersByAliases(t,VOCAB_FIELD_ALIASES,normalizeVocabHeader)}function setVocabImportStatus(t,e=""){const n=$("#vocab-import-status");n&&(n.className=`pdf-import-status${e?` is-${e}`:""}`,n.textContent=t)}async function handleVocabFileImport(t){const e=t?.files?.[0];if(t&&(t.value=""),!e)return;const n=(e.name.split(".").pop()||"").toLowerCase(),i=n==="csv"||e.type==="text/csv";if(!i&&!(n==="xlsx"||n==="xls")){setVocabImportStatus("Ch\u1EC9 h\u1ED7 tr\u1EE3 file .csv, .xlsx ho\u1EB7c .xls.","error"),toast("File kh\xF4ng h\u1EE3p l\u1EC7","error");return}setVocabImportStatus("\u0110ang \u0111\u1ECDc file...","loading");try{let s;if(i){const d=(await e.text()).replace(/^\uFEFF/,"");s=parseVocabCsvText(d)}else{const d=await ensureXlsxLoaded(),u=await e.arrayBuffer(),m=d.read(new Uint8Array(u),{type:"array"}),h=m.Sheets[m.SheetNames[0]];s=d.utils.sheet_to_json(h,{header:1,defval:"",raw:!1}).filter(g=>Array.isArray(g)&&g.some(f=>String(f).trim()!==""))}if(!s||s.length<2){setVocabImportStatus("File kh\xF4ng c\xF3 d\u1EEF li\u1EC7u (c\u1EA7n d\xF2ng ti\xEAu \u0111\u1EC1 + \xEDt nh\u1EA5t 1 d\xF2ng d\u1EEF li\u1EC7u).","error"),toast("File tr\u1ED1ng","error");return}const a=mapVocabHeaders(s[0]);if(a.word==null||a.definition==null){setVocabImportStatus('Kh\xF4ng t\xECm th\u1EA5y c\u1ED9t "word" v\xE0/ho\u1EB7c "definition" \u1EDF d\xF2ng ti\xEAu \u0111\u1EC1.',"error"),toast("Thi\u1EBFu c\u1ED9t b\u1EAFt bu\u1ED9c: word, definition","error");return}const r=[];let l=0;for(let d=1;d<s.length;d++){const u=s[d]||[],m=String(u[a.word]??"").trim(),h=String(u[a.definition]??"").trim();if(!m||!h){l++;continue}const g={word:m,definition:h};for(const f of["pronunciation","collocation","example"]){const w=a[f];if(w==null)continue;const y=String(u[w]??"").trim();y&&(g[f]=y)}r.push(g)}if(r.length===0){setVocabImportStatus("Kh\xF4ng c\xF3 d\xF2ng d\u1EEF li\u1EC7u h\u1EE3p l\u1EC7 (c\u1EA7n \u0111\u1EE7 word + definition).","error"),toast("Kh\xF4ng import \u0111\u01B0\u1EE3c d\xF2ng n\xE0o","error");return}_vocabItems.push(...r),renderVocabList(),scheduleQuestionDraftSave();const c=l>0?`, b\u1ECF qua ${l} d\xF2ng thi\u1EBFu d\u1EEF li\u1EC7u`:"";setVocabImportStatus(`\u0110\xE3 import ${r.length} t\u1EEB v\u1EF1ng t\u1EEB "${e.name}"${c}.`,"success"),toast(`\u0110\xE3 import ${r.length} t\u1EEB v\u1EF1ng`)}catch(s){console.error("Vocab import failed:",s);const a=s?.message||"Kh\xF4ng th\u1EC3 \u0111\u1ECDc file n\xE0y.";setVocabImportStatus(a,"error"),toast(a,"error")}}function showQuestionForm(){_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,_editingVocabIndex=-1,$("#app").innerHTML=`
    <a class="back-link" onclick="navigate('/questions')">\u2190 Kho \u0111\u1EC1</a>

    <div class="page-header">
      <div class="page-title">T\u1EA1o \u0111\u1EC1 m\u1EDBi</div>
    </div>

    <div class="form-card">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Ti\xEAu \u0111\u1EC1 \u0111\u1EC1 thi <span style="color:var(--danger)">*</span></label>
          <input id="q-title" class="form-input"
            placeholder="VD: CAM 18 Test 1 - Reading Passage 1" />
        </div>
        <div class="form-group">
          <label class="form-label">K\u1EF9 n\u0103ng <span style="color:var(--danger)">*</span></label>
          <select id="q-skill" class="form-select" onchange="onSkillChange(this.value)">
            <option value="">\u2014 Ch\u1ECDn k\u1EF9 n\u0103ng \u2014</option>
            <option value="reading">\u{1F4D6} Reading</option>
            <option value="listening">\u{1F3A7} Listening</option>
            <option value="writing">\u270D\uFE0F Writing</option>
            <option value="speaking">\u{1F3A4} Speaking</option>
            <option value="composite">\u{1F4CB} T\u1ED5ng h\u1EE3p (nhi\u1EC1u k\u1EF9 n\u0103ng)</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tags <span style="font-size:12px;font-weight:400;color:var(--gray-400)">(Enter \u0111\u1EC3 th\xEAm \u2014 VD: cam18, band-7, technology)</span></label>
        <div id="q-tags-chip" class="chip-input-container">
          <input id="q-tag-input" class="chip-input" placeholder="Nh\u1EADp tag r\u1ED3i Enter..." />
        </div>
      </div>

      <div id="skill-section" class="skill-section">
        <div style="text-align:center;padding:30px;color:var(--gray-400)">
          Ch\u1ECDn k\u1EF9 n\u0103ng \u0111\u1EC3 hi\u1EC3n th\u1ECB form nh\u1EADp \u0111\u1EC1
        </div>
      </div>

      <div style="margin-top:24px;display:flex;justify-content:flex-end;gap:10px">
        <button class="btn btn-outline" onclick="navigate('/questions')">H\u1EE7y</button>
        <button class="btn btn-primary" onclick="submitQuestion(this)">
          \u{1F4BE} L\u01B0u v\xE0o kho \u0111\u1EC1
        </button>
      </div>
    </div>`,attachChipListeners();const t=restoreQuestionDraftIntoForm("new");startQuestionDraftAutosave("new"),syncVocabEditorState(),t&&toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p ch\u01B0a l\u01B0u trong 15 ph\xFAt g\u1EA7n nh\u1EA5t.","info")}function onSkillChange(t){_vocabItems=[],_editingVocabIndex=-1,_contentBlocks=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,_scriptTranscribing=!1;const e=$("#skill-section");if(!t){e.innerHTML=`<div style="text-align:center;padding:30px;color:var(--gray-400)">
      Ch\u1ECDn k\u1EF9 n\u0103ng \u0111\u1EC3 hi\u1EC3n th\u1ECB form nh\u1EADp \u0111\u1EC1</div>`;return}if(t==="composite"){_cqSections=[],_cqEditingIdx=-1,renderCQSectionsUI();return}let n="";t==="reading"?n=skillEditorHtml("reading",{composerHints:{reading:"Copy/paste text nh\u01B0 b\xECnh th\u01B0\u1EDDng. Khi c\u1EA7n b\u1EA3ng ho\u1EB7c h\xECnh, h\xE3y ch\xE8n \u1EA3nh v\xE0o \u0111\xFAng v\u1ECB tr\xED gi\u1EEFa c\xE1c \u0111o\u1EA1n text."}}):t==="listening"?n=skillEditorHtml("listening",{composerHints:{listeningQuestion:"B\u1EA1n c\xF3 th\u1EC3 xen k\u1EBD text v\xE0 \u1EA3nh minh ho\u1EA1 / b\u1EA3ng c\xE2u h\u1ECFi trong c\xF9ng m\u1ED9t n\u1ED9i dung."},scriptPlaceholder:"Script s\u1EBD t\u1EF1 \u0111\u1ED9ng \u0111i\u1EC1n sau khi upload audio v2. B\u1EA1n c\u0169ng c\xF3 th\u1EC3 nh\u1EADp th\u1EE7 c\xF4ng.",scriptLabelExtra:'<span style="font-size:12px;font-weight:400;color:var(--gray-400)"> \u2014 t\u1EF1 \u0111\u1ED9ng tr\xEDch xu\u1EA5t sau khi upload audio, c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa</span>',scriptTrailingHint:'<div class="form-hint">H\u1ECDc sinh xem script sau khi n\u1ED9p b\xE0i. B\xF4i ch\u1ECDn text \u1EDF \u0111\xE2y \u0111\u1EC3 set Location cho \u0111\xE1p \xE1n.</div>'}):t==="writing"?n=skillEditorHtml("writing",{composerHints:{writing:"Nh\u1EADp \u0111\u1EC1 b\xE0i Task 1 ho\u1EB7c Task 2, v\xE0 ch\xE8n bi\u1EC3u \u0111\u1ED3 / h\xECnh minh ho\u1EA1 v\xE0o \u0111\xFAng v\u1ECB tr\xED n\u1EBFu c\u1EA7n."},writingHintBox:`<div style="padding:12px 16px;background:var(--primary-lt);border-radius:8px;font-size:13px;color:var(--primary-dk)">
        \u2139\uFE0F Writing l\xE0 t\u1EF1 lu\u1EADn \u2014 kh\xF4ng c\u1EA7n nh\u1EADp \u0111\xE1p \xE1n m\u1EABu.
      </div>`}):t==="speaking"&&(n=skillEditorHtml("speaking",{composerHints:{speaking:"Nh\u1EADp cue card d\u1EA1ng text v\xE0 ch\xE8n th\xEAm image n\u1EBFu mu\u1ED1n hi\u1EC3n th\u1ECB visual support cho h\u1ECDc sinh."},speakingHintBox:`<div style="padding:12px 16px;background:var(--primary-lt);border-radius:8px;font-size:13px;color:var(--primary-dk)">
        \u2139\uFE0F Speaking \u2014 h\u1ECDc sinh s\u1EBD upload file audio c\u1EE7a m\xECnh. Kh\xF4ng c\u1EA7n \u0111\xE1p \xE1n m\u1EABu.
      </div>`})),e.innerHTML=n,t==="listening"&&_renderAudioSlots(),initContentComposer([],"");const i=$("#answer-count");i&&i.addEventListener("input",()=>{const o=parseInt(i.value)||0;o>0&&o<=100&&renderAnswerGrid(o)})}function answerGridHtml(){return`
    <div class="form-group">
      <label class="form-label">\u0110\xE1p \xE1n</label>
      <div class="answer-grid-wrap">
        <div class="answer-count-row">
          <span style="font-size:13px;font-weight:600">S\u1ED1 c\xE2u h\u1ECFi:</span>
          <input id="answer-count" type="number" min="1" max="100" placeholder="VD: 13" />
          <span style="font-size:12px;color:var(--gray-400)">Nh\u1EADp s\u1ED1 r\u1ED3i b\u1EA5m Tab/Enter</span>
        </div>
        <div id="answer-grid" class="answer-grid">
          <div style="text-align:center;padding:16px;color:var(--gray-400);font-size:13px;grid-column:1/-1">
            Nh\u1EADp s\u1ED1 c\xE2u h\u1ECFi \u1EDF tr\xEAn \u0111\u1EC3 hi\u1EC3n th\u1ECB form \u0111\xE1p \xE1n
          </div>
        </div>
        <button type="button" class="btn-add-row" onclick="addAnswerRow()">+ Th\xEAm c\xE2u</button>
      </div>
      <div class="form-hint">M\u1ED7i c\xE2u c\xF3 th\u1EC3 c\xF3 nhi\u1EC1u \u0111\xE1p \xE1n ch\u1EA5p nh\u1EADn \u0111\u01B0\u1EE3c. G\xF5 \u0111\xE1p \xE1n r\u1ED3i nh\u1EA5n Enter.</div>
      ${answerImportBoxHtml()}
    </div>`}const ANSWER_FIELD_ALIASES={q_no:["stt","sott","qno","causo","socau","so"],answers:["dapan","answer","answers","dapanmau","correctanswer"],explanation:["giaithich","explanation","explain"],location:["location","vitri","position"]};function normalizeAnswerHeader(t){return String(t??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]/g,"")}function mapAnswerHeaders(t){return mapHeadersByAliases(t,ANSWER_FIELD_ALIASES,normalizeAnswerHeader)}function escapeRegExpChars(t){return String(t).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function buildFuzzyLocationRegex(t){const e=String(t).trim().split(/\s+/).filter(Boolean).map(escapeRegExpChars);if(!e.length)return null;try{return new RegExp(e.join("\\s+"),"i")}catch{return null}}function findReadingLocationMatch(t){const e=buildFuzzyLocationRegex(t);if(!e)return null;const n=document.querySelectorAll("#content-composer-preview-body .mixed-content-text[data-block-id]");for(const i of n){const o=e.exec(i.textContent||"");if(o){const s=o.index,a=s+o[0].length;return{text:o[0],meta:{type:"preview_text_range",start_block_id:i.dataset.blockId,end_block_id:i.dataset.blockId,start_offset:s,end_offset:a,text:o[0]}}}}return null}function findListeningLocationMatch(t){const e=document.getElementById("listening-script");if(!e)return null;const n=buildFuzzyLocationRegex(t);if(!n)return null;const i=n.exec(e.value||"");if(!i)return null;const o=i.index,s=o+i[0].length;return{text:i[0],meta:{type:"script_text_range",start:o,end:s,text:i[0]}}}function findAnswerLocationMatch(t){return document.getElementById("listening-script")?findListeningLocationMatch(t):findReadingLocationMatch(t)}function setAnswerRowChips(t,e){const n=t.querySelector(".chip-container");if(!n)return;n.querySelectorAll(".chip").forEach(o=>o.remove());const i=n.querySelector(".chip-input");for(const o of e){const s=String(o).trim();if(!s)continue;const a=document.createElement("span");a.className="chip",a.dataset.value=s,a.innerHTML=`${escapeHtml(s)} <button class="chip-remove" title="Xo\xE1" aria-label="Xo\xE1">\xD7</button>`,a.querySelector(".chip-remove").onclick=()=>a.remove(),n.insertBefore(a,i)}}function applyAnswerLocationToRow(t,e,n){const i=t.querySelector(".answer-location"),o=t.querySelector(".answer-location-meta"),s=t.querySelector(".location-text-display");i&&(i.value=e),o&&(o.value=JSON.stringify(n)),s&&(s.textContent=e),t.querySelector(".btn-clear-location")?.classList.remove("hidden")}function answerImportBoxHtml(){return`
    <div class="pdf-import-box" style="margin-top:10px">
      <div class="pdf-import-head">
        <div>
          <div class="pdf-import-title">\u{1F4E5} Import \u0111\xE1p \xE1n t\u1EEB Excel/CSV</div>
          <div class="pdf-import-sub">C\u1ED9t: STT, \u0110\xE1p \xE1n (nhi\u1EC1u \u0111\xE1p \xE1n c\xE1ch nhau b\u1EDFi | ho\u1EB7c ;), Gi\u1EA3i th\xEDch, Location (tr\xEDch nguy\xEAn v\u0103n t\u1EEB b\xE0i \u2014 kh\xF4ng c\u1EA7n kh\u1EDBp 100% kho\u1EA3ng tr\u1EAFng/hoa-th\u01B0\u1EDDng). Ch\u1EC9 \xE1p d\u1EE5ng cho c\xE1c c\xE2u \u0111\xE3 c\xF3 s\u1EB5n trong l\u01B0\u1EDBi \u1EDF tr\xEAn.</div>
          <button type="button" onclick="showAiPromptHelper('answer')" style="margin-top:4px;background:none;border:none;color:var(--primary);font-size:12px;font-weight:600;cursor:pointer;padding:0">\u2728 G\u1EE3i \xFD prompt t\u1EA1o CSV b\u1EB1ng AI</button>
        </div>
        <div class="pdf-import-area" role="button" tabindex="0" aria-label="Upload Excel/CSV" onclick="if(event.target.tagName!=='INPUT')$('#answer-file-input').click()">
          <input id="answer-file-input" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onchange="handleAnswerFileImport(this)" />
          <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation();$('#answer-file-input').click()">Ch\u1ECDn file</button>
          <span class="pdf-import-meta">Excel (.xlsx/.xls) ho\u1EB7c CSV</span>
        </div>
      </div>
      <div id="answer-import-status" class="pdf-import-status">Ch\u01B0a c\xF3 file n\xE0o \u0111\u01B0\u1EE3c import.</div>
    </div>`}function setAnswerImportStatus(t,e=""){const n=$("#answer-import-status");n&&(n.className=`pdf-import-status${e?` is-${e}`:""}`,n.textContent=t)}async function handleAnswerFileImport(t){const e=t?.files?.[0];if(t&&(t.value=""),!e)return;const n=(e.name.split(".").pop()||"").toLowerCase(),i=n==="csv"||e.type==="text/csv";if(!i&&!(n==="xlsx"||n==="xls")){setAnswerImportStatus("Ch\u1EC9 h\u1ED7 tr\u1EE3 file .csv, .xlsx ho\u1EB7c .xls.","error"),toast("File kh\xF4ng h\u1EE3p l\u1EC7","error");return}const s=document.querySelectorAll("#answer-grid .answer-row");if(!s.length){setAnswerImportStatus("Ch\u01B0a c\xF3 l\u01B0\u1EDBi \u0111\xE1p \xE1n \u2014 nh\u1EADp S\u1ED1 c\xE2u h\u1ECFi tr\u01B0\u1EDBc khi import.","error"),toast("Ch\u01B0a c\xF3 l\u01B0\u1EDBi \u0111\xE1p \xE1n","error");return}setAnswerImportStatus("\u0110ang \u0111\u1ECDc file...","loading");try{let a;if(i){const u=(await e.text()).replace(/^\uFEFF/,"");a=parseVocabCsvText(u)}else{const u=await ensureXlsxLoaded(),m=await e.arrayBuffer(),h=u.read(new Uint8Array(m),{type:"array"}),g=h.Sheets[h.SheetNames[0]];a=u.utils.sheet_to_json(g,{header:1,defval:"",raw:!1}).filter(f=>Array.isArray(f)&&f.some(w=>String(w).trim()!==""))}if(!a||a.length<2){setAnswerImportStatus("File kh\xF4ng c\xF3 d\u1EEF li\u1EC7u (c\u1EA7n d\xF2ng ti\xEAu \u0111\u1EC1 + \xEDt nh\u1EA5t 1 d\xF2ng d\u1EEF li\u1EC7u).","error"),toast("File tr\u1ED1ng","error");return}const r=mapAnswerHeaders(a[0]);if(r.q_no==null||r.answers==null){setAnswerImportStatus("Kh\xF4ng t\xECm th\u1EA5y c\u1ED9t STT v\xE0/ho\u1EB7c \u0110\xE1p \xE1n \u1EDF d\xF2ng ti\xEAu \u0111\u1EC1.","error"),toast("Thi\u1EBFu c\u1ED9t b\u1EAFt bu\u1ED9c: STT, \u0110\xE1p \xE1n","error");return}let l=0;const c=[];for(let u=1;u<a.length;u++){const m=a[u]||[],h=String(m[r.q_no]??"").trim(),g=parseInt(h,10);if(!g){c.push(`D\xF2ng ${u+1}: STT kh\xF4ng h\u1EE3p l\u1EC7 ("${h}")`);continue}const f=Array.from(s).find(C=>C.querySelector(".q-label")?.textContent===`Q${g}`);if(!f){c.push(`C\xE2u ${g}: kh\xF4ng t\u1ED3n t\u1EA1i trong l\u01B0\u1EDBi \u0111\xE1p \xE1n`);continue}const w=String(m[r.answers]??"").trim(),y=splitDelimitedList(w,/[|;]/);if(!y.length){c.push(`C\xE2u ${g}: thi\u1EBFu \u0111\xE1p \xE1n`);continue}if(setAnswerRowChips(f,y),r.explanation!=null){const C=String(m[r.explanation]??"").trim(),E=f.querySelector(".answer-explanation");E&&(E.value=C)}if(r.location!=null){const C=String(m[r.location]??"").trim();if(C){const E=findAnswerLocationMatch(C);E?applyAnswerLocationToRow(f,E.text,E.meta):c.push(`C\xE2u ${g}: kh\xF4ng t\xECm th\u1EA5y v\u1ECB tr\xED kh\u1EDBp v\u1EDBi "${C}"`)}}l++}attachChipListeners(),scheduleQuestionDraftSave();const d=c.length?` \u2014 ${c.length} l\u1ED7i: ${c.join("; ")}`:"";setAnswerImportStatus(`\u0110\xE3 import ${l} c\xE2u t\u1EEB "${e.name}"${d}`,c.length?"warning":"success"),toast(c.length?`Import xong, ${c.length} l\u1ED7i (xem chi ti\u1EBFt b\xEAn d\u01B0\u1EDBi)`:`\u0110\xE3 import ${l} c\xE2u`,c.length?"warning":"success")}catch(a){console.error("Answer import failed:",a);const r=a?.message||"Kh\xF4ng th\u1EC3 \u0111\u1ECDc file n\xE0y.";setAnswerImportStatus(r,"error"),toast(r,"error")}}let _pdfJsLoadingPromise=null;function pdfImportBoxHtml(){return`
    <div class="pdf-import-box">
      <div class="pdf-import-head">
        <div>
          <div class="pdf-import-title">\u{1F4C4} Ho\u1EB7c upload PDF \u0111\u1EC3 t\u1EF1 \u0111i\u1EC1n n\u1ED9i dung</div>
          <div class="pdf-import-sub">Ph\xF9 h\u1EE3p nh\u1EA5t v\u1EDBi PDF c\xF3 text th\u1EADt. N\u1EBFu l\xE0 PDF scan \u1EA3nh, k\u1EBFt qu\u1EA3 c\xF3 th\u1EC3 thi\u1EBFu ho\u1EB7c l\u1ED7i format.</div>
        </div>
        <div id="pdf-import-area" class="pdf-import-area" role="button" tabindex="0" aria-label="Upload PDF">
          <input id="pdf-file-input" type="file" accept="application/pdf,.pdf" />
          <button type="button" id="pdf-import-btn" class="btn btn-outline btn-sm">Upload PDF</button>
          <span class="pdf-import-meta">K\xE9o th\u1EA3 file ho\u1EB7c b\u1EA5m \u0111\u1EC3 ch\u1ECDn</span>
        </div>
      </div>
      <div id="pdf-import-status" class="pdf-import-status">Ch\u01B0a c\xF3 file PDF n\xE0o \u0111\u01B0\u1EE3c x\u1EED l\xFD.</div>
    </div>`}function setPdfImportStatus(t,e=""){const n=$("#pdf-import-status");n&&(n.className=`pdf-import-status${e?` is-${e}`:""}`,n.textContent=t)}function setPdfImportBusy(t){const e=$("#pdf-import-area"),n=$("#pdf-file-input"),i=$("#pdf-import-btn");e?.classList.toggle("processing",t),n&&(n.disabled=t),i&&(i.disabled=t)}async function ensurePdfJsLoaded(){return window.pdfjsLib?window.pdfjsLib:_pdfJsLoadingPromise||(_pdfJsLoadingPromise=import("./vendor/pdfjs-dist/build/pdf.min.mjs").then(t=>(t.GlobalWorkerOptions.workerSrc="./js/vendor/pdfjs-dist/build/pdf.worker.min.mjs",window.pdfjsLib=t,t)).catch(t=>{throw _pdfJsLoadingPromise=null,t}),_pdfJsLoadingPromise)}function mergePdfTextItems(t){const e=[];let n="",i=null,o=null;function s(){const a=n.replace(/[ \t]+/g," ").trim();a&&e.push(a),n="",i=null,o=null}for(const a of t||[]){if(!a||typeof a.str!="string")continue;const r=a.str.replace(/\u0000/g,""),l=a.transform?.[5]??i,c=a.transform?.[4]??null;if(i!==null&&l!==null&&Math.abs(l-i)>4&&s(),r){let u="";if(n){const m=c!=null&&o!=null?c-o:0,h=/^[,.;:!?%)\]\}]/.test(r),g=/[-/(\[]$/.test(n);!h&&!g&&m>1&&(u=" ")}n+=u+r}i=l,o=c!=null?c+(a.width||0):o,a.hasEOL&&s()}return s(),e.join(`
`).replace(/\n{3,}/g,`

`).trim()}async function extractTextFromPdf(t){const e=await ensurePdfJsLoaded(),n=await t.arrayBuffer(),o=await e.getDocument({data:new Uint8Array(n),useWorkerFetch:!0,isEvalSupported:!1}).promise,s=[];for(let r=1;r<=o.numPages;r++){setPdfImportStatus(`\u0110ang tr\xEDch xu\u1EA5t trang ${r}/${o.numPages}...`,"loading");const c=await(await o.getPage(r)).getTextContent(),d=mergePdfTextItems(c.items);d&&s.push(d)}const a=s.join(`

`).trim();if(!a)throw new Error("Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c text t\u1EEB PDF n\xE0y. C\xF3 th\u1EC3 \u0111\xE2y l\xE0 PDF scan \u1EA3nh ho\u1EB7c file kh\xF4ng c\xF3 l\u1EDBp text.");return{text:a,pageCount:o.numPages}}async function importPdfIntoQuestion(t){if(!t)return;if(t.type!=="application/pdf"&&!/\.pdf$/i.test(t.name)){setPdfImportStatus("File kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng ch\u1ECDn file PDF.","error"),toast("Ch\u1EC9 h\u1ED7 tr\u1EE3 file PDF","error");return}const e=$("#q-content");if(!(!e||!(!e.value.trim()||await confirmAction({title:"Thay n\u1ED9i dung t\u1EEB PDF",message:"N\u1ED9i dung hi\u1EC7n t\u1EA1i s\u1EBD b\u1ECB thay b\u1EB1ng text tr\xEDch xu\u1EA5t t\u1EEB file PDF n\xE0y.",confirmText:"Ti\u1EBFp t\u1EE5c nh\u1EADp PDF",danger:!0})))){setPdfImportBusy(!0),setPdfImportStatus("\u0110ang t\u1EA3i th\u01B0 vi\u1EC7n \u0111\u1ECDc PDF...","loading");try{const{text:i,pageCount:o}=await extractTextFromPdf(t);e.value=i,e.dispatchEvent(new Event("input",{bubbles:!0})),e.focus(),e.setSelectionRange(0,0),e.scrollTop=0,setPdfImportStatus(`\u0110\xE3 x\u1EED l\xFD ${o} trang t\u1EEB "${t.name}" v\xE0 \u0111i\u1EC1n v\xE0o \xF4 n\u1ED9i dung.`,"success"),toast("\u0110\xE3 chuy\u1EC3n PDF th\xE0nh text")}catch(i){console.error("PDF import failed:",i);const o=i?.message||"Kh\xF4ng th\u1EC3 x\u1EED l\xFD file PDF n\xE0y.";setPdfImportStatus(o,"error"),toast(o,"error")}finally{setPdfImportBusy(!1)}}}function attachPdfImport(){const t=$("#pdf-import-area"),e=$("#pdf-file-input"),n=$("#pdf-import-btn");if(!t||!e||!n)return;const i=()=>{e.disabled||e.click()};n.addEventListener("click",o=>{o.preventDefault(),o.stopPropagation(),i()}),t.addEventListener("click",o=>{o.target===e||o.target===n||i()}),t.addEventListener("keydown",o=>{(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),i())}),e.addEventListener("change",()=>{const o=e.files?.[0];o&&importPdfIntoQuestion(o),e.value=""}),t.addEventListener("dragover",o=>{o.preventDefault(),t.classList.add("dragover")}),t.addEventListener("dragleave",()=>t.classList.remove("dragover")),t.addEventListener("drop",o=>{o.preventDefault(),t.classList.remove("dragover");const s=o.dataTransfer.files?.[0];s&&importPdfIntoQuestion(s)})}function sttSelectorHtml(){return`<div id="stt-selector" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;padding:8px 10px;background:var(--bg-secondary);border-radius:8px;font-size:13px">
    <span style="font-weight:600;color:var(--gray-600)">Model:</span>
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
      <input type="radio" name="stt-model" value="diarize" ${_sttModel==="diarize"?"checked":""} onchange="setSttModel('diarize')">
      <span>Diarize <span style="color:var(--gray-400);font-size:11px">(c\xF3 Speaker ID, t\u1ED1i \u0111a 5 ph\xFAt)</span></span>
    </label>
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
      <input type="radio" name="stt-model" value="mini" ${_sttModel==="mini"?"checked":""} onchange="setSttModel('mini')">
      <span>Mini <span style="color:var(--gray-400);font-size:11px">(nhanh, kh\xF4ng gi\u1EDBi h\u1EA1n)</span></span>
    </label>
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
      <input type="radio" name="stt-model" value="none" ${_sttModel==="none"?"checked":""} onchange="setSttModel('none')">
      <span>None <span style="color:var(--gray-400);font-size:11px">(kh\xF4ng t\u1EF1 tr\xEDch xu\u1EA5t script)</span></span>
    </label>
  </div>`}function setSttModel(t){_sttModel=t}function audioUploadHtml(){return`<div id="audio-upload-area"><div id="audio-slot-list"></div>
    <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addAudioSlot()">+ Th\xEAm file audio</button>
  </div>`}function _renderAudioSlots(){const t=$("#audio-slot-list");t&&(t.innerHTML=_audioSlots.map((e,n)=>{const o=_audioSlots.length>1||e.status==="done"?`<button class="remove-audio-slot" onclick="removeAudioSlot(${n})" title="Xo\xE1 slot" aria-label="Xo\xE1 audio slot">\xD7</button>`:"";let s="";if(e.status==="idle")s=`
        <input id="audio-slot-input-${n}" type="file" accept="audio/*" style="display:none" onchange="onSlotFileSelected(this,${n})" />
        <button class="audio-pick-btn" onclick="document.getElementById('audio-slot-input-${n}').click()">\u{1F3B5} Ch\u1ECDn file audio</button>
        <span style="font-size:12px;color:var(--gray-400)">MP3, WAV, M4A... t\u1ED1i \u0111a 200MB</span>`;else if(e.status==="uploading"){const a=e.pct<100&&e.eta!=null?` \xB7 ETA ${_fmtEta(e.eta)}`:"";s=`
        <div class="audio-slot-filename">${escapeHtml(e.name)} <span style="color:var(--gray-400)">(${(e.size/1024/1024).toFixed(1)} MB)</span></div>
        <div class="upload-progress-row">
          <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" style="width:${e.pct}%"></div></div>
          <span class="upload-progress-label">${e.pct}%${a}</span>
        </div>`}else e.status==="done"?s=`
        <div class="audio-slot-done">
          <span class="audio-upload-done">\u2713</span>
          <span class="audio-slot-filename">${escapeHtml(e.name)} <span style="color:var(--gray-400)">(${(e.size/1024/1024).toFixed(1)} MB)</span></span>
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px" onclick="clearSlotFile(${n})">\u0110\u1ED5i file</button>
        </div>`:e.status==="error"&&(s=`
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--danger)">\u2717 L\u1ED7i upload: ${escapeHtml(e.name)}</span>
          <input id="audio-slot-input-${n}" type="file" accept="audio/*" style="display:none" onchange="onSlotFileSelected(this,${n})" />
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px" onclick="document.getElementById('audio-slot-input-${n}').click()">Th\u1EED l\u1EA1i</button>
        </div>`);return`<div class="audio-slot" id="audio-slot-${n}">
      <div class="audio-slot-num">${n+1}</div>
      <div class="audio-slot-content">
        <input type="text" class="form-input audio-slot-name" placeholder="T\xEAn hi\u1EC3n th\u1ECB (VD: Section ${n+1})"
               value="${escapeHtml(e.displayName)}" onchange="_audioSlots[${n}].displayName=this.value" />
        <div class="audio-slot-file">${s}</div>
      </div>
      ${o}
    </div>`}).join(""))}function _renderAudioFileList(){_renderAudioSlots()}function attachAudioUpload(){}const SUPPORTED_AUDIO_EXTS=new Set(["mp3","mp4","mpeg","mpga","m4a","ogg","oga","wav","wave","webm","flac","aac","aif","aiff"]);async function isRawAacFile(t){const e=await t.slice(0,2).arrayBuffer(),n=new Uint8Array(e);return n[0]===255&&(n[1]===241||n[1]===249)}function showUnsupportedAudioWarning(t,e){openModal("\u26A0\uFE0F \u0110\u1ECBnh d\u1EA1ng audio kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3",`
    <div style="line-height:1.7">
      <p>File <strong>${escapeHtml(t)}</strong> c\xF3 \u0111\u1ECBnh d\u1EA1ng <strong>.${escapeHtml(e)}</strong> kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.</p>
      <p style="margin-top:8px">C\xE1c \u0111\u1ECBnh d\u1EA1ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3: <strong>mp3, m4a, wav, ogg, webm, flac, aac, aiff, mp4</strong></p>
      <p style="margin-top:12px">Vui l\xF2ng <strong>convert sang MP3</strong> tr\u01B0\u1EDBc khi upload. M\u1ED9t s\u1ED1 c\xE1ch nhanh:</p>
      <ul style="margin:8px 0 0 18px;font-size:14px">
        <li>Windows/macOS: d\xF9ng <a href="https://www.ffmpeg.org/" target="_blank">FFmpeg</a>: <code>ffmpeg -i input.${escapeHtml(e)} output.mp3</code></li>
        <li>Online: <a href="https://cloudconvert.com/audio-converter" target="_blank">cloudconvert.com/audio-converter</a></li>
      </ul>
    </div>
    <div style="margin-top:20px;text-align:right">
      <button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">\u0110\xE3 hi\u1EC3u</button>
    </div>`)}function showRawAacWarning(t){openModal("\u26A0\uFE0F \u0110\u1ECBnh d\u1EA1ng audio kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3",`
    <div style="line-height:1.7">
      <p>File <strong>${escapeHtml(t)}</strong> l\xE0 <strong>raw AAC ADTS stream</strong> \u2014 \u0111\u1ECBnh d\u1EA1ng n\xE0y kh\xF4ng \u0111\u01B0\u1EE3c OpenAI Whisper h\u1ED7 tr\u1EE3 v\xE0 s\u1EBD b\u1ECB l\u1ED7i khi transcribe.</p>
      <p style="margin-top:12px">Vui l\xF2ng <strong>convert sang MP3</strong> tr\u01B0\u1EDBc khi upload. M\u1ED9t s\u1ED1 c\xE1ch nhanh:</p>
      <ul style="margin:8px 0 0 18px;font-size:14px">
        <li>macOS: m\u1EDF b\u1EB1ng <em>QuickTime Player</em> \u2192 File \u2192 Export As \u2192 Audio Only (xu\u1EA5t ra .m4a), r\u1ED3i d\xF9ng <a href="https://cloudconvert.com/m4a-to-mp3" target="_blank">CloudConvert</a> \u0111\u1EC3 chuy\u1EC3n sang .mp3</li>
        <li>Windows: d\xF9ng <a href="https://www.ffmpeg.org/" target="_blank">FFmpeg</a>: <code>ffmpeg -i input.aac output.mp3</code></li>
        <li>Online: <a href="https://cloudconvert.com/aac-to-mp3" target="_blank">cloudconvert.com/aac-to-mp3</a></li>
      </ul>
    </div>
    <div style="margin-top:20px;text-align:right">
      <button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">\u0110\xE3 hi\u1EC3u</button>
    </div>`)}async function onSlotFileSelected(t,e){const n=t.files?.[0];if(!n||!_audioSlots[e])return;t.value="";const i=n.name.split(".").pop().toLowerCase();if(!SUPPORTED_AUDIO_EXTS.has(i)){showUnsupportedAudioWarning(n.name,i);return}if(await isRawAacFile(n)){showRawAacWarning(n.name);return}_audioSlots[e].file=n,_audioSlots[e].name=n.name,_audioSlots[e].size=n.size,_audioSlots[e].status="uploading",_audioSlots[e].pct=0,_audioSlots[e].eta=null,_audioSlots[e].url=null,_audioSlots[e].key=null,_renderAudioSlots(),_uploadAudioSlot(e)}function onAudioFilesSelected(t){onSlotFileSelected(t,0)}function addAudioSlot(){_audioSlots.push(_newAudioSlot()),_renderAudioSlots()}function clearSlotFile(t){if(!_audioSlots[t])return;_audioSlots[t]={..._newAudioSlot(),displayName:_audioSlots[t].displayName},_audioUploading=_audioSlots.some(n=>n.status==="uploading"),_renderAudioSlots();const e=$("#listening-script");e&&(e.value=""),_renderCombinedTranscript()}async function requestDirectAudioUpload(t,e,n={}){return api.post("/uploads/audio/presign",{scope:e,file_name:t.name,content_type:t.type||"application/octet-stream",size:t.size,...n})}function putDirectAudioXHR(t,e,n,i){return new Promise((o,s)=>{const a=new XMLHttpRequest,r=Date.now();a.upload.addEventListener("progress",l=>{if(!l.lengthComputable)return;const c=Math.round(l.loaded/l.total*100),d=(Date.now()-r)/1e3,u=l.loaded/d,m=u>0?Math.ceil((l.total-l.loaded)/u):null;i(c,m)}),a.addEventListener("load",()=>a.status>=200&&a.status<300?o():s(new Error(`HTTP ${a.status}`))),a.addEventListener("error",()=>s(new Error("Network error"))),a.addEventListener("abort",()=>s(new Error("Upload cancelled"))),a.open("PUT",t),a.setRequestHeader("Content-Type",n||"application/octet-stream"),a.send(e)})}function _fmtEta(t){return t===null||t<0?"":t<60?`~${t}s`:`~${Math.ceil(t/60)}m`}async function _uploadAudioSlot(t){const e=_audioSlots[t];if(e){_audioUploading=!0;try{const n=await requestDirectAudioUpload(e.file,"teacher-listening");await putDirectAudioXHR(n.upload_url,e.file,n.headers?.["Content-Type"]||e.file.type,(i,o)=>{_audioSlots[t]&&(_audioSlots[t].pct=i,_audioSlots[t].eta=o),_renderAudioSlots()}),_audioSlots[t].status="done",_audioSlots[t].url=n.public_url,_audioSlots[t].key=n.key,_renderAudioSlots(),_maybeTranscribeAll()}catch(n){_audioSlots[t].status="error",_renderAudioSlots(),toast(`L\u1ED7i upload "${e.name}": `+(n.message||"Unknown error"),"error")}finally{_audioUploading=_audioSlots.some(n=>n.status==="uploading")}}}function _maybeTranscribeAll(){if(_audioSlots.some(e=>e.status==="uploading"))return;const t=_audioSlots.filter(e=>e.status==="done"&&e.transcript===void 0);if(_sttModel==="none"){t.forEach(e=>{e.transcript=""});return}for(const e of t)e.transcript=null,_transcribeSlot(e)}async function _transcribeSlot(t){const e=$("#listening-script"),n=$("#script-loading");n&&n.classList.remove("hidden");try{const i=await transcribeListeningScript({key:t.key,model:_sttModel});t.transcript=i?.text||"",t.transcriptFallback=i?.fallback||!1,t.transcriptModel=i?.modelUsed||_sttModel,t.transcriptDuration=i?.durationSeconds||0,_renderCombinedTranscript();const o=t.transcriptDuration,s=o>0?` (${Math.floor(o/60)}:${String(o%60).padStart(2,"0")})`:"";i?.fallback&&openModal("\u0110\xE3 t\u1EF1 \u0111\u1ED9ng d\xF9ng Mini model",`<p style="margin:0 0 8px;line-height:1.6">"${escapeHtml(t.displayName||t.name)}"${s} d\xE0i h\u01A1n 5 ph\xFAt \u2014 Diarize kh\xF4ng h\u1ED7 tr\u1EE3.</p><p style="margin:0;line-height:1.6">\u0110\xE3 d\xF9ng <strong>Mini model</strong> thay th\u1EBF (kh\xF4ng c\xF3 Speaker ID).</p>`)}catch(i){t.transcript="",toast(`Kh\xF4ng th\u1EC3 transcribe "${t.displayName||t.name}": ${i.error||i.message}`,"error")}finally{_audioSlots.some(i=>i.transcript===null)||n&&n.classList.add("hidden")}}function _renderCombinedTranscript(){const t=$("#listening-script");if(!t)return;const e=_audioSlots.filter(n=>typeof n.transcript=="string"&&n.transcript!=="");e.length!==0&&(e.length===1?t.value=e[0].transcript:t.value=e.map(n=>`--- Transcript: ${n.displayName||n.name} ---
${n.transcript}`).join(`


`),_refreshSpeakerNames(),_renderSpeakerRenameUI())}function speakerRenameSectionHtml(){return`<div id="speaker-rename-section" style="display:none;margin-top:8px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:600;color:var(--gray-500);letter-spacing:.3px">SPEAKER RENAME</span>
      <div style="display:flex;gap:6px;">
        <button type="button" onclick="addSpeakerRow()" style="font-size:12px;padding:3px 10px;border:1px solid var(--border);border-radius:5px;background:transparent;color:var(--text);cursor:pointer;line-height:1.5">+ Th\xEAm</button>
        <button type="button" onclick="applySpeakerRenames()" style="font-size:12px;padding:3px 12px;border:none;border-radius:5px;background:var(--primary);color:#fff;cursor:pointer;font-weight:600;line-height:1.5">Replace \u2192</button>
      </div>
    </div>
    <div id="speaker-rename-list" style="display:flex;flex-direction:column;gap:4px;"></div>
  </div>`}function _parseSpeakersFromTranscript(t){const e=new Set,n=[];for(const i of t.split(`
`)){const o=i.match(/^([^:\n]+?):\s/);o&&!e.has(o[1])&&(e.add(o[1]),n.push(o[1]))}return n}function _nextSpeakerLabel(){const t=new Set(_speakerNames.map(e=>e.original));for(const e of"ABCDEFGHIJKLMNOPQRSTUVWXYZ")if(!t.has(e))return e;return"?"}function _hasSpeakerPattern(t){return/^[A-Za-z][^:\n]*:\s/m.test(t)}function _refreshSpeakerNames(){const t=$("#listening-script");if(!t||!_hasSpeakerPattern(t.value))return;const e=_parseSpeakersFromTranscript(t.value),n=new Map(_speakerNames.map(i=>[i.original,i]));_speakerNames=e.map(i=>n.get(i)||{original:i,replace:""}),_speakerNames.length===0&&(_speakerNames=[{original:"A",replace:""},{original:"B",replace:""}])}function _renderSpeakerRenameUI(){const t=$("#speaker-rename-section");if(!t)return;const e=$("#listening-script");if(!(e&&_hasSpeakerPattern(e.value))){t.style.display="none";return}t.style.display="";const i=$("#speaker-rename-list");if(!i)return;const o="padding:4px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;background:var(--surface,var(--bg-subtle));color:var(--text);outline:none;width:100%";i.innerHTML=_speakerNames.map((s,a)=>`
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="text" value="${escapeHtml(s.original)}" oninput="_speakerNames[${a}].original=this.value" style="${o};max-width:120px;flex:0 0 120px">
      <span style="color:var(--gray-400);font-size:13px;flex-shrink:0">\u2192</span>
      <input type="text" value="${escapeHtml(s.replace)}" oninput="_speakerNames[${a}].replace=this.value" placeholder="T\xEAn m\u1EDBi..." style="${o};flex:1">
      <button type="button" onclick="_removeSpeakerRow(${a})" style="flex-shrink:0;border:none;background:none;color:var(--gray-400);cursor:pointer;font-size:15px;padding:2px 4px;line-height:1" title="X\xF3a">\xD7</button>
    </div>`).join("")}function addSpeakerRow(){_speakerNames.push({original:_nextSpeakerLabel(),replace:""}),_renderSpeakerRenameUI()}function _removeSpeakerRow(t){_speakerNames.splice(t,1),_renderSpeakerRenameUI()}function applySpeakerRenames(){const t=$("#listening-script");if(!t)return;const e=_speakerNames.filter(i=>i.replace.trim());if(e.length===0){toast("Ch\u01B0a \u0111i\u1EC1n t\xEAn m\u1EDBi","warning");return}let n=t.value;for(const i of e){const o=i.original.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");n=n.replace(new RegExp(`^${o}:`,"gm"),`${i.replace}:`)}t.value=n;for(const i of _speakerNames)i.replace.trim()&&(i.original=i.replace,i.replace="");_renderSpeakerRenameUI(),toast("\u0110\xE3 \u0111\u1ED5i t\xEAn speaker","success")}function removeAudioSlot(t){if(_audioSlots.length<=1){clearSlotFile(0);return}_audioSlots.splice(t,1),_audioUploading=_audioSlots.some(i=>i.status==="uploading"),_renderAudioSlots();const e=$("#listening-script");if(e&&(e.value=""),_renderCombinedTranscript(),_audioSlots.filter(i=>i.status==="done").length===0){const i=$("#script-loading");i&&i.classList.add("hidden")}}function removeAudioFile(t){removeAudioSlot(t)}function removeAudio(t){t&&t.stopPropagation(),removeAudioSlot(0)}async function transcribeListeningScript({key:t,model:e}){return await api.post("/questions/transcribe-audio",{key:t,model:e},{timeoutMs:33e4})}function toggleExplanation(t){const n=t?.closest?.(".answer-row")?.querySelector?.(".explanation-row");if(!n)return;const i=n.style.display==="none";n.style.display=i?"":"none",t.setAttribute("aria-expanded",i?"true":"false")}function locateInText(){}function scrollToFeedbackMark(){}async function submitQuestion(t){const e=$("#q-title")?.value.trim(),n=$("#q-skill")?.value,i=getChipValues($("#q-tags-chip"));if(!e){toast("Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1","error");return}if(!n){toast("Vui l\xF2ng ch\u1ECDn k\u1EF9 n\u0103ng","error");return}if(n==="composite"){if(_cqEditingIdx>=0){toast("Vui l\xF2ng l\u01B0u ph\u1EA7n \u0111ang ch\u1EC9nh s\u1EEDa tr\u01B0\u1EDBc","warning");return}if(_cqSections.length===0){toast("Vui l\xF2ng th\xEAm \xEDt nh\u1EA5t 1 ph\u1EA7n thi","error");return}for(let r=0;r<_cqSections.length;r++){if(!_cqSections[r].label.trim()){toast(`Ph\u1EA7n ${r+1}: Ch\u01B0a \u0111\u1EB7t t\xEAn`,"error");return}if(!_cqSections[r].skill){toast(`Ph\u1EA7n ${r+1}: Ch\u01B0a ch\u1ECDn k\u1EF9 n\u0103ng`,"error");return}}btnLoading(t);try{await api.post("/questions",{title:e,skill:"composite",tags:i,sections:_cqSections.map(r=>({label:r.label,skill:r.skill,time_limit_minutes:r.time_limit_minutes||null,questions_data:r.questions_data||[],content_blocks:r.content_blocks||[],content_text:r.content_text||"",content_url:r.content_url||null,content_urls:r.content_urls||[],script:r.script||""}))}),stopQuestionDraftAutosave(),clearQuestionDraft(getQuestionDraftKey("new")),toast("\u0110\xE3 l\u01B0u \u0111\u1EC1 t\u1ED5ng h\u1EE3p v\xE0o kho! \u{1F389}"),navigate("/questions")}catch(r){btnReset(t),toast("L\u1ED7i l\u01B0u \u0111\u1EC1: "+(r.error||r.message),"error")}return}syncContentBlocksFromEditor();const o=normalizeContentBlocksForEditor(_contentBlocks),s=blocksToPlainText(o)||"";if(_contentImageUploadCount>0){toast("\u1EA2nh \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}if(n==="listening"){if(_audioSlots.filter(l=>l.status==="done").length===0){toast("Vui l\xF2ng ch\u1ECDn v\xE0 upload \xEDt nh\u1EA5t 1 file audio cho Listening","error");return}if(_audioUploading){toast("Audio v\u1EABn \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}}let a=[];if(n==="reading"||n==="listening"){a=collectAnswerGrid();const r=checkEmptyAnswers();if(r.length>0){confirmSaveWithEmptyAnswers(r,()=>submitQuestion(t));return}}btnLoading(t);try{let r={};if(n==="listening"){const l=_audioSlots.filter(d=>d.status==="done"),c=l.map(d=>({url:d.url,key:d.key,name:d.displayName||d.name,filename:d.name}));r={content_url:l[0]?.url||null,content_upload_key:l[0]?.key||null,content_urls:c,script:($("#listening-script")?.value||"").trim()||null}}await api.post("/questions",{title:e,skill:n,content_text:s,content_blocks:o,questions_data:a,vocabulary:_vocabItems,tags:i,...r}),stopQuestionDraftAutosave(),clearQuestionDraft(getQuestionDraftKey("new")),toast("\u0110\xE3 l\u01B0u \u0111\u1EC1 v\xE0o kho! \u{1F389}"),_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,navigate("/questions")}catch(r){btnReset(t),toast("L\u1ED7i l\u01B0u \u0111\u1EC1: "+(r.error||r.message),"error")}}let _addStudentClassId=null,_addStudentTab="new";function parseStudentNameLines(t){return String(t||"").split(/\r?\n/).map(e=>e.replace(/\s+/g," ").trim()).filter(Boolean)}function openAddStudentModal(t){_addStudentClassId=t,_addStudentTab="new",renderAddStudentModal()}function renderAddStudentModal(){openModal("Th\xEAm h\u1ECDc sinh v\xE0o l\u1EDBp",`
    <div class="modal-tabs" style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--gray-200)">
      <button id="tab-new" class="modal-tab ${_addStudentTab==="new"?"active":""}"
        onclick="switchStudentTab('new')" style="flex:1;padding:10px;background:none;border:none;
        font-weight:600;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;
        margin-bottom:-2px;color:${_addStudentTab==="new"?"var(--primary)":"var(--gray-400)"};
        border-bottom-color:${_addStudentTab==="new"?"var(--primary)":"transparent"}">
        \u2728 T\u1EA1o t\xE0i kho\u1EA3n m\u1EDBi
      </button>
      <button id="tab-existing" class="modal-tab ${_addStudentTab==="existing"?"active":""}"
        onclick="switchStudentTab('existing')" style="flex:1;padding:10px;background:none;border:none;
        font-weight:600;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;
        margin-bottom:-2px;color:${_addStudentTab==="existing"?"var(--primary)":"var(--gray-400)"};
        border-bottom-color:${_addStudentTab==="existing"?"var(--primary)":"transparent"}">
        \u{1F517} Th\xEAm h\u1ECDc sinh c\xF3 s\u1EB5n
      </button>
    </div>

    ${_addStudentTab==="new"?`
      <div class="form-group">
        <label class="form-label">Danh s\xE1ch h\u1ECD t\xEAn <span style="color:var(--danger)">*</span></label>
        <textarea id="stu-names" class="form-input" rows="7"
          placeholder="Ng\xF4 Quang \u0110\u1EE9c&#10;L\xEA Ho\xE0ng Nam&#10;Nguy\u1EC5n Th\u1ECB An"></textarea>
        <div class="form-hint">M\u1ED7i d\xF2ng l\xE0 1 h\u1ECDc sinh. Nh\u1EADp 1 d\xF2ng c\u0169ng d\xF9ng \u0111\u01B0\u1EE3c cho tr\u01B0\u1EDDng h\u1EE3p th\xEAm l\u1EBB. Username v\xE0 password s\u1EBD \u0111\u01B0\u1EE3c t\u1EA1o t\u1EF1 \u0111\u1ED9ng.</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">H\u1EE7y</button>
        <button class="btn btn-primary" onclick="submitCreateStudent(this)">T\u1EA1o &amp; th\xEAm v\xE0o l\u1EDBp</button>
      </div>
    `:`
      <div class="form-group">
        <label class="form-label">Username h\u1ECDc sinh <span style="color:var(--danger)">*</span></label>
        <input id="stu-existing-username" class="form-input"
          placeholder="Nh\u1EADp username c\u1EE7a h\u1ECDc sinh \u0111\xE3 c\xF3 t\xE0i kho\u1EA3n" />
        <div class="form-hint">H\u1ECDc sinh s\u1EBD \u0111\u01B0\u1EE3c th\xEAm v\xE0o l\u1EDBp n\xE0y m\xE0 kh\xF4ng m\u1EA5t d\u1EEF li\u1EC7u \u1EDF l\u1EDBp c\u0169</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">H\u1EE7y</button>
        <button class="btn btn-primary" onclick="submitAddExistingStudent(this)">Th\xEAm v\xE0o l\u1EDBp</button>
      </div>
    `}`),setTimeout(()=>{($("#stu-names")||$("#stu-existing-username"))?.focus()},50)}function switchStudentTab(t){_addStudentTab=t,renderAddStudentModal()}async function submitCreateStudent(t){const e=parseStudentNameLines($("#stu-names")?.value);if(e.length===0){toast("Vui l\xF2ng nh\u1EADp \xEDt nh\u1EA5t 1 h\u1ECDc sinh","error");return}btnLoading(t);try{const n=await api.post("/students",{class_id:_addStudentClassId,students:e.map(o=>({full_name:o}))}),i=Array.isArray(n.created)?n.created:[];if(i.length===0)throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c t\xE0i kho\u1EA3n \u0111\xE3 t\u1EA1o");closeModal(),openStudentCredentialsModal(i.length===1?"T\xE0i kho\u1EA3n h\u1ECDc sinh \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o":`\u0110\xE3 t\u1EA1o ${i.length} t\xE0i kho\u1EA3n h\u1ECDc sinh`,i,i.length===1?"student_account":"student_accounts"),toast(`\u0110\xE3 t\u1EA1o ${i.length} t\xE0i kho\u1EA3n h\u1ECDc sinh!`),showClassDetail({id:_addStudentClassId})}catch(n){btnReset(t),toast("L\u1ED7i: "+(n.error||n.message||"Kh\xF4ng th\u1EC3 t\u1EA1o h\u1ECDc sinh"),"error")}}async function submitAddExistingStudent(t){const e=$("#stu-existing-username")?.value.trim();if(!e){toast("Vui l\xF2ng nh\u1EADp username","error");return}btnLoading(t);try{await api.post("/student-classes",{class_id:_addStudentClassId,username:e}),closeModal(),toast("\u0110\xE3 th\xEAm h\u1ECDc sinh v\xE0o l\u1EDBp!"),showClassDetail({id:_addStudentClassId})}catch(n){btnReset(t),toast("L\u1ED7i: "+(n.error||"Kh\xF4ng th\u1EC3 th\xEAm h\u1ECDc sinh"),"error")}}function openResetPasswordModal(t,e,n){confirmAction({title:"C\u1EA5p m\u1EADt kh\u1EA9u m\u1EDBi",message:`M\u1EADt kh\u1EA9u c\u0169 c\u1EE7a <strong>${escapeHtml(e)}</strong> s\u1EBD h\u1EBFt hi\u1EC7u l\u1EF1c ngay sau khi \u0111\u1ED5i.`,confirmText:"C\u1EA5p m\u1EADt kh\u1EA9u m\u1EDBi",danger:!0}).then(i=>{i&&submitResetPassword(t,n)})}async function submitResetPassword(t,e){btnLoading(e);try{const n=await api.post(`/students/${t}/reset-password`,{});if(!n?.credentials)throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c m\u1EADt kh\u1EA9u m\u1EDBi");openStudentCredentialsModal("M\u1EADt kh\u1EA9u m\u1EDBi c\u1EE7a h\u1ECDc sinh",[n.credentials],"student_password_reset"),toast("\u0110\xE3 c\u1EA5p m\u1EADt kh\u1EA9u m\u1EDBi!")}catch(n){btnReset(e),toast("L\u1ED7i: "+(n.error||n.message||"Kh\xF4ng th\u1EC3 \u0111\u1ED5i m\u1EADt kh\u1EA9u"),"error");return}btnReset(e)}async function removeStudentFromClass(t,e,n){if(await confirmAction({title:"Xo\xE1 h\u1ECDc sinh kh\u1ECFi l\u1EDBp",message:"T\xE0i kho\u1EA3n h\u1ECDc sinh v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i, ch\u1EC9 b\u1ECB g\u1EE1 kh\u1ECFi l\u1EDBp n\xE0y.",confirmText:"G\u1EE1 kh\u1ECFi l\u1EDBp",danger:!0})){btnLoading(n);try{await api.delete(`/student-classes?student_id=${t}&class_id=${e}`),toast("\u0110\xE3 xo\xE1 h\u1ECDc sinh kh\u1ECFi l\u1EDBp"),showClassDetail({id:e})}catch(o){btnReset(n),toast("L\u1ED7i: "+(o.error||o.message),"error");return}btnReset(n)}}async function showProfileFields(){setLoading("\u0110ang t\u1EA3i...");const t=routeToken();try{const e=await api.get("/profile-fields");if(routeChanged(t))return;renderProfileFieldsPage(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c h\u1ED3 s\u01A1 h\u1ECDc sinh",e,"/profile-fields")}}function renderProfileFieldsPage(t){const e={text:"V\u0103n b\u1EA3n ng\u1EAFn",textarea:"V\u0103n b\u1EA3n d\xE0i",select:"Ch\u1ECDn \u0111\xE1p \xE1n",date:"Ng\xE0y sinh"},n={notification_email:"Email th\xF4ng b\xE1o"},i=t.length===0?'<div class="pf-empty"><div class="pf-empty-icon">\u{1F4CB}</div><div>Ch\u01B0a c\xF3 c\xE2u h\u1ECFi n\xE0o. Th\xEAm c\xE2u h\u1ECFi \u0111\u1EA7u ti\xEAn b\xEAn tr\xEAn!</div></div>':`<div class="table-wrap"><table class="pf-table">
        <thead><tr><th>#</th><th>C\xE2u h\u1ECFi</th><th>Ki\u1EC3u</th><th>Vai tr\xF2</th><th></th></tr></thead>
        <tbody>${t.map((o,s)=>{const a=Array.isArray(o.options)&&o.options.length?`<div class="pf-opts-preview">${o.options.slice(0,3).map(l=>`<span class="pf-opt-pill">${escapeHtml(String(l))}</span>`).join("")}${o.options.length>3?`<span class="pf-opt-more">+${o.options.length-3}</span>`:""}</div>`:"",r=o.field_key?`<span class="pf-type-badge">${n[o.field_key]||o.field_key}</span>`:'<span style="color:var(--gray-400)">\u2014</span>';return`<tr>
            <td class="pf-num">${s+1}</td>
            <td><div class="pf-label-cell">${escapeHtml(o.label)}${a}</div></td>
            <td><span class="pf-type-badge">${e[o.field_type]||o.field_type}</span></td>
            <td>${r}</td>
            <td><button class="btn-icon danger" onclick="deleteProfileField('${o.id}')" aria-label="Xo\xE1 tr\u01B0\u1EDDng h\u1ED3 s\u01A1">\u{1F5D1}</button></td>
          </tr>`}).join("")}</tbody>
      </table></div>`;$("#app").innerHTML=`
    <div class="container">
      <div class="detail-header">
        <div class="detail-header-info">
          <h2>\u{1F464} C\xE2u h\u1ECFi h\u1ED3 s\u01A1 h\u1ECDc sinh</h2>
          <div class="detail-header-meta"><span>H\u1ECDc sinh \u0111i\u1EC1n v\xE0o c\xE1c tr\u01B0\u1EDDng n\xE0y trong trang H\u1ED3 s\u01A1 c\u1EE7a m\xECnh</span></div>
        </div>
      </div>

      <div class="pf-add-card">
        <div class="pf-add-title">+ Th\xEAm c\xE2u h\u1ECFi m\u1EDBi</div>
        <form id="pf-add-form" onsubmit="submitAddProfileField(event)">
          <div class="pf-add-row">
            <input id="pf-label" class="form-input" type="text" maxlength="200"
              placeholder="N\u1ED9i dung c\xE2u h\u1ECFi (vd: H\u1ECDc ti\u1EBFng Anh l\xE2u ch\u01B0a?)" required />
            <select id="pf-type" class="form-input pf-type-select" onchange="onPfTypeChange()">
              <option value="text">V\u0103n b\u1EA3n ng\u1EAFn</option>
              <option value="textarea">V\u0103n b\u1EA3n d\xE0i</option>
              <option value="select">Ch\u1ECDn \u0111\xE1p \xE1n</option>
              <option value="date">Ng\xE0y sinh</option>
            </select>
            <button type="submit" class="btn btn-primary">Th\xEAm</button>
          </div>
          <div id="pf-options-row" class="pf-options-row hidden">
            <label class="form-label" style="margin-bottom:4px">C\xE1c l\u1EF1a ch\u1ECDn (m\u1ED7i d\xF2ng 1 l\u1EF1a ch\u1ECDn)</label>
            <textarea id="pf-options" class="form-input" rows="4"
              placeholder="D\u01B0\u1EDBi 1 n\u0103m&#10;1-3 n\u0103m&#10;3-5 n\u0103m&#10;Tr\xEAn 5 n\u0103m"></textarea>
          </div>
          <label style="display:inline-flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:var(--gray-600)">
            <input id="pf-notification-email" type="checkbox" onchange="onPfSpecialToggle()" />
            D\xF9ng c\xE2u h\u1ECFi n\xE0y l\xE0m email nh\u1EADn th\xF4ng b\xE1o cho h\u1ECDc sinh
          </label>
        </form>
      </div>

      <div class="pf-list-card">
        <div class="pf-list-header">
          <span class="pf-list-title">Danh s\xE1ch c\xE2u h\u1ECFi</span>
          <span class="pf-count-badge">${t.length}</span>
        </div>
        ${i}
      </div>
    </div>`}function onPfTypeChange(){if($("#pf-notification-email")?.checked){$("#pf-options-row")?.classList.add("hidden");return}const t=$("#pf-type")?.value;$("#pf-options-row")?.classList.toggle("hidden",t!=="select")}window.onPfTypeChange=onPfTypeChange;function onPfSpecialToggle(){const t=!!$("#pf-notification-email")?.checked,e=$("#pf-type"),n=$("#pf-label");e&&(t?(e.value="text",e.disabled=!0):e.disabled=!1),t&&n&&!n.value.trim()&&(n.value="Gmail"),onPfTypeChange()}window.onPfSpecialToggle=onPfSpecialToggle;async function submitAddProfileField(t){t.preventDefault();const e=$("#pf-label")?.value.trim(),n=$("#pf-type")?.value||"text",i=$("#pf-notification-email")?.checked?"notification_email":null,o=$("#pf-options")?.value||"",s=!i&&n==="select"?splitDelimitedList(o):null;if(!e){toast("Vui l\xF2ng nh\u1EADp n\u1ED9i dung c\xE2u h\u1ECFi","error");return}if(!i&&n==="select"&&(!s||s.length<2)){toast("Nh\u1EADp \xEDt nh\u1EA5t 2 l\u1EF1a ch\u1ECDn","error");return}try{await api.post("/profile-fields",{label:e,field_key:i,field_type:n,options:s}),toast("\u0110\xE3 th\xEAm c\xE2u h\u1ECFi!"),showProfileFields()}catch(a){toast("L\u1ED7i: "+(a.error||a.message),"error")}}window.submitAddProfileField=submitAddProfileField;async function deleteProfileField(t){if(await confirmAction({title:"Xo\xE1 c\xE2u h\u1ECFi h\u1ED3 s\u01A1",message:"C\xE1c c\xE2u tr\u1EA3 l\u1EDDi c\u1EE7a h\u1ECDc sinh cho c\xE2u h\u1ECFi n\xE0y c\u0169ng s\u1EBD b\u1ECB xo\xE1.",confirmText:"Xo\xE1 c\xE2u h\u1ECFi",danger:!0}))try{await api.delete(`/profile-fields/${t}`),toast("\u0110\xE3 xo\xE1 c\xE2u h\u1ECFi"),showProfileFields()}catch(n){toast("L\u1ED7i: "+(n.error||n.message),"error")}}window.deleteProfileField=deleteProfileField;async function openStudentProfileModal(t,e){openModal(`\u{1F464} H\u1ED3 s\u01A1 \u2014 ${e}`,'<div style="text-align:center;padding:24px;color:var(--gray-400)">\u0110ang t\u1EA3i...</div>');try{const{student:n,fields:i,answers:o}=await api.get(`/students/${t}/profile-answers`),s=i.length===0?`<div class="pf-modal-empty">
          <p>Ch\u01B0a c\xF3 c\xE2u h\u1ECFi h\u1ED3 s\u01A1 n\xE0o.</p>
          <a href="#/profile-fields" onclick="closeModal()">Th\xEAm c\xE2u h\u1ECFi t\u1EA1i \u0111\xE2y \u2192</a>
        </div>`:`<div class="pf-modal-list">
          <div class="pf-modal-row">
            <span class="pf-modal-label">H\u1ECD v\xE0 t\xEAn</span>
            <span class="pf-modal-value">${escapeHtml(n.full_name)}</span>
          </div>
          <div class="pf-modal-row">
            <span class="pf-modal-label">T\xEAn \u0111\u0103ng nh\u1EADp</span>
            <span class="pf-modal-value" style="font-family:monospace">${escapeHtml(n.username)}</span>
          </div>
          <div class="pf-modal-row">
            <span class="pf-modal-label">Email th\xF4ng b\xE1o</span>
            <span class="pf-modal-value ${n.email?"":"pf-empty-val"}">${n.email?escapeHtml(n.email):"Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u"}</span>
          </div>
          <div class="pf-modal-divider"></div>
          ${i.map(r=>`
            <div class="pf-modal-row">
              <span class="pf-modal-label">${escapeHtml(r.label)}</span>
              <span class="pf-modal-value ${o[r.id]?"":"pf-empty-val"}">${o[r.id]?escapeHtml(o[r.id]):"Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u"}</span>
            </div>`).join("")}
        </div>`,a=document.getElementById("modal-body");a&&(a.innerHTML=s)}catch(n){const i=document.getElementById("modal-body");i&&(i.innerHTML=`<p style="color:var(--danger)">L\u1ED7i: ${n.error||n.message}</p>`)}}window.openStudentProfileModal=openStudentProfileModal;function activateLocationPick(t){_pendingLocationRow&&cancelLocationPick(),_pendingLocationRow=t;const e=t.querySelector(".q-label")?.textContent||"",n=document.getElementById("location-pick-hint"),i=document.getElementById("listening-script");if(i){i.classList.add("location-pickable-textarea"),n&&(n.textContent=`\u0110ang ch\u1ECDn v\u1ECB tr\xED cho ${e} \u2014 b\xF4i ch\u1ECDn \u0111o\u1EA1n text trong \xF4 Script Listening b\xEAn tr\xEAn. Esc \u0111\u1EC3 hu\u1EF7.`,n.classList.remove("hidden")),t.querySelector(".btn-pick-location")?.classList.add("picking-active"),i.addEventListener("mouseup",_onScriptMouseUp),i.scrollIntoView({behavior:"smooth",block:"center"});return}const o=document.getElementById("content-composer-preview-body"),s=o?.querySelectorAll?.(".mixed-content-text");!o||!s?.length||(toggleComposerEditor(!0),o.classList.add("location-picking"),s.forEach(a=>a.classList.add("location-pickable")),n&&(n.textContent=`\u0110ang ch\u1ECDn v\u1ECB tr\xED cho ${e} \u2014 b\xF4i ch\u1ECDn text ngay trong preview. C\xF3 th\u1EC3 span qua nhi\u1EC1u block text li\xEAn ti\u1EBFp, nh\u01B0ng kh\xF4ng \u0111\u01B0\u1EE3c \u0111i qua \u1EA3nh. Esc \u0111\u1EC3 hu\u1EF7.`,n.classList.remove("hidden")),t.querySelector(".btn-pick-location")?.classList.add("picking-active"),o.scrollIntoView({behavior:"smooth",block:"start"}))}function getTextareaSelectionRect(t,e,n){const i=t.getBoundingClientRect(),o=window.getComputedStyle(t),s=document.createElement("div");Object.assign(s.style,{position:"fixed",top:i.top+"px",left:i.left+"px",width:i.width+"px",height:i.height+"px",overflow:"hidden",opacity:"0",pointerEvents:"none",zIndex:"-1",whiteSpace:"pre-wrap",wordBreak:o.wordBreak,overflowWrap:o.overflowWrap,fontFamily:o.fontFamily,fontSize:o.fontSize,fontWeight:o.fontWeight,lineHeight:o.lineHeight,letterSpacing:o.letterSpacing,paddingTop:o.paddingTop,paddingRight:o.paddingRight,paddingBottom:o.paddingBottom,paddingLeft:o.paddingLeft,boxSizing:o.boxSizing});const a=document.createElement("div");a.style.cssText="position:relative;width:100%",a.style.top=-t.scrollTop+"px";const r=t.value;a.appendChild(document.createTextNode(r.slice(0,e)));const l=document.createElement("span");l.textContent=r.slice(e,n)||" ",a.appendChild(l),a.appendChild(document.createTextNode(r.slice(n))),s.appendChild(a),document.body.appendChild(s);const c=l.getBoundingClientRect();return document.body.removeChild(s),c}function _onScriptMouseUp(){const t=document.getElementById("listening-script");if(!t||!_pendingLocationRow)return;const e=t.selectionStart,n=t.selectionEnd;if(e===n)return;const i=t.value.slice(e,n).trim();if(!i)return;const o={text:i,meta:{type:"script_text_range",start:e,end:n,text:i}},s=getTextareaSelectionRect(t,e,n);showLocationConfirmPopup(o,{getBoundingClientRect:()=>s})}function cancelLocationPick(){if(!_pendingLocationRow)return;_pendingLocationRow.querySelector(".btn-pick-location")?.classList.remove("picking-active"),_pendingLocationRow=null;const t=document.getElementById("listening-script");t&&(t.classList.remove("location-pickable-textarea"),t.removeEventListener("mouseup",_onScriptMouseUp));const e=document.getElementById("content-composer-preview-body");e?.classList.remove("location-picking"),e?.querySelectorAll?.(".mixed-content-text").forEach(i=>i.classList.remove("location-pickable"));const n=document.getElementById("location-pick-hint");n&&n.classList.add("hidden"),window.getSelection()?.removeAllRanges?.()}function clearLocationValue(t){t.querySelector(".answer-location").value="";const e=t.querySelector(".answer-location-meta");e&&(e.value=""),t.querySelector(".location-text-display").textContent="Ch\u01B0a ch\u1ECDn",t.querySelector(".btn-clear-location").classList.add("hidden"),scheduleQuestionDraftSave()}function getPreviewBlockElement(t){return t&&(t.nodeType===Node.TEXT_NODE?t.parentElement:t)?.closest?.("#content-composer-preview-body [data-block-id]")||null}function getTextOffsetWithin(t,e,n){try{const i=document.createRange();return i.selectNodeContents(t),i.setEnd(e,n),i.toString().length}catch{return null}}function extractPreviewLocationSelection(){const t=document.getElementById("content-composer-preview-body"),e=t?.querySelector?.(".mixed-content"),n=window.getSelection();if(!t||!e||!n||n.isCollapsed||!n.rangeCount)return null;const i=n.getRangeAt(0);if(!t.contains(i.commonAncestorContainer))return null;const o=getPreviewBlockElement(i.startContainer),s=getPreviewBlockElement(i.endContainer);if(!o||!s)return{error:"Vui l\xF2ng ch\u1ECDn trong ph\u1EA7n text c\u1EE7a preview."};if(!o.classList.contains("mixed-content-text")||!s.classList.contains("mixed-content-text"))return{error:"Location ch\u1EC9 h\u1ED7 tr\u1EE3 tr\xEAn text, kh\xF4ng h\u1ED7 tr\u1EE3 tr\xEAn \u1EA3nh."};const a=Array.from(e.children).filter(f=>f.matches("[data-block-id]")),r=a.indexOf(o),l=a.indexOf(s);if(r<0||l<0)return{error:"Kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c v\xF9ng text \u0111\xE3 ch\u1ECDn."};const c=Math.min(r,l),d=Math.max(r,l);if(a.slice(c,d+1).some(f=>!f.classList.contains("mixed-content-text")))return{error:"B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 ch\u1ECDn tr\xEAn c\xE1c block text li\xEAn ti\u1EBFp, kh\xF4ng \u0111\u01B0\u1EE3c \u0111i qua \u1EA3nh."};const m=n.toString().trim();if(!m)return{error:"Ch\u01B0a c\xF3 text n\xE0o \u0111\u01B0\u1EE3c ch\u1ECDn."};const h=getTextOffsetWithin(o,i.startContainer,i.startOffset),g=getTextOffsetWithin(s,i.endContainer,i.endOffset);return h==null||g==null?{error:"Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c v\u1ECB tr\xED text \u0111\xE3 ch\u1ECDn."}:{text:m,meta:{type:"preview_text_range",start_block_id:o.dataset.blockId,end_block_id:s.dataset.blockId,start_offset:h,end_offset:g,text:m}}}let _pendingLocationResult=null,_pendingLocationRange=null;function removeLocationPopup(){document.getElementById("location-confirm-popup")?.remove(),_pendingLocationResult=null,_pendingLocationRange=null}function showLocationConfirmPopup(t,e){removeLocationPopup(),_pendingLocationResult=t,_pendingLocationRange=e?.cloneRange?e.cloneRange():null;const n=e.getBoundingClientRect(),o=document.getElementById("content-composer-preview-body")?.getBoundingClientRect()||{left:0,right:window.innerWidth},s=document.createElement("div");s.id="location-confirm-popup",s.className="location-confirm-popup",s.innerHTML=`
    <div class="lcp-label">X\xE1c nh\u1EADn v\u1ECB tr\xED \u0111\xE3 ch\u1ECDn</div>
    <div class="lcp-text">${escapeHtml(t.text)}</div>
    <div class="lcp-actions">
      <button class="lcp-cancel" id="lcp-cancel">\u2715 Hu\u1EF7</button>
      <button class="lcp-confirm" id="lcp-confirm">\u2713 X\xE1c nh\u1EADn</button>
    </div>`,document.body.appendChild(s);const a=s.offsetWidth||320,r=s.offsetHeight||118,l=window.visualViewport?.width??window.innerWidth,u=(window.visualViewport?.height??window.innerHeight)-n.bottom>=r+12?n.bottom+8:n.top-r-8,m=Math.max(8,l-a-8),h=Math.min(Math.max(o.left+4,n.left),m);s.style.top=`${Math.max(8,u)}px`,s.style.left=`${Math.max(8,h)}px`,document.getElementById("lcp-confirm").onclick=()=>commitLocationSelection(),document.getElementById("lcp-cancel").onclick=()=>{removeLocationPopup(),window.getSelection()?.removeAllRanges?.(),cancelLocationPick()}}function commitLocationSelection(t){const e=t??_pendingLocationResult;if(!e||!_pendingLocationRow)return;const n=t?null:_pendingLocationRange;if(t||removeLocationPopup(),n){const a=n.getBoundingClientRect();if(a.width>0&&a.height>0){const r=document.createElement("div");Object.assign(r.style,{position:"fixed",top:a.top+"px",left:a.left+"px",width:a.width+"px",height:a.height+"px",background:"#fef08a",borderRadius:"3px",pointerEvents:"none",zIndex:"599",opacity:"1",transition:"opacity 2s ease"}),document.body.appendChild(r),requestAnimationFrame(()=>requestAnimationFrame(()=>{r.style.opacity="0"})),setTimeout(()=>r.remove(),2100)}}_pendingLocationRow.querySelector(".answer-location").value=e.text;const i=_pendingLocationRow.querySelector(".answer-location-meta");i&&(i.value=JSON.stringify(e.meta));const o=_pendingLocationRow.querySelector(".location-text-display");o&&(o.textContent=e.text),_pendingLocationRow.querySelector(".btn-clear-location")?.classList.remove("hidden"),window.getSelection()?.removeAllRanges?.();const s=_pendingLocationRow;cancelLocationPick(),s.scrollIntoView({behavior:"smooth",block:"center"}),scheduleQuestionDraftSave()}document.addEventListener("mouseup",t=>{if(!_pendingLocationRow||t.target?.closest?.("#location-confirm-popup"))return;const e=extractPreviewLocationSelection();if(!e)return;if(e.error){toast(e.error,"warning");return}const n=window.getSelection(),i=n?.rangeCount?n.getRangeAt(0):null;i&&showLocationConfirmPopup(e,i)}),document.addEventListener("keydown",t=>{const e=t.target?.closest?.('[role="button"][tabindex="0"]');if(e&&(t.key==="Enter"||t.key===" ")){t.preventDefault(),e.click();return}if(t.key==="Escape"){if(document.getElementById("sidebar")?.classList.contains("sidebar--mobile-open")){t.preventDefault(),closeMobileSidebar();return}if(document.getElementById("drag-assign-panel")||_dragQuestionId){t.preventDefault(),cancelDragAssign();return}if(document.getElementById("location-confirm-popup")){removeLocationPopup(),window.getSelection()?.removeAllRanges?.(),cancelLocationPick();return}_pendingLocationRow&&cancelLocationPick();const o=document.getElementById("modal-overlay");o&&!o.classList.contains("hidden")&&closeModal()}});function initDarkMode(){const t=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",t);const e=document.getElementById("dark-mode-toggle");e&&(e.textContent=t==="dark"?"\u2600\uFE0F":"\u{1F319}")}function toggleDarkMode(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e);const n=document.getElementById("dark-mode-toggle");n&&(n.textContent=e==="dark"?"\u2600\uFE0F":"\u{1F319}")}window.toggleDarkMode=toggleDarkMode;const _origNavigate=navigate;function navigateWithTransition(t){const e=document.getElementById("app");e?(e.classList.add("page-exit"),setTimeout(()=>{e.classList.remove("page-exit"),_origNavigate(t)},120)):_origNavigate(t)}document.addEventListener("DOMContentLoaded",()=>{initDarkMode()}),initDarkMode(),window.navigate=navigateWithTransition,window.router=router,window.closeModal=closeModal,window.openCreateClassModal=openCreateClassModal,window.submitCreateClass=submitCreateClass,window.openAssignModal=openAssignModal,window.filterAssignQuestionSearch=filterAssignQuestionSearch,window.setAssignTagFilter=setAssignTagFilter,window.filterAssignQuestions=filterAssignQuestions,window.selectQuestion=selectQuestion,window.submitAssign=submitAssign,window.toggleAssignment=toggleAssignment,window.deleteAssignment=deleteAssignment,window.deleteQuestion=deleteQuestion,window.setSkillFilter=setSkillFilter,window.onSkillChange=onSkillChange,window.openImagePicker=openImagePicker,window.toggleComposerEditor=toggleComposerEditor,window.onAudioSelected=onAudioFilesSelected,window.removeAudio=removeAudio,window.submitQuestion=submitQuestion,window.submitQuestionEdit=submitQuestionEdit,window.openSubmissionModal=openSubmissionModal,window.closeAnnotationPopup=closeAnnotationPopup,window.confirmAnnotation=confirmAnnotation,window.removeAnnotation=removeAnnotation,window.scrollToAnnotation=scrollToAnnotation,window.editAnnotation=editAnnotation,window.saveAnnotation=saveAnnotation,window.saveGrading=saveGrading,window.SKILL_LABELS=SKILL_LABELS,window.openAddStudentModal=openAddStudentModal,window.switchStudentTab=switchStudentTab,window.submitCreateStudent=submitCreateStudent,window.submitAddExistingStudent=submitAddExistingStudent,window.downloadStudentCredentialsCsv=downloadStudentCredentialsCsv,window.openResetPasswordModal=openResetPasswordModal,window.submitResetPassword=submitResetPassword,window.removeStudentFromClass=removeStudentFromClass,window.addVocabItem=addVocabItem,window.removeVocabItem=removeVocabItem,window.toggleExplanation=toggleExplanation,window.locateInText=locateInText,window.scrollToFeedbackMark=scrollToFeedbackMark,window.activateLocationPick=activateLocationPick,window.clearLocationValue=clearLocationValue,window.cancelLocationPick=cancelLocationPick;function renderLoginGate(t=""){document.getElementById("sidebar").style.display="none",document.getElementById("mobile-hamburger").style.display="none",document.getElementById("app").innerHTML=`
    <div style="display:flex;align-items:center;justify-content:center;min-height:80vh">
      <div style="width:100%;max-width:360px;padding:32px;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">
        <div style="text-align:center;margin-bottom:24px">
          <span style="font-size:2rem">\u{1F393}</span>
          <h2 style="margin:8px 0 4px;font-size:1.25rem">English Teacher Portal</h2>
          <p style="color:var(--text-muted);font-size:.875rem">Nh\u1EADp m\u1EADt kh\u1EA9u \u0111\u1EC3 truy c\u1EADp</p>
        </div>
        ${t?`<div style="color:#ef4444;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:.875rem">${t}</div>`:""}
        <form id="login-gate-form" onsubmit="submitLoginGate(event)">
          <div style="position:relative;margin-bottom:12px">
            <input id="gate-password" type="password" aria-label="M\u1EADt kh\u1EA9u" placeholder="M\u1EADt kh\u1EA9u" autocomplete="current-password"
              style="width:100%;padding:10px 40px 10px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-size:1rem;box-sizing:border-box" />
            <button type="button" onclick="toggleGatePassword()"
              style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;padding:0;line-height:1"
              id="gate-eye-btn" title="Hi\u1EC7n/\u1EA9n m\u1EADt kh\u1EA9u">\u{1F441}</button>
          </div>
          <button type="submit" id="gate-submit-btn"
            style="width:100%;padding:10px;background:var(--primary);color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer">
            \u0110\u0103ng nh\u1EADp
          </button>
        </form>
      </div>
    </div>`,document.getElementById("gate-password").focus()}const TEACHER_AUTH_FLAG="teacher_auth_ok";function expireTeacherSession(t=""){api.clearCache(),api.setAuthToken(""),sessionStorage.removeItem(TEACHER_AUTH_FLAG),history.replaceState(null,"",window.location.pathname),document.getElementById("sidebar").style.display="none",document.getElementById("mobile-hamburger").style.display="none",renderLoginGate(t)}async function submitLoginGate(t){t.preventDefault();const e=document.getElementById("gate-submit-btn"),n=document.getElementById("gate-password").value;e.disabled=!0,e.textContent="\u0110ang ki\u1EC3m tra...";try{await fetch(api._base+"/teacher-auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:n}),credentials:"include"}).then(async i=>{const o=await i.json().catch(()=>({}));if(!i.ok)throw new Error(o.error||"Sai m\u1EADt kh\u1EA9u");if(!o?.token)throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c token \u0111\u0103ng nh\u1EADp");api.setAuthToken(o.token)}),sessionStorage.setItem(TEACHER_AUTH_FLAG,"1"),document.getElementById("sidebar").style.display="",document.getElementById("mobile-hamburger").style.display="",refreshInboxBadge(),router()}catch(i){renderLoginGate(i.message||"Sai m\u1EADt kh\u1EA9u")}}async function logout(){await fetch(api._base+"/teacher-auth/logout",{method:"POST",credentials:"include"}).catch(()=>{}),expireTeacherSession()}async function boot(){pruneTeacherQuestionDrafts();try{const t=await fetch(api._base+"/teacher-auth/status",{headers:api._authHeaders(),credentials:"include"}),{authenticated:e}=await t.json();if(!e){expireTeacherSession();return}sessionStorage.setItem(TEACHER_AUTH_FLAG,"1")}catch{renderLoginGate("Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c server");return}refreshInboxBadge(),router()}function toggleGatePassword(){const t=document.getElementById("gate-password"),e=document.getElementById("gate-eye-btn");if(!t)return;const n=t.type==="password";t.type=n?"text":"password",e.textContent=n?"\u{1F648}":"\u{1F441}"}let _sharedQuestions=[],_sharedSearch="",_sharedSkillFilter="";async function showSharedPool(){const t=routeToken();let e;try{e=await api.get("/shared-pool")}catch(n){if(routeChanged(t))return;renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c kho \u0111\u1EC1 luy\u1EC7n t\u1EADp",n,"/shared-pool");return}routeChanged(t)||(_sharedQuestions=e,renderSharedPool())}function renderSharedPool(){let t=_sharedSkillFilter?_sharedQuestions.filter(i=>i.skill===_sharedSkillFilter):_sharedQuestions;if(_sharedSearch){const i=_sharedSearch.toLowerCase();t=t.filter(o=>o.title.toLowerCase().includes(i)||Array.isArray(o.tags)&&o.tags.some(s=>s.toLowerCase().includes(i)))}const e=$("#app")?.querySelector(".shared-pool-tbody");if(e){e.innerHTML=_buildSharedPoolRows(t),document.querySelectorAll(".shared-skill-tab").forEach(i=>i.classList.toggle("active",i.dataset.skill===_sharedSkillFilter));return}$("#app").innerHTML=`
    <div class="page-header">
      <div>
        <div class="page-title">Kho \u0111\u1EC1 luy\u1EC7n t\u1EADp</div>
        <div class="page-subtitle">T\u1ED5ng c\u1ED9ng ${_sharedQuestions.length} \u0111\u1EC1 \u2014 t\u1EF1 \u0111\u1ED9ng hi\u1EC3n th\u1ECB cho t\u1EA5t c\u1EA3 h\u1ECDc sinh</div>
      </div>
      <button class="btn btn-primary" onclick="navigate('/shared-pool/new')">+ T\u1EA1o \u0111\u1EC1 m\u1EDBi</button>
    </div>
    <div class="list-toolbar">
      <input id="shared-search-input" class="form-input search-input"
        placeholder="\u{1F50D} T\xECm theo t\xEAn \u0111\u1EC1 ho\u1EB7c tag..."
        value="${escapeHtml(_sharedSearch)}" />
    </div>
    <div class="skill-tabs">
      ${[["","T\u1EA5t c\u1EA3"],["reading","\u{1F4D6} Reading"],["listening","\u{1F3A7} Listening"],["writing","\u270D\uFE0F Writing"],["speaking","\u{1F3A4} Speaking"]].map(([i,o])=>`<button class="skill-tab shared-skill-tab ${_sharedSkillFilter===i?"active":""}" data-skill="${i}" onclick="setSharedSkillFilter('${i}')">${o}</button>`).join("")}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>K\u1EF9 n\u0103ng</th><th>Ti\xEAu \u0111\u1EC1</th><th>Tags</th>
          <th>Th\u1EDDi gian</th><th>L\u01B0\u1EE3t l\xE0m</th><th>Ng\xE0y t\u1EA1o</th><th>Thao t\xE1c</th>
        </tr></thead>
        <tbody class="shared-pool-tbody">${_buildSharedPoolRows(t)}</tbody>
      </table>
    </div>`;const n=document.getElementById("shared-search-input");n&&(n.addEventListener("input",()=>{_sharedSearch=n.value,renderSharedPool()}),_sharedSearch&&n.focus())}function _buildSharedPoolRows(t){return t.length?t.map(e=>`
    <tr>
      <td>${skillBadge(e.skill)}</td>
      <td><a onclick="navigate('/shared-pool/${e.id}')" style="cursor:pointer;color:var(--primary)">${escapeHtml(e.title)}</a></td>
      <td>${Array.isArray(e.tags)&&e.tags.length?e.tags.map(n=>`<span class="tag-chip">${escapeHtml(n)}</span>`).join(" "):'<span style="color:var(--gray-300)">\u2014</span>'}</td>
      <td>${e.time_limit_minutes?`${e.time_limit_minutes} ph\xFAt`:'<span style="color:var(--gray-300)">\u2014</span>'}</td>
      <td>${e.attempt_count||0}</td>
      <td>${formatDate(e.created_at)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-outline" onclick="showSharedPoolStats('${e.id}','${escapeHtml(e.title)}')">\u{1F4CA} Th\u1ED1ng k\xEA</button>
        <button class="btn btn-sm btn-outline" onclick="navigate('/shared-pool/${e.id}')">\u270F\uFE0F S\u1EEDa</button>
        <button class="btn btn-sm btn-outline" style="color:var(--red)" onclick="deleteSharedQuestion('${e.id}','${escapeHtml(e.title)}')">\u{1F5D1}</button>
      </td>
    </tr>`).join(""):'<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:32px">Ch\u01B0a c\xF3 \u0111\u1EC1 n\xE0o.</td></tr>'}function setSharedSkillFilter(t){_sharedSkillFilter=t,renderSharedPool()}window.setSharedSkillFilter=setSharedSkillFilter;async function deleteSharedQuestion(t,e){if(await confirmAction({title:"Xo\xE1 \u0111\u1EC1 kh\u1ECFi kho luy\u1EC7n t\u1EADp",message:`\u0110\u1EC1 <strong>${escapeHtml(e)}</strong> s\u1EBD b\u1ECB xo\xE1 kh\u1ECFi Kho \u0111\u1EC1 luy\u1EC7n t\u1EADp.`,confirmText:"Xo\xE1 \u0111\u1EC1",danger:!0}))try{await api.delete(`/shared-pool/${t}`),_sharedQuestions=_sharedQuestions.filter(i=>i.id!==t),renderSharedPool(),toast("\u0110\xE3 xo\xE1 \u0111\u1EC1","success")}catch(i){toast("L\u1ED7i xo\xE1 \u0111\u1EC1: "+(i.error||i.message),"error")}}window.deleteSharedQuestion=deleteSharedQuestion;let _sharedStatsModal=null,_sharedStatsChart=null,_sharedStatsRows=[],_sharedStatsMode="avg";async function showSharedPoolStats(t,e){if(_sharedStatsModal&&(_sharedStatsModal.remove(),_sharedStatsModal=null),_sharedStatsChart){try{_sharedStatsChart.destroy()}catch{}_sharedStatsChart=null}const n=document.createElement("div");n.className="modal-overlay",n.innerHTML=`
    <div class="modal modal-wide" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>\u{1F4CA} Th\u1ED1ng k\xEA: ${escapeHtml(e)}</h3>
        <button class="modal-close" onclick="closeSharedStatsModal()" aria-label="\u0110\xF3ng">\xD7</button>
      </div>
      <div class="modal-body sp-stats-body">
        <div style="text-align:center;padding:40px 0"><div class="spinner"></div><p style="color:var(--gray-400);margin-top:12px">\u0110ang t\u1EA3i th\u1ED1ng k\xEA...</p></div>
      </div>
    </div>`,n.addEventListener("click",o=>{o.target===n&&closeSharedStatsModal()}),document.body.appendChild(n),_sharedStatsModal=n;let i;try{i=await api.get(`/shared-pool/${t}/stats`)}catch(o){n.querySelector(".sp-stats-body").innerHTML=`<p style="color:var(--red);text-align:center">L\u1ED7i t\u1EA3i th\u1ED1ng k\xEA: ${escapeHtml(o.error||o.message)}</p>`;return}_sharedStatsRows=i,_sharedStatsMode="avg",_renderSharedStatsBody(n.querySelector(".sp-stats-body"))}function closeSharedStatsModal(){if(_sharedStatsChart){try{_sharedStatsChart.destroy()}catch{}_sharedStatsChart=null}_sharedStatsModal&&(_sharedStatsModal.remove(),_sharedStatsModal=null)}function _groupSharedStatsByStudent(t){const e=new Map;for(const i of t)e.has(i.student_id)||e.set(i.student_id,{student_id:i.student_id,student_name:i.student_name||"",class_names:i.class_names||"\u2014",attempts:[]}),e.get(i.student_id).attempts.push(i);const n=[...e.values()];for(const i of n){const o=i.attempts.map(s=>s.overall_score).filter(s=>s!=null).map(Number);i.avg=o.length?o.reduce((s,a)=>s+a,0)/o.length:null,i.max=o.length?Math.max(...o):null,i.count=i.attempts.length}return n}function _renderSharedStatsBody(t){const e=_sharedStatsRows,n=_groupSharedStatsByStudent(e),i=e.map(r=>r.overall_score).filter(r=>r!=null).map(Number),o=r=>r.length?r.reduce((l,c)=>l+c,0)/r.length:null,s=r=>{if(!r.length)return null;const l=[...r].sort((d,u)=>d-u),c=Math.floor(l.length/2);return l.length%2?l[c]:(l[c-1]+l[c])/2},a=r=>r!=null?Number(r).toFixed(1):"\u2014";t.innerHTML=`
    <div class="sp-stats-summary">
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${e.length}</div><div class="sp-stats-kpi-lbl">T\u1ED5ng l\u01B0\u1EE3t l\xE0m</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${n.length}</div><div class="sp-stats-kpi-lbl">H\u1ECDc sinh</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(o(i))}</div><div class="sp-stats-kpi-lbl">\u0110i\u1EC3m TB</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(i.length?Math.max(...i):null)}</div><div class="sp-stats-kpi-lbl">Cao nh\u1EA5t</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(i.length?Math.min(...i):null)}</div><div class="sp-stats-kpi-lbl">Th\u1EA5p nh\u1EA5t</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(s(i))}</div><div class="sp-stats-kpi-lbl">Trung v\u1ECB</div></div>
    </div>

    <div class="sp-stats-chart-section">
      <div class="sp-stats-chart-header">
        <span class="sp-stats-section-title">Ph\u1ED5 \u0111i\u1EC3m</span>
        <div class="sp-stats-mode-toggle">
          <button class="sp-stats-mode-btn ${_sharedStatsMode==="avg"?"active":""}" onclick="setSharedStatsMode('avg')">Trung b\xECnh / HS</button>
          <button class="sp-stats-mode-btn ${_sharedStatsMode==="max"?"active":""}" onclick="setSharedStatsMode('max')">\u0110i\u1EC3m cao nh\u1EA5t / HS</button>
        </div>
      </div>
      <div class="sp-stats-chart-wrap">
        <canvas id="sp-stats-chart"></canvas>
      </div>
    </div>

    <div class="sp-stats-section-title" style="margin:20px 0 10px">K\u1EBFt qu\u1EA3 t\u1EEBng h\u1ECDc sinh</div>
    ${n.length===0?'<p style="color:var(--gray-400);text-align:center;padding:24px 0">Ch\u01B0a c\xF3 h\u1ECDc sinh n\xE0o l\xE0m b\xE0i.</p>':`<div class="sp-stats-table-wrap">
          <table class="sp-stats-table">
            <thead><tr>
              <th>H\u1ECDc sinh</th><th>L\u1EDBp</th><th>S\u1ED1 l\u1EA7n</th>
              <th>\u0110i\u1EC3m TB</th><th>Cao nh\u1EA5t</th><th></th>
            </tr></thead>
            <tbody>
              ${n.map(r=>`
                <tr class="sp-stats-student-row" data-sid="${r.student_id}">
                  <td>
                    <span class="sp-stats-avatar">${escapeHtml((r.student_name||"?").charAt(0).toUpperCase())}</span>
                    ${escapeHtml(r.student_name)}
                  </td>
                  <td class="sp-stats-cell-muted">${escapeHtml(r.class_names)}</td>
                  <td>${r.count}</td>
                  <td><span class="stats-score-badge">${a(r.avg)}</span></td>
                  <td><span class="stats-score-badge">${a(r.max)}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline sp-expand-btn"
                      onclick="toggleSharedStudentDetail('${r.student_id}')">Chi ti\u1EBFt \u25BE</button>
                  </td>
                </tr>
                <tr class="sp-stats-detail-row hidden" id="sp-detail-${r.student_id}">
                  <td colspan="6" style="padding:0 0 0 40px">
                    <div class="sp-stats-detail-inner">
                      <table class="sp-stats-detail-table">
                        <thead><tr><th>#</th><th>Ch\u1EBF \u0111\u1ED9</th><th>Ng\xE0y n\u1ED9p</th><th>\u0110i\u1EC3m</th></tr></thead>
                        <tbody>
                          ${[...r.attempts].sort((l,c)=>new Date(l.submitted_at)-new Date(c.submitted_at)).map((l,c)=>`
                            <tr>
                              <td>${c+1}</td>
                              <td>${l.mode==="real_test"?"\u{1F3AF} Thi th\u1EADt":"\u{1F4DD} Luy\u1EC7n t\u1EADp"}</td>
                              <td>${formatDateTime(l.submitted_at)}</td>
                              <td><span class="stats-score-badge">${l.overall_score!=null?Number(l.overall_score).toFixed(1):"\u2014"}</span></td>
                            </tr>`).join("")}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`}
    <div style="display:flex;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
      <button class="btn btn-outline" onclick="closeSharedStatsModal()">\u0110\xF3ng</button>
    </div>
  `,_buildSharedStatsChart(n)}function _buildSharedStatsChart(t){if(_sharedStatsChart){try{_sharedStatsChart.destroy()}catch{}_sharedStatsChart=null}const e=document.getElementById("sp-stats-chart");if(!e)return;const n=t.map(a=>_sharedStatsMode==="avg"?a.avg:a.max).filter(a=>a!=null).map(Number),i=[];for(let a=1;a<=9;a+=.5)i.push(a);const o=new Array(i.length).fill(0);for(const a of n){const r=Math.round(a*2)/2,l=i.indexOf(Math.min(9,Math.max(1,r)));l>=0&&o[l]++}const s=i.map(a=>a>=7?{bg:"#16a34a99",border:"#16a34a"}:a>=5?{bg:"#ca8a0499",border:"#ca8a04"}:{bg:"#dc262699",border:"#dc2626"});ensureChartJsLoaded().then(()=>{_sharedStatsChart=new Chart(e,{type:"bar",data:{labels:i.map(a=>a%1===0?String(a):a.toFixed(1)),datasets:[{label:_sharedStatsMode==="avg"?"\u0110i\u1EC3m TB / HS":"\u0110i\u1EC3m cao nh\u1EA5t / HS",data:o,backgroundColor:s.map(a=>a.bg),borderColor:s.map(a=>a.border),borderWidth:1,borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{title:a=>`Band ${a[0].label}`,label:a=>`${a.raw} h\u1ECDc sinh`}}},scales:{x:{title:{display:!0,text:"Band IELTS"},grid:{display:!1}},y:{title:{display:!0,text:"S\u1ED1 h\u1ECDc sinh"},beginAtZero:!0,ticks:{stepSize:1}}}}})}).catch(()=>{const a=e.parentElement;a&&(a.innerHTML='<div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center"><p>Kh\xF4ng th\u1EC3 t\u1EA3i bi\u1EC3u \u0111\u1ED3 l\xFAc n\xE0y.</p></div>')})}function setSharedStatsMode(t){_sharedStatsMode=t,document.querySelectorAll(".sp-stats-mode-btn").forEach(e=>{e.classList.toggle("active",e.textContent.includes(t==="avg"?"Trung b\xECnh":"Cao nh\u1EA5t"))}),_buildSharedStatsChart(_groupSharedStatsByStudent(_sharedStatsRows))}function toggleSharedStudentDetail(t){const e=document.getElementById(`sp-detail-${t}`),n=document.querySelector(`.sp-stats-student-row[data-sid="${t}"] .sp-expand-btn`);if(!e)return;const i=e.classList.toggle("hidden");n&&(n.textContent=i?"Chi ti\u1EBFt \u25BE":"Thu g\u1ECDn \u25B4")}window.showSharedPoolStats=showSharedPoolStats,window.closeSharedStatsModal=closeSharedStatsModal,window.setSharedStatsMode=setSharedStatsMode,window.toggleSharedStudentDetail=toggleSharedStudentDetail;let _sharedEditingId=null;async function showSharedPoolForm(){_sharedEditingId=null,_vocabItems=[],_contentBlocks=[createTextBlock("")],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,_editingVocabIndex=-1,renderSharedPoolFormPage("T\u1EA1o \u0111\u1EC1 luy\u1EC7n t\u1EADp m\u1EDBi",null);const t=restoreSpDraftIntoForm("new");startSpDraftAutosave("new"),t&&toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p ch\u01B0a l\u01B0u trong 15 ph\xFAt g\u1EA7n nh\u1EA5t.","info")}async function showSharedPoolDetail({id:t}){const e=routeToken();let n;try{n=await api.get(`/shared-pool/${t}`)}catch(o){if(routeChanged(e))return;renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c \u0111\u1EC1",o,"/shared-pool");return}if(routeChanged(e))return;_sharedEditingId=t,_vocabItems=Array.isArray(n.vocabulary)?[...n.vocabulary]:[],_contentBlocks=Array.isArray(n.content_blocks)&&n.content_blocks.length?n.content_blocks:[createTextBlock(n.content_text||"")],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=n.content_url||null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,_editingVocabIndex=-1,renderSharedPoolFormPage("S\u1EEDa \u0111\u1EC1 luy\u1EC7n t\u1EADp",n);const i=restoreSpDraftIntoForm("edit",t,n.skill,n);startSpDraftAutosave("edit",t,n.skill),i&&toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p ch\u01B0a l\u01B0u trong 15 ph\xFAt g\u1EA7n nh\u1EA5t.","info");try{const o=await api.get(`/shared-pool/${t}/stats`);if(routeChanged(e))return;renderSharedPoolStats(o,t)}catch{}}function renderSharedPoolFormPage(t,e){const n=e?.skill||"";$("#app").innerHTML=`
    <a class="back-link" onclick="navigate('/shared-pool')">\u2190 Kho \u0111\u1EC1 luy\u1EC7n t\u1EADp</a>
    <div class="page-header"><div class="page-title">${escapeHtml(t)}</div></div>
    <div class="form-card">
      <div class="form-group">
        <label class="form-label">Ti\xEAu \u0111\u1EC1 <span class="required">*</span></label>
        <input id="sp-title" class="form-input" placeholder="T\xEAn \u0111\u1EC1..." value="${escapeHtml(e?.title||"")}" />
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:180px">
          <label class="form-label">K\u1EF9 n\u0103ng <span class="required">*</span></label>
          <select id="sp-skill" class="form-input" onchange="onSharedSkillChange(this.value)">
            <option value="">-- Ch\u1ECDn k\u1EF9 n\u0103ng --</option>
            ${["reading","listening","writing","speaking"].map(i=>`<option value="${i}" ${n===i?"selected":""}>${i.charAt(0).toUpperCase()+i.slice(1)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group" style="flex:0 0 160px">
          <label class="form-label">Th\u1EDDi gian ki\u1EC3m tra (ph\xFAt)</label>
          <input id="sp-time-limit" class="form-input" type="number" min="1" max="999"
            placeholder="Kh\xF4ng gi\u1EDBi h\u1EA1n" value="${e?.time_limit_minutes||""}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div id="sp-tags-chip" class="chip-input-container">
          <input id="sp-tag-input" class="chip-input" placeholder="Nh\u1EADp tag r\u1ED3i Enter..." />
        </div>
      </div>
      <div id="sp-skill-form"></div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="navigate(_sharedEditingId ? '/shared-pool/'+_sharedEditingId : '/shared-pool')">Hu\u1EF7</button>
        <button id="sp-submit-btn" class="btn btn-primary" onclick="submitSharedPoolQuestion()">
          ${_sharedEditingId?"L\u01B0u thay \u0111\u1ED5i":"T\u1EA1o \u0111\u1EC1"}
        </button>
      </div>
    </div>
    <div id="sp-stats-section"></div>`,Array.isArray(e?.tags)&&e.tags.forEach(i=>addChip($("#sp-tags-chip"),i)),attachChipListeners($("#sp-tag-input"),$("#sp-tags-chip")),n&&onSharedSkillChange(n,e)}function onSharedSkillChange(t,e){const n=$("#sp-skill-form");if(!n)return;if(!t){n.innerHTML="";return}let i="";if(t==="reading"?i=skillEditorHtml("reading",{includeLocationHint:!1}):t==="listening"?i=skillEditorHtml("listening",{includeLocationHint:!1,scriptValue:e?.script||"",scriptPlaceholder:"Script s\u1EBD t\u1EF1 \u0111\u1ED9ng \u0111i\u1EC1n sau khi upload audio. B\u1EA1n c\u0169ng c\xF3 th\u1EC3 nh\u1EADp th\u1EE7 c\xF4ng."}):t==="writing"?i=skillEditorHtml("writing",{writingHintBox:'<div class="form-hint-box">\u2139\uFE0F Writing l\xE0 t\u1EF1 lu\u1EADn \u2014 kh\xF4ng c\u1EA7n nh\u1EADp \u0111\xE1p \xE1n m\u1EABu.</div>'}):t==="speaking"&&(i=skillEditorHtml("speaking",{speakingHintBox:'<div class="form-hint-box">\u2139\uFE0F Speaking \u2014 h\u1ECDc sinh s\u1EBD upload file audio.</div>'})),n.innerHTML=i,initContentComposer(e?.content_blocks||[],e?.content_text||""),(t==="reading"||t==="listening")&&Array.isArray(e?.questions_data)&&e.questions_data.length)renderAnswerGridWithData(e.questions_data);else{const o=$("#answer-count");o&&o.addEventListener("input",()=>{const s=parseInt(o.value)||0;s>0&&s<=100&&renderAnswerGrid(s)})}if(Array.isArray(e?.vocabulary)&&(_vocabItems=[...e.vocabulary],renderVocabList()),t==="listening"){const o=Array.isArray(e?.content_urls)&&e.content_urls.length>0?e.content_urls:e?.content_url?[{url:e.content_url,name:"",key:null}]:[];_audioSlots=o.length>0?o.map(s=>({..._newAudioSlot(),displayName:s.name||"",name:s.filename||s.name||"audio",url:s.url||null,key:s.key||null,status:"done",transcript:null})):[_newAudioSlot()],_audioFiles=_audioSlots,_renderAudioSlots()}}window.onSharedSkillChange=onSharedSkillChange;async function submitSharedPoolQuestion(){const t=$("#sp-title")?.value.trim(),e=$("#sp-skill")?.value,n=$("#sp-time-limit")?.value.trim(),i=n?parseInt(n,10):null;if(!t){toast("Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1","error");return}if(!e){toast("Vui l\xF2ng ch\u1ECDn k\u1EF9 n\u0103ng","error");return}if(_contentImageUploadCount>0){toast("\u1EA2nh \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}if(e==="listening"&&_audioSlots.filter(s=>s.status==="done").length===0&&!_sharedEditingId){toast("Vui l\xF2ng upload \xEDt nh\u1EA5t 1 file audio","error");return}if(e==="reading"||e==="listening"){const s=checkEmptyAnswers();if(s.length>0){confirmSaveWithEmptyAnswers(s,()=>submitSharedPoolQuestion());return}}const o=$("#sp-submit-btn");btnLoading(o);try{const s=getChipValues($("#sp-tags-chip"));syncContentBlocksFromEditor();const a=normalizeContentBlocksForEditor(_contentBlocks),r=blocksToPlainText(a)||"";let l={title:t,skill:e,content_blocks:a,content_text:r,vocabulary:_vocabItems,tags:s};if(i&&(l.time_limit_minutes=i),(e==="reading"||e==="listening")&&(l.questions_data=collectAnswerGrid()),e==="listening"){const c=_audioSlots.filter(d=>d.status==="done");c.length>0&&(l.content_url=c[0]?.url||null,l.content_urls=c.map(d=>({url:d.url,key:d.key,name:d.displayName||d.name}))),l.script=($("#listening-script")?.value||"").trim()||null}_sharedEditingId?(await api.patch(`/shared-pool/${_sharedEditingId}`,l),stopSpDraftAutosave(),clearQuestionDraft(getSpDraftKey("edit",_sharedEditingId)),toast("\u0110\xE3 l\u01B0u thay \u0111\u1ED5i","success")):(await api.post("/shared-pool",l),stopSpDraftAutosave(),clearQuestionDraft(getSpDraftKey("new")),toast("\u0110\xE3 t\u1EA1o \u0111\u1EC1 luy\u1EC7n t\u1EADp! \u{1F389}","success")),navigate("/shared-pool")}catch(s){btnReset(o),toast("L\u1ED7i l\u01B0u \u0111\u1EC1: "+(s.error||s.message),"error")}}window.submitSharedPoolQuestion=submitSharedPoolQuestion;function renderSharedPoolStats(t,e){const n=$("#sp-stats-section");n&&(n.innerHTML=`
    <div class="page-header" style="margin-top:32px">
      <div class="page-title" style="font-size:18px">\u{1F4CA} Th\u1ED1ng k\xEA l\u01B0\u1EE3t l\xE0m</div>
    </div>
    ${t.length===0?'<p style="color:var(--gray-400)">Ch\u01B0a c\xF3 h\u1ECDc sinh n\xE0o l\xE0m \u0111\u1EC1 n\xE0y.</p>':`<div class="table-wrap"><table>
          <thead><tr>
            <th>H\u1ECDc sinh</th><th>L\u1EDBp</th><th>Mode</th>
            <th>\u0110i\u1EC3m</th><th>Th\u1EDDi gian n\u1ED9p</th>
          </tr></thead>
          <tbody>${t.map(i=>`
            <tr>
              <td>${escapeHtml(i.full_name||i.username)}</td>
              <td>${escapeHtml(i.class_names||"\u2014")}</td>
              <td><span class="badge ${i.mode==="real_test"?"badge-red":"badge-blue"}">${i.mode==="real_test"?"Thi th\u1EED":"Luy\u1EC7n t\u1EADp"}</span></td>
              <td>${i.overall_score!=null?`${i.overall_score}${i.max_score?"/"+i.max_score:""}`:"\u2014"}</td>
              <td>${formatDate(i.submitted_at)}</td>
            </tr>`).join("")}
          </tbody></table></div>`}`)}window.showSharedPool=showSharedPool,window.showSharedPoolForm=showSharedPoolForm,window.showSharedPoolDetail=showSharedPoolDetail;let _cqSections=[],_cqEditingIdx=-1;function _cqSkillIcon(t){return{reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"}[t]||""}function _cqSkillLabel(t){return{reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking"}[t]||t}function _newCQSection(){return{label:"",skill:"",time_limit_minutes:null,questions_data:[],content_blocks:[],content_text:"",content_url:null,content_urls:[],script:"",vocabulary:[]}}function _saveCQCurrentEditorState(){if(_cqEditingIdx<0||!_cqSections[_cqEditingIdx])return;const t=_cqSections[_cqEditingIdx];t.label=document.getElementById("cq-label")?.value.trim()??t.label,t.time_limit_minutes=(()=>{const n=document.getElementById("cq-time")?.value;return n?Number(n):null})(),syncContentBlocksFromEditor();const e=normalizeContentBlocksForEditor(_contentBlocks);if(t.content_blocks=e,t.content_text=blocksToPlainText(e)||"",(t.skill==="reading"||t.skill==="listening")&&(t.questions_data=collectAnswerGrid?collectAnswerGrid():[]),t.skill==="listening"){const n=_audioSlots.filter(i=>i.status==="done");t.content_url=n[0]?.url||null,t.content_urls=n.map(i=>({url:i.url,key:i.key,name:i.displayName||i.name,filename:i.name})),t.script=document.getElementById("listening-script")?.value.trim()??t.script}t.vocabulary=Array.isArray(_vocabItems)?[..._vocabItems]:[]}function _loadCQSectionIntoEditor(t){const e=_cqSections[t];_contentBlocks=(e.content_blocks||[]).map(n=>({...n})),_vocabItems=Array.isArray(e.vocabulary)?[...e.vocabulary]:[],_editingVocabIndex=-1,e.skill==="listening"&&(_audioSlots=(e.content_urls?.length?e.content_urls:e.content_url?[{url:e.content_url,key:null,name:"audio"}]:[]).map(i=>({displayName:i.name||"",file:null,name:i.filename||i.name||"",size:0,status:"done",url:i.url,key:i.key||null,pct:100,eta:null})),_audioSlots.length===0&&(_audioSlots=[_newAudioSlot()]),_audioFiles=_audioSlots,_audioUploading=!1)}function renderCQSectionsUI(){const t=document.getElementById("skill-section");if(!t)return;const e=_cqEditingIdx>=0,n=_cqSections.map((o,s)=>{if(s===_cqEditingIdx)return"";const a=[o.skill?`${_cqSkillIcon(o.skill)} ${_cqSkillLabel(o.skill)}`:"",o.time_limit_minutes?`\u23F1 ${o.time_limit_minutes} ph\xFAt`:"",(o.skill==="reading"||o.skill==="listening")&&o.questions_data?.length?`${o.questions_data.length} c\xE2u`:""].filter(Boolean).join(" \xB7 ");return`<div class="cq-section-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-card)">
      <div>
        <span style="font-weight:600;font-size:14px">${s+1}. ${escapeHtml(o.label||"(Ch\u01B0a \u0111\u1EB7t t\xEAn)")}</span>
        ${a?`<span style="font-size:12px;color:var(--gray-400);margin-left:8px">${a}</span>`:""}
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" onclick="editCQSection(${s})">\u270F\uFE0F S\u1EEDa</button>
        <button class="btn-icon danger" onclick="removeCQSection(${s})" aria-label="Xo\xE1 ph\u1EA7n n\xE0y">\xD7</button>
      </div>
    </div>`}).join("");let i="";if(e){const o=_cqSections[_cqEditingIdx];let s="";o.skill==="reading"?s=skillEditorHtml("reading",{includeVocab:!1}):o.skill==="listening"?s=skillEditorHtml("listening",{includeVocab:!1,scriptValue:o.script||"",scriptPlaceholder:"Script t\u1EF1 \u0111\u1ED9ng \u0111i\u1EC1n sau khi upload audio",scriptRows:6}):o.skill==="writing"?s=skillEditorHtml("writing",{}):o.skill==="speaking"&&(s=skillEditorHtml("speaking",{})),i=`
      <div class="cq-editor-panel" style="border:2px solid var(--primary);border-radius:10px;padding:16px;margin-bottom:10px;background:var(--bg-card)">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--primary)">
          \u270F\uFE0F Ch\u1EC9nh s\u1EEDa ph\u1EA7n ${_cqEditingIdx+1}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div>
            <label class="form-label" style="font-size:12px">T\xEAn ph\u1EA7n *</label>
            <input id="cq-label" class="form-input" value="${escapeHtml(o.label)}" placeholder="VD: B\xE0i \u0111\u1ECDc 1" />
          </div>
          <div>
            <label class="form-label" style="font-size:12px">K\u1EF9 n\u0103ng *</label>
            <select id="cq-skill" class="form-select" onchange="onCQSkillChange(this.value)">
              <option value="">\u2014 Ch\u1ECDn \u2014</option>
              <option value="reading" ${o.skill==="reading"?"selected":""}>\u{1F4D6} Reading</option>
              <option value="listening" ${o.skill==="listening"?"selected":""}>\u{1F3A7} Listening</option>
              <option value="writing" ${o.skill==="writing"?"selected":""}>\u270D\uFE0F Writing</option>
              <option value="speaking" ${o.skill==="speaking"?"selected":""}>\u{1F3A4} Speaking</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:12px">Th\u1EDDi gian (ph\xFAt)</label>
            <input id="cq-time" class="form-input" type="number" min="1" max="300"
              value="${o.time_limit_minutes??""}" placeholder="Kh\xF4ng gi\u1EDBi h\u1EA1n" />
          </div>
        </div>
        <div id="cq-skill-content">${o.skill?s:'<div style="color:var(--gray-400);font-size:13px;padding:12px;text-align:center">Ch\u1ECDn k\u1EF9 n\u0103ng \u0111\u1EC3 hi\u1EC3n th\u1ECB form</div>'}</div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-outline" onclick="cancelCQEdit()">H\u1EE7y</button>
          <button class="btn btn-primary" onclick="saveCQSection()">\u{1F4BE} L\u01B0u ph\u1EA7n n\xE0y</button>
        </div>
      </div>`}if(t.innerHTML=`
    <div style="margin-bottom:10px;font-weight:600;font-size:14px">C\xE1c ph\u1EA7n thi <span style="color:var(--danger)">*</span></div>
    ${i}
    <div id="cq-list">${n||(e?"":'<div style="text-align:center;padding:20px;color:var(--gray-400);border:2px dashed var(--border);border-radius:8px">Nh\u1EA5n "+ Th\xEAm k\u1EF9 n\u0103ng" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u</div>')}</div>
    ${e?"":'<button class="btn btn-outline" style="margin-top:10px" onclick="addCQSection()">+ Th\xEAm k\u1EF9 n\u0103ng</button>'}
  `,e){const o=_cqSections[_cqEditingIdx];if(initContentComposer(o.content_blocks||[],""),o.skill==="listening"&&_renderAudioSlots(),o.skill==="reading"||o.skill==="listening"){o.questions_data?.length>0&&renderAnswerGridWithData(o.questions_data);const s=document.getElementById("answer-count");s&&s.addEventListener("input",()=>{const a=parseInt(s.value)||0;a>0&&a<=100&&renderAnswerGrid(a)})}renderVocabList&&renderVocabList(),syncVocabEditorState&&syncVocabEditorState()}}window.renderCQSectionsUI=renderCQSectionsUI;function addCQSection(){_saveCQCurrentEditorState(),_cqSections.push(_newCQSection()),_cqEditingIdx=_cqSections.length-1,_contentBlocks=[],_vocabItems=[],_editingVocabIndex=-1,_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioUploading=!1,renderCQSectionsUI()}window.addCQSection=addCQSection;function editCQSection(t){_saveCQCurrentEditorState(),_cqEditingIdx=t,_loadCQSectionIntoEditor(t),renderCQSectionsUI()}window.editCQSection=editCQSection;function saveCQSection(){const t=document.getElementById("cq-label");if(!t||!t.value.trim()){toast("Vui l\xF2ng \u0111\u1EB7t t\xEAn ph\u1EA7n thi","error");return}const e=document.getElementById("cq-skill");if(!e?.value){toast("Vui l\xF2ng ch\u1ECDn k\u1EF9 n\u0103ng","error");return}const n=e.value;if(n==="listening"){if(_audioSlots.filter(o=>o.status==="done").length===0){toast("Ph\u1EA7n Listening c\u1EA7n \xEDt nh\u1EA5t 1 file audio","error");return}if(_audioUploading){toast("Audio v\u1EABn \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}}const i=()=>{_cqSections[_cqEditingIdx].skill=n,_saveCQCurrentEditorState(),_cqEditingIdx=-1,_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,renderCQSectionsUI()};if(n==="reading"||n==="listening"){const o=checkEmptyAnswers();if(o.length>0){confirmSaveWithEmptyAnswers(o,i);return}}i()}window.saveCQSection=saveCQSection;function cancelCQEdit(){_cqSections[_cqEditingIdx]?.skill===""&&_cqSections.splice(_cqEditingIdx,1),_cqEditingIdx=-1,_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,renderCQSectionsUI()}window.cancelCQEdit=cancelCQEdit;function removeCQSection(t){_cqEditingIdx===t?(_cqEditingIdx=-1,_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots):_cqEditingIdx>t&&_cqEditingIdx--,_cqSections.splice(t,1),renderCQSectionsUI()}window.removeCQSection=removeCQSection;function onCQSkillChange(t){_cqEditingIdx<0||(_saveCQCurrentEditorState(),_cqSections[_cqEditingIdx].skill=t,_cqSections[_cqEditingIdx].questions_data=[],_cqSections[_cqEditingIdx].content_blocks=[],_cqSections[_cqEditingIdx].content_url=null,_cqSections[_cqEditingIdx].content_urls=[],_cqSections[_cqEditingIdx].script="",_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioUploading=!1,renderCQSectionsUI())}window.onCQSkillChange=onCQSkillChange;async function showCompositeSubmissions({id:t}){setLoading("\u0110ang t\u1EA3i \u0111\u1EC1 t\u1ED5ng h\u1EE3p...");const e=routeToken();try{const n=await api.get(`/assignments/${t}/composite-submissions`);if(routeChanged(e))return;renderCompositeSubmissions(n)}catch(n){if(routeChanged(e))return;renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u",n,"/classes")}}window.showCompositeSubmissions=showCompositeSubmissions;function renderCompositeSubmissions({assignment:t,sections:e,perStudent:n}){const i=t,o=t?.id||"",s={reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"},a=e.length,r=n.length===0?`<tr><td colspan="${a+2}" style="text-align:center;padding:24px;color:var(--gray-400)">L\u1EDBp ch\u01B0a c\xF3 h\u1ECDc sinh</td></tr>`:n.map(l=>{const c=e.map(d=>{const u=l.sections.find(f=>f.section_id===d.id)?.submission;if(!u)return'<td style="text-align:center;color:var(--gray-400)">\u2014</td>';const m=u.score!=null?`<span style="font-weight:700;color:var(--primary)">${u.score}/9</span>`:`<span style="color:var(--gray-400);font-size:12px">${d.skill==="reading"||d.skill==="listening"?"\u2014":"Ch\u1EDD ch\u1EA5m"}</span>`,h=u.is_overtime?'<span class="stats-overtime-pill" style="display:block;font-size:10px;margin-top:2px">OT</span>':"",g=d.skill==="writing"||d.skill==="speaking"?`<button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 6px;margin-top:2px"
                onclick="navigate('/grading/${u.id}')">Ch\u1EA5m</button>`:"";return`<td style="text-align:center">${m}${h}${g}</td>`}).join("");return`<tr>
          <td>
            <div style="font-weight:600">${escapeHtml(l.full_name)}</div>
            <div style="font-size:11px;color:var(--gray-400);font-family:monospace">${escapeHtml(l.username)}</div>
          </td>
          ${c}
          <td style="text-align:center;font-size:12px;color:var(--gray-400)">
            ${l.sections.filter(d=>d.submission).length}/${a} ph\u1EA7n
          </td>
        </tr>`}).join("");$("#app").innerHTML=`
    <nav class="breadcrumb">
      <a class="breadcrumb-item" onclick="navigate('/classes')">L\u1EDBp h\u1ECDc</a>
      <span class="breadcrumb-sep">\u203A</span>
      <a class="breadcrumb-item" onclick="navigate('/class/${i.class_id||""}')">L\u1EDBp</a>
      <span class="breadcrumb-sep">\u203A</span>
      <span class="breadcrumb-item active">${escapeHtml(i.title)}</span>
    </nav>
    <div class="detail-header">
      <div class="detail-header-info">
        <h2>\u{1F4CB} ${escapeHtml(i.title)}</h2>
        <div class="detail-header-meta">
          <span>\u{1F4C5} H\u1EA1n n\u1ED9p: ${formatDateTime(i.deadline)}</span>
          <span>${i.is_active?"\u{1F7E2} \u0110ang m\u1EDF":"\u{1F534} \u0110\xE3 \u0111\xF3ng"}</span>
        </div>
      </div>
    </div>
    <div class="table-wrap" style="overflow-x:auto">
      <table>
        <thead><tr>
          <th>H\u1ECDc sinh</th>
          ${e.map(l=>`<th style="text-align:center;min-width:110px">${s[l.skill]||""} ${escapeHtml(l.label)}</th>`).join("")}
          <th style="text-align:center">Ti\u1EBFn \u0111\u1ED9</th>
        </tr></thead>
        <tbody>${r}</tbody>
      </table>
    </div>`}window.renderCompositeSubmissions=renderCompositeSubmissions;let _gradingCompositeSubId=null,_gradingCompositeAssignId=null;async function openCompositeSubmissionGrading(t,e,n){_gradingCompositeSubId=t,_gradingCompositeAssignId=n||null,openModal(`Ch\u1EA5m b\xE0i \u2014 ${e==="writing"?"Writing":"Speaking"}`,`
    <div class="form-group">
      <label class="form-label">\u0110i\u1EC3m Band (0\u20139)</label>
      <input id="composite-grade-score" class="form-input" type="number" min="0" max="9" step="0.5" placeholder="VD: 6.5" />
    </div>
    <div class="form-group">
      <label class="form-label">Nh\u1EADn x\xE9t</label>
      <textarea id="composite-grade-feedback" class="form-input" rows="4" placeholder="Nh\u1EADn x\xE9t c\u1EE7a gi\xE1o vi\xEAn..."></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
      <button class="btn btn-primary" onclick="saveCompositeGrading(this)">\u{1F4BE} L\u01B0u</button>
    </div>`)}window.openCompositeSubmissionGrading=openCompositeSubmissionGrading;async function saveCompositeGrading(t){const e=document.getElementById("composite-grade-score")?.value,n=document.getElementById("composite-grade-feedback")?.value.trim()||"",i=e!==""&&e!=null?parseFloat(e):null;if(i!==null&&(isNaN(i)||i<0||i>9)){toast("\u0110i\u1EC3m Band ph\u1EA3i t\u1EEB 0 \u0111\u1EBFn 9","error");return}btnLoading(t);try{await api.patch(`/composite-section-submissions/${_gradingCompositeSubId}/score`,{score:i,feedback:n}),closeModal(),toast("\u0110\xE3 l\u01B0u nh\u1EADn x\xE9t! \u2713"),_gradingCompositeAssignId&&showCompositeSubmissions({id:_gradingCompositeAssignId})}catch(o){btnReset(t),toast("L\u1ED7i: "+(o.error||o.message),"error")}}window.saveCompositeGrading=saveCompositeGrading,window.submitLoginGate=submitLoginGate,window.toggleGatePassword=toggleGatePassword,window.logout=logout,window._onTeacherUnauthorized=()=>{expireTeacherSession("Phi\xEAn \u0111\u0103ng nh\u1EADp h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.")},window.addEventListener("pagehide",flushQuestionDraftSave),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot,{once:!0}):boot();
