const API_BASE="https://ielts-teacher-api.quangducngo0811.workers.dev",API_CACHE_TTL_MS=1e4,API_CACHE_PREFIX="ielts_teacher_api_cache:",TEACHER_AUTH_TOKEN_KEY="teacher_auth_token",api={_base:API_BASE,_cache:new Map,_authToken(){try{return sessionStorage.getItem(TEACHER_AUTH_TOKEN_KEY)||""}catch{return""}},setAuthToken(t){try{t?sessionStorage.setItem(TEACHER_AUTH_TOKEN_KEY,t):sessionStorage.removeItem(TEACHER_AUTH_TOKEN_KEY)}catch{}},_authHeaders(t={}){const e={...t},n=this._authToken();return n&&(e.Authorization=`Bearer ${n}`),e},_cacheKey(t){return API_CACHE_PREFIX+t},_readCache(t){const e=this._cacheKey(t),n=this._cache.get(e);if(n&&n.expires>Date.now())return n.data;try{const i=sessionStorage.getItem(e);if(!i)return null;const s=JSON.parse(i);return!s||s.expires<=Date.now()?(sessionStorage.removeItem(e),this._cache.delete(e),null):(this._cache.set(e,s),s.data)}catch{return null}},_writeCache(t,e){const n=this._cacheKey(t),i={expires:Date.now()+1e4,data:e};this._cache.set(n,i);try{sessionStorage.setItem(n,JSON.stringify(i))}catch{}},clearCache(){this._cache.clear();try{for(let t=sessionStorage.length-1;t>=0;t--){const e=sessionStorage.key(t);e&&e.startsWith(API_CACHE_PREFIX)&&sessionStorage.removeItem(e)}}catch{}},_handle401(t){t.status===401&&(this.clearCache(),window._onTeacherUnauthorized?.())},async _readJsonSafe(t){const e=await t.text();if(!e)return null;try{return JSON.parse(e)}catch{return{error:e}}},_fetchWithTimeout(t,e,n=3e4){const i=new AbortController,s=setTimeout(()=>i.abort(),n);return fetch(t,{...e,signal:i.signal}).finally(()=>clearTimeout(s))},async get(t){const e=this._readCache(t);if(e)return e;const n=await this._fetchWithTimeout(API_BASE+t,{headers:this._authHeaders(),credentials:"include"});if(!n.ok)throw this._handle401(n),await this._readJsonSafe(n)||{error:"Request failed"};const i=await this._readJsonSafe(n);return this._writeCache(t,i),i},async post(t,e){const n=await this._fetchWithTimeout(API_BASE+t,{method:"POST",headers:this._authHeaders({"Content-Type":"application/json"}),body:JSON.stringify(e),credentials:"include"});if(!n.ok)throw this._handle401(n),await this._readJsonSafe(n)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(n)},async postForm(t,e){const n=await fetch(API_BASE+t,{method:"POST",headers:this._authHeaders(),body:e,credentials:"include"});if(!n.ok)throw this._handle401(n),await this._readJsonSafe(n)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(n)},async patch(t,e){const n=await this._fetchWithTimeout(API_BASE+t,{method:"PATCH",headers:this._authHeaders({"Content-Type":"application/json"}),body:JSON.stringify(e),credentials:"include"});if(!n.ok)throw this._handle401(n),await this._readJsonSafe(n)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(n)},async delete(t){const e=await this._fetchWithTimeout(API_BASE+t,{method:"DELETE",headers:this._authHeaders(),credentials:"include"});if(!e.ok)throw this._handle401(e),await this._readJsonSafe(e)||{error:"Request failed"};return this.clearCache(),this._readJsonSafe(e)},fileUrl(t){return t?t.startsWith("http")?t:API_BASE+t:null}};function $(t){return document.querySelector(t)}function escapeHtml(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function renderMarkdownInline(t){return escapeHtml(t).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*\n]+)\*/g,"<em>$1</em>")}function renderSafeMarkdown(t){const e=String(t||"").replace(/\r\n/g,`
`).split(`
`),n=[];let i=null;const s=()=>{i&&(n.push(`</${i}>`),i=null)};for(const o of e){const a=o.trim();if(!a){s();continue}const l=a.match(/^[-*]\s+(.+)$/),r=a.match(/^\d+\.\s+(.+)$/);if(l||r){const d=l?"ul":"ol";i!==d&&(s(),n.push(`<${d}>`),i=d),n.push(`<li>${renderMarkdownInline((l||r)[1])}</li>`);continue}s();const c=a.match(/^(#{2,4})\s+(.+)$/);c?n.push(`<h5>${renderMarkdownInline(c[2])}</h5>`):n.push(`<p>${renderMarkdownInline(a)}</p>`)}return s(),n.join("")}function btnReset(t){t&&(t.disabled=!1,t.innerHTML=t._origHTML||t.innerHTML)}function toast(t,e="success"){const n=e==="error"?6e3:3500,i=document.createElement("div");i.className=`toast toast-${e}`,i.setAttribute("role","alert");const s=document.createElement("span");s.textContent=t;const o=document.createElement("button");o.className="toast-close",o.setAttribute("aria-label","\u0110\xF3ng th\xF4ng b\xE1o"),o.textContent="\xD7",o.onclick=()=>i.remove(),i.appendChild(s),i.appendChild(o),i.addEventListener("mouseenter",()=>i.classList.add("toast-paused")),i.addEventListener("mouseleave",()=>i.classList.remove("toast-paused")),$("#toast-container").appendChild(i);const a=setTimeout(()=>i.remove(),n);i.addEventListener("mouseenter",()=>clearTimeout(a)),i.addEventListener("mouseleave",()=>setTimeout(()=>i.remove(),1e3))}function setLoading(t="\u0110ang t\u1EA3i..."){$("#app").innerHTML=`
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>${t}</p>
    </div>`}function formatDateTime(t){return t?new Date(t).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"Kh\xF4ng c\xF3 h\u1EA1n"}function isOverdue(t){return t?new Date(t)<new Date:!1}function makeSortIcon(t,e,n){return e!==t?'<span class="sort-icon">\u2195</span>':`<span class="sort-icon active">${n==="asc"?"\u2191":"\u2193"}</span>`}window.makeSortIcon=makeSortIcon;function sanitizeBlockHtml(t){if(!t||typeof t!="string")return"";const e=document.createElement("div");e.innerHTML=t;const n=/^(javascript:|vbscript:|data:text\/html)/i;return e.querySelectorAll("script,style,iframe,object,embed,form,base,meta,link").forEach(i=>i.remove()),e.querySelectorAll("*").forEach(i=>{for(const s of[...i.attributes]){const o=s.name.toLowerCase();if(/^on\w+$/.test(o)||o.includes(":")||o==="action"||o==="formaction"){i.removeAttribute(s.name);continue}(o==="href"||o==="src"||o==="srcset")&&n.test(s.value.trim())&&i.removeAttribute(s.name)}}),e.innerHTML}function toggleSidebar(){const t=document.getElementById("sidebar");if((window.visualViewport?.width??window.innerWidth)<=768){openMobileSidebar();return}const e=t.classList.toggle("sidebar--collapsed");localStorage.setItem("sidebar-collapsed",e?"1":"0")}let _mobileSidebarPreviousFocus=null;function setMobileSidebarState(t){const e=document.getElementById("sidebar"),n=document.getElementById("sidebar-backdrop"),i=document.getElementById("mobile-hamburger");if(!(!e||!n)){if(e.classList.toggle("sidebar--mobile-open",t),n.classList.toggle("active",t),e.setAttribute("aria-hidden",String(!t)),i?.setAttribute("aria-expanded",String(t)),t){e.removeAttribute("inert"),document.body.style.overflow="hidden",requestAnimationFrame(()=>{e.querySelector(".nav-link, .sidebar-toggle, .btn-logout")?.focus()});return}(window.visualViewport?.width??window.innerWidth)<=768&&e.setAttribute("inert",""),document.body.style.overflow=""}}function openMobileSidebar(){_mobileSidebarPreviousFocus=document.activeElement,setMobileSidebarState(!0)}function closeMobileSidebar(){setMobileSidebarState(!1),_mobileSidebarPreviousFocus instanceof HTMLElement&&_mobileSidebarPreviousFocus.focus(),_mobileSidebarPreviousFocus=null}window.openMobileSidebar=openMobileSidebar,window.closeMobileSidebar=closeMobileSidebar,function(){localStorage.getItem("sidebar-collapsed")==="1"&&document.getElementById("sidebar")?.classList.add("sidebar--collapsed"),(window.visualViewport?.width??window.innerWidth)<=768&&(document.getElementById("sidebar")?.setAttribute("inert",""),document.getElementById("sidebar")?.setAttribute("aria-hidden","true"))}(),window.addEventListener("resize",()=>{const t=document.getElementById("sidebar"),e=document.getElementById("mobile-hamburger");if(t){if((window.visualViewport?.width??window.innerWidth)<=768){t.classList.contains("sidebar--mobile-open")||(t.setAttribute("inert",""),t.setAttribute("aria-hidden","true"),e?.setAttribute("aria-expanded","false"));return}t.removeAttribute("inert"),t.setAttribute("aria-hidden","false"),e?.setAttribute("aria-expanded","false"),document.body.style.overflow=""}});function btnLoading(t){if(!t)return;t._origHTML=t.innerHTML,t.disabled=!0;const e=t.classList.contains("btn-icon");t.innerHTML=e?'<span class="btn-spinner btn-spinner--dark"></span>':'<span class="btn-spinner"></span> \u0110ang x\u1EED l\xFD...'}let _chartJsLoadingPromise=null;function ensureChartJsLoaded(){return window.Chart?Promise.resolve(window.Chart):_chartJsLoadingPromise||(_chartJsLoadingPromise=new Promise((t,e)=>{const n=document.createElement("script");n.src="js/vendor/chart.umd.min.js",n.async=!0,n.onload=()=>t(window.Chart),n.onerror=()=>{_chartJsLoadingPromise=null,e(new Error("Kh\xF4ng th\u1EC3 t\u1EA3i Chart.js"))},document.head.appendChild(n)}),_chartJsLoadingPromise)}function renderRouteError(t,e,n=window.location.hash.slice(1)||"/classes"){const i=e?.error||e?.message||"Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u. Vui l\xF2ng th\u1EED l\u1EA1i.";$("#app").innerHTML=`
    <div class="empty-state-v2 route-error-state">
      <span class="empty-illu">\u26A0\uFE0F</span>
      <div class="empty-title">${escapeHtml(t)}</div>
      <div class="empty-desc">${escapeHtml(i)}</div>
      <div class="route-error-actions">
        <button class="btn btn-primary" onclick="router()">Th\u1EED l\u1EA1i</button>
        <button class="btn btn-outline" onclick="navigate('/classes')">V\u1EC1 l\u1EDBp h\u1ECDc</button>
      </div>
    </div>`,n&&(window._lastFailedRoute=n)}const SORTABLE_TH_ATTRS='class="sortable" role="button" tabindex="0"',QUESTION_DRAFT_PREFIX="ielts_teacher_question_draft:",QUESTION_DRAFT_TTL_MS=15*60*1e3,QUESTION_DRAFT_SAVE_INTERVAL_MS=15*1e3,QUESTION_DRAFT_SAVE_DEBOUNCE_MS=800;let _questionDraftContext=null,_questionDraftTimer=null,_questionDraftDebounceTimer=null,_suspendQuestionDraftSave=!1;function getQuestionDraftKey(t,e=""){return`${QUESTION_DRAFT_PREFIX}${t}:${e||"new"}`}function pruneTeacherQuestionDrafts(){try{for(let t=localStorage.length-1;t>=0;t--){const e=localStorage.key(t);if(!(!e||!e.startsWith(QUESTION_DRAFT_PREFIX)&&!e.startsWith(SP_DRAFT_PREFIX)))try{const n=localStorage.getItem(e);if(!n)continue;const i=JSON.parse(n);(!i?.expiresAt||i.expiresAt<=Date.now())&&localStorage.removeItem(e)}catch{localStorage.removeItem(e)}}}catch{}}function loadQuestionDraft(t){try{const e=localStorage.getItem(t);if(!e)return null;const n=JSON.parse(e);return!n?.expiresAt||n.expiresAt<=Date.now()?(localStorage.removeItem(t),null):n.data||null}catch{try{localStorage.removeItem(t)}catch{}return null}}function saveQuestionDraft(t,e){const n=Date.now();try{localStorage.setItem(t,JSON.stringify({data:e,savedAt:n,expiresAt:n+QUESTION_DRAFT_TTL_MS}))}catch{}}function clearQuestionDraft(t){if(t)try{localStorage.removeItem(t)}catch{}}function hasMeaningfulQuestionDraft(t){return t?String(t.title||"").trim()||String(t.skill||"").trim()||Array.isArray(t.tags)&&t.tags.length>0||String(t.script||"").trim()||Array.isArray(t.vocabulary)&&t.vocabulary.length>0||Array.isArray(t.questions_data)&&t.questions_data.some(n=>Array.isArray(n.answers)&&n.answers.length>0||String(n.location||"").trim()||String(n.explanation||"").trim())?!0:!!blocksToPlainText(t.content_blocks||[]).trim():!1}function getQuestionTagContainer(){return $("#q-tags-chip-edit")||$("#q-tags-chip")}function getQuestionTagInput(){return $("#q-tag-input-edit")||$("#q-tag-input")}function setQuestionChipValues(t,e,n=[]){!t||!e||(t.querySelectorAll(".chip").forEach(i=>i.remove()),n.forEach(i=>{const s=document.createElement("span");s.className="chip",s.dataset.value=String(i).trim(),s.innerHTML=`${escapeHtml(String(i).trim())} <button type="button" class="chip-remove" aria-label="Xo\xE1">\xD7</button>`,s.querySelector(".chip-remove").onclick=()=>s.remove(),t.insertBefore(s,e)}))}function snapshotCurrentQuestionDraft(){const t=$("#q-title");if(!t)return null;const e=$("#q-skill")?.value||_questionDraftContext?.skill||"",n=normalizeContentBlocksForEditor(_contentBlocks);return{mode:_questionDraftContext?.mode||"new",question_id:_questionDraftContext?.questionId||"",title:t.value.trim(),skill:e,tags:(()=>{const s=getQuestionTagContainer();return s?getChipValues(s):[]})(),content_blocks:n,questions_data:e==="reading"||e==="listening"?collectAnswerGrid():[],vocabulary:Array.isArray(_vocabItems)?_vocabItems.map(s=>({...s})):[],script:e==="listening"?($("#listening-script")?.value||"").trim():""}}function flushQuestionDraftSave(){if(_questionDraftDebounceTimer&&(clearTimeout(_questionDraftDebounceTimer),_questionDraftDebounceTimer=null),_suspendQuestionDraftSave||!_questionDraftContext)return;const t=snapshotCurrentQuestionDraft();if(!hasMeaningfulQuestionDraft(t)){clearQuestionDraft(_questionDraftContext.key);return}saveQuestionDraft(_questionDraftContext.key,t)}function scheduleQuestionDraftSave(){_suspendQuestionDraftSave||!_questionDraftContext||(_questionDraftDebounceTimer&&clearTimeout(_questionDraftDebounceTimer),_questionDraftDebounceTimer=setTimeout(()=>{_questionDraftDebounceTimer=null,flushQuestionDraftSave()},QUESTION_DRAFT_SAVE_DEBOUNCE_MS))}function stopQuestionDraftAutosave(){flushQuestionDraftSave(),_questionDraftTimer&&clearInterval(_questionDraftTimer),_questionDraftDebounceTimer&&clearTimeout(_questionDraftDebounceTimer),_questionDraftTimer=null,_questionDraftDebounceTimer=null,_questionDraftContext=null}function startQuestionDraftAutosave(t,e="",n=""){stopQuestionDraftAutosave(),_questionDraftContext={mode:t,questionId:e,key:getQuestionDraftKey(t,e),skill:n},_questionDraftTimer=setInterval(flushQuestionDraftSave,QUESTION_DRAFT_SAVE_INTERVAL_MS)}function restoreQuestionDraftIntoForm(t,e="",n=""){const i=loadQuestionDraft(getQuestionDraftKey(t,e));if(!i)return!1;_suspendQuestionDraftSave=!0;try{const s=$("#q-title");s&&(s.value=i.title||"");const o=$("#q-skill"),a=i.skill||n||o?.value||"";o&&!o.disabled&&(o.value=a,onSkillChange(a));const l=getQuestionTagContainer(),r=getQuestionTagInput();l&&r&&setQuestionChipValues(l,r,i.tags||[]),initContentComposer(i.content_blocks||[],""),(a==="reading"||a==="listening")&&Array.isArray(i.questions_data)&&i.questions_data.length>0&&renderAnswerGridWithData(i.questions_data),_vocabItems=Array.isArray(i.vocabulary)?i.vocabulary.map(d=>({...d})):[],(a==="reading"||a==="listening")&&renderVocabList();const c=$("#listening-script");return c&&(c.value=i.script||"",a==="listening"&&(_speakerNames=[],_refreshSpeakerNames(),_renderSpeakerRenameUI())),attachChipListeners(),!0}finally{_suspendQuestionDraftSave=!1}}function isQuestionDraftTarget(t){return!!(_questionDraftContext&&t instanceof Element&&t.closest("#app .form-card"))}document.addEventListener("input",t=>{isQuestionDraftTarget(t.target)&&scheduleQuestionDraftSave()},!0),document.addEventListener("change",t=>{isQuestionDraftTarget(t.target)&&scheduleQuestionDraftSave()},!0),document.addEventListener("click",t=>{if(!(t.target instanceof Element))return;const e=t.target.closest(".chip-remove, .vocab-remove, .vocab-edit, .btn-clear-location");!e||!isQuestionDraftTarget(e)||setTimeout(scheduleQuestionDraftSave,0)});const SP_DRAFT_PREFIX="ielts_teacher_sp_draft:";let _spDraftContext=null,_spDraftTimer=null,_spDraftDebounceTimer=null,_suspendSpDraftSave=!1;function getSpDraftKey(t,e=""){return`${SP_DRAFT_PREFIX}${t}:${e||"new"}`}function snapshotCurrentSpDraft(){const t=$("#sp-title");if(!t)return null;const e=$("#sp-skill")?.value||_spDraftContext?.skill||"",n=normalizeContentBlocksForEditor(_contentBlocks);return{mode:_spDraftContext?.mode||"new",sp_id:_spDraftContext?.spId||"",title:t.value.trim(),skill:e,time_limit_minutes:$("#sp-time-limit")?.value.trim()||"",tags:getChipValues($("#sp-tags-chip")),content_blocks:n,questions_data:e==="reading"||e==="listening"?collectAnswerGrid():[],vocabulary:Array.isArray(_vocabItems)?_vocabItems.map(i=>({...i})):[],script:e==="listening"?($("#listening-script")?.value||"").trim():""}}function flushSpDraftSave(){if(_spDraftDebounceTimer&&(clearTimeout(_spDraftDebounceTimer),_spDraftDebounceTimer=null),_suspendSpDraftSave||!_spDraftContext)return;const t=snapshotCurrentSpDraft();if(!hasMeaningfulQuestionDraft(t)){clearQuestionDraft(_spDraftContext.key);return}saveQuestionDraft(_spDraftContext.key,t)}function scheduleSpDraftSave(){_suspendSpDraftSave||!_spDraftContext||(_spDraftDebounceTimer&&clearTimeout(_spDraftDebounceTimer),_spDraftDebounceTimer=setTimeout(()=>{_spDraftDebounceTimer=null,flushSpDraftSave()},QUESTION_DRAFT_SAVE_DEBOUNCE_MS))}function stopSpDraftAutosave(){flushSpDraftSave(),_spDraftTimer&&clearInterval(_spDraftTimer),_spDraftDebounceTimer&&clearTimeout(_spDraftDebounceTimer),_spDraftTimer=null,_spDraftDebounceTimer=null,_spDraftContext=null}function startSpDraftAutosave(t,e="",n=""){stopSpDraftAutosave(),_spDraftContext={mode:t,spId:e,key:getSpDraftKey(t,e),skill:n},_spDraftTimer=setInterval(flushSpDraftSave,QUESTION_DRAFT_SAVE_INTERVAL_MS)}function restoreSpDraftIntoForm(t,e="",n=""){const i=loadQuestionDraft(getSpDraftKey(t,e));if(!i)return!1;_suspendSpDraftSave=!0;try{const s=$("#sp-title");s&&(s.value=i.title||"");const o=$("#sp-time-limit");o&&i.time_limit_minutes&&(o.value=i.time_limit_minutes);const a=i.skill||n||"",l=$("#sp-skill");if(l&&a){l.value=a;const d={skill:a,content_blocks:i.content_blocks||[],content_text:"",questions_data:i.questions_data||[],vocabulary:i.vocabulary||[],script:i.script||""};onSharedSkillChange(a,d)}const r=$("#sp-tags-chip"),c=$("#sp-tag-input");return r&&c&&setQuestionChipValues(r,c,i.tags||[]),attachChipListeners($("#sp-tag-input"),$("#sp-tags-chip")),!0}finally{_suspendSpDraftSave=!1}}function isSpDraftTarget(t){return!!(_spDraftContext&&t instanceof Element&&t.closest("#app .form-card"))}document.addEventListener("input",t=>{isSpDraftTarget(t.target)&&scheduleSpDraftSave()},!0),document.addEventListener("change",t=>{isSpDraftTarget(t.target)&&scheduleSpDraftSave()},!0),document.addEventListener("click",t=>{if(!(t.target instanceof Element))return;const e=t.target.closest(".chip-remove, .vocab-remove, .vocab-edit, .btn-clear-location");!e||!isSpDraftTarget(e)||setTimeout(scheduleSpDraftSave,0)});function formatDate(t){return t?new Date(t).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}):"\u2014"}const SKILL_LABELS={reading:{icon:"\u{1F4D6}",label:"Reading",badge:"badge-reading"},listening:{icon:"\u{1F3A7}",label:"Listening",badge:"badge-listening"},writing:{icon:"\u270D\uFE0F",label:"Writing",badge:"badge-writing"},speaking:{icon:"\u{1F3A4}",label:"Speaking",badge:"badge-speaking"},composite:{icon:"\u{1F4CB}",label:"T\u1ED5ng h\u1EE3p",badge:"badge-composite"}},FILTERABLE_ASSIGNMENT_SKILLS=["reading","listening","writing","speaking","composite"];function skillBadge(t){const e=SKILL_LABELS[t]||{icon:"?",label:t,badge:""};return`<span class="badge ${e.badge}">${e.icon} ${e.label}</span>`}let _modalPreviousFocus=null;const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';function openModal(t,e){const n=$("#modal-overlay"),i=n?.querySelector(".modal");_modalPreviousFocus=document.activeElement,$("#modal-title").textContent=t,$("#modal-body").innerHTML=e,n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true"),n.setAttribute("aria-labelledby","modal-title"),n.classList.remove("hidden");const s=(i||n).querySelector(FOCUSABLE);s&&s.focus()}function confirmAction({title:t="X\xE1c nh\u1EADn thao t\xE1c",message:e,confirmText:n="X\xE1c nh\u1EADn",cancelText:i="Hu\u1EF7",danger:s=!1}={}){return new Promise(o=>{openModal(t,`
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="line-height:1.6;color:var(--text)">${e||""}</div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-outline" data-confirm-action="cancel">${escapeHtml(i)}</button>
          <button class="btn ${s?"btn-danger":"btn-primary"}" data-confirm-action="confirm">${escapeHtml(n)}</button>
        </div>
      </div>
    `);const a=$("#modal-overlay"),l=a?.querySelector('[data-confirm-action="cancel"]'),r=a?.querySelector('[data-confirm-action="confirm"]');let c=!1;const d=u=>{c||(c=!0,window._modalCloseCallback=null,closeModal(),o(u))};window._modalCloseCallback=()=>d(!1),l.onclick=()=>d(!1),r.onclick=()=>d(!0),a.onclick=u=>{u.target===a&&d(!1)}})}function promptAction({title:t="Nh\u1EADp th\xF4ng tin",message:e="",initialValue:n="",placeholder:i="",confirmText:s="L\u01B0u",cancelText:o="Hu\u1EF7",validate:a}={}){return new Promise(l=>{openModal(t,`
      <div style="display:flex;flex-direction:column;gap:16px">
        ${e?`<div style="line-height:1.6;color:var(--text)">${e}</div>`:""}
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="prompt-action-input" class="form-input" type="text" value="${escapeHtml(n)}" placeholder="${escapeHtml(i)}" />
          <div id="prompt-action-error" style="min-height:18px;font-size:12px;color:var(--danger)"></div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-outline" data-prompt-action="cancel">${escapeHtml(o)}</button>
          <button class="btn btn-primary" data-prompt-action="confirm">${escapeHtml(s)}</button>
        </div>
      </div>
    `);const r=$("#modal-overlay"),c=r?.querySelector("#prompt-action-input"),d=r?.querySelector("#prompt-action-error"),u=r?.querySelector('[data-prompt-action="cancel"]'),m=r?.querySelector('[data-prompt-action="confirm"]');let h=!1;const g=S=>{h||(h=!0,window._modalCloseCallback=null,closeModal(),l(S))};window._modalCloseCallback=()=>g(null);const b=()=>{const S=c?.value??"",y=S.trim(),L=typeof a=="function"?a(y,S):"";if(L){d&&(d.textContent=L),c?.focus(),c?.select?.();return}g(y)};u.onclick=()=>g(null),m.onclick=b,c?.addEventListener("keydown",S=>{S.key==="Enter"&&(S.preventDefault(),b())}),r.onclick=S=>{S.target===r&&g(null)},requestAnimationFrame(()=>{c?.focus(),c?.select?.()})})}let _oneTimeStudentCredentials=null;function closeModal(t){const e=$("#modal-overlay");t&&t.target!==e||(_oneTimeStudentCredentials=null,e&&(e.onclick=n=>closeModal(n)),window._modalCloseCallback&&(window._modalCloseCallback(),window._modalCloseCallback=null),e.classList.add("hidden"),$("#modal-body").innerHTML="",_modalPreviousFocus&&(_modalPreviousFocus.focus(),_modalPreviousFocus=null))}document.addEventListener("keydown",t=>{const e=$("#modal-overlay");if(!e||e.classList.contains("hidden"))return;const n=e.querySelector(".modal")||e;if(t.key==="Escape"){closeModal();return}if(t.key==="Tab"){const i=[...n.querySelectorAll(FOCUSABLE)];if(!i.length)return;const s=i[0],o=i[i.length-1];(t.shiftKey?document.activeElement===s:document.activeElement===o)&&(t.preventDefault(),(t.shiftKey?o:s).focus())}});function csvEscape(t){return`"${String(t??"").replace(/"/g,'""')}"`}function downloadCsvFile(t,e,n){const i=[e,...n].map(l=>l.map(csvEscape).join(",")).join(`
`),s=new Blob(["\uFEFF"+i],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(s),a=document.createElement("a");a.href=o,a.download=t,a.click(),URL.revokeObjectURL(o)}function buildStudentCredentialsFilename(t="student_accounts"){const e=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");return`${t}_${e}.csv`}function openStudentCredentialsModal(t,e,n="student_accounts"){const i=(Array.isArray(e)?e:[]).map(s=>({full_name:String(s?.full_name||"").trim(),username:String(s?.username||"").trim(),password:String(s?.password||"")})).filter(s=>s.full_name&&s.username&&s.password);_oneTimeStudentCredentials=i.length>0?{rows:i,fileName:buildStudentCredentialsFilename(n)}:null,openModal(t,`
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
            ${i.map(s=>`
              <tr>
                <td>${escapeHtml(s.full_name)}</td>
                <td style="font-family:monospace">${escapeHtml(s.username)}</td>
                <td style="font-family:monospace">${escapeHtml(s.password)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
      <button class="btn btn-primary" onclick="downloadStudentCredentialsCsv()">\u{1F4E5} T\u1EA3i CSV</button>
    </div>`)}function downloadStudentCredentialsCsv(){_oneTimeStudentCredentials?.rows?.length&&downloadCsvFile(_oneTimeStudentCredentials.fileName,["H\u1ECD t\xEAn","Username","Password"],_oneTimeStudentCredentials.rows.map(t=>[t.full_name,t.username,t.password]))}function addChip(t,e){if(!e.trim())return;const n=document.createElement("span");n.className="chip",n.dataset.value=e.trim(),n.innerHTML=`${e.trim()} <button class="chip-remove" title="Xo\xE1">\xD7</button>`,n.querySelector(".chip-remove").onclick=()=>n.remove();const i=t.querySelector(".chip-input");t.insertBefore(n,i),scheduleQuestionDraftSave()}function getChipValues(t){return Array.from(t.querySelectorAll(".chip")).map(e=>e.dataset.value)}function _chipKeydown(t){t.isComposing||t.keyCode===229||t.key==="Enter"&&t.target.value.trim()&&(t.preventDefault(),addChip(t.target.parentElement,t.target.value.trim()),t.target.value="")}function _chipBlur(t){const e=t.target.value.trim();e&&(addChip(t.target.parentElement,e),t.target.value="")}function attachChipListeners(){document.querySelectorAll(".chip-input").forEach(t=>{t.removeEventListener("keydown",_chipKeydown),t.removeEventListener("blur",_chipBlur),t.addEventListener("keydown",_chipKeydown),t.addEventListener("blur",_chipBlur)})}function checkEmptyAnswers(){const t=document.querySelectorAll("#answer-grid .answer-row"),e=[];return t.forEach((n,i)=>{const s=n.querySelector(".chip-container"),o=s?s.querySelectorAll(".chip"):[],a=n.querySelector(".chip-input")?.value.trim()||"";o.length===0&&!a&&e.push(i+1)}),e}function confirmSaveWithEmptyAnswers(t,e){const n=t.map(s=>`Q${s}`).join(", "),i=document.createElement("div");i.className="modal-overlay",i.innerHTML=`
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
    </div>`,document.body.appendChild(i),i.querySelector("#confirm-cancel-save").onclick=()=>i.remove(),i.querySelector("#confirm-do-save").onclick=()=>{i.remove(),e()},i.addEventListener("click",s=>{s.target===i&&i.remove()})}function collectAnswerGrid(){const t=document.querySelectorAll("#answer-grid .answer-row");return Array.from(t).map((e,n)=>{const i=e.querySelector(".chip-container"),s=getChipValues(i),o=e.querySelector(".answer-location")?.value.trim()||"",a=e.querySelector(".answer-location-meta")?.value.trim()||"",l=e.querySelector(".answer-explanation")?.value.trim()||"",r={q_no:n+1,answers:s};if(o&&(r.location=o),a)try{r.location_meta=JSON.parse(a)}catch{}return l&&(r.explanation=l),r})}function _createAnswerRow(t,e=null){const n=document.createElement("div");n.className="answer-row";const i=document.createElement("div");i.className="answer-row-main";const s=document.createElement("span");s.className="q-label",s.textContent=`Q${t}`;const o=document.createElement("div");if(o.className="chip-container",e?.answers)for(const m of e.answers){const h=document.createElement("span");h.className="chip",h.dataset.value=m,h.innerHTML=`${escapeHtml(m)} <button class="chip-remove" title="Xo\xE1" aria-label="Xo\xE1">\xD7</button>`,h.querySelector(".chip-remove").onclick=()=>h.remove(),o.appendChild(h)}const a=document.createElement("input");a.className="chip-input",a.placeholder="\u0110\xE1p \xE1n + Enter",o.appendChild(a);const l=document.createElement("button");l.className="btn-delete-row",l.title="Xo\xE1 c\xE2u n\xE0y",l.setAttribute("aria-label","Xo\xE1 c\xE2u n\xE0y"),l.textContent="\xD7",l.onclick=function(){removeAnswerRow(this.closest(".answer-row"))},i.appendChild(s),i.appendChild(o),i.appendChild(l);const r=document.createElement("div");r.className="location-row",r.innerHTML=`
    <span class="field-section-label">\u{1F4CD} V\u1ECB tr\xED:</span>
    <span class="location-text-display">${e?.location||"Ch\u01B0a ch\u1ECDn"}</span>
    <input type="hidden" class="answer-location" value="${escapeHtml(e?.location||"")}" />
    <input type="hidden" class="answer-location-meta" value="${e?.location_meta?escapeHtml(JSON.stringify(e.location_meta)):""}" />
    <button class="btn-clear-location${e?.location?"":" hidden"}" onclick="clearLocationValue(this.closest('.answer-row'))" aria-label="Xo\xE1 v\u1ECB tr\xED">\xD7</button>
    <button class="btn-pick-location" onclick="activateLocationPick(this.closest('.answer-row'))">Ch\u1ECDn</button>`;const c=document.createElement("div");c.className="explanation-row";const d=document.createElement("span");d.className="field-section-label",d.textContent="\u{1F4A1} Gi\u1EA3i th\xEDch:";const u=document.createElement("textarea");return u.className="answer-explanation",u.rows=2,u.placeholder="Nh\u1EADp gi\u1EA3i th\xEDch \u0111\xE1p \xE1n...",u.value=e?.explanation||"",c.appendChild(d),c.appendChild(u),n.appendChild(i),n.appendChild(r),n.appendChild(c),n}function renumberAnswerRows(){const t=document.querySelectorAll("#answer-grid .answer-row");t.forEach((n,i)=>{const s=n.querySelector(".q-label");s&&(s.textContent=`Q${i+1}`)});const e=$("#answer-count");e&&(e.value=t.length)}function removeAnswerRow(t){t.remove(),renumberAnswerRows()}function addAnswerRow(){const t=$("#answer-grid");if(!t)return;const e=t.querySelectorAll(".answer-row").length,n=_createAnswerRow(e+1);t.appendChild(n),attachChipListeners(),renumberAnswerRows(),n.scrollIntoView({behavior:"smooth",block:"nearest"})}function renderAnswerGrid(t){const e=$("#answer-grid");if(e){e.innerHTML="";for(let n=1;n<=t;n++)e.appendChild(_createAnswerRow(n));attachChipListeners()}}const routes={"/classes":showClasses,"/class/:id":showClassDetail,"/assignment/:id":showAssignmentSubmissions,"/grading/:id":showGradingPage,"/questions":showQuestions,"/questions/new":showQuestionForm,"/questions/:id":showQuestionDetail,"/shared-pool":showSharedPool,"/shared-pool/new":showSharedPoolForm,"/shared-pool/:id":showSharedPoolDetail,"/composite/:id":showCompositeSubmissions,"/inbox":showInbox,"/graded":showGraded,"/profile-fields":showProfileFields},routeLoadingMessages={"/classes":"\u0110ang t\u1EA3i danh s\xE1ch l\u1EDBp...","/class/:id":"\u0110ang t\u1EA3i th\xF4ng tin l\u1EDBp...","/assignment/:id":"\u0110ang t\u1EA3i danh s\xE1ch b\xE0i n\u1ED9p...","/grading/:id":"\u0110ang t\u1EA3i b\xE0i l\xE0m...","/questions":"\u0110ang t\u1EA3i kho \u0111\u1EC1...","/questions/new":"\u0110ang m\u1EDF form t\u1EA1o \u0111\u1EC1...","/questions/:id":"\u0110ang t\u1EA3i \u0111\u1EC1...","/shared-pool":"\u0110ang t\u1EA3i kho \u0111\u1EC1 luy\u1EC7n t\u1EADp...","/shared-pool/new":"\u0110ang m\u1EDF form t\u1EA1o \u0111\u1EC1...","/shared-pool/:id":"\u0110ang t\u1EA3i \u0111\u1EC1...","/inbox":"\u0110ang t\u1EA3i h\u1ED9p th\u01B0...","/graded":"\u0110ang t\u1EA3i b\xE0i \u0111\xE3 ch\u1EA5m...","/profile-fields":"\u0110ang t\u1EA3i h\u1ED3 s\u01A1 h\u1ECDc sinh..."};function navigate(t){flushQuestionDraftSave(),closeMobileSidebar(),window.location.hash=t}let _navSeq=0;function routeToken(){return _navSeq}function routeChanged(t){return t!==_navSeq}function router(){_navSeq++,stopQuestionDraftAutosave(),stopSpDraftAutosave(),document.getElementById("preview-sticky-float")?.classList.remove("is-visible"),document.getElementById("preview-sticky-toggle")?.classList.remove("is-visible");const t=window.location.hash.slice(1)||"/classes";try{hideTableFloatToolbar(),clearTableCellSelection(),_activeTableCell=null,document.querySelectorAll(".nav-link").forEach(e=>{const n=e.dataset.route;e.classList.toggle("active",n==="classes"&&t.startsWith("/class")||n==="questions"&&t.startsWith("/questions")||n==="shared-pool"&&t.startsWith("/shared-pool")||n==="inbox"&&t==="/inbox"||n==="graded"&&t.startsWith("/graded")||n==="profile-fields"&&t.startsWith("/profile-fields"))});for(const[e,n]of Object.entries(routes)){const i=matchRoute(e,t);if(i!==null){const s=routeLoadingMessages[e];s&&setLoading(s);const o=n(i);o&&typeof o.catch=="function"&&o.catch(a=>{console.error("Route error:",a),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c trang",a,t)});return}}setLoading(routeLoadingMessages["/classes"]),showClasses({})}catch(e){console.error("Router boot error:",e),renderRouteError("Kh\xF4ng m\u1EDF \u0111\u01B0\u1EE3c trang",e,t)}}function matchRoute(t,e){const n=t.split("/"),i=e.split("/");if(n.length!==i.length)return null;const s={};for(let o=0;o<n.length;o++)if(n[o].startsWith(":"))s[n[o].slice(1)]=i[o];else if(n[o]!==i[o])return null;return s}window.addEventListener("hashchange",router);let _inboxItems=[],_inboxSortCol="submitted_at",_inboxSortDir="desc",_inboxGradedItems=null,_inboxGradedSortCol="submitted_at",_inboxGradedSortDir="desc";const HIDDEN_GRADED_CLASSES=["TEST CLASS"];let _gradedShowHidden=!1;function isHiddenGradedClass(t){const e=String(t||"").trim().toLowerCase();return HIDDEN_GRADED_CLASSES.some(n=>n.toLowerCase()===e)}function visibleGradedItems(){const t=_inboxGradedItems||[];return _gradedShowHidden?t:t.filter(e=>!isHiddenGradedClass(e.class_name))}function toggleGradedHidden(){_gradedShowHidden=!_gradedShowHidden,renderGraded()}window.toggleGradedHidden=toggleGradedHidden;async function showInbox(){_inboxSortCol="submitted_at",_inboxSortDir="desc",setLoading("\u0110ang t\u1EA3i h\u1ED9p th\u01B0...");const t=routeToken();try{const e=await api.get("/inbox");if(routeChanged(t))return;_inboxItems=e,renderInbox(),updateInboxBadge(e.length)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i inbox: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c h\u1ED9p th\u01B0",e,"/inbox")}}async function showGraded(){_inboxGradedSortCol="submitted_at",_inboxGradedSortDir="desc",_gradedShowHidden=!1,setLoading("\u0110ang t\u1EA3i b\xE0i \u0111\xE3 ch\u1EA5m...");const t=routeToken();try{const e=await api.get("/inbox/graded");if(routeChanged(t))return;_inboxGradedItems=e,renderGraded()}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i b\xE0i \u0111\xE3 ch\u1EA5m: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\xE1ch \u0111\xE3 ch\u1EA5m",e,"/graded")}}function sortedInboxItems(){return _inboxSortCol?[..._inboxItems].sort((t,e)=>{let n,i;if(_inboxSortCol==="student_name")n=t.student_name.toLowerCase(),i=e.student_name.toLowerCase();else if(_inboxSortCol==="class_name")n=t.class_name.toLowerCase(),i=e.class_name.toLowerCase();else if(_inboxSortCol==="skill")n=t.skill||"",i=e.skill||"";else if(_inboxSortCol==="submitted_at")n=t.submitted_at||"",i=e.submitted_at||"";else return 0;return n<i?_inboxSortDir==="asc"?-1:1:n>i?_inboxSortDir==="asc"?1:-1:0}):_inboxItems}function sortInbox(t){_inboxSortCol===t?_inboxSortDir=_inboxSortDir==="asc"?"desc":"asc":(_inboxSortCol=t,_inboxSortDir=t==="student_name"||t==="class_name"?"asc":"desc");const e=document.getElementById("inbox-list-body");e&&(e.innerHTML=buildInboxRows(sortedInboxItems())),document.querySelectorAll("th[data-inbox-col]").forEach(n=>{const i=n.querySelector(".sort-icon");i&&i.remove(),n.insertAdjacentHTML("beforeend",makeSortIcon(n.dataset.inboxCol,_inboxSortCol,_inboxSortDir))})}window.sortInbox=sortInbox;function buildInboxRows(t){return t.length===0?`<tr><td colspan="5"><div class="empty-state-v2">
        <span class="empty-illu">\u2705</span>
        <div class="empty-title">Kh\xF4ng c\xF3 b\xE0i n\xE0o c\u1EA7n ch\u1EA5m!</div>
        <div class="empty-desc">T\u1EA5t c\u1EA3 b\xE0i Writing v\xE0 Speaking \u0111\xE3 \u0111\u01B0\u1EE3c ch\u1EA5m xong.</div>
      </div></td></tr>`:t.map(e=>`
      <tr>
        <td>${skillBadge(e.skill)}</td>
        <td><strong>${escapeHtml(e.student_name)}</strong></td>
        <td>
          ${escapeHtml(e.assignment_title)}
          ${(e.attempt_number||1)>1?`<span class="inbox-rewrite-badge">B\xC0I VI\u1EBET L\u1EA0I \xB7 L\u1EA7n ${e.attempt_number}</span>`:""}
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
    </div>`:buildInboxRows([])}`}function renderGraded(){const e=(_inboxGradedItems||[]).filter(s=>isHiddenGradedClass(s.class_name)).length,n=visibleGradedItems().length,i=e>0?`
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
    ${inboxGradedHtml()}`}function sortedGradedItems(){const t=visibleGradedItems();return _inboxGradedSortCol?[...t].sort((e,n)=>{let i,s;switch(_inboxGradedSortCol){case"student_name":i=e.student_name.toLowerCase(),s=n.student_name.toLowerCase();break;case"class_name":i=e.class_name.toLowerCase(),s=n.class_name.toLowerCase();break;case"skill":i=e.skill||"",s=n.skill||"";break;case"overall_score":i=Number(e.overall_score)||0,s=Number(n.overall_score)||0;break;case"submitted_at":i=e.submitted_at||"",s=n.submitted_at||"";break;default:return 0}return i<s?_inboxGradedSortDir==="asc"?-1:1:i>s?_inboxGradedSortDir==="asc"?1:-1:0}):t}function sortInboxGraded(t){_inboxGradedSortCol===t?_inboxGradedSortDir=_inboxGradedSortDir==="asc"?"desc":"asc":(_inboxGradedSortCol=t,_inboxGradedSortDir=t==="student_name"||t==="class_name"||t==="skill"?"asc":"desc");const e=document.getElementById("inbox-graded-body");e&&(e.innerHTML=buildGradedRows(sortedGradedItems())),document.querySelectorAll("th[data-graded-col]").forEach(n=>{const i=n.querySelector(".sort-icon");i&&i.remove(),n.insertAdjacentHTML("beforeend",makeSortIcon(n.dataset.gradedCol,_inboxGradedSortCol,_inboxGradedSortDir))})}window.sortInboxGraded=sortInboxGraded;function inboxGradedHtml(){if(sortedGradedItems().length===0)return`<div class="empty-state-v2">
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
    </div>`}function buildGradedRows(t){return t.map(e=>{const n=(e.attempt_number||1)>1?`<span class="inbox-rewrite-badge">B\xC0I VI\u1EBET L\u1EA0I \xB7 L\u1EA7n ${e.attempt_number}</span>`:"",i=e.rewrite_status==="requested"?'<span class="inbox-rewrite-pending-badge">\u270F\uFE0F \u0110\xE3 y\xEAu c\u1EA7u vi\u1EBFt l\u1EA1i</span>':"";return`
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
    </tr>`}).join("")}function updateInboxBadge(t){const e=document.getElementById("inbox-badge");e&&(t>0?(e.textContent=t>99?"99+":t,e.classList.remove("hidden")):e.classList.add("hidden"))}window.updateInboxBadge=updateInboxBadge;async function refreshInboxBadge(){try{const t=await api.get("/inbox");updateInboxBadge(t.length)}catch{}}async function showClasses(){setLoading("\u0110ang t\u1EA3i danh s\xE1ch l\u1EDBp...");const t=routeToken();try{const e=await api.get("/classes");if(routeChanged(t))return;renderClasses(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i danh s\xE1ch l\u1EDBp: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\xE1ch l\u1EDBp",e,"/classes")}}function renderClasses(t){_allClasses=t,_applyClassFilter()}function _applyClassFilter(){let e=_allClasses.filter(r=>r.class_name.toLowerCase().includes(_classSearch.toLowerCase())||(r.description||"").toLowerCase().includes(_classSearch.toLowerCase()));_classSort==="name"?e=e.slice().sort((r,c)=>r.class_name.localeCompare(c.class_name)):_classSort==="students"&&(e=e.slice().sort((r,c)=>c.student_count-r.student_count));const n=`
    <div class="empty-state">
      <div class="empty-state-icon">\u{1F3EB}</div>
      <h3>${_classSearch?"Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp n\xE0o":"Ch\u01B0a c\xF3 l\u1EDBp h\u1ECDc n\xE0o"}</h3>
      <p>${_classSearch?"Th\u1EED t\xECm ki\u1EBFm v\u1EDBi t\u1EEB kh\xF3a kh\xE1c.":"T\u1EA1o l\u1EDBp \u0111\u1EA7u ti\xEAn \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u giao b\xE0i cho h\u1ECDc sinh."}</p>
      ${_classSearch?"":'<button class="btn btn-primary" onclick="openCreateClassModal()">+ T\u1EA1o l\u1EDBp h\u1ECDc m\u1EDBi</button>'}
    </div>`,i=e.map(r=>{const c=r.student_count>0?Math.round(r.submitted_student_count/r.student_count*100):0,d=r.upcoming_deadline_count>0?`<span class="card-deadline-chip">\u26A0\uFE0F ${r.upcoming_deadline_count} b\xE0i s\u1EAFp h\u1EA1n</span>`:"",u=r.pending_grading_count>0?`<span class="card-pending-chip" title="B\xE0i Writing/Speaking ch\u01B0a ch\u1EA5m">\u{1F4DD} ${r.pending_grading_count} c\u1EA7n ch\u1EA5m</span>`:"";return`
    <div class="card" onclick="navigate('/class/${r.id}')">
      <div class="card-icon">\u{1F3EB}</div>
      <div class="card-name">${escapeHtml(r.class_name)}</div>
      <div class="card-desc">${escapeHtml(r.description||"Ch\u01B0a c\xF3 m\xF4 t\u1EA3")}</div>
      <div class="card-meta">
        <span class="card-meta-item">\u{1F464} ${r.student_count} h\u1ECDc sinh</span>
        <span class="card-meta-item">\u{1F4CB} ${r.assignment_count} b\xE0i t\u1EADp</span>
        ${d}
        ${u}
      </div>
      ${r.student_count>0?`
      <div class="card-progress">
        <div class="card-progress-label">\u0110\xE3 n\u1ED9p \xEDt nh\u1EA5t 1 b\xE0i: ${r.submitted_student_count}/${r.student_count} HS</div>
        <div class="card-progress-bar"><div class="card-progress-fill" style="width:${c}%"></div></div>
      </div>`:""}
    </div>`}).join(""),s=e.length===0?n:`<div class="cards-grid">${i}</div>`,o=document.getElementById("classes-content");if(o){o.innerHTML=s;return}$("#app").innerHTML=`
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
    <div id="classes-content">${s}</div>`;const a=document.getElementById("class-search-input");a&&a.addEventListener("input",()=>{_classSearch=a.value,_applyClassFilter()});const l=document.getElementById("class-sort-select");l&&l.addEventListener("change",()=>{_classSort=l.value,_applyClassFilter()})}window._applyClassFilter=_applyClassFilter;function openCreateClassModal(){openModal("T\u1EA1o l\u1EDBp h\u1ECDc m\u1EDBi",`
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
    </div>`),setTimeout(()=>$("#cls-name")?.focus(),50)}async function submitCreateClass(t){const e=$("#cls-name").value.trim(),n=$("#cls-desc").value.trim();if(!e){toast("Vui l\xF2ng nh\u1EADp t\xEAn l\u1EDBp","error");return}btnLoading(t);try{await api.post("/classes",{class_name:e,description:n}),closeModal(),toast("T\u1EA1o l\u1EDBp th\xE0nh c\xF4ng!"),showClasses()}catch(i){btnReset(t),toast("L\u1ED7i: "+(i.error||"Kh\xF4ng th\u1EC3 t\u1EA1o l\u1EDBp"),"error")}}async function showClassDetail({id:t}){setLoading("\u0110ang t\u1EA3i th\xF4ng tin l\u1EDBp...");const e=routeToken();try{const[n,i]=await Promise.all([api.get(`/classes/${t}`),api.get(`/classes/${t}/students`)]);if(routeChanged(e))return;_cachedCls=n,_cachedStudents=i,_classDetailTab="assignments",_assignFilterSkill="",_assignFilterSearch="",_statsData=null,_statsSkillFilter="",_statsStatusFilter="",_statsModeFilter="",_statsScaleFilter="ielts",_assignTableSortCol="",_assignTableSortDir="desc",_assignListSortCol="",_assignListSortDir="desc",_classStudentsSortCol="",_classStudentsSortDir="asc",destroyStatsCharts(),renderClassDetail(n,i)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i l\u1EDBp: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c th\xF4ng tin l\u1EDBp",n,`/class/${t}`)}}function switchClassTab(t){_classDetailTab=t,document.querySelectorAll(".tab-content").forEach(n=>n.style.display="none");const e=document.getElementById(`tab-${t}`);e&&(e.style.display=""),document.querySelectorAll(".tab-btn").forEach(n=>n.classList.toggle("active",n.dataset.tab===t)),t==="stats"&&_cachedCls&&loadStatsTab(_cachedCls.id)}window.switchClassTab=switchClassTab;let _statsCharts=[],_statsData=null,_statsSkillFilter="",_statsStatusFilter="",_statsModeFilter="",_statsScaleFilter="ielts",_statsSortCol="",_statsSortDir="desc",_statsAllScoredSubs=[],_statsTrendSkill="",_closedAssignsExpanded=!1,_closedAssignsSearch="",_statsSubSortCol="",_statsSubSortDir="asc";function destroyStatsCharts(){_statsCharts.forEach(t=>{try{t.destroy()}catch{}}),_statsCharts=[]}function refreshStatsTab(){const t=document.getElementById("tab-stats");t&&delete t.dataset.loadedFor,_cachedCls&&loadStatsTab(_cachedCls.id)}window.refreshStatsTab=refreshStatsTab;async function loadStatsTab(t){const e=document.getElementById("tab-stats");if(e&&e.dataset.loadedFor!==t){destroyStatsCharts(),_statsData=null,e.innerHTML='<div class="stats-loading-placeholder"><div class="spinner"></div><p>\u0110ang t\u1EA3i th\u1ED1ng k\xEA...</p></div>';try{_statsData=await api.get(`/classes/${t}/analytics`),_statsSkillFilter="",_statsStatusFilter="",_statsModeFilter="",_statsScaleFilter="ielts",_statsSortCol="",_statsSortDir="desc",_closedAssignsExpanded=!1,_closedAssignsSearch="",_statsSubSortCol="",_statsSubSortDir="asc",_statsTrendSkill=["reading","listening","writing","speaking"].find(i=>_statsData.per_assignment.some(s=>s.skill===i))||"reading",renderStatsTab(e,_statsData),e.dataset.loadedFor=t}catch(n){e.innerHTML=`<div class="empty-state" style="padding:40px"><p>L\u1ED7i t\u1EA3i th\u1ED1ng k\xEA: ${escapeHtml(n.error||n.message)}</p></div>`}}}function applyStatsFilter(){const t=document.getElementById("tab-stats");!t||!_statsData||(renderStatsTab(t,_statsData),t.dataset.loadedFor=_cachedCls?.id||"")}window.applyStatsFilter=applyStatsFilter;function toggleClosedAssignsExpanded(){_closedAssignsExpanded=!_closedAssignsExpanded,applyStatsFilter()}window.toggleClosedAssignsExpanded=toggleClosedAssignsExpanded;function setClosedAssignsSearch(t){_closedAssignsSearch=t.toLowerCase().trim(),_closedAssignsExpanded=!0,applyStatsFilter()}window.setClosedAssignsSearch=setClosedAssignsSearch;function sortStudentTable(t){_statsSortCol===t?_statsSortDir=_statsSortDir==="asc"?"desc":"asc":(_statsSortCol=t,_statsSortDir=t==="name"?"asc":"desc"),applyStatsFilter()}window.sortStudentTable=sortStudentTable;function sortAssignTable(t){_assignTableSortCol===t?_assignTableSortDir=_assignTableSortDir==="asc"?"desc":"asc":(_assignTableSortCol=t,_assignTableSortDir=t==="title"||t==="skill"?"asc":"desc"),applyStatsFilter()}window.sortAssignTable=sortAssignTable;function toggleTrendStudent(t){const e=document.querySelector(`.stats-student-toggle[data-sid="${t}"]`);if(!e)return;e.classList.toggle("active");const n=_statsCharts.find(s=>s.canvas?.id==="chart-trend");if(!n)return;const i=n.data.datasets.findIndex(s=>s._studentId===t);i!==-1&&(n.setDatasetVisibility(i,e.classList.contains("active")),n.update())}window.toggleTrendStudent=toggleTrendStudent;function filterTrendSkill(t){_statsTrendSkill=t,document.querySelectorAll(".trend-skill-pill").forEach(e=>{e.classList.toggle("active",e.dataset.skill===t)}),rebuildTrendChart()}window.filterTrendSkill=filterTrendSkill;function rebuildTrendChart(){const t=_statsCharts.find(l=>l.canvas?.id==="chart-trend");if(!t||!_statsData)return;const{per_student:e,per_assignment:n}=_statsData,i=_statsTrendSkill,s=[...n].reverse().filter(l=>!(i&&l.skill!==i||_statsModeFilter&&l.mode!==_statsModeFilter||_statsScaleFilter&&(l.scoring_scale||"10")!==_statsScaleFilter)),o=document.getElementById("trend-empty-msg"),a=document.getElementById("chart-trend");if(s.length<1){a&&(a.style.display="none"),o&&(o.style.display="");return}a&&(a.style.display=""),o&&(o.style.display="none"),t.data.labels=s.map(l=>l.title.length>18?l.title.slice(0,16)+"\u2026":l.title),t.data.datasets.forEach(l=>{const r=e.find(c=>c.id===l._studentId);if(!r){l.data=[];return}l.data=s.map(c=>{const d=r.submissions.filter(u=>u.assignment_id===c.id).sort((u,m)=>(m.attempt_number||1)-(u.attempt_number||1))[0];return d&&d.overall_score!==null?Number(d.overall_score):null})}),t.update()}window.rebuildTrendChart=rebuildTrendChart;function showHistogramStudents(t){const e=[[0,2],[2,4],[4,6],[6,8],[8,10]],n=["0 \u2013 2","2 \u2013 4","4 \u2013 6","6 \u2013 8","8 \u2013 9"],[i,s]=e[t]||[0,10],o=document.getElementById("stats-hist-detail");if(!o)return;const a=_statsAllScoredSubs.filter(l=>{const r=Number(l.overall_score);return r>=i&&r<s});if(a.length===0){o.style.display="none";return}o.style.display="",o.innerHTML=`
    <div class="stats-hist-detail-header">
      \u0110i\u1EC3m <strong>${n[t]}</strong> \u2014 ${a.length} b\xE0i
      <button onclick="document.getElementById('stats-hist-detail').style.display='none'"
        style="float:right;background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:16px" aria-label="\u0110\xF3ng">\u2715</button>
    </div>
    <div class="stats-hist-detail-list">
      ${a.map(l=>`
        <div class="stats-hist-detail-item">
          <span class="student-avatar" style="width:22px;height:22px;font-size:10px;flex-shrink:0">
            ${escapeHtml(l.student_name.charAt(0).toUpperCase())}
          </span>
          <span style="font-weight:500">${escapeHtml(l.student_name)}</span>
          <span style="color:var(--gray-400);font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escapeHtml(l.assignment_title)}
          </span>
          <span class="stats-score-badge" style="margin-left:8px;flex-shrink:0">
            ${Number(l.overall_score).toFixed(1)}
          </span>
        </div>`).join("")}
    </div>`}window.showHistogramStudents=showHistogramStudents;function renderStatsTab(t,e){destroyStatsCharts();const{timeline:n,per_student:i,per_assignment:s}=e,o=_statsSkillFilter,a=_statsStatusFilter,l=_statsModeFilter,r=_statsScaleFilter,c=s.filter(p=>!(o&&p.skill!==o||a==="active"&&!p.is_active||a==="closed"&&p.is_active||l&&p.mode!==l||r&&(p.scoring_scale||"10")!==r)),d=new Set(c.map(p=>p.id)),u=p=>p.length?p.reduce((f,v)=>f+v,0)/p.length:null,m=i.length,h=c.length,g=c.filter(p=>p.is_active).length,b=h-g,S=new Map;i.forEach(p=>{p.submissions.forEach(f=>{if(!d.has(f.assignment_id))return;const v=`${p.id||p.student_id}:${f.assignment_id}`,w=S.get(v);(!w||(f.attempt_number||1)>(w.attempt_number||1))&&S.set(v,{...f,student_name:p.name})})});const y=Array.from(S.values()),L=y.filter(p=>p.overall_score!==null);_statsAllScoredSubs=L;const E=u(L.map(p=>Number(p.overall_score))),I=h*m,N=I>0?Math.round(y.length/I*100):0,H=[0,0,0,0,0];for(const p of L){const f=Number(p.overall_score),v=f>=9?4:Math.min(4,Math.floor(f/2));H[v]++}const F=["reading","listening","writing","speaking"],j={},O={};for(const p of F){const f=L.filter(x=>x.skill===p);j[p]=u(f.map(x=>Number(x.overall_score)));const v=c.filter(x=>x.skill===p),w=y.filter(x=>x.skill===p),M=v.length*m;O[p]={count:v.length,submitted:w.length,pct:M>0?Math.round(w.length/M*100):0}}let P=i.map(p=>{const f=p.submissions.filter(C=>d.has(C.assignment_id)),v=new Map;f.forEach(C=>{const k=v.get(C.assignment_id);(!k||(C.attempt_number||1)>(k.attempt_number||1))&&v.set(C.assignment_id,C)});const w=Array.from(v.values()),M=w.filter(C=>C.overall_score!==null),x=C=>u(M.filter(k=>k.skill===C).map(k=>Number(k.overall_score))),_=w.filter(C=>!C.is_active&&C.deadline),T=_.filter(C=>C.on_time).length;return{...p,submitted:w.length,total:h,avg_score:o?x(o):u(M.map(C=>Number(C.overall_score))),avg_reading:x("reading"),avg_listening:x("listening"),avg_writing:x("writing"),avg_speaking:x("speaking"),on_time:T,closed_total:_.length,on_time_rate:_.length>0?T/_.length:null}});_statsSortCol&&(P=[...P].sort((p,f)=>{let v=p[_statsSortCol],w=f[_statsSortCol];return v==null?1:w==null?-1:typeof v=="string"?_statsSortDir==="asc"?v.localeCompare(w):w.localeCompare(v):_statsSortDir==="asc"?v-w:w-v}));const q=p=>p!=null?Number(p).toFixed(1):"\u2014",W=(p,f)=>f>0?Math.round(p/f*100):0,B=p=>_statsSortCol!==p?'<span class="sort-icon">\u2195</span>':`<span class="sort-icon active">${_statsSortDir==="asc"?"\u2191":"\u2193"}</span>`,Q={reading:"#3b82f6",listening:"#f59e0b",writing:"#8b5cf6",speaking:"#22c55e"},z=["#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#14b8a6","#f97316","#a3e635"],X={reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking",composite:"T\u1ED5ng h\u1EE3p"},Y=`
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
          <div class="stats-card-label">${g} \u0111ang m\u1EDF \xB7 ${b} \u0111\xE3 \u0111\xF3ng</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:#fef9c3;color:#ca8a04">\u{1F4CA}</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${N}%</div>
          <div class="stats-card-label">${y.length} / ${I} l\u01B0\u1EE3t n\u1ED9p</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card-icon" style="background:var(--primary-lt);color:var(--primary)">\u{1F3AF}</div>
        <div class="stats-card-body">
          <div class="stats-card-value">${E!==null?Number(E).toFixed(2):"\u2014"}</div>
          <div class="stats-card-label">\u0110i\u1EC3m TB l\u1EDBp (${L.length} b\xE0i \u0111\xE3 ch\u1EA5m)</div>
        </div>
      </div>
    </div>`,Z=`
    <div class="stats-section-card">
      <div class="stats-section-title">T\u1EF7 l\u1EC7 n\u1ED9p b\xE0i theo k\u1EF9 n\u0103ng</div>
      <div class="stats-skill-chart">
        ${["reading","listening","writing","speaking"].map(p=>{const f=O[p];return!f||f.count===0?"":`<div class="stats-skill-row">
            <div class="stats-skill-label">${skillBadge(p)}</div>
            <div class="stats-bar-wrap">
              <div class="stats-bar-fill" style="width:${f.pct}%;background:${Q[p]}"></div>
            </div>
            <div class="stats-pct">${f.pct}% &nbsp;<span style="color:var(--gray-400)">(${f.submitted}/${f.count*m} n\u1ED9p)</span></div>
          </div>`}).join("")}
      </div>
    </div>`,tt=`
    <div class="stats-section-card stats-chart-card">
      <div class="stats-section-title">\u0110i\u1EC3m TB theo k\u1EF9 n\u0103ng</div>
      <canvas id="chart-skill-score" height="200"></canvas>
    </div>`,et=`
    <div class="stats-section-card stats-chart-card">
      <div class="stats-section-title">
        Ph\xE2n b\u1ED5 \u0111i\u1EC3m (${L.length} b\xE0i ch\u1EA5m)
        <span style="font-size:11px;font-weight:400;color:var(--gray-400);margin-left:6px">Click v\xE0o c\u1ED9t \u0111\u1EC3 xem chi ti\u1EBFt</span>
      </div>
      <canvas id="chart-score-dist" height="200" style="cursor:pointer"></canvas>
      <div id="stats-hist-detail" style="display:none;margin-top:12px"></div>
    </div>`,nt=n.length<2?"":`
    <div class="stats-section-card">
      <div class="stats-section-title">Xu h\u01B0\u1EDBng n\u1ED9p b\xE0i theo tu\u1EA7n</div>
      <canvas id="chart-timeline" height="100"></canvas>
    </div>`,V=c.filter(p=>!p.is_active&&p.deadline),R=_closedAssignsSearch?V.filter(p=>p.title.toLowerCase().includes(_closedAssignsSearch)):V,U=3,D=_closedAssignsExpanded?R:R.slice(0,U),it=R.length-D.length,st=V.length===0?"":`
    <div class="stats-section-card">
      <div class="stats-section-title">\u0110\xFAng h\u1EA1n / mu\u1ED9n / ch\u01B0a n\u1ED9p (b\xE0i \u0111\xE3 \u0111\xF3ng)</div>
      <div class="stats-closed-controls">
        <input class="stats-closed-search" type="text" aria-label="T\xECm b\xE0i t\u1EADp" placeholder="\u{1F50D} T\xECm b\xE0i t\u1EADp..."
          value="${escapeHtml(_closedAssignsSearch)}"
          oninput="setClosedAssignsSearch(this.value)" />
      </div>
      ${R.length===0?'<p style="color:var(--gray-400);font-size:13px;padding:8px 0 4px">Kh\xF4ng t\xECm th\u1EA5y b\xE0i t\u1EADp ph\xF9 h\u1EE3p</p>':`<canvas id="chart-ontime" height="${Math.max(80,D.length*38)}"></canvas>`}
      ${R.length>U?`
        <button class="stats-closed-toggle-btn" onclick="toggleClosedAssignsExpanded()">
          ${_closedAssignsExpanded?"\u25B2 Thu g\u1ECDn":`\u25BC Xem th\xEAm ${it} b\xE0i t\u1EADp`}
        </button>`:""}
    </div>`,ot=L.length>=1?`
    <div class="stats-section-card">
      <div class="stats-trend-header">
        <div class="stats-section-title" style="margin-bottom:0">Xu h\u01B0\u1EDBng \u0111i\u1EC3m t\u1EEBng h\u1ECDc sinh</div>
      </div>
      <div class="stats-trend-filters">
        <div class="stats-filter-group">
          <span class="stats-filter-label">K\u1EF9 n\u0103ng:</span>
          <div class="stats-filter-pills">
            ${[["reading","Reading"],["listening","Listening"],["writing","Writing"],["speaking","Speaking"]].map(([p,f])=>`
              <button class="stats-filter-pill trend-skill-pill${_statsTrendSkill===p?" active":""}"
                data-skill="${p}" onclick="filterTrendSkill('${p}')">
                ${f}
              </button>`).join("")}
          </div>
        </div>
      </div>
      <div class="stats-filter-group" style="margin-bottom:12px">
        <span class="stats-filter-label">H\u1ECDc sinh:</span>
        <div class="stats-student-toggles" id="stats-trend-toggles" style="margin-bottom:0">
          ${i.map((p,f)=>`
            <button class="stats-student-toggle active"
              data-sid="${p.id}"
              style="--sc:${z[f%z.length]}"
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
          ${[["ielts","\u{1F3AF} IELTS Test"],["10","\u{1F4CA} Practice Test"],["composite","\u{1F9E9} Mixed Skills"]].map(([p,f])=>`
            <button class="stats-filter-pill${_statsScaleFilter===p?" active":""}"
              onclick="_statsScaleFilter='${p}';applyStatsFilter()">
              ${f}
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
          ${[["","T\u1EA5t c\u1EA3"],["active","\u0110ang m\u1EDF"],["closed","\u0110\xE3 \u0111\xF3ng"]].map(([p,f])=>`
            <button class="stats-filter-pill${_statsStatusFilter===p?" active":""}"
              onclick="_statsStatusFilter='${p}';applyStatsFilter()">
              ${f}
            </button>`).join("")}
        </div>
      </div>
      <div class="stats-filter-group">
        <span class="stats-filter-label">Ch\u1EBF \u0111\u1ED9:</span>
        <div class="stats-filter-pills">
          ${[["","T\u1EA5t c\u1EA3"],["exam","\u{1F4DD} Ki\u1EC3m tra"],["practice","\u{1F3A7} Luy\u1EC7n t\u1EADp"]].map(([p,f])=>`
            <button class="stats-filter-pill${_statsModeFilter===p?" active":""}"
              onclick="_statsModeFilter='${p}';applyStatsFilter()">
              ${f}
            </button>`).join("")}
        </div>
      </div>
      <button class="btn btn-sm btn-outline stats-refresh-btn" onclick="refreshStatsTab()" title="T\u1EA3i l\u1EA1i d\u1EEF li\u1EC7u th\u1ED1ng k\xEA">
        \u21BB L\xE0m m\u1EDBi
      </button>
    </div>`,lt=o?5:8,rt=`
    <div class="stats-section-card">
      <div class="stats-section-title">Ti\u1EBFn \u0111\u1ED9 t\u1EEBng h\u1ECDc sinh</div>
      ${P.length===0?'<div class="empty-state" style="padding:20px">Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u</div>':`<div class="table-wrap">
          <table class="stats-table">
            <thead><tr>
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('name')">H\u1ECDc sinh ${B("name")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('submitted')">\u0110\xE3 n\u1ED9p ${B("submitted")}</th>
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('avg_score')">\u0110i\u1EC3m TB ${B("avg_score")}</th>
              ${o?"":`
                <th ${SORTABLE_TH_ATTRS} style="color:#3b82f6" onclick="sortStudentTable('avg_reading')">Reading ${B("avg_reading")}</th>
                <th ${SORTABLE_TH_ATTRS} style="color:#f59e0b" onclick="sortStudentTable('avg_listening')">Listening ${B("avg_listening")}</th>
                <th ${SORTABLE_TH_ATTRS} style="color:#8b5cf6" onclick="sortStudentTable('avg_writing')">Writing ${B("avg_writing")}</th>
                <th ${SORTABLE_TH_ATTRS} style="color:#22c55e" onclick="sortStudentTable('avg_speaking')">Speaking ${B("avg_speaking")}</th>`}
              <th ${SORTABLE_TH_ATTRS} onclick="sortStudentTable('on_time_rate')">\u0110\xFAng h\u1EA1n ${B("on_time_rate")}</th>
              <th></th>
            </tr></thead>
            <tbody>
              ${P.map(p=>{const f=W(p.submitted,p.total),v=p.on_time_rate!==null?Math.round(p.on_time_rate*100):null;return`<tr>
                  <td><span class="student-avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</span> ${escapeHtml(p.name)}</td>
                  <td>
                    <div class="stats-mini-bar-wrap">
                      <div class="stats-mini-bar" style="width:${f}%"></div>
                    </div>
                    <span class="stats-mini-label">${p.submitted}/${p.total}</span>
                  </td>
                  <td><span class="stats-score-badge">${q(p.avg_score)}</span></td>
                  ${o?"":`
                    <td style="color:#3b82f6">${q(p.avg_reading)}</td>
                    <td style="color:#f59e0b">${q(p.avg_listening)}</td>
                    <td style="color:#8b5cf6">${q(p.avg_writing)}</td>
                    <td style="color:#22c55e">${q(p.avg_speaking)}</td>`}
                  <td>${v!==null?`<span class="stats-ontime-pill ${v>=80?"good":v>=50?"mid":"bad"}">${v}%</span>`:'<span style="color:var(--gray-400)">\u2014</span>'}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="toggleStudentStatsRow('${p.id}')">Chi ti\u1EBFt</button>
                  </td>
                </tr>
                <tr id="stats-row-${p.id}" style="display:none">
                  <td colspan="${lt}" style="padding:0">
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
                            <tbody id="stats-sub-tbody-${p.id}">${buildStatsSubRows(p.submissions.filter(w=>d.has(w.assignment_id)))}</tbody>
                          </table>
                    </div>
                  </td>
                </tr>`}).join("")}
            </tbody>
          </table>
        </div>`}
    </div>`,A=p=>makeSortIcon(p,_assignTableSortCol,_assignTableSortDir),G=[...c];_assignTableSortCol&&G.sort((p,f)=>{let v,w;switch(_assignTableSortCol){case"title":v=p.title.toLowerCase(),w=f.title.toLowerCase();break;case"skill":v=p.skill||"",w=f.skill||"";break;case"mode":v=p.mode||"",w=f.mode||"";break;case"submitted_rate":v=p.total?p.submitted/p.total:0,w=f.total?f.submitted/f.total:0;break;case"avg_score":v=p.avg_score??-1,w=f.avg_score??-1;break;case"on_time":v=p.on_time??-1,w=f.on_time??-1;break;case"late":v=p.late??-1,w=f.late??-1;break;case"missing":v=p.missing??-1,w=f.missing??-1;break;case"is_active":v=p.is_active?1:0,w=f.is_active?1:0;break;default:return 0}return v<w?_assignTableSortDir==="asc"?-1:1:v>w?_assignTableSortDir==="asc"?1:-1:0});const ct=`
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
              ${G.map(p=>{const f=W(p.submitted,p.total);return`<tr>
                  <td>${skillBadge(p.skill)}</td>
                  <td style="font-weight:600">${escapeHtml(p.title)}</td>
                  <td>${p.mode==="practice"?'<span class="stats-mode-chip practice">\u{1F3A7} Luy\u1EC7n t\u1EADp</span>':'<span class="stats-mode-chip exam">\u{1F4DD} Ki\u1EC3m tra</span>'}</td>
                  <td>${p.time_limit_minutes?`${p.time_limit_minutes} ph\xFAt`:'<span style="color:var(--text-muted)">\u2014</span>'}</td>
                  <td>
                    <div class="stats-mini-bar-wrap">
                      <div class="stats-mini-bar" style="width:${f}%"></div>
                    </div>
                    <span class="stats-mini-label">${p.submitted}/${p.total}</span>
                  </td>
                  <td><span class="stats-score-badge">${q(p.avg_score)}</span></td>
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
    ${ot}
    ${nt}
    ${st}
    ${Z}
    ${rt}
    ${ct}`,ensureChartJsLoaded().then(()=>requestAnimationFrame(()=>{const p=document.getElementById("chart-skill-score");if(p){const x=["reading","listening","writing","speaking"].filter(_=>j[_]!==null);if(x.length>0){const _=new Chart(p.getContext("2d"),{type:"bar",data:{labels:x.map(T=>X[T]),datasets:[{data:x.map(T=>Number(j[T]).toFixed(2)),backgroundColor:x.map(T=>Q[T]+"cc"),borderColor:x.map(T=>Q[T]),borderWidth:1,borderRadius:6}]},options:{indexAxis:"y",responsive:!0,plugins:{legend:{display:!1}},scales:{x:{min:0,max:9,grid:{color:"#f3f4f6"},ticks:{font:{size:11}}},y:{ticks:{font:{size:12}}}}}});_statsCharts.push(_)}else p.insertAdjacentHTML("afterend",'<p style="color:var(--gray-400);font-size:13px;padding:20px 0">Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u \u0111i\u1EC3m</p>'),p.remove()}const f=document.getElementById("chart-score-dist");if(f)if(H.reduce((_,T)=>_+T,0)>0){const _=new Chart(f.getContext("2d"),{type:"bar",data:{labels:["0 \u2013 2","2 \u2013 4","4 \u2013 6","6 \u2013 8","8 \u2013 9"],datasets:[{label:"S\u1ED1 b\xE0i",data:H,backgroundColor:["#fca5a5","#fcd34d","#86efac","#67e8f9","#6ee7b7"],hoverBackgroundColor:["#f87171","#fbbf24","#4ade80","#22d3ee","#34d399"],borderRadius:6}]},options:{responsive:!0,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,ticks:{stepSize:1,font:{size:11}},grid:{color:"#f3f4f6"}},x:{ticks:{font:{size:11}}}},onClick:(T,C)=>{C.length&&showHistogramStudents(C[0].index)},onHover:(T,C)=>{T.native.target.style.cursor=C.length?"pointer":"default"}}});_statsCharts.push(_)}else f.insertAdjacentHTML("afterend",'<p style="color:var(--gray-400);font-size:13px;padding:20px 0">Ch\u01B0a c\xF3 b\xE0i n\xE0o \u0111\u01B0\u1EE3c ch\u1EA5m \u0111i\u1EC3m</p>'),f.remove();const v=document.getElementById("chart-trend");if(v){const x=[...s].reverse().filter(k=>!(_statsTrendSkill&&k.skill!==_statsTrendSkill||_statsModeFilter&&k.mode!==_statsModeFilter||_statsScaleFilter&&(k.scoring_scale||"10")!==_statsScaleFilter)),_=x.map(k=>k.title.length>18?k.title.slice(0,16)+"\u2026":k.title),T=i.map((k,dt)=>{const J=z[dt%z.length];return{label:k.name,_studentId:k.id,data:x.map(ut=>{const K=k.submissions.find(pt=>pt.assignment_id===ut.id);return K&&K.overall_score!==null?Number(K.overall_score):null}),borderColor:J,backgroundColor:J+"22",borderWidth:2,pointRadius:5,pointHoverRadius:7,fill:!1,tension:.3,spanGaps:!0}});if(x.length<1){v.style.display="none";const k=document.getElementById("trend-empty-msg");k&&(k.style.display="")}const C=new Chart(v.getContext("2d"),{type:"line",data:{labels:_,datasets:T},options:{responsive:!0,interaction:{mode:"index",intersect:!1},plugins:{legend:{display:!1},tooltip:{filter:k=>k.raw!==null,callbacks:{title:k=>k[0]?.label||"",label:k=>` ${k.dataset.label}: ${k.raw!==null?Number(k.raw).toFixed(1):"\u2014"}`}}},scales:{y:{min:0,max:9,ticks:{font:{size:11}},grid:{color:"#f3f4f6"}},x:{ticks:{font:{size:10},maxRotation:30}}}}});_statsCharts.push(C)}const w=document.getElementById("chart-timeline");if(w&&n.length>=2){const x=new Chart(w.getContext("2d"),{type:"line",data:{labels:n.map(_=>{const T=new Date(_.week);return`${T.getDate()}/${T.getMonth()+1}`}),datasets:[{label:"L\u01B0\u1EE3t n\u1ED9p",data:n.map(_=>_.count),borderColor:"#0f766e",backgroundColor:"#0f766e22",borderWidth:2,pointRadius:4,fill:!0,tension:.3}]},options:{responsive:!0,plugins:{legend:{display:!1}},scales:{y:{beginAtZero:!0,ticks:{stepSize:1,font:{size:11}},grid:{color:"#f3f4f6"}},x:{ticks:{font:{size:11}}}}}});_statsCharts.push(x)}const M=document.getElementById("chart-ontime");if(M&&D.length>0){const x=new Chart(M.getContext("2d"),{type:"bar",data:{labels:D.map(_=>_.title.length>22?_.title.slice(0,20)+"\u2026":_.title),datasets:[{label:"\u0110\xFAng h\u1EA1n",data:D.map(_=>_.on_time),backgroundColor:"#86efac",borderRadius:4},{label:"N\u1ED9p mu\u1ED9n",data:D.map(_=>_.late),backgroundColor:"#fcd34d",borderRadius:4},{label:"Ch\u01B0a n\u1ED9p",data:D.map(_=>_.missing||0),backgroundColor:"#fca5a5",borderRadius:4}]},options:{indexAxis:"y",responsive:!0,plugins:{legend:{position:"bottom",labels:{font:{size:11}}}},scales:{x:{stacked:!0,ticks:{stepSize:1,font:{size:11}},grid:{color:"#f3f4f6"}},y:{stacked:!0,ticks:{font:{size:11}}}}}});_statsCharts.push(x)}})).catch(()=>{const p=t.querySelector(".stats-charts-row");p&&p.insertAdjacentHTML("beforebegin",'<div class="empty-state" style="margin-bottom:16px"><p>Kh\xF4ng th\u1EC3 t\u1EA3i bi\u1EC3u \u0111\u1ED3 l\xFAc n\xE0y. B\u1EA1n v\u1EABn c\xF3 th\u1EC3 xem d\u1EEF li\u1EC7u d\u1EA1ng b\u1EA3ng b\xEAn d\u01B0\u1EDBi.</p></div>')})}function toggleStudentStatsRow(t){const e=document.getElementById(`stats-row-${t}`);e&&(e.style.display=e.style.display==="none"?"":"none")}window.toggleStudentStatsRow=toggleStudentStatsRow;function buildStatsSubRows(t){return t.length===0?'<tr><td colspan="5" style="color:var(--gray-400);padding:12px">Ch\u01B0a n\u1ED9p b\xE0i n\xE0o</td></tr>':(_statsSubSortCol?[...t].sort((n,i)=>{let s,o;if(_statsSubSortCol==="title")s=(n.assignment_title||"").toLowerCase(),o=(i.assignment_title||"").toLowerCase();else if(_statsSubSortCol==="skill")s=n.skill||"",o=i.skill||"";else if(_statsSubSortCol==="score")s=n.overall_score??-1,o=i.overall_score??-1;else if(_statsSubSortCol==="submitted_at")s=n.submitted_at||"",o=i.submitted_at||"";else if(_statsSubSortCol==="on_time")s=n.on_time===null?-1:n.on_time?1:0,o=i.on_time===null?-1:i.on_time?1:0;else return 0;return s<o?_statsSubSortDir==="asc"?-1:1:s>o?_statsSubSortDir==="asc"?1:-1:0}):t).map(n=>`<tr>
    <td>${escapeHtml(n.assignment_title)}</td>
    <td>${skillBadge(n.skill)}</td>
    <td><span class="stats-score-badge">${n.overall_score!==null?Number(n.overall_score).toFixed(1):"\u2014"}</span></td>
    <td style="color:var(--gray-400);font-size:12px">${formatDate(n.submitted_at)}</td>
    <td>${n.on_time===null?"\u2014":n.on_time?'<span class="stats-ontime-pill good">\u0110\xFAng h\u1EA1n</span>':'<span class="stats-ontime-pill bad">Mu\u1ED9n</span>'}</td>
    <td>${n.is_overtime?'<span class="stats-overtime-pill">\u23F0 Overtime</span>':"\u2014"}</td>
  </tr>`).join("")}function sortStatsSubTable(t,e){if(_statsSubSortCol===e?_statsSubSortDir=_statsSubSortDir==="asc"?"desc":"asc":(_statsSubSortCol=e,_statsSubSortDir=e==="title"||e==="skill"?"asc":"desc"),!_statsData)return;const n=_statsData.per_student.find(d=>d.id===t);if(!n)return;const i=_statsSkillFilter,s=_statsStatusFilter,o=_statsModeFilter,a=new Set(_statsData.per_assignment.filter(d=>(!i||d.skill===i)&&(s!=="active"||d.is_active)&&(s!=="closed"||!d.is_active)&&(!o||d.mode===o)).map(d=>d.id)),l=n.submissions.filter(d=>a.has(d.assignment_id)),r=document.getElementById(`stats-sub-tbody-${t}`);r&&(r.innerHTML=buildStatsSubRows(l));const c=document.getElementById(`stats-sub-thead-${t}`);c&&c.querySelectorAll("th.sortable").forEach(d=>{const u=d.querySelector(".sort-icon");u&&u.remove();const m=d.getAttribute("onclick").match(/'([^']+)'\)$/)?.[1];m&&d.insertAdjacentHTML("beforeend",makeSortIcon(m,_statsSubSortCol,_statsSubSortDir))})}window.sortStatsSubTable=sortStatsSubTable;function renderClassDetail(t,e=[]){const n=t.assignments.length===0?`<tr><td colspan="6">
        <div class="empty-state" style="padding:30px">
          <div class="empty-state-icon">\u{1F4CB}</div>
          <h3>Ch\u01B0a c\xF3 b\xE0i t\u1EADp n\xE0o</h3>
          <p>Nh\u1EA5n "Giao b\xE0i m\u1EDBi" \u0111\u1EC3 assign \u0111\u1EC1 cho l\u1EDBp n\xE0y.</p>
        </div>
       </td></tr>`:t.assignments.map(a=>{const l=isOverdue(a.deadline)&&a.is_active,r=t.student_count>0?Math.round(a.submission_count/t.student_count*100):0,c=a.skill==="composite",d=c&&Array.isArray(a.composite_sections)?a.composite_sections.map(m=>`<span class="badge" style="background:var(--surface);border:1px solid var(--border);font-size:10px;padding:1px 5px">${{reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"}[m.skill]||""} ${escapeHtml(m.label)}</span>`).join(" "):"",u=c?`/composite/${a.id}`:`/assignment/${a.id}`;return`
        <tr>
          <td>${skillBadge(a.skill)}</td>
          <td style="font-weight:600">
            ${escapeHtml(a.title)}
            ${c&&d?`<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:3px">${d}</div>`:""}
          </td>
          <td style="color:var(--gray-400);font-size:12px">${escapeHtml(a.question_title)}</td>
          <td>
            <span class="deadline${l?" overdue":""}">
              ${l?"\u26A0\uFE0F ":""}${formatDateTime(a.deadline)}
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
                  <span class="sub-progress-bar" style="width:${r}%"></span>
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
       </td></tr>`:buildStudentRows(e,t.id),s=`<div class="stats-loading-placeholder" id="stats-loading-placeholder">
      <div class="spinner"></div><p style="margin-top:12px;color:var(--gray-400)">\u0110ang t\u1EA3i th\u1ED1ng k\xEA...</p>
    </div>`,o=t.class_name.replace(/'/g,"\\'");$("#app").innerHTML=`
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
          onclick="openAssignModal('${t.id}', '${o}')">
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
      ${s}
    </div>`}let _assignFilterSkill="",_assignFilterSearch="";function filterAssignments(t,e){t!==null&&(_assignFilterSearch=t.toLowerCase().trim()),e!==null&&(_assignFilterSkill=e,document.querySelectorAll(".assign-skill-pill").forEach(o=>{o.classList.toggle("active",o.dataset.skill===e)}));const n=_cachedCls;if(!n)return;const i=n.assignments.filter(o=>{const a=!_assignFilterSkill||o.skill===_assignFilterSkill,l=!_assignFilterSearch||o.title.toLowerCase().includes(_assignFilterSearch)||(o.question_title||"").toLowerCase().includes(_assignFilterSearch);return a&&l}),s=document.getElementById("assign-tbody");if(s){if(i.length===0){s.innerHTML=`<tr><td colspan="6">
      <div class="empty-state" style="padding:20px">
        <div class="empty-state-icon">\u{1F50D}</div>
        <h3 style="font-size:14px">Kh\xF4ng t\xECm th\u1EA5y b\xE0i n\xE0o</h3>
      </div></td></tr>`;return}_assignListSortCol&&i.sort((o,a)=>{let l,r;if(_assignListSortCol==="skill")l=o.skill||"",r=a.skill||"";else if(_assignListSortCol==="title")l=o.title.toLowerCase(),r=a.title.toLowerCase();else if(_assignListSortCol==="deadline")l=o.deadline||"",r=a.deadline||"";else return 0;return l<r?_assignListSortDir==="asc"?-1:1:l>r?_assignListSortDir==="asc"?1:-1:0}),updateAssignListSortIcons(),s.innerHTML=i.map(o=>{const a=isOverdue(o.deadline)&&o.is_active,l=n.student_count>0?Math.round(o.submission_count/n.student_count*100):0,c=o.skill==="composite"?`/composite/${o.id}`:`/assignment/${o.id}`;return`
      <tr>
        <td>${skillBadge(o.skill)}</td>
        <td style="font-weight:600">${escapeHtml(o.title)}</td>
        <td style="color:var(--gray-400);font-size:12px">${escapeHtml(o.question_title)}</td>
        <td>
          <span class="deadline${a?" overdue":""}">
            ${a?"\u26A0\uFE0F ":""}${formatDateTime(o.deadline)}
          </span>
        </td>
        <td>
          <label class="toggle" title="${o.is_active?"\u0110ang m\u1EDF":"\u0110\xE3 \u0111\xF3ng"}">
            <input type="checkbox" ${o.is_active?"checked":""}
              onchange="toggleAssignment('${o.id}', this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <div class="td-actions">
            <button class="btn btn-sm btn-outline" title="Xem b\xE0i n\u1ED9p"
              onclick="navigate('${c}')">
              <span class="sub-progress-wrap">
                <span class="sub-progress-bar" style="width:${l}%"></span>
              </span>
              \u{1F4CA} ${o.submission_count}/${n.student_count} n\u1ED9p
            </button>
            <button class="btn-icon" title="\u0110\u1ED5i h\u1EA1n n\u1ED9p" aria-label="\u0110\u1ED5i h\u1EA1n n\u1ED9p"
              onclick="changeDeadline('${o.id}')">\u{1F4C5}</button>
            <button class="btn-icon danger" title="Xo\xE1" aria-label="Xo\xE1 b\xE0i t\u1EADp"
              onclick="deleteAssignment('${o.id}', '${n.id}', this)">\u{1F5D1}</button>
          </div>
        </td>
      </tr>`}).join("")}}window.filterAssignments=filterAssignments;function updateAssignListSortIcons(){[["assign-th-skill","skill"],["assign-th-title","title"],["assign-th-deadline","deadline"]].forEach(([t,e])=>{const n=document.getElementById(t);if(!n)return;const i=n.querySelector(".sort-icon");i&&i.remove(),n.insertAdjacentHTML("beforeend",makeSortIcon(e,_assignListSortCol,_assignListSortDir))})}function sortAssignList(t){_assignListSortCol===t?_assignListSortDir=_assignListSortDir==="asc"?"desc":"asc":(_assignListSortCol=t,_assignListSortDir=t==="title"||t==="skill"?"asc":"desc"),filterAssignments(null,null)}window.sortAssignList=sortAssignList;function getSelectedStudentIds(){return Array.from(document.querySelectorAll(".student-bulk-check:checked")).map(t=>t.dataset.sid)}function updateBulkBar(t){const e=getSelectedStudentIds(),n=document.getElementById("bulk-action-bar"),i=document.getElementById("bulk-count-label"),s=document.getElementById("select-all-students"),o=document.querySelectorAll(".student-bulk-check").length;n&&n.classList.toggle("hidden",e.length===0),i&&(i.textContent=`${e.length} \u0111\xE3 ch\u1ECDn`),s&&(s.indeterminate=e.length>0&&e.length<o,s.checked=e.length===o&&o>0)}window.updateBulkBar=updateBulkBar;function toggleSelectAllStudents(t,e){document.querySelectorAll(".student-bulk-check").forEach(n=>{n.checked=t.checked}),updateBulkBar(e)}window.toggleSelectAllStudents=toggleSelectAllStudents;function deselectAll(){document.querySelectorAll(".student-bulk-check").forEach(n=>{n.checked=!1});const t=document.getElementById("select-all-students");t&&(t.checked=!1,t.indeterminate=!1);const e=document.getElementById("bulk-action-bar");e&&e.classList.add("hidden")}window.deselectAll=deselectAll;async function bulkRemoveStudents(t){const e=getSelectedStudentIds();if(!(e.length===0||!await confirmAction({title:"Xo\xE1 h\u1ECDc sinh kh\u1ECFi l\u1EDBp",message:`B\u1EA1n s\u1EAFp xo\xE1 <strong>${e.length}</strong> h\u1ECDc sinh kh\u1ECFi l\u1EDBp n\xE0y.`,confirmText:"Xo\xE1 kh\u1ECFi l\u1EDBp",danger:!0})))try{await Promise.all(e.map(i=>api.delete(`/student-classes?student_id=${i}&class_id=${t}`))),toast(`\u0110\xE3 xo\xE1 ${e.length} h\u1ECDc sinh kh\u1ECFi l\u1EDBp`),showClassDetail({id:t})}catch(i){toast("L\u1ED7i xo\xE1: "+(i.error||i.message),"error")}}window.bulkRemoveStudents=bulkRemoveStudents;function bulkExportCSV(t){const e=Array.from(document.querySelectorAll(".student-bulk-check:checked"));if(e.length===0)return;const n=e.map(l=>{const r=l.closest("tr"),c=r.querySelector(".student-avatar")?.nextSibling?.textContent?.trim()||r.cells[1]?.textContent?.trim()||"",d=r.cells[2]?.textContent?.trim()||"";return[c,d].map(u=>`"${u.replace(/"/g,'""')}"`).join(",")}),i=`H\u1ECD t\xEAn,Username
`+n.join(`
`),s=new Blob([i],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(s),a=document.createElement("a");a.href=o,a.download=`students_${t}.csv`,a.click(),URL.revokeObjectURL(o),toast(`\u0110\xE3 xu\u1EA5t ${n.length} h\u1ECDc sinh ra CSV`)}window.bulkExportCSV=bulkExportCSV;function buildStudentRows(t,e){return t.map(n=>`
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
    </tr>`).join("")}function sortClassStudentsTable(t){if(_classStudentsSortCol===t?_classStudentsSortDir=_classStudentsSortDir==="asc"?"desc":"asc":(_classStudentsSortCol=t,_classStudentsSortDir="asc"),!_cachedStudents.length||!_cachedCls)return;const e=[..._cachedStudents].sort((i,s)=>{const o=(i[t]||"").toLowerCase(),a=(s[t]||"").toLowerCase();return o<a?_classStudentsSortDir==="asc"?-1:1:o>a?_classStudentsSortDir==="asc"?1:-1:0}),n=document.getElementById("students-tbody");n&&(n.innerHTML=buildStudentRows(e,_cachedCls.id)),[["student-th-name","full_name"],["student-th-username","username"]].forEach(([i,s])=>{const o=document.getElementById(i);if(!o)return;const a=o.querySelector(".sort-icon");a&&a.remove(),o.insertAdjacentHTML("beforeend",makeSortIcon(s,_classStudentsSortCol,_classStudentsSortDir))})}window.sortClassStudentsTable=sortClassStudentsTable;async function toggleAssignment(t,e){try{await api.patch(`/assignments/${t}`,{is_active:e}),toast(e?"\u0110\xE3 m\u1EDF b\xE0i t\u1EADp":"\u0110\xE3 \u0111\xF3ng b\xE0i t\u1EADp"),_cachedCls?.id&&await showClassDetail({id:_cachedCls.id})}catch(n){toast("L\u1ED7i c\u1EADp nh\u1EADt: "+(n.error||n.message),"error"),_cachedCls?.id&&await showClassDetail({id:_cachedCls.id})}}function changeDeadline(t){const e=_cachedCls?.assignments?.find(i=>i.id===t)?.deadline??null,n=e?new Date(new Date(e)-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):"";openModal("C\u1EADp nh\u1EADt h\u1EA1n n\u1ED9p",`
    <div style="padding:4px 0 16px">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">H\u1EA1n n\u1ED9p m\u1EDBi</label>
      <input id="new-deadline-input" type="datetime-local" class="form-input" value="${escapeHtml(n)}"
        style="width:100%" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Hu\u1EF7</button>
      <button class="btn btn-primary" onclick="saveDeadline('${escapeHtml(t)}', this)">L\u01B0u</button>
    </div>
  `)}window.changeDeadline=changeDeadline;async function saveDeadline(t,e){const n=$("#new-deadline-input")?.value;if(!n){toast("Vui l\xF2ng ch\u1ECDn th\u1EDDi gian","error");return}const i=new Date(n).toISOString(),s=new Date(i).getTime()>Date.now(),o=_cachedCls?.assignments?.find(l=>l.id===t)?.is_active===!1,a=s&&o;btnLoading(e);try{await api.patch(`/assignments/${t}`,a?{deadline:i,is_active:!0}:{deadline:i}),closeModal(),toast(a?"\u0110\xE3 c\u1EADp nh\u1EADt h\u1EA1n n\u1ED9p v\xE0 m\u1EDF l\u1EA1i b\xE0i t\u1EADp":"\u0110\xE3 c\u1EADp nh\u1EADt h\u1EA1n n\u1ED9p"),_cachedCls?.id&&await showClassDetail({id:_cachedCls.id})}catch(l){toast("L\u1ED7i: "+(l.error||l.message),"error"),btnReset(e)}}window.saveDeadline=saveDeadline;async function deleteAssignment(t,e,n){if(await confirmAction({title:"Xo\xE1 b\xE0i t\u1EADp",message:"B\xE0i t\u1EADp n\xE0y v\xE0 to\xE0n b\u1ED9 b\xE0i n\u1ED9p li\xEAn quan s\u1EBD b\u1ECB xo\xE1 v\u0129nh vi\u1EC5n.",confirmText:"Xo\xE1 b\xE0i t\u1EADp",danger:!0})){btnLoading(n);try{await api.delete(`/assignments/${t}`),toast("\u0110\xE3 xo\xE1 b\xE0i t\u1EADp"),showClassDetail({id:e})}catch(s){btnReset(n),toast("L\u1ED7i xo\xE1: "+(s.error||s.message),"error")}}}async function showAssignmentSubmissions({id:t}){_submissionsSortCol="",_submissionsSortDir="desc",setLoading("\u0110ang t\u1EA3i danh s\xE1ch b\xE0i n\u1ED9p...");const e=routeToken();try{const{assignment:n,students:i}=await api.get(`/assignments/${t}/submissions`);if(routeChanged(e))return;renderAssignmentSubmissions(n,i)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i d\u1EEF li\u1EC7u: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\xE1ch b\xE0i n\u1ED9p",n,`/assignment/${t}`)}}function exportSubmissionsCSV(t,e){const n=["H\u1ECD t\xEAn","Username","Tr\u1EA1ng th\xE1i","\u0110i\u1EC3m","Th\u1EDDi gian n\u1ED9p"],i=e.map(r=>[r.full_name,r.username,r.submission_id?"\u0110\xE3 n\u1ED9p":"Ch\u01B0a n\u1ED9p",r.overall_score!=null?r.overall_score:"",r.submitted_at?formatDateTime(r.submitted_at):""]),s=[n,...i].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join(`
`),o=new Blob(["\uFEFF"+s],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(o),l=document.createElement("a");l.href=a,l.download=`${t.title.replace(/[^a-zA-Z0-9_\-]/g,"_")}_diem.csv`,l.click(),URL.revokeObjectURL(a)}window.exportSubmissionsCSV=exportSubmissionsCSV;function buildSubmissionRows(t,e){return t.length===0?`<tr><td colspan="5">
      <div class="empty-state" style="padding:30px">
        <div class="empty-state-icon">\u{1F464}</div>
        <h3>L\u1EDBp ch\u01B0a c\xF3 h\u1ECDc sinh n\xE0o</h3>
      </div>
     </td></tr>`:t.map(n=>{const i=!!n.submission_id,s=n.overall_score!=null?`<span style="font-weight:700;color:var(--primary)">${n.overall_score}/9</span>`:i?'<span style="color:var(--gray-400)">Ch\u1EDD ch\u1EA5m</span>':"\u2014",o=i?'<span class="badge" style="background:#d1fae5;color:#065f46">\u2713 \u0110\xE3 n\u1ED9p</span>':'<span class="badge" style="background:#fee2e2;color:#991b1b">\u2717 Ch\u01B0a n\u1ED9p</span>',a=i?`<button class="btn btn-sm btn-outline"
           onclick="openSubmissionModal('${n.submission_id}', '${e.skill}')">
           Xem b\xE0i
         </button>`:'<span style="font-size:12px;color:var(--gray-400)">\u2014</span>';return`
      <tr>
        <td>
          <div style="font-weight:600">${escapeHtml(n.full_name)}</div>
          <div style="font-size:11px;color:var(--gray-400);font-family:monospace">${escapeHtml(n.username)}</div>
        </td>
        <td>${o}</td>
        <td>${s}</td>
        <td style="font-size:12px;color:var(--gray-400)">${n.submitted_at?formatDateTime(n.submitted_at):"\u2014"}</td>
        <td>${a}</td>
      </tr>`}).join("")}function sortedSubmissionStudents(t){return _submissionsSortCol?[...t].sort((e,n)=>{let i,s;switch(_submissionsSortCol){case"full_name":i=e.full_name.toLowerCase(),s=n.full_name.toLowerCase();break;case"status":i=e.submission_id?1:0,s=n.submission_id?1:0;break;case"score":i=e.overall_score??-1,s=n.overall_score??-1;break;case"submitted_at":i=e.submitted_at||"",s=n.submitted_at||"";break;default:return 0}return i<s?_submissionsSortDir==="asc"?-1:1:i>s?_submissionsSortDir==="asc"?1:-1:0}):t}function sortSubmissionsTable(t){_submissionsSortCol===t?_submissionsSortDir=_submissionsSortDir==="asc"?"desc":"asc":(_submissionsSortCol=t,_submissionsSortDir=t==="full_name"?"asc":"desc");const e=window._currentAssignmentData;if(!e)return;const n=document.querySelector(".table-wrap table tbody");n&&(n.innerHTML=buildSubmissionRows(sortedSubmissionStudents(e.students),e.assignment)),document.querySelectorAll("th[data-sub-col]").forEach(i=>{i.querySelector(".sort-icon")?.remove(),i.insertAdjacentHTML("beforeend",makeSortIcon(i.dataset.subCol,_submissionsSortCol,_submissionsSortDir))})}window.sortSubmissionsTable=sortSubmissionsTable;function renderAssignmentSubmissions(t,e){const n=e.filter(l=>l.submission_id).length,i=e.length-n,s=isOverdue(t.deadline)&&t.is_active,o=l=>makeSortIcon(l,_submissionsSortCol,_submissionsSortDir),a=buildSubmissionRows(sortedSubmissionStudents(e),t);window._currentAssignmentData={assignment:t,students:e},$("#app").innerHTML=`
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
          <span class="deadline${s?" overdue":""}">
            \u{1F5D3} ${s?"\u26A0\uFE0F ":""}${formatDateTime(t.deadline)}
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
            <th ${SORTABLE_TH_ATTRS} data-sub-col="full_name" onclick="sortSubmissionsTable('full_name')">H\u1ECDc sinh ${o("full_name")}</th>
            <th ${SORTABLE_TH_ATTRS} data-sub-col="status" onclick="sortSubmissionsTable('status')">Tr\u1EA1ng th\xE1i ${o("status")}</th>
            <th ${SORTABLE_TH_ATTRS} data-sub-col="score" onclick="sortSubmissionsTable('score')">\u0110i\u1EC3m ${o("score")}</th>
            <th ${SORTABLE_TH_ATTRS} data-sub-col="submitted_at" onclick="sortSubmissionsTable('submitted_at')">Th\u1EDDi gian n\u1ED9p ${o("submitted_at")}</th>
            <th>B\xE0i l\xE0m</th>
          </tr>
        </thead>
        <tbody>${a}</tbody>
      </table>
    </div>`}async function openSubmissionModal(t,e){if(e==="writing"||e==="speaking"){navigate(`/grading/${t}`);return}openModal("\u0110ang t\u1EA3i b\xE0i l\xE0m...",'<div class="loading-screen"><div class="spinner"></div></div>');try{const n=await api.get(`/submissions/${t}`);renderSubmissionModal(n,e)}catch(n){$("#modal-title").textContent="L\u1ED7i";const i=document.createElement("p");i.style.color="var(--danger)",i.textContent=n.error||n.message||"\u0110\xE3 x\u1EA3y ra l\u1ED7i",$("#modal-body").replaceChildren(i)}}function renderSubmissionModal(t,e){const n="";if(e==="reading"||e==="listening"){const i={};(t.questions_data||[]).forEach(l=>{i[l.q_no]=l.answers||[]});const s=(t.student_answers||[]).map(l=>{const r=i[l.q_no]||[],c=r.some(d=>d.toLowerCase().trim()===(l.answer||"").toLowerCase().trim());return`
        <tr>
          <td style="font-weight:600;text-align:center">Q${l.q_no}</td>
          <td>${escapeHtml(l.answer||"\u2014")}</td>
          <td style="color:var(--gray-400);font-size:12px">${r.join(" / ")}</td>
          <td style="text-align:center;font-size:16px">${c?"\u2705":"\u274C"}</td>
        </tr>`}).join(""),o=(t.student_answers||[]).filter(l=>(i[l.q_no]||[]).some(c=>c.toLowerCase().trim()===(l.answer||"").toLowerCase().trim())).length,a=(t.questions_data||[]).length;$("#modal-title").textContent=`B\xE0i l\xE0m \u2014 ${skillBadge(e).replace(/<[^>]+>/g,"")}`,$("#modal-body").innerHTML=`
      <div style="margin-bottom:12px;padding:12px 16px;background:var(--primary-lt);border-radius:8px;display:flex;gap:24px;align-items:center">
        <span style="font-size:20px;font-weight:700;color:var(--primary)">${t.overall_score??"\u2014"}/9</span>
        <span style="color:var(--gray-600);font-size:13px">\u0110\xFAng ${o}/${a} c\xE2u</span>
        <span style="color:var(--gray-400);font-size:12px">N\u1ED9p l\xFAc ${formatDateTime(t.submitted_at)}</span>
      </div>
      <div class="table-wrap" style="max-height:400px;overflow-y:auto">
        <table>
          <thead>
            <tr><th>C\xE2u</th><th>H\u1ECDc sinh tr\u1EA3 l\u1EDDi</th><th>\u0110\xE1p \xE1n \u0111\xFAng</th><th>K\u1EBFt qu\u1EA3</th></tr>
          </thead>
          <tbody>${s||'<tr><td colspan="4" style="text-align:center;color:var(--gray-400)">Kh\xF4ng c\xF3 \u0111\xE1p \xE1n</td></tr>'}</tbody>
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
      </div>`;else if(e==="speaking"){$("#modal-title").textContent="B\xE0i Speaking";const i=Array.isArray(t.speaking_audio_urls)&&t.speaking_audio_urls.length>0?t.speaking_audio_urls:t.speaking_audio_url?[{url:t.speaking_audio_url,name:""}]:[],s=i.length>1,o=i.length>0?i.map((l,r)=>`
          <div style="${s?"margin-bottom:10px":""}">
            ${s?`<div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:4px">${escapeHtml(l.name||"Ph\u1EA7n "+(r+1))}</div>`:""}
            <audio controls src="${escapeHtml(l.url||"")}" style="width:100%;border-radius:8px"></audio>
          </div>`).join(""):'<div style="color:var(--gray-400);padding:16px;text-align:center">Kh\xF4ng c\xF3 file audio</div>',a=t.speaking_script?`<div style="margin-top:12px">
           <div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:6px">TRANSCRIPT</div>
           <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;padding:12px;
                       background:var(--gray-50,#f9fafb);border-radius:8px;
                       border:1px solid var(--gray-200);max-height:240px;overflow-y:auto">
             ${escapeHtml(t.speaking_script)}
           </div>
         </div>`:"";$("#modal-body").innerHTML=`
      <div style="margin-bottom:8px;color:var(--gray-400);font-size:12px">
        N\u1ED9p l\xFAc ${formatDateTime(t.submitted_at)}
      </div>
      ${o}${a}
      <div style="margin-top:12px;padding:10px 14px;background:#fef9c3;border-radius:8px;font-size:12px;color:#713f12">
        \u270F\uFE0F Giao di\u1EC7n ch\u1EA5m v\xE0 nh\u1EADn x\xE9t speaking s\u1EBD c\xF3 \u1EDF phi\xEAn b\u1EA3n ti\u1EBFp theo.
      </div>`}}async function initWaveform(t,e){const i=document.createElement("canvas");i.className="waveform-canvas",i.height=56,t.innerHTML="",t.appendChild(i);const s=i.getContext("2d");function o(){i.width=t.clientWidth||600}o(),window.addEventListener("resize",o);let a=null;function l(r){const c=i.width,d=i.height;if(s.clearRect(0,0,c,d),!a){s.fillStyle="var(--gray-200)";for(let m=0;m<200;m++){const h=m/200*c,g=d*.15+Math.random()*d*.1;s.fillRect(h+1,(d-g)/2,c/200-2,g)}return}const u=c/200;for(let m=0;m<200;m++){const h=Math.max(3,a[m]*d*.9),g=m*u,b=m/200<(r||0);s.fillStyle=b?"#0f766e":"#d1d5db",s.fillRect(g+1,(d-h)/2,Math.max(1,u-2),h)}if(r>0){const m=r*c;s.strokeStyle="var(--primary-dk)",s.lineWidth=2,s.beginPath(),s.moveTo(m,4),s.lineTo(m,d-4),s.stroke()}}l(0),i.addEventListener("click",r=>{if(!e.duration)return;const c=i.getBoundingClientRect();e.currentTime=(r.clientX-c.left)/c.width*e.duration}),e.addEventListener("timeupdate",()=>{e.duration&&l(e.currentTime/e.duration)}),e.addEventListener("seeked",()=>{e.duration&&l(e.currentTime/e.duration)});try{const c=await(await fetch(e.src)).arrayBuffer(),d=new(window.AudioContext||window.webkitAudioContext),u=await d.decodeAudioData(c);d.close();const m=u.getChannelData(0),h=Math.floor(m.length/200),g=[];for(let y=0;y<200;y++){let L=0;for(let E=0;E<h;E++)L+=Math.abs(m[y*h+E]||0);g.push(L/h)}const b=Math.max(...g,.001);a=g.map(y=>y/b),a=a.map((y,L)=>{const E=a[L-1]??y,I=a[L+1]??y;return E*.25+y*.5+I*.25}),l(e.duration?e.currentTime/e.duration:0);const S=u.duration;if(S>0){const y=document.getElementById("audio-dur-0");if(y&&(y.textContent=`\xB7 ${formatAudioDur(S)}`),!isFinite(e.duration)||e.duration<1)try{e.currentTime=S,e.currentTime=0}catch{}}}catch{a=Array.from({length:200},()=>.2+Math.random()*.3),l(0)}}function formatAudioDur(t){const e=Math.round(t);return`${Math.floor(e/60)}:${String(e%60).padStart(2,"0")}`}async function fixTrackAudioDuration(t){const e=document.getElementById(`track-audio-${t}`),n=document.getElementById(`audio-dur-${t}`);if(!e||!e.src)return;const i=()=>isFinite(e.duration)&&e.duration>0?(n&&(n.textContent=`\xB7 ${formatAudioDur(e.duration)}`),!0):!1;if(i())return;e.addEventListener("loadedmetadata",()=>{i()||s()},{once:!0});async function s(){try{const a=await(await fetch(e.src)).arrayBuffer(),l=new(window.AudioContext||window.webkitAudioContext),r=await l.decodeAudioData(a);l.close(),r.duration>0&&n&&(n.textContent=`\xB7 ${formatAudioDur(r.duration)}`)}catch{}}setTimeout(()=>{n&&!n.textContent&&s()},1500)}let _gradingAnnotations=[],_gradingSubmissionId=null,_gradingText="",_gradingSkill="",_gradingAiFeedback=null,_gradingKeyHandler=null;function bindGradingShortcuts(){_gradingKeyHandler&&document.removeEventListener("keydown",_gradingKeyHandler),_gradingKeyHandler=t=>{const e=(t.target?.tagName||"").toUpperCase();if(e==="INPUT"||e==="TEXTAREA"){if((t.metaKey||t.ctrlKey)&&t.key.toLowerCase()==="s"){t.preventDefault();const n=document.querySelector('#save-btn, [onclick*="saveGrading"]');n&&saveGrading(n,"complete")}return}if((t.metaKey||t.ctrlKey)&&t.key.toLowerCase()==="s"){t.preventDefault();const n=document.querySelector('#save-btn, [onclick*="saveGrading"]');n&&saveGrading(n)}if((t.key==="ArrowDown"||t.key==="ArrowUp")&&_gradingAnnotations.length>0){t.preventDefault();const n=_gradingAnnotations.map(s=>s.id);let i=n.indexOf(window._gradingFocusAnnId);i<0&&(i=t.key==="ArrowDown"?-1:0),i=t.key==="ArrowDown"?(i+1)%n.length:(i-1+n.length)%n.length,window._gradingFocusAnnId=n[i],scrollToAnnotation(window._gradingFocusAnnId)}},document.addEventListener("keydown",_gradingKeyHandler)}function unbindGradingShortcuts(){_gradingKeyHandler&&document.removeEventListener("keydown",_gradingKeyHandler),_gradingKeyHandler=null}async function showGradingPage({id:t}){setLoading("\u0110ang t\u1EA3i b\xE0i l\xE0m...");const e=routeToken();try{const n=await api.get(`/submissions/${t}`);if(routeChanged(e))return;renderGradingPage(n),bindGradingShortcuts()}catch(n){if(routeChanged(e))return;toast("L\u1ED7i: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c b\xE0i l\xE0m",n,`/grading/${t}`)}}window.addEventListener("hashchange",()=>{window.location.hash.includes("/grading/")||unbindGradingShortcuts()});function renderGradingPage(t){_gradingSubmissionId=t.id,_gradingSkill=t.skill,_gradingText=t.skill==="speaking"?t.speaking_script||"":t.writing_content||"";const e=t.teacher_feedback||{};_gradingAnnotations=e.annotations||[],_gradingAiFeedback=t.ai_feedback||null;const n=t.submission_kind==="composite_section"?`/composite/${t.assignment_id}`:`/assignment/${t.assignment_id}`,i=t.supports_ai_feedback!==!1,s=t.skill==="speaking"?"\u{1F3A4} Ch\u1EA5m b\xE0i Speaking":"\u270F\uFE0F Ch\u1EA5m b\xE0i Writing",o=(t.attempt_number||1)>1,a=t.previous_attempts||[];let l="";if(t.skill==="speaking"){const u=Array.isArray(t.speaking_audio_urls)&&t.speaking_audio_urls.length>0?t.speaking_audio_urls:t.speaking_audio_url?[{url:t.speaking_audio_url,name:""}]:[],m=u.length>1;u.length>0&&(l=`
        <div style="margin-bottom:16px;padding:12px;background:var(--gray-50);border-radius:12px;border:1px solid var(--gray-200)">
          <div style="font-size:12px;font-weight:700;color:var(--gray-500);margin-bottom:8px;text-transform:uppercase">Audio ghi \xE2m</div>
          ${u.map((h,g)=>`
            <div style="${m?"margin-bottom:10px":""}">
              ${m?`<div style="font-size:12px;color:var(--gray-500);margin-bottom:4px">${escapeHtml(h.name||"Ph\u1EA7n "+(g+1))} <span id="audio-dur-${g}" style="color:var(--gray-400)"></span></div>`:""}
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
          ${s}
          ${o?`<span class="rewrite-badge-title">B\xC0I VI\u1EBET L\u1EA0I \xB7 L\u1EA7n ${t.attempt_number}</span>`:""}
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
        ${l}
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
          ${t.skill==="writing"?`<button class="btn btn-outline grading-rewrite-btn" onclick="saveGrading(this, 'request_rewrite')">\u270F\uFE0F Y\xEAu c\u1EA7u vi\u1EBFt l\u1EA1i</button>`:""}
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
    </div>`,refreshWritingDisplay(),refreshAnnotationsList(),refreshAiFeedbackDisplay(),document.getElementById("writing-display").addEventListener("mouseup",handleTextSelection);const r=document.getElementById("waveform-container"),c=document.getElementById("waveform-audio");r&&c&&initWaveform(r,c);let d=1;for(;document.getElementById(`track-audio-${d}`);)fixTrackAudioDuration(d),d++}function refreshWritingDisplay(){const t=document.getElementById("writing-display");t&&(t.innerHTML=buildAnnotatedHtml(_gradingText,_gradingAnnotations))}function refreshAnnotationsList(){const t=document.getElementById("annotations-list");if(!t)return;const e=[..._gradingAnnotations].sort((s,o)=>s.start-o.start);if(e.length===0){t.innerHTML='<div class="annotations-empty">Ch\u01B0a c\xF3 nh\u1EADn x\xE9t n\xE0o. B\xF4i \u0111en \u0111o\u1EA1n v\u0103n \u0111\u1EC3 th\xEAm.</div>';return}const n=_annColorMap(_gradingAnnotations);let i=0;t.innerHTML=e.map(s=>{const o=(s.type||"highlight")==="delete",a=o?'<span class="annotation-delete-badge">\u2715 G\u1EA1ch x\xF3a</span>':`<span class="annotation-number ann-num-c${n.get(s.id)}">${++i}</span>`;return`
    <div class="annotation-card ${o?"ann-card-delete":`ann-card-c${n.get(s.id)}`}" id="ann-card-${s.id}">
      <div class="annotation-card-header">
        ${a}
        <div class="annotation-actions">
          <button class="annotation-edit" onclick="editAnnotation('${s.id}')" title="S\u1EEDa nh\u1EADn x\xE9t" aria-label="S\u1EEDa nh\u1EADn x\xE9t"><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 4l2 2" stroke="currentColor" stroke-width="1.4"/></svg></button>
          <button class="annotation-delete" onclick="removeAnnotation('${s.id}')" title="Xo\xE1 nh\u1EADn x\xE9t" aria-label="Xo\xE1 nh\u1EADn x\xE9t">\xD7</button>
        </div>
      </div>
      <div class="annotation-quote${o?" annotation-quote-delete":""}">"${escapeHtml(s.text.slice(0,70))}${s.text.length>70?"\u2026":""}"</div>
      <div class="annotation-comment" id="ann-comment-${s.id}">${escapeHtml(s.comment)}</div>
    </div>`}).join("")}const ANN_COLORS=["ann-c0","ann-c1","ann-c2","ann-c3","ann-c4","ann-c5"];function _annColorMap(t){if(!t||!t.length)return new Map;const e=t.filter(s=>(s.type||"highlight")==="highlight");if(!e.length)return new Map;const n=new Map(e.map(s=>[s.id,0])),i=[...e].sort((s,o)=>s.end-s.start-(o.end-o.start));for(const s of i)for(const o of e)o!==s&&o.start<=s.start&&o.end>=s.end&&n.set(o.id,Math.max(n.get(o.id),n.get(s.id)+1));return new Map(e.map(s=>[s.id,Math.min(n.get(s.id),ANN_COLORS.length-1)]))}function buildAnnotatedHtml(t,e){if(!t)return'<span style="color:var(--gray-400)">(Tr\u1ED1ng)</span>';if(!e.length)return escapeHtml(t);const n=_annColorMap(e),i=[...e].sort((l,r)=>l.start-r.start);let s=0;const o=new Map(i.map(l=>(l.type||"highlight")==="highlight"?[l.id,++s]:[l.id,null]));function a(l,r,c){if(l>=r)return"";if(!c.length)return escapeHtml(t.slice(l,r));const d=[...c].sort((g,b)=>g.start-b.start||b.end-b.start-(g.end-g.start));let u="",m=l;const h=new Set;for(const g of d){if(h.has(g.id))continue;const b=Math.max(g.start,m);if(b>=g.end)continue;u+=escapeHtml(t.slice(m,b));const S=d.filter(y=>!h.has(y.id)&&y!==g&&y.start>=g.start&&y.end<=g.end);if(S.forEach(y=>h.add(y.id)),h.add(g.id),(g.type||"highlight")==="delete")u+=`<span class="ann-delete" data-id="${g.id}" onclick="scrollToAnnotation('${g.id}')" title="${escapeHtml(g.comment)}">`,u+=a(b,g.end,S),u+="</span>";else{const y=ANN_COLORS[n.get(g.id)];u+=`<mark class="ann-highlight ${y}" data-id="${g.id}" onclick="scrollToAnnotation('${g.id}')" title="${escapeHtml(g.comment)}">`,u+=a(b,g.end,S),u+=`<sup class="ann-marker ann-marker-c${n.get(g.id)}">${o.get(g.id)}</sup>`,u+="</mark>"}m=g.end}return u+=escapeHtml(t.slice(m,r)),u}return a(0,t.length,e)}function _plainTextOffset(t,e,n){const i=document.createTreeWalker(t,NodeFilter.SHOW_TEXT,{acceptNode:a=>a.parentElement?.closest(".ann-marker")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let s=0,o;for(;o=i.nextNode();){if(o===e)return s+n;s+=o.length}return s}function handleTextSelection(){closeAnnotationPopup();const t=window.getSelection();if(!t||t.isCollapsed||!t.toString().trim())return;const e=t.getRangeAt(0),n=document.getElementById("writing-display");if(!n||!n.contains(e.commonAncestorContainer))return;const i=_plainTextOffset(n,e.startContainer,e.startOffset),s=_plainTextOffset(n,e.endContainer,e.endOffset),o=e.toString();if(!o.trim())return;const a=e.getBoundingClientRect();showAnnotationPopup(i,s,o,a)}function showAnnotationPopup(t,e,n,i){const s=document.createElement("div");s.id="annotation-popup",s.className="annotation-popup",s.innerHTML=`
    <div class="annotation-popup-quote">"${escapeHtml(n.slice(0,90))}${n.length>90?"\u2026":""}"</div>
    <textarea id="ann-comment-input" class="form-textarea" rows="3"
      placeholder="Nh\u1EADn x\xE9t cho \u0111o\u1EA1n n\xE0y... (Cmd/Ctrl+Enter \u0111\u1EC3 l\u01B0u, Esc \u0111\u1EC3 h\u1EE7y)"></textarea>
    <div class="annotation-popup-actions">
      <button class="btn btn-sm btn-outline" onclick="closeAnnotationPopup()">H\u1EE7y (Esc)</button>
      <button class="btn btn-sm btn-ann-delete" onclick="confirmAnnotation(${t},${e},'delete')">G\u1EA1ch x\xF3a</button>
      <button class="btn btn-sm btn-primary" onclick="confirmAnnotation(${t},${e},'highlight')">Highlight (\u2318\u21B5)</button>
    </div>`,document.body.appendChild(s);const o=window.visualViewport?.width??window.innerWidth,a=window.visualViewport?.height??window.innerHeight,l=s.offsetWidth||340,r=s.offsetHeight||200,c=Math.min(i.bottom+10,a-r-8),d=Math.max(8,Math.min(i.left,o-l-8));s.style.top=c+"px",s.style.left=d+"px",setTimeout(()=>{const u=document.getElementById("ann-comment-input");u?.focus(),u?.addEventListener("keydown",m=>{m.key==="Escape"?(m.preventDefault(),closeAnnotationPopup()):(m.metaKey||m.ctrlKey)&&m.key==="Enter"&&(m.preventDefault(),confirmAnnotation(t,e,"highlight"))}),document.addEventListener("mousedown",_popupOutsideClick)},60)}function _popupOutsideClick(t){const e=document.getElementById("annotation-popup");e&&!e.contains(t.target)&&closeAnnotationPopup()}function closeAnnotationPopup(){const t=document.getElementById("annotation-popup");t&&(t.remove(),window.getSelection()?.removeAllRanges()),document.removeEventListener("mousedown",_popupOutsideClick)}function confirmAnnotation(t,e,n="highlight"){const i=document.getElementById("ann-comment-input")?.value.trim();if(!i){toast("Vui l\xF2ng nh\u1EADp nh\u1EADn x\xE9t","error");return}if(n==="delete"&&_gradingAnnotations.some(o=>(o.type||"highlight")==="delete"&&o.start<e&&t<o.end)){toast("V\xF9ng g\u1EA1ch x\xF3a kh\xF4ng \u0111\u01B0\u1EE3c ch\u1ED3ng l\xEAn nhau","error");return}_gradingAnnotations.push({id:crypto.randomUUID(),start:t,end:e,text:_gradingText.slice(t,e),comment:i,type:n}),closeAnnotationPopup(),refreshWritingDisplay(),refreshAnnotationsList()}function removeAnnotation(t){_gradingAnnotations=_gradingAnnotations.filter(e=>e.id!==t),refreshWritingDisplay(),refreshAnnotationsList()}function editAnnotation(t){const e=_gradingAnnotations.find(s=>s.id===t);if(!e)return;const n=document.getElementById(`ann-comment-${t}`);if(!n||n.querySelector("textarea"))return;n.innerHTML=`
    <textarea class="annotation-edit-input" rows="3"></textarea>
    <div class="annotation-edit-actions">
      <button class="annotation-save-btn" onclick="saveAnnotation('${t}')">L\u01B0u</button>
      <button class="annotation-cancel-btn" onclick="refreshAnnotationsList()">Hu\u1EF7</button>
    </div>`;const i=n.querySelector("textarea");i.value=e.comment,i.focus()}function saveAnnotation(t){const e=document.getElementById(`ann-comment-${t}`)?.querySelector("textarea");if(!e)return;const n=e.value.trim();if(!n){toast("Vui l\xF2ng nh\u1EADp nh\u1EADn x\xE9t","error");return}const i=_gradingAnnotations.find(s=>s.id===t);i&&(i.comment=n),refreshWritingDisplay(),refreshAnnotationsList()}function scrollToAnnotation(t){document.getElementById(`ann-card-${t}`)?.scrollIntoView({behavior:"smooth",block:"nearest"})}async function saveGrading(t,e="complete"){const n=document.getElementById("overall-feedback")?.value.trim()||"",i=document.getElementById("grading-score")?.value,s=i!==""&&i!=null?parseFloat(i):null;if(s===null||i===""){toast("Vui l\xF2ng nh\u1EADp Band Score tr\u01B0\u1EDBc khi ho\xE0n th\xE0nh","error"),document.getElementById("grading-score")?.focus();return}if(isNaN(s)||s<0||s>9){toast("\u0110i\u1EC3m Band ph\u1EA3i t\u1EEB 0 \u0111\u1EBFn 9","error");return}btnLoading(t);try{await api.patch(`/submissions/${_gradingSubmissionId}`,{teacher_feedback:{annotations:_gradingAnnotations,overall:n,score:s},overall_score:s,action:e}),toast(e==="request_rewrite"?"\u0110\xE3 y\xEAu c\u1EA7u h\u1ECDc sinh vi\u1EBFt l\u1EA1i! \u2713":"\u0110\xE3 ho\xE0n th\xE0nh ch\u1EA5m b\xE0i! \u2713"),setTimeout(()=>navigate("/inbox"),800)}catch(o){btnReset(t),toast("L\u1ED7i l\u01B0u: "+(o.error||o.message),"error")}}function toggleAiFeedback(t){const e=document.getElementById("ai-feedback-display"),n=t.querySelector(".ai-toggle-icon"),i=document.getElementById("ai-feedback-btn");if(!e)return;const s=e.style.display!=="none";e.style.display=s?"none":"",i&&(i.style.display=s?"none":""),n&&(n.textContent=s?"\u25BC":"\u25B2")}function refreshAiFeedbackDisplay(){const t=document.getElementById("ai-feedback-display");if(!t)return;if(!_gradingAiFeedback){t.innerHTML=`<div class="ai-feedback-empty">
      Nh\u1EA5n "\u2728 Ph\xE2n t\xEDch AI" \u0111\u1EC3 nh\u1EADn g\u1EE3i \xFD t\u1EEB AI v\u1EC1 t\u1EEB v\u1EF1ng v\xE0 ng\u1EEF ph\xE1p.
    </div>`;return}const e=_gradingAiFeedback,n=getAiCriterionForDisplay(e,"lr"),i=getAiCriterionForDisplay(e,"gra"),s=e.generated_at?`<span class="ai-feedback-time">T\u1EA1o l\xFAc ${formatDateTime(e.generated_at)}</span>`:"";t.innerHTML=`
    <div class="ai-feedback-head">
      <div class="ai-feedback-chips">
        ${aiBandChip("LR",e.lr_score)}
        ${aiBandChip("GRA",e.gra_score)}
      </div>
      ${s}
    </div>
    ${renderAiCriterionCard("\u{1F4DA}","T\u1EEB v\u1EF1ng","LR",e.lr_score,n)}
    ${renderAiCriterionCard("\u{1F4D0}","Ng\u1EEF ph\xE1p","GRA",e.gra_score,i)}`}function aiBandChip(t,e){const n=parseFloat(e);return`<span class="ai-band-chip" style="--chip-color:${n>=7?"#16a34a":n>=5?"#ca8a04":"#dc2626"}">${t} ${e??"\u2014"}</span>`}function getAiCriterionForDisplay(t,e){const n=t?.[e];if(n&&typeof n=="object"&&["band_justification_md","strengths_md","errors_md","tips_md"].some(s=>n[s])){const s={band_justification_md:n.band_justification_md||"",strengths_md:n.strengths_md||"",errors_md:n.errors_md||"",tips_md:n.tips_md||""};return s.band_justification_md&&!s.strengths_md&&!s.errors_md&&!s.tips_md?parseLegacyAiFeedbackText(s.band_justification_md):s}return parseLegacyAiFeedbackText(t?.[`${e}_feedback`]||"")}function parseLegacyAiFeedbackText(t){const e=String(t||"").trim(),n={band_justification_md:"",strengths_md:"",errors_md:"",tips_md:""};if(!e)return n;const i={"band justification":"band_justification_md","l\xFD do band":"band_justification_md",strengths:"strengths_md","\u0111i\u1EC3m m\u1EA1nh":"strengths_md","errors & weaknesses":"errors_md","l\u1ED7i & \u0111i\u1EC3m y\u1EBFu":"errors_md","improvement tips":"tips_md","g\u1EE3i \xFD c\u1EA3i thi\u1EC7n":"tips_md"},s=/(?:\*\*)?(Band justification|Lý do band|Strengths|Điểm mạnh|Errors\s*&\s*weaknesses|Lỗi\s*&\s*điểm yếu|Improvement tips|Gợi ý cải thiện)(?:\*\*)?\s*:/gi,o=[...e.matchAll(s)];if(o.length===0)return{...n,band_justification_md:e};const a={...n};return o.forEach((l,r)=>{const c=i[l[1].toLowerCase().replace(/\s+/g," ")];if(!c)return;const d=l.index+l[0].length,u=r+1<o.length?o[r+1].index:e.length,m=e.slice(d,u).trim();m&&(a[c]=m)}),a}function renderAiCriterionCard(t,e,n,i,s){const o=[["L\xFD do band",s.band_justification_md],["\u0110i\u1EC3m m\u1EA1nh",s.strengths_md],["L\u1ED7i & \u0111i\u1EC3m y\u1EBFu",s.errors_md],["G\u1EE3i \xFD c\u1EA3i thi\u1EC7n",s.tips_md]].filter(([,a])=>String(a||"").trim());return`
    <div class="ai-feedback-card">
      <div class="ai-feedback-card-head">
        <div>
          <div class="ai-feedback-criterion">${t} ${e} (${n})</div>
          <div class="ai-feedback-score">${i??"\u2014"}/9</div>
        </div>
      </div>
      <div class="ai-feedback-sections">
        ${o.map(([a,l])=>`
          <section class="ai-feedback-md-section">
            <div class="ai-feedback-section-label">${escapeHtml(a)}</div>
            <div class="ai-feedback-markdown">${renderSafeMarkdown(l)}</div>
          </section>
        `).join("")}
      </div>
    </div>`}async function requestAiFeedback(t){btnLoading(t);try{_gradingAiFeedback=(await api.post(`/submissions/${_gradingSubmissionId}/ai-feedback`,{})).ai_feedback,refreshAiFeedbackDisplay(),toast("AI \u0111\xE3 ph\xE2n t\xEDch xong! \u2713")}catch(e){toast("L\u1ED7i AI: "+(e.error||e.message),"error")}finally{btnReset(t)}}let _assignClassId=null,_questions=[],_selectedQuestionId=null,_assignSkillFilter="",_assignTagFilter="",_assignSearch="",_assignSortCol="",_assignSortDir="asc";async function openAssignModal(t,e,n=null){_assignClassId=t,_selectedQuestionId=n,_questions=[],_assignSkillFilter="",_assignTagFilter="",_assignSearch="",_assignSortCol="",_assignSortDir="asc",openModal(`Giao b\xE0i cho l\u1EDBp "${e}"`,`
    <div class="form-group">
      <label class="form-label">T\xEAn b\xE0i t\u1EADp <span style="color:var(--danger)">*</span></label>
      <input id="assign-title" class="form-input" placeholder="VD: Reading th\xE1ng 5 - CAM 18 Test 1" />
    </div>
    <div class="form-group">
      <label class="form-label">Ch\u1ECDn \u0111\u1EC1 t\u1EEB kho</label>
      <div class="skill-tabs" id="assign-skill-tabs">
        ${["",...FILTERABLE_ASSIGNMENT_SKILLS].map((s,o)=>`
          <button class="skill-tab ${o===0?"active":""}"
            onclick="filterAssignQuestions('${s}', this)">
            ${o===0?"T\u1EA5t c\u1EA3":SKILL_LABELS[s].icon+" "+SKILL_LABELS[s].label}
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
    </div>`),document.querySelectorAll('input[name="assign-mode"]').forEach(s=>{s.addEventListener("change",_syncAssignTimeLimitVisibility)}),_syncAssignTimeLimitVisibility();const i=$("#assign-scale-group");i&&(i.style.display="none");try{if(_questions=await api.get("/questions"),renderAssignPicker(""),n){const o=_questions.find(l=>l.id===n)?.skill||"",a=$("#assign-scale-group");a&&(a.style.display=o==="reading"||o==="listening"||o==="composite"?"":"none")}}catch{toast("Kh\xF4ng th\u1EC3 t\u1EA3i kho \u0111\u1EC1","error")}}function renderAssignPicker(t){const e=_assignSearch.trim().toLowerCase(),n=_questions.filter(o=>{if(t&&o.skill!==t||_assignTagFilter&&!(Array.isArray(o.tags)&&o.tags.includes(_assignTagFilter)))return!1;if(!e)return!0;const a=String(o.title||"").toLowerCase(),l=Array.isArray(o.tags)?o.tags.join(" ").toLowerCase():"";return a.includes(e)||l.includes(e)}),i=$("#assign-question-picker");if(!i)return;if(renderAssignTagFilterBar(t),n.length===0){i.innerHTML=`<div style="padding:20px;text-align:center;color:var(--gray-400)">
      Kh\xF4ng c\xF3 \u0111\u1EC1 n\xE0o ph\xF9 h\u1EE3p v\u1EDBi b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i
    </div>`;return}_assignSortCol&&n.sort((o,a)=>{let l,r;if(_assignSortCol==="title")l=o.title.toLowerCase(),r=a.title.toLowerCase();else if(_assignSortCol==="created_at")l=o.created_at||"",r=a.created_at||"";else return 0;return l<r?_assignSortDir==="asc"?-1:1:l>r?_assignSortDir==="asc"?1:-1:0});const s=`<div class="assign-sort-pills">
    <span style="font-size:11px;font-weight:600;color:var(--gray-400)">S\u1EAFp x\u1EBFp:</span>
    ${[["","M\u1EB7c \u0111\u1ECBnh"],["title","A\u2192Z t\xEAn"],["created_at","M\u1EDBi nh\u1EA5t"]].map(([o,a])=>`
      <button type="button" class="stats-filter-pill${_assignSortCol===o?" active":""}"
        onclick="_assignSortCol='${o}'; _assignSortDir='asc'; renderAssignPicker(_assignSkillFilter)">
        ${a}
      </button>`).join("")}
  </div>`;i.innerHTML=s+n.map(o=>`
    <div class="question-picker-item ${_selectedQuestionId===o.id?"selected":""}"
      data-skill="${o.skill}" onclick="selectQuestion('${o.id}', this)">
      <input type="radio" name="assign-q" value="${o.id}"
        ${_selectedQuestionId===o.id?"checked":""} />
      <div>
        ${skillBadge(o.skill)}
        <div style="font-weight:600;margin-top:4px;font-size:13px">${o.title}</div>
        ${Array.isArray(o.tags)&&o.tags.length>0?`
          <div class="assign-question-tags">
            ${o.tags.map(a=>`
              <button type="button"
                class="tag-chip assign-tag-chip ${_assignTagFilter===a?"tag-chip-active":""}"
                onclick="event.stopPropagation(); setAssignTagFilter('${escapeHtml(a)}')">${escapeHtml(a)}</button>
            `).join("")}
          </div>
        `:""}
        <div style="font-size:11px;color:var(--gray-400)">${formatDate(o.created_at)}</div>
      </div>
    </div>`).join("")}function filterAssignQuestions(t,e){_assignSkillFilter=t,document.querySelectorAll("#assign-skill-tabs .skill-tab").forEach(n=>n.classList.remove("active")),e.classList.add("active"),renderAssignPicker(t)}function filterAssignQuestionSearch(t){_assignSearch=t||"",renderAssignPicker(_assignSkillFilter)}function renderAssignTagFilterBar(t){const e=$("#assign-tag-filter-bar");if(!e)return;const n=new Set;_questions.forEach(s=>{t&&s.skill!==t||Array.isArray(s.tags)&&s.tags.forEach(o=>o&&n.add(String(o)))});const i=Array.from(n).sort((s,o)=>s.localeCompare(o));if(i.length===0){e.innerHTML="",e.style.display="none";return}e.style.display="flex",e.innerHTML=`
    <span>L\u1ECDc tag:</span>
    <button type="button"
      class="tag-chip ${_assignTagFilter?"":"tag-chip-active"}"
      onclick="setAssignTagFilter('')">T\u1EA5t c\u1EA3</button>
    ${i.map(s=>`
      <button type="button"
        class="tag-chip ${_assignTagFilter===s?"tag-chip-active":""}"
        onclick="setAssignTagFilter('${escapeHtml(s)}')">${escapeHtml(s)}</button>
    `).join("")}
  `}function setAssignTagFilter(t){_assignTagFilter=t||"",renderAssignPicker(_assignSkillFilter)}function selectQuestion(t,e){_selectedQuestionId=t,document.querySelectorAll(".question-picker-item").forEach(s=>s.classList.remove("selected")),e.classList.add("selected"),e.querySelector("input[type=radio]").checked=!0;const n=e.dataset.skill||"",i=$("#assign-scale-group");i&&(i.style.display=n==="reading"||n==="listening"||n==="composite"?"":"none")}function _syncAssignTimeLimitVisibility(){const t=document.querySelector('input[name="assign-mode"]:checked'),e=!t||t.value!=="practice",n=$("#assign-time-limit-group");n&&(n.style.display=e?"":"none")}async function submitAssign(t,e=!1){const n=$("#assign-title")?.value.trim(),i=$("#assign-deadline")?.value,s=i?new Date(i).toISOString():null,a=document.querySelector('input[name="assign-mode"]:checked')?.value==="practice"?"practice":"exam",l=$("#assign-time-limit")?.value.trim(),r=a==="exam"&&l?Number(l):null,d=document.querySelector('input[name="assign-scale"]:checked')?.value||null;if(!n){toast("Vui l\xF2ng nh\u1EADp t\xEAn b\xE0i t\u1EADp","error");return}if(!_selectedQuestionId){toast("Vui l\xF2ng ch\u1ECDn m\u1ED9t \u0111\u1EC1 t\u1EEB kho","error");return}if(!e&&d==="ielts"){const u=_questions.find(b=>b.id===_selectedQuestionId),m=u?.question_count??0,h=u?.skill??"";if((h==="reading"||h==="listening")&&m!==40){let b=document.getElementById("assign-scale-warn");b||(b=document.createElement("div"),b.id="assign-scale-warn",document.getElementById("modal-body")?.appendChild(b)),b.innerHTML=`
        <div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin-top:12px">
          <p style="margin:0 0 6px;font-weight:600;color:#92400e">\u26A0\uFE0F \u0110\u1EC1 ch\u1EC9 c\xF3 ${m} c\xE2u \u2014 thang IELTS chu\u1EA9n d\xF9ng 40 c\xE2u</p>
          <p style="margin:0 0 12px;font-size:.875em;color:#78350f">\u0110i\u1EC3m t\u1EF1 ch\u1EA5m s\u1EBD kh\xF4ng ch\xEDnh x\xE1c. N\xEAn ch\u1ECDn l\u1EA1i <strong>Practice Test (thang 10)</strong>, tr\u1EEB khi \u0111\xE2y l\xE0 \u0111\u1EC1 g\u1ED9p nhi\u1EC1u section \u0111\u1EE7 40 c\xE2u.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('assign-scale-warn')?.remove()">\u0110\u1ED5i thang \u0111i\u1EC3m</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('assign-scale-warn')?.remove(); submitAssign(null, true)">V\u1EABn giao (thang IELTS)</button>
          </div>
        </div>`,b.scrollIntoView({behavior:"smooth",block:"nearest"});return}}t&&btnLoading(t);try{await api.post("/assignments",{class_id:_assignClassId,question_id:_selectedQuestionId,title:n,deadline:s||null,mode:a,time_limit_minutes:r,scoring_scale:d}),closeModal(),toast("Giao b\xE0i th\xE0nh c\xF4ng!")}catch(u){t&&btnReset(t),toast("L\u1ED7i giao b\xE0i: "+(u.error||u.message),"error")}}let _currentSkillFilter="",_allQuestions=[],_allFolders=[],_currentFolderFilter=null,_questionSearch="",_questionTagFilter="",_questionSortCol="",_questionSortDir="asc",_allClasses=[],_classSearch="",_classSort="newest",_classDetailTab="assignments",_cachedCls=null,_cachedStudents=[],_assignTableSortCol="",_assignTableSortDir="desc",_submissionsSortCol="",_submissionsSortDir="desc",_assignListSortCol="",_assignListSortDir="desc",_classStudentsSortCol="",_classStudentsSortDir="asc";async function showQuestions(){_questionSortCol="",_questionSortDir="asc",setLoading("\u0110ang t\u1EA3i kho \u0111\u1EC1...");const t=routeToken();try{const[e,n]=await Promise.all([api.get("/questions"),api.get("/question-folders")]);if(routeChanged(t))return;_allQuestions=e,_allFolders=n,renderQuestions()}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i kho \u0111\u1EC1: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c kho \u0111\u1EC1",e,"/questions")}}function _getFolderSubtreeIds(t){const e=new Set([t]),n=[t];for(;n.length;){const i=n.shift();for(const s of _allFolders)s.parent_id===i&&(e.add(s.id),n.push(s.id))}return e}function _getFilteredQuestions(){let t=_allQuestions;if(_currentFolderFilter==="root")t=t.filter(e=>!e.folder_id);else if(_currentFolderFilter){const e=_getFolderSubtreeIds(_currentFolderFilter);t=t.filter(n=>e.has(n.folder_id))}if(_currentSkillFilter&&(t=t.filter(e=>e.skill===_currentSkillFilter)),_questionSearch){const e=_questionSearch.toLowerCase();t=t.filter(n=>n.title.toLowerCase().includes(e)||Array.isArray(n.tags)&&n.tags.some(i=>i.toLowerCase().includes(e)))}return _questionTagFilter&&(t=t.filter(e=>Array.isArray(e.tags)&&e.tags.includes(_questionTagFilter))),t}function _buildFolderSidebar(){const t=_allQuestions.length,e=_allQuestions.filter(n=>!n.folder_id).length;return`
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
  `}function _buildFolderTreeItems(t,e){return _allFolders.filter(n=>n.parent_id===t).sort((n,i)=>n.display_order-i.display_order||n.name.localeCompare(i.name)).map(n=>{const i=_getFolderSubtreeIds(n.id),s=_allQuestions.filter(r=>i.has(r.folder_id)).length,o=_currentFolderFilter===n.id,a=_allFolders.some(r=>r.parent_id===n.id),l=escapeHtml(n.name).replace(/'/g,"&#39;");return`
        <div class="folder-item ${o?"active":""}" style="padding-left:${12+e*14}px"
             onclick="setFolderFilter('${n.id}')" role="button" tabindex="0">
          <span class="folder-icon">${a?"\u{1F4C2}":"\u{1F4C1}"}</span>
          <span class="folder-name">${escapeHtml(n.name)}</span>
          <span class="folder-count">${s}</span>
          <span class="folder-item-actions" onclick="event.stopPropagation()">
            <button class="folder-action-btn" title="Th\xEAm th\u01B0 m\u1EE5c con" aria-label="Th\xEAm th\u01B0 m\u1EE5c con" onclick="createFolderPrompt('${n.id}')">&#xff0b;</button>
            <button class="folder-action-btn" title="\u0110\u1ED5i t\xEAn" aria-label="\u0110\u1ED5i t\xEAn th\u01B0 m\u1EE5c" onclick="renameFolderPrompt('${n.id}','${l}')">&#x270f;</button>
            <button class="folder-action-btn danger" title="Xo\xE1" aria-label="Xo\xE1 th\u01B0 m\u1EE5c" onclick="deleteFolderConfirm('${n.id}','${l}')">&#x1f5d1;</button>
          </span>
        </div>
        ${_buildFolderTreeItems(n.id,e+1)}`}).join("")}function setFolderFilter(t){_currentFolderFilter=t,renderQuestions()}window.setFolderFilter=setFolderFilter;async function createFolderPrompt(t){const e=await promptAction({title:t?"T\u1EA1o th\u01B0 m\u1EE5c con":"T\u1EA1o th\u01B0 m\u1EE5c m\u1EDBi",message:t?"Nh\u1EADp t\xEAn cho th\u01B0 m\u1EE5c con m\u1EDBi.":"Nh\u1EADp t\xEAn cho th\u01B0 m\u1EE5c m\u1EDBi trong kho \u0111\u1EC1.",placeholder:t?"V\xED d\u1EE5: Reading Mock 01":"V\xED d\u1EE5: B\u1ED9 \u0111\u1EC1 th\xE1ng 6",confirmText:"T\u1EA1o th\u01B0 m\u1EE5c",validate:n=>n?"":"Vui l\xF2ng nh\u1EADp t\xEAn th\u01B0 m\u1EE5c."});if(e)try{const n=await api.post("/question-folders",{name:e,parent_id:t});_allFolders.push(n),renderQuestions(),toast('\u0110\xE3 t\u1EA1o th\u01B0 m\u1EE5c "'+n.name+'"')}catch(n){toast("L\u1ED7i: "+(n.error||n.message),"error")}}window.createFolderPrompt=createFolderPrompt;async function renameFolderPrompt(t,e){const n=await promptAction({title:"\u0110\u1ED5i t\xEAn th\u01B0 m\u1EE5c",message:`C\u1EADp nh\u1EADt t\xEAn m\u1EDBi cho th\u01B0 m\u1EE5c <strong>${escapeHtml(e)}</strong>.`,initialValue:e,confirmText:"L\u01B0u t\xEAn m\u1EDBi",validate:i=>i?i===e?"T\xEAn m\u1EDBi \u0111ang tr\xF9ng t\xEAn hi\u1EC7n t\u1EA1i.":"":"Vui l\xF2ng nh\u1EADp t\xEAn th\u01B0 m\u1EE5c."});if(n)try{const i=await api.patch(`/question-folders/${t}`,{name:n}),s=_allFolders.findIndex(o=>o.id===t);s>=0&&(_allFolders[s]=i),renderQuestions()}catch(i){toast("L\u1ED7i: "+(i.error||i.message),"error")}}window.renameFolderPrompt=renameFolderPrompt;async function deleteFolderConfirm(t,e){const n=_allFolders.filter(a=>a.parent_id===t).length,i=_allQuestions.filter(a=>a.folder_id===t).length;let s=`<p style="margin:0">Th\u01B0 m\u1EE5c <strong>${escapeHtml(e)}</strong> s\u1EBD b\u1ECB xo\xE1.</p>`;if((n>0||i>0)&&(s+='<ul style="margin:12px 0 0 18px;line-height:1.7">',n>0&&(s+=`<li>${n} th\u01B0 m\u1EE5c con c\u0169ng s\u1EBD b\u1ECB xo\xE1.</li>`),i>0&&(s+=`<li>${i} \u0111\u1EC1 s\u1EBD \u0111\u01B0\u1EE3c chuy\u1EC3n v\u1EC1 Ch\u01B0a ph\xE2n lo\u1EA1i.</li>`),s+="</ul>"),!!await confirmAction({title:"Xo\xE1 th\u01B0 m\u1EE5c",message:s,confirmText:"Xo\xE1 th\u01B0 m\u1EE5c",danger:!0}))try{await api.delete(`/question-folders/${t}`);const a=_getFolderSubtreeIds(t);_allFolders=_allFolders.filter(l=>!a.has(l.id)),_allQuestions.forEach(l=>{a.has(l.folder_id)&&(l.folder_id=null)}),a.has(_currentFolderFilter)&&(_currentFolderFilter=null),renderQuestions(),toast("\u0110\xE3 xo\xE1 th\u01B0 m\u1EE5c")}catch(a){toast("L\u1ED7i: "+(a.error||a.message),"error")}}window.deleteFolderConfirm=deleteFolderConfirm;function openMoveQuestionModal(t){const e=_allQuestions.find(i=>i.id===t);if(!e)return;const n=(i,s)=>_allFolders.filter(o=>o.parent_id===i).sort((o,a)=>o.display_order-a.display_order||o.name.localeCompare(a.name)).map(o=>`
        <option value="${o.id}" ${e.folder_id===o.id?"selected":""}>
          ${"\u3000".repeat(s)}${escapeHtml(o.name)}
        </option>${n(o.id,s+1)}`).join("");openModal("Di chuy\u1EC3n \u0111\u1EC1 v\xE0o th\u01B0 m\u1EE5c",`
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
    </div>`,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add("drag-assign-panel--visible"))}function hideDragAssignPanel(){_setDragAssignState(""),_setDragAssignAutoScroll(0);const t=document.getElementById("drag-assign-panel");t&&(t.classList.remove("drag-assign-panel--visible"),setTimeout(()=>t.remove(),220))}function cancelDragAssign(){hideDragAssignPanel(),document.querySelectorAll("tr.dragging").forEach(t=>t.classList.remove("dragging")),_dragQuestionId=null,_dragQuestionTitle=""}function _setDragAssignState(t,e=null){const n=document.getElementById("drag-assign-panel");n&&(n.dataset.dropMode=t||"",document.querySelectorAll(".drag-class-target.drag-over, .drag-cancel-target.drag-over").forEach(i=>i.classList.remove("drag-over")),e&&e.classList.add("drag-over"))}function _setDragAssignAutoScroll(t){if(_dragAutoScrollDir=t,!t){_dragAutoScrollRaf&&cancelAnimationFrame(_dragAutoScrollRaf),_dragAutoScrollRaf=null;return}if(_dragAutoScrollRaf)return;const e=()=>{const n=document.getElementById("drag-assign-scroll");if(!n||!_dragAutoScrollDir){_dragAutoScrollRaf=null;return}n.scrollTop+=_dragAutoScrollDir*14,_dragAutoScrollRaf=requestAnimationFrame(e)};_dragAutoScrollRaf=requestAnimationFrame(e)}function onDragAssignListOver(t){const e=document.getElementById("drag-assign-scroll");if(!e)return;const n=e.getBoundingClientRect(),i=64;let s=0;t.clientY<n.top+i?s=-1:t.clientY>n.bottom-i&&(s=1),_setDragAssignAutoScroll(s)}function onDragAssignListLeave(){_setDragAssignAutoScroll(0)}function onDragOverClass(t,e){t.preventDefault(),t.dataTransfer.dropEffect="copy",_setDragAssignState("class",e),onDragAssignListOver(t)}function onDragLeaveClass(t,e){e.contains(t.relatedTarget)||(e.classList.remove("drag-over"),_setDragAssignState(""))}function onDragOverCancel(t,e){t.preventDefault(),t.dataTransfer.dropEffect="move",_setDragAssignState("cancel",e),_setDragAssignAutoScroll(0)}function onDragLeaveCancel(t,e){e.contains(t.relatedTarget)||(e.classList.remove("drag-over"),_setDragAssignState(""))}function onDropToClass(t,e,n){n.preventDefault();const i=_dragQuestionId||n.dataTransfer.getData("text/plain");_dragQuestionId=null,_dragQuestionTitle="",hideDragAssignPanel(),document.querySelectorAll("tr.dragging").forEach(s=>s.classList.remove("dragging")),i&&openAssignModal(t,e,i)}function onDropCancelDrag(t){t.preventDefault(),cancelDragAssign()}window.onQuestionDragStart=onQuestionDragStart,window.onQuestionDragEnd=onQuestionDragEnd,window.onDropToClass=onDropToClass,window.onDragAssignListOver=onDragAssignListOver,window.onDragAssignListLeave=onDragAssignListLeave,window.onDragOverClass=onDragOverClass,window.onDragLeaveClass=onDragLeaveClass,window.onDragOverCancel=onDragOverCancel,window.onDragLeaveCancel=onDragLeaveCancel,window.onDropCancelDrag=onDropCancelDrag;async function previewAsStudent(t){const e=_allQuestions.find(r=>r.id==t);if(!e)return;const i=(!Array.isArray(e.content_blocks)&&!e.content_text?await api.get(`/questions/${t}`).catch(()=>e):e)||e,s=i.skill,o=Array.isArray(i.questions_data)?i.questions_data:[];let a;if(s==="reading"||s==="listening"){let r="";for(let c=1;c<=o.length;c++)r+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:30px;font-weight:600;color:var(--gray-400)">Q${c}</span><input class="form-input" placeholder="\u0110\xE1p \xE1n c\xE2u ${c}" style="flex:1" /></div>`;a=`
      <div class="preview-as-student">
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">\u26A0\uFE0F \u0110\xE2y l\xE0 ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc \u2014 kh\xF4ng l\u01B0u \u0111\xE1p \xE1n</div>
        <div style="display:grid;grid-template-columns:1fr 320px;gap:14px">
          <div>
            ${i.content_url?`<audio controls src="${i.content_url}" style="width:100%;margin-bottom:10px"></audio>`:""}
            <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;max-height:400px;overflow-y:auto">${renderRichQuestionContentHTML(i.content_blocks,i.content_text||"")}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:8px">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
            ${r||'<div style="color:var(--gray-400)">Kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>'}
          </div>
        </div>
      </div>`}else s==="writing"?a=`
      <div>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">\u26A0\uFE0F \u0110\xE2y l\xE0 ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">\u0110\u1EC1 b\xE0i</div>
        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;margin-bottom:14px">${renderRichQuestionContentHTML(i.content_blocks,i.content_text||"")}</div>
        <textarea class="form-input" placeholder="H\u1ECDc sinh s\u1EBD vi\u1EBFt b\xE0i \u1EDF \u0111\xE2y..." style="width:100%;min-height:200px;padding:12px"></textarea>
      </div>`:s==="speaking"&&(a=`
      <div>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;color:#92400e">\u26A0\uFE0F \u0110\xE2y l\xE0 ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">Cue Card</div>
        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px;font-size:13px;line-height:1.7;margin-bottom:14px">${renderRichQuestionContentHTML(i.content_blocks,i.content_text||"")}</div>
        <div style="text-align:center;padding:24px;border:2px dashed var(--gray-300, var(--gray-200));border-radius:8px;color:var(--gray-400)">\u{1F399}\uFE0F H\u1ECDc sinh s\u1EBD thu \xE2m \u1EDF \u0111\xE2y</div>
      </div>`);const l=`Xem tr\u01B0\u1EDBc: ${i.title}`;openModal(l,a+`
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
      <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${t}')">Ch\u1EC9nh s\u1EEDa \u0111\u1EC1</button>
    </div>`)}window.previewAsStudent=previewAsStudent;function renderQuestions(){let t=_getFilteredQuestions();_questionSortCol&&(t=[...t].sort((i,s)=>{let o,a;if(_questionSortCol==="skill")o=i.skill||"",a=s.skill||"";else if(_questionSortCol==="title")o=i.title.toLowerCase(),a=s.title.toLowerCase();else if(_questionSortCol==="created_at")o=i.created_at||"",a=s.created_at||"";else return 0;return o<a?_questionSortDir==="asc"?-1:1:o>a?_questionSortDir==="asc"?1:-1:0}));const e=$("#app")?.querySelector(".question-bank-layout");if(e){e.querySelector(".folder-sidebar").innerHTML=_buildFolderSidebar(),e.querySelector("table tbody").innerHTML=_buildQuestionTableRows(t);const i=e.querySelector(".page-subtitle");i&&(i.textContent=`T\u1ED5ng c\u1ED9ng ${_allQuestions.length} \u0111\u1EC1 thi`),["skill","title","created_at"].forEach(o=>{const a=document.querySelector(`th[data-q-col="${o}"]`);if(!a)return;const l=a.querySelector(".sort-icon");l&&l.remove(),a.insertAdjacentHTML("beforeend",makeSortIcon(o,_questionSortCol,_questionSortDir))}),document.querySelectorAll(".skill-tab").forEach(o=>{o.classList.toggle("active",o.textContent.trim().includes(_currentSkillFilter?{reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking",composite:"T\u1ED5ng h\u1EE3p"}[_currentSkillFilter]:"T\u1EA5t c\u1EA3"))});const s=e.querySelector(".list-toolbar");if(s){let o=s.querySelector(".tag-filter-bar");_questionTagFilter&&!o&&(o=document.createElement("div"),o.className="tag-filter-bar",s.appendChild(o)),o&&(o.innerHTML=_questionTagFilter?`L\u1ECDc tag: <span class="tag-chip tag-chip-active">${escapeHtml(_questionTagFilter)}<button class="tag-chip-remove" onclick="setQuestionTagFilter('')" aria-label="Xo\xE1 b\u1ED9 l\u1ECDc tag">\xD7</button></span>`:"",_questionTagFilter||o.remove())}return}$("#app").innerHTML=`
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
          ${[["","T\u1EA5t c\u1EA3"],["reading","\u{1F4D6} Reading"],["listening","\u{1F3A7} Listening"],["writing","\u270D\uFE0F Writing"],["speaking","\u{1F3A4} Speaking"],["composite","\u{1F4CB} T\u1ED5ng h\u1EE3p"]].map(([i,s])=>`
            <button class="skill-tab ${_currentSkillFilter===i?"active":""}"
              onclick="setSkillFilter('${i}')">${s}</button>`).join("")}
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
    </div>`;const n=document.getElementById("question-search-input");n&&(n.addEventListener("input",()=>{_questionSearch=n.value,renderQuestions()}),_questionSearch&&n.focus())}function setQuestionTagFilter(t){_questionTagFilter=t,renderQuestions()}window.setQuestionTagFilter=setQuestionTagFilter;function sortQuestions(t){_questionSortCol===t?_questionSortDir=_questionSortDir==="asc"?"desc":"asc":(_questionSortCol=t,_questionSortDir="asc"),renderQuestions()}window.sortQuestions=sortQuestions;async function previewQuestion(t){const e=_allQuestions.find(r=>r.id==t);if(!e)return;const n=r=>{const c=Array.isArray(r.sections)?r.sections:[],d=c.map(u=>{const m=Array.isArray(u.questions_data)?u.questions_data.length:0;return`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-card)">
        <span>${_cqSkillIcon(u.skill)}</span>
        <span style="font-weight:600;font-size:13px">${escapeHtml(u.label||_cqSkillLabel(u.skill))}</span>
        <span style="color:var(--gray-400);font-size:12px">${_cqSkillLabel(u.skill)}${m?` \xB7 ${m} c\xE2u`:""}${u.time_limit_minutes?` \xB7 \u23F1${u.time_limit_minutes}ph`:""}</span>
      </div>`}).join("");return`
      <div style="margin-bottom:12px">${skillBadge(r.skill)}</div>
      <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
        <span class="stat-chip">\u{1F4CB} ${c.length} ph\u1EA7n thi</span>
        <span class="stat-chip">\u{1F4C5} T\u1EA1o ${formatDate(r.created_at)}</span>
      </div>
      ${c.length?`
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:8px">C\xE1c ph\u1EA7n thi</div>
      ${d}`:'<div style="color:var(--gray-400);font-size:13px">Ch\u01B0a c\xF3 ph\u1EA7n thi n\xE0o.</div>'}
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
        <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${t}')">Ch\u1EC9nh s\u1EEDa</button>
      </div>`},i=Array.isArray(e.questions_data)?e.questions_data:[],s=(r,c,d)=>`
    <div style="margin-bottom:12px">${skillBadge(r.skill)}</div>
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <span class="stat-chip">\u{1F4CB} ${i.length} c\xE2u h\u1ECFi</span>
      <span class="stat-chip">\u{1F4C5} T\u1EA1o ${formatDate(r.created_at)}</span>
      ${r.content_url?'<span class="stat-chip">\u{1F50A} C\xF3 audio</span>':""}
    </div>
    ${r.content_text||Array.isArray(r.content_blocks)&&r.content_blocks.length?`
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">\u{1F4C4} N\u1ED9i dung \u0111\u1EC1 b\xE0i</div>
      <div style="max-height:220px;overflow-y:auto;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.7;color:var(--gray-800)">${renderRichQuestionContentHTML(r.content_blocks,r.content_text||"")}</div>
    </div>`:""}
    ${c?`
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:6px">\u{1F4DD} \u0110\xE1p \xE1n</div>
    <div class="preview-q-list">${c}${d?`<p style="color:var(--gray-400);font-size:12px;margin-top:8px">...v\xE0 ${i.length-20} c\xE2u n\u1EEFa</p>`:""}</div>`:""}
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">\u0110\xF3ng</button>
      <button class="btn btn-primary" onclick="closeModal();navigate('/questions/${t}')">Ch\u1EC9nh s\u1EEDa</button>
    </div>`,o=r=>{const c=Array.isArray(r.questions_data)?r.questions_data:[];return c.length===0?{qRows:"",hasMore:!1}:{qRows:c.slice(0,20).map(u=>`
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
      </div>`).join(""),hasMore:c.length>20}};if(e.skill==="composite"){openModal(escapeHtml(e.title),'<div style="color:var(--gray-400)">\u0110ang t\u1EA3i...</div>');try{const r=await api.get(`/questions/${t}`);Object.assign(e,r);const c=document.getElementById("modal-body");c&&(c.innerHTML=n(r))}catch{}return}const{qRows:a,hasMore:l}=o(e);if(openModal(escapeHtml(e.title),s(e,a,l)),!e.content_text&&(e.skill==="reading"||e.skill==="listening"||e.skill==="writing"||e.skill==="speaking"))try{const r=await api.get(`/questions/${t}`);Object.assign(e,r);const c=document.getElementById("modal-body");if(c){const{qRows:d,hasMore:u}=o(r);c.innerHTML=s(r,d,u)}}catch{}}window.previewQuestion=previewQuestion;function setSkillFilter(t){_currentSkillFilter=t,renderQuestions()}async function deleteQuestion(t,e){if(await confirmAction({title:"Xo\xE1 \u0111\u1EC1 kh\u1ECFi kho",message:"N\u1EBFu \u0111\u1EC1 \u0111ang \u0111\u01B0\u1EE3c d\xF9ng trong b\xE0i t\u1EADp, h\u1EC7 th\u1ED1ng s\u1EBD ch\u1EB7n thao t\xE1c n\xE0y.",confirmText:"Xo\xE1 \u0111\u1EC1",danger:!0})){btnLoading(e);try{await api.delete(`/questions/${t}`),toast("\u0110\xE3 xo\xE1 \u0111\u1EC1"),showQuestions()}catch(i){btnReset(e),toast("L\u1ED7i xo\xE1: "+(i.error||i.message),"error")}}}let _contentBlocks=[],_contentBlockSeq=1,_contentImageUploadCount=0,_composerSavedRange=null,_composerCollapsed=!1;function nextContentBlockId(){return`cb-${_contentBlockSeq++}`}function createTextBlock(t=""){return{id:nextContentBlockId(),type:"text",html:t}}function createImageBlock(t="",e="",n=100){return{id:nextContentBlockId(),type:"image",url:t,alt:e,width:n}}function repairImageTokensInBlocks(t){const e=[];for(const s of t){let l=function(){const c=a.innerHTML.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi,"").trim();c&&e.push({id:nextContentBlockId(),type:"text",html:c}),a=document.createElement("div")},r=function(c){c.nodeType===Node.ELEMENT_NODE&&c.classList?.contains("document-editor-image-token")?(l(),e.push({id:c.dataset.blockId||nextContentBlockId(),type:"image",url:c.dataset.url||"",alt:c.dataset.alt||"",width:Math.max(1,Number(c.dataset.width)||100)})):c.nodeType===Node.ELEMENT_NODE&&c.querySelector?.(".document-editor-image-token")?c.childNodes.forEach(d=>r(d)):a.appendChild(c.cloneNode(!0))};var n=l,i=r;if(s.type!=="text"||!s.html?.includes("document-editor-image-token")){e.push(s);continue}const o=document.createElement("div");o.innerHTML=s.html;let a=document.createElement("div");o.childNodes.forEach(c=>r(c)),l()}return e}function normalizeContentBlocksForEditor(t,e=""){const i=repairImageTokensInBlocks(Array.isArray(t)?t:[]).map(s=>{if(s?.type==="image"&&s?.url)return{id:s.id||nextContentBlockId(),type:"image",url:s.url,alt:s.alt||"",width:Number(s.width)||100};const o=normalizeIndentMarkupHtml(s?.html??(s?.text?textToEditorHtml(s.text):"")),a=(()=>{const l=document.createElement("div");return l.innerHTML=o,l.textContent||""})();return{id:s?.id||nextContentBlockId(),type:"text",html:o,text:a}}).filter(Boolean);return i.length>0?i:[createTextBlock(escapeHtml(e||""))]}function blocksToPlainText(t=_contentBlocks){return(t||[]).filter(e=>e.type==="text").map(e=>{if(e.html){const n=document.createElement("div");return n.innerHTML=e.html,(n.textContent||"").trim()}return String(e.text||"").trim()}).filter(Boolean).join(`

`).trim()}function renderRichQuestionContentHTML(t,e="",n=""){const i=normalizeContentBlocksForEditor(t,e);return(!Array.isArray(t)||t.length===0)&&e?`<div class="mixed-content ${n}"><div class="mixed-content-text">${escapeHtml(e)}</div></div>`:`
    <div class="mixed-content ${n}">
      ${i.map(s=>s.type==="image"?`<figure class="mixed-content-image-wrap" data-block-id="${escapeHtml(s.id)}" style="width:${Math.max(1,Number(s.width)||100)}%"><img class="mixed-content-image" src="${escapeHtml(s.url)}" alt="${escapeHtml(s.alt||"Question image")}" /></figure>`:`<div class="mixed-content-text" data-block-id="${escapeHtml(s.id)}">${sanitizeBlockHtml(s.html??"")||escapeHtml(s.text||"")}</div>`).join("")}
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
    </div>`}function setComposerStatus(t,e=""){const n=document.getElementById("content-composer-status");n&&(n.className=`content-composer-status${e?` is-${e}`:""}`,n.textContent=t)}const EDITOR_INDENT_NBSP_COUNT=4,EDITOR_INDENT_BLOCK_TAGS=new Set(["DIV","P","LI","H1","H2","H3","H4","H5","H6","BLOCKQUOTE","PRE"]);function createEditorIndentHtml(t=1){const e=Math.max(1,Number(t)||1);return Array.from({length:e},()=>'<span class="document-editor-indent" contenteditable="false" data-indent="1">&nbsp;</span>').join("")}function extractLeadingIndentInfo(t=""){let e=0,n=0,i=0;for(;n<t.length;){const s=t[n];if(s==="	"){if(i)break;e+=1,n+=1;continue}if(s===" "||s==="\xA0"){i+=1,n+=1,i===EDITOR_INDENT_NBSP_COUNT&&(e+=1,i=0);continue}break}return n-=i,{units:e,consumedChars:n}}function normalizeLeadingIndentTextNodes(t){if(!t?.childNodes)return!0;let e=!0;return Array.from(t.childNodes).forEach(n=>{if(n.nodeType===Node.TEXT_NODE){const i=String(n.textContent||"");if(e&&i){const{units:s,consumedChars:o}=extractLeadingIndentInfo(i);if(s>0){const a=document.createDocumentFragment(),l=document.createRange().createContextualFragment(createEditorIndentHtml(s));a.appendChild(l);const r=i.slice(o);r&&a.appendChild(document.createTextNode(r)),n.replaceWith(a),e=!r||!/[^\s\u00a0]/.test(r);return}}/[^\s\u00a0]/.test(i)&&(e=!1);return}if(n.nodeType===Node.ELEMENT_NODE){if(n.tagName==="BR"){e=!0;return}if(!n.classList.contains("document-editor-indent")){if(EDITOR_INDENT_BLOCK_TAGS.has(n.tagName)){normalizeLeadingIndentTextNodes(n),e=!0;return}e=normalizeLeadingIndentTextNodes(n)}}}),e}function normalizeIndentTokensInElement(t){t?.querySelectorAll&&(t.querySelectorAll("span").forEach(e=>{const n=String(e.textContent||"").replace(/ /g,"").replace(/\n/g,""),i=n&&/^[\u00a0\t]+$/.test(n),s=/display\s*:\s*inline-block/i.test(e.getAttribute("style")||"");if(!(e.classList.contains("document-editor-indent")||s&&i))return;const a=Math.max(1,Math.round(n.length/EDITOR_INDENT_NBSP_COUNT)||1),l=document.createRange().createContextualFragment(createEditorIndentHtml(a));e.replaceWith(l)}),normalizeLeadingIndentTextNodes(t))}function normalizeIndentMarkupHtml(t=""){if(!t)return"";const e=document.createElement("div");return e.innerHTML=String(t),normalizeIndentTokensInElement(e),e.innerHTML}function textToEditorHtml(t=""){const e=String(t||"").replace(/\r/g,"");return e?escapeHtml(e).replace(/\n/g,"<br>"):""}function createEditorImageHtml(t){const e=Math.max(1,Number(t.width)||100);return`<figure class="document-editor-image-token" contenteditable="false" data-block-id="${escapeHtml(t.id)}" data-url="${escapeHtml(t.url)}" data-alt="${escapeHtml(t.alt||"")}" data-width="${e}" style="width:${e}%"><img class="document-editor-image-preview" src="${escapeHtml(t.url)}" alt="${escapeHtml(t.alt||"image")}" draggable="false" /><button type="button" class="document-editor-image-remove" title="Xo\xE1 \u1EA3nh" aria-label="Xo\xE1 \u1EA3nh">\xD7</button><button type="button" class="document-editor-image-resize" title="K\xE9o \u0111\u1EC3 \u0111\u1ED5i k\xEDch th\u01B0\u1EDBc" aria-label="Resize"></button></figure>`}function buildEditorDocumentHtml(t,e=""){const n=normalizeContentBlocksForEditor(t,e);let i="";for(const s of n)s.type==="text"?i+=s.html!==void 0?s.html:textToEditorHtml(s.text||""):s.type==="image"&&s.url&&(i+=createEditorImageHtml(s));return i}function normalizeEditorExtractedText(t=""){return String(t||"").replace(/ /g," ").replace(/​/g,"").replace(/\r/g,"").replace(/^\n+|\n+$/g,"")}function syncContentBlocksFromEditor(){const t=document.getElementById("content-composer-host");if(!t)return;const e=[];let n=document.createElement("div");function i(){const o=n.cloneNode(!0);normalizeIndentTokensInElement(o),o.querySelectorAll(".editor-table-wrap").forEach(l=>{const r=l.querySelector(".editor-table");r?(r.style.width=l.style.width||"100%",l.replaceWith(r.cloneNode(!0))):l.remove()}),o.querySelectorAll(".editor-table-resize-handle, .tbl-col-resize-handle, .tbl-row-resize-handle").forEach(l=>l.remove());const a=o.innerHTML.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi,"").trim();a&&e.push({id:nextContentBlockId(),type:"text",html:a}),n=document.createElement("div")}function s(o){o.nodeType===Node.ELEMENT_NODE&&o.classList?.contains("document-editor-image-token")?(i(),e.push({id:o.dataset.blockId||nextContentBlockId(),type:"image",url:o.dataset.url||"",alt:o.dataset.alt||"",width:Math.max(1,Number(o.dataset.width)||100)})):o.nodeType===Node.ELEMENT_NODE&&o.querySelector?.(".document-editor-image-token")?o.childNodes.forEach(a=>s(a)):n.appendChild(o.cloneNode(!0))}t.childNodes.forEach(o=>s(o)),i(),_contentBlocks=e.length?e:[createTextBlock("")],refreshContentComposerPreview(),scheduleQuestionDraftSave()}function saveComposerRange(){const t=window.getSelection();if(!t?.rangeCount)return;const e=document.getElementById("content-composer-host"),n=t.getRangeAt(0);e?.contains(n.commonAncestorContainer)&&(_composerSavedRange=n.cloneRange())}function insertImageAtSavedRange(t){const e=document.getElementById("content-composer-host");if(!e)return;const i=document.createRange().createContextualFragment(createEditorImageHtml(t)).firstElementChild,s=_composerSavedRange;if(s&&e.contains(s.commonAncestorContainer)){s.deleteContents(),s.insertNode(i),i.nextSibling||e.appendChild(document.createTextNode(""));const o=window.getSelection(),a=document.createRange();a.setStartAfter(i),a.collapse(!0),o?.removeAllRanges(),o?.addRange(a)}else e.appendChild(i),i.nextSibling||e.appendChild(document.createTextNode(""));_composerSavedRange=null,bindImageEditorEvents(e),syncContentBlocksFromEditor()}function bindTableEditorEvents(t){t.querySelectorAll(".editor-table").forEach(e=>{if(e.closest(".editor-table-wrap"))return;const n=document.createElement("div");n.className="editor-table-wrap",n.style.width=e.style.width||"100%",e.style.width="100%",e.parentNode.insertBefore(n,e),n.appendChild(e);const i=document.createElement("button");i.type="button",i.className="editor-table-resize-handle",i.contentEditable="false",i.title="K\xE9o \u0111\u1EC3 \u0111\u1ED5i k\xEDch th\u01B0\u1EDBc b\u1EA3ng",i.innerHTML='<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 9L9 2M5 9L9 5M8 9L9 8" stroke="#475569" stroke-width="1.6" stroke-linecap="round"/></svg>',n.appendChild(i),i.onpointerdown=s=>{s.preventDefault(),s.stopPropagation();const o=t.clientWidth||1,a=s.clientX,l=n.getBoundingClientRect().width;n.classList.add("resizing"),document.body.classList.add("resizing-image");const r=d=>{const u=Math.max(60,l+(d.clientX-a)),m=Math.max(10,Math.min(100,Math.round(u/o*100)));n.style.width=m+"%",setComposerStatus(`\u0110\u1ED9 r\u1ED9ng b\u1EA3ng: ${m}%`,"loading")},c=()=>{document.removeEventListener("pointermove",r),document.removeEventListener("pointerup",c),n.classList.remove("resizing"),document.body.classList.remove("resizing-image"),syncContentBlocksFromEditor(),setComposerStatus("\u0110\xE3 c\u1EADp nh\u1EADt k\xEDch th\u01B0\u1EDBc b\u1EA3ng.","success")};document.addEventListener("pointermove",r),document.addEventListener("pointerup",c,{once:!0})},injectTableResizeHandles(e),e.addEventListener("mousedown",s=>{const o=s.target.closest("td,th");!o||!e.contains(o)||(s.shiftKey&&_activeTableCell&&_activeTableCell.closest("table")===e?(s.preventDefault(),selectTableCellRange(e,_activeTableCell,o),showTableFloatToolbar(e)):s.shiftKey||clearTableCellSelection())})})}function bindImageEditorEvents(t){t.querySelectorAll(".document-editor-image-token").forEach(e=>{const n=e.querySelector(".document-editor-image-remove");n&&!n._bound&&(n._bound=!0,n.addEventListener("mousedown",s=>{s.preventDefault(),s.stopPropagation()}),n.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),e.remove(),syncContentBlocksFromEditor(),setComposerStatus("\u0110\xE3 xo\xE1 \u1EA3nh kh\u1ECFi n\u1ED9i dung.","success")}));const i=e.querySelector(".document-editor-image-resize");i&&!i._bound&&(i._bound=!0,i.onpointerdown=s=>{s.preventDefault(),s.stopPropagation();const o=t.clientWidth||1,a=s.clientX,l=e.getBoundingClientRect().width;document.body.classList.add("resizing-image");const r=d=>{const u=Math.max(40,l+(d.clientX-a)),m=Math.max(5,Math.min(100,Math.round(u/o*100)));e.style.width=m+"%",e.dataset.width=String(m);const h=_contentBlocks.find(g=>g.id===e.dataset.blockId&&g.type==="image");h&&(h.width=m),setComposerStatus(`\u0110\u1ED9 r\u1ED9ng \u1EA3nh: ${m}%`,"loading")},c=()=>{document.removeEventListener("pointermove",r),document.removeEventListener("pointerup",c),document.body.classList.remove("resizing-image"),syncContentBlocksFromEditor(),setComposerStatus("\u0110\xE3 c\u1EADp nh\u1EADt k\xEDch th\u01B0\u1EDBc \u1EA3nh.","success")};document.addEventListener("pointermove",r),document.addEventListener("pointerup",c,{once:!0})})})}function refreshContentComposerPreview(){const t=renderRichQuestionContentHTML(_contentBlocks),e=document.getElementById("content-composer-preview-body");e&&(e.innerHTML=t);const n=document.getElementById("preview-sticky-float-body");n&&(n.innerHTML=t)}let _stickyPreviewObserver=null,_stickyPreviewDismissed=!1;function initStickyPreview(){_stickyPreviewObserver&&(_stickyPreviewObserver.disconnect(),_stickyPreviewObserver=null),_stickyPreviewDismissed=!1;let t=document.getElementById("preview-sticky-float");t||(t=document.createElement("div"),t.id="preview-sticky-float",t.className="preview-sticky-float",document.body.appendChild(t)),t.innerHTML=`
    <div class="preview-sticky-float-header">
      <span class="content-composer-preview-title" style="margin:0">Xem tr\u01B0\u1EDBc n\u1ED9i dung</span>
      <button class="preview-sticky-close" onclick="dismissStickyPreview()" title="\u1EA8n" aria-label="\u1EA8n xem tr\u01B0\u1EDBc">\u2715</button>
    </div>
    <div id="preview-sticky-float-body" class="content-composer-preview-body"></div>`;const e=document.getElementById("content-composer-preview-body"),n=document.getElementById("preview-sticky-float-body");e&&n&&(n.innerHTML=e.innerHTML);let i=document.getElementById("preview-sticky-toggle");i||(i=document.createElement("button"),i.id="preview-sticky-toggle",i.className="preview-sticky-toggle",i.title="Xem tr\u01B0\u1EDBc n\u1ED9i dung",i.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',i.onclick=()=>{_stickyPreviewDismissed=!1,updateStickyPreviewVisibility()},document.body.appendChild(i));const s=document.querySelector(".content-composer-preview");if(!s)return;const o=a=>{t.classList.toggle("is-visible",a&&!_stickyPreviewDismissed),i.classList.toggle("is-visible",a&&_stickyPreviewDismissed),a||(_stickyPreviewDismissed=!1)};window._updateStickyPreviewVisibility=o,_stickyPreviewObserver=new IntersectionObserver(([a])=>{o(!a.isIntersecting&&a.boundingClientRect.top<0)},{threshold:0}),_stickyPreviewObserver.observe(s)}function updateStickyPreviewVisibility(){if(window._updateStickyPreviewVisibility){const t=document.querySelector(".content-composer-preview");if(!t)return;const e=t.getBoundingClientRect();window._updateStickyPreviewVisibility(!t.checkVisibility?.()||e.bottom<0)}}function dismissStickyPreview(){_stickyPreviewDismissed=!0,document.getElementById("preview-sticky-float")?.classList.remove("is-visible"),document.getElementById("preview-sticky-toggle")?.classList.add("is-visible")}window.dismissStickyPreview=dismissStickyPreview;function applyComposerCollapsedState(){const t=document.getElementById("content-composer-editor-panel"),e=document.getElementById("content-composer-toggle");t&&t.classList.toggle("collapsed",_composerCollapsed),e&&(e.textContent=_composerCollapsed?"M\u1EDF editor":"Thu g\u1ECDn editor")}function toggleComposerEditor(t){_composerCollapsed=typeof t=="boolean"?t:!_composerCollapsed,applyComposerCollapsedState()}function renderContentComposer(){const t=document.getElementById("content-composer-host");if(!t)return;t.innerHTML=buildEditorDocumentHtml(_contentBlocks),normalizeIndentTokensInElement(t),t.onkeydown=n=>{if(n.key==="Tab"){n.preventDefault(),document.execCommand("insertHTML",!1,createEditorIndentHtml(1)),syncContentBlocksFromEditor();return}if(n.key!=="Enter")return;const i=window.getSelection()?.getRangeAt(0)?.commonAncestorContainer;if((i?.nodeType===3?i.parentElement:i)?.closest("td,th"))return;n.preventDefault();const o=window.getSelection();if(!o?.rangeCount)return;const l=o.getRangeAt(0).cloneRange();l.setEnd(t,t.childNodes.length);const r=l.toString().trim().length>0||l.cloneContents().querySelector("img,table")!==null,c="__br_cursor__";document.execCommand("insertHTML",!1,r?`<br><span id="${c}"></span>`:`<br><span id="${c}"></span><br>`);const d=document.getElementById(c);if(d){const u=d.parentNode,m=Array.from(u.childNodes).indexOf(d);d.remove();const h=document.createRange();h.setStart(u,m),h.collapse(!0),o.removeAllRanges(),o.addRange(h)}syncContentBlocksFromEditor()},t.oninput=()=>{syncContentBlocksFromEditor(),saveComposerRange()},t.onmouseup=saveComposerRange,t.onkeyup=saveComposerRange,t.onpaste=handleComposerPaste;const e=document.getElementById("content-image-file-input");e&&(e.onchange=onComposerImageSelected),bindImageEditorEvents(t),bindTableEditorEvents(t),bindFormatToolbarStateUpdater(),refreshContentComposerPreview()}let _formatSelListenerBound=!1,_activeTableCell=null,_selectedTableCells=[];function bindFormatToolbarStateUpdater(){_formatSelListenerBound||(_formatSelListenerBound=!0,document.addEventListener("selectionchange",()=>{const t=document.getElementById("content-composer-host");if(!t)return;const e=window.getSelection();e?.rangeCount&&t.contains(e.getRangeAt(0).commonAncestorContainer)&&updateFormatToolbarState()}))}function updateFormatToolbarState(){const t=document.getElementById("fmt-bold"),e=document.getElementById("fmt-italic"),n=document.getElementById("fmt-underline");t&&t.classList.toggle("is-active",document.queryCommandState("bold")),e&&e.classList.toggle("is-active",document.queryCommandState("italic")),n&&n.classList.toggle("is-active",document.queryCommandState("underline")),["Left","Center","Right"].forEach(a=>{const l=document.getElementById(`fmt-align-${a.toLowerCase()}`);l&&l.classList.toggle("is-active",document.queryCommandState(`justify${a}`))});const i=document.getElementById("content-composer-host"),s=document.getElementById("fmt-align-justify");s&&i&&s.classList.toggle("is-active",document.queryCommandState("justifyFull")||i.style.textAlign==="justify");const o=window.getSelection();if(o?.rangeCount){const a=o.getRangeAt(0).commonAncestorContainer;_activeTableCell=(a.nodeType===3?a.parentElement:a)?.closest?.("td,th")||null}else _activeTableCell=null;_activeTableCell?showTableFloatToolbar(_activeTableCell.closest("table")):(clearTableCellSelection(),hideTableFloatToolbar())}function applyFormat(t){document.execCommand(t),syncContentBlocksFromEditor()}function applyJustify(){const t=document.getElementById("content-composer-host");if(!t)return;normalizeIndentTokensInElement(t);const n=document.queryCommandState("justifyFull")||t.style.textAlign==="justify"?"":"justify";t.style.textAlign=n,t.querySelectorAll("div, p, h1, h2, h3, h4, h5, h6").forEach(i=>{i.style.textAlign=n}),updateFormatToolbarState(),syncContentBlocksFromEditor()}window.applyJustify=applyJustify;function applyFormatFontSize(t){const e=document.getElementById("fmt-fontsize");if(!t)return;const n=document.getElementById("content-composer-host");if(!n)return;if(_composerSavedRange){const r=window.getSelection();r.removeAllRanges(),r.addRange(_composerSavedRange)}const i=window.getSelection();if(!i?.rangeCount||i.isCollapsed){e&&(e.value="");return}const s=i.getRangeAt(0),o=s.extractContents();o.querySelectorAll("[style]").forEach(r=>{r.style.fontSize="",r.getAttribute("style").trim()||r.removeAttribute("style")});const a=document.createElement("span");a.style.fontSize=t+"px",a.appendChild(o),s.insertNode(a);const l=document.createRange();l.selectNodeContents(a),i.removeAllRanges(),i.addRange(l),e&&(e.value=""),n.focus(),syncContentBlocksFromEditor()}function toggleColorPalette(){const t=document.getElementById("fmt-color-palette");if(!t)return;if(t.style.display!=="none"){t.style.display="none";return}t.style.display="block";const n=i=>{!t.contains(i.target)&&i.target.id!=="fmt-color-btn"&&(t.style.display="none",document.removeEventListener("mousedown",n))};setTimeout(()=>document.addEventListener("mousedown",n),0)}function closeColorPalette(){const t=document.getElementById("fmt-color-palette");t&&(t.style.display="none")}function ensureTableFloatToolbar(){if(document.getElementById("editor-table-float-toolbar"))return;const t=document.createElement("div");t.id="editor-table-float-toolbar",t.className="editor-table-float-toolbar";const e=(n,i,s,o,a)=>`<button${a?` id="${a}"`:""} class="tft-btn${s?" tft-danger":""}" title="${n}" onmousedown="event.preventDefault()" onclick="${i}"><svg width="15" height="15" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">${o}</svg></button>`;t.innerHTML=e("Th\xEAm h\xE0ng ph\xEDa tr\xEAn","tableAddRowAbove()",!1,'<rect x="1" y="6" width="12" height="7" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M7 1v4M5 3h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("Th\xEAm h\xE0ng ph\xEDa d\u01B0\u1EDBi","tableAddRowBelow()",!1,'<rect x="1" y="1" width="12" height="7" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M7 13v-4M5 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("X\xF3a h\xE0ng hi\u1EC7n t\u1EA1i","tableDeleteRow()",!0,'<rect x="1" y="4" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M4 7h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+'<div class="tft-sep"></div>'+e("Th\xEAm c\u1ED9t b\xEAn tr\xE1i","tableAddColLeft()",!1,'<rect x="5" y="1" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M1 7h3M2 5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("Th\xEAm c\u1ED9t b\xEAn ph\u1EA3i","tableAddColRight()",!1,'<rect x="1" y="1" width="8" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M13 7h-3M12 5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+e("X\xF3a c\u1ED9t hi\u1EC7n t\u1EA1i","tableDeleteCol()",!0,'<rect x="4" y="1" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M6 7h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>')+'<div class="tft-sep" id="tft-merge-sep" style="display:none"></div>'+e("G\u1ED9p \xF4 \u0111\xE3 ch\u1ECDn (Shift+click \u0111\u1EC3 ch\u1ECDn nhi\u1EC1u \xF4)","tableMergeCells()",!1,'<rect x="1" y="1" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="1" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="8" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="8" width="5" height="5" rx=".8" stroke="currentColor" stroke-width="1.3"/><path d="M5 5L9 9M9 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',"tft-merge-btn")+e("T\xE1ch \xF4","tableSplitCell()",!1,'<rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',"tft-split-btn")+'<div class="tft-sep"></div>'+e("Ki\u1EC3u vi\u1EC1n b\u1EA3ng","toggleTableBorderPicker()",!1,'<rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v12M9 1v12M1 5h12M1 9h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',"tft-border-btn"),document.body.appendChild(t)}function showTableFloatToolbar(t){ensureTableFloatToolbar();const e=document.getElementById("editor-table-float-toolbar"),i=(t.closest(".editor-table-wrap")||t).getBoundingClientRect();e.style.left=i.left+"px",e.style.top=i.top-44+window.scrollY+"px",e.style.position="absolute",e.style.display="flex";const s=document.getElementById("tft-merge-btn"),o=document.getElementById("tft-split-btn"),a=document.getElementById("tft-merge-sep"),l=_selectedTableCells.length>1,r=_selectedTableCells.length<=1&&_activeTableCell&&((_activeTableCell.colSpan||1)>1||(_activeTableCell.rowSpan||1)>1);s&&(s.style.display=l?"":"none"),o&&(o.style.display=r?"":"none"),a&&(a.style.display=l||r?"":"none")}function hideTableFloatToolbar(){const t=document.getElementById("editor-table-float-toolbar");t&&(t.style.display="none")}function toggleTablePicker(){const t=document.getElementById("fmt-table-picker");if(!t)return;if(t.style.display!=="none"){t.style.display="none";return}const e=document.getElementById("fmt-table-grid");if(e&&!e.children.length){for(let i=1;i<=5;i++)for(let s=1;s<=6;s++){const o=document.createElement("div");o.className="fmt-table-cell",o.dataset.row=i,o.dataset.col=s,o.onmouseover=()=>highlightTableGrid(i,s),o.onclick=()=>{insertTable(i,s),closeTablePicker()},e.appendChild(o)}e.onmouseleave=()=>{e.querySelectorAll(".fmt-table-cell").forEach(s=>s.classList.remove("is-selected"));const i=document.getElementById("fmt-table-size-label");i&&(i.textContent="Ch\u1ECDn k\xEDch th\u01B0\u1EDBc b\u1EA3ng")}}t.style.display="block";const n=i=>{!t.contains(i.target)&&i.target.id!=="fmt-table-btn"&&(t.style.display="none",document.removeEventListener("mousedown",n))};setTimeout(()=>document.addEventListener("mousedown",n),0)}function closeTablePicker(){const t=document.getElementById("fmt-table-picker");t&&(t.style.display="none")}function highlightTableGrid(t,e){const n=document.getElementById("fmt-table-grid"),i=document.getElementById("fmt-table-size-label");n&&(n.querySelectorAll(".fmt-table-cell").forEach(s=>{s.classList.toggle("is-selected",Number(s.dataset.row)<=t&&Number(s.dataset.col)<=e)}),i&&(i.textContent=`${t} \xD7 ${e} b\u1EA3ng`))}function insertTable(t,e){const n=document.getElementById("content-composer-host");if(!n)return;if(_composerSavedRange){const o=window.getSelection();o.removeAllRanges(),o.addRange(_composerSavedRange)}const i=Math.floor(100/e);let s='<table class="editor-table" style="width:100%"><tbody>';for(let o=0;o<t;o++){s+="<tr>";for(let a=0;a<e;a++)s+=`<td style="width:${i}%"><br></td>`;s+="</tr>"}s+="</tbody></table><br>",document.execCommand("insertHTML",!1,s),_composerSavedRange=null,bindTableEditorEvents(n),syncContentBlocksFromEditor()}function getTableColCount(t){let e=0;return t.querySelectorAll("tr").forEach(n=>{let i=0;n.querySelectorAll("td,th").forEach(s=>{i+=s.colSpan||1}),i>e&&(e=i)}),e}function injectTableResizeHandles(t){t.querySelectorAll(".tbl-col-resize-handle, .tbl-row-resize-handle").forEach(s=>s.remove());const e=getTableColCount(t);let n=t.querySelector("colgroup");if(!n){n=document.createElement("colgroup");const s=t.querySelector("tr"),o=s?Array.from(s.querySelectorAll("td,th")):[],a=o.length===e&&o.every(l=>l.style.width);for(let l=0;l<e;l++){const r=document.createElement("col");if(a)r.style.width=o[l].style.width;else{const c=Math.floor(100/e);r.style.width=(l===e-1?100-c*(e-1):c)+"%"}n.appendChild(r)}t.prepend(n)}const i=Array.from(n.querySelectorAll("col"));t.querySelectorAll("tr").forEach(s=>{const o=Array.from(s.querySelectorAll("td,th"));let a=0;o.forEach((l,r)=>{const c=l.colSpan||1;if(!(r===o.length-1)){const u=a+c-1,m=document.createElement("div");m.className="tbl-col-resize-handle",m.onpointerdown=h=>{if(h.preventDefault(),h.stopPropagation(),u+1>=i.length)return;const g=t.getBoundingClientRect().width||1,b=h.clientX,S=i[u],y=i[u+1],L=parseFloat(S.style.width)||100/e,E=parseFloat(y.style.width)||100/e;m.classList.add("is-dragging"),document.body.style.cursor="col-resize";const I=H=>{const F=(H.clientX-b)/g*100;S.style.width=Math.max(3,L+F)+"%",y.style.width=Math.max(3,E-F)+"%"},N=()=>{m.classList.remove("is-dragging"),document.body.style.cursor="",document.removeEventListener("pointermove",I),document.removeEventListener("pointerup",N),syncContentBlocksFromEditor()};document.addEventListener("pointermove",I),document.addEventListener("pointerup",N,{once:!0})},l.appendChild(m)}if(r===0){const u=document.createElement("div");u.className="tbl-row-resize-handle",u.onpointerdown=m=>{m.preventDefault(),m.stopPropagation();const h=m.clientY,g=s.getBoundingClientRect().height;u.classList.add("is-dragging"),document.body.style.cursor="row-resize";const b=y=>{s.style.height=Math.max(24,g+(y.clientY-h))+"px"},S=()=>{u.classList.remove("is-dragging"),document.body.style.cursor="",document.removeEventListener("pointermove",b),document.removeEventListener("pointerup",S),syncContentBlocksFromEditor()};document.addEventListener("pointermove",b),document.addEventListener("pointerup",S,{once:!0})},l.appendChild(u)}a+=c})})}function tableAddRowAbove(){if(!_activeTableCell)return;const t=_activeTableCell.closest("tr");if(!t)return;const e=t.closest("table"),n=getTableColCount(e),i=document.createElement("tr");for(let s=0;s<n;s++){const o=document.createElement("td");o.innerHTML="<br>",i.appendChild(o)}t.parentNode.insertBefore(i,t),syncContentBlocksFromEditor(),injectTableResizeHandles(e)}function tableAddRowBelow(){if(!_activeTableCell)return;const t=_activeTableCell.closest("tr");if(!t)return;const e=t.closest("table"),n=getTableColCount(e),i=document.createElement("tr");for(let s=0;s<n;s++){const o=document.createElement("td");o.innerHTML="<br>",i.appendChild(o)}t.parentNode.insertBefore(i,t.nextSibling),syncContentBlocksFromEditor(),injectTableResizeHandles(e)}function tableDeleteRow(){if(!_activeTableCell)return;const t=_activeTableCell.closest("tr");if(!t)return;const e=t.closest("table");t.remove(),e&&!e.querySelectorAll("tr").length?e.remove():e&&injectTableResizeHandles(e),_activeTableCell=null,hideTableFloatToolbar(),syncContentBlocksFromEditor()}function tableAddColLeft(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const e=_activeTableCell.closest("tr"),n=Array.from(e.querySelectorAll("td,th")).indexOf(_activeTableCell);t.querySelectorAll("tr").forEach(s=>{const a=s.querySelectorAll("td,th")[n];if(!a)return;const l=document.createElement("td");l.innerHTML="<br>",s.insertBefore(l,a)});const i=t.querySelector("colgroup");if(i){const s=document.createElement("col");s.style.width="10%",i.insertBefore(s,i.children[n]),redistributeColWidths(i)}syncContentBlocksFromEditor(),injectTableResizeHandles(t)}function tableAddColRight(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const e=_activeTableCell.closest("tr"),n=Array.from(e.querySelectorAll("td,th")).indexOf(_activeTableCell);t.querySelectorAll("tr").forEach(s=>{const a=s.querySelectorAll("td,th")[n];if(!a)return;const l=document.createElement("td");l.innerHTML="<br>",s.insertBefore(l,a.nextSibling)});const i=t.querySelector("colgroup");if(i){const s=document.createElement("col");s.style.width="10%",i.insertBefore(s,i.children[n+1]||null),redistributeColWidths(i)}syncContentBlocksFromEditor(),injectTableResizeHandles(t)}function tableDeleteCol(){if(!_activeTableCell)return;const t=_activeTableCell.closest("table");if(!t)return;const e=_activeTableCell.closest("tr"),n=Array.from(e.querySelectorAll("td,th")).indexOf(_activeTableCell);t.querySelectorAll("tr").forEach(s=>{const o=s.querySelectorAll("td,th");o[n]&&o[n].remove()});const i=t.querySelector("colgroup");i&&i.children[n]&&(i.children[n].remove(),redistributeColWidths(i)),_activeTableCell=null,hideTableFloatToolbar(),syncContentBlocksFromEditor(),injectTableResizeHandles(t)}function redistributeColWidths(t){const e=Array.from(t.querySelectorAll("col"));if(!e.length)return;const i=100/(e.reduce((s,o)=>s+(parseFloat(o.style.width)||0),0)||100);e.forEach(s=>{s.style.width=((parseFloat(s.style.width)||0)*i).toFixed(2)+"%"})}function clearTableCellSelection(){_selectedTableCells.forEach(t=>t.classList.remove("is-td-selected")),_selectedTableCells=[]}function selectTableCellRange(t,e,n){const i=Array.from(t.querySelectorAll("tr"));function s(u){const m=u.parentElement,h=i.indexOf(m),g=Array.from(m.querySelectorAll("td,th"));return{row:h,col:g.indexOf(u)}}const o=s(e),a=s(n);if(o.row<0||a.row<0||o.col<0||a.col<0)return;const l=Math.min(o.row,a.row),r=Math.max(o.row,a.row),c=Math.min(o.col,a.col),d=Math.max(o.col,a.col);document.querySelectorAll(".editor-table .is-td-selected").forEach(u=>u.classList.remove("is-td-selected")),_selectedTableCells=[];for(let u=l;u<=r;u++){const m=Array.from(i[u].querySelectorAll("td,th"));for(let h=c;h<=d;h++)m[h]&&(m[h].classList.add("is-td-selected"),_selectedTableCells.push(m[h]))}}function tableMergeCells(){if(_selectedTableCells.length<2)return;const t=_selectedTableCells[0].closest("table");if(!t)return;const e=Array.from(t.querySelectorAll("tr")),n=_selectedTableCells.map(c=>{const d=c.parentElement,u=e.indexOf(d),m=Array.from(d.querySelectorAll("td,th")).indexOf(c);return{cell:c,rowIdx:u,colIdx:m}}),i=Math.min(...n.map(c=>c.rowIdx)),s=Math.max(...n.map(c=>c.rowIdx)),o=Math.min(...n.map(c=>c.colIdx)),a=Math.max(...n.map(c=>c.colIdx)),l=Array.from(e[i].querySelectorAll("td,th"))[o];if(!l)return;const r=_selectedTableCells.map(c=>c.innerHTML.replace(/^(<br\s*\/?>|\s)+|(<br\s*\/?>|\s)+$/gi,"").trim()).filter(c=>c&&c!=="<br>");l.colSpan=a-o+1,l.rowSpan=s-i+1,l.innerHTML=r.join(" ")||"<br>",_selectedTableCells.forEach(c=>{c!==l&&c.remove()}),clearTableCellSelection(),_activeTableCell=l,syncContentBlocksFromEditor(),injectTableResizeHandles(t),showTableFloatToolbar(t)}function tableSplitCell(){const t=_activeTableCell;if(!t)return;const e=t.colSpan||1,n=t.rowSpan||1;if(e===1&&n===1)return;const i=t.closest("table"),s=Array.from(i.querySelectorAll("tr")),o=t.parentElement,a=s.indexOf(o),l=Array.from(o.querySelectorAll("td,th")).indexOf(t),r=t.style.border||"";t.colSpan=1,t.rowSpan=1;for(let c=1;c<e;c++){const d=document.createElement("td");d.innerHTML="<br>",r&&(d.style.border=r),o.insertBefore(d,t.nextSibling)}for(let c=1;c<n;c++){const d=s[a+c];if(!d)continue;const m=Array.from(d.querySelectorAll("td,th"))[l]||null;for(let h=0;h<e;h++){const g=document.createElement("td");g.innerHTML="<br>",r&&(g.style.border=r),d.insertBefore(g,m)}}syncContentBlocksFromEditor(),injectTableResizeHandles(i),showTableFloatToolbar(i)}function toggleTableBorderPicker(){let t=document.getElementById("editor-table-border-picker");if(t&&t.style.display!=="none"){hideTableBorderPicker();return}t||(t=document.createElement("div"),t.id="editor-table-border-picker",t.className="editor-table-border-picker",t.innerHTML=`<div class="tbp-label">Ki\u1EC3u vi\u1EC1n b\u1EA3ng</div><div class="tbp-options"><button class="tbp-btn" title="T\u1EA5t c\u1EA3 vi\u1EC1n" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('all')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h22M3 18h22M10 3v22M18 3v22" stroke="currentColor" stroke-width="1.5"/></svg><span>T\u1EA5t c\u1EA3 vi\u1EC1n</span></button><button class="tbp-btn" title="Kh\xF4ng vi\u1EC1n" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('none')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/></svg><span>Kh\xF4ng vi\u1EC1n</span></button><button class="tbp-btn" title="Ch\u1EC9 vi\u1EC1n ngo\xE0i" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('outer')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="2"/></svg><span>Vi\u1EC1n ngo\xE0i</span></button><button class="tbp-btn" title="Ch\u1EC9 vi\u1EC1n trong" onmousedown="event.preventDefault()" onclick="tableApplyBorderStyle('inner')"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M3 10h22M3 18h22M10 3v22M18 3v22" stroke="currentColor" stroke-width="1.5"/></svg><span>Vi\u1EC1n trong</span></button></div>`,document.body.appendChild(t));const e=document.getElementById("tft-border-btn");if(e){const n=e.getBoundingClientRect();t.style.left=n.left+"px",t.style.top=n.bottom+6+window.scrollY+"px"}t.style.display="block",setTimeout(()=>{const n=i=>{!t.contains(i.target)&&i.target.id!=="tft-border-btn"&&(hideTableBorderPicker(),document.removeEventListener("mousedown",n))};document.addEventListener("mousedown",n)},0)}function hideTableBorderPicker(){const t=document.getElementById("editor-table-border-picker");t&&(t.style.display="none")}function tableApplyBorderStyle(t){const e=_activeTableCell||_selectedTableCells[0];if(!e)return;const n=e.closest("table");if(!n)return;const i=Array.from(n.querySelectorAll("tr")),s=i.length,o="1px solid #cbd5e1";i.forEach((a,l)=>{const r=Array.from(a.querySelectorAll("td,th")),c=r.length;r.forEach((d,u)=>{d.style.removeProperty("border"),d.style.removeProperty("border-top"),d.style.removeProperty("border-right"),d.style.removeProperty("border-bottom"),d.style.removeProperty("border-left"),t==="all"?d.style.border=o:t==="none"?d.style.border="none":t==="outer"?(d.style.borderTop=l===0?o:"none",d.style.borderBottom=l===s-1?o:"none",d.style.borderLeft=u===0?o:"none",d.style.borderRight=u===c-1?o:"none"):t==="inner"&&(d.style.borderTop=l===0?"none":o,d.style.borderBottom=l===s-1?"none":o,d.style.borderLeft=u===0?"none":o,d.style.borderRight=u===c-1?"none":o)})}),syncContentBlocksFromEditor(),hideTableBorderPicker()}function applyFormatColor(t){if(!document.getElementById("content-composer-host"))return;if(_composerSavedRange){const i=window.getSelection();i.removeAllRanges(),i.addRange(_composerSavedRange)}document.execCommand("styleWithCSS",!1,!0),document.execCommand("foreColor",!1,t);const n=document.getElementById("fmt-color-label");n&&(n.style.borderBottomColor=t),syncContentBlocksFromEditor()}function initContentComposer(t,e=""){_contentBlocks=normalizeContentBlocksForEditor(t,e),_composerSavedRange=null,renderContentComposer(),applyComposerCollapsedState(),initStickyPreview()}function openImagePicker(){saveComposerRange(),document.getElementById("content-image-file-input")?.click()}async function uploadComposerImage(t){_contentImageUploadCount++,setComposerStatus(`\u0110ang upload \u1EA3nh "${t.name}"...`,"loading");try{const e=await api.post("/uploads/images/presign",{file_name:t.name,content_type:t.type||"image/png",size:t.size});return await fetch(e.upload_url,{method:"PUT",headers:{"Content-Type":t.type||"image/png"},body:t}),{url:e.public_url,name:t.name,content_type:t.type,size:t.size}}finally{_contentImageUploadCount=Math.max(0,_contentImageUploadCount-1)}}async function onComposerImageSelected(t){const e=t.target?.files?.[0];if(e){_composerSavedRange||saveComposerRange();try{const n=await uploadComposerImage(e),i=createImageBlock(n.url,n.name||"",100);insertImageAtSavedRange(i),setComposerStatus(`\u0110\xE3 ch\xE8n \u1EA3nh "${e.name}" v\xE0o n\u1ED9i dung.`,"success")}catch(n){setComposerStatus(n?.error||n?.message||"Kh\xF4ng th\u1EC3 upload \u1EA3nh.","error"),toast(n?.error||n?.message||"Kh\xF4ng th\u1EC3 upload \u1EA3nh","error")}finally{t.target&&(t.target.value="")}}}async function handleComposerPaste(t){const e=Array.from(t.clipboardData?.files||[]).filter(r=>r.type.startsWith("image/"));if(e.length){t.preventDefault(),saveComposerRange(),await onComposerImageSelected({target:{files:e,value:""}});return}const n=t.clipboardData?.getData("text/plain");if(!n)return;t.preventDefault();const i=window.getSelection();if(!i?.rangeCount)return;const s=i.getRangeAt(0);s.deleteContents();const o=n.replace(/\r/g,"").split(`
`),a=document.createDocumentFragment();o.forEach((r,c)=>{c>0&&a.appendChild(document.createElement("br")),r&&a.appendChild(document.createTextNode(r))}),s.insertNode(a),s.collapse(!1),i.removeAllRanges(),i.addRange(s);const l=document.getElementById("content-composer-host");l&&normalizeIndentTokensInElement(l),syncContentBlocksFromEditor(),saveComposerRange()}async function showQuestionDetail({id:t}){setLoading("\u0110ang t\u1EA3i \u0111\u1EC1...");const e=routeToken();try{const n=await api.get(`/questions/${t}`);if(routeChanged(e))return;renderQuestionDetail(n)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i \u0111\u1EC1: "+(n.error||n.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c \u0111\u1EC1",n,`/questions/${t}`)}}function renderQuestionDetail(t){_audioFile=null,_editingVocabIndex=-1,_vocabItems=Array.isArray(t.vocabulary)?[...t.vocabulary]:[];let e="";if(t.skill==="composite")_cqSections=Array.isArray(t.sections)?t.sections.map(s=>({label:s.label||"",skill:s.skill||"",time_limit_minutes:s.time_limit_minutes??null,questions_data:s.questions_data||[],content_blocks:s.content_blocks||[],content_text:s.content_text||"",content_url:s.content_url||null,content_urls:s.content_urls||[],script:s.script||"",vocabulary:s.vocabulary||[],_id:s.id})):[],_cqEditingIdx=-1,e='<div id="cq-sections-ui"></div>';else if(t.skill==="reading")e=`
      ${contentComposerHtml("N\u1ED9i dung \u0111\u1EC1 (B\xE0i \u0111\u1ECDc + C\xE2u h\u1ECFi)","So\u1EA1n n\u1ED9i dung d\u1EA1ng text, v\xE0 ch\xE8n \u1EA3nh v\xE0o gi\u1EEFa khi c\u1EA7n. Location ch\u1EC9 \xE1p d\u1EE5ng cho ph\u1EA7n text.")}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`;else if(t.skill==="listening"){const s=Array.isArray(t.content_urls)&&t.content_urls.length>0?t.content_urls:t.content_url?[{url:t.content_url,name:""}]:[],o=s.length>1;e=`
      ${s.length>0?`
        <div class="form-group">
          <label class="form-label">Audio hi\u1EC7n t\u1EA1i</label>
          ${s.map((a,l)=>`
            <div style="${o?"margin-bottom:10px":""}">
              ${o?`<div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:4px">${escapeHtml(a.name||"File "+(l+1))}</div>`:""}
              <audio controls src="${escapeHtml(a.url||"")}" style="width:100%;border-radius:8px"></audio>
            </div>`).join("")}
          <div class="form-hint">Kh\xF4ng h\u1ED7 tr\u1EE3 thay audio \u2014 xo\xE1 v\xE0 t\u1EA1o l\u1EA1i \u0111\u1EC1 n\u1EBFu c\u1EA7n \u0111\u1ED5i file.</div>
        </div>`:""}
      <div class="form-group" id="script-section">
        <label class="form-label">Script Listening
          <span style="font-size:12px;font-weight:400;color:var(--gray-400)"> \u2014 c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa</span>
        </label>
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="8"
          placeholder="Script listening...">${escapeHtml(t.script||"")}</textarea>
        ${speakerRenameSectionHtml()}
        <div class="form-hint">H\u1ECDc sinh xem script sau khi n\u1ED9p b\xE0i. B\xF4i ch\u1ECDn text \u1EDF \u0111\xE2y \u0111\u1EC3 set Location cho \u0111\xE1p \xE1n.</div>
      </div>
      ${contentComposerHtml("C\xE2u h\u1ECFi (text)","B\u1EA1n c\xF3 th\u1EC3 ch\xE8n \u1EA3nh minh ho\u1EA1 ho\u1EB7c b\u1EA3ng c\xE2u h\u1ECFi v\xE0o gi\u1EEFa c\xE1c \u0111o\u1EA1n text.")}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`}else t.skill==="writing"?e=`
      ${contentComposerHtml("\u0110\u1EC1 b\xE0i Writing","D\xF9ng text l\xE0m n\u1EC1n ch\xEDnh v\xE0 ch\xE8n chart/diagram/image v\xE0o \u0111\xFAng v\u1ECB tr\xED mong mu\u1ED1n.")}`:t.skill==="speaking"&&(e=`
      ${contentComposerHtml("C\xE2u h\u1ECFi / Cue Card","B\u1EA1n c\xF3 th\u1EC3 ch\xE8n \u1EA3nh ho\u1EB7c cue card visual v\xE0o gi\u1EEFa n\u1ED9i dung.")}`);if($("#app").innerHTML=`
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
    </div>`,(t.skill==="reading"||t.skill==="listening")&&t.questions_data?.length>0&&renderAnswerGridWithData(t.questions_data),Array.isArray(t.tags)&&t.tags.length>0){const s=$("#q-tags-chip-edit"),o=$("#q-tag-input-edit");if(s&&o)for(const a of t.tags){const l=document.createElement("span");l.className="chip",l.dataset.value=a,l.innerHTML=`${escapeHtml(a)} <button type="button" class="chip-remove">\xD7</button>`,l.querySelector(".chip-remove").onclick=()=>l.remove(),s.insertBefore(l,o)}}if(t.skill==="composite"){renderCQSectionsUI(),attachChipListeners();return}(t.skill==="reading"||t.skill==="listening")&&(renderVocabList(),syncVocabEditorState()),t.skill==="listening"&&(_speakerNames=[],_refreshSpeakerNames(),_renderSpeakerRenameUI()),attachChipListeners(),initContentComposer(t.content_blocks,t.content_text||"");const n=$("#answer-count");n&&(t.questions_data?.length>0&&(n.value=t.questions_data.length),n.addEventListener("input",()=>{const s=parseInt(n.value)||0;s>0&&s<=100&&renderAnswerGrid(s)}));const i=restoreQuestionDraftIntoForm("edit",t.id,t.skill);startQuestionDraftAutosave("edit",t.id,t.skill),syncVocabEditorState(),i&&toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p ch\u01B0a l\u01B0u trong 15 ph\xFAt g\u1EA7n nh\u1EA5t.","info")}function renderAnswerGridWithData(t){const e=$("#answer-grid");if(!e)return;const n=$("#answer-count");n&&(n.value=t.length),e.innerHTML="",t.forEach((i,s)=>{e.appendChild(_createAnswerRow(s+1,i))}),attachChipListeners()}async function submitQuestionEdit(t,e){const n=$("#q-title")?.value.trim(),i=$("#q-skill")?.value;if(!n){toast("Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1","error");return}const s=getChipValues($("#q-tags-chip-edit"));if(i==="composite"){if(_saveCQCurrentEditorState(),_cqEditingIdx>=0){toast("Vui l\xF2ng l\u01B0u ph\u1EA7n \u0111ang ch\u1EC9nh s\u1EEDa tr\u01B0\u1EDBc","warning");return}if(_cqSections.length===0){toast("Vui l\xF2ng th\xEAm \xEDt nh\u1EA5t 1 ph\u1EA7n thi","error");return}for(let r=0;r<_cqSections.length;r++){if(!_cqSections[r].label.trim()){toast(`Ph\u1EA7n ${r+1}: Ch\u01B0a \u0111\u1EB7t t\xEAn`,"error");return}if(!_cqSections[r].skill){toast(`Ph\u1EA7n ${r+1}: Ch\u01B0a ch\u1ECDn k\u1EF9 n\u0103ng`,"error");return}}btnLoading(e);try{await api.patch(`/questions/${t}`,{title:n,tags:s,sections:_cqSections.map(r=>({_id:r._id||null,label:r.label,skill:r.skill,time_limit_minutes:r.time_limit_minutes||null,questions_data:r.questions_data||[],content_blocks:r.content_blocks||[],content_text:r.content_text||null,content_url:r.content_url||null,content_urls:r.content_urls||[],script:r.script||null}))}),toast("\u0110\xE3 l\u01B0u thay \u0111\u1ED5i! \u2713"),navigate("/questions")}catch(r){btnReset(e),toast("L\u1ED7i l\u01B0u: "+(r.error||r.message),"error")}return}if(_contentImageUploadCount>0){toast("\u1EA2nh \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}const o=normalizeContentBlocksForEditor(_contentBlocks),a=blocksToPlainText(o)||null;let l=[];if(i==="reading"||i==="listening"){l=collectAnswerGrid();const r=checkEmptyAnswers();if(r.length>0){confirmSaveWithEmptyAnswers(r,()=>submitQuestionEdit(t,e));return}}btnLoading(e);try{await api.patch(`/questions/${t}`,{title:n,content_text:a,content_blocks:o,questions_data:l,vocabulary:_vocabItems,tags:s,...i==="listening"?{script:($("#listening-script")?.value||"").trim()||null}:{}}),stopQuestionDraftAutosave(),clearQuestionDraft(getQuestionDraftKey("edit",t)),toast("\u0110\xE3 l\u01B0u thay \u0111\u1ED5i! \u2713"),navigate("/questions")}catch(r){btnReset(e),toast("L\u1ED7i l\u01B0u: "+(r.error||r.message),"error")}}function _newAudioSlot(){return{displayName:"",file:null,name:"",size:0,status:"idle",url:null,key:null,pct:0,eta:null,transcript:void 0}}let _audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioUploading=!1,_scriptTranscribing=!1,_sttModel="diarize",_speakerNames=[],_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_vocabItems=[],_editingVocabIndex=-1,_pendingLocationRow=null;function vocabSectionHtml(){return`
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
      <div class="vocab-list-heading">Danh s\xE1ch t\u1EEB v\u1EF1ng</div>
      <div id="vocab-list" class="vocab-list"></div>
    </div>`}function syncVocabEditorState(){const t=$("#vocab-submit-btn"),e=$("#vocab-cancel-btn");t&&(t.textContent=_editingVocabIndex>=0?"L\u01B0u s\u1EEDa":"+ Th\xEAm"),e&&e.classList.toggle("hidden",_editingVocabIndex<0)}function resetVocabInputs(){$("#vocab-word")&&($("#vocab-word").value=""),$("#vocab-def")&&($("#vocab-def").value=""),$("#vocab-pronunciation")&&($("#vocab-pronunciation").value=""),$("#vocab-collocation")&&($("#vocab-collocation").value=""),$("#vocab-example")&&($("#vocab-example").value="")}function cancelVocabEdit(){_editingVocabIndex=-1,resetVocabInputs(),syncVocabEditorState(),scheduleQuestionDraftSave()}function addVocabItem(){const t=$("#vocab-word")?.value.trim(),e=$("#vocab-def")?.value.trim(),n=$("#vocab-pronunciation")?.value.trim()||"",i=$("#vocab-collocation")?.value.trim()||"",s=$("#vocab-example")?.value.trim()||"";if(!t||!e){toast("Nh\u1EADp t\u1EEB v\u1EF1ng v\xE0 \u0111\u1ECBnh ngh\u0129a","warning");return}const o={word:t,definition:e,...n&&{pronunciation:n},...i&&{collocation:i},...s&&{example:s}};_editingVocabIndex>=0&&_vocabItems[_editingVocabIndex]?_vocabItems[_editingVocabIndex]=o:_vocabItems.push(o),_editingVocabIndex=-1,resetVocabInputs(),renderVocabList(),syncVocabEditorState(),scheduleQuestionDraftSave()}function removeVocabItem(t){_vocabItems.splice(t,1),_editingVocabIndex===t?(_editingVocabIndex=-1,resetVocabInputs()):_editingVocabIndex>t&&(_editingVocabIndex-=1),renderVocabList(),syncVocabEditorState(),scheduleQuestionDraftSave()}function editVocabItem(t){const e=_vocabItems[t];if(!e)return;_editingVocabIndex=t,$("#vocab-word")&&($("#vocab-word").value=e.word||""),$("#vocab-def")&&($("#vocab-def").value=e.definition||""),$("#vocab-pronunciation")&&($("#vocab-pronunciation").value=e.pronunciation||""),$("#vocab-collocation")&&($("#vocab-collocation").value=e.collocation||""),$("#vocab-example")&&($("#vocab-example").value=e.example||""),syncVocabEditorState();const n=$("#vocab-word");n?.closest(".vocab-add-row")?.scrollIntoView({behavior:"smooth",block:"center"}),n?.focus(),scheduleQuestionDraftSave()}function renderVocabList(){const t=$("#vocab-list");if(t){if(_vocabItems.length===0){t.innerHTML='<div style="color:var(--gray-400);font-size:12px;padding:8px 0">Ch\u01B0a c\xF3 t\u1EEB v\u1EF1ng n\xE0o.</div>';return}t.innerHTML=_vocabItems.map((e,n)=>`
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
    </div>`).join("")}}function showQuestionForm(){_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,_editingVocabIndex=-1,$("#app").innerHTML=`
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
      Ch\u1ECDn k\u1EF9 n\u0103ng \u0111\u1EC3 hi\u1EC3n th\u1ECB form nh\u1EADp \u0111\u1EC1</div>`;return}if(t==="composite"){_cqSections=[],_cqEditingIdx=-1,renderCQSectionsUI();return}let n="";t==="reading"?n=`
      ${contentComposerHtml("N\u1ED9i dung \u0111\u1EC1 (B\xE0i \u0111\u1ECDc + C\xE2u h\u1ECFi)","Copy/paste text nh\u01B0 b\xECnh th\u01B0\u1EDDng. Khi c\u1EA7n b\u1EA3ng ho\u1EB7c h\xECnh, h\xE3y ch\xE8n \u1EA3nh v\xE0o \u0111\xFAng v\u1ECB tr\xED gi\u1EEFa c\xE1c \u0111o\u1EA1n text.")}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`:t==="listening"?n=`
      <div class="form-group">
        <label class="form-label">File Audio <span style="color:var(--danger)">*</span></label>
        ${audioUploadHtml()}
      </div>
      <div class="form-group" id="script-section">
        <label class="form-label">Script Listening
          <span style="font-size:12px;font-weight:400;color:var(--gray-400)"> \u2014 t\u1EF1 \u0111\u1ED9ng tr\xEDch xu\u1EA5t sau khi upload audio, c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa</span>
        </label>
        ${sttSelectorHtml()}
        <div id="script-loading" class="script-loading hidden">
          <span class="btn-spinner btn-spinner--dark"></span> <span id="script-loading-msg">\u0110ang tr\xEDch xu\u1EA5t script...</span>
        </div>
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="8"
          placeholder="Script s\u1EBD t\u1EF1 \u0111\u1ED9ng \u0111i\u1EC1n sau khi upload audio v2. B\u1EA1n c\u0169ng c\xF3 th\u1EC3 nh\u1EADp th\u1EE7 c\xF4ng."></textarea>
        ${speakerRenameSectionHtml()}
        <div class="form-hint">H\u1ECDc sinh xem script sau khi n\u1ED9p b\xE0i. B\xF4i ch\u1ECDn text \u1EDF \u0111\xE2y \u0111\u1EC3 set Location cho \u0111\xE1p \xE1n.</div>
      </div>
      ${contentComposerHtml("C\xE2u h\u1ECFi (text)","B\u1EA1n c\xF3 th\u1EC3 xen k\u1EBD text v\xE0 \u1EA3nh minh ho\u1EA1 / b\u1EA3ng c\xE2u h\u1ECFi trong c\xF9ng m\u1ED9t n\u1ED9i dung.")}
      <div id="location-pick-hint" class="location-pick-hint hidden"></div>
      ${answerGridHtml()}
      ${vocabSectionHtml()}`:t==="writing"?n=`
      ${contentComposerHtml("\u0110\u1EC1 b\xE0i Writing","Nh\u1EADp \u0111\u1EC1 b\xE0i Task 1 ho\u1EB7c Task 2, v\xE0 ch\xE8n bi\u1EC3u \u0111\u1ED3 / h\xECnh minh ho\u1EA1 v\xE0o \u0111\xFAng v\u1ECB tr\xED n\u1EBFu c\u1EA7n.")}
      <div style="padding:12px 16px;background:var(--primary-lt);border-radius:8px;font-size:13px;color:var(--primary-dk)">
        \u2139\uFE0F Writing l\xE0 t\u1EF1 lu\u1EADn \u2014 kh\xF4ng c\u1EA7n nh\u1EADp \u0111\xE1p \xE1n m\u1EABu.
      </div>`:t==="speaking"&&(n=`
      ${contentComposerHtml("C\xE2u h\u1ECFi / Cue Card","Nh\u1EADp cue card d\u1EA1ng text v\xE0 ch\xE8n th\xEAm image n\u1EBFu mu\u1ED1n hi\u1EC3n th\u1ECB visual support cho h\u1ECDc sinh.")}
      <div style="padding:12px 16px;background:var(--primary-lt);border-radius:8px;font-size:13px;color:var(--primary-dk)">
        \u2139\uFE0F Speaking \u2014 h\u1ECDc sinh s\u1EBD upload file audio c\u1EE7a m\xECnh. Kh\xF4ng c\u1EA7n \u0111\xE1p \xE1n m\u1EABu.
      </div>`),e.innerHTML=n,t==="listening"&&_renderAudioSlots(),initContentComposer([],"");const i=$("#answer-count");i&&i.addEventListener("input",()=>{const s=parseInt(i.value)||0;s>0&&s<=100&&renderAnswerGrid(s)})}function answerGridHtml(){return`
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
    </div>`}let _pdfJsLoadingPromise=null;function pdfImportBoxHtml(){return`
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
    </div>`}function setPdfImportStatus(t,e=""){const n=$("#pdf-import-status");n&&(n.className=`pdf-import-status${e?` is-${e}`:""}`,n.textContent=t)}function setPdfImportBusy(t){const e=$("#pdf-import-area"),n=$("#pdf-file-input"),i=$("#pdf-import-btn");e?.classList.toggle("processing",t),n&&(n.disabled=t),i&&(i.disabled=t)}async function ensurePdfJsLoaded(){return window.pdfjsLib?window.pdfjsLib:_pdfJsLoadingPromise||(_pdfJsLoadingPromise=import("./vendor/pdfjs-dist/build/pdf.min.mjs").then(t=>(t.GlobalWorkerOptions.workerSrc="./js/vendor/pdfjs-dist/build/pdf.worker.min.mjs",window.pdfjsLib=t,t)).catch(t=>{throw _pdfJsLoadingPromise=null,t}),_pdfJsLoadingPromise)}function mergePdfTextItems(t){const e=[];let n="",i=null,s=null;function o(){const a=n.replace(/[ \t]+/g," ").trim();a&&e.push(a),n="",i=null,s=null}for(const a of t||[]){if(!a||typeof a.str!="string")continue;const l=a.str.replace(/\u0000/g,""),r=a.transform?.[5]??i,c=a.transform?.[4]??null;if(i!==null&&r!==null&&Math.abs(r-i)>4&&o(),l){let u="";if(n){const m=c!=null&&s!=null?c-s:0,h=/^[,.;:!?%)\]\}]/.test(l),g=/[-/(\[]$/.test(n);!h&&!g&&m>1&&(u=" ")}n+=u+l}i=r,s=c!=null?c+(a.width||0):s,a.hasEOL&&o()}return o(),e.join(`
`).replace(/\n{3,}/g,`

`).trim()}async function extractTextFromPdf(t){const e=await ensurePdfJsLoaded(),n=await t.arrayBuffer(),s=await e.getDocument({data:new Uint8Array(n),useWorkerFetch:!0,isEvalSupported:!1}).promise,o=[];for(let l=1;l<=s.numPages;l++){setPdfImportStatus(`\u0110ang tr\xEDch xu\u1EA5t trang ${l}/${s.numPages}...`,"loading");const c=await(await s.getPage(l)).getTextContent(),d=mergePdfTextItems(c.items);d&&o.push(d)}const a=o.join(`

`).trim();if(!a)throw new Error("Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c text t\u1EEB PDF n\xE0y. C\xF3 th\u1EC3 \u0111\xE2y l\xE0 PDF scan \u1EA3nh ho\u1EB7c file kh\xF4ng c\xF3 l\u1EDBp text.");return{text:a,pageCount:s.numPages}}async function importPdfIntoQuestion(t){if(!t)return;if(t.type!=="application/pdf"&&!/\.pdf$/i.test(t.name)){setPdfImportStatus("File kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng ch\u1ECDn file PDF.","error"),toast("Ch\u1EC9 h\u1ED7 tr\u1EE3 file PDF","error");return}const e=$("#q-content");if(!(!e||!(!e.value.trim()||await confirmAction({title:"Thay n\u1ED9i dung t\u1EEB PDF",message:"N\u1ED9i dung hi\u1EC7n t\u1EA1i s\u1EBD b\u1ECB thay b\u1EB1ng text tr\xEDch xu\u1EA5t t\u1EEB file PDF n\xE0y.",confirmText:"Ti\u1EBFp t\u1EE5c nh\u1EADp PDF",danger:!0})))){setPdfImportBusy(!0),setPdfImportStatus("\u0110ang t\u1EA3i th\u01B0 vi\u1EC7n \u0111\u1ECDc PDF...","loading");try{const{text:i,pageCount:s}=await extractTextFromPdf(t);e.value=i,e.dispatchEvent(new Event("input",{bubbles:!0})),e.focus(),e.setSelectionRange(0,0),e.scrollTop=0,setPdfImportStatus(`\u0110\xE3 x\u1EED l\xFD ${s} trang t\u1EEB "${t.name}" v\xE0 \u0111i\u1EC1n v\xE0o \xF4 n\u1ED9i dung.`,"success"),toast("\u0110\xE3 chuy\u1EC3n PDF th\xE0nh text")}catch(i){console.error("PDF import failed:",i);const s=i?.message||"Kh\xF4ng th\u1EC3 x\u1EED l\xFD file PDF n\xE0y.";setPdfImportStatus(s,"error"),toast(s,"error")}finally{setPdfImportBusy(!1)}}}function attachPdfImport(){const t=$("#pdf-import-area"),e=$("#pdf-file-input"),n=$("#pdf-import-btn");if(!t||!e||!n)return;const i=()=>{e.disabled||e.click()};n.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),i()}),t.addEventListener("click",s=>{s.target===e||s.target===n||i()}),t.addEventListener("keydown",s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),i())}),e.addEventListener("change",()=>{const s=e.files?.[0];s&&importPdfIntoQuestion(s),e.value=""}),t.addEventListener("dragover",s=>{s.preventDefault(),t.classList.add("dragover")}),t.addEventListener("dragleave",()=>t.classList.remove("dragover")),t.addEventListener("drop",s=>{s.preventDefault(),t.classList.remove("dragover");const o=s.dataTransfer.files?.[0];o&&importPdfIntoQuestion(o)})}function sttSelectorHtml(){return`<div id="stt-selector" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;padding:8px 10px;background:var(--bg-secondary);border-radius:8px;font-size:13px">
    <span style="font-weight:600;color:var(--gray-600)">Model:</span>
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
      <input type="radio" name="stt-model" value="diarize" ${_sttModel==="diarize"?"checked":""} onchange="setSttModel('diarize')">
      <span>Diarize <span style="color:var(--gray-400);font-size:11px">(c\xF3 Speaker ID, t\u1ED1i \u0111a 5 ph\xFAt)</span></span>
    </label>
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
      <input type="radio" name="stt-model" value="mini" ${_sttModel==="mini"?"checked":""} onchange="setSttModel('mini')">
      <span>Mini <span style="color:var(--gray-400);font-size:11px">(nhanh, kh\xF4ng gi\u1EDBi h\u1EA1n)</span></span>
    </label>
  </div>`}function setSttModel(t){_sttModel=t}function audioUploadHtml(){return`<div id="audio-upload-area"><div id="audio-slot-list"></div>
    <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addAudioSlot()">+ Th\xEAm file audio</button>
  </div>`}function _renderAudioSlots(){const t=$("#audio-slot-list");t&&(t.innerHTML=_audioSlots.map((e,n)=>{const s=_audioSlots.length>1?`<button class="remove-audio-slot" onclick="removeAudioSlot(${n})" title="Xo\xE1 slot" aria-label="Xo\xE1 audio slot">\xD7</button>`:"";let o="";if(e.status==="idle")o=`
        <input id="audio-slot-input-${n}" type="file" accept="audio/*" style="display:none" onchange="onSlotFileSelected(this,${n})" />
        <button class="audio-pick-btn" onclick="document.getElementById('audio-slot-input-${n}').click()">\u{1F3B5} Ch\u1ECDn file audio</button>
        <span style="font-size:12px;color:var(--gray-400)">MP3, WAV, M4A... t\u1ED1i \u0111a 200MB</span>`;else if(e.status==="uploading"){const a=e.pct<100&&e.eta!=null?` \xB7 ETA ${_fmtEta(e.eta)}`:"";o=`
        <div class="audio-slot-filename">${escapeHtml(e.name)} <span style="color:var(--gray-400)">(${(e.size/1024/1024).toFixed(1)} MB)</span></div>
        <div class="upload-progress-row">
          <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" style="width:${e.pct}%"></div></div>
          <span class="upload-progress-label">${e.pct}%${a}</span>
        </div>`}else e.status==="done"?o=`
        <div class="audio-slot-done">
          <span class="audio-upload-done">\u2713</span>
          <span class="audio-slot-filename">${escapeHtml(e.name)} <span style="color:var(--gray-400)">(${(e.size/1024/1024).toFixed(1)} MB)</span></span>
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px" onclick="clearSlotFile(${n})">\u0110\u1ED5i file</button>
        </div>`:e.status==="error"&&(o=`
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:var(--danger)">\u2717 L\u1ED7i upload: ${escapeHtml(e.name)}</span>
          <input id="audio-slot-input-${n}" type="file" accept="audio/*" style="display:none" onchange="onSlotFileSelected(this,${n})" />
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px" onclick="document.getElementById('audio-slot-input-${n}').click()">Th\u1EED l\u1EA1i</button>
        </div>`);return`<div class="audio-slot" id="audio-slot-${n}">
      <div class="audio-slot-num">${n+1}</div>
      <div class="audio-slot-content">
        <input type="text" class="form-input audio-slot-name" placeholder="T\xEAn hi\u1EC3n th\u1ECB (VD: Section ${n+1})"
               value="${escapeHtml(e.displayName)}" onchange="_audioSlots[${n}].displayName=this.value" />
        <div class="audio-slot-file">${o}</div>
      </div>
      ${s}
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
    </div>`)}async function onSlotFileSelected(t,e){const n=t.files?.[0];if(!n||!_audioSlots[e])return;t.value="";const i=n.name.split(".").pop().toLowerCase();if(!SUPPORTED_AUDIO_EXTS.has(i)){showUnsupportedAudioWarning(n.name,i);return}if(await isRawAacFile(n)){showRawAacWarning(n.name);return}_audioSlots[e].file=n,_audioSlots[e].name=n.name,_audioSlots[e].size=n.size,_audioSlots[e].status="uploading",_audioSlots[e].pct=0,_audioSlots[e].eta=null,_audioSlots[e].url=null,_audioSlots[e].key=null,_renderAudioSlots(),_uploadAudioSlot(e)}function onAudioFilesSelected(t){onSlotFileSelected(t,0)}function addAudioSlot(){_audioSlots.push(_newAudioSlot()),_renderAudioSlots()}function clearSlotFile(t){_audioSlots[t]&&(_audioSlots[t]={..._newAudioSlot(),displayName:_audioSlots[t].displayName},_audioUploading=_audioSlots.some(e=>e.status==="uploading"),_renderAudioSlots())}async function requestDirectAudioUpload(t,e,n={}){return api.post("/uploads/audio/presign",{scope:e,file_name:t.name,content_type:t.type||"application/octet-stream",size:t.size,...n})}function putDirectAudioXHR(t,e,n,i){return new Promise((s,o)=>{const a=new XMLHttpRequest,l=Date.now();a.upload.addEventListener("progress",r=>{if(!r.lengthComputable)return;const c=Math.round(r.loaded/r.total*100),d=(Date.now()-l)/1e3,u=r.loaded/d,m=u>0?Math.ceil((r.total-r.loaded)/u):null;i(c,m)}),a.addEventListener("load",()=>a.status>=200&&a.status<300?s():o(new Error(`HTTP ${a.status}`))),a.addEventListener("error",()=>o(new Error("Network error"))),a.addEventListener("abort",()=>o(new Error("Upload cancelled"))),a.open("PUT",t),a.setRequestHeader("Content-Type",n||"application/octet-stream"),a.send(e)})}function _fmtEta(t){return t===null||t<0?"":t<60?`~${t}s`:`~${Math.ceil(t/60)}m`}async function _uploadAudioSlot(t){const e=_audioSlots[t];if(e){_audioUploading=!0;try{const n=await requestDirectAudioUpload(e.file,"teacher-listening");await putDirectAudioXHR(n.upload_url,e.file,n.headers?.["Content-Type"]||e.file.type,(i,s)=>{_audioSlots[t]&&(_audioSlots[t].pct=i,_audioSlots[t].eta=s),_renderAudioSlots()}),_audioSlots[t].status="done",_audioSlots[t].url=n.public_url,_audioSlots[t].key=n.key,_renderAudioSlots(),_maybeTranscribeAll()}catch(n){_audioSlots[t].status="error",_renderAudioSlots(),toast(`L\u1ED7i upload "${e.name}": `+(n.message||"Unknown error"),"error")}finally{_audioUploading=_audioSlots.some(n=>n.status==="uploading")}}}function _maybeTranscribeAll(){if(_audioSlots.some(e=>e.status==="uploading"))return;const t=_audioSlots.filter(e=>e.status==="done"&&e.transcript===void 0);for(const e of t)e.transcript=null,_transcribeSlot(e)}async function _transcribeSlot(t){const e=$("#listening-script"),n=$("#script-loading");n&&n.classList.remove("hidden");try{const i=await transcribeListeningScript({key:t.key,model:_sttModel});t.transcript=i?.text||"",t.transcriptFallback=i?.fallback||!1,t.transcriptModel=i?.modelUsed||_sttModel,t.transcriptDuration=i?.durationSeconds||0,_renderCombinedTranscript();const s=t.transcriptDuration,o=s>0?` (${Math.floor(s/60)}:${String(s%60).padStart(2,"0")})`:"";i?.fallback&&openModal("\u0110\xE3 t\u1EF1 \u0111\u1ED9ng d\xF9ng Mini model",`<p style="margin:0 0 8px;line-height:1.6">"${escapeHtml(t.displayName||t.name)}"${o} d\xE0i h\u01A1n 5 ph\xFAt \u2014 Diarize kh\xF4ng h\u1ED7 tr\u1EE3.</p><p style="margin:0;line-height:1.6">\u0110\xE3 d\xF9ng <strong>Mini model</strong> thay th\u1EBF (kh\xF4ng c\xF3 Speaker ID).</p>`)}catch(i){t.transcript="",toast(`Kh\xF4ng th\u1EC3 transcribe "${t.displayName||t.name}": ${i.error||i.message}`,"error")}finally{_audioSlots.some(i=>i.transcript===null)||n&&n.classList.add("hidden")}}function _renderCombinedTranscript(){const t=$("#listening-script");if(!t)return;const e=_audioSlots.filter(n=>typeof n.transcript=="string"&&n.transcript!=="");e.length!==0&&(e.length===1?t.value=e[0].transcript:t.value=e.map(n=>`--- Transcript: ${n.displayName||n.name} ---
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
`)){const s=i.match(/^([^:\n]+?):\s/);s&&!e.has(s[1])&&(e.add(s[1]),n.push(s[1]))}return n}function _nextSpeakerLabel(){const t=new Set(_speakerNames.map(e=>e.original));for(const e of"ABCDEFGHIJKLMNOPQRSTUVWXYZ")if(!t.has(e))return e;return"?"}function _hasSpeakerPattern(t){return/^[A-Za-z][^:\n]*:\s/m.test(t)}function _refreshSpeakerNames(){const t=$("#listening-script");if(!t||!_hasSpeakerPattern(t.value))return;const e=_parseSpeakersFromTranscript(t.value),n=new Map(_speakerNames.map(i=>[i.original,i]));_speakerNames=e.map(i=>n.get(i)||{original:i,replace:""}),_speakerNames.length===0&&(_speakerNames=[{original:"A",replace:""},{original:"B",replace:""}])}function _renderSpeakerRenameUI(){const t=$("#speaker-rename-section");if(!t)return;const e=$("#listening-script");if(!(e&&_hasSpeakerPattern(e.value))){t.style.display="none";return}t.style.display="";const i=$("#speaker-rename-list");if(!i)return;const s="padding:4px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;background:var(--surface,var(--bg-subtle));color:var(--text);outline:none;width:100%";i.innerHTML=_speakerNames.map((o,a)=>`
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="text" value="${escapeHtml(o.original)}" oninput="_speakerNames[${a}].original=this.value" style="${s};max-width:120px;flex:0 0 120px">
      <span style="color:var(--gray-400);font-size:13px;flex-shrink:0">\u2192</span>
      <input type="text" value="${escapeHtml(o.replace)}" oninput="_speakerNames[${a}].replace=this.value" placeholder="T\xEAn m\u1EDBi..." style="${s};flex:1">
      <button type="button" onclick="_removeSpeakerRow(${a})" style="flex-shrink:0;border:none;background:none;color:var(--gray-400);cursor:pointer;font-size:15px;padding:2px 4px;line-height:1" title="X\xF3a">\xD7</button>
    </div>`).join("")}function addSpeakerRow(){_speakerNames.push({original:_nextSpeakerLabel(),replace:""}),_renderSpeakerRenameUI()}function _removeSpeakerRow(t){_speakerNames.splice(t,1),_renderSpeakerRenameUI()}function applySpeakerRenames(){const t=$("#listening-script");if(!t)return;const e=_speakerNames.filter(i=>i.replace.trim());if(e.length===0){toast("Ch\u01B0a \u0111i\u1EC1n t\xEAn m\u1EDBi","warning");return}let n=t.value;for(const i of e){const s=i.original.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");n=n.replace(new RegExp(`^${s}:`,"gm"),`${i.replace}:`)}t.value=n;for(const i of _speakerNames)i.replace.trim()&&(i.original=i.replace,i.replace="");_renderSpeakerRenameUI(),toast("\u0110\xE3 \u0111\u1ED5i t\xEAn speaker","success")}function removeAudioSlot(t){if(_audioSlots.length<=1){clearSlotFile(0);return}if(_audioSlots.splice(t,1),_audioUploading=_audioSlots.some(n=>n.status==="uploading"),_renderAudioSlots(),_audioSlots.filter(n=>n.status==="done").length===0){const n=$("#listening-script");n&&(n.value="");const i=$("#script-loading");i&&i.classList.add("hidden")}}function removeAudioFile(t){removeAudioSlot(t)}function removeAudio(t){t&&t.stopPropagation(),removeAudioSlot(0)}async function transcribeListeningScript({key:t,model:e}){return await api.post("/questions/transcribe-audio",{key:t,model:e})}function toggleExplanation(t){const n=t?.closest?.(".answer-row")?.querySelector?.(".explanation-row");if(!n)return;const i=n.style.display==="none";n.style.display=i?"":"none",t.setAttribute("aria-expanded",i?"true":"false")}function locateInText(){}function scrollToFeedbackMark(){}async function submitQuestion(t){const e=$("#q-title")?.value.trim(),n=$("#q-skill")?.value,i=getChipValues($("#q-tags-chip"));if(!e){toast("Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1","error");return}if(!n){toast("Vui l\xF2ng ch\u1ECDn k\u1EF9 n\u0103ng","error");return}if(n==="composite"){if(_cqEditingIdx>=0){toast("Vui l\xF2ng l\u01B0u ph\u1EA7n \u0111ang ch\u1EC9nh s\u1EEDa tr\u01B0\u1EDBc","warning");return}if(_cqSections.length===0){toast("Vui l\xF2ng th\xEAm \xEDt nh\u1EA5t 1 ph\u1EA7n thi","error");return}for(let l=0;l<_cqSections.length;l++){if(!_cqSections[l].label.trim()){toast(`Ph\u1EA7n ${l+1}: Ch\u01B0a \u0111\u1EB7t t\xEAn`,"error");return}if(!_cqSections[l].skill){toast(`Ph\u1EA7n ${l+1}: Ch\u01B0a ch\u1ECDn k\u1EF9 n\u0103ng`,"error");return}}btnLoading(t);try{await api.post("/questions",{title:e,skill:"composite",tags:i,sections:_cqSections.map(l=>({label:l.label,skill:l.skill,time_limit_minutes:l.time_limit_minutes||null,questions_data:l.questions_data||[],content_blocks:l.content_blocks||[],content_text:l.content_text||"",content_url:l.content_url||null,content_urls:l.content_urls||[],script:l.script||""}))}),stopQuestionDraftAutosave(),clearQuestionDraft(getQuestionDraftKey("new")),toast("\u0110\xE3 l\u01B0u \u0111\u1EC1 t\u1ED5ng h\u1EE3p v\xE0o kho! \u{1F389}"),navigate("/questions")}catch(l){btnReset(t),toast("L\u1ED7i l\u01B0u \u0111\u1EC1: "+(l.error||l.message),"error")}return}const s=normalizeContentBlocksForEditor(_contentBlocks),o=blocksToPlainText(s)||"";if(_contentImageUploadCount>0){toast("\u1EA2nh \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}if(n==="listening"){if(_audioSlots.filter(r=>r.status==="done").length===0){toast("Vui l\xF2ng ch\u1ECDn v\xE0 upload \xEDt nh\u1EA5t 1 file audio cho Listening","error");return}if(_audioUploading){toast("Audio v\u1EABn \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}}let a=[];if(n==="reading"||n==="listening"){a=collectAnswerGrid();const l=checkEmptyAnswers();if(l.length>0){confirmSaveWithEmptyAnswers(l,()=>submitQuestion(t));return}}btnLoading(t);try{let l={};if(n==="listening"){const r=_audioSlots.filter(d=>d.status==="done"),c=r.map(d=>({url:d.url,key:d.key,name:d.displayName||d.name,filename:d.name}));l={content_url:r[0]?.url||null,content_upload_key:r[0]?.key||null,content_urls:c,script:($("#listening-script")?.value||"").trim()||null}}await api.post("/questions",{title:e,skill:n,content_text:o,content_blocks:s,questions_data:a,vocabulary:_vocabItems,tags:i,...l}),stopQuestionDraftAutosave(),clearQuestionDraft(getQuestionDraftKey("new")),toast("\u0110\xE3 l\u01B0u \u0111\u1EC1 v\xE0o kho! \u{1F389}"),_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,navigate("/questions")}catch(l){btnReset(t),toast("L\u1ED7i l\u01B0u \u0111\u1EC1: "+(l.error||l.message),"error")}}let _addStudentClassId=null,_addStudentTab="new";function parseStudentNameLines(t){return String(t||"").split(/\r?\n/).map(e=>e.replace(/\s+/g," ").trim()).filter(Boolean)}function openAddStudentModal(t){_addStudentClassId=t,_addStudentTab="new",renderAddStudentModal()}function renderAddStudentModal(){openModal("Th\xEAm h\u1ECDc sinh v\xE0o l\u1EDBp",`
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
    `}`),setTimeout(()=>{($("#stu-names")||$("#stu-existing-username"))?.focus()},50)}function switchStudentTab(t){_addStudentTab=t,renderAddStudentModal()}async function submitCreateStudent(t){const e=parseStudentNameLines($("#stu-names")?.value);if(e.length===0){toast("Vui l\xF2ng nh\u1EADp \xEDt nh\u1EA5t 1 h\u1ECDc sinh","error");return}btnLoading(t);try{const n=await api.post("/students",{class_id:_addStudentClassId,students:e.map(s=>({full_name:s}))}),i=Array.isArray(n.created)?n.created:[];if(i.length===0)throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c t\xE0i kho\u1EA3n \u0111\xE3 t\u1EA1o");closeModal(),openStudentCredentialsModal(i.length===1?"T\xE0i kho\u1EA3n h\u1ECDc sinh \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o":`\u0110\xE3 t\u1EA1o ${i.length} t\xE0i kho\u1EA3n h\u1ECDc sinh`,i,i.length===1?"student_account":"student_accounts"),toast(`\u0110\xE3 t\u1EA1o ${i.length} t\xE0i kho\u1EA3n h\u1ECDc sinh!`),showClassDetail({id:_addStudentClassId})}catch(n){btnReset(t),toast("L\u1ED7i: "+(n.error||n.message||"Kh\xF4ng th\u1EC3 t\u1EA1o h\u1ECDc sinh"),"error")}}async function submitAddExistingStudent(t){const e=$("#stu-existing-username")?.value.trim();if(!e){toast("Vui l\xF2ng nh\u1EADp username","error");return}btnLoading(t);try{await api.post("/student-classes",{class_id:_addStudentClassId,username:e}),closeModal(),toast("\u0110\xE3 th\xEAm h\u1ECDc sinh v\xE0o l\u1EDBp!"),showClassDetail({id:_addStudentClassId})}catch(n){btnReset(t),toast("L\u1ED7i: "+(n.error||"Kh\xF4ng th\u1EC3 th\xEAm h\u1ECDc sinh"),"error")}}function openResetPasswordModal(t,e,n){confirmAction({title:"C\u1EA5p m\u1EADt kh\u1EA9u m\u1EDBi",message:`M\u1EADt kh\u1EA9u c\u0169 c\u1EE7a <strong>${escapeHtml(e)}</strong> s\u1EBD h\u1EBFt hi\u1EC7u l\u1EF1c ngay sau khi \u0111\u1ED5i.`,confirmText:"C\u1EA5p m\u1EADt kh\u1EA9u m\u1EDBi",danger:!0}).then(i=>{i&&submitResetPassword(t,n)})}async function submitResetPassword(t,e){btnLoading(e);try{const n=await api.post(`/students/${t}/reset-password`,{});if(!n?.credentials)throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c m\u1EADt kh\u1EA9u m\u1EDBi");openStudentCredentialsModal("M\u1EADt kh\u1EA9u m\u1EDBi c\u1EE7a h\u1ECDc sinh",[n.credentials],"student_password_reset"),toast("\u0110\xE3 c\u1EA5p m\u1EADt kh\u1EA9u m\u1EDBi!")}catch(n){btnReset(e),toast("L\u1ED7i: "+(n.error||n.message||"Kh\xF4ng th\u1EC3 \u0111\u1ED5i m\u1EADt kh\u1EA9u"),"error");return}btnReset(e)}async function removeStudentFromClass(t,e,n){if(await confirmAction({title:"Xo\xE1 h\u1ECDc sinh kh\u1ECFi l\u1EDBp",message:"T\xE0i kho\u1EA3n h\u1ECDc sinh v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i, ch\u1EC9 b\u1ECB g\u1EE1 kh\u1ECFi l\u1EDBp n\xE0y.",confirmText:"G\u1EE1 kh\u1ECFi l\u1EDBp",danger:!0})){btnLoading(n);try{await api.delete(`/student-classes?student_id=${t}&class_id=${e}`),toast("\u0110\xE3 xo\xE1 h\u1ECDc sinh kh\u1ECFi l\u1EDBp"),showClassDetail({id:e})}catch(s){btnReset(n),toast("L\u1ED7i: "+(s.error||s.message),"error");return}btnReset(n)}}async function showProfileFields(){setLoading("\u0110ang t\u1EA3i...");const t=routeToken();try{const e=await api.get("/profile-fields");if(routeChanged(t))return;renderProfileFieldsPage(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c h\u1ED3 s\u01A1 h\u1ECDc sinh",e,"/profile-fields")}}function renderProfileFieldsPage(t){const e={text:"V\u0103n b\u1EA3n ng\u1EAFn",textarea:"V\u0103n b\u1EA3n d\xE0i",select:"Ch\u1ECDn \u0111\xE1p \xE1n",date:"Ng\xE0y sinh"},n={notification_email:"Email th\xF4ng b\xE1o"},i=t.length===0?'<div class="pf-empty"><div class="pf-empty-icon">\u{1F4CB}</div><div>Ch\u01B0a c\xF3 c\xE2u h\u1ECFi n\xE0o. Th\xEAm c\xE2u h\u1ECFi \u0111\u1EA7u ti\xEAn b\xEAn tr\xEAn!</div></div>':`<div class="table-wrap"><table class="pf-table">
        <thead><tr><th>#</th><th>C\xE2u h\u1ECFi</th><th>Ki\u1EC3u</th><th>Vai tr\xF2</th><th></th></tr></thead>
        <tbody>${t.map((s,o)=>{const a=Array.isArray(s.options)&&s.options.length?`<div class="pf-opts-preview">${s.options.slice(0,3).map(r=>`<span class="pf-opt-pill">${escapeHtml(String(r))}</span>`).join("")}${s.options.length>3?`<span class="pf-opt-more">+${s.options.length-3}</span>`:""}</div>`:"",l=s.field_key?`<span class="pf-type-badge">${n[s.field_key]||s.field_key}</span>`:'<span style="color:var(--gray-400)">\u2014</span>';return`<tr>
            <td class="pf-num">${o+1}</td>
            <td><div class="pf-label-cell">${escapeHtml(s.label)}${a}</div></td>
            <td><span class="pf-type-badge">${e[s.field_type]||s.field_type}</span></td>
            <td>${l}</td>
            <td><button class="btn-icon danger" onclick="deleteProfileField('${s.id}')" aria-label="Xo\xE1 tr\u01B0\u1EDDng h\u1ED3 s\u01A1">\u{1F5D1}</button></td>
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
    </div>`}function onPfTypeChange(){if($("#pf-notification-email")?.checked){$("#pf-options-row")?.classList.add("hidden");return}const t=$("#pf-type")?.value;$("#pf-options-row")?.classList.toggle("hidden",t!=="select")}window.onPfTypeChange=onPfTypeChange;function onPfSpecialToggle(){const t=!!$("#pf-notification-email")?.checked,e=$("#pf-type"),n=$("#pf-label");e&&(t?(e.value="text",e.disabled=!0):e.disabled=!1),t&&n&&!n.value.trim()&&(n.value="Gmail"),onPfTypeChange()}window.onPfSpecialToggle=onPfSpecialToggle;async function submitAddProfileField(t){t.preventDefault();const e=$("#pf-label")?.value.trim(),n=$("#pf-type")?.value||"text",i=$("#pf-notification-email")?.checked?"notification_email":null,s=$("#pf-options")?.value||"",o=!i&&n==="select"?s.split(`
`).map(a=>a.trim()).filter(Boolean):null;if(!e){toast("Vui l\xF2ng nh\u1EADp n\u1ED9i dung c\xE2u h\u1ECFi","error");return}if(!i&&n==="select"&&(!o||o.length<2)){toast("Nh\u1EADp \xEDt nh\u1EA5t 2 l\u1EF1a ch\u1ECDn","error");return}try{await api.post("/profile-fields",{label:e,field_key:i,field_type:n,options:o}),toast("\u0110\xE3 th\xEAm c\xE2u h\u1ECFi!"),showProfileFields()}catch(a){toast("L\u1ED7i: "+(a.error||a.message),"error")}}window.submitAddProfileField=submitAddProfileField;async function deleteProfileField(t){if(await confirmAction({title:"Xo\xE1 c\xE2u h\u1ECFi h\u1ED3 s\u01A1",message:"C\xE1c c\xE2u tr\u1EA3 l\u1EDDi c\u1EE7a h\u1ECDc sinh cho c\xE2u h\u1ECFi n\xE0y c\u0169ng s\u1EBD b\u1ECB xo\xE1.",confirmText:"Xo\xE1 c\xE2u h\u1ECFi",danger:!0}))try{await api.delete(`/profile-fields/${t}`),toast("\u0110\xE3 xo\xE1 c\xE2u h\u1ECFi"),showProfileFields()}catch(n){toast("L\u1ED7i: "+(n.error||n.message),"error")}}window.deleteProfileField=deleteProfileField;async function openStudentProfileModal(t,e){openModal(`\u{1F464} H\u1ED3 s\u01A1 \u2014 ${e}`,'<div style="text-align:center;padding:24px;color:var(--gray-400)">\u0110ang t\u1EA3i...</div>');try{const{student:n,fields:i,answers:s}=await api.get(`/students/${t}/profile-answers`),o=i.length===0?`<div class="pf-modal-empty">
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
          ${i.map(l=>`
            <div class="pf-modal-row">
              <span class="pf-modal-label">${escapeHtml(l.label)}</span>
              <span class="pf-modal-value ${s[l.id]?"":"pf-empty-val"}">${s[l.id]?escapeHtml(s[l.id]):"Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u"}</span>
            </div>`).join("")}
        </div>`,a=document.getElementById("modal-body");a&&(a.innerHTML=o)}catch(n){const i=document.getElementById("modal-body");i&&(i.innerHTML=`<p style="color:var(--danger)">L\u1ED7i: ${n.error||n.message}</p>`)}}window.openStudentProfileModal=openStudentProfileModal;function activateLocationPick(t){_pendingLocationRow&&cancelLocationPick(),_pendingLocationRow=t;const e=t.querySelector(".q-label")?.textContent||"",n=document.getElementById("location-pick-hint"),i=document.getElementById("listening-script");if(i){i.classList.add("location-pickable-textarea"),n&&(n.textContent=`\u0110ang ch\u1ECDn v\u1ECB tr\xED cho ${e} \u2014 b\xF4i ch\u1ECDn \u0111o\u1EA1n text trong \xF4 Script Listening b\xEAn tr\xEAn. Esc \u0111\u1EC3 hu\u1EF7.`,n.classList.remove("hidden")),t.querySelector(".btn-pick-location")?.classList.add("picking-active"),i.addEventListener("mouseup",_onScriptMouseUp),i.scrollIntoView({behavior:"smooth",block:"center"});return}const s=document.getElementById("content-composer-preview-body"),o=s?.querySelectorAll?.(".mixed-content-text");!s||!o?.length||(toggleComposerEditor(!0),s.classList.add("location-picking"),o.forEach(a=>a.classList.add("location-pickable")),n&&(n.textContent=`\u0110ang ch\u1ECDn v\u1ECB tr\xED cho ${e} \u2014 b\xF4i ch\u1ECDn text ngay trong preview. C\xF3 th\u1EC3 span qua nhi\u1EC1u block text li\xEAn ti\u1EBFp, nh\u01B0ng kh\xF4ng \u0111\u01B0\u1EE3c \u0111i qua \u1EA3nh. Esc \u0111\u1EC3 hu\u1EF7.`,n.classList.remove("hidden")),t.querySelector(".btn-pick-location")?.classList.add("picking-active"),s.scrollIntoView({behavior:"smooth",block:"start"}))}function getTextareaSelectionRect(t,e,n){const i=t.getBoundingClientRect(),s=window.getComputedStyle(t),o=document.createElement("div");Object.assign(o.style,{position:"fixed",top:i.top+"px",left:i.left+"px",width:i.width+"px",height:i.height+"px",overflow:"hidden",opacity:"0",pointerEvents:"none",zIndex:"-1",whiteSpace:"pre-wrap",wordBreak:s.wordBreak,overflowWrap:s.overflowWrap,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,paddingTop:s.paddingTop,paddingRight:s.paddingRight,paddingBottom:s.paddingBottom,paddingLeft:s.paddingLeft,boxSizing:s.boxSizing});const a=document.createElement("div");a.style.cssText="position:relative;width:100%",a.style.top=-t.scrollTop+"px";const l=t.value;a.appendChild(document.createTextNode(l.slice(0,e)));const r=document.createElement("span");r.textContent=l.slice(e,n)||" ",a.appendChild(r),a.appendChild(document.createTextNode(l.slice(n))),o.appendChild(a),document.body.appendChild(o);const c=r.getBoundingClientRect();return document.body.removeChild(o),c}function _onScriptMouseUp(){const t=document.getElementById("listening-script");if(!t||!_pendingLocationRow)return;const e=t.selectionStart,n=t.selectionEnd;if(e===n)return;const i=t.value.slice(e,n).trim();if(!i)return;const s={text:i,meta:{type:"script_text_range",start:e,end:n,text:i}},o=getTextareaSelectionRect(t,e,n);showLocationConfirmPopup(s,{getBoundingClientRect:()=>o})}function cancelLocationPick(){if(!_pendingLocationRow)return;_pendingLocationRow.querySelector(".btn-pick-location")?.classList.remove("picking-active"),_pendingLocationRow=null;const t=document.getElementById("listening-script");t&&(t.classList.remove("location-pickable-textarea"),t.removeEventListener("mouseup",_onScriptMouseUp));const e=document.getElementById("content-composer-preview-body");e?.classList.remove("location-picking"),e?.querySelectorAll?.(".mixed-content-text").forEach(i=>i.classList.remove("location-pickable"));const n=document.getElementById("location-pick-hint");n&&n.classList.add("hidden"),window.getSelection()?.removeAllRanges?.()}function clearLocationValue(t){t.querySelector(".answer-location").value="";const e=t.querySelector(".answer-location-meta");e&&(e.value=""),t.querySelector(".location-text-display").textContent="Ch\u01B0a ch\u1ECDn",t.querySelector(".btn-clear-location").classList.add("hidden"),scheduleQuestionDraftSave()}function getPreviewBlockElement(t){return t&&(t.nodeType===Node.TEXT_NODE?t.parentElement:t)?.closest?.("#content-composer-preview-body [data-block-id]")||null}function getTextOffsetWithin(t,e,n){try{const i=document.createRange();return i.selectNodeContents(t),i.setEnd(e,n),i.toString().length}catch{return null}}function extractPreviewLocationSelection(){const t=document.getElementById("content-composer-preview-body"),e=t?.querySelector?.(".mixed-content"),n=window.getSelection();if(!t||!e||!n||n.isCollapsed||!n.rangeCount)return null;const i=n.getRangeAt(0);if(!t.contains(i.commonAncestorContainer))return null;const s=getPreviewBlockElement(i.startContainer),o=getPreviewBlockElement(i.endContainer);if(!s||!o)return{error:"Vui l\xF2ng ch\u1ECDn trong ph\u1EA7n text c\u1EE7a preview."};if(!s.classList.contains("mixed-content-text")||!o.classList.contains("mixed-content-text"))return{error:"Location ch\u1EC9 h\u1ED7 tr\u1EE3 tr\xEAn text, kh\xF4ng h\u1ED7 tr\u1EE3 tr\xEAn \u1EA3nh."};const a=Array.from(e.children).filter(b=>b.matches("[data-block-id]")),l=a.indexOf(s),r=a.indexOf(o);if(l<0||r<0)return{error:"Kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c v\xF9ng text \u0111\xE3 ch\u1ECDn."};const c=Math.min(l,r),d=Math.max(l,r);if(a.slice(c,d+1).some(b=>!b.classList.contains("mixed-content-text")))return{error:"B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 ch\u1ECDn tr\xEAn c\xE1c block text li\xEAn ti\u1EBFp, kh\xF4ng \u0111\u01B0\u1EE3c \u0111i qua \u1EA3nh."};const m=n.toString().trim();if(!m)return{error:"Ch\u01B0a c\xF3 text n\xE0o \u0111\u01B0\u1EE3c ch\u1ECDn."};const h=getTextOffsetWithin(s,i.startContainer,i.startOffset),g=getTextOffsetWithin(o,i.endContainer,i.endOffset);return h==null||g==null?{error:"Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c v\u1ECB tr\xED text \u0111\xE3 ch\u1ECDn."}:{text:m,meta:{type:"preview_text_range",start_block_id:s.dataset.blockId,end_block_id:o.dataset.blockId,start_offset:h,end_offset:g,text:m}}}let _pendingLocationResult=null,_pendingLocationRange=null;function removeLocationPopup(){document.getElementById("location-confirm-popup")?.remove(),_pendingLocationResult=null,_pendingLocationRange=null}function showLocationConfirmPopup(t,e){removeLocationPopup(),_pendingLocationResult=t,_pendingLocationRange=e?.cloneRange?e.cloneRange():null;const n=e.getBoundingClientRect(),s=document.getElementById("content-composer-preview-body")?.getBoundingClientRect()||{left:0,right:window.innerWidth},o=document.createElement("div");o.id="location-confirm-popup",o.className="location-confirm-popup",o.innerHTML=`
    <div class="lcp-label">X\xE1c nh\u1EADn v\u1ECB tr\xED \u0111\xE3 ch\u1ECDn</div>
    <div class="lcp-text">${escapeHtml(t.text)}</div>
    <div class="lcp-actions">
      <button class="lcp-cancel" id="lcp-cancel">\u2715 Hu\u1EF7</button>
      <button class="lcp-confirm" id="lcp-confirm">\u2713 X\xE1c nh\u1EADn</button>
    </div>`,document.body.appendChild(o);const a=o.offsetWidth||320,l=o.offsetHeight||118,r=window.visualViewport?.width??window.innerWidth,u=(window.visualViewport?.height??window.innerHeight)-n.bottom>=l+12?n.bottom+8:n.top-l-8,m=Math.max(8,r-a-8),h=Math.min(Math.max(s.left+4,n.left),m);o.style.top=`${Math.max(8,u)}px`,o.style.left=`${Math.max(8,h)}px`,document.getElementById("lcp-confirm").onclick=()=>commitLocationSelection(),document.getElementById("lcp-cancel").onclick=()=>{removeLocationPopup(),window.getSelection()?.removeAllRanges?.(),cancelLocationPick()}}function commitLocationSelection(t){const e=t??_pendingLocationResult;if(!e||!_pendingLocationRow)return;const n=t?null:_pendingLocationRange;if(t||removeLocationPopup(),n){const a=n.getBoundingClientRect();if(a.width>0&&a.height>0){const l=document.createElement("div");Object.assign(l.style,{position:"fixed",top:a.top+"px",left:a.left+"px",width:a.width+"px",height:a.height+"px",background:"#fef08a",borderRadius:"3px",pointerEvents:"none",zIndex:"599",opacity:"1",transition:"opacity 2s ease"}),document.body.appendChild(l),requestAnimationFrame(()=>requestAnimationFrame(()=>{l.style.opacity="0"})),setTimeout(()=>l.remove(),2100)}}_pendingLocationRow.querySelector(".answer-location").value=e.text;const i=_pendingLocationRow.querySelector(".answer-location-meta");i&&(i.value=JSON.stringify(e.meta));const s=_pendingLocationRow.querySelector(".location-text-display");s&&(s.textContent=e.text),_pendingLocationRow.querySelector(".btn-clear-location")?.classList.remove("hidden"),window.getSelection()?.removeAllRanges?.();const o=_pendingLocationRow;cancelLocationPick(),o.scrollIntoView({behavior:"smooth",block:"center"}),scheduleQuestionDraftSave()}document.addEventListener("mouseup",t=>{if(!_pendingLocationRow||t.target?.closest?.("#location-confirm-popup"))return;const e=extractPreviewLocationSelection();if(!e)return;if(e.error){toast(e.error,"warning");return}const n=window.getSelection(),i=n?.rangeCount?n.getRangeAt(0):null;i&&showLocationConfirmPopup(e,i)}),document.addEventListener("keydown",t=>{const e=t.target?.closest?.('[role="button"][tabindex="0"]');if(e&&(t.key==="Enter"||t.key===" ")){t.preventDefault(),e.click();return}if(t.key==="Escape"){if(document.getElementById("sidebar")?.classList.contains("sidebar--mobile-open")){t.preventDefault(),closeMobileSidebar();return}if(document.getElementById("drag-assign-panel")||_dragQuestionId){t.preventDefault(),cancelDragAssign();return}if(document.getElementById("location-confirm-popup")){removeLocationPopup(),window.getSelection()?.removeAllRanges?.(),cancelLocationPick();return}_pendingLocationRow&&cancelLocationPick();const s=document.getElementById("modal-overlay");s&&!s.classList.contains("hidden")&&closeModal()}});function initDarkMode(){const t=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",t);const e=document.getElementById("dark-mode-toggle");e&&(e.textContent=t==="dark"?"\u2600\uFE0F":"\u{1F319}")}function toggleDarkMode(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e);const n=document.getElementById("dark-mode-toggle");n&&(n.textContent=e==="dark"?"\u2600\uFE0F":"\u{1F319}")}window.toggleDarkMode=toggleDarkMode;const _origNavigate=navigate;function navigateWithTransition(t){const e=document.getElementById("app");e?(e.classList.add("page-exit"),setTimeout(()=>{e.classList.remove("page-exit"),_origNavigate(t)},120)):_origNavigate(t)}document.addEventListener("DOMContentLoaded",()=>{initDarkMode()}),initDarkMode(),window.navigate=navigateWithTransition,window.router=router,window.closeModal=closeModal,window.openCreateClassModal=openCreateClassModal,window.submitCreateClass=submitCreateClass,window.openAssignModal=openAssignModal,window.filterAssignQuestionSearch=filterAssignQuestionSearch,window.setAssignTagFilter=setAssignTagFilter,window.filterAssignQuestions=filterAssignQuestions,window.selectQuestion=selectQuestion,window.submitAssign=submitAssign,window.toggleAssignment=toggleAssignment,window.deleteAssignment=deleteAssignment,window.deleteQuestion=deleteQuestion,window.setSkillFilter=setSkillFilter,window.onSkillChange=onSkillChange,window.openImagePicker=openImagePicker,window.toggleComposerEditor=toggleComposerEditor,window.onAudioSelected=onAudioFilesSelected,window.removeAudio=removeAudio,window.submitQuestion=submitQuestion,window.submitQuestionEdit=submitQuestionEdit,window.openSubmissionModal=openSubmissionModal,window.closeAnnotationPopup=closeAnnotationPopup,window.confirmAnnotation=confirmAnnotation,window.removeAnnotation=removeAnnotation,window.scrollToAnnotation=scrollToAnnotation,window.editAnnotation=editAnnotation,window.saveAnnotation=saveAnnotation,window.saveGrading=saveGrading,window.SKILL_LABELS=SKILL_LABELS,window.openAddStudentModal=openAddStudentModal,window.switchStudentTab=switchStudentTab,window.submitCreateStudent=submitCreateStudent,window.submitAddExistingStudent=submitAddExistingStudent,window.downloadStudentCredentialsCsv=downloadStudentCredentialsCsv,window.openResetPasswordModal=openResetPasswordModal,window.submitResetPassword=submitResetPassword,window.removeStudentFromClass=removeStudentFromClass,window.addVocabItem=addVocabItem,window.removeVocabItem=removeVocabItem,window.toggleExplanation=toggleExplanation,window.locateInText=locateInText,window.scrollToFeedbackMark=scrollToFeedbackMark,window.activateLocationPick=activateLocationPick,window.clearLocationValue=clearLocationValue,window.cancelLocationPick=cancelLocationPick;function renderLoginGate(t=""){document.getElementById("sidebar").style.display="none",document.getElementById("mobile-hamburger").style.display="none",document.getElementById("app").innerHTML=`
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
    </div>`,document.getElementById("gate-password").focus()}const TEACHER_AUTH_FLAG="teacher_auth_ok";function expireTeacherSession(t=""){api.clearCache(),api.setAuthToken(""),sessionStorage.removeItem(TEACHER_AUTH_FLAG),history.replaceState(null,"",window.location.pathname),document.getElementById("sidebar").style.display="none",document.getElementById("mobile-hamburger").style.display="none",renderLoginGate(t)}async function submitLoginGate(t){t.preventDefault();const e=document.getElementById("gate-submit-btn"),n=document.getElementById("gate-password").value;e.disabled=!0,e.textContent="\u0110ang ki\u1EC3m tra...";try{await fetch(api._base+"/teacher-auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:n}),credentials:"include"}).then(async i=>{const s=await i.json().catch(()=>({}));if(!i.ok)throw new Error(s.error||"Sai m\u1EADt kh\u1EA9u");if(!s?.token)throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c token \u0111\u0103ng nh\u1EADp");api.setAuthToken(s.token)}),sessionStorage.setItem(TEACHER_AUTH_FLAG,"1"),document.getElementById("sidebar").style.display="",document.getElementById("mobile-hamburger").style.display="",refreshInboxBadge(),router()}catch(i){renderLoginGate(i.message||"Sai m\u1EADt kh\u1EA9u")}}async function logout(){await fetch(api._base+"/teacher-auth/logout",{method:"POST",credentials:"include"}).catch(()=>{}),expireTeacherSession()}async function boot(){pruneTeacherQuestionDrafts();try{const t=await fetch(api._base+"/teacher-auth/status",{headers:api._authHeaders(),credentials:"include"}),{authenticated:e}=await t.json();if(!e){expireTeacherSession();return}sessionStorage.setItem(TEACHER_AUTH_FLAG,"1")}catch{renderLoginGate("Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c server");return}refreshInboxBadge(),router()}function toggleGatePassword(){const t=document.getElementById("gate-password"),e=document.getElementById("gate-eye-btn");if(!t)return;const n=t.type==="password";t.type=n?"text":"password",e.textContent=n?"\u{1F648}":"\u{1F441}"}let _sharedQuestions=[],_sharedSearch="",_sharedSkillFilter="";async function showSharedPool(){const t=routeToken();let e;try{e=await api.get("/shared-pool")}catch(n){if(routeChanged(t))return;renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c kho \u0111\u1EC1 luy\u1EC7n t\u1EADp",n,"/shared-pool");return}routeChanged(t)||(_sharedQuestions=e,renderSharedPool())}function renderSharedPool(){let t=_sharedSkillFilter?_sharedQuestions.filter(i=>i.skill===_sharedSkillFilter):_sharedQuestions;if(_sharedSearch){const i=_sharedSearch.toLowerCase();t=t.filter(s=>s.title.toLowerCase().includes(i)||Array.isArray(s.tags)&&s.tags.some(o=>o.toLowerCase().includes(i)))}const e=$("#app")?.querySelector(".shared-pool-tbody");if(e){e.innerHTML=_buildSharedPoolRows(t),document.querySelectorAll(".shared-skill-tab").forEach(i=>i.classList.toggle("active",i.dataset.skill===_sharedSkillFilter));return}$("#app").innerHTML=`
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
      ${[["","T\u1EA5t c\u1EA3"],["reading","\u{1F4D6} Reading"],["listening","\u{1F3A7} Listening"],["writing","\u270D\uFE0F Writing"],["speaking","\u{1F3A4} Speaking"]].map(([i,s])=>`<button class="skill-tab shared-skill-tab ${_sharedSkillFilter===i?"active":""}" data-skill="${i}" onclick="setSharedSkillFilter('${i}')">${s}</button>`).join("")}
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
    </div>`,n.addEventListener("click",s=>{s.target===n&&closeSharedStatsModal()}),document.body.appendChild(n),_sharedStatsModal=n;let i;try{i=await api.get(`/shared-pool/${t}/stats`)}catch(s){n.querySelector(".sp-stats-body").innerHTML=`<p style="color:var(--red);text-align:center">L\u1ED7i t\u1EA3i th\u1ED1ng k\xEA: ${escapeHtml(s.error||s.message)}</p>`;return}_sharedStatsRows=i,_sharedStatsMode="avg",_renderSharedStatsBody(n.querySelector(".sp-stats-body"))}function closeSharedStatsModal(){if(_sharedStatsChart){try{_sharedStatsChart.destroy()}catch{}_sharedStatsChart=null}_sharedStatsModal&&(_sharedStatsModal.remove(),_sharedStatsModal=null)}function _groupSharedStatsByStudent(t){const e=new Map;for(const i of t)e.has(i.student_id)||e.set(i.student_id,{student_id:i.student_id,student_name:i.student_name||"",class_names:i.class_names||"\u2014",attempts:[]}),e.get(i.student_id).attempts.push(i);const n=[...e.values()];for(const i of n){const s=i.attempts.map(o=>o.overall_score).filter(o=>o!=null).map(Number);i.avg=s.length?s.reduce((o,a)=>o+a,0)/s.length:null,i.max=s.length?Math.max(...s):null,i.count=i.attempts.length}return n}function _renderSharedStatsBody(t){const e=_sharedStatsRows,n=_groupSharedStatsByStudent(e),i=e.map(l=>l.overall_score).filter(l=>l!=null).map(Number),s=l=>l.length?l.reduce((r,c)=>r+c,0)/l.length:null,o=l=>{if(!l.length)return null;const r=[...l].sort((d,u)=>d-u),c=Math.floor(r.length/2);return r.length%2?r[c]:(r[c-1]+r[c])/2},a=l=>l!=null?Number(l).toFixed(1):"\u2014";t.innerHTML=`
    <div class="sp-stats-summary">
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${e.length}</div><div class="sp-stats-kpi-lbl">T\u1ED5ng l\u01B0\u1EE3t l\xE0m</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${n.length}</div><div class="sp-stats-kpi-lbl">H\u1ECDc sinh</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(s(i))}</div><div class="sp-stats-kpi-lbl">\u0110i\u1EC3m TB</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(i.length?Math.max(...i):null)}</div><div class="sp-stats-kpi-lbl">Cao nh\u1EA5t</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(i.length?Math.min(...i):null)}</div><div class="sp-stats-kpi-lbl">Th\u1EA5p nh\u1EA5t</div></div>
      <div class="sp-stats-kpi"><div class="sp-stats-kpi-val">${a(o(i))}</div><div class="sp-stats-kpi-lbl">Trung v\u1ECB</div></div>
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
              ${n.map(l=>`
                <tr class="sp-stats-student-row" data-sid="${l.student_id}">
                  <td>
                    <span class="sp-stats-avatar">${escapeHtml((l.student_name||"?").charAt(0).toUpperCase())}</span>
                    ${escapeHtml(l.student_name)}
                  </td>
                  <td class="sp-stats-cell-muted">${escapeHtml(l.class_names)}</td>
                  <td>${l.count}</td>
                  <td><span class="stats-score-badge">${a(l.avg)}</span></td>
                  <td><span class="stats-score-badge">${a(l.max)}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline sp-expand-btn"
                      onclick="toggleSharedStudentDetail('${l.student_id}')">Chi ti\u1EBFt \u25BE</button>
                  </td>
                </tr>
                <tr class="sp-stats-detail-row hidden" id="sp-detail-${l.student_id}">
                  <td colspan="6" style="padding:0 0 0 40px">
                    <div class="sp-stats-detail-inner">
                      <table class="sp-stats-detail-table">
                        <thead><tr><th>#</th><th>Ch\u1EBF \u0111\u1ED9</th><th>Ng\xE0y n\u1ED9p</th><th>\u0110i\u1EC3m</th></tr></thead>
                        <tbody>
                          ${[...l.attempts].sort((r,c)=>new Date(r.submitted_at)-new Date(c.submitted_at)).map((r,c)=>`
                            <tr>
                              <td>${c+1}</td>
                              <td>${r.mode==="real_test"?"\u{1F3AF} Thi th\u1EADt":"\u{1F4DD} Luy\u1EC7n t\u1EADp"}</td>
                              <td>${formatDateTime(r.submitted_at)}</td>
                              <td><span class="stats-score-badge">${r.overall_score!=null?Number(r.overall_score).toFixed(1):"\u2014"}</span></td>
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
  `,_buildSharedStatsChart(n)}function _buildSharedStatsChart(t){if(_sharedStatsChart){try{_sharedStatsChart.destroy()}catch{}_sharedStatsChart=null}const e=document.getElementById("sp-stats-chart");if(!e)return;const n=t.map(a=>_sharedStatsMode==="avg"?a.avg:a.max).filter(a=>a!=null).map(Number),i=[];for(let a=1;a<=9;a+=.5)i.push(a);const s=new Array(i.length).fill(0);for(const a of n){const l=Math.round(a*2)/2,r=i.indexOf(Math.min(9,Math.max(1,l)));r>=0&&s[r]++}const o=i.map(a=>a>=7?{bg:"#16a34a99",border:"#16a34a"}:a>=5?{bg:"#ca8a0499",border:"#ca8a04"}:{bg:"#dc262699",border:"#dc2626"});ensureChartJsLoaded().then(()=>{_sharedStatsChart=new Chart(e,{type:"bar",data:{labels:i.map(a=>a%1===0?String(a):a.toFixed(1)),datasets:[{label:_sharedStatsMode==="avg"?"\u0110i\u1EC3m TB / HS":"\u0110i\u1EC3m cao nh\u1EA5t / HS",data:s,backgroundColor:o.map(a=>a.bg),borderColor:o.map(a=>a.border),borderWidth:1,borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{callbacks:{title:a=>`Band ${a[0].label}`,label:a=>`${a.raw} h\u1ECDc sinh`}}},scales:{x:{title:{display:!0,text:"Band IELTS"},grid:{display:!1}},y:{title:{display:!0,text:"S\u1ED1 h\u1ECDc sinh"},beginAtZero:!0,ticks:{stepSize:1}}}}})}).catch(()=>{const a=e.parentElement;a&&(a.innerHTML='<div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center"><p>Kh\xF4ng th\u1EC3 t\u1EA3i bi\u1EC3u \u0111\u1ED3 l\xFAc n\xE0y.</p></div>')})}function setSharedStatsMode(t){_sharedStatsMode=t,document.querySelectorAll(".sp-stats-mode-btn").forEach(e=>{e.classList.toggle("active",e.textContent.includes(t==="avg"?"Trung b\xECnh":"Cao nh\u1EA5t"))}),_buildSharedStatsChart(_groupSharedStatsByStudent(_sharedStatsRows))}function toggleSharedStudentDetail(t){const e=document.getElementById(`sp-detail-${t}`),n=document.querySelector(`.sp-stats-student-row[data-sid="${t}"] .sp-expand-btn`);if(!e)return;const i=e.classList.toggle("hidden");n&&(n.textContent=i?"Chi ti\u1EBFt \u25BE":"Thu g\u1ECDn \u25B4")}window.showSharedPoolStats=showSharedPoolStats,window.closeSharedStatsModal=closeSharedStatsModal,window.setSharedStatsMode=setSharedStatsMode,window.toggleSharedStudentDetail=toggleSharedStudentDetail;let _sharedEditingId=null;async function showSharedPoolForm(){_sharedEditingId=null,_vocabItems=[],_contentBlocks=[createTextBlock("")],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,_editingVocabIndex=-1,renderSharedPoolFormPage("T\u1EA1o \u0111\u1EC1 luy\u1EC7n t\u1EADp m\u1EDBi",null);const t=restoreSpDraftIntoForm("new");startSpDraftAutosave("new"),t&&toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p ch\u01B0a l\u01B0u trong 15 ph\xFAt g\u1EA7n nh\u1EA5t.","info")}async function showSharedPoolDetail({id:t}){const e=routeToken();let n;try{n=await api.get(`/shared-pool/${t}`)}catch(s){if(routeChanged(e))return;renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c \u0111\u1EC1",s,"/shared-pool");return}if(routeChanged(e))return;_sharedEditingId=t,_vocabItems=Array.isArray(n.vocabulary)?[...n.vocabulary]:[],_contentBlocks=Array.isArray(n.content_blocks)&&n.content_blocks.length?n.content_blocks:[createTextBlock(n.content_text||"")],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioFile=null,_audioUploadUrl=n.content_url||null,_audioUploadKey=null,_audioUploadName="",_audioUploadSize=0,_audioUploading=!1,_editingVocabIndex=-1,renderSharedPoolFormPage("S\u1EEDa \u0111\u1EC1 luy\u1EC7n t\u1EADp",n);const i=restoreSpDraftIntoForm("edit",t,n.skill);startSpDraftAutosave("edit",t,n.skill),i&&toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p ch\u01B0a l\u01B0u trong 15 ph\xFAt g\u1EA7n nh\u1EA5t.","info");try{const s=await api.get(`/shared-pool/${t}/stats`);if(routeChanged(e))return;renderSharedPoolStats(s,t)}catch{}}function renderSharedPoolFormPage(t,e){const n=e?.skill||"";$("#app").innerHTML=`
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
    <div id="sp-stats-section"></div>`,Array.isArray(e?.tags)&&e.tags.forEach(i=>addChip($("#sp-tags-chip"),i)),attachChipListeners($("#sp-tag-input"),$("#sp-tags-chip")),n&&onSharedSkillChange(n,e)}function onSharedSkillChange(t,e){const n=$("#sp-skill-form");if(!n)return;if(!t){n.innerHTML="";return}let i="";if(t==="reading"?i=`${contentComposerHtml("N\u1ED9i dung \u0111\u1EC1")}${answerGridHtml()}${vocabSectionHtml()}`:t==="listening"?i=`
      <div class="form-group"><label class="form-label">File Audio <span style="color:var(--danger)">*</span></label>${audioUploadHtml()}</div>
      <div class="form-group" id="script-section">
        <label class="form-label">Script Listening</label>
        <textarea id="listening-script" class="form-textarea listening-script-editor" rows="8"
          placeholder="Script...">${escapeHtml(e?.script||"")}</textarea>
      </div>
      ${contentComposerHtml("C\xE2u h\u1ECFi (text)")}${answerGridHtml()}${vocabSectionHtml()}`:t==="writing"?i=`${contentComposerHtml("\u0110\u1EC1 b\xE0i Writing")}<div class="form-hint-box">\u2139\uFE0F Writing l\xE0 t\u1EF1 lu\u1EADn \u2014 kh\xF4ng c\u1EA7n nh\u1EADp \u0111\xE1p \xE1n m\u1EABu.</div>`:t==="speaking"&&(i=`${contentComposerHtml("C\xE2u h\u1ECFi / Cue Card")}<div class="form-hint-box">\u2139\uFE0F Speaking \u2014 h\u1ECDc sinh s\u1EBD upload file audio.</div>`),n.innerHTML=i,initContentComposer(e?.content_blocks||[],e?.content_text||""),(t==="reading"||t==="listening")&&Array.isArray(e?.questions_data)&&e.questions_data.length)renderAnswerGridWithData(e.questions_data);else{const s=$("#answer-count");s&&s.addEventListener("input",()=>{const o=parseInt(s.value)||0;o>0&&o<=100&&renderAnswerGrid(o)})}Array.isArray(e?.vocabulary)&&(_vocabItems=[...e.vocabulary],renderVocabList()),t==="listening"&&_renderAudioSlots()}window.onSharedSkillChange=onSharedSkillChange;async function submitSharedPoolQuestion(){const t=$("#sp-title")?.value.trim(),e=$("#sp-skill")?.value,n=$("#sp-time-limit")?.value.trim(),i=n?parseInt(n,10):null;if(!t){toast("Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1","error");return}if(!e){toast("Vui l\xF2ng ch\u1ECDn k\u1EF9 n\u0103ng","error");return}if(_contentImageUploadCount>0){toast("\u1EA2nh \u0111ang upload, vui l\xF2ng \u0111\u1EE3i xong r\u1ED3i l\u01B0u","warning");return}if(e==="listening"&&_audioSlots.filter(o=>o.status==="done").length===0&&!_sharedEditingId){toast("Vui l\xF2ng upload \xEDt nh\u1EA5t 1 file audio","error");return}const s=$("#sp-submit-btn");btnLoading(s);try{const o=getChipValues($("#sp-tags-chip")),a=normalizeContentBlocksForEditor(_contentBlocks),l=blocksToPlainText(a)||"";let r={title:t,skill:e,content_blocks:a,content_text:l,vocabulary:_vocabItems,tags:o};if(i&&(r.time_limit_minutes=i),(e==="reading"||e==="listening")&&(r.questions_data=collectAnswerGrid()),e==="listening"){const c=_audioSlots.filter(d=>d.status==="done");c.length>0&&(r.content_url=c[0]?.url||null,r.content_urls=c.map(d=>({url:d.url,key:d.key,name:d.displayName||d.name}))),r.script=($("#listening-script")?.value||"").trim()||null}_sharedEditingId?(await api.patch(`/shared-pool/${_sharedEditingId}`,r),stopSpDraftAutosave(),clearQuestionDraft(getSpDraftKey("edit",_sharedEditingId)),toast("\u0110\xE3 l\u01B0u thay \u0111\u1ED5i","success")):(await api.post("/shared-pool",r),stopSpDraftAutosave(),clearQuestionDraft(getSpDraftKey("new")),toast("\u0110\xE3 t\u1EA1o \u0111\u1EC1 luy\u1EC7n t\u1EADp! \u{1F389}","success")),navigate("/shared-pool")}catch(o){btnReset(s),toast("L\u1ED7i l\u01B0u \u0111\u1EC1: "+(o.error||o.message),"error")}}window.submitSharedPoolQuestion=submitSharedPoolQuestion;function renderSharedPoolStats(t,e){const n=$("#sp-stats-section");n&&(n.innerHTML=`
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
          </tbody></table></div>`}`)}window.showSharedPool=showSharedPool,window.showSharedPoolForm=showSharedPoolForm,window.showSharedPoolDetail=showSharedPoolDetail;let _cqSections=[],_cqEditingIdx=-1;function _cqSkillIcon(t){return{reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"}[t]||""}function _cqSkillLabel(t){return{reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking"}[t]||t}function _newCQSection(){return{label:"",skill:"",time_limit_minutes:null,questions_data:[],content_blocks:[],content_text:"",content_url:null,content_urls:[],script:"",vocabulary:[]}}function _saveCQCurrentEditorState(){if(_cqEditingIdx<0||!_cqSections[_cqEditingIdx])return;const t=_cqSections[_cqEditingIdx];t.label=document.getElementById("cq-label")?.value.trim()??t.label,t.time_limit_minutes=(()=>{const n=document.getElementById("cq-time")?.value;return n?Number(n):null})();const e=normalizeContentBlocksForEditor(_contentBlocks);if(t.content_blocks=e,t.content_text=blocksToPlainText(e)||"",(t.skill==="reading"||t.skill==="listening")&&(t.questions_data=collectAnswerGrid?collectAnswerGrid():[]),t.skill==="listening"){const n=_audioSlots.filter(i=>i.status==="done");t.content_url=n[0]?.url||null,t.content_urls=n.map(i=>({url:i.url,key:i.key,name:i.displayName||i.name,filename:i.name})),t.script=document.getElementById("listening-script")?.value.trim()??t.script}t.vocabulary=Array.isArray(_vocabItems)?[..._vocabItems]:[]}function _loadCQSectionIntoEditor(t){const e=_cqSections[t];_contentBlocks=(e.content_blocks||[]).map(n=>({...n})),_vocabItems=Array.isArray(e.vocabulary)?[...e.vocabulary]:[],_editingVocabIndex=-1,e.skill==="listening"&&(_audioSlots=(e.content_urls?.length?e.content_urls:e.content_url?[{url:e.content_url,key:null,name:"audio"}]:[]).map(i=>({displayName:i.name||"",file:null,name:i.filename||i.name||"",size:0,status:"done",url:i.url,key:i.key||null,pct:100,eta:null})),_audioSlots.length===0&&(_audioSlots=[_newAudioSlot()]),_audioFiles=_audioSlots,_audioUploading=!1)}function renderCQSectionsUI(){const t=document.getElementById("skill-section");if(!t)return;const e=_cqEditingIdx>=0,n=_cqSections.map((s,o)=>{if(o===_cqEditingIdx)return"";const a=[s.skill?`${_cqSkillIcon(s.skill)} ${_cqSkillLabel(s.skill)}`:"",s.time_limit_minutes?`\u23F1 ${s.time_limit_minutes} ph\xFAt`:"",(s.skill==="reading"||s.skill==="listening")&&s.questions_data?.length?`${s.questions_data.length} c\xE2u`:""].filter(Boolean).join(" \xB7 ");return`<div class="cq-section-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-card)">
      <div>
        <span style="font-weight:600;font-size:14px">${o+1}. ${escapeHtml(s.label||"(Ch\u01B0a \u0111\u1EB7t t\xEAn)")}</span>
        ${a?`<span style="font-size:12px;color:var(--gray-400);margin-left:8px">${a}</span>`:""}
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" onclick="editCQSection(${o})">\u270F\uFE0F S\u1EEDa</button>
        <button class="btn-icon danger" onclick="removeCQSection(${o})" aria-label="Xo\xE1 ph\u1EA7n n\xE0y">\xD7</button>
      </div>
    </div>`}).join("");let i="";if(e){const s=_cqSections[_cqEditingIdx];let o="";s.skill==="reading"?o=`${contentComposerHtml("N\u1ED9i dung \u0111\u1EC1 (B\xE0i \u0111\u1ECDc + C\xE2u h\u1ECFi)")}
        <div id="location-pick-hint" class="location-pick-hint hidden"></div>
        ${answerGridHtml()}`:s.skill==="listening"?o=`<div class="form-group"><label class="form-label">File Audio <span style="color:var(--danger)">*</span></label>${audioUploadHtml()}</div>
        <div class="form-group" id="script-section">
          <label class="form-label">Script Listening</label>
          ${sttSelectorHtml()}
          <div id="script-loading" class="script-loading hidden"><span class="btn-spinner btn-spinner--dark"></span> <span id="script-loading-msg">\u0110ang tr\xEDch xu\u1EA5t script...</span></div>
          <textarea id="listening-script" class="form-textarea listening-script-editor" rows="6"
            placeholder="Script t\u1EF1 \u0111\u1ED9ng \u0111i\u1EC1n sau khi upload audio">${escapeHtml(s.script||"")}</textarea>
          ${speakerRenameSectionHtml()}
        </div>
        ${contentComposerHtml("C\xE2u h\u1ECFi (text)")}
        <div id="location-pick-hint" class="location-pick-hint hidden"></div>
        ${answerGridHtml()}`:s.skill==="writing"?o=`${contentComposerHtml("\u0110\u1EC1 b\xE0i Writing")}`:s.skill==="speaking"&&(o=`${contentComposerHtml("C\xE2u h\u1ECFi / Cue Card")}`),i=`
      <div class="cq-editor-panel" style="border:2px solid var(--primary);border-radius:10px;padding:16px;margin-bottom:10px;background:var(--bg-card)">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--primary)">
          \u270F\uFE0F Ch\u1EC9nh s\u1EEDa ph\u1EA7n ${_cqEditingIdx+1}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div>
            <label class="form-label" style="font-size:12px">T\xEAn ph\u1EA7n *</label>
            <input id="cq-label" class="form-input" value="${escapeHtml(s.label)}" placeholder="VD: B\xE0i \u0111\u1ECDc 1" />
          </div>
          <div>
            <label class="form-label" style="font-size:12px">K\u1EF9 n\u0103ng *</label>
            <select id="cq-skill" class="form-select" onchange="onCQSkillChange(this.value)">
              <option value="">\u2014 Ch\u1ECDn \u2014</option>
              <option value="reading" ${s.skill==="reading"?"selected":""}>\u{1F4D6} Reading</option>
              <option value="listening" ${s.skill==="listening"?"selected":""}>\u{1F3A7} Listening</option>
              <option value="writing" ${s.skill==="writing"?"selected":""}>\u270D\uFE0F Writing</option>
              <option value="speaking" ${s.skill==="speaking"?"selected":""}>\u{1F3A4} Speaking</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size:12px">Th\u1EDDi gian (ph\xFAt)</label>
            <input id="cq-time" class="form-input" type="number" min="1" max="300"
              value="${s.time_limit_minutes??""}" placeholder="Kh\xF4ng gi\u1EDBi h\u1EA1n" />
          </div>
        </div>
        <div id="cq-skill-content">${s.skill?o:'<div style="color:var(--gray-400);font-size:13px;padding:12px;text-align:center">Ch\u1ECDn k\u1EF9 n\u0103ng \u0111\u1EC3 hi\u1EC3n th\u1ECB form</div>'}</div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button class="btn btn-outline" onclick="cancelCQEdit()">H\u1EE7y</button>
          <button class="btn btn-primary" onclick="saveCQSection()">\u{1F4BE} L\u01B0u ph\u1EA7n n\xE0y</button>
        </div>
      </div>`}if(t.innerHTML=`
    <div style="margin-bottom:10px;font-weight:600;font-size:14px">C\xE1c ph\u1EA7n thi <span style="color:var(--danger)">*</span></div>
    ${i}
    <div id="cq-list">${n||(e?"":'<div style="text-align:center;padding:20px;color:var(--gray-400);border:2px dashed var(--border);border-radius:8px">Nh\u1EA5n "+ Th\xEAm k\u1EF9 n\u0103ng" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u</div>')}</div>
    ${e?"":'<button class="btn btn-outline" style="margin-top:10px" onclick="addCQSection()">+ Th\xEAm k\u1EF9 n\u0103ng</button>'}
  `,e){const s=_cqSections[_cqEditingIdx];if(initContentComposer(s.content_blocks||[],""),s.skill==="listening"&&_renderAudioSlots(),s.skill==="reading"||s.skill==="listening"){s.questions_data?.length>0&&renderAnswerGridWithData(s.questions_data);const o=document.getElementById("answer-count");o&&o.addEventListener("input",()=>{const a=parseInt(o.value)||0;a>0&&a<=100&&renderAnswerGrid(a)})}renderVocabList&&renderVocabList(),syncVocabEditorState&&syncVocabEditorState()}}window.renderCQSectionsUI=renderCQSectionsUI;function addCQSection(){_saveCQCurrentEditorState(),_cqSections.push(_newCQSection()),_cqEditingIdx=_cqSections.length-1,_contentBlocks=[],_vocabItems=[],_editingVocabIndex=-1,_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioUploading=!1,renderCQSectionsUI()}window.addCQSection=addCQSection;function editCQSection(t){_saveCQCurrentEditorState(),_cqEditingIdx=t,_loadCQSectionIntoEditor(t),renderCQSectionsUI()}window.editCQSection=editCQSection;function saveCQSection(){const t=document.getElementById("cq-label");if(!t||!t.value.trim()){toast("Vui l\xF2ng \u0111\u1EB7t t\xEAn ph\u1EA7n thi","error");return}const e=document.getElementById("cq-skill");if(!e?.value){toast("Vui l\xF2ng ch\u1ECDn k\u1EF9 n\u0103ng","error");return}_cqSections[_cqEditingIdx].skill=e.value,_saveCQCurrentEditorState(),_cqEditingIdx=-1,_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,renderCQSectionsUI()}window.saveCQSection=saveCQSection;function cancelCQEdit(){_cqSections[_cqEditingIdx]?.skill===""&&_cqSections.splice(_cqEditingIdx,1),_cqEditingIdx=-1,_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,renderCQSectionsUI()}window.cancelCQEdit=cancelCQEdit;function removeCQSection(t){_cqEditingIdx===t?(_cqEditingIdx=-1,_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots):_cqEditingIdx>t&&_cqEditingIdx--,_cqSections.splice(t,1),renderCQSectionsUI()}window.removeCQSection=removeCQSection;function onCQSkillChange(t){_cqEditingIdx<0||(_saveCQCurrentEditorState(),_cqSections[_cqEditingIdx].skill=t,_cqSections[_cqEditingIdx].questions_data=[],_cqSections[_cqEditingIdx].content_blocks=[],_cqSections[_cqEditingIdx].content_url=null,_cqSections[_cqEditingIdx].content_urls=[],_cqSections[_cqEditingIdx].script="",_contentBlocks=[],_vocabItems=[],_audioSlots=[_newAudioSlot()],_audioFiles=_audioSlots,_audioUploading=!1,renderCQSectionsUI())}window.onCQSkillChange=onCQSkillChange;async function showCompositeSubmissions({id:t}){setLoading("\u0110ang t\u1EA3i \u0111\u1EC1 t\u1ED5ng h\u1EE3p...");const e=routeToken();try{const n=await api.get(`/assignments/${t}/composite-submissions`);if(routeChanged(e))return;renderCompositeSubmissions(n)}catch(n){if(routeChanged(e))return;renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u",n,"/classes")}}window.showCompositeSubmissions=showCompositeSubmissions;function renderCompositeSubmissions({assignment:t,sections:e,perStudent:n}){const i=t,s=t?.id||"",o={reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"},a=e.length,l=n.length===0?`<tr><td colspan="${a+2}" style="text-align:center;padding:24px;color:var(--gray-400)">L\u1EDBp ch\u01B0a c\xF3 h\u1ECDc sinh</td></tr>`:n.map(r=>{const c=e.map(d=>{const u=r.sections.find(b=>b.section_id===d.id)?.submission;if(!u)return'<td style="text-align:center;color:var(--gray-400)">\u2014</td>';const m=u.score!=null?`<span style="font-weight:700;color:var(--primary)">${u.score}/9</span>`:`<span style="color:var(--gray-400);font-size:12px">${d.skill==="reading"||d.skill==="listening"?"\u2014":"Ch\u1EDD ch\u1EA5m"}</span>`,h=u.is_overtime?'<span class="stats-overtime-pill" style="display:block;font-size:10px;margin-top:2px">OT</span>':"",g=d.skill==="writing"||d.skill==="speaking"?`<button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 6px;margin-top:2px"
                onclick="navigate('/grading/${u.id}')">Ch\u1EA5m</button>`:"";return`<td style="text-align:center">${m}${h}${g}</td>`}).join("");return`<tr>
          <td>
            <div style="font-weight:600">${escapeHtml(r.full_name)}</div>
            <div style="font-size:11px;color:var(--gray-400);font-family:monospace">${escapeHtml(r.username)}</div>
          </td>
          ${c}
          <td style="text-align:center;font-size:12px;color:var(--gray-400)">
            ${r.sections.filter(d=>d.submission).length}/${a} ph\u1EA7n
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
          ${e.map(r=>`<th style="text-align:center;min-width:110px">${o[r.skill]||""} ${escapeHtml(r.label)}</th>`).join("")}
          <th style="text-align:center">Ti\u1EBFn \u0111\u1ED9</th>
        </tr></thead>
        <tbody>${l}</tbody>
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
    </div>`)}window.openCompositeSubmissionGrading=openCompositeSubmissionGrading;async function saveCompositeGrading(t){const e=document.getElementById("composite-grade-score")?.value,n=document.getElementById("composite-grade-feedback")?.value.trim()||"",i=e!==""&&e!=null?parseFloat(e):null;if(i!==null&&(isNaN(i)||i<0||i>9)){toast("\u0110i\u1EC3m Band ph\u1EA3i t\u1EEB 0 \u0111\u1EBFn 9","error");return}btnLoading(t);try{await api.patch(`/composite-section-submissions/${_gradingCompositeSubId}/score`,{score:i,feedback:n}),closeModal(),toast("\u0110\xE3 l\u01B0u nh\u1EADn x\xE9t! \u2713"),_gradingCompositeAssignId&&showCompositeSubmissions({id:_gradingCompositeAssignId})}catch(s){btnReset(t),toast("L\u1ED7i: "+(s.error||s.message),"error")}}window.saveCompositeGrading=saveCompositeGrading,window.submitLoginGate=submitLoginGate,window.toggleGatePassword=toggleGatePassword,window.logout=logout,window._onTeacherUnauthorized=()=>{expireTeacherSession("Phi\xEAn \u0111\u0103ng nh\u1EADp h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.")},window.addEventListener("pagehide",flushQuestionDraftSave),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot,{once:!0}):boot();
