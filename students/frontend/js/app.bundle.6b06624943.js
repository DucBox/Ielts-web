const API_BASE="https://ielts-teacher-api.quangducngo0811.workers.dev",API_CACHE_TTL_MS=1e4,API_CACHE_PREFIX="ielts_student_api_cache:",api={_token:null,_cache:new Map,_tokenScope(){if(!this._token)return"anon";let t=0;for(let e=0;e<this._token.length;e++)t=(t<<5)-t+this._token.charCodeAt(e)|0;return String(t>>>0)},_cacheKey(t){return`${API_CACHE_PREFIX}${this._tokenScope()}:${t}`},_readCache(t){const e=this._cacheKey(t),n=this._cache.get(e);if(n&&n.expires>Date.now())return n.data;try{const i=sessionStorage.getItem(e);if(!i)return null;const s=JSON.parse(i);return!s||s.expires<=Date.now()?(sessionStorage.removeItem(e),this._cache.delete(e),null):(this._cache.set(e,s),s.data)}catch{return null}},_writeCache(t,e){const n=this._cacheKey(t),i={expires:Date.now()+1e4,data:e};this._cache.set(n,i);try{sessionStorage.setItem(n,JSON.stringify(i))}catch{}},clearCache(){this._cache.clear();try{for(let t=sessionStorage.length-1;t>=0;t--){const e=sessionStorage.key(t);e&&e.startsWith(API_CACHE_PREFIX)&&sessionStorage.removeItem(e)}}catch{}},_authHeaders(t={}){const e={...t};return this._token&&(e.Authorization=`Bearer ${this._token}`),e},async _readJsonSafe(t){const e=await t.text();if(!e)return null;try{return JSON.parse(e)}catch{return{error:e}}},async _handle(t){if(t.status===401)throw window.dispatchEvent(new CustomEvent("auth:expired")),await this._readJsonSafe(t)||{error:"Unauthorized"};if(!t.ok)throw await this._readJsonSafe(t)||{error:"Request failed"};return this._readJsonSafe(t)},_fetchWithTimeout(t,e,n=3e4){const i=new AbortController,s=setTimeout(()=>i.abort(),n);return fetch(t,{...e,signal:i.signal}).finally(()=>clearTimeout(s))},async get(t){const e=this._readCache(t);if(e)return e;const n=await this._fetchWithTimeout(API_BASE+t,{headers:this._authHeaders()}),i=await this._handle(n);return this._writeCache(t,i),i},async post(t,e){const n=await this._fetchWithTimeout(API_BASE+t,{method:"POST",headers:this._authHeaders({"Content-Type":"application/json"}),body:JSON.stringify(e)}),i=await this._handle(n);return this.clearCache(),i},async postForm(t,e){const n=await fetch(API_BASE+t,{method:"POST",headers:this._authHeaders(),body:e}),i=await this._handle(n);return this.clearCache(),i},async patch(t,e){const n=await this._fetchWithTimeout(API_BASE+t,{method:"PATCH",headers:this._authHeaders({"Content-Type":"application/json"}),body:JSON.stringify(e)}),i=await this._handle(n);return this.clearCache(),i},async delete(t){const e=await this._fetchWithTimeout(API_BASE+t,{method:"DELETE",headers:this._authHeaders()}),n=await this._handle(e);return this.clearCache(),n}};function $(t){return document.querySelector(t)}function escapeHtml(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function renderMarkdownInline(t){return escapeHtml(t).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*\n]+)\*/g,"<em>$1</em>")}function renderSafeMarkdown(t){const e=String(t||"").replace(/\r\n/g,`
`).split(`
`),n=[];let i=null;const s=()=>{i&&(n.push(`</${i}>`),i=null)};for(const a of e){const o=a.trim();if(!o){s();continue}const l=o.match(/^[-*]\s+(.+)$/),d=o.match(/^\d+\.\s+(.+)$/);if(l||d){const p=l?"ul":"ol";i!==p&&(s(),n.push(`<${p}>`),i=p),n.push(`<li>${renderMarkdownInline((l||d)[1])}</li>`);continue}s();const c=o.match(/^(#{2,4})\s+(.+)$/);c?n.push(`<h5>${renderMarkdownInline(c[2])}</h5>`):n.push(`<p>${renderMarkdownInline(o)}</p>`)}return s(),n.join("")}function btnReset(t){t&&(t.disabled=!1,t.innerHTML=t._origHTML||t.innerHTML)}function toast(t,e="success"){const n=e==="error"?6e3:3500,i=document.createElement("div");i.className=`toast toast-${e}`,i.setAttribute("role","alert");const s=document.createElement("span");s.textContent=t;const a=document.createElement("button");a.className="toast-close",a.setAttribute("aria-label","\u0110\xF3ng th\xF4ng b\xE1o"),a.textContent="\xD7",a.onclick=()=>i.remove(),i.appendChild(s),i.appendChild(a),i.addEventListener("mouseenter",()=>i.classList.add("toast-paused")),i.addEventListener("mouseleave",()=>i.classList.remove("toast-paused")),$("#toast-container").appendChild(i);const o=setTimeout(()=>i.remove(),n);i.addEventListener("mouseenter",()=>clearTimeout(o)),i.addEventListener("mouseleave",()=>setTimeout(()=>i.remove(),1e3))}function setLoading(t="\u0110ang t\u1EA3i..."){$("#app").innerHTML=`
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>${t}</p>
    </div>`}function formatDateTime(t){return t?new Date(t).toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"Kh\xF4ng c\xF3 h\u1EA1n"}function isOverdue(t){return t?new Date(t)<new Date:!1}function makeSortIcon(t,e,n){return e!==t?'<span class="sort-icon">\u2195</span>':`<span class="sort-icon active">${n==="asc"?"\u2191":"\u2193"}</span>`}window.makeSortIcon=makeSortIcon;function sanitizeBlockHtml(t){if(!t||typeof t!="string")return"";const e=document.createElement("div");e.innerHTML=t;const n=/^(javascript:|vbscript:|data:text\/html)/i;return e.querySelectorAll("script,style,iframe,object,embed,form,base,meta,link").forEach(i=>i.remove()),e.querySelectorAll("*").forEach(i=>{for(const s of[...i.attributes]){const a=s.name.toLowerCase();if(/^on\w+$/.test(a)||a.includes(":")||a==="action"||a==="formaction"){i.removeAttribute(s.name);continue}(a==="href"||a==="src"||a==="srcset")&&n.test(s.value.trim())&&i.removeAttribute(s.name)}}),e.innerHTML}function upsertStickyToast(t,e,n="info"){const i=$("#toast-container");if(!i)return null;let s=i.querySelector(`.toast[data-toast-id="${t}"]`);return s||(s=document.createElement("div"),s.dataset.toastId=t,i.appendChild(s)),s.className=`toast toast-${n} toast-sticky`,s.innerHTML=e,s}function removeStickyToast(t){document.querySelector(`.toast[data-toast-id="${t}"]`)?.remove()}function btnLoading(t){t&&(t._origHTML=t.innerHTML,t.disabled=!0,t.innerHTML='<span class="btn-spinner"></span> \u0110ang x\u1EED l\xFD...')}function formatCountdown(t){if(!t)return null;const e=new Date(t)-new Date;if(e<=0)return null;const n=Math.floor(e/864e5),i=Math.floor(e%864e5/36e5),s=Math.floor(e%36e5/6e4);return n>0?`\u23F0 C\xF2n ${n} ng\xE0y ${i} gi\u1EDD`:i>0?`\u23F0 C\xF2n ${i} gi\u1EDD ${s} ph\xFAt`:`\u23F0 C\xF2n ${s} ph\xFAt`}function countWords(t){return(t||"").trim().split(/\s+/).filter(Boolean).length}function bandColor(t){const e=parseFloat(t);return e>=7?"#16a34a":e>=5.5?"#ca8a04":"#dc2626"}function renderAiCriterionCard(t,e,n,i){const s=bandColor(n);let a;return i&&typeof i=="object"?a=a=`<div class="ai-criterion-sections">${[i.band_justification?`<div class="ai-section-label">L\xDD DO BAND</div><div class="ai-section-body">${renderSafeMarkdown(i.band_justification)}</div>`:"",i.strengths?`<div class="ai-section-label">\u0110I\u1EC2M M\u1EA0NH</div><div class="ai-section-body">${renderSafeMarkdown(i.strengths)}</div>`:"",i.errors?`<div class="ai-section-label">L\u1ED6I & \u0110I\u1EC2M Y\u1EBEU</div><div class="ai-section-body">${renderSafeMarkdown(i.errors)}</div>`:"",i.tips?`<div class="ai-section-label">G\u1EE2I \xDD C\u1EA2I THI\u1EC6N</div><div class="ai-section-body">${renderSafeMarkdown(i.tips)}</div>`:""].filter(Boolean).join("")}</div>`:a=`<div class="ai-criterion-body">${renderSafeMarkdown(String(i||""))}</div>`,`<div class="ai-criterion-card">
    <div class="ai-criterion-head">
      <span class="ai-criterion-title">${t} ${escapeHtml(e)}</span>
      <span class="ai-band-chip" style="--chip-color:${s}">${n??"\u2014"}/9</span>
    </div>
    ${a}
  </div>`}function renderAiAdviceCard(t,e,n){return`<div class="ai-criterion-card ai-advice-card">
    <div class="ai-criterion-head">
      <span class="ai-criterion-title">${t} ${escapeHtml(e)}</span>
      <span class="ai-advice-label">L\u1EDDi khuy\xEAn</span>
    </div>
    <div class="ai-criterion-body">${renderSafeMarkdown(n)}</div>
  </div>`}function repairImageTokensInBlocks(t){let e=0;function n(){return`cb-repair-${++e}`}const i=[];for(const o of t){let c=function(){const r=d.innerHTML.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi,"").trim();r&&i.push({id:n(),type:"text",html:r,text:""}),d=document.createElement("div")},p=function(r){r.nodeType===Node.ELEMENT_NODE&&r.classList?.contains("document-editor-image-token")?(c(),i.push({id:r.dataset.blockId||n(),type:"image",url:r.dataset.url||"",alt:r.dataset.alt||"",width:Math.max(1,Number(r.dataset.width)||100)})):r.nodeType===Node.ELEMENT_NODE&&r.querySelector?.(".document-editor-image-token")?r.childNodes.forEach(m=>p(m)):d.appendChild(r.cloneNode(!0))};var s=c,a=p;if(o.type!=="text"||!o.html?.includes("document-editor-image-token")){i.push(o);continue}const l=document.createElement("div");l.innerHTML=o.html;let d=document.createElement("div");l.childNodes.forEach(r=>p(r)),c()}return i}function normalizeIndentMarkupHtml(t=""){if(!t)return"";const e=document.createElement("div");e.innerHTML=String(t);const n=new Set(["DIV","P","LI","H1","H2","H3","H4","H5","H6","BLOCKQUOTE","PRE"]),i=o=>Array.from({length:Math.max(1,Number(o)||1)},()=>'<span class="document-editor-indent" contenteditable="false" data-indent="1">&nbsp;</span>').join(""),s=(o="")=>{let l=0,d=0,c=0;for(;d<o.length;){const p=o[d];if(p==="	"){if(c)break;l+=1,d+=1;continue}if(p===" "||p==="\xA0"){c+=1,d+=1,c===4&&(l+=1,c=0);continue}break}return d-=c,{units:l,consumedChars:d}},a=o=>{if(!o?.childNodes)return!0;let l=!0;return Array.from(o.childNodes).forEach(d=>{if(d.nodeType===Node.TEXT_NODE){const c=String(d.textContent||"");if(l&&c){const{units:p,consumedChars:r}=s(c);if(p>0){const m=document.createDocumentFragment();m.appendChild(document.createRange().createContextualFragment(i(p)));const u=c.slice(r);u&&m.appendChild(document.createTextNode(u)),d.replaceWith(m),l=!u||!/[^\s\u00a0]/.test(u);return}}/[^\s\u00a0]/.test(c)&&(l=!1);return}if(d.nodeType===Node.ELEMENT_NODE){if(d.tagName==="BR"){l=!0;return}if(!d.classList.contains("document-editor-indent")){if(n.has(d.tagName)){a(d),l=!0;return}l=a(d)}}}),l};return e.querySelectorAll("span").forEach(o=>{const l=String(o.textContent||"").replace(/ /g,"").replace(/\n/g,""),d=l&&/^[\u00a0\t]+$/.test(l),c=/display\s*:\s*inline-block/i.test(o.getAttribute("style")||"");if(!o.classList.contains("document-editor-indent")&&!(c&&d))return;const p=Math.max(1,Math.round(l.length/4)||1);o.replaceWith(document.createRange().createContextualFragment(i(p)))}),a(e),e.innerHTML}function normalizeQuestionContentBlocks(t,e=""){const i=repairImageTokensInBlocks(Array.isArray(t)?t:[]).map((s,a)=>s?.type==="image"&&s?.url?{id:s.id||`cb-${a+1}`,type:"image",url:s.url,alt:s.alt||"",width:Number(s.width)||100}:{id:s?.id||`cb-${a+1}`,type:"text",html:normalizeIndentMarkupHtml(s?.html??(s?.text?escapeHtml(String(s.text)):"")),text:String(s?.text||"")}).filter(Boolean);return i.length>0?i:[{id:"fallback-text",type:"text",html:escapeHtml(e||""),text:e||""}]}function renderQuestionContentHTML(t,e="",n=""){const i=normalizeQuestionContentBlocks(t,e);return`
    <div class="mixed-content ${n}">
      ${i.map(s=>s.type==="image"?`<figure class="mixed-content-image-wrap" data-block-id="${escapeHtml(s.id)}" style="width:${Math.max(1,Number(s.width)||100)}%"><img class="mixed-content-image" src="${escapeHtml(s.url)}" alt="${escapeHtml(s.alt||"Question image")}" /></figure>`:`<div class="mixed-content-text" data-block-id="${escapeHtml(s.id)}">${sanitizeBlockHtml(s.html??"")||escapeHtml(s.text||"")}</div>`).join("")}
    </div>`}let _modalPreviousFocus=null;const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';function openModal(t,e){const n=document.getElementById("modal-overlay"),i=n?.querySelector(".modal-shell"),s=document.getElementById("modal-title"),a=document.getElementById("modal-body");if(!n||!s||!a)return;_modalPreviousFocus=document.activeElement,s.textContent=t,a.innerHTML=e,n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true"),n.setAttribute("aria-labelledby","modal-title"),n.classList.remove("hidden");const o=(i||n).querySelector(FOCUSABLE);o&&o.focus()}function closeModal(t){const e=document.getElementById("modal-overlay"),n=document.getElementById("modal-body");e&&(t&&t.target!==e||(window._modalCloseCallback&&(window._modalCloseCallback(),window._modalCloseCallback=null),e.classList.add("hidden"),n&&(n.innerHTML=""),_modalPreviousFocus&&(_modalPreviousFocus.focus(),_modalPreviousFocus=null)))}document.addEventListener("keydown",t=>{const e=document.getElementById("modal-overlay");if(!e||e.classList.contains("hidden"))return;const n=e.querySelector(".modal-shell")||e;if(t.key==="Escape"){closeModal();return}if(t.key==="Tab"){const i=[...n.querySelectorAll(FOCUSABLE)];if(!i.length)return;const s=i[0],a=i[i.length-1];(t.shiftKey?document.activeElement===s:document.activeElement===a)&&(t.preventDefault(),(t.shiftKey?a:s).focus())}});function syncPasswordToggleButton(t,e){if(!t||!e)return;const n=e.type==="text";t.textContent=n?"\u{1F441}\uFE0F":"\u{1F648}",t.title=n?"\u1EA8n m\u1EADt kh\u1EA9u":"Hi\u1EC7n m\u1EADt kh\u1EA9u",t.setAttribute("aria-label",n?"\u1EA8n m\u1EADt kh\u1EA9u":"Hi\u1EC7n m\u1EADt kh\u1EA9u"),t.dataset.visible=n?"1":"0"}function togglePasswordVisibility(t,e="login-password"){const n=document.getElementById(e);n&&(n.type=n.type==="password"?"text":"password",syncPasswordToggleButton(t||document.querySelector(`[data-toggle-password="${e}"]`),n))}function getStudentPasswordValidationError(t){const e=String(t||"");return e.length<6?"M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 6 k\xFD t\u1EF1.":/\p{L}/u.test(e)?/\p{N}/u.test(e)?/[^\p{L}\p{N}\s]/u.test(e)?"":"M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 1 k\xFD t\u1EF1 \u0111\u1EB7c bi\u1EC7t.":"M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 1 s\u1ED1.":"M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 1 ch\u1EEF c\xE1i."}const SKILL_ICONS={reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}",composite:"\u{1F4CB}"},SKILL_LABELS={reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking",composite:"T\u1ED5ng h\u1EE3p"},SKILL_ORDER=["reading","listening","writing","speaking"],FILTERABLE_ASSIGNMENT_SKILLS=["reading","listening","writing","speaking","composite"],CHART_RANGE_OPTIONS=[3,7,30,90,365],MISSING_EMAIL_TOAST_ID="student-missing-email";function skillBadge(t){return`<span class="badge badge-${t}">${SKILL_ICONS[t]||"?"} ${SKILL_LABELS[t]||t}</span>`}function getCompositeSectionsForAssignment(t){return Array.isArray(t?.composite_sections)?t.composite_sections:[]}function isCompositeAssignmentDone(t){const e=getCompositeSectionsForAssignment(t);return e.length>0&&e.every(n=>n.submitted)}function isCompositeAssignmentFullyGraded(t){const e=getCompositeSectionsForAssignment(t);return e.length>0&&e.every(n=>n.submitted&&n.score!=null)}function getCompositeAssignmentAverageScore(t){const e=getCompositeSectionsForAssignment(t).filter(n=>n.submitted&&n.score!=null).map(n=>Number(n.score)).filter(n=>Number.isFinite(n));return e.length>0?e.reduce((n,i)=>n+i,0)/e.length:null}function getHistorySourceItems(t){return(t||[]).filter(e=>e.skill==="composite"?isCompositeAssignmentDone(e):!!e.submission_id)}function getHistoryItemScore(t){return t.skill==="composite"?getCompositeAssignmentAverageScore(t):t.overall_score}function formatBandScore(t){const e=Number(t);return Number.isFinite(e)?e.toFixed(1):"\u2014"}function getHistoryItemHref(t){return t.skill==="composite"?`#/composite-result/${t.id}`:`#/result/${t.id}`}function modeBadgeHtml(t){return t==="practice"?'<span class="mode-badge mode-badge--practice">\u{1F3A7} Luy\u1EC7n t\u1EADp</span>':'<span class="mode-badge mode-badge--exam">\u{1F4DD} Ki\u1EC3m tra</span>'}function normalizeStudentEmailValue(t){return String(t||"").trim().toLowerCase()}function isValidStudentEmail(t){return/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(String(t||"").trim())}function getNotificationEmailField(t=window._cachedProfileData){return(t?.fields||[]).find(e=>e.field_key==="notification_email")||null}function getStudentNotificationEmail(t=window._cachedProfileData){const e=getNotificationEmailField(t),n=[_student?.email,t?.student?.email,e?t?.answers?.[e.id]:""];for(const i of n){const s=normalizeStudentEmailValue(i);if(s)return s}return""}function studentNeedsNotificationEmail(t=window._cachedProfileData){return!!_student&&!getStudentNotificationEmail(t)}function buildMissingEmailToastHtml(){return`
    <div class="toast-warning-title">\u26A0\uFE0F B\u1EA1n ch\u01B0a c\u1EADp nh\u1EADt Gmail</div>
    <div class="toast-warning-copy">H\xE3y v\xE0o h\u1ED3 s\u01A1 \u0111\u1EC3 th\xEAm Gmail nh\u1EADn m\u1EADt kh\u1EA9u m\u1EDBi v\xE0 email th\xF4ng b\xE1o t\u1EEB h\u1EC7 th\u1ED1ng.</div>
    <button type="button" class="toast-action-btn" onclick="navigate('/profile')">\u0110i t\u1EDBi h\u1ED3 s\u01A1</button>
  `}function syncMissingEmailUI(t=window._cachedProfileData){studentNeedsNotificationEmail(t)?upsertStickyToast(MISSING_EMAIL_TOAST_ID,buildMissingEmailToastHtml(),"warning"):removeStickyToast(MISSING_EMAIL_TOAST_ID)}let _student=null,_selectedClass=null,_assignmentSkillFilter="",_studentProfileSummaryPromise=null,_highlightMode=!1,_highlightColor="yellow";const HIGHLIGHT_COLORS={yellow:"#fef08a",green:"#bbf7d0",blue:"#bfdbfe",pink:"#fbcfe8"};let _vocabGameId=null,_vocabGameData=null,_fc=null,_match=null,_taskTimer=null,_taskStartTime=0,_autoSaveTimer=null,_assignCountdownInterval=null,_assignSecsLeft=0,_assignCountdownCtx=null,_autoSaveFn=null,_autoSaveDebounceTimer=null,_flaggedSet=new Set,_activeAssignmentId=null,_waveformAnim=null,_audioCtx=null;const ASSIGNMENT_DRAFT_TTL_MS=15*60*1e3,ASSIGNMENT_AUTOSAVE_INTERVAL_MS=15*1e3,ASSIGNMENT_AUTOSAVE_DEBOUNCE_MS=800,ASSIGNMENTS_STORE_TTL_MS=60*1e3;let _assignmentsStore={key:"",data:null,fetchedAt:0,promise:null};function currentAssignmentsStoreKey(){return!_student?.id||!_selectedClass?.id?"":`${_student.id}:${_selectedClass.id}`}function syncAssignmentsCache(t){window._cachedAssignments=t;const e=currentAssignmentsStoreKey();return e&&(_assignmentsStore={key:e,data:t,fetchedAt:Date.now(),promise:null}),t}function invalidateAssignmentsCache(t=!1){_assignmentsStore={key:currentAssignmentsStoreKey(),data:t?null:_assignmentsStore.data,fetchedAt:0,promise:null},t&&(window._cachedAssignments=null)}async function getAssignments(t={}){const{force:e=!1,ttlMs:n=ASSIGNMENTS_STORE_TTL_MS}=t,i=currentAssignmentsStoreKey();if(!i)return[];if(_assignmentsStore.key!==i&&(_assignmentsStore={key:i,data:null,fetchedAt:0,promise:null}),!e&&_assignmentsStore.data&&Date.now()-_assignmentsStore.fetchedAt<n)return window._cachedAssignments=_assignmentsStore.data,_assignmentsStore.data;if(!e&&_assignmentsStore.promise)return _assignmentsStore.promise;const s=api.get(`/student/assignments?student_id=${_student.id}&class_id=${_selectedClass.id}`).then(a=>syncAssignmentsCache(a)).catch(a=>{throw _assignmentsStore.promise=null,a});return _assignmentsStore.promise=s,s}function draftKey(t,e="answers"){return`ielts_draft:${_student?.id||"anon"}:${t}:${e}`}function pruneStudentDrafts(){const t="ielts_draft:";try{for(let e=localStorage.length-1;e>=0;e--){const n=localStorage.key(e);if(!(!n||!n.startsWith(t)))try{const i=localStorage.getItem(n);if(!i)continue;const s=JSON.parse(i);(!s?.expiresAt||s.expiresAt<=Date.now())&&localStorage.removeItem(n)}catch{localStorage.removeItem(n)}}}catch{}}function saveDraft(t,e,n){const i=Date.now();try{localStorage.setItem(draftKey(t,e),JSON.stringify({data:n,savedAt:i,expiresAt:i+ASSIGNMENT_DRAFT_TTL_MS}))}catch{}}function loadDraft(t,e="answers"){try{const n=localStorage.getItem(draftKey(t,e));if(!n)return null;const i=JSON.parse(n);return!i?.expiresAt||i.expiresAt<=Date.now()?(localStorage.removeItem(draftKey(t,e)),null):i}catch{try{localStorage.removeItem(draftKey(t,e))}catch{}return null}}function clearAllDrafts(t){for(const e of["answers","writing","flags","notes","startedAt"])try{localStorage.removeItem(draftKey(t,e))}catch{}}let _notifPanelOpen=!1,_notifPollTimer=null,_notifPreviousFocus=null,_mobileNavPreviousFocus=null;function notifDaysLabel(t){return t<=0?{text:"h\xF4m nay",cls:"urgent"}:t===1?{text:"1 ng\xE0y",cls:"warn"}:t===2?{text:"2 ng\xE0y",cls:"caution"}:{text:`${t} ng\xE0y`,cls:""}}function notifTimeAgo(t){const e=Date.now()-new Date(t).getTime(),n=Math.floor(e/6e4),i=Math.floor(e/36e5),s=Math.floor(e/864e5);return n<2?"v\u1EEBa xong":n<60?`${n} ph\xFAt tr\u01B0\u1EDBc`:i<24?`${i} gi\u1EDD tr\u01B0\u1EDBc`:`${s} ng\xE0y tr\u01B0\u1EDBc`}function renderNotifItem(t){const e=t.metadata||{};let n="\u{1F514}",i="",s="",a="",o="";const l=e.skill?`<span class="badge badge-${e.skill} notif-skill-badge">${SKILL_ICONS[e.skill]||""} ${SKILL_LABELS[e.skill]||""}</span> `:"";if(t.type==="score_released")n="\u{1F4CA}",o=`/result/${t.ref_id}`,i=`${l}B\xE0i <strong>${escapeHtml(e.title||"")}</strong> \u0111\xE3 c\xF3 \u0111i\u1EC3m: <strong>${e.score??"?"} Band</strong>`,s=notifTimeAgo(t.created_at);else if(t.type==="deadline_reminder"){n="\u23F0",o=`/assignment/${t.ref_id}`;const p=notifDaysLabel(e.days_left??99);a=p.cls,i=`${l}B\xE0i <strong>${escapeHtml(e.title||"")}</strong> c\xF2n <strong>${p.text}</strong> t\u1EDBi h\u1EA1n`,s=notifTimeAgo(t.created_at)}else if(t.type==="new_assignment"){n="\u{1F4DD}",o=`/assignment/${t.ref_id}`;const p=e.deadline?` \xB7 H\u1EA1n: ${new Date(e.deadline).toLocaleDateString("vi-VN")}`:"";i=`${l}B\xE0i m\u1EDBi: <strong>${escapeHtml(e.title||"")}</strong>`,s=notifTimeAgo(t.created_at)+p}const d=t.is_read?"notif-item--read":"notif-item--unread",c=t.is_read?"":'<button class="notif-btn-read" onclick="markNotifRead(this);event.stopPropagation()" title="\u0110\xE1nh d\u1EA5u \u0111\xE3 \u0111\u1ECDc">\u2713</button>';return`
    <div class="notif-item ${d} ${a?"notif-item--"+a:""}"
         data-notif-id="${escapeHtml(String(t.id))}"
         data-nav-url="${escapeHtml(o)}">
      <div class="notif-item-icon">${n}</div>
      <div class="notif-item-body" onclick="navigateFromNotif(this.closest('.notif-item').dataset.navUrl)" role="button" tabindex="0">
        <div class="notif-item-title">${i}</div>
        <div class="notif-item-desc">${escapeHtml(s)}</div>
      </div>
      <div class="notif-item-btns">
        ${c}
        <button class="notif-btn-delete" onclick="deleteNotif(this);event.stopPropagation()" title="X\xF3a" aria-label="X\xF3a th\xF4ng b\xE1o">\u2715</button>
      </div>
    </div>`}function navigateFromNotif(t){closeNotifPanel(),t&&navigate(t)}async function markNotifRead(t){const e=t.closest(".notif-item"),n=e?.dataset.notifId;if(n){t.disabled=!0;try{await api.patch(`/student/notifications/${n}/read`,{}),e.classList.remove("notif-item--unread"),e.classList.add("notif-item--read"),t.remove(),await refreshNotifBadge()}catch{t.disabled=!1}}}async function deleteNotif(t){const e=t.closest(".notif-item"),n=e?.dataset.notifId;if(n){t.disabled=!0;try{const i=e.classList.contains("notif-item--unread");await api.delete(`/student/notifications/${n}`),e.remove();const s=document.getElementById("notif-list");s&&!s.querySelector(".notif-item")&&(s.innerHTML='<div class="notif-empty">Kh\xF4ng c\xF3 th\xF4ng b\xE1o n\xE0o</div>'),i&&await refreshNotifBadge()}catch{t.disabled=!1}}}async function markAllNotifsRead(){try{const t=_selectedClass?.id;if(!t)return;await api.patch(`/student/notifications/read-all?class_id=${encodeURIComponent(t)}`,{}),document.querySelectorAll(".notif-item--unread").forEach(e=>{e.classList.remove("notif-item--unread"),e.classList.add("notif-item--read"),e.querySelector(".notif-btn-read")?.remove()}),await refreshNotifBadge()}catch{}}async function refreshNotifBadge(){try{const t=_selectedClass?.id;if(!t)return 0;const e=await api.get(`/student/notifications/count?class_id=${encodeURIComponent(t)}`).catch(()=>({count:0})),n=document.getElementById("notif-badge");if(!n)return 0;const i=e.count||0;return i>0?(n.textContent=i>99?"99+":String(i),n.classList.remove("hidden")):n.classList.add("hidden"),i}catch{return 0}}let _notifToastShown=!1;function maybeShowNotifToast(t){t>0&&!_notifToastShown&&(_notifToastShown=!0,toast(`\u{1F514} B\u1EA1n c\xF3 ${t} th\xF4ng b\xE1o ch\u01B0a \u0111\u1ECDc`,"info"))}async function loadNotifPanel(){const t=document.getElementById("notif-list");if(t)try{const e=_selectedClass?.id;if(!e){t.innerHTML='<div class="notif-empty">Vui l\xF2ng ch\u1ECDn l\u1EDBp</div>';return}const n=await api.get(`/student/notifications?class_id=${encodeURIComponent(e)}`).catch(()=>[]);t.innerHTML=n.length?n.map(renderNotifItem).join(""):'<div class="notif-empty">Kh\xF4ng c\xF3 th\xF4ng b\xE1o n\xE0o</div>'}catch{t.innerHTML='<div class="notif-empty">Kh\xF4ng th\u1EC3 t\u1EA3i th\xF4ng b\xE1o</div>'}}function toggleNotifPanel(){_notifPanelOpen?closeNotifPanel():openNotifPanel()}function openNotifPanel(){const t=document.getElementById("notif-panel"),e=document.getElementById("notif-bell-btn");if(!t)return;_notifPreviousFocus=document.activeElement,_notifPanelOpen=!0,t.classList.remove("hidden"),t.setAttribute("aria-hidden","false"),e?.setAttribute("aria-expanded","true"),loadNotifPanel();const n=document.getElementById("notif-list");n&&(n.onscroll=()=>{const i=n.scrollHeight-n.scrollTop<=n.clientHeight+4;n.classList.toggle("at-bottom",i)}),requestAnimationFrame(()=>{t.querySelector(".notif-mark-all-btn, .notif-btn-read, .notif-btn-delete, .notif-item-body")?.focus()})}function closeNotifPanel(){const t=document.getElementById("notif-panel"),e=document.getElementById("notif-bell-btn");t&&(_notifPanelOpen=!1,t.classList.add("hidden"),t.setAttribute("aria-hidden","true"),e?.setAttribute("aria-expanded","false"),_notifPreviousFocus instanceof HTMLElement&&_notifPreviousFocus.focus(),_notifPreviousFocus=null)}async function syncNotifUIAfterSubmit(){await refreshNotifBadge(),_notifPanelOpen&&await loadNotifPanel()}function startNotifPolling(){if(_notifPollTimer){syncMissingEmailUI();return}refreshNotifBadge().then(t=>{maybeShowNotifToast(t),syncMissingEmailUI()}),_notifPollTimer=setInterval(()=>{refreshNotifBadge().then(()=>syncMissingEmailUI())},864e5)}function stopNotifPolling(){_notifPollTimer&&clearInterval(_notifPollTimer),_notifPollTimer=null}document.addEventListener("click",t=>{if(!_notifPanelOpen)return;const e=document.getElementById("notif-bell-wrap"),n=document.getElementById("notif-panel");!(e&&e.contains(t.target))&&!(n&&n.contains(t.target))&&closeNotifPanel()}),window.toggleNotifPanel=toggleNotifPanel,window.markNotifRead=markNotifRead,window.deleteNotif=deleteNotif,window.markAllNotifsRead=markAllNotifsRead,window.navigateFromNotif=navigateFromNotif;function startTaskTimer(t){let e=loadDraft(t,"startedAt");e||(e={data:Date.now()},saveDraft(t,"startedAt",Date.now())),_taskStartTime=e.data||Date.now();function n(){const i=document.getElementById("task-timer");if(!i){stopTaskTimer();return}const s=Math.max(0,Math.floor((Date.now()-_taskStartTime)/1e3)),a=Math.floor(s/60),o=s%60;i.textContent=`\u23F1 ${a}:${String(o).padStart(2,"0")}`}n(),_taskTimer&&clearInterval(_taskTimer),_taskTimer=setInterval(n,1e3)}function stopTaskTimer(){_taskTimer&&clearInterval(_taskTimer),_taskTimer=null}function startAutoSave(t){_autoSaveTimer&&clearInterval(_autoSaveTimer),_autoSaveFn=t,_autoSaveTimer=setInterval(()=>{try{_autoSaveFn?.()}catch{}},ASSIGNMENT_AUTOSAVE_INTERVAL_MS)}function stopAutoSave(){_autoSaveTimer&&clearInterval(_autoSaveTimer),_autoSaveDebounceTimer&&clearTimeout(_autoSaveDebounceTimer),_autoSaveTimer=null,_autoSaveFn=null,_autoSaveDebounceTimer=null}function scheduleAutoSave(t){_autoSaveFn=t,_autoSaveDebounceTimer&&clearTimeout(_autoSaveDebounceTimer),_autoSaveDebounceTimer=setTimeout(()=>{_autoSaveDebounceTimer=null;try{t()}catch{}},ASSIGNMENT_AUTOSAVE_DEBOUNCE_MS)}function flushAutoSave(){_autoSaveDebounceTimer&&(clearTimeout(_autoSaveDebounceTimer),_autoSaveDebounceTimer=null);try{_autoSaveFn?.()}catch{}}let _assignDeadlineTs=0;function startAssignmentCountdown(t,e){stopAssignmentCountdown(),_assignDeadlineTs=Date.now()+Math.floor(t)*1e3,_assignCountdownCtx=e,_assignSecsLeft=Math.floor(t),_updateAssignCountdownDisplay(),_assignCountdownInterval=setInterval(()=>{if(_assignSecsLeft=Math.max(0,Math.round((_assignDeadlineTs-Date.now())/1e3)),_updateAssignCountdownDisplay(),_assignSecsLeft<=0){const n=_assignCountdownCtx;stopAssignmentCountdown(),n?.onExpire?n.onExpire():autoSubmitAssignment(n)}},1e3)}function stopAssignmentCountdown(){_assignCountdownInterval&&(clearInterval(_assignCountdownInterval),_assignCountdownInterval=null),_assignCountdownCtx=null}function _updateAssignCountdownDisplay(){const t=document.getElementById("assign-countdown");if(!t)return;const e=Math.floor(_assignSecsLeft/60),n=_assignSecsLeft%60;t.textContent=`${String(e).padStart(2,"0")}:${String(n).padStart(2,"0")}`,t.classList.toggle("timer-urgent",_assignSecsLeft<=60)}function freezeExamInputs(){const t=document.querySelector(".assignment-page")||document.getElementById("app");t&&(t.querySelectorAll("input, textarea, select, button").forEach(e=>{e.disabled=!0}),t.querySelectorAll("[contenteditable]").forEach(e=>{e.contentEditable="false"}),t.style.pointerEvents="none")}async function autoSubmitAssignment(t){const{assignmentId:e,skill:n,qCount:i}=t||{};if(!e)return;freezeExamInputs(),toast("\u23F0 H\u1EBFt gi\u1EDD! \u0110ang t\u1EF1 \u0111\u1ED9ng n\u1ED9p b\xE0i...","warning");const s=document.getElementById("submit-btn");n==="reading"||n==="listening"?await submitAnswers(e,i,n,s,!0):n==="writing"?await submitWriting(e,s,!0):n==="speaking"&&await submitSpeaking(e,s,!0)}function showSavedIndicator(){const t=document.getElementById("save-indicator");if(!t)return;const e=new Date;t.textContent=`\u{1F4BE} \u0110\xE3 l\u01B0u ${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`,t.classList.add("show"),clearTimeout(t._t),t._t=setTimeout(()=>t.classList.remove("show"),1800)}function toggleFlag(t){_flaggedSet.has(t)?_flaggedSet.delete(t):_flaggedSet.add(t),document.querySelectorAll(`[data-flag-q="${t}"]`).forEach(e=>e.classList.toggle("flagged",_flaggedSet.has(t))),document.querySelectorAll(`[data-nav-q="${t}"]`).forEach(e=>e.classList.toggle("flagged",_flaggedSet.has(t))),_activeAssignmentId&&saveDraft(_activeAssignmentId,"flags",Array.from(_flaggedSet))}function updateNavigatorState(){document.querySelectorAll("[data-nav-q]").forEach(t=>{const e=t.dataset.navQ,n=document.getElementById(`ans-${e}`);t.classList.toggle("answered",!!n?.value?.trim())})}function jumpToQuestion(t){const e=document.getElementById(`ans-${t}`);e&&(e.focus(),e.scrollIntoView({behavior:"smooth",block:"center"}))}function buildQuestionNavigator(t,e){if(!t)return"";let n="";for(let a=1;a<=t;a++)n+=`<button class="q-nav-btn" data-nav-q="${a}" onclick="jumpToQuestion(${a})">${a}</button>`;const i=`note_${_student?.id||"anon"}_${e}`,s=(()=>{try{return localStorage.getItem(i)||""}catch{return""}})();return`
    <div class="q-navigator">
      <div class="q-nav-title">\u0110i\u1EC1u h\u01B0\u1EDBng c\xE2u h\u1ECFi</div>
      <div class="q-nav-grid">${n}</div>
      <div class="q-nav-legend">
        <span><span class="q-nav-dot answered"></span> \u0111\xE3 tr\u1EA3 l\u1EDDi</span>
        <span><span class="q-nav-dot flagged"></span> \u0111\xE1nh d\u1EA5u</span>
      </div>
    </div>
    <div class="note-panel">
      <button class="note-panel-toggle" onclick="toggleNotePanel(this)" type="button">
        \u{1F4DD} Ghi ch\xFA <span class="note-panel-arrow">\u25BC</span>
      </button>
      <div class="note-panel-body hidden">
        <textarea class="note-panel-textarea" id="note-area-${e}"
          placeholder="Ghi ch\xFA c\u1EE7a b\u1EA1n..."
          oninput="saveNotePanel('${e}')">${escapeHtml(s)}</textarea>
      </div>
    </div>`}function buildHighlightToolbar(){return`
    <div class="highlight-toolbar">
      <span class="hl-label">Highlight</span>
      ${[["yellow","\u{1F7E8}"],["green","\u{1F7E9}"],["blue","\u{1F7E6}"],["pink","\u{1FA77}"]].map(([e,n])=>`
        <button type="button" class="hl-btn ${_highlightColor===e?"hl-btn-active":""}"
          title="${e}" onclick="setHighlightColor('${e}')">${n}</button>`).join("")}
    </div>`}function escapeAttrJson(t){return escapeHtml(JSON.stringify(t||{}))}function setHighlightColor(t){HIGHLIGHT_COLORS[t]&&(_highlightColor=t,document.querySelectorAll(".highlight-toolbar .hl-btn").forEach(e=>e.classList.remove("hl-btn-active")),document.querySelectorAll(".highlight-toolbar .hl-btn").forEach(e=>{e.getAttribute("onclick")===`setHighlightColor('${t}')`&&e.classList.add("hl-btn-active")}))}function applyStudentHighlight(t="reading-text"){const e=window.getSelection();if(!e||e.isCollapsed||!e.rangeCount)return;const n=e.getRangeAt(0),i=document.getElementById(t);if(!i||!i.contains(n.commonAncestorContainer))return;const s=document.createElement("mark");s.className=`student-highlight hl-${_highlightColor}`,s.dataset.color=_highlightColor;try{n.surroundContents(s),e.removeAllRanges()}catch{toast("Ch\u01B0a highlight \u0111\u01B0\u1EE3c \u0111o\u1EA1n n\xE0y. H\xE3y ch\u1ECDn g\u1ECDn trong m\u1ED9t \u0111o\u1EA1n text.","warning")}}function removeStudentHighlight(t){const e=t?.parentNode;if(e){for(;t.firstChild;)e.insertBefore(t.firstChild,t);e.removeChild(t),e.normalize()}}function bindReadingTextInteractions(t="reading-text"){const e=document.getElementById(t);e&&(e.addEventListener("click",n=>{const s=(n.target instanceof Element?n.target:n.target?.parentElement)?.closest?.("mark.student-highlight");!s||!e.contains(s)||(n.preventDefault(),n.stopPropagation(),removeStudentHighlight(s),window.getSelection()?.removeAllRanges())}),e.addEventListener("mouseup",()=>{setTimeout(()=>applyStudentHighlight(t),0)}))}function toggleNotePanel(t){const e=t.nextElementSibling,n=t.querySelector(".note-panel-arrow"),i=!e.classList.toggle("hidden");if(n&&(n.textContent=i?"\u25B2":"\u25BC"),i){const s=e.querySelector("textarea");s&&s.focus()}}window.toggleNotePanel=toggleNotePanel,window.setHighlightColor=setHighlightColor;function saveNotePanel(t){const e=document.getElementById(`note-area-${t}`);if(e)try{localStorage.setItem(`note_${_student?.id||"anon"}_${t}`,e.value)}catch{}}function renderListeningAudioHtml(t){const e=Array.isArray(t?.content_urls)&&t.content_urls.length>0?t.content_urls:t?.content_url?[{url:t.content_url,name:""}]:[];if(!e.length)return"";const n=e.length>1;return e.map((i,s)=>`
    <div class="audio-player-box">
      ${n?`<div class="audio-track-label">\u{1F3A7} ${escapeHtml(i.name||"File "+(s+1))}</div>`:'<span class="audio-player-icon">\u{1F3A7}</span>'}
      <audio controls src="${escapeHtml(i.url||"")}">Tr\xECnh duy\u1EC7t kh\xF4ng h\u1ED7 tr\u1EE3 audio.</audio>
      <div class="audio-replay-controls">
        <button class="btn-replay" onclick="audioSeekEl(this,-10)" title="L\xF9i 10s">\u23EA -10s</button>
        <button class="btn-replay" onclick="audioSeekEl(this,-5)"  title="L\xF9i 5s">\u25C0 -5s</button>
        <button class="btn-replay" onclick="audioSeekEl(this,5)"   title="T\u1EDBi 5s">+5s \u25B6</button>
        <button class="btn-replay" onclick="audioSeekEl(this,10)"  title="T\u1EDBi 10s">+10s \u23E9</button>
      </div>
    </div>`).join("")}function renderLockedListeningAudioHtml(t){const e=Array.isArray(t?.content_urls)&&t.content_urls.length>0?t.content_urls:t?.content_url?[{url:t.content_url,name:""}]:[];if(!e.length)return"";const n=e.length>1;return`
    <div class="listening-once-notice">
      <strong>L\u01B0u \xFD:</strong> B\xE0i nghe n\xE0y ch\u1EC9 \u0111\u01B0\u1EE3c nghe 1 l\u1EA7n cho m\u1ED7i audio v\xE0 s\u1EBD ph\xE1t li\xEAn t\u1EE5c \u0111\u1EBFn h\u1EBFt.
      B\u1EA1n kh\xF4ng th\u1EC3 t\u1EA1m d\u1EEBng, tua l\u1EA1i ho\u1EB7c thao t\xE1c \u0111i\u1EC1u khi\u1EC3n audio trong l\xFAc l\xE0m b\xE0i.
    </div>
    ${e.map((i,s)=>`
      <div class="audio-player-box audio-player-box--locked" data-locked-audio-box="${s}">
        ${n?`<div class="audio-track-label">\u{1F3A7} ${escapeHtml(i.name||"File "+(s+1))}</div>`:'<span class="audio-player-icon">\u{1F3A7}</span>'}
        <audio class="locked-audio" data-locked-audio="${s}" preload="metadata" playsinline
          controlslist="nodownload noplaybackrate noremoteplayback nofullscreen"
          disablepictureinpicture src="${escapeHtml(i.url||"")}">Tr\xECnh duy\u1EC7t kh\xF4ng h\u1ED7 tr\u1EE3 audio.</audio>
        <div class="locked-audio-shell">
          <div class="locked-audio-shell-icon">\u{1F3A7}</div>
          <div class="locked-audio-shell-main">
            <div class="locked-audio-progress-wrap">
              <div class="locked-audio-progress-bar">
                <div class="locked-audio-progress-fill" data-locked-audio-progress="${s}"></div>
              </div>
              <div class="locked-audio-time">
                <span data-locked-audio-current="${s}">00:00</span>
                <span data-locked-audio-duration="${s}">--:--</span>
              </div>
            </div>
          </div>
        </div>
        <div class="locked-audio-actions">
          <button type="button" class="btn btn-primary btn-sm locked-audio-start" data-locked-audio-start="${s}">
            \u25B6 B\u1EAFt \u0111\u1EA7u nghe
          </button>
          <div class="locked-audio-status" data-locked-audio-status="${s}">
            Ch\u1EC9 \u0111\u01B0\u1EE3c nghe 1 l\u1EA7n v\xE0 s\u1EBD ph\xE1t li\xEAn t\u1EE5c \u0111\u1EBFn h\u1EBFt.
          </div>
        </div>
      </div>`).join("")}
  `}function formatAudioPlaybackTime(t){const e=Math.max(0,Math.floor(Number(t)||0)),n=Math.floor(e/60),i=e%60;return`${String(n).padStart(2,"0")}:${String(i).padStart(2,"0")}`}const _activeLockedAudios=new Set;function stopAllLockedAudio(){for(const t of _activeLockedAudios)try{t._lockedListeningStopped=!0,t.pause(),t.src=""}catch{}_activeLockedAudios.clear()}function setupLockedListeningAudio(){const t=Array.from(document.querySelectorAll("[data-locked-audio]"));if(!t.length)return;function e(n=null){const i=n&&!n.paused&&!n.ended;t.forEach(s=>{const a=s._lockedListening;if(a){if(a.finished){a.button.disabled=!0,a.button.textContent="\u2713 \u0110\xE3 nghe xong";return}if(a.started){a.button.disabled=!0,a.button.textContent=i&&s===n?"\u{1F50A} \u0110ang ph\xE1t...":"\u2713 \u0110\xE3 b\u1EAFt \u0111\u1EA7u";return}a.button.disabled=!!i,a.button.textContent="\u25B6 B\u1EAFt \u0111\u1EA7u nghe"}})}t.forEach(n=>{const i=n.dataset.lockedAudio,s=document.querySelector(`[data-locked-audio-start="${i}"]`),a=document.querySelector(`[data-locked-audio-status="${i}"]`),o=document.querySelector(`[data-locked-audio-progress="${i}"]`),l=document.querySelector(`[data-locked-audio-current="${i}"]`),d=document.querySelector(`[data-locked-audio-duration="${i}"]`);if(!s||!a||!o||!l||!d)return;n.controls=!1,n.disablePictureInPicture=!0,n.playbackRate=1;const c=n._lockedListening={button:s,status:a,progressFill:o,currentTimeEl:l,durationEl:d,started:!1,finished:!1,lastTime:0,internalSeek:!1};function p(){const r=Number(n.currentTime)||0,m=Number(n.duration)||0;c.currentTimeEl.textContent=formatAudioPlaybackTime(r),c.durationEl.textContent=Number.isFinite(m)&&m>0?formatAudioPlaybackTime(m):"--:--";const u=m>0?Math.max(0,Math.min(100,r/m*100)):0;c.progressFill.style.width=`${u}%`}_activeLockedAudios.add(n),n.addEventListener("contextmenu",r=>r.preventDefault()),n.addEventListener("loadedmetadata",p),n.addEventListener("timeupdate",()=>{c.started&&!n.seeking&&(c.lastTime=n.currentTime),p()}),n.addEventListener("play",()=>{c.status.textContent="\u0110ang ph\xE1t li\xEAn t\u1EE5c. B\u1EA1n kh\xF4ng th\u1EC3 t\u1EA1m d\u1EEBng ho\u1EB7c tua audio n\xE0y.",e(n),p()}),n.addEventListener("pause",()=>{if(n._lockedListeningStopped||!document.contains(n))return;const r=Number.isFinite(n.duration)&&n.duration>0&&n.currentTime>=n.duration-.1;!c.started||c.finished||n.ended||r||n.play().catch(()=>{})}),n.addEventListener("seeking",()=>{!c.started||c.finished||c.internalSeek||(c.internalSeek=!0,n.currentTime=c.lastTime,p())}),n.addEventListener("seeked",()=>{c.internalSeek=!1,p()}),n.addEventListener("ratechange",()=>{n.playbackRate!==1&&(n.playbackRate=1)}),n.addEventListener("ended",()=>{c.finished=!0,c.status.textContent="\u0110\xE3 ph\xE1t xong audio n\xE0y.",p(),e(null)}),s.addEventListener("click",async()=>{if(!(c.started||c.finished)){c.started=!0,c.lastTime=0,c.status.textContent="\u0110ang chu\u1EA9n b\u1ECB ph\xE1t audio...",e(n);try{c.internalSeek=!0,n.currentTime=0,c.internalSeek=!1,p(),await n.play()}catch{c.started=!1,c.internalSeek=!1,c.status.textContent="Kh\xF4ng th\u1EC3 ph\xE1t audio l\xFAc n\xE0y. Vui l\xF2ng b\u1EA5m l\u1EA1i \u0111\u1EC3 th\u1EED ti\u1EBFp.",e(null)}}}),p()}),e(null)}function audioSeek(t){const e=document.querySelector(".audio-player-box audio");e&&(e.currentTime=Math.max(0,Math.min(e.duration||0,e.currentTime+t)),e.paused&&e.play().catch(()=>{}))}function audioSeekEl(t,e){const n=t?.closest(".audio-player-box")?.querySelector("audio");n&&(n.currentTime=Math.max(0,Math.min(n.duration||0,n.currentTime+e)),n.paused&&n.play().catch(()=>{}))}function startWaveform(t){const e=document.getElementById("waveform-canvas");if(e)try{let l=function(){_waveformAnim=requestAnimationFrame(l),s.getByteTimeDomainData(a);const d=e.width,c=e.height;o.fillStyle="#0d5f58",o.fillRect(0,0,d,c),o.lineWidth=2,o.strokeStyle="#5eead4",o.beginPath();const p=d/a.length;let r=0;for(let m=0;m<a.length;m++){const g=a[m]/128*c/2;m===0?o.moveTo(r,g):o.lineTo(r,g),r+=p}o.lineTo(d,c/2),o.stroke()};var n=l;_audioCtx=_audioCtx||new(window.AudioContext||window.webkitAudioContext);const i=_audioCtx.createMediaStreamSource(t),s=_audioCtx.createAnalyser();s.fftSize=1024,i.connect(s);const a=new Uint8Array(s.frequencyBinCount),o=e.getContext("2d");l()}catch(i){console.warn("Waveform setup failed:",i)}}function stopWaveform(){_waveformAnim&&cancelAnimationFrame(_waveformAnim),_waveformAnim=null}function promptAction({title:t="Nh\u1EADp th\xF4ng tin",message:e="",initialValue:n="",placeholder:i="",confirmText:s="L\u01B0u",cancelText:a="Hu\u1EF7",validate:o}={}){return new Promise(l=>{openModal(t,`
      <div style="display:flex;flex-direction:column;gap:16px">
        ${e?`<div style="line-height:1.6;color:var(--text)">${e}</div>`:""}
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="prompt-action-input" class="form-input" type="text" value="${escapeHtml(n)}" placeholder="${escapeHtml(i)}" />
          <div id="prompt-action-error" style="min-height:18px;font-size:12px;color:var(--danger)"></div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-outline" data-prompt-action="cancel">${escapeHtml(a)}</button>
          <button class="btn btn-primary" data-prompt-action="confirm">${escapeHtml(s)}</button>
        </div>
      </div>
    `);const d=$("#modal-overlay"),c=d?.querySelector("#prompt-action-input"),p=d?.querySelector("#prompt-action-error"),r=d?.querySelector('[data-prompt-action="cancel"]'),m=d?.querySelector('[data-prompt-action="confirm"]');let u=!1;const g=v=>{u||(u=!0,window._modalCloseCallback=null,closeModal(),l(v))},h=()=>{const v=c?.value??"",f=v.trim(),_=typeof o=="function"?o(f,v):"";if(_){p&&(p.textContent=_),c?.focus(),c?.select?.();return}g(f)};window._modalCloseCallback=()=>g(null),r.onclick=()=>g(null),m.onclick=h,c?.addEventListener("keydown",v=>{v.key==="Enter"&&(v.preventDefault(),h())}),d.onclick=v=>{v.target===d&&g(null)},requestAnimationFrame(()=>{c?.focus(),c?.select?.()})})}function confirmSubmit({title:t,message:e,confirmText:n="V\u1EABn n\u1ED9p",cancelText:i="Quay l\u1EA1i"}){return new Promise(s=>{const a=document.createElement("div");a.className="submit-confirm-overlay",a.innerHTML=`
      <div class="submit-confirm-modal">
        <div class="submit-confirm-title">${escapeHtml(t)}</div>
        <div class="submit-confirm-body">${e}</div>
        <div class="submit-confirm-actions">
          <button class="btn btn-outline" data-act="cancel">${escapeHtml(i)}</button>
          <button class="btn btn-primary" data-act="confirm">${escapeHtml(n)}</button>
        </div>
      </div>`,document.body.appendChild(a),a.querySelector("[data-act=cancel]").onclick=()=>{a.remove(),s(!1)},a.querySelector("[data-act=confirm]").onclick=()=>{a.remove(),s(!0)},a.onclick=o=>{o.target===a&&(a.remove(),s(!1))}})}function renderRouteError(t,e,n=window.location.hash.slice(1)||"/home"){const i=e?.error||e?.message||"Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u. Vui l\xF2ng th\u1EED l\u1EA1i.";$("#app").innerHTML=`
    <div class="empty-state-v2 route-error-state">
      <span class="empty-illu">\u26A0\uFE0F</span>
      <div class="empty-title">${escapeHtml(t)}</div>
      <div class="empty-desc">${escapeHtml(i)}</div>
      <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="router()">Th\u1EED l\u1EA1i</button>
        <button class="btn btn-outline" onclick="navigate('${escapeHtml(n||"/home")}')">V\u1EC1 trang tr\u01B0\u1EDBc</button>
      </div>
    </div>`}window.saveNotePanel=saveNotePanel;function loadAuth(){try{const t=localStorage.getItem("ielts_student"),e=localStorage.getItem("ielts_class"),n=localStorage.getItem("ielts_token");t&&(_student=JSON.parse(t)),e&&(_selectedClass=JSON.parse(e)),n&&(api._token=n)}catch{}}function persistStudentState(){_student&&localStorage.setItem("ielts_student",JSON.stringify(_student))}function updateStudentState(t={}){_student&&(_student={..._student,...t},persistStudentState(),syncMissingEmailUI())}async function syncStudentProfileSummary(t=!1){return!_student||!api._token?(syncMissingEmailUI(),null):!t&&_student.email!==void 0?(syncMissingEmailUI(),window._cachedProfileData||null):(!t&&_studentProfileSummaryPromise||(_studentProfileSummaryPromise=api.get("/student/profile-answers").then(e=>(window._cachedProfileData=e||{student:null,fields:[],answers:{}},updateStudentState({email:getStudentNotificationEmail(e)||null}),e)).catch(()=>null).finally(()=>{_studentProfileSummaryPromise=null,syncMissingEmailUI()})),_studentProfileSummaryPromise)}function saveAuth(t,e){_student=t,persistStudentState(),e&&(api._token=e,localStorage.setItem("ielts_token",e)),syncMissingEmailUI()}function selectClass(t){_selectedClass=t,localStorage.setItem("ielts_class",JSON.stringify(t)),invalidateAssignmentsCache(!0)}function clearAuth(){_student=null,_selectedClass=null,api._token=null,api.clearCache?.(),_myVocabCache=null,window._cachedAssignments=null,window._cachedProfileData=null,_studentProfileSummaryPromise=null,_assignmentsStore={key:"",data:null,fetchedAt:0,promise:null},localStorage.removeItem("ielts_student"),localStorage.removeItem("ielts_class"),localStorage.removeItem("ielts_token"),removeStickyToast(MISSING_EMAIL_TOAST_ID)}function updateHeader(){const t=$("#app-header");if(!t)return;const e=window.location.hash.slice(1)||"/home";if(_student&&!(e==="/select-class")){t.classList.remove("hidden"),$("#header-student-name").textContent=_student.full_name,$("#header-class-name").textContent=_selectedClass?.class_name??"",$("#app").classList.add("with-header"),startNotifPolling();const i=$("#switch-class-btn");i&&(i.style.display=_student.classes?.length>1?"inline-flex":"none"),document.querySelectorAll(".mobile-nav-link[data-mobile-nav]").forEach(s=>{const a=s.dataset.mobileNav,o=e.startsWith("/"+a)||a==="home"&&e==="/home";s.classList.toggle("active",o)})}else t.classList.add("hidden"),$("#app").classList.remove("with-header"),stopNotifPolling(),closeMobileNav(),closeNotifPanel(),removeStickyToast(MISSING_EMAIL_TOAST_ID)}function logout(){stopNotifPolling(),clearAuth(),navigate("/login")}function openChangePasswordModal(){openModal("\u0110\u1ED5i m\u1EADt kh\u1EA9u",`
    <div class="form-group">
      <label class="form-label">M\u1EADt kh\u1EA9u c\u0169</label>
      <div class="password-wrap">
        <input id="cp-old-password" class="form-input" type="password"
          placeholder="Nh\u1EADp m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i" autocomplete="current-password" />
        <button type="button" class="btn-eye" data-toggle-password="cp-old-password"
          onclick="togglePasswordVisibility(this, 'cp-old-password')" title="Hi\u1EC7n m\u1EADt kh\u1EA9u" aria-label="Hi\u1EC7n m\u1EADt kh\u1EA9u">\u{1F648}</button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">M\u1EADt kh\u1EA9u m\u1EDBi</label>
      <div class="password-wrap">
        <input id="cp-new-password" class="form-input" type="password"
          placeholder="V\xED d\u1EE5: duc123@" autocomplete="new-password" />
        <button type="button" class="btn-eye" data-toggle-password="cp-new-password"
          onclick="togglePasswordVisibility(this, 'cp-new-password')" title="Hi\u1EC7n m\u1EADt kh\u1EA9u" aria-label="Hi\u1EC7n m\u1EADt kh\u1EA9u">\u{1F648}</button>
      </div>
      <div class="form-hint">\xCDt nh\u1EA5t 6 k\xFD t\u1EF1, g\u1ED3m ch\u1EEF c\xE1i, s\u1ED1 v\xE0 k\xFD t\u1EF1 \u0111\u1EB7c bi\u1EC7t. V\xED d\u1EE5: duc123@</div>
    </div>
    <div class="form-group">
      <label class="form-label">Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi</label>
      <div class="password-wrap">
        <input id="cp-confirm-password" class="form-input" type="password"
          placeholder="Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi" autocomplete="new-password" />
        <button type="button" class="btn-eye" data-toggle-password="cp-confirm-password"
          onclick="togglePasswordVisibility(this, 'cp-confirm-password')" title="Hi\u1EC7n m\u1EADt kh\u1EA9u" aria-label="Hi\u1EC7n m\u1EADt kh\u1EA9u">\u{1F648}</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">H\u1EE7y</button>
      <button class="btn btn-primary" id="cp-save-btn" onclick="submitChangePassword(this)">L\u01B0u m\u1EADt kh\u1EA9u m\u1EDBi</button>
    </div>
  `),setTimeout(()=>$("#cp-old-password")?.focus(),50)}function openForgotPasswordModal(){openModal("Qu\xEAn m\u1EADt kh\u1EA9u",`
    <div class="form-group">
      <label class="form-label">Username</label>
      <input id="forgot-password-username" class="form-input"
        placeholder="Nh\u1EADp username h\u1ECDc sinh"
        autocomplete="username"
        onkeydown="if(event.key==='Enter') submitForgotPassword(document.getElementById('forgot-password-btn'))" />
      <div class="form-hint">Link \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u s\u1EBD \u0111\u01B0\u1EE3c g\u1EEDi t\u1EDBi Gmail \u0111ang l\u01B0u trong h\u1ED3 s\u01A1. Hi\u1EC7u l\u1EF1c 20 ph\xFAt.</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">H\u1EE7y</button>
      <button class="btn btn-primary" id="forgot-password-btn" onclick="submitForgotPassword(this)">G\u1EEDi link \u0111\u1EB7t l\u1EA1i</button>
    </div>
  `);const t=$("#login-username")?.value?.trim();if(t){const e=$("#forgot-password-username");e&&(e.value=t)}setTimeout(()=>$("#forgot-password-username")?.focus(),50)}async function submitForgotPassword(t){const e=$("#forgot-password-username")?.value?.trim()||$("#login-username")?.value?.trim()||"";if(!e){toast("Vui l\xF2ng nh\u1EADp username \u0111\u1EC3 g\u1EEDi link \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u.","error");return}btnLoading(t);try{const n=await api.post("/auth/forgot-password",{username:e});closeModal(),toast(n.message||"Link \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi qua Gmail.","success")}catch(n){btnReset(t),toast(n.error||"Kh\xF4ng th\u1EC3 g\u1EEDi link \u0111\u1EB7t l\u1EA1i l\xFAc n\xE0y.","error")}}function showResetPasswordPage(t){$("#app").classList.remove("with-header"),$("#app-header").classList.add("hidden"),$("#app").innerHTML=`
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <span class="login-logo-icon">\u{1F511}</span>
          <div class="login-logo-title">\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u</div>
          <div class="login-logo-sub">Nh\u1EADp m\u1EADt kh\u1EA9u m\u1EDBi cho t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n</div>
        </div>
        <div id="reset-error" class="login-error"></div>
        <div class="form-group">
          <label class="form-label">M\u1EADt kh\u1EA9u m\u1EDBi</label>
          <div class="password-wrap">
            <input id="reset-new-password" class="form-input" type="password"
              placeholder="Nh\u1EADp m\u1EADt kh\u1EA9u m\u1EDBi"
              autocomplete="new-password"
              onkeydown="if(event.key==='Enter') document.getElementById('reset-confirm-password').focus()" />
            <button type="button" class="btn-eye" onclick="togglePasswordVisibility(this,'reset-new-password')" title="Hi\u1EC7n m\u1EADt kh\u1EA9u" aria-label="Hi\u1EC7n m\u1EADt kh\u1EA9u">\u{1F648}</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">X\xE1c nh\u1EADn m\u1EADt kh\u1EA9u</label>
          <div class="password-wrap">
            <input id="reset-confirm-password" class="form-input" type="password"
              placeholder="Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi"
              autocomplete="new-password"
              onkeydown="if(event.key==='Enter') submitResetPassword(document.getElementById('reset-btn'),'${escapeHtml(t)}')" />
            <button type="button" class="btn-eye" onclick="togglePasswordVisibility(this,'reset-confirm-password')" title="Hi\u1EC7n m\u1EADt kh\u1EA9u" aria-label="Hi\u1EC7n m\u1EADt kh\u1EA9u">\u{1F648}</button>
          </div>
        </div>
        <button class="btn btn-primary" id="reset-btn" style="width:100%;margin-top:8px"
          onclick="submitResetPassword(this,'${escapeHtml(t)}')">\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u</button>
        <div style="text-align:center;margin-top:16px">
          <button class="btn btn-outline btn-sm" onclick="history.replaceState(null,'',location.pathname);navigate('/login')">Quay l\u1EA1i \u0111\u0103ng nh\u1EADp</button>
        </div>
      </div>
    </div>`,setTimeout(()=>$("#reset-new-password")?.focus(),50)}async function submitResetPassword(t,e){const n=$("#reset-new-password")?.value||"",i=$("#reset-confirm-password")?.value||"",s=$("#reset-error");if(!n||!i){s&&(s.textContent="Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 m\u1EADt kh\u1EA9u m\u1EDBi v\xE0 x\xE1c nh\u1EADn.");return}if(n!==i){s&&(s.textContent="M\u1EADt kh\u1EA9u nh\u1EADp l\u1EA1i kh\xF4ng kh\u1EDBp.");return}btnLoading(t);try{const a=await api.post("/auth/reset-password",{token:e,new_password:n,confirm_password:i});toast(a.message||"\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng! Vui l\xF2ng \u0111\u0103ng nh\u1EADp.","success"),history.replaceState(null,"",location.pathname),navigate("/login")}catch(a){btnReset(t),s&&(s.textContent=a.error||"Kh\xF4ng th\u1EC3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u. Link c\xF3 th\u1EC3 \u0111\xE3 h\u1EBFt h\u1EA1n.")}}async function submitChangePassword(t){const e=$("#cp-old-password")?.value||"",n=$("#cp-new-password")?.value||"",i=$("#cp-confirm-password")?.value||"";if(!e||!n||!i){toast("Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 m\u1EADt kh\u1EA9u c\u0169, m\u1EADt kh\u1EA9u m\u1EDBi v\xE0 nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi.","error");return}const s=getStudentPasswordValidationError(n);if(s){toast(s,"error");return}if(e===n){toast("M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i kh\xE1c m\u1EADt kh\u1EA9u c\u0169.","error");return}if(n!==i){toast("M\u1EADt kh\u1EA9u nh\u1EADp l\u1EA1i kh\xF4ng kh\u1EDBp.","error");return}if(await confirmSubmit({title:"X\xE1c nh\u1EADn \u0111\u1ED5i m\u1EADt kh\u1EA9u",message:"Sau khi x\xE1c nh\u1EADn, m\u1EADt kh\u1EA9u c\u0169 s\u1EBD kh\xF4ng c\xF2n d\xF9ng \u0111\u01B0\u1EE3c n\u1EEFa.",confirmText:"X\xE1c nh\u1EADn \u0111\u1ED5i",cancelText:"Hu\u1EF7"})){btnLoading(t);try{await api.post("/student/change-password",{old_password:e,new_password:n,confirm_password:i}),closeModal(),toast("\u0110\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng!")}catch(o){btnReset(t),toast(o.error||"Kh\xF4ng th\u1EC3 \u0111\u1ED5i m\u1EADt kh\u1EA9u l\xFAc n\xE0y.","error")}}}function switchClass(){_selectedClass=null,localStorage.removeItem("ielts_class"),_notifToastShown=!1;const t=document.getElementById("notif-badge");t&&t.classList.add("hidden"),navigate("/select-class")}const routes={"/login":showLogin,"/select-class":showClassSelect,"/home":showHome,"/assignments":showAssignments,"/assignment/:id":showAssignment,"/result/:id":showResult,"/history":showHistory,"/calendar":showCalendar,"/vocab-games":showVocabGames,"/vocab-game/:id":showVocabGame,"/practice/:id":showPractice,"/profile":showProfile,"/my-vocab":showMyVocab,"/shared-pool":showSharedPool,"/shared-pool/:id":showSharedQuestion,"/shared-attempt/:id":showSharedAttemptResult,"/shared-practice/:id":showSharedPractice,"/composite/:id/section/:sectionId":showCompositeSectionExam,"/composite/:id":showCompositeExam,"/composite-result/:id/section/:submissionId":showCompositeSectionResult,"/composite-result/:id":showCompositeResult,"/composite-practice/:id":showCompositePractice};function navigate(t){flushAutoSave(),closeMobileNav(),window.location.hash=t}function toggleMobileNav(){const t=document.getElementById("mobile-nav");if(!t)return;t.classList.contains("open")?closeMobileNav():openMobileNav()}function setMobileNavState(t){const e=document.getElementById("mobile-nav"),n=document.getElementById("mobile-nav-backdrop"),i=document.getElementById("hamburger-btn");if(!(!e||!n)){if(e.classList.toggle("open",t),n.classList.toggle("active",t),e.setAttribute("aria-hidden",String(!t)),i?.setAttribute("aria-expanded",String(t)),t){e.removeAttribute("inert"),document.body.style.overflow="hidden",requestAnimationFrame(()=>{e.querySelector(".mobile-nav-close, .mobile-nav-link")?.focus()});return}e.setAttribute("inert",""),document.body.style.overflow=""}}function openMobileNav(){_mobileNavPreviousFocus=document.activeElement,setMobileNavState(!0)}function closeMobileNav(){setMobileNavState(!1),_mobileNavPreviousFocus instanceof HTMLElement&&_mobileNavPreviousFocus.focus(),_mobileNavPreviousFocus=null}window.toggleMobileNav=toggleMobileNav,window.closeMobileNav=closeMobileNav;function matchRoute(t,e){const n=t.split("/"),i=e.split("/");if(n.length!==i.length)return null;const s={};for(let a=0;a<n.length;a++)if(n[a].startsWith(":"))s[n[a].slice(1)]=i[a];else if(n[a]!==i[a])return null;return s}let _navSeq=0;function routeToken(){return _navSeq}function routeChanged(t){return t!==_navSeq}function router(){_navSeq++,flushAutoSave(),stopAutoSave(),stopTaskTimer(),stopAssignmentCountdown(),stopCompositeSectionTimer(),_removeExamBeforeUnload(),_stopAiFeedbackPoll(),stopAllLockedAudio(),_activeAssignmentId=null,_activeSectionId=null,_compositeExam=null;const t=window.location.hash.slice(1)||"/home";if(updateHeader(),!_student&&t!=="/login"){navigate("/login");return}if(_student&&t==="/login"){navigate(_selectedClass?"/home":"/select-class");return}if(_student&&!_selectedClass&&t!=="/select-class"){navigate("/select-class");return}for(const[e,n]of Object.entries(routes)){const i=matchRoute(e,t);if(i!==null){n(i);return}}_student?_selectedClass?showHome({}):showClassSelect({}):showLogin({})}let _lastExamHash=null,_skipExamLeaveGuardOnce=!1;window.addEventListener("hashchange",t=>{if(_skipExamLeaveGuardOnce){_skipExamLeaveGuardOnce=!1,router();return}if(isExamActive()){const e=new URL(t.oldURL).hash||"#/home";_confirmLeaveExam().then(n=>{n?router():history.replaceState(null,"",e)});return}router()});function showLogin(){$("#app").classList.remove("with-header"),$("#app-header").classList.add("hidden"),$("#app").innerHTML=`
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <span class="login-logo-icon">\u{1F393}</span>
          <div class="login-logo-title">English Student</div>
          <div class="login-logo-sub">C\u1ED5ng h\u1ECDc sinh luy\u1EC7n thi IELTS</div>
        </div>

        <div id="login-error" class="login-error"></div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input id="login-username" class="form-input" placeholder="Nh\u1EADp username c\u1EE7a b\u1EA1n"
            autocomplete="username" />
        </div>
        <div class="form-group">
          <label class="form-label">M\u1EADt kh\u1EA9u</label>
          <div class="password-wrap">
            <input id="login-password" class="form-input" type="password"
              placeholder="Nh\u1EADp m\u1EADt kh\u1EA9u"
              autocomplete="current-password"
              onkeydown="if(event.key==='Enter') submitLogin($('#login-btn'))" />
            <button type="button" class="btn-eye" data-toggle-password="login-password"
              onclick="togglePasswordVisibility(this, 'login-password')" title="Hi\u1EC7n m\u1EADt kh\u1EA9u" aria-label="Hi\u1EC7n m\u1EADt kh\u1EA9u">\u{1F648}</button>
          </div>
        </div>

        <div class="login-secondary-actions">
          <button type="button" class="btn btn-outline btn-sm login-forgot-btn" onclick="openForgotPasswordModal()">
            Qu\xEAn m\u1EADt kh\u1EA9u
          </button>
        </div>

        <button id="login-btn" class="btn btn-primary" onclick="submitLogin(this)">
          \u0110\u0103ng nh\u1EADp
        </button>
      </div>
    </div>`,setTimeout(()=>$("#login-username")?.focus(),50)}async function submitLogin(t){const e=$("#login-username")?.value.trim(),n=$("#login-password")?.value,i=$("#login-error");if(!e||!n){i.textContent="Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 username v\xE0 m\u1EADt kh\u1EA9u.",i.classList.add("show");return}btnLoading(t),i.classList.remove("show");try{const{student:s,token:a}=await api.post("/auth/login",{username:e,password:n});saveAuth(s,a),syncMissingEmailUI(),!s.classes||s.classes.length===0?navigate("/select-class"):s.classes.length===1?(selectClass(s.classes[0]),navigate("/home")):navigate("/select-class")}catch(s){btnReset(t),i.textContent=s.error||"\u0110\u0103ng nh\u1EADp th\u1EA5t b\u1EA1i. Vui l\xF2ng th\u1EED l\u1EA1i.",i.classList.add("show")}}function showClassSelect(){updateHeader();const t=_student?.classes??[];if(t.length===0){$("#app").innerHTML=`
      <div class="class-select-page">
        <div class="class-select-card">
          <div class="class-select-header">
            <div class="class-select-avatar">\u{1F44B}</div>
            <div class="class-select-name">Xin ch\xE0o, ${escapeHtml(_student?.full_name)}!</div>
          </div>
          <div style="text-align:center;padding:32px 0">
            <div style="font-size:40px;margin-bottom:12px">\u{1F615}</div>
            <div style="font-weight:700;margin-bottom:6px">B\u1EA1n ch\u01B0a thu\u1ED9c l\u1EDBp n\xE0o</div>
            <div style="font-size:13px;color:#6b7280">
              Li\xEAn h\u1EC7 gi\xE1o vi\xEAn \u0111\u1EC3 \u0111\u01B0\u1EE3c th\xEAm v\xE0o l\u1EDBp h\u1ECDc.
            </div>
          </div>
          <button class="btn btn-outline btn-full" onclick="logout()" style="margin-top:8px">
            \u0110\u0103ng xu\u1EA5t
          </button>
        </div>
      </div>`;return}const e=t.map(n=>`
    <button class="class-card" onclick="chooseClass('${n.id}', '${escapeHtml(n.class_name).replace(/'/g,"\\'")}')">
      <div class="class-card-icon">\u{1F3EB}</div>
      <div class="class-card-name">${escapeHtml(n.class_name)}</div>
      <div class="class-card-arrow">\u203A</div>
    </button>`).join("");$("#app").innerHTML=`
    <div class="class-select-page">
      <div class="class-select-card">
        <div class="class-select-header">
          <div class="class-select-avatar">\u{1F44B}</div>
          <div class="class-select-name">Xin ch\xE0o, ${escapeHtml(_student?.full_name)}!</div>
          <div class="class-select-sub">Ch\u1ECDn l\u1EDBp h\u1ECDc \u0111\u1EC3 ti\u1EBFp t\u1EE5c</div>
        </div>

        <div class="class-list">
          ${e}
        </div>

        <button class="btn btn-outline btn-full" onclick="logout()" style="margin-top:16px">
          \u0110\u0103ng xu\u1EA5t
        </button>
      </div>
    </div>`}function chooseClass(t,e){selectClass({id:t,class_name:e}),navigate("/home"),refreshNotifBadge().then(n=>{maybeShowNotifToast(n),syncMissingEmailUI()})}function toDateKey(t){const e=t instanceof Date?new Date(t):new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString("sv-SE",{timeZone:"Asia/Ho_Chi_Minh"})}function dateFromKey(t){const[e,n,i]=String(t).split("-").map(Number);return!e||!n||!i?null:new Date(e,n-1,i)}function getSubmittedAssignments(t){return(t||[]).filter(e=>e.submission_id&&(e.submitted_at||e.created_at))}function calculateSubmissionStreak(t,e=[]){const n=getSubmittedAssignments(t).map(u=>toDateKey(u.submitted_at||u.created_at)),i=e.map(u=>toDateKey(u.practiced_at)),s=Array.from(new Set([...n,...i])).filter(Boolean).sort();if(s.length===0)return{days:[],current:0,best:0};const a=new Set(s),o=new Date;o.setHours(0,0,0,0);const l=new Date(o);l.setDate(o.getDate()-1);const d=a.has(toDateKey(o))?o:a.has(toDateKey(l))?l:null;let c=0;if(d)for(let u=0;u<s.length;u++){const g=new Date(d);g.setDate(d.getDate()-u);const h=toDateKey(g);if(a.has(h))c++;else break}let p=0,r=0,m=null;for(const u of s){const g=dateFromKey(u);g&&(m?r=Math.round((g-m)/864e5)===1?r+1:1:r=1,r>p&&(p=r),m=g)}return{days:s,current:c,best:p}}let _homeChartRange=30,_profileChartRange=30;function profileTargetsKey(){return`ielts_targets:${_student?.id}`}function normalizeTargetValue(t,e=6.5){const n=Number(t);return Number.isFinite(n)&&n>=0&&n<=9?n:e}function roundOverallTargetFromSkills(t){if(!Number.isFinite(t))return 6.5;const e=Math.floor(t),n=t-e;return n<.25?e:n<.75?e+.5:e+1}function computeOverallTargetFromSkills(t){const n=["reading","listening","writing","speaking"].map(s=>normalizeTargetValue(t?.[s],6.5)),i=n.reduce((s,a)=>s+a,0)/n.length;return roundOverallTargetFromSkills(i)}function getTargetSettings(){const t={reading:6.5,listening:6.5,writing:6.5,speaking:6.5};try{const e=localStorage.getItem(profileTargetsKey())||localStorage.getItem(`ielts_target:${_student?.id}`);if(!e)return{...t,overall:computeOverallTargetFromSkills(t)};if(e.trim().startsWith("{")){const s=JSON.parse(e),a={reading:normalizeTargetValue(s.reading,t.reading),listening:normalizeTargetValue(s.listening,t.listening),writing:normalizeTargetValue(s.writing,t.writing),speaking:normalizeTargetValue(s.speaking,t.speaking)};return{...a,overall:computeOverallTargetFromSkills(a)}}const n=normalizeTargetValue(parseFloat(e),6.5),i={reading:n,listening:n,writing:n,speaking:n};return{...i,overall:computeOverallTargetFromSkills(i)}}catch{return{...t,overall:computeOverallTargetFromSkills(t)}}}function setTargetSettings(t){const e={reading:normalizeTargetValue(t.reading,6.5),listening:normalizeTargetValue(t.listening,6.5),writing:normalizeTargetValue(t.writing,6.5),speaking:normalizeTargetValue(t.speaking,6.5)};localStorage.setItem(profileTargetsKey(),JSON.stringify(e))}function getGradedAssignments(t){return(t||[]).filter(e=>e.submission_id&&e.overall_score!=null&&(e.submitted_at||e.created_at))}function getIeltsGradedAssignments(t){return getGradedAssignments(t).filter(e=>(e.scoring_scale||"10")==="ielts")}function calculateOverallAverage(t){const e=getIeltsGradedAssignments(t).map(n=>Number(n.overall_score)).filter(Number.isFinite);return e.length?e.reduce((n,i)=>n+i,0)/e.length:null}function getSkillGradedAssignments(t,e){return getIeltsGradedAssignments(t).filter(n=>n.skill===e).sort((n,i)=>new Date(n.submitted_at||n.created_at)-new Date(i.submitted_at||i.created_at))}function aggregateDailyScores(t,e,n){const i=new Date;i.setHours(23,59,59,999);const s=new Date(i);s.setDate(i.getDate()-(n-1)),s.setHours(0,0,0,0);const a=new Map;for(const o of getSkillGradedAssignments(t,e)){const l=new Date(o.submitted_at||o.created_at);if(Number.isNaN(l.getTime())||l<s||l>i)continue;const d=toDateKey(l);a.has(d)||a.set(d,[]),a.get(d).push(o)}return Array.from(a.entries()).sort((o,l)=>o[0].localeCompare(l[0])).map(([o,l])=>{const d=l.map(p=>Number(p.overall_score)).filter(Number.isFinite),c=d.length?d.reduce((p,r)=>p+r,0)/d.length:null;return{dateKey:o,date:dateFromKey(o),avgScore:c,items:l}})}function renderChartRangeButtons(t,e){return`
    <div class="chart-range-tabs">
      ${CHART_RANGE_OPTIONS.map(n=>`
        <button type="button"
          class="chart-range-btn ${e===n?"active":""}"
          onclick="setProgressRange('${t}', ${n})">
          ${n===365?"1 n\u0103m":`${n} ng\xE0y`}
        </button>`).join("")}
    </div>`}function buildProgressChartSvg(t,e,n,i,s="profile"){const a=s==="profile"?520:320,o=s==="profile"?220:150,l=s==="profile"?42:30,d=14,c=14,p=s==="profile"?28:24,r=a-l-d,m=o-c-p,u="#dbe4ef",g="#94a3b8",h={reading:"#0f766e",listening:"#7c3aed",writing:"#d97706",speaking:"#dc2626"}[i]||"#0f766e",v=new Date;v.setHours(23,59,59,999);const f=new Date(v);f.setDate(v.getDate()-(n-1)),f.setHours(0,0,0,0);const _=Math.max(1,v.getTime()-f.getTime()),S=w=>l+(w.getTime()-f.getTime())/_*r,y=w=>c+(9-w)/9*m,C=[0,3,6,9].map(w=>{const k=y(w).toFixed(1);return`
      <line x1="${l}" y1="${k}" x2="${a-d}" y2="${k}" stroke="${u}" stroke-width="1"/>
      <text x="${l-8}" y="${Number(k)+4}" text-anchor="end" font-size="10" fill="${g}">${w}</text>`}).join(""),L=Number.isFinite(e)?`
    <line x1="${l}" y1="${y(e).toFixed(1)}" x2="${a-d}" y2="${y(e).toFixed(1)}"
      stroke="${h}" stroke-opacity=".38" stroke-width="1.5" stroke-dasharray="5 5"/>
  `:"",M=t.map(w=>`${S(w.date).toFixed(1)},${y(w.avgScore).toFixed(1)}`).join(" "),A=t.length>=2?`<polyline fill="none" stroke="${h}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${M}"/>`:"",H=t.map(w=>{const k=S(w.date).toFixed(1),E=y(w.avgScore).toFixed(1);return`
      <circle cx="${k}" cy="${E}" r="5.5" fill="#fff" stroke="${h}" stroke-width="3"
        onmouseenter="showProgressPointTooltip(event, '${i}', '${w.dateKey}')"
        onmousemove="moveProgressTooltip(event)"
        onmouseleave="hideProgressTooltip()"></circle>`}).join(""),B=toDateKey(f).slice(5).replace("-","/"),b=toDateKey(v).slice(5).replace("-","/");return`
    <svg viewBox="0 0 ${a} ${o}" preserveAspectRatio="none" class="progress-chart-svg" aria-hidden="true">
      ${C}
      ${L}
      ${A}
      ${H}
      <text x="${l}" y="${o-6}" font-size="10" fill="${g}">${B}</text>
      <text x="${a-d}" y="${o-6}" text-anchor="end" font-size="10" fill="${g}">${b}</text>
    </svg>`}function renderTargetSummaryCompact(t){const e=getTargetSettings(),n=calculateOverallAverage(t);return`
    <div class="target-summary-card">
      <div class="target-summary-main">
        <div>
          <div class="target-summary-label">\u{1F3AF} Overall target</div>
          <div class="target-summary-value">${e.overall.toFixed(1)}</div>
          <div class="target-summary-sub">${n!==null?`Band hi\u1EC7n t\u1EA1i: ${n.toFixed(1)}`:"Ch\u01B0a c\xF3 band t\u1ED5ng quan"} \xB7 T\xEDnh t\u1EEB 4 k\u1EF9 n\u0103ng</div>
        </div>
        <a href="#/profile" class="target-summary-link">Ch\u1EC9nh target</a>
      </div>
      <div class="target-chip-row">
        ${SKILL_ORDER.map(i=>`
          <span class="target-chip">
            <span>${SKILL_ICONS[i]}</span>
            <span>${SKILL_LABELS[i]}</span>
            <strong>${e[i].toFixed(1)}</strong>
          </span>`).join("")}
      </div>
    </div>`}function renderSkillTargetEditor(t){const e=getTargetSettings(),n=calculateOverallAverage(t),i=[4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9],s=(a,o,l)=>`
    <label class="target-editor-item">
      <span class="target-editor-item-label">${l} ${o}</span>
      <select class="target-editor-select" data-target-key="${a}">
        ${i.map(d=>`<option value="${d}" ${e[a]===d?"selected":""}>${d.toFixed(1)}</option>`).join("")}
      </select>
    </label>`;return`
    <div class="target-editor-card">
      <div class="target-editor-overview">
        <div>
          <div class="target-editor-label">\u{1F3AF} M\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3</div>
          <div class="target-editor-overall">${e.overall.toFixed(1)}</div>
          <div class="target-editor-sub">${n!==null?`Band hi\u1EC7n t\u1EA1i ${n.toFixed(1)}`:"Ch\u01B0a c\xF3 \u0111i\u1EC3m t\u1ED5ng quan"} \xB7 T\u1EF1 t\xEDnh t\u1EEB 4 k\u1EF9 n\u0103ng</div>
        </div>
      </div>
      <div class="target-editor-grid">
        ${SKILL_ORDER.map(a=>s(a,SKILL_LABELS[a],SKILL_ICONS[a]||"\u{1F4DD}")).join("")}
      </div>
    </div>`}function renderSkillChartCard(t,e,n,i="profile"){const a=getTargetSettings()[e],o=getSkillGradedAssignments(t,e),l=getSubmittedAssignments(t).filter(h=>h.skill===e).length,d=aggregateDailyScores(t,e,n),c={reading:"#0f766e",listening:"#7c3aed",writing:"#d97706",speaking:"#dc2626"}[e]||"#0f766e",p=o.length?o.reduce((h,v)=>h+Number(v.overall_score),0)/o.length:null,r=o.length?Number(o[o.length-1].overall_score):null,m=p!==null?p-a:null,u=m===null?"":m>=0?`<span class="chart-skill-delta ok">+${m.toFixed(1)} vs target</span>`:`<span class="chart-skill-delta gap">${m.toFixed(1)} vs target</span>`,g=d.length?buildProgressChartSvg(d,a,n,e,i):`<div class="chart-empty-state">
        <div class="chart-empty-title">Ch\u01B0a c\xF3 b\xE0i ${SKILL_LABELS[e]} n\xE0o \u0111\u01B0\u1EE3c ch\u1EA5m</div>
        <div class="chart-empty-desc">Bi\u1EC3u \u0111\u1ED3 s\u1EBD xu\u1EA5t hi\u1EC7n khi b\u1EA1n c\xF3 \xEDt nh\u1EA5t 1 b\xE0i \u0111\xE3 ch\u1EA5m trong kho\u1EA3ng th\u1EDDi gian \u0111ang l\u1ECDc.</div>
      </div>`;return`
    <div class="skill-chart-card skill-chart-card-${i}" onclick="openSkillProgressModal('${e}')">
      <div class="skill-chart-top">
        <div>
          <div class="skill-chart-label">${SKILL_ICONS[e]||"\u{1F4DD}"} ${SKILL_LABELS[e]}</div>
          <div class="skill-chart-summary">
            <span class="skill-chart-avg" style="color:${c}">${p!==null?p.toFixed(1):"\u2014"}</span>
            ${u}
          </div>
          <div class="skill-chart-sub">Target ${a.toFixed(1)} \xB7 ${o.length} b\xE0i \u0111\xE3 ch\u1EA5m \xB7 ${l} b\xE0i \u0111\xE3 l\xE0m</div>
        </div>
        <div class="skill-chart-latest">
          <span class="skill-chart-latest-label">G\u1EA7n nh\u1EA5t</span>
          <strong>${r!==null?r.toFixed(1):"\u2014"}</strong>
        </div>
      </div>
      <div class="skill-chart-frame">
        ${g}
      </div>
      <div class="skill-chart-footer">Tr\u1EE5c X: th\u1EDDi gian \xB7 Tr\u1EE5c Y: band \xB7 Ng\xE0y c\xF3 nhi\u1EC1u b\xE0i s\u1EBD l\u1EA5y \u0111i\u1EC3m trung b\xECnh</div>
    </div>`}let _progressTooltipEl=null;function ensureProgressTooltip(){return _progressTooltipEl||(_progressTooltipEl=document.createElement("div"),_progressTooltipEl.id="progress-point-tooltip",_progressTooltipEl.className="progress-point-tooltip hidden",document.body.appendChild(_progressTooltipEl),_progressTooltipEl)}function showProgressPointTooltip(t,e,n){const i=getSkillGradedAssignments(window._cachedAssignments||[],e).filter(o=>toDateKey(o.submitted_at||o.created_at)===n);if(!i.length)return;const s=i.reduce((o,l)=>o+Number(l.overall_score),0)/i.length,a=ensureProgressTooltip();a.innerHTML=`
    <div class="progress-tooltip-date">${n}</div>
    <div class="progress-tooltip-avg">Band trung b\xECnh ng\xE0y: <strong>${s.toFixed(1)}</strong></div>
    <div class="progress-tooltip-list">
      ${i.map(o=>`
        <div class="progress-tooltip-item">
          <div class="progress-tooltip-item-title">${escapeHtml(o.title)}</div>
          <div class="progress-tooltip-item-meta">
            <span>${formatDateTime(o.submitted_at||o.created_at)}</span>
            <strong>${Number(o.overall_score).toFixed(1)}</strong>
          </div>
        </div>`).join("")}
    </div>`,a.classList.remove("hidden"),moveProgressTooltip(t)}function moveProgressTooltip(t){const e=ensureProgressTooltip();if(e.classList.contains("hidden"))return;const n=16,i=e.offsetWidth||260,s=e.offsetHeight||120;let a=t.clientX+n,o=t.clientY+n;const l=window.visualViewport?.width??window.innerWidth,d=window.visualViewport?.height??window.innerHeight;a+i>l-12&&(a=t.clientX-i-n),o+s>d-12&&(o=t.clientY-s-n),e.style.left=`${Math.max(12,a)}px`,e.style.top=`${Math.max(12,o)}px`}function hideProgressTooltip(){ensureProgressTooltip().classList.add("hidden")}function setProgressRange(t,e){if(t==="home"){_homeChartRange=e,renderHome(window._cachedAssignments||[]);return}_profileChartRange=e,renderProfile(window._cachedAssignments||[])}function scrollProfileSection(t){const e=document.getElementById(t);e&&e.scrollIntoView({behavior:"smooth",block:"start"})}async function showHome(){setLoading("\u0110ang t\u1EA3i trang ch\u1EE7...");const t=routeToken();try{const[e,n]=await Promise.all([getAssignments(),api.get("/student/vocab/sessions").catch(()=>[])]);if(routeChanged(t))return;window._cachedVocabSessions=n,renderHome(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i trang ch\u1EE7: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c trang ch\u1EE7",e,"/home")}}function renderHome(t){const e=calculateSubmissionStreak(t,window._cachedVocabSessions||[]),n=t.length,i=getSubmittedAssignments(t).length,s=t.filter(r=>!r.submission_id&&r.is_active).length,a=calculateOverallAverage(t),o=toDateKey(new Date),l=t.filter(r=>r.submission_id||!r.is_active||!r.deadline?!1:toDateKey(r.deadline)===o),d=t.filter(r=>!r.submission_id&&r.is_active).sort((r,m)=>r.deadline?m.deadline?new Date(r.deadline)-new Date(m.deadline):-1:1).slice(0,5),c=[],p=new Set(e.days);for(let r=6;r>=0;r--){const m=new Date;m.setDate(m.getDate()-r);const u=toDateKey(m),g=m.toLocaleDateString("vi-VN",{weekday:"short"});c.push(`<div class="home-streak-day ${p.has(u)?"on":""}" title="${u}">
      <div class="streak-dot">${p.has(u)?"\u{1F525}":"\xB7"}</div>
      <div class="streak-day-label">${g}</div>
    </div>`)}$("#app").innerHTML=`
    <div class="container home-page">
      <div class="home-greeting">
        <div>
          <div class="home-hi">Xin ch\xE0o, ${escapeHtml(_student.full_name)} \u{1F44B}</div>
          <div class="home-sub">L\u1EDBp ${escapeHtml(_selectedClass.class_name)} \xB7 ${new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
      </div>

      <div class="home-quick-actions home-quick-actions--top">
        <a href="#/assignments" class="home-quick-btn">\u{1F4CB} T\u1EA5t c\u1EA3 b\xE0i t\u1EADp</a>
        <a href="#/history" class="home-quick-btn">\u{1F4CA} L\u1ECBch s\u1EED</a>
        <a href="#/calendar" class="home-quick-btn">\u{1F4C5} L\u1ECBch h\u1ECDc</a>
        <a href="#/vocab-games" class="home-quick-btn">\u{1F0CF} \xD4n t\u1EEB v\u1EF1ng</a>
      </div>

      ${renderTargetSummaryCompact(t)}

      <div class="home-stats-row">
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">\u{1F4CB}</div>
          <div class="stat-num">${n}</div>
          <div class="stat-label">T\u1ED5ng b\xE0i</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">\u2705</div>
          <div class="stat-num">${i}</div>
          <div class="stat-label">\u0110\xE3 n\u1ED9p</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">\u23F3</div>
          <div class="stat-num">${s}</div>
          <div class="stat-label">C\u1EA7n l\xE0m</div>
        </a>
        <a href="#/history" class="home-stat-card">
          <div class="stat-icon">\u{1F3AF}</div>
          <div class="stat-num">${a!==null?a.toFixed(1):"\u2014"}</div>
          <div class="stat-label">Band TB</div>
        </a>
      </div>

      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${e.current>=7?"\u{1F525}\u{1F525}":"\u{1F525}"}</div>
          <div>
            <div class="streak-current">Streak ${e.current} ng\xE0y</div>
            <div class="streak-best">K\u1EF7 l\u1EE5c: ${e.best} ng\xE0y</div>
          </div>
        </div>
        <div class="home-streak-week">${c.join("")}</div>
      </div>

      <div class="home-section-title">\u{1F4C8} Ti\u1EBFn \u0111\u1ED9 g\u1EA7n \u0111\xE2y</div>
      <div class="chart-section-toolbar chart-section-toolbar--compact">
        <div class="chart-section-copy">Bi\u1EC3u \u0111\u1ED3 r\xFAt g\u1ECDn theo \u0111i\u1EC3m trung b\xECnh t\u1EEBng ng\xE0y \u0111\xE3 ch\u1EA5m.</div>
        ${renderChartRangeButtons("home",_homeChartRange)}
      </div>
      <div class="home-chart-grid">
        ${SKILL_ORDER.map(r=>renderSkillChartCard(t,r,_homeChartRange,"home")).join("")}
      </div>

      ${l.length>0?`
        <div class="home-section-title">\u23F0 \u0110\u1EBFn h\u1EA1n h\xF4m nay (${l.length})</div>
        <div class="home-due-today">
          ${l.map(r=>homeAssignCard(r,!0)).join("")}
        </div>`:""}

      <div class="home-section-title">\u{1F4CC} B\xE0i t\u1EADp s\u1EAFp t\u1EDBi</div>
      ${d.length===0?`
        <div class="empty-state-v2">
          <div class="empty-illu">\u{1F389}</div>
          <div class="empty-title">\u0110\xE3 l\xE0m h\u1EBFt b\xE0i r\u1ED3i!</div>
          <div class="empty-desc">Quay l\u1EA1i sau khi gi\xE1o vi\xEAn giao th\xEAm.</div>
        </div>
      `:`<div class="home-pending-list">${d.map(r=>homeAssignCard(r,!1)).join("")}</div>`}
    </div>`}function homeAssignCard(t,e){const n=SKILL_ICONS[t.skill]||"\u{1F4DD}",i=formatCountdown(t.deadline);return`
    <a href="#/assignment/${t.id}" class="home-assign-card${e?" urgent":""}">
      <div class="home-assign-icon">${n}</div>
      <div class="home-assign-body">
        <div class="home-assign-title">${escapeHtml(t.title)}</div>
        <div class="home-assign-meta">${skillBadge(t.skill)} ${i?`<span class="countdown-chip">${i}</span>`:""} <span class="home-assign-date">\u{1F4C5} ${formatDateTime(t.deadline)}</span></div>
      </div>
      <div class="home-assign-arrow">\u203A</div>
    </a>`}let _historyFilter={skill:"",minBand:0};async function showHistory(){setLoading("\u0110ang t\u1EA3i l\u1ECBch s\u1EED...");const t=routeToken();try{const e=await getAssignments();if(routeChanged(t))return;renderHistory(getHistorySourceItems(e))}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i l\u1ECBch s\u1EED: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c l\u1ECBch s\u1EED",e,"/history")}}function renderHistory(t){let e=t.slice();_historyFilter.skill&&(e=e.filter(i=>i.skill===_historyFilter.skill)),_historyFilter.minBand>0&&(e=e.filter(i=>Number(getHistoryItemScore(i)||0)>=_historyFilter.minBand)),e.sort((i,s)=>new Date(s.submitted_at||s.created_at)-new Date(i.submitted_at||i.created_at));const n=[["","T\u1EA5t c\u1EA3"],...FILTERABLE_ASSIGNMENT_SKILLS.map(i=>[i,`${SKILL_ICONS[i]} ${SKILL_LABELS[i]}`])];$("#app").innerHTML=`
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">\u{1F4CA} L\u1ECBch s\u1EED b\xE0i l\xE0m</div>
          <div class="page-subtitle">L\u1EDBp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>

      <div class="history-filters">
        <div class="skill-filter-tabs">
          ${n.map(([i,s])=>`
            <button class="skill-filter-tab ${_historyFilter.skill===i?"active":""}"
              onclick="setHistoryFilter('skill','${i}')">${s}</button>`).join("")}
        </div>
        <div class="history-band-filter">
          <label>Band t\u1ED1i thi\u1EC3u:</label>
          <select onchange="setHistoryFilter('minBand', Number(this.value))">
            ${[0,5,5.5,6,6.5,7,7.5,8].map(i=>`<option value="${i}" ${_historyFilter.minBand===i?"selected":""}>${i===0?"Kh\xF4ng l\u1ECDc":i+"+"}</option>`).join("")}
          </select>
        </div>
      </div>

      ${e.length===0?`
        <div class="empty-state-v2">
          <div class="empty-illu">\u{1F4ED}</div>
          <div class="empty-title">Ch\u01B0a c\xF3 b\xE0i \u0111\xE3 n\u1ED9p n\xE0o</div>
          <div class="empty-desc">C\xE1c b\xE0i b\u1EA1n \u0111\xE3 n\u1ED9p s\u1EBD hi\u1EC7n \u1EDF \u0111\xE2y.</div>
        </div>`:`
        <div class="history-list">
          ${e.map(i=>historyRow(i)).join("")}
        </div>`}
    </div>`}function historyRow(t){const e=getHistoryItemScore(t),n=e!=null;return`
    <a href="${getHistoryItemHref(t)}" class="history-row">
      <div class="history-row-icon">${SKILL_ICONS[t.skill]||"\u{1F4DD}"}</div>
      <div class="history-row-body">
        <div class="history-row-title">${escapeHtml(t.title)}</div>
        <div class="history-row-meta">
          ${skillBadge(t.skill)}
          <span class="history-row-date">${formatDateTime(t.submitted_at||t.created_at)}</span>
        </div>
      </div>
      <div class="history-row-score">
        ${n?`<div class="band-pill">${formatBandScore(e)}</div><div class="band-pill-label">Band</div>`:'<div class="band-pill waiting">\u23F3</div><div class="band-pill-label">Ch\u1EDD ch\u1EA5m</div>'}
      </div>
    </a>`}function setHistoryFilter(t,e){_historyFilter[t]=e,renderHistory(getHistorySourceItems(window._cachedAssignments||[]))}let _calMonth=null;async function showCalendar(){setLoading("\u0110ang t\u1EA3i l\u1ECBch...");const t=routeToken();try{const e=await getAssignments();if(routeChanged(t))return;if(!_calMonth){const n=new Date;_calMonth=[n.getFullYear(),n.getMonth()]}renderCalendar(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i l\u1ECBch: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c l\u1ECBch h\u1ECDc",e,"/calendar")}}function renderCalendar(t){const[e,n]=_calMonth,i=new Date(e,n,1),s=new Date(e,n+1,0),a=(i.getDay()+6)%7,o=s.getDate(),l={};for(const r of t){if(r.deadline){const m=toDateKey(r.deadline);(l[m]||(l[m]={deadlines:[],submissions:[]})).deadlines.push(r)}if(r.submission_id){const m=toDateKey(r.submitted_at||r.created_at);m&&(l[m]||(l[m]={deadlines:[],submissions:[]})).submissions.push(r)}}const d=["T2","T3","T4","T5","T6","T7","CN"].map(r=>`<div class="cal-weekday">${r}</div>`).join("");let c="";for(let r=0;r<a;r++)c+='<div class="cal-cell empty"></div>';for(let r=1;r<=o;r++){const m=`${e}-${String(n+1).padStart(2,"0")}-${String(r).padStart(2,"0")}`,u=l[m],g=new Date().toISOString().slice(0,10),h=m===g;let v="";u&&(u.deadlines.length&&(v+=`<span class="cal-dot deadline" title="${u.deadlines.length} deadline"></span>`),u.submissions.length&&(v+=`<span class="cal-dot submitted" title="${u.submissions.length} \u0111\xE3 n\u1ED9p"></span>`)),c+=`
      <div class="cal-cell${h?" today":""}${u?" has-event":""}" data-day="${m}" onclick="selectCalDay('${m}')">
        <div class="cal-day-num">${r}</div>
        <div class="cal-dots">${v}</div>
      </div>`}const p=i.toLocaleDateString("vi-VN",{month:"long",year:"numeric"});$("#app").innerHTML=`
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">\u{1F4C5} L\u1ECBch h\u1ECDc</div>
          <div class="page-subtitle">L\u1EDBp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>
      <div class="cal-toolbar">
        <button class="btn-replay" onclick="changeCalMonth(-1)">\u2039 Th\xE1ng tr\u01B0\u1EDBc</button>
        <div class="cal-month-label">${p}</div>
        <button class="btn-replay" onclick="changeCalMonth(1)">Th\xE1ng sau \u203A</button>
      </div>
      <div class="cal-grid">
        ${d}
        ${c}
      </div>
      <div class="cal-legend">
        <span><span class="cal-dot deadline"></span> Deadline</span>
        <span><span class="cal-dot submitted"></span> \u0110\xE3 n\u1ED9p</span>
      </div>
      <div id="cal-detail" class="cal-detail"></div>
    </div>`}function changeCalMonth(t){let[e,n]=_calMonth;n+=t,n<0&&(e--,n=11),n>11&&(e++,n=0),_calMonth=[e,n],renderCalendar(window._cachedAssignments||[])}function selectCalDay(t){const n=(window._cachedAssignments||[]).filter(s=>(s.deadline||"").slice(0,10)===t||s.submission_id&&toDateKey(s.submitted_at||s.created_at)===t),i=document.getElementById("cal-detail");if(i){if(!n.length){i.innerHTML=`<div class="cal-detail-empty">Kh\xF4ng c\xF3 s\u1EF1 ki\u1EC7n ng\xE0y ${t}</div>`;return}i.innerHTML=`
    <div class="cal-detail-title">S\u1EF1 ki\u1EC7n ng\xE0y ${t}</div>
    ${n.map(s=>`
      <a href="#/${s.submission_id?"result":"assignment"}/${s.id}" class="cal-event-item">
        <span>${SKILL_ICONS[s.skill]||"\u{1F4DD}"}</span>
        <span class="cal-event-title">${escapeHtml(s.title)}</span>
        <span class="cal-event-status">${s.submission_id?"\u2705 \u0110\xE3 n\u1ED9p":"\u23F3 H\u1EA1n"}</span>
      </a>`).join("")}`}}function profileTargetKey(){return`ielts_target:${_student?.id}`}function getTargetBand(){return parseFloat(localStorage.getItem(profileTargetKey()))||6.5}function setTargetBand(t){localStorage.setItem(profileTargetKey(),String(t))}async function showProfile(){setLoading("\u0110ang t\u1EA3i h\u1ED3 s\u01A1...");const t=routeToken();try{const[e,n,i]=await Promise.all([getAssignments(),api.get("/student/profile-answers").catch(()=>({fields:[],answers:{}})),api.get("/student/vocab/sessions").catch(()=>[]),loadMyVocab()]);if(routeChanged(t))return;window._cachedProfileData=n,window._cachedVocabSessions=i,updateStudentState({email:getStudentNotificationEmail(n)||null}),renderProfile(e,n)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c h\u1ED3 s\u01A1",e,"/profile")}}function renderProfile(t){const e=calculateSubmissionStreak(t,window._cachedVocabSessions||[]),n=getTargetBand(),i=getSubmittedAssignments(t),a=t.filter(b=>b.submission_id&&b.overall_score!=null).map(b=>Number(b.overall_score)).filter(Boolean),o=a.length?(a.reduce((b,w)=>b+w,0)/a.length).toFixed(1):"\u2014",l=["reading","listening","writing","speaking"],d=getIeltsGradedAssignments(t),c=l.map(b=>{const w=d.filter(T=>T.skill===b).sort((T,N)=>new Date(T.created_at)-new Date(N.created_at)),k=w.map(T=>Number(T.overall_score)).filter(T=>T>0),E=k.length?k.reduce((T,N)=>T+N,0)/k.length:null,I=k.length?Math.max(...k):null;return{sk:b,count:w.length,avg:E,best:I,timeline:k}}),p=new Set(i.map(b=>toDateKey(b.submitted_at||b.created_at)).filter(Boolean)),r=new Set(e.days),m=[];for(let b=6;b>=0;b--){const w=new Date;w.setDate(w.getDate()-b);const k=toDateKey(w),E=w.toLocaleDateString("vi-VN",{weekday:"short"});m.push(`<div class="home-streak-day ${r.has(k)?"on":""}" title="${k}">
      <div class="streak-dot">${r.has(k)?"\u{1F525}":"\xB7"}</div>
      <div class="streak-day-label">${E}</div>
    </div>`)}const u=(_myVocabCache||[]).length,g=[5,5.5,6,6.5,7,7.5,8,8.5,9].map(b=>`<option value="${b}" ${n===b?"selected":""}>${b}</option>`).join(""),h=(_student.full_name||"?").split(" ").map(b=>b[0]).join("").slice(0,2).toUpperCase(),v=e.current>=30?"#dc2626":e.current>=7?"#f59e0b":"#6b7280",f={reading:"#0f766e",listening:"#7c3aed",writing:"#d97706",speaking:"#dc2626"},_={reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"},S={reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking"},y=b=>i.filter(w=>w.skill===b).sort((w,k)=>new Date(k.submitted_at||k.created_at)-new Date(w.submitted_at||w.created_at));function x(b,w){if(b.length<2)return"";const k=100,E=28,I=b.map((P,D)=>{const F=D/(b.length-1)*k,q=E-P/9*E;return`${F.toFixed(1)},${q.toFixed(1)}`}).join(" "),T=k,N=E-b[b.length-1]/9*E;return`<svg viewBox="0 0 ${k} ${E}" preserveAspectRatio="none" style="width:100%;height:28px;display:block">
      <polyline fill="none" stroke="${w}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${I}"/>
      <circle cx="${T.toFixed(1)}" cy="${N.toFixed(1)}" r="3" fill="${w}"/>
    </svg>`}function C({sk:b,count:w,avg:k,best:E,timeline:I}){const T=f[b],N=k!==null?Math.min(100,Math.round(k/n*100)):0,P=k===null?"":k>=n?"\u2705":k>=n-.5?"\u{1F7E1}":"\u{1F534}",D=x(I,T),F=k!==null?k>=n?`<span class="spc-vs ok">+${(k-n).toFixed(1)} vs target</span>`:`<span class="spc-vs gap">-${(n-k).toFixed(1)} vs target</span>`:"",q=y(b).length;return`
      <button class="skill-progress-card spc-${b}" type="button"
        onclick="openSkillProgressModal('${b}')">
        <div class="spc-head">
          <span class="spc-icon">${_[b]}</span>
          <span class="spc-name">${S[b]}</span>
          <span>${P}</span>
        </div>
        <div class="spc-band-row">
          <span class="spc-band" style="color:${T}">${k!==null?k.toFixed(1):"\u2014"}</span>
          ${F}
        </div>
        <div class="spc-bar-wrap">
          <div class="spc-bar" style="width:${N}%;background:${T}"></div>
        </div>
        <div class="spc-bar-label">${k!==null?k.toFixed(1):"\u2014"} / ${n} target</div>
        ${D?`<div class="spc-spark">${D}</div>`:'<div class="spc-spark spc-spark-empty">Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u</div>'}
        <div class="spc-meta">${w===0?"Ch\u01B0a c\xF3 b\xE0i n\xE0o \u0111\u01B0\u1EE3c ch\u1EA5m":`${w} b\xE0i \u0111\xE3 ch\u1EA5m \xB7 Best: ${E}`}</div>
        <div class="spc-footnote">${q>0?`${q} b\xE0i \u0111\xE3 l\xE0m \xB7 Nh\u1EA5n \u0111\u1EC3 xem chi ti\u1EBFt`:"Ch\u01B0a c\xF3 b\xE0i \u0111\xE3 l\xE0m"}</div>
      </button>`}const L=28,M=new Date;M.setDate(M.getDate()-(L-1));const A=(M.getDay()+6)%7,H=Array(A).fill('<div class="act-cell act-pad"></div>');for(let b=L-1;b>=0;b--){const w=new Date;w.setDate(w.getDate()-b);const k=w.toISOString().slice(0,10);H.push(`<div class="act-cell ${p.has(k)?"act-done":"act-none"}" title="${k}"></div>`)}const B=[];c.forEach(({sk:b,best:w})=>{w!==null&&B.push(`<div class="ms-card"><div class="ms-icon">${_[b]}</div><div class="ms-val">${w}</div><div class="ms-label">Best ${S[b]}</div></div>`)}),i.length>0&&B.push(`<div class="ms-card"><div class="ms-icon">\u{1F4DD}</div><div class="ms-val">${i.length}</div><div class="ms-label">B\xE0i \u0111\xE3 n\u1ED9p</div></div>`),e.best>1&&B.push(`<div class="ms-card"><div class="ms-icon">\u{1F525}</div><div class="ms-val">${e.best}</div><div class="ms-label">Streak k\u1EF7 l\u1EE5c</div></div>`),u>0&&B.push(`<div class="ms-card"><div class="ms-icon">\u{1F4D6}</div><div class="ms-val">${u}</div><div class="ms-label">T\u1EEB \u0111\xE3 l\u01B0u</div></div>`),$("#app").innerHTML=`
    <div class="container profile-page">

      <!-- Hero -->
      <div class="profile-hero">
        <div class="profile-avatar" style="background:${f.reading}">${h}</div>
        <div class="profile-hero-info">
          <div class="profile-name">
            <span id="profile-name-text">${escapeHtml(_student.full_name)}</span>
            <button class="profile-name-edit-btn" onclick="startEditProfileName()" title="\u0110\u1ED5i t\xEAn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div class="profile-meta">L\u1EDBp ${escapeHtml(_selectedClass.class_name)}</div>
          <div class="profile-meta-row">
            <span class="profile-streak" style="color:${v}">\u{1F525} ${e.current} ng\xE0y</span>
            <span class="profile-dot">\xB7</span>
            <span>Band TB: <strong>${o}</strong></span>
            <span class="profile-dot">\xB7</span>
            <span>${i.length} b\xE0i \u0111\xE3 n\u1ED9p</span>
          </div>
        </div>
        <div class="profile-target-box">
          <div class="profile-target-label">\u{1F3AF} Target band</div>
          <select id="target-band-select" class="profile-target-select">
            ${g}
          </select>
        </div>
      </div>

      <div class="profile-section-title">\u{1F525} Streak h\u1ECDc t\u1EADp</div>
      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${e.current>=7?"\u{1F525}\u{1F525}":"\u{1F525}"}</div>
          <div>
            <div class="streak-current">Streak ${e.current} ng\xE0y</div>
            <div class="streak-best">K\u1EF7 l\u1EE5c: ${e.best} ng\xE0y \xB7 T\xEDnh theo ng\xE0y c\xF3 submit b\xE0i</div>
          </div>
        </div>
        <div class="home-streak-week">${m.join("")}</div>
      </div>

      <!-- Skill cards -->
      <div class="profile-section-title">\u{1F4C8} Ti\u1EBFn \u0111\u1ED9 k\u1EF9 n\u0103ng</div>
      <div class="skill-cards-grid">
        ${c.map(b=>C(b)).join("")}
      </div>

      <!-- Activity grid -->
      <div class="profile-section-title">\u{1F5D3} Ho\u1EA1t \u0111\u1ED9ng 28 ng\xE0y qua</div>
      <div class="activity-wrap">
        <div class="activity-day-labels">${["T2","T3","T4","T5","T6","T7","CN"].map(b=>`<span>${b}</span>`).join("")}</div>
        <div class="activity-grid">${H.join("")}</div>
        <div class="activity-legend">
          <span class="act-sample act-none"></span><span>Kh\xF4ng h\u1ECDc</span>
          <span class="act-sample act-done" style="margin-left:12px"></span><span>C\xF3 n\u1ED9p b\xE0i</span>
        </div>
      </div>

      <!-- Milestones -->
      ${B.length>0?`
        <div class="profile-section-title">\u{1F3C6} Th\xE0nh t\xEDch c\xE1 nh\xE2n</div>
        <div class="milestones-row">${B.join("")}</div>
      `:""}

      <!-- Quick actions -->
      <div class="profile-section-title">\u{1F680} Ti\u1EBFp t\u1EE5c h\u1ECDc</div>
      <div class="profile-quick-row">
        <a href="#/my-vocab" class="profile-quick-btn pqb-vocab">\u{1F4D6} T\u1EEB v\u1EF1ng c\u1EE7a t\xF4i <span class="pqb-badge">${u}</span></a>
        <a href="#/vocab-games" class="profile-quick-btn">\u{1F0CF} Luy\u1EC7n t\u1EEB</a>
        <a href="#/history" class="profile-quick-btn">\u{1F4CA} L\u1ECBch s\u1EED</a>
        <a href="#/assignments" class="profile-quick-btn">\u{1F4CB} B\xE0i t\u1EADp</a>
      </div>
    </div>`,document.getElementById("target-band-select")?.addEventListener("change",function(){setTargetBand(Number(this.value)),renderProfile(t)})}renderHome=function(t){const e=calculateSubmissionStreak(t,window._cachedVocabSessions||[]),n=t.length,i=getSubmittedAssignments(t).length,s=t.filter(r=>!r.submission_id&&r.is_active).length,a=calculateOverallAverage(t),o=toDateKey(new Date),l=t.filter(r=>r.submission_id||!r.is_active||!r.deadline?!1:toDateKey(r.deadline)===o),d=t.filter(r=>!r.submission_id&&r.is_active).sort((r,m)=>r.deadline?m.deadline?new Date(r.deadline)-new Date(m.deadline):-1:1).slice(0,5),c=[],p=new Set(e.days);for(let r=6;r>=0;r--){const m=new Date;m.setDate(m.getDate()-r);const u=toDateKey(m),g=m.toLocaleDateString("vi-VN",{weekday:"short"});c.push(`<div class="home-streak-day ${p.has(u)?"on":""}" title="${u}">
      <div class="streak-dot">${p.has(u)?"\u{1F525}":"\xB7"}</div>
      <div class="streak-day-label">${g}</div>
    </div>`)}$("#app").innerHTML=`
    <div class="container home-page">
      <div class="home-greeting">
        <div>
          <div class="home-hi">Xin ch\xE0o, ${escapeHtml(_student.full_name)} \u{1F44B}</div>
          <div class="home-sub">L\u1EDBp ${escapeHtml(_selectedClass.class_name)} \xB7 ${new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
      </div>

      <div class="home-quick-actions home-quick-actions--top">
        <a href="#/assignments" class="home-quick-btn">\u{1F4CB} T\u1EA5t c\u1EA3 b\xE0i t\u1EADp</a>
        <a href="#/history" class="home-quick-btn">\u{1F4CA} L\u1ECBch s\u1EED</a>
        <a href="#/calendar" class="home-quick-btn">\u{1F4C5} L\u1ECBch h\u1ECDc</a>
        <a href="#/vocab-games" class="home-quick-btn">\u{1F0CF} \xD4n t\u1EEB v\u1EF1ng</a>
      </div>

      ${renderTargetSummaryCompact(t)}

      <div class="home-stats-row">
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">\u{1F4CB}</div>
          <div class="stat-num">${n}</div>
          <div class="stat-label">T\u1ED5ng b\xE0i</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">\u2705</div>
          <div class="stat-num">${i}</div>
          <div class="stat-label">\u0110\xE3 n\u1ED9p</div>
        </a>
        <a href="#/assignments" class="home-stat-card">
          <div class="stat-icon">\u23F3</div>
          <div class="stat-num">${s}</div>
          <div class="stat-label">C\u1EA7n l\xE0m</div>
        </a>
        <a href="#/history" class="home-stat-card">
          <div class="stat-icon">\u{1F3AF}</div>
          <div class="stat-num">${a!==null?a.toFixed(1):"\u2014"}</div>
          <div class="stat-label">Band TB</div>
        </a>
      </div>

      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${e.current>=7?"\u{1F525}\u{1F525}":"\u{1F525}"}</div>
          <div>
            <div class="streak-current">Streak ${e.current} ng\xE0y</div>
            <div class="streak-best">K\u1EF7 l\u1EE5c: ${e.best} ng\xE0y</div>
          </div>
        </div>
        <div class="home-streak-week">${c.join("")}</div>
      </div>

      <div class="home-section-title">\u{1F4C8} Ti\u1EBFn \u0111\u1ED9 g\u1EA7n \u0111\xE2y</div>
      <div class="chart-section-toolbar chart-section-toolbar--compact">
        <div class="chart-section-copy">Bi\u1EC3u \u0111\u1ED3 r\xFAt g\u1ECDn theo \u0111i\u1EC3m trung b\xECnh t\u1EEBng ng\xE0y \u0111\xE3 ch\u1EA5m.</div>
        ${renderChartRangeButtons("home",_homeChartRange)}
      </div>
      <div class="home-chart-grid">
        ${SKILL_ORDER.map(r=>renderSkillChartCard(t,r,_homeChartRange,"home")).join("")}
      </div>

      ${l.length>0?`
        <div class="home-section-title">\u23F0 \u0110\u1EBFn h\u1EA1n h\xF4m nay (${l.length})</div>
        <div class="home-due-today">
          ${l.map(r=>homeAssignCard(r,!0)).join("")}
        </div>`:""}

      <div class="home-section-title">\u{1F4CC} B\xE0i t\u1EADp s\u1EAFp t\u1EDBi</div>
      ${d.length===0?`
        <div class="empty-state-v2">
          <div class="empty-illu">\u{1F389}</div>
          <div class="empty-title">\u0110\xE3 l\xE0m h\u1EBFt b\xE0i r\u1ED3i!</div>
          <div class="empty-desc">Quay l\u1EA1i sau khi gi\xE1o vi\xEAn giao th\xEAm.</div>
        </div>
      `:`<div class="home-pending-list">${d.map(r=>homeAssignCard(r,!1)).join("")}</div>`}
    </div>`},renderHistory=function(t){let e=t.slice();_historyFilter.skill&&(e=e.filter(i=>i.skill===_historyFilter.skill)),_historyFilter.minBand>0&&(e=e.filter(i=>Number(getHistoryItemScore(i)||0)>=_historyFilter.minBand)),e.sort((i,s)=>new Date(s.submitted_at||s.created_at)-new Date(i.submitted_at||i.created_at));const n=[["","T\u1EA5t c\u1EA3"],...FILTERABLE_ASSIGNMENT_SKILLS.map(i=>[i,`${SKILL_ICONS[i]} ${SKILL_LABELS[i]}`])];$("#app").innerHTML=`
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">\u{1F4CA} L\u1ECBch s\u1EED b\xE0i l\xE0m</div>
          <div class="page-subtitle">L\u1EDBp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>

      <div class="history-filters">
        <div class="skill-filter-tabs">
          ${n.map(([i,s])=>`
            <button class="skill-filter-tab ${_historyFilter.skill===i?"active":""}"
              onclick="setHistoryFilter('skill','${i}')">${s}</button>`).join("")}
        </div>
        <div class="history-band-filter">
          <label>Band t\u1ED1i thi\u1EC3u:</label>
          <select onchange="setHistoryFilter('minBand', Number(this.value))">
            ${[0,5,5.5,6,6.5,7,7.5,8].map(i=>`<option value="${i}" ${_historyFilter.minBand===i?"selected":""}>${i===0?"Kh\xF4ng l\u1ECDc":i+"+"}</option>`).join("")}
          </select>
        </div>
      </div>

      ${e.length===0?`
        <div class="empty-state-v2">
          <div class="empty-illu">\u{1F4ED}</div>
          <div class="empty-title">Ch\u01B0a c\xF3 b\xE0i \u0111\xE3 n\u1ED9p n\xE0o</div>
          <div class="empty-desc">C\xE1c b\xE0i b\u1EA1n \u0111\xE3 n\u1ED9p s\u1EBD hi\u1EC7n \u1EDF \u0111\xE2y.</div>
        </div>`:`
        <div class="history-list">
          ${e.map(i=>historyRow(i)).join("")}
        </div>`}
    </div>`},historyRow=function(t){const e=getHistoryItemScore(t),n=e!=null;return`
    <a href="${getHistoryItemHref(t)}" class="history-row">
      <div class="history-row-icon">${SKILL_ICONS[t.skill]||"\u{1F4DD}"}</div>
      <div class="history-row-body">
        <div class="history-row-title">${escapeHtml(t.title)}</div>
        <div class="history-row-meta">
          ${skillBadge(t.skill)}
          <span class="history-row-date">${formatDateTime(t.submitted_at||t.created_at)}</span>
        </div>
      </div>
      <div class="history-row-score">
        ${n?`<div class="band-pill">${formatBandScore(e)}</div><div class="band-pill-label">Band</div>`:'<div class="band-pill waiting">\u23F3</div><div class="band-pill-label">Ch\u1EDD ch\u1EA5m</div>'}
      </div>
    </a>`},renderCalendar=function(t){const[e,n]=_calMonth,i=new Date(e,n,1),s=new Date(e,n+1,0),a=(i.getDay()+6)%7,o=s.getDate(),l={};for(const r of t){if(r.deadline){const m=toDateKey(r.deadline);(l[m]||(l[m]={deadlines:[],submissions:[]})).deadlines.push(r)}if(r.submission_id){const m=toDateKey(r.submitted_at||r.created_at);m&&(l[m]||(l[m]={deadlines:[],submissions:[]})).submissions.push(r)}}const d=["T2","T3","T4","T5","T6","T7","CN"].map(r=>`<div class="cal-weekday">${r}</div>`).join("");let c="";for(let r=0;r<a;r++)c+='<div class="cal-cell empty"></div>';for(let r=1;r<=o;r++){const m=`${e}-${String(n+1).padStart(2,"0")}-${String(r).padStart(2,"0")}`,u=l[m],g=m===toDateKey(new Date);let h="";u&&(u.deadlines.length&&(h+=`<span class="cal-dot deadline" title="${u.deadlines.length} deadline"></span>`),u.submissions.length&&(h+=`<span class="cal-dot submitted" title="${u.submissions.length} \u0111\xE3 n\u1ED9p"></span>`)),c+=`
      <div class="cal-cell${g?" today":""}${u?" has-event":""}" data-day="${m}" onclick="selectCalDay('${m}')">
        <div class="cal-day-num">${r}</div>
        <div class="cal-dots">${h}</div>
      </div>`}const p=i.toLocaleDateString("vi-VN",{month:"long",year:"numeric"});$("#app").innerHTML=`
    <div class="container">
      <div class="page-header">
        <div>
          <div class="page-title">\u{1F4C5} L\u1ECBch h\u1ECDc</div>
          <div class="page-subtitle">L\u1EDBp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
      </div>
      <div class="cal-toolbar">
        <button class="btn-replay" onclick="changeCalMonth(-1)">\u2039 Th\xE1ng tr\u01B0\u1EDBc</button>
        <div class="cal-month-label">${p}</div>
        <button class="btn-replay" onclick="changeCalMonth(1)">Th\xE1ng sau \u203A</button>
      </div>
      <div class="cal-grid">
        ${d}
        ${c}
      </div>
      <div class="cal-legend">
        <span><span class="cal-dot deadline"></span> Deadline</span>
        <span><span class="cal-dot submitted"></span> \u0110\xE3 n\u1ED9p</span>
      </div>
      <div id="cal-detail" class="cal-detail"></div>
    </div>`},selectCalDay=function(t){const n=(window._cachedAssignments||[]).filter(s=>(s.deadline||"").slice(0,10)===t||s.submission_id&&toDateKey(s.submitted_at||s.created_at)===t),i=document.getElementById("cal-detail");if(i){if(!n.length){i.innerHTML=`<div class="cal-detail-empty">Kh\xF4ng c\xF3 s\u1EF1 ki\u1EC7n ng\xE0y ${t}</div>`;return}i.innerHTML=`
    <div class="cal-detail-title">S\u1EF1 ki\u1EC7n ng\xE0y ${t}</div>
    ${n.map(s=>`
      <a href="#/${s.submission_id?"result":"assignment"}/${s.id}" class="cal-event-item">
        <span>${SKILL_ICONS[s.skill]||"\u{1F4DD}"}</span>
        <span class="cal-event-title">${escapeHtml(s.title)}</span>
        <span class="cal-event-status">${s.submission_id?"\u2705 \u0110\xE3 n\u1ED9p":"\u23F3 H\u1EA1n"}</span>
      </a>`).join("")}`}},renderProfile=function(t,e){e=e||window._cachedProfileData||{fields:[],answers:{}};const n=(e.fields||[]).find(y=>y.field_key==="notification_email"),i=(e.fields||[]).filter(y=>y.field_key!=="notification_email"),s=_student&&typeof _student.email=="string"&&_student.email.trim()||e.student&&typeof e.student.email=="string"&&e.student.email.trim()||(n?String(e.answers?.[n.id]||"").trim():""),a=calculateSubmissionStreak(t,window._cachedVocabSessions||[]),o=getTargetSettings(),l=getSubmittedAssignments(t),d=calculateOverallAverage(t),c=d!==null?d.toFixed(1):"\u2014",p=SKILL_ORDER.map(y=>{const x=getSkillGradedAssignments(t,y).map(C=>Number(C.overall_score)).filter(Number.isFinite);return{sk:y,best:x.length?Math.max(...x):null}}),r=new Set(l.map(y=>toDateKey(y.submitted_at||y.created_at)).filter(Boolean)),m=new Set(a.days),u=[];for(let y=6;y>=0;y--){const x=new Date;x.setDate(x.getDate()-y);const C=toDateKey(x),L=x.toLocaleDateString("vi-VN",{weekday:"short"});u.push(`<div class="home-streak-day ${m.has(C)?"on":""}" title="${C}">
      <div class="streak-dot">${m.has(C)?"\u{1F525}":"\xB7"}</div>
      <div class="streak-day-label">${L}</div>
    </div>`)}const g=(_myVocabCache||[]).length,h=(_student.full_name||"?").split(" ").map(y=>y[0]).join("").slice(0,2).toUpperCase(),v=a.current>=30?"#dc2626":a.current>=7?"#f59e0b":"#6b7280",f={reading:"#0f766e",listening:"#7c3aed",writing:"#d97706",speaking:"#dc2626"},_=[];p.forEach(({sk:y,best:x})=>{x!==null&&_.push(`<div class="ms-card"><div class="ms-icon">${SKILL_ICONS[y]}</div><div class="ms-val">${x}</div><div class="ms-label">Best ${SKILL_LABELS[y]}</div></div>`)}),l.length>0&&_.push(`<div class="ms-card"><div class="ms-icon">\u{1F4DD}</div><div class="ms-val">${l.length}</div><div class="ms-label">B\xE0i \u0111\xE3 n\u1ED9p</div></div>`),a.best>1&&_.push(`<div class="ms-card"><div class="ms-icon">\u{1F525}</div><div class="ms-val">${a.best}</div><div class="ms-label">Streak k\u1EF7 l\u1EE5c</div></div>`),g>0&&_.push(`<div class="ms-card"><div class="ms-icon">\u{1F4D6}</div><div class="ms-val">${g}</div><div class="ms-label">T\u1EEB \u0111\xE3 l\u01B0u</div></div>`);const S=[["profile-info","\u{1F4CB} Th\xF4ng tin"],["profile-streak","\u{1F525} Streak"],["profile-targets","\u{1F3AF} Target"],["profile-progress","\u{1F4C8} Ti\u1EBFn \u0111\u1ED9"],..._.length>0?[["profile-achievements","\u{1F3C6} Th\xE0nh t\xEDch"]]:[],["profile-next-steps","\u{1F680} Ti\u1EBFp t\u1EE5c h\u1ECDc"]];$("#app").innerHTML=`
    <div class="container profile-page">
      <div class="profile-hero">
        <div class="profile-avatar" style="background:${f.reading}">${h}</div>
        <div class="profile-hero-info">
          <div class="profile-name">
            <span id="profile-name-text">${escapeHtml(_student.full_name)}</span>
            <button class="profile-name-edit-btn" onclick="startEditProfileName()" title="\u0110\u1ED5i t\xEAn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div class="profile-meta">L\u1EDBp ${escapeHtml(_selectedClass.class_name)}</div>
          <div class="profile-meta-row">
            <span class="profile-streak" style="color:${v}">\u{1F525} ${a.current} ng\xE0y</span>
            <span class="profile-dot">\xB7</span>
            <span>Band TB: <strong>${c}</strong></span>
            <span class="profile-dot">\xB7</span>
            <span>${l.length} b\xE0i \u0111\xE3 n\u1ED9p</span>
          </div>
        </div>
        <div class="profile-target-box profile-target-box--summary">
          <div class="profile-target-label">\u{1F3AF} Overall target</div>
          <div class="profile-target-pill">${o.overall.toFixed(1)}</div>
        </div>
      </div>

      <div class="profile-nav">
        <div class="profile-nav-list">
          ${S.map(([y,x])=>`
            <button type="button" class="profile-nav-btn" onclick="scrollProfileSection('${y}')">${x}</button>
          `).join("")}
        </div>
      </div>

      <section id="profile-info" class="profile-anchor-section">
      <div class="profile-section-title">\u{1F4CB} Th\xF4ng tin c\xE1 nh\xE2n</div>
      <div class="pi-card${i.length===0?" pi-card--compact":""}">
        <div class="pi-account-box">
          <div class="pi-account-grid">
            <div class="pi-account-panel">
              <div class="pi-label">Username \u0111\u0103ng nh\u1EADp</div>
              <div class="pi-account-username">${escapeHtml(_student.username||"\u2014")}</div>
              <div class="pi-account-panel-actions">
                <button type="button" class="btn btn-outline btn-sm pi-account-btn" onclick="openChangePasswordModal()">\u{1F510} \u0110\u1ED5i m\u1EADt kh\u1EA9u</button>
              </div>
            </div>
            <div class="pi-account-panel pi-account-panel--email">
              <label class="pi-label" for="profile-email-input">Gmail nh\u1EADn th\xF4ng b\xE1o</label>
              <div class="pi-account-email-edit-row">
                <input id="profile-email-input" class="form-input pi-account-email-input" type="email"
                  value="${escapeHtml(s)}"
                  placeholder="name@example.com"
                  autocomplete="email"
                  disabled />
                <div class="pi-account-email-actions">
                  <button type="button" class="btn btn-outline btn-sm" id="profile-email-edit-btn" onclick="enableNotificationEmailEdit()">
                    ${s?"\u0110\u1ED5i Gmail":"C\u1EADp nh\u1EADt Gmail"}
                  </button>
                  <button type="button" class="btn btn-primary btn-sm hidden" id="profile-email-save-btn" onclick="submitNotificationEmailUpdate(this)">L\u01B0u Gmail</button>
                  <button type="button" class="btn btn-outline btn-sm hidden" id="profile-email-cancel-btn" onclick="cancelNotificationEmailEdit()">H\u1EE7y</button>
                </div>
              </div>
              <div class="form-hint">Gmail n\xE0y s\u1EBD nh\u1EADn m\u1EADt kh\u1EA9u m\u1EDBi khi qu\xEAn m\u1EADt kh\u1EA9u v\xE0 email th\xF4ng b\xE1o t\u1EEB h\u1EC7 th\u1ED1ng.</div>
            </div>
          </div>
        </div>
        ${i.length===0?"":`<details class="pi-details">
              <summary class="pi-details-summary">
                <span>
                  <span class="pi-details-title">Th\xF4ng tin chi ti\u1EBFt</span>
                  <span class="pi-details-sub">${i.length} m\u1EE5c h\u1ED3 s\u01A1</span>
                </span>
                <span class="pi-details-arrow">\u2304</span>
              </summary>
              <div class="pi-details-body">
                <div class="pi-fields" id="pi-fields">
                  ${i.map(y=>{const x=e.answers[y.id]||"",C=`pi-field-${y.id}`;let L;if(y.field_type==="textarea")L=`<textarea id="${C}" class="form-input pi-input" data-field-id="${y.id}" rows="3" placeholder="Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u">${escapeHtml(x)}</textarea>`;else if(y.field_type==="select"&&Array.isArray(y.options)){const M=y.options.map(A=>`<option value="${escapeHtml(String(A))}" ${x===String(A)?"selected":""}>${escapeHtml(String(A))}</option>`).join("");L=`<select id="${C}" class="form-input pi-input" data-field-id="${y.id}"><option value="">-- Ch\u01B0a ch\u1ECDn --</option>${M}</select>`}else if(y.field_type==="date")L=`<input id="${C}" class="form-input pi-input" type="date" data-field-id="${y.id}" value="${escapeHtml(x)}" />`;else{const M=y.field_key==="notification_email"?"email":"text",A=y.field_key==="notification_email"?"name@example.com":"Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u";L=`<input id="${C}" class="form-input pi-input" type="${M}" data-field-id="${y.id}" value="${escapeHtml(x)}" placeholder="${A}" />`}return`<div class="pi-field">
                      <label class="pi-label" for="${C}">${escapeHtml(y.label)}</label>
                      ${L}
                    </div>`}).join("")}
                </div>
                <div class="pi-actions">
                  <button class="btn btn-primary" id="pi-save-btn" onclick="saveProfileAnswers(this)">L\u01B0u th\xF4ng tin</button>
                </div>
              </div>
            </details>`}
      </div>
      </section>

      <section id="profile-streak" class="profile-anchor-section">
      <div class="profile-section-title">\u{1F525} Streak h\u1ECDc t\u1EADp</div>
      <div class="home-streak-card">
        <div class="home-streak-head">
          <div class="streak-fire">${a.current>=7?"\u{1F525}\u{1F525}":"\u{1F525}"}</div>
          <div>
            <div class="streak-current">Streak ${a.current} ng\xE0y</div>
            <div class="streak-best">K\u1EF7 l\u1EE5c: ${a.best} ng\xE0y \xB7 T\xEDnh theo ng\xE0y c\xF3 submit b\xE0i</div>
          </div>
        </div>
        <div class="home-streak-week">${u.join("")}</div>
      </div>
      </section>

      <section id="profile-targets" class="profile-anchor-section">
      <div class="profile-section-title">\u{1F3AF} Target band</div>
      ${renderSkillTargetEditor(t)}
      </section>

      <section id="profile-progress" class="profile-anchor-section">
      <div class="profile-section-title">\u{1F4C8} Ti\u1EBFn \u0111\u1ED9 k\u1EF9 n\u0103ng</div>
      <div class="chart-section-toolbar">
        <div class="chart-section-copy">Bi\u1EC3u \u0111\u1ED3 chi ti\u1EBFt theo ng\xE0y, l\u1EA5y \u0111i\u1EC3m trung b\xECnh c\u1EE7a c\xE1c b\xE0i \u0111\xE3 ch\u1EA5m trong ng\xE0y.</div>
        ${renderChartRangeButtons("profile",_profileChartRange)}
      </div>
      <div class="profile-chart-grid">
        ${SKILL_ORDER.map(y=>renderSkillChartCard(t,y,_profileChartRange,"profile")).join("")}
      </div>
      </section>

      ${_.length>0?`
        <section id="profile-achievements" class="profile-anchor-section">
        <div class="profile-section-title">\u{1F3C6} Th\xE0nh t\xEDch c\xE1 nh\xE2n</div>
        <div class="milestones-row">${_.join("")}</div>
        </section>
      `:""}

      <section id="profile-next-steps" class="profile-anchor-section">
      <div class="profile-section-title">\u{1F680} Ti\u1EBFp t\u1EE5c h\u1ECDc</div>
      <div class="profile-quick-row">
        <a href="#/my-vocab" class="profile-quick-btn pqb-vocab">\u{1F4D6} T\u1EEB v\u1EF1ng c\u1EE7a t\xF4i <span class="pqb-badge">${g}</span></a>
        <a href="#/vocab-games" class="profile-quick-btn">\u{1F0CF} Luy\u1EC7n t\u1EEB</a>
        <a href="#/history" class="profile-quick-btn">\u{1F4CA} L\u1ECBch s\u1EED</a>
        <a href="#/assignments" class="profile-quick-btn">\u{1F4CB} B\xE0i t\u1EADp</a>
      </div>
      </section>
    </div>`,document.querySelectorAll(".target-editor-select").forEach(y=>{y.addEventListener("change",function(){const x={...getTargetSettings(),[this.dataset.targetKey]:Number(this.value)};setTargetSettings(x),renderProfile(t,window._cachedProfileData)})}),syncMissingEmailUI(e)};function enableNotificationEmailEdit(){const t=document.getElementById("profile-email-input"),e=document.getElementById("profile-email-edit-btn"),n=document.getElementById("profile-email-save-btn"),i=document.getElementById("profile-email-cancel-btn");!t||!e||!n||!i||(t.disabled=!1,t.focus(),t.select(),e.classList.add("hidden"),n.classList.remove("hidden"),i.classList.remove("hidden"))}function cancelNotificationEmailEdit(){const t=document.getElementById("profile-email-input"),e=document.getElementById("profile-email-edit-btn"),n=document.getElementById("profile-email-save-btn"),i=document.getElementById("profile-email-cancel-btn");!t||!e||!n||!i||(t.value=getStudentNotificationEmail()||"",t.disabled=!0,e.classList.remove("hidden"),n.classList.add("hidden"),i.classList.add("hidden"))}async function submitNotificationEmailUpdate(t){const e=getNotificationEmailField();if(!e){toast("Hi\u1EC7n ch\u01B0a t\xECm th\u1EA5y tr\u01B0\u1EDDng Gmail trong h\u1ED3 s\u01A1 h\u1ECDc sinh.","error");return}const n=document.getElementById("profile-email-input");if(!n)return;const i=n.value.trim(),s=normalizeStudentEmailValue(i);if(i&&!isValidStudentEmail(s)){toast("Gmail kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i.","error"),n.focus();return}if(await confirmSubmit({title:s?"X\xE1c nh\u1EADn c\u1EADp nh\u1EADt Gmail":"X\xE1c nh\u1EADn x\xF3a Gmail",message:s?`Sau khi x\xE1c nh\u1EADn, Gmail <strong>${escapeHtml(s)}</strong> s\u1EBD \u0111\u01B0\u1EE3c d\xF9ng \u0111\u1EC3 nh\u1EADn m\u1EADt kh\u1EA9u m\u1EDBi v\xE0 email th\xF4ng b\xE1o.`:"Sau khi x\xE1c nh\u1EADn, t\xE0i kho\u1EA3n s\u1EBD kh\xF4ng c\xF2n Gmail nh\u1EADn th\xF4ng b\xE1o cho t\u1EDBi khi b\u1EA1n c\u1EADp nh\u1EADt l\u1EA1i.",confirmText:s?"C\u1EADp nh\u1EADt Gmail":"X\xF3a Gmail",cancelText:"H\u1EE7y"})){btnLoading(t);try{await api.patch("/student/profile-answers",{answers:{[e.id]:s}}),window._cachedProfileData||(window._cachedProfileData={student:null,fields:[],answers:{}}),window._cachedProfileData.student||(window._cachedProfileData.student={}),window._cachedProfileData.answers={...window._cachedProfileData.answers||{},[e.id]:s},window._cachedProfileData.student.email=s||null,updateStudentState({email:s||null}),toast(s?"\u0110\xE3 c\u1EADp nh\u1EADt Gmail th\xE0nh c\xF4ng!":"\u0110\xE3 x\xF3a Gmail kh\u1ECFi h\u1ED3 s\u01A1.","success"),renderProfile(window._cachedAssignments||[],window._cachedProfileData)}catch(o){btnReset(t),toast(o.error||"Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt Gmail l\xFAc n\xE0y.","error")}}}async function saveProfileAnswers(t){const e=document.querySelectorAll(".pi-input"),n={};e.forEach(i=>{i.dataset.fieldId&&(n[i.dataset.fieldId]=i.value)}),t&&(t.disabled=!0,t.textContent="\u0110ang l\u01B0u...");try{await api.patch("/student/profile-answers",{answers:n}),window._cachedProfileData&&(window._cachedProfileData.answers={...window._cachedProfileData.answers,...n}),syncMissingEmailUI(window._cachedProfileData),toast("\u0110\xE3 l\u01B0u th\xF4ng tin c\xE1 nh\xE2n!")}catch(i){toast("L\u1ED7i: "+(i.error||i.message),"error")}finally{t&&(t.disabled=!1,t.textContent="L\u01B0u th\xF4ng tin")}}window.saveProfileAnswers=saveProfileAnswers;function openSkillProgressModal(t){const e=window._cachedAssignments||[],n=getSubmittedAssignments(e).filter(a=>a.skill===t).sort((a,o)=>new Date(o.submitted_at||o.created_at)-new Date(a.submitted_at||a.created_at)),i=`${SKILL_ICONS[t]||"\u{1F4DD}"} ${SKILL_LABELS[t]||t} \u2014 B\xE0i \u0111\xE3 l\xE0m`,s=n.length===0?`
      <div class="skill-modal-empty">
        <div class="skill-modal-empty-icon">${SKILL_ICONS[t]||"\u{1F4DD}"}</div>
        <div class="skill-modal-empty-title">Ch\u01B0a c\xF3 b\xE0i n\xE0o \u0111\xE3 l\xE0m</div>
        <div class="skill-modal-empty-desc">Khi b\u1EA1n n\u1ED9p b\xE0i ${SKILL_LABELS[t]||t}, danh s\xE1ch k\u1EBFt qu\u1EA3 s\u1EBD hi\u1EC7n \u1EDF \u0111\xE2y.</div>
      </div>`:`
      <div class="skill-modal-list">
        ${n.map(a=>{const o=a.overall_score!=null,l=formatDateTime(a.submitted_at||a.created_at);return`
            <a href="#/result/${a.id}" class="skill-modal-row" onclick="closeModal()">
              <div class="skill-modal-row-icon">${SKILL_ICONS[a.skill]||"\u{1F4DD}"}</div>
              <div class="skill-modal-row-body">
                <div class="skill-modal-row-title">${escapeHtml(a.title)}</div>
                <div class="skill-modal-row-meta">
                  ${skillBadge(a.skill)}
                  <span class="skill-modal-row-date">\u{1F552} ${l}</span>
                </div>
              </div>
              <div class="skill-modal-row-score">
                ${o?`<div class="band-pill">${a.overall_score}</div><div class="band-pill-label">Band</div>`:'<div class="band-pill waiting">\u23F3</div><div class="band-pill-label">Ch\u1EDD ch\u1EA5m</div>'}
              </div>
            </a>`}).join("")}
      </div>`;openModal(i,s)}let _myVocabCache=null;async function loadMyVocab(){if(_myVocabCache!==null)return _myVocabCache;try{_myVocabCache=(await api.get("/student/vocab")).map(e=>({word:e.word,definition:e.definition,example:e.example,source:e.source,savedAt:e.saved_at}))}catch{_myVocabCache=[]}return _myVocabCache}function _invalidateVocabCache(){_myVocabCache=null}function isWordSaved(t){return _myVocabCache?_myVocabCache.some(e=>e.word===t):!1}window.isWordSaved=isWordSaved;async function toggleSaveWordBtn(t){const{word:e,def:n,pron:i,ex:s,src:a}=t.dataset,o=isWordSaved(e);t.disabled=!0;try{o?(await api.delete(`/student/vocab/${encodeURIComponent(e)}`),_invalidateVocabCache(),t.textContent="\u{1F4BE} L\u01B0u",t.classList.remove("saved"),toast(`\u0110\xE3 xo\xE1 "${e}"`,"info")):(await api.post("/student/vocab",{word:e,definition:n,pronunciation:i||"",example:s||"",source:a||""}),_invalidateVocabCache(),t.textContent="\u2713 \u0110\xE3 l\u01B0u",t.classList.add("saved"),toast(`\u2705 \u0110\xE3 l\u01B0u "${e}"`,"success"))}catch(l){toast("L\u1ED7i l\u01B0u t\u1EEB: "+(l.error||l.message),"error")}finally{t.disabled=!1}}window.toggleSaveWordBtn=toggleSaveWordBtn;let _myVocabSearch="",_myVocabSort="",_gradedResultSub=null,_resultNavContext=null,_gradedResultSortCol="",_gradedResultSortDir="asc",_practiceResultData=null,_practiceResultSortCol="",_practiceResultSortDir="asc";function resetResultNavContext(){_resultNavContext=null}function setResultNavContext(t){_resultNavContext=t||null}function getResultBackHref(){return _resultNavContext?.backHref||"/assignments"}function getResultBackLabel(){return _resultNavContext?.backLabel||"\u2190 Danh s\xE1ch b\xE0i t\u1EADp"}function getPracticeBackHref(t){return _resultNavContext?.backHref||(t?.is_composite_section?`/composite-result/${t.composite_assignment_id}/section/${t.id}`:`/result/${t.assignment_id}`)}function getPracticeHref(t,e){return t?.is_composite_section?`/composite-practice/${t.id}?type=${e}`:`/practice/${t.assignment_id}?type=${e}`}async function showMyVocab(){_myVocabSearch="",_myVocabSort="",setLoading("\u0110ang t\u1EA3i t\u1EEB v\u1EF1ng...");const t=routeToken();await loadMyVocab(),!routeChanged(t)&&renderMyVocabList()}function renderMyVocabList(){const t=_myVocabCache||[],e=_myVocabSearch.toLowerCase();let n=e?t.filter(s=>s.word.toLowerCase().includes(e)||s.definition.toLowerCase().includes(e)):t;_myVocabSort==="az"?n=[...n].sort((s,a)=>s.word.toLowerCase().localeCompare(a.word.toLowerCase())):_myVocabSort==="za"?n=[...n].sort((s,a)=>a.word.toLowerCase().localeCompare(s.word.toLowerCase())):_myVocabSort==="newest"&&(n=[...n].sort((s,a)=>(a.savedAt||"")>(s.savedAt||"")?1:-1));const i=n.length===0?`<div class="empty-state-v2">
        <div class="empty-illu">\u{1F4D6}</div>
        <div class="empty-title">${e?"Kh\xF4ng t\xECm th\u1EA5y t\u1EEB n\xE0o":"Ch\u01B0a l\u01B0u t\u1EEB n\xE0o"}</div>
        <div class="empty-desc">${e?"Th\u1EED t\u1EEB kho\xE1 kh\xE1c.":"B\u1EA5m \u{1F4BE} L\u01B0u trong trang k\u1EBFt qu\u1EA3 b\xE0i \u0111\u1EC3 th\xEAm t\u1EEB v\xE0o \u0111\xE2y."}</div>
      </div>`:`<div class="my-vocab-grid">${n.map(s=>`
        <div class="mvc">
          <div class="mvc-word">${escapeHtml(s.word)}</div>
          ${s.pronunciation?`<div class="mvc-pron">${escapeHtml(s.pronunciation)}</div>`:""}
          <div class="mvc-def">${escapeHtml(s.definition)}</div>
          ${s.example?`<div class="mvc-ex">"${escapeHtml(s.example)}"</div>`:""}
          ${s.source?`<div class="mvc-src">\u{1F4CB} ${escapeHtml(s.source)}</div>`:""}
          <button class="mvc-del" data-word="${escapeHtml(s.word)}" onclick="removeMyVocabWord(this)">\u{1F5D1}</button>
        </div>`).join("")}
      </div>`;$("#app").innerHTML=`
    <div class="container my-vocab-page">
      <div class="page-header">
        <button class="btn-back" onclick="navigate('/profile')">\u2190 H\u1ED3 s\u01A1</button>
        <div>
          <div class="page-title">\u{1F4D6} T\u1EEB v\u1EF1ng c\u1EE7a t\xF4i</div>
          <div class="page-subtitle">${t.length} t\u1EEB \u0111\xE3 l\u01B0u</div>
        </div>
        ${t.length>0?'<button class="btn btn-primary" style="flex-shrink:0" onclick="startMyFlashcard()">\u{1F0CF} Luy\u1EC7n flashcard</button>':""}
      </div>

      ${t.length>0?`
        <div class="my-vocab-toolbar">
          <input class="form-input search-input" aria-label="T\xECm t\u1EEB ho\u1EB7c ngh\u0129a" placeholder="\u{1F50D} T\xECm t\u1EEB ho\u1EB7c ngh\u0129a..."
            value="${escapeHtml(_myVocabSearch)}"
            oninput="_myVocabSearch=this.value; renderMyVocabList()" />
          <div class="mvc-sort-pills">
            ${[["","M\u1EB7c \u0111\u1ECBnh"],["az","A\u2192Z"],["za","Z\u2192A"],["newest","M\u1EDBi nh\u1EA5t"]].map(([s,a])=>`<button class="mvc-sort-pill${_myVocabSort===s?" active":""}" onclick="_myVocabSort='${s}';renderMyVocabList()">${a}</button>`).join("")}
          </div>
          <span class="mvc-count">${n.length} / ${t.length}</span>
        </div>`:""}
      ${i}
    </div>`}async function removeMyVocabWord(t){const e=t.dataset.word;t.disabled=!0;try{await api.delete(`/student/vocab/${encodeURIComponent(e)}`),_invalidateVocabCache(),await loadMyVocab(),renderMyVocabList()}catch(n){toast("L\u1ED7i xo\xE1 t\u1EEB: "+(n.error||n.message),"error"),t.disabled=!1}}window.removeMyVocabWord=removeMyVocabWord;let _mfc={deck:[],idx:0,known:0,retry:0,flipped:!1};async function startMyFlashcard(){const t=await loadMyVocab();if(!t.length){toast("Ch\u01B0a c\xF3 t\u1EEB n\xE0o","error");return}_mfc={deck:[...t].sort(()=>Math.random()-.5),idx:0,known:0,retry:0,flipped:!1},renderMyFlashcard()}window.startMyFlashcard=startMyFlashcard;function renderMyFlashcard(){if(_mfc.idx>=_mfc.deck.length){renderMyFlashcardEnd();return}const t=_mfc.deck[_mfc.idx],e=_mfc.deck.length,n=Math.round(_mfc.idx/e*100);$("#app").innerHTML=`
    <div class="container mfc-page">
      <div class="mfc-header">
        <button class="btn-back" onclick="showMyVocab()">\u2190 T\u1EEB v\u1EF1ng</button>
        <div class="mfc-prog-wrap"><div class="mfc-prog-bar" style="width:${n}%"></div></div>
        <span class="mfc-counter">${_mfc.idx+1} / ${e}</span>
      </div>

      <div class="mfc-scene" onclick="flipMyFC()">
        <div class="mfc-inner ${_mfc.flipped?"flipped":""}" id="mfc-inner">
          <div class="mfc-face mfc-front">
            <div class="mfc-hint">nh\u1EA5n \u0111\u1EC3 l\u1EADt \u25BE</div>
            <div class="mfc-word">${escapeHtml(t.word)}</div>
            ${t.source?`<div class="mfc-src">\u{1F4CB} ${escapeHtml(t.source)}</div>`:""}
          </div>
          <div class="mfc-face mfc-back">
            <div class="mfc-hint">ngh\u0129a \u25B4</div>
            <div class="mfc-def">${escapeHtml(t.definition)}</div>
            ${t.example?`<div class="mfc-ex">"${escapeHtml(t.example)}"</div>`:""}
          </div>
        </div>
      </div>

      <div class="mfc-actions ${_mfc.flipped?"":"hidden"}" id="mfc-actions">
        <button class="mfc-btn mfc-retry" onclick="mfcAnswer(false)">\u2717 \xD4n l\u1EA1i</button>
        <button class="mfc-btn mfc-known" onclick="mfcAnswer(true)">\u2713 Bi\u1EBFt r\u1ED3i</button>
      </div>
      <div class="mfc-score-row">
        <span class="mfc-s-known">\u2713 ${_mfc.known}</span>
        <span class="mfc-s-retry">\u2717 ${_mfc.retry}</span>
      </div>
    </div>`}function flipMyFC(){_mfc.flipped=!_mfc.flipped,document.getElementById("mfc-inner")?.classList.toggle("flipped",_mfc.flipped),document.getElementById("mfc-actions")?.classList.toggle("hidden",!_mfc.flipped)}function mfcAnswer(t){t?_mfc.known++:_mfc.retry++,_mfc.idx++,_mfc.flipped=!1,renderMyFlashcard()}function renderMyFlashcardEnd(){const t=Math.round(_mfc.known/_mfc.deck.length*100),e=t>=80?"\u{1F389}":t>=50?"\u{1F44D}":"\u{1F4AA}",n=t>=80?"Xu\u1EA5t s\u1EAFc!":t>=50?"T\u1ED1t l\u1EAFm!":"C\u1EA7n \xF4n th\xEAm!";$("#app").innerHTML=`
    <div class="container mfc-page">
      <div class="mfc-end">
        <div class="mfc-end-emoji">${e}</div>
        <div class="mfc-end-title">${n}</div>
        <div class="mfc-score-row" style="justify-content:center;margin:12px 0">
          <span class="mfc-s-known">\u2713 Bi\u1EBFt: ${_mfc.known}</span>
          <span class="mfc-s-retry" style="margin-left:16px">\u2717 C\u1EA7n \xF4n: ${_mfc.retry}</span>
        </div>
        <div class="mfc-end-pct">${t}% \u0111\xE3 thu\u1ED9c</div>
        <div class="mfc-end-btns">
          <button class="btn btn-primary" onclick="startMyFlashcard()">\u{1F504} Luy\u1EC7n l\u1EA1i</button>
          <button class="btn btn-outline" onclick="showMyVocab()">\u2190 T\u1EEB v\u1EF1ng</button>
        </div>
      </div>
    </div>`}window.flipMyFC=flipMyFC,window.mfcAnswer=mfcAnswer;async function showAssignments(){setLoading("\u0110ang t\u1EA3i danh s\xE1ch b\xE0i t\u1EADp...");const t=routeToken();try{const e=await getAssignments();if(routeChanged(t))return;renderAssignments(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i b\xE0i t\u1EADp: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh s\xE1ch b\xE0i t\u1EADp",e,"/assignments")}}function renderAssignments(t){const e=_assignmentSkillFilter?t.filter(c=>c.skill===_assignmentSkillFilter):t,n=e.filter(c=>c.skill!=="composite"&&c.rewrite_status==="requested"),i=e.filter(c=>c.skill!=="composite"?!c.submission_id&&c.is_active:c.is_active&&!isCompositeAssignmentDone(c)),s=e.filter(c=>c.skill!=="composite"?!c.submission_id&&!c.is_active:!c.is_active&&!isCompositeAssignmentDone(c)),a=e.filter(c=>c.skill!=="composite"?!!c.submission_id&&c.rewrite_status!=="requested":isCompositeAssignmentDone(c));function o(c){const p=c.skill==="composite",r=isOverdue(c.deadline),m=p?isCompositeAssignmentDone(c):!!c.submission_id,u=!c.is_active&&!m,g=SKILL_ICONS[c.skill]||"\u{1F4DD}",h=!m&&!r&&!u?formatCountdown(c.deadline):null;let v,f;if(p){const C=getCompositeSectionsForAssignment(c),L=C.filter(A=>A.submitted).length,M=getCompositeAssignmentAverageScore(c);u?v='<span class="badge badge-closed">\u{1F512} \u0110\xE3 \u0111\xF3ng</span>':m?v=isCompositeAssignmentFullyGraded(c)?'<span class="badge badge-done">\u2705 \u0110\xE3 c\xF3 \u0111i\u1EC3m</span>':'<span class="badge badge-waiting">\u23F3 Ch\u1EDD ch\u1EA5m</span>':L>0?v=`<span class="badge badge-pending">${L}/${C.length} ph\u1EA7n</span>`:v='<span class="badge badge-pending">Ch\u01B0a l\xE0m</span>',f=isCompositeAssignmentFullyGraded(c)&&M!==null?`<div class="score-band">${M.toFixed(1)}</div><div class="score-label">Band</div>`:""}else if(u)v='<span class="badge badge-closed">\u{1F512} \u0110\xE3 \u0111\xF3ng</span>',f="";else if(m){const C=c.overall_score!==null&&c.overall_score!==void 0;c.rewrite_status==="requested"?(v='<span class="badge badge-rewrite">\u270F\uFE0F Y\xCAU C\u1EA6U L\xC0M L\u1EA0I</span>',f=C?`<div class="score-band rewrite-score">${c.overall_score}</div><div class="score-label">Band</div>`:'<div class="score-pending-icon">\u270F\uFE0F</div>'):(v=C?'<span class="badge badge-done">\u2705 \u0110\xE3 c\xF3 \u0111i\u1EC3m</span>':'<span class="badge badge-waiting">\u23F3 Ch\u1EDD ch\u1EA5m</span>',f=C?`<div class="score-band">${c.overall_score}</div><div class="score-label">Band</div>`:'<div class="score-pending-icon">\u23F3</div>')}else r&&c.deadline?(v='<span class="badge badge-overdue">\u26A0\uFE0F Qu\xE1 h\u1EA1n</span>',f=""):(v='<span class="badge badge-pending">Ch\u01B0a l\xE0m</span>',f="");if(u)return`
        <div class="assignment-card assignment-card-closed">
          <div class="assignment-card-icon">${g}</div>
          <div class="assignment-card-body">
            <div class="assignment-card-title">${escapeHtml(c.title)}</div>
            <div class="assignment-card-meta">
              ${skillBadge(c.skill)}
              ${v}
            </div>
            <div class="assignment-card-deadline-row">
              <span class="assignment-card-deadline">\u{1F4C5} ${formatDateTime(c.deadline)}</span>
            </div>
          </div>
          <div class="assignment-card-right"></div>
        </div>`;const _=!p&&c.rewrite_status==="requested",S=p?c.is_active&&!isCompositeAssignmentDone(c):!c.submission_id&&c.is_active,y=p?`#/composite/${c.id}`:m?`#/result/${c.id}`:`#/assignment/${c.id}`;return`
      <a class="assignment-card ${_?"rewrite":S?"pending-card":m?"done":""}" href="${y}">
        <div class="assignment-card-icon">${g}</div>
        <div class="assignment-card-body">
          <div class="assignment-card-title">${escapeHtml(c.title)}</div>
          <div class="assignment-card-meta">
            ${skillBadge(c.skill)}
            ${v}
          </div>
          <div class="assignment-card-deadline-row">
            ${h?`<span class="countdown-chip">${h}</span>`:""}
            <span class="assignment-card-deadline ${r&&!m?"overdue":""}">
              \u{1F4C5} ${formatDateTime(c.deadline)}
            </span>
          </div>
        </div>
        <div class="assignment-card-right">
          ${f}
          <span class="card-chevron">\u203A</span>
        </div>
      </a>`}const l=[["","T\u1EA5t c\u1EA3"],["reading","\u{1F4D6} Reading"],["listening","\u{1F3A7} Listening"],["writing","\u270D\uFE0F Writing"],["speaking","\u{1F3A4} Speaking"],["composite","\u{1F4CB} T\u1ED5ng h\u1EE3p"]],d=`
    <div class="empty-state">
      <div class="empty-icon">\u{1F4CB}</div>
      <div class="empty-title">${_assignmentSkillFilter?"Kh\xF4ng c\xF3 b\xE0i t\u1EADp n\xE0o cho k\u1EF9 n\u0103ng n\xE0y":"Ch\u01B0a c\xF3 b\xE0i t\u1EADp n\xE0o"}</div>
      <div class="empty-desc">${_assignmentSkillFilter?"":"Gi\xE1o vi\xEAn ch\u01B0a giao b\xE0i cho l\u1EDBp n\xE0y."}</div>
    </div>`;$("#app").innerHTML=`
    <div class="container">
      <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div class="page-title">B\xE0i t\u1EADp c\u1EE7a t\xF4i</div>
          <div class="page-subtitle">L\u1EDBp ${escapeHtml(_selectedClass.class_name)}</div>
        </div>
        <a href="#/vocab-games" class="btn-vocab-games-link">\u{1F0CF} \xD4n t\u1EEB v\u1EF1ng</a>
      </div>

      <div class="skill-filter-tabs">
        ${l.map(([c,p])=>`
          <button class="skill-filter-tab ${_assignmentSkillFilter===c?"active":""}"
            onclick="_assignmentSkillFilter='${c}';renderAssignments(window._cachedAssignments||[])">
            ${p}
          </button>`).join("")}
      </div>

      ${e.length===0?d:""}

      ${n.length>0?`
        <div class="section-label section-label-rewrite">\u270F\uFE0F Y\xEAu c\u1EA7u l\xE0m l\u1EA1i (${n.length})</div>
        <div class="assignment-list" style="margin-bottom:28px">
          ${n.map(o).join("")}
        </div>`:""}

      ${i.length>0?`
        <div class="section-label section-label-pending">\u{1F4CC} C\u1EA7n l\xE0m (${i.length})</div>
        <div class="assignment-list" style="margin-bottom:28px">
          ${i.map(o).join("")}
        </div>`:""}

      ${a.length>0?`
        <div class="section-label">\u0110\xE3 n\u1ED9p (${a.length})</div>
        <div class="assignment-list" style="margin-bottom:28px">
          ${a.map(o).join("")}
        </div>`:""}

      ${s.length>0?`
        <div class="section-label section-label-closed">\u0110\xE3 \u0111\xF3ng (${s.length})</div>
        <div class="assignment-list">
          ${s.map(o).join("")}
        </div>`:""}

    </div>`}async function showAssignment({id:t}){setLoading("\u0110ang t\u1EA3i b\xE0i t\u1EADp...");const e=routeToken();try{const n=await api.get(`/assignments/${t}/question`);if(routeChanged(e))return;try{const s=await api.get(`/submissions?assignment_id=${t}&student_id=${_student.id}`);if(routeChanged(e))return;if(s.rewrite_status!=="requested"){clearAllDrafts(t),navigate(`/result/${t}`);return}}catch{}let i=null;if(n.mode==="exam"&&n.time_limit_minutes)try{const s=await api.post("/exam-sessions",{ref_type:"assignment",ref_id:t}),a=(Date.now()-new Date(s.started_at).getTime())/1e3;i=Math.max(0,n.time_limit_minutes*60-a)}catch{i=n.time_limit_minutes*60}if(routeChanged(e))return;renderAssignment(n,i)}catch(n){if(routeChanged(e))return;const i=String(n?.error||n?.message||"").toLowerCase();(i.includes("\u0111\xF3ng")||i.includes("kh\xF4ng t\xECm th\u1EA5y"))&&clearAllDrafts(t),toast("L\u1ED7i t\u1EA3i b\xE0i t\u1EADp: "+(n.error||n.message),"error"),navigate("/assignments")}}function renderAssignment(t,e=null){_activeAssignmentId=t.id,stopAssignmentCountdown(),_removeExamBeforeUnload();const n=loadDraft(t.id,"flags");_flaggedSet=new Set(Array.isArray(n?.data)?n.data:[]);const i=t.skill,s=t.question_count||0;i==="reading"?renderReading(t):i==="listening"?renderListening(t):i==="writing"?renderWriting(t):i==="speaking"&&renderSpeaking(t);const a=document.querySelector(".assignment-toolbar");if(a){const o=a.querySelector("#submit-btn"),l=document.createElement("div");l.id="task-timer",l.className="task-timer",l.title="Th\u1EDDi gian b\u1EA1n \u0111\xE3 l\xE0m b\xE0i",o?a.insertBefore(l,o):a.appendChild(l);const d=document.createElement("div");if(d.id="save-indicator",d.className="save-indicator",o?a.insertBefore(d,o):a.appendChild(d),startTaskTimer(t.id),t.mode==="exam"&&t.time_limit_minutes){const c=document.createElement("div");c.className="assign-countdown-wrap",c.innerHTML='<span class="assign-countdown-label">\u23F1 C\xF2n l\u1EA1i</span><span class="assign-countdown" id="assign-countdown">--:--</span>',o?a.insertBefore(c,o):a.appendChild(c);const p=e!==null?e:t.time_limit_minutes*60;_installExamBeforeUnload(),p<=0?autoSubmitAssignment({assignmentId:t.id,skill:i,qCount:s}):startAssignmentCountdown(p,{assignmentId:t.id,skill:i,qCount:s})}}}let _examBeforeUnloadHandler=null;function _installExamBeforeUnload(){_removeExamBeforeUnload(),_examBeforeUnloadHandler=t=>{t.preventDefault(),t.returnValue="B\u1EA1n \u0111ang trong b\xE0i ki\u1EC3m tra \u2014 th\u1EDDi gian v\u1EABn ti\u1EBFp t\u1EE5c ch\u1EA1y n\u1EBFu r\u1EDDi trang!"},window.addEventListener("beforeunload",_examBeforeUnloadHandler)}function _removeExamBeforeUnload(){_examBeforeUnloadHandler&&(window.removeEventListener("beforeunload",_examBeforeUnloadHandler),_examBeforeUnloadHandler=null)}function renderReading(t){const e=t.question_count||0;let n="";for(let i=1;i<=e;i++){const s=_flaggedSet.has(i)?" flagged":"";n+=`
      <div class="answer-row">
        <span class="q-label">Q${i}</span>
        <input class="answer-input" id="ans-${i}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${i}"
          oninput="updateNavigatorState();scheduleAnswerDraftSave('${t.id}', ${e})" />
        <button class="q-flag-btn${s}" data-flag-q="${i}" onclick="toggleFlag(${i})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`}$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${modeBadgeHtml(t.mode)}
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitAnswers('${t.id}', ${e}, 'reading', this)">N\u1ED9p b\xE0i</button>
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="reading-content-pane">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">B\xE0i \u0111\u1ECDc &amp; C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(e,t.id)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${e===0?'<div style="color:var(--gray-400);font-size:13px">B\xE0i t\u1EADp kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${n}</div>`}
        </div>
      </div>
    </div>`,restoreAnswerDraft(t.id,e),bindReadingTextInteractions(),updateNavigatorState(),startAutoSave(()=>persistAnswerDraft(t.id,e))}function renderListening(t){const e=t.question_count||0;let n="";for(let i=1;i<=e;i++){const s=_flaggedSet.has(i)?" flagged":"";n+=`
      <div class="answer-row">
        <span class="q-label">Q${i}</span>
        <input class="answer-input" id="ans-${i}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${i}"
          oninput="updateNavigatorState();scheduleAnswerDraftSave('${t.id}', ${e})" />
        <button class="q-flag-btn${s}" data-flag-q="${i}" onclick="toggleFlag(${i})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`}$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${modeBadgeHtml(t.mode)}
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitAnswers('${t.id}', ${e}, 'listening', this)">N\u1ED9p b\xE0i</button>
      </div>
      <div class="assignment-content">
        <div class="content-pane">
          ${t.mode==="practice"?renderListeningAudioHtml(t):renderLockedListeningAudioHtml(t)}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(e,t.id)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${e===0?'<div style="color:var(--gray-400);font-size:13px">B\xE0i t\u1EADp kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${n}</div>`}
        </div>
      </div>
    </div>`,restoreAnswerDraft(t.id,e),t.mode!=="practice"&&setupLockedListeningAudio(),bindReadingTextInteractions(),updateNavigatorState(),startAutoSave(()=>persistAnswerDraft(t.id,e))}function persistAnswerDraft(t,e){const n=[];for(let i=1;i<=e;i++)n.push({q_no:i,answer:$(`#ans-${i}`)?.value||""});saveDraft(t,"answers",n),showSavedIndicator()}function scheduleAnswerDraftSave(t,e){scheduleAutoSave(()=>persistAnswerDraft(t,e))}function restoreAnswerDraft(t,e){const n=loadDraft(t,"answers");if(n?.data)for(const{q_no:i,answer:s}of n.data){const a=document.getElementById(`ans-${i}`);a&&s&&(a.value=s)}}async function addStudentNote(){const t=window.getSelection();if(!t||t.isCollapsed||!t.rangeCount){toast("H\xE3y b\xF4i \u0111en 1 \u0111o\u1EA1n trong b\xE0i \u0111\u1ECDc tr\u01B0\u1EDBc","error");return}const e=t.getRangeAt(0),n=document.getElementById("reading-text");if(!n||!n.contains(e.commonAncestorContainer)){toast("Ch\u1EC9 c\xF3 th\u1EC3 ghi ch\xFA trong b\xE0i \u0111\u1ECDc","error");return}const i=t.toString(),s=await promptAction({title:"Ghi ch\xFA cho \u0111o\u1EA1n n\xE0y",placeholder:"Nh\u1EADp ghi ch\xFA..."});if(!s)return;const a=document.createElement("mark");a.className="student-note",a.dataset.note=s,a.title=s;try{e.surroundContents(a)}catch{toast("Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c ghi ch\xFA","error");return}a.onclick=async()=>{const o=await promptAction({title:"S\u1EEDa ghi ch\xFA",message:"\u0110\u1EC3 tr\u1ED1ng \u0111\u1EC3 xo\xE1 ghi ch\xFA",initialValue:a.dataset.note,placeholder:"Nh\u1EADp ghi ch\xFA..."});if(o!==null){if(o.trim())a.dataset.note=o,a.title=o;else{const l=a.parentNode;for(;a.firstChild;)l.insertBefore(a.firstChild,a);l.removeChild(a),l.normalize()}persistNotes(_activeAssignmentId)}},t.removeAllRanges(),persistNotes(_activeAssignmentId)}function persistNotes(t){if(!t)return;const e=document.getElementById("reading-text");if(!e)return;const n=[];e.querySelectorAll("mark.student-note").forEach(i=>{n.push({text:i.textContent,note:i.dataset.note})}),saveDraft(t,"notes",n)}function restoreNotes(t){const e=loadDraft(t,"notes");if(!e?.data?.length)return;const n=document.getElementById("reading-text");if(n)for(const{text:i,note:s}of e.data){if(!i||n.textContent.indexOf(i)<0)continue;const o=document.createTreeWalker(n,NodeFilter.SHOW_TEXT,null);let l;for(;l=o.nextNode();){const d=l.textContent.indexOf(i);if(d<0)continue;const c=document.createRange();c.setStart(l,d),c.setEnd(l,d+i.length);const p=document.createElement("mark");p.className="student-note",p.dataset.note=s,p.title=s;try{c.surroundContents(p)}catch{}p.onclick=async()=>{const r=await promptAction({title:"S\u1EEDa ghi ch\xFA",message:"\u0110\u1EC3 tr\u1ED1ng \u0111\u1EC3 xo\xE1 ghi ch\xFA",initialValue:p.dataset.note,placeholder:"Nh\u1EADp ghi ch\xFA..."});if(r!==null){if(r.trim())p.dataset.note=r,p.title=r;else{const m=p.parentNode;for(;p.firstChild;)m.insertBefore(p.firstChild,p);m.removeChild(p),m.normalize()}persistNotes(t)}};break}}}async function submitAnswers(t,e,n,i,s=!1){const a=[];for(let c=1;c<=e;c++)a.push({q_no:c,answer:($(`#ans-${c}`)?.value||"").trim()});const o=a.filter(c=>c.answer).length,l=e-o,d=_flaggedSet.size;if(!(!s&&!await confirmSubmit({title:"X\xE1c nh\u1EADn n\u1ED9p b\xE0i",message:`
        <ul class="submit-confirm-stats">
          <li>\u2705 \u0110\xE3 tr\u1EA3 l\u1EDDi: <b>${o} / ${e}</b></li>
          ${l>0?`<li>\u274C C\xF2n <b>${l}</b> c\xE2u ch\u01B0a l\xE0m</li>`:""}
          ${d>0?`<li>\u{1F6A9} \u0110ang \u0111\xE1nh d\u1EA5u xem l\u1EA1i <b>${d}</b> c\xE2u</li>`:""}
        </ul>
        <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi n\u1ED9p b\xE0i b\u1EA1n kh\xF4ng th\u1EC3 ch\u1EC9nh s\u1EEDa.</div>`}))){btnLoading(i);try{await api.post(`/assignments/${t}/submit`,{student_id:_student.id,student_answers:a}),invalidateAssignmentsCache(!0),await syncNotifUIAfterSubmit(),clearAllDrafts(t),stopAutoSave(),stopTaskTimer(),stopAssignmentCountdown(),_removeExamBeforeUnload(),toast("N\u1ED9p b\xE0i th\xE0nh c\xF4ng! \u{1F389}"),navigate(`/result/${t}`)}catch(c){if(c.error?.includes("\u0111\xE3 n\u1ED9p")){navigate(`/result/${t}`);return}s?toast("\u23F0 H\u1EBFt gi\u1EDD \u2014 n\u1ED9p t\u1EF1 \u0111\u1ED9ng th\u1EA5t b\u1EA1i. Vui l\xF2ng li\xEAn h\u1EC7 gi\xE1o vi\xEAn.","error"):(btnReset(i),toast("L\u1ED7i n\u1ED9p b\xE0i: "+(c.error||c.message),"error"))}}}function renderWriting(t){$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${modeBadgeHtml(t.mode)}
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitWriting('${t.id}', this)">N\u1ED9p b\xE0i</button>
      </div>
      <div class="assignment-content">
        <div class="content-pane">
          <div class="section-title">\u0110\u1EC1 b\xE0i</div>
          <div class="writing-prompt-body">${renderQuestionContentHTML(t.content_blocks,t.content_text||"Kh\xF4ng c\xF3 \u0111\u1EC1 b\xE0i.")}</div>
        </div>
        <div class="answer-pane writing-answer-pane">
          <div class="section-title">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
          <textarea id="writing-answer" class="writing-textarea"
            placeholder="Vi\u1EBFt b\xE0i c\u1EE7a b\u1EA1n v\xE0o \u0111\xE2y..."
            oninput="updateWordCount(this);scheduleWritingDraftSave('${t.id}')"></textarea>
          <div id="word-count" class="word-count word-count-extended">
            <span data-stat="words">0 t\u1EEB</span>
            <span data-stat="chars">0 k\xFD t\u1EF1</span>
            <span data-stat="sentences">0 c\xE2u</span>
            <span data-stat="paragraphs">0 \u0111o\u1EA1n</span>
          </div>
          <div class="form-hint">Task 1: ~150 t\u1EEB \u2014 Task 2: ~250 t\u1EEB</div>
        </div>
      </div>
    </div>`;const e=loadDraft(t.id,"writing");if(e?.data){const n=$("#writing-answer");n&&(n.value=e.data,updateWordCount(n))}startAutoSave(()=>persistWritingDraft(t.id))}function updateWordCount(t){const e=t.value||"",n=countWords(e),i=e.length,s=(e.match(/[^.!?…]+[.!?…]+/g)||(e.trim()?[e]:[])).length,a=e.split(/\n\s*\n/).filter(d=>d.trim()).length,o=$("#word-count");if(!o)return;const l=(d,c)=>{const p=o.querySelector(`[data-stat="${d}"]`);p&&(p.textContent=c)};l("words",`${n} t\u1EEB`),l("chars",`${i} k\xFD t\u1EF1`),l("sentences",`${s} c\xE2u`),l("paragraphs",`${a} \u0111o\u1EA1n`)}function persistWritingDraft(t){const e=$("#writing-answer")?.value||"";saveDraft(t,"writing",e),showSavedIndicator()}function scheduleWritingDraftSave(t){scheduleAutoSave(()=>persistWritingDraft(t))}async function submitWriting(t,e,n=!1){const i=($("#writing-answer")?.value||"").trim();if(!i&&!n){toast("Vui l\xF2ng vi\u1EBFt b\xE0i tr\u01B0\u1EDBc khi n\u1ED9p","error");return}const s=countWords(i);if(!(!n&&!await confirmSubmit({title:"X\xE1c nh\u1EADn n\u1ED9p b\xE0i Writing",message:`
        <ul class="submit-confirm-stats">
          <li>\u{1F4DD} S\u1ED1 t\u1EEB: <b>${s}</b>${s<150?' <span style="color:var(--danger)">\u26A0 D\u01B0\u1EDBi m\u1EE9c t\u1ED1i thi\u1EC3u</span>':""}</li>
        </ul>
        ${s<50?'<div style="color:var(--danger);margin-top:4px">B\xE0i qu\xE1 ng\u1EAFn \u2014 t\u1ED1i thi\u1EC3u 150 t\u1EEB (Task 1) ho\u1EB7c 250 t\u1EEB (Task 2).</div>':""}
        <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi n\u1ED9p b\u1EA1n kh\xF4ng th\u1EC3 ch\u1EC9nh s\u1EEDa.</div>`}))){btnLoading(e);try{await api.post(`/assignments/${t}/submit`,{student_id:_student.id,writing_content:i,word_count:s}),invalidateAssignmentsCache(!0),await syncNotifUIAfterSubmit(),clearAllDrafts(t),stopAutoSave(),stopTaskTimer(),stopAssignmentCountdown(),_removeExamBeforeUnload(),toast("N\u1ED9p b\xE0i th\xE0nh c\xF4ng! \u{1F389}"),navigate(`/result/${t}`)}catch(a){if(a.error?.includes("\u0111\xE3 n\u1ED9p")){navigate(`/result/${t}`);return}n?toast("\u23F0 H\u1EBFt gi\u1EDD \u2014 n\u1ED9p t\u1EF1 \u0111\u1ED9ng th\u1EA5t b\u1EA1i. Vui l\xF2ng li\xEAn h\u1EC7 gi\xE1o vi\xEAn.","error"):(btnReset(e),toast("L\u1ED7i n\u1ED9p b\xE0i: "+(a.error||a.message),"error"))}}}let _mediaRecorder=null,_audioChunks=[],_recordedBlob=null,_uploadedFile=null,_recordTimer=null,_recordSeconds=0;function _newSpeakingSlot(){return{displayName:"",status:"idle",localUrl:null,url:null,key:null,name:"",size:0,pct:0,eta:null}}let _speakingSlots=[_newSpeakingSlot()],_speakingRecordIdx=-1,_speakingAssignId=null;function renderSpeaking(t){_speakingSlots=[_newSpeakingSlot()],_speakingRecordIdx=-1,_speakingAssignId=t.id,_mediaRecorder=null,_audioChunks=[],_recordedBlob=null,_uploadedFile=null,$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${modeBadgeHtml(t.mode)}
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitSpeaking('${t.id}', this)" disabled>N\u1ED9p b\xE0i</button>
      </div>
      <div class="assignment-content single-col">
        <div class="content-pane">
          <div class="section-title">C\xE2u h\u1ECFi / Cue Card</div>
          <div class="cue-card">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="section-title">B\xE0i n\xF3i c\u1EE7a b\u1EA1n</div>
          <div id="recording-indicator" style="display:none;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:10px">
            <canvas id="waveform-canvas" class="waveform-canvas" width="600" height="60"></canvas>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
              <div id="record-timer" class="record-timer" style="font-size:18px">0:00</div>
              <button class="record-btn recording-active" style="padding:6px 18px;font-size:13px" onclick="stopSlotRecording()">\u23F9 D\u1EEBng thu \xE2m</button>
            </div>
          </div>
          <div id="speaking-slot-list"></div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addSpeakingSlot()">+ Th\xEAm ph\u1EA7n</button>
          <div id="audio-submit-status" class="audio-submit-status hidden" style="margin-top:12px"></div>
        </div>
      </div>
    </div>`,_renderSpeakingSlots()}function _renderSpeakingSlots(){const t=$("#speaking-slot-list");if(!t)return;const e=_speakingSlots.length>1;t.innerHTML=_speakingSlots.map((n,i)=>{const s=e&&n.status!=="recording"?`<button class="remove-audio-slot" onclick="removeSpeakingSlot(${i})" title="Xo\xE1" aria-label="Xo\xE1 audio slot">\xD7</button>`:e?'<div style="width:28px"></div>':"";let a="";if(n.status==="idle"||n.status==="error")a=`${n.status==="error"?'<span style="color:var(--danger);font-size:12px">\u2717 L\u1ED7i upload \u2014 th\u1EED l\u1EA1i:</span>':""}
        <input id="sp-slot-input-${i}" type="file" accept="audio/*" style="display:none" onchange="onSpeakingSlotFileSelected(this,${i})" />
        <button class="audio-pick-btn" onclick="startSlotRecording(${i})">\u{1F399}\uFE0F Thu \xE2m</button>
        <button class="audio-pick-btn" onclick="document.getElementById('sp-slot-input-${i}').click()">\u{1F3B5} Ch\u1ECDn file</button>`;else if(n.status==="recording")a='<span style="font-size:13px;color:#dc2626;font-weight:600">\u25CF \u0110ang ghi \xE2m...</span>';else if(n.status==="checking")a='<span style="font-size:13px;color:var(--gray-500)">\u23F3 \u0110ang ki\u1EC3m tra \xE2m thanh...</span>';else if(n.status==="silent_warning")a=`
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;width:100%">
          <div style="font-size:13px;font-weight:600;color:#dc2626;margin-bottom:6px">\u26A0\uFE0F Kh\xF4ng ph\xE1t hi\u1EC7n \xE2m thanh</div>
          <div style="font-size:12px;color:#7f1d1d;margin-bottom:10px">H\u1EC7 th\u1ED1ng kh\xF4ng nghe th\u1EA5y gi\u1ECDng n\xF3i trong b\u1EA3n ghi n\xE0y. Vui l\xF2ng ki\u1EC3m tra microphone v\xE0 thu \xE2m l\u1EA1i.</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-primary" onclick="clearSpeakingSlot(${i})">\u{1F399}\uFE0F Thu \xE2m l\u1EA1i</button>
            <button class="btn btn-sm btn-outline" style="font-size:12px" onclick="_forceSpeakingSlotUpload(${i})">N\u1ED9p d\xF9 v\u1EADy</button>
          </div>
        </div>`;else if(n.status==="uploading"){const o=n.pct<100&&n.eta!=null?` \xB7 ETA ${_fmtUploadEta(n.eta)}`:"";a=`
        <div class="audio-slot-filename">${escapeHtml(n.name)} <span style="color:var(--gray-400)">(${(n.size/1024/1024).toFixed(1)} MB)</span></div>
        <div class="upload-progress-row" style="width:100%">
          <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" style="width:${n.pct}%"></div></div>
          <span class="upload-progress-label">${n.pct}%${o}</span>
        </div>`}else n.status==="done"&&(a=`
        <div class="audio-slot-done" style="width:100%">
          <span class="audio-upload-done">\u2713</span>
          <audio controls src="${escapeHtml(n.localUrl||n.url||"")}" style="height:32px;flex:1;min-width:0;border-radius:6px"></audio>
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:12px;flex-shrink:0" onclick="clearSpeakingSlot(${i})">Xo\xE1</button>
        </div>`);return`<div class="audio-slot" id="sp-slot-${i}">
      <div class="audio-slot-num">${i+1}</div>
      <div class="audio-slot-content">
        <input type="text" class="form-input audio-slot-name" placeholder="T\xEAn ph\u1EA7n (VD: Part ${i+1})"
               value="${escapeHtml(n.displayName)}" onchange="_speakingSlots[${i}].displayName=this.value" />
        <div class="audio-slot-file">${a}</div>
      </div>
      ${s}
    </div>`}).join("")}async function startSlotRecording(t){if(_speakingRecordIdx>=0){toast("\u0110ang ghi \xE2m ph\u1EA7n kh\xE1c, h\xE3y d\u1EEBng tr\u01B0\u1EDBc","warning");return}_speakingRecordIdx=t,_speakingSlots[t].status="recording",_renderSpeakingSlots();try{const e=await navigator.mediaDevices.getUserMedia({audio:!0});_audioChunks=[];const n=MediaRecorder.isTypeSupported("audio/webm")?"audio/webm":"audio/ogg";_mediaRecorder=new MediaRecorder(e,{mimeType:n}),_mediaRecorder.ondataavailable=s=>{s.data.size>0&&_audioChunks.push(s.data)},_mediaRecorder.onstop=()=>{e.getTracks().forEach(o=>o.stop()),stopWaveform();const s=_mediaRecorder.mimeType||"audio/webm",a=new Blob(_audioChunks,{type:s});_onSlotRecordingDone(_speakingRecordIdx,a,s)},_mediaRecorder.start(250);const i=$("#recording-indicator");i&&(i.style.display=""),startWaveform(e),_recordSeconds=0,clearInterval(_recordTimer),_recordTimer=setInterval(()=>{_recordSeconds++;const s=Math.floor(_recordSeconds/60),a=_recordSeconds%60,o=$("#record-timer");o&&(o.textContent=`${s}:${a.toString().padStart(2,"0")}`)},1e3)}catch(e){_speakingSlots[t].status="idle",_speakingRecordIdx=-1,_renderSpeakingSlots(),toast("Kh\xF4ng th\u1EC3 truy c\u1EADp microphone: "+e.message,"error")}}function stopSlotRecording(){clearInterval(_recordTimer),_mediaRecorder?.stop();const t=$("#recording-indicator");t&&(t.style.display="none");const e=$("#record-timer");e&&(e.textContent="0:00")}async function _audioRms(t){try{const e=new(window.AudioContext||window.webkitAudioContext),n=await e.decodeAudioData(await t.arrayBuffer());e.close();let i=0,s=0;for(let a=0;a<n.numberOfChannels;a++){const o=n.getChannelData(a);for(let l=0;l<o.length;l++)i+=o[l]*o[l],s++}return Math.sqrt(i/Math.max(s,1))}catch{return 1}}async function _silenceCheckThenUpload(t,e){const n=_speakingSlots[t];if(!n)return;n.status="checking",_renderSpeakingSlots();const i=await _audioRms(e);if(_speakingSlots[t]){if(i<.002){n.status="silent_warning",n._pendingFile=e,_renderSpeakingSlots();return}n.status="uploading",n._pendingFile=null,_renderSpeakingSlots(),_uploadSpeakingSlot(t,e)}}async function _onSlotRecordingDone(t,e,n){const i=_speakingSlots[t];if(!i){_speakingRecordIdx=-1;return}const s=String(n||"audio/webm").split(";")[0].trim(),a=s.includes("webm")?"webm":s.includes("ogg")?"ogg":"webm",o=new File([e],`speaking-part${t+1}.${a}`,{type:s});i.name=o.name,i.size=e.size,i.localUrl=URL.createObjectURL(e),i.pct=0,_speakingRecordIdx=-1,_silenceCheckThenUpload(t,o)}const SUPPORTED_AUDIO_EXTS=new Set(["mp3","mp4","mpeg","mpga","m4a","ogg","oga","wav","wave","webm","flac","aac","aif","aiff"]);async function isRawAacFile(t){const e=await t.slice(0,2).arrayBuffer(),n=new Uint8Array(e);return n[0]===255&&(n[1]===241||n[1]===249)}function showUnsupportedAudioWarning(t,e){openModal("\u26A0\uFE0F \u0110\u1ECBnh d\u1EA1ng audio kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3",`
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
      <p>File <strong>${escapeHtml(t)}</strong> l\xE0 <strong>raw AAC ADTS stream</strong> \u2014 \u0111\u1ECBnh d\u1EA1ng n\xE0y kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 v\xE0 s\u1EBD b\u1ECB l\u1ED7i khi x\u1EED l\xFD.</p>
      <p style="margin-top:12px">Vui l\xF2ng <strong>convert sang MP3</strong> tr\u01B0\u1EDBc khi upload. M\u1ED9t s\u1ED1 c\xE1ch nhanh:</p>
      <ul style="margin:8px 0 0 18px;font-size:14px">
        <li>macOS: m\u1EDF b\u1EB1ng <em>QuickTime Player</em> \u2192 File \u2192 Export As \u2192 Audio Only, r\u1ED3i d\xF9ng <a href="https://cloudconvert.com/m4a-to-mp3" target="_blank">CloudConvert</a> \u0111\u1EC3 chuy\u1EC3n sang .mp3</li>
        <li>Windows: d\xF9ng <a href="https://www.ffmpeg.org/" target="_blank">FFmpeg</a>: <code>ffmpeg -i input.aac output.mp3</code></li>
        <li>Online: <a href="https://cloudconvert.com/aac-to-mp3" target="_blank">cloudconvert.com/aac-to-mp3</a></li>
      </ul>
    </div>
    <div style="margin-top:20px;text-align:right">
      <button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">\u0110\xE3 hi\u1EC3u</button>
    </div>`)}async function onSpeakingSlotFileSelected(t,e){const n=t.files?.[0];if(!n||!_speakingSlots[e])return;t.value="";const i=n.name.split(".").pop().toLowerCase();if(!SUPPORTED_AUDIO_EXTS.has(i)){showUnsupportedAudioWarning(n.name,i);return}if(await isRawAacFile(n)){showRawAacWarning(n.name);return}_speakingSlots[e].name=n.name,_speakingSlots[e].size=n.size,_speakingSlots[e].localUrl=URL.createObjectURL(n),_speakingSlots[e].pct=0,_silenceCheckThenUpload(e,n)}async function _uploadSpeakingSlot(t,e){if(_speakingSlots[t])try{const i=await requestSpeakingUploadTarget(_speakingAssignId,e);await putSpeakingAudioDirect(i.upload_url,e,i.headers?.["Content-Type"]||e.type,(s,a)=>{_speakingSlots[t]&&(_speakingSlots[t].pct=s,_speakingSlots[t].eta=a),_renderSpeakingSlots()}),_speakingSlots[t].status="done",_speakingSlots[t].url=i.public_url,_speakingSlots[t].key=i.key,_renderSpeakingSlots(),_checkSpeakingReady()}catch(i){_speakingSlots[t].status="error",_renderSpeakingSlots(),toast(`L\u1ED7i upload ph\u1EA7n ${t+1}: `+(i.message||"Unknown error"),"error")}}function addSpeakingSlot(){_speakingSlots.push(_newSpeakingSlot()),_renderSpeakingSlots()}function removeSpeakingSlot(t){if(_speakingSlots.length<=1){clearSpeakingSlot(0);return}_speakingSlots[t]?.status!=="recording"&&(_speakingSlots.splice(t,1),_renderSpeakingSlots(),_checkSpeakingReady())}function clearSpeakingSlot(t){_speakingSlots[t]&&(_speakingSlots[t]={..._newSpeakingSlot(),displayName:_speakingSlots[t].displayName},_renderSpeakingSlots(),_checkSpeakingReady())}function _forceSpeakingSlotUpload(t){const e=_speakingSlots[t];if(!e||!e._pendingFile)return;const n=e._pendingFile;e._pendingFile=null,e.status="uploading",e.pct=0,_renderSpeakingSlots(),_uploadSpeakingSlot(t,n)}function _checkSpeakingReady(){const t=$("#submit-btn");if(!t)return;const e=_speakingSlots.some(i=>i.status==="done"),n=_speakingSlots.some(i=>["uploading","recording","checking","silent_warning"].includes(i.status));t.disabled=!e||n}function enableSubmit(){_checkSpeakingReady()}function resetRecording(){}function toggleRecording(){}function onFileUploaded(){}function showAudioPreview(){}function _fmtUploadEta(t){return t==null||t<0?"":t<60?`~${t}s`:`~${Math.ceil(t/60)}m`}function setSpeakingSubmitStatus(t,e=0,n=null){const i=$("#audio-submit-status");if(i){if(!t){i.className="audio-submit-status hidden",i.innerHTML="";return}if(i.className=`audio-submit-status audio-submit-status-${t}`,t==="uploading"){const s=Math.max(0,Math.min(100,Math.round(e))),a=s<100&&n!==null?` \xB7 ETA ${_fmtUploadEta(n)}`:"";i.innerHTML=`
      <div class="audio-submit-status-label">
        <span>\u0110ang upload file audio...</span>
        <strong>${s}%${a}</strong>
      </div>
      <div class="audio-submit-progress">
        <div class="audio-submit-progress-bar" style="width:${s}%"></div>
      </div>`;return}i.innerHTML=`
    <div class="audio-submit-processing">
      <span class="btn-spinner btn-spinner--dark"></span>
      <span>Upload xong. \u0110ang tr\xEDch xu\u1EA5t transcript...</span>
    </div>`}}async function requestSpeakingUploadTarget(t,e){return _speakingIsShared?api.post("/uploads/audio/presign",{scope:"student-shared-speaking",pool_id:t,file_name:e.name,content_type:e.type||"application/octet-stream",size:e.size}):api.post("/uploads/audio/presign",{scope:"student-speaking",assignment_id:t,file_name:e.name,content_type:e.type||"application/octet-stream",size:e.size})}function putSpeakingAudioDirect(t,e,n,i){return new Promise((s,a)=>{const o=new XMLHttpRequest,l=Date.now();o.upload.addEventListener("progress",d=>{if(!d.lengthComputable)return;const c=Math.max(0,Math.min(100,Math.round(d.loaded/d.total*100))),p=Math.max((Date.now()-l)/1e3,.001),r=d.loaded/p,m=d.total-d.loaded,u=r>0?Math.ceil(m/r):null;i?.(c,u)}),o.addEventListener("load",()=>{o.status>=200&&o.status<300?s():a(new Error(`HTTP ${o.status}`))}),o.addEventListener("error",()=>a(new Error("Network error"))),o.addEventListener("abort",()=>a(new Error("Upload cancelled"))),o.open("PUT",t),o.setRequestHeader("Content-Type",n||"application/octet-stream"),o.send(e)})}async function submitSpeaking(t,e,n=!1){const i=_speakingSlots.filter(s=>s.status==="done");if(i.length===0&&!n){toast("Vui l\xF2ng thu \xE2m ho\u1EB7c upload \xEDt nh\u1EA5t 1 file audio","error");return}if(!(!n&&!await confirmSubmit({title:"X\xE1c nh\u1EADn n\u1ED9p b\xE0i Speaking",message:`<div>B\u1EA1n \u0111\xE3 s\u1EB5n s\xE0ng n\u1ED9p b\xE0i thu \xE2m?</div>
                <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi n\u1ED9p b\u1EA1n kh\xF4ng th\u1EC3 thu \xE2m l\u1EA1i.</div>`}))){btnLoading(e);try{const s=i.map(a=>({key:a.key,name:a.displayName||a.name}));setSpeakingSubmitStatus("processing"),await api.post(`/assignments/${t}/submit`,{student_id:_student.id,audio_upload_keys:s}),invalidateAssignmentsCache(!0),await syncNotifUIAfterSubmit(),clearAllDrafts(t),stopAutoSave(),stopTaskTimer(),stopAssignmentCountdown(),_removeExamBeforeUnload(),toast("N\u1ED9p b\xE0i th\xE0nh c\xF4ng! \u{1F389}"),navigate(`/result/${t}`)}catch(s){if(setSpeakingSubmitStatus(null),btnReset(e),s.error?.includes("\u0111\xE3 n\u1ED9p")){navigate(`/result/${t}`);return}toast("L\u1ED7i n\u1ED9p b\xE0i: "+(s.error||s.message),"error")}}}async function showResult({id:t}){setLoading("\u0110ang t\u1EA3i k\u1EBFt qu\u1EA3...");const e=routeToken();try{resetResultNavContext();const n=await api.get(`/submissions?assignment_id=${t}&student_id=${_student.id}`);if(routeChanged(e))return;let i=null;if(n.skill==="writing"||n.skill==="speaking"){try{i=await api.get(`/assignments/${t}/my-submissions`)}catch{}if(routeChanged(e))return}renderResult(n,i)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i k\u1EBFt qu\u1EA3: "+(n.error||n.message),"error"),navigate("/assignments")}}function renderResult(t,e=null){const n=t.skill;n==="reading"||n==="listening"?renderGradedResult(t):n==="writing"?renderWritingResult(t,e):n==="speaking"&&renderSpeakingResult(t,e)}function renderGradedResult(t){_gradedResultSub=t;const e=t.questions_data||[],n=t.student_answers||[];let i=0;const s=e.some(u=>u.explanation||u.location),a=e.map(u=>{const h=(n.find(f=>f.q_no===u.q_no)?.answer||"").trim(),v=u.answers.some(f=>f.toLowerCase().trim()===h.toLowerCase());return v&&i++,{...u,_given:h,_correct:v}});_gradedResultSortCol==="result"?a.sort((u,g)=>{const h=u._correct?1:0,v=g._correct?1:0;return _gradedResultSortDir==="asc"?h-v:v-h}):_gradedResultSortCol==="q_no"&&a.sort((u,g)=>_gradedResultSortDir==="asc"?u.q_no-g.q_no:g.q_no-u.q_no);const o=a.map(u=>{const g=u._given,h=u._correct,v=u.explanation||u.location?`
      <td class="result-actions">
        ${u.explanation?`<button class="btn-result-action btn-result-explain" onclick="toggleExplanation('exp-q${u.q_no}')">Explain</button>`:""}
        ${u.location?`<button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(u.location)}" data-locate-meta="${escapeAttrJson(u.location_meta)}" onclick="locateInText(this.dataset.locate, this.dataset.locateMeta)">Locate</button>`:""}
      </td>`:s?"<td></td>":"",f=u.explanation?`
      <tr class="explanation-row hidden" id="exp-q${u.q_no}">
        <td colspan="${s?5:4}">
          <div class="explanation-content"><span class="explanation-label">\u{1F4A1} Gi\u1EA3i th\xEDch:</span>${escapeHtml(u.explanation)}</div>
        </td>
      </tr>`:"";return`
      <tr>
        <td style="font-weight:700;color:var(--gray-400)">Q${u.q_no}</td>
        <td>${escapeHtml(g)||'<em style="color:var(--gray-400)">B\u1ECF tr\u1ED1ng</em>'}</td>
        <td>${escapeHtml(u.answers.join(" / "))}</td>
        <td class="${h?"result-correct":"result-wrong"}">${h?"\u2713":"\u2717"}</td>
        ${v}
      </tr>${f}`}).join(""),l=e.length,d=(t.scoring_scale||"10")==="ielts",c=t.overall_score??(l>0?d?Math.round(i/l*9*10)/10:Math.round(i/l*10*10)/10:0),p=s?5:4,r=t.vocabulary||[],m=r.length===0?"":`
    <div class="section-label" style="margin-top:20px">\u{1F4DA} T\u1EEB v\u1EF1ng trong b\xE0i</div>
    <div class="vocab-result-list">
      ${r.map((u,g)=>{const h=isWordSaved(u.word);return`
        <div class="vocab-result-item">
          <div class="vocab-result-header" onclick="toggleVocabItem(${g})">
            <span class="vocab-result-word">${escapeHtml(u.word)}</span>
            <span class="vocab-result-toggle" id="vocab-toggle-${g}">\u25B6</span>
            <button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(u.word)}" onclick="event.stopPropagation();locateInText(this.dataset.locate)">Locate</button>
            <button class="btn-save-word ${h?"saved":""}"
              data-word="${escapeHtml(u.word)}"
              data-def="${escapeHtml(u.definition)}"
              data-pron="${escapeHtml(u.pronunciation||"")}"
              data-ex="${escapeHtml(u.example||"")}"
              data-src="${escapeHtml(t.assignment_title||"")}"
              onclick="event.stopPropagation();toggleSaveWordBtn(this)"
            >${h?"\u2713 \u0110\xE3 l\u01B0u":"\u{1F4BE} L\u01B0u"}</button>
          </div>
          <div class="vocab-result-detail hidden" id="vocab-detail-${g}">
            <div class="vocab-result-def">${escapeHtml(u.definition)}</div>
            ${u.pronunciation?`<div class="vocab-result-pronunciation">${escapeHtml(u.pronunciation)}</div>`:""}
            ${u.collocation?`<div class="vocab-result-collocation">Collocation: ${escapeHtml(u.collocation)}</div>`:""}
            ${u.example?`<div class="vocab-result-example">"${escapeHtml(u.example)}"</div>`:""}
          </div>
        </div>`}).join("")}
    </div>`;$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('${getResultBackHref()}')">${getResultBackLabel()}</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.assignment_title||"")} - B\u1EA3ng \u0111i\u1EC3m</div>
        <div class="toolbar-actions">
          ${r.length>0&&!t.is_composite_section?`<a href="#/vocab-game/${t.assignment_id||""}" class="btn-vocab-toolbar" title="Luy\u1EC7n t\u1EEB v\u1EF1ng b\xE0i n\xE0y">\u{1F0CF} T\u1EEB v\u1EF1ng</a>`:""}
          ${l-i>0?`<button class="btn-practice btn-practice-wrong" onclick="navigate('${getPracticeHref(t,"retry_wrong")}')">\u{1F4DD} L\xE0m l\u1EA1i c\xE2u sai (${l-i})</button>`:""}
          <button class="btn-practice btn-practice-full" onclick="navigate('${getPracticeHref(t,"retry_full")}')">\u{1F504} L\xE0m l\u1EA1i to\xE0n b\xE0i</button>
        </div>
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="result-content-pane">
          ${t.skill==="listening"?renderListeningAudioHtml(t):""}
          ${t.skill==="listening"&&t.script?`
            <div class="script-section" id="listening-script-section">
              <button class="script-toggle" onclick="toggleListeningScript()">
                <span id="script-toggle-icon">\u25B6</span> Script Listening
              </button>
              <div class="script-body hidden" id="listening-script-body">
                <div id="listening-script-text">${escapeHtml(t.script)}</div>
              </div>
            </div>
          `:""}
          <div class="section-title">${t.skill==="listening"?"C\xE2u h\u1ECFi":"B\xE0i \u0111\u1ECDc & C\xE2u h\u1ECFi"}</div>
          <div class="reading-text" id="result-reading-text">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="result-header" style="margin-bottom:16px;">
            <div class="score-display" style="margin-top:0;">
              <div class="score-number">${c}</div>
              <div class="score-band">${d?"Band Score / 9.0":"\u0110i\u1EC3m / 10"}</div>
            </div>
            <div class="result-stats">
              <div class="stat-item">
                <div class="stat-value" style="color:var(--success)">${i}</div>
                <div class="stat-label">\u0110\xFAng</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="color:var(--danger)">${l-i}</div>
                <div class="stat-label">Sai</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${l}</div>
                <div class="stat-label">T\u1ED5ng s\u1ED1</div>
              </div>
            </div>
          </div>
          <div class="section-label">Chi ti\u1EBFt \u0111\xE1p \xE1n</div>
          <div class="result-answers">
            <table class="result-table">
              <thead><tr>
                <th class="sortable" onclick="sortGradedResult('q_no')">C\xE2u ${makeSortIcon("q_no",_gradedResultSortCol,_gradedResultSortDir)}</th>
                <th>B\u1EA1n tr\u1EA3 l\u1EDDi</th>
                <th>\u0110\xE1p \xE1n \u0111\xFAng</th>
                <th class="sortable" onclick="sortGradedResult('result')">K\u1EBFt qu\u1EA3 ${makeSortIcon("result",_gradedResultSortCol,_gradedResultSortDir)}</th>
                ${s?"<th></th>":""}
              </tr></thead>
              <tbody>${o||`<tr><td colspan="${p}" style="text-align:center;padding:20px;color:var(--gray-400)">Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u</td></tr>`}</tbody>
            </table>
          </div>
          ${m}
        </div>
      </div>
    </div>`}function toggleExplanation(t){const e=document.getElementById(t);e&&e.classList.toggle("hidden")}function sortGradedResult(t){_gradedResultSortCol===t?_gradedResultSortDir=_gradedResultSortDir==="asc"?"desc":"asc":(_gradedResultSortCol=t,_gradedResultSortDir="asc"),_gradedResultSub&&renderGradedResult(_gradedResultSub)}window.sortGradedResult=sortGradedResult;function toggleListeningScript(t){const e=document.getElementById("listening-script-body"),n=document.getElementById("script-toggle-icon");if(!e)return;const i=t===!0?!1:!e.classList.contains("hidden");e.classList.toggle("hidden",i),n&&(n.textContent=i?"\u25B6":"\u25BC")}function toggleVocabItem(t){const e=document.getElementById(`vocab-detail-${t}`),n=document.getElementById(`vocab-toggle-${t}`);if(!e)return;const i=e.classList.toggle("hidden");n&&(n.textContent=i?"\u25B6":"\u25BC")}function findTextBlockById(t,e){return Array.from(t.querySelectorAll(".mixed-content-text")).find(n=>n.dataset.blockId===e)||null}function unwrapLocateMark(t){const e=t?.parentNode;if(e){for(;t.firstChild;)e.insertBefore(t.firstChild,t);e.removeChild(t),e.normalize()}}function flashLocatedMarks(t){t.length&&(t[0].scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>t.forEach(unwrapLocateMark),2500))}function getTextNodePosition(t,e){const n=t.textContent?.length||0,i=Math.max(0,Math.min(e,n)),s=document.createTreeWalker(t,NodeFilter.SHOW_TEXT,null);let a,o=0;for(;a=s.nextNode();){const l=o+a.textContent.length;if(i<=l)return{node:a,offset:i-o};o=l}return null}function highlightBlockRange(t,e,n){const i=getTextNodePosition(t,e),s=getTextNodePosition(t,n);if(!i||!s)return null;const a=document.createRange();if(a.setStart(i.node,i.offset),a.setEnd(s.node,s.offset),a.collapsed)return null;const o=document.createElement("mark");o.className="locate-flash";try{a.surroundContents(o)}catch{const l=a.extractContents();o.appendChild(l),a.insertNode(o)}return o}function locateByMeta(t,e){if(!e)return!1;let n=null;try{n=JSON.parse(e)}catch{return!1}if(!n?.start_block_id||!n?.end_block_id)return!1;const i=findTextBlockById(t,n.start_block_id),s=findTextBlockById(t,n.end_block_id);if(!i||!s)return!1;const a=Array.from(t.querySelectorAll(".mixed-content-text")),o=a.indexOf(i),l=a.indexOf(s);if(o<0||l<0)return!1;const d=Math.min(o,l),c=Math.max(o,l),p=a.slice(d,c+1),r=[],m=i===s;return p.forEach((u,g)=>{const h=u.textContent?.length||0;let v=0,f=h;m?(v=Math.max(0,Number(n.start_offset)||0),f=Math.max(v,Number(n.end_offset)||0)):g===0?v=Math.max(0,Number(n.start_offset)||0):g===p.length-1&&(f=Math.max(0,Number(n.end_offset)||0));const _=highlightBlockRange(u,v,f);_&&r.push(_)}),r.length?(flashLocatedMarks(r),!0):!1}function locateInText(t,e=""){if(!t)return;const n=document.getElementById("listening-script-text"),i=(()=>{try{return JSON.parse(e)}catch{return null}})();if(n&&i?.type==="script_text_range"){toggleListeningScript(!0),locateInElement(n,t);return}const s=document.getElementById("result-reading-text");s&&(locateByMeta(s,e)||locateInElement(s,t))}function locateInElement(t,e){const n=document.createTreeWalker(t,NodeFilter.SHOW_TEXT,null);let i;for(;i=n.nextNode();){const s=i.textContent.toLowerCase().indexOf(e.toLowerCase());if(s<0)continue;const a=document.createRange();a.setStart(i,s),a.setEnd(i,s+e.length);const o=document.createElement("mark");o.className="locate-flash";try{a.surroundContents(o)}catch{continue}o.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const l=o.parentNode;if(l){for(;o.firstChild;)l.insertBefore(o.firstChild,o);l.removeChild(o),l.normalize()}},2500);return}toast("Kh\xF4ng t\xECm th\u1EA5y \u0111o\u1EA1n n\xE0y trong b\xE0i","error")}function renderWritingResult(t,e=null){const n=t.teacher_feedback;t.overall_score!=null||n?.annotations?.length>0||n?.overall?renderWritingFeedback(t,e):renderWritingPending(t)}function renderWritingPending(t){const e=countWords(t.writing_content||"");$("#app").innerHTML=`
    <div class="container">
      <button class="btn-back" onclick="navigate('${getResultBackHref()}')">${getResultBackLabel()}</button>
      <div class="result-header">
        <div>${skillBadge(t.skill)}</div>
        <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${escapeHtml(t.assignment_title||"")}</div>
        <div style="margin-top:16px">
          <div style="font-size:32px">\u270D\uFE0F</div>
          <div style="font-weight:700;font-size:15px;margin-top:8px">\u0110\xE3 n\u1ED9p b\xE0i</div>
          <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${e} t\u1EEB</div>
        </div>
      </div>
      <div class="pending-feedback">
        <div class="pending-feedback-icon">\u23F3</div>
        <div class="pending-feedback-text">
          <h4>Ch\u1EDD gi\xE1o vi\xEAn ch\u1EA5m \u0111i\u1EC3m</h4>
          <p>B\xE0i lu\u1EADn c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c ghi nh\u1EADn. Gi\xE1o vi\xEAn s\u1EBD nh\u1EADn x\xE9t v\xE0 ch\u1EA5m \u0111i\u1EC3m s\u1EDBm.</p>
        </div>
      </div>
      <div class="section-label">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
      <div class="submitted-content">${escapeHtml(t.writing_content||"")}</div>
    </div>`}function renderWritingFeedback(t,e=null){const n=t.teacher_feedback||{},i=(n.annotations||[]).sort((f,_)=>f.start-_.start),s=n.overall||"",a=t.overall_score??n.score,o=countWords(t.writing_content||""),l=e?[...e].sort((f,_)=>(_.attempt_number||1)-(f.attempt_number||1)):null,c=(l?l[0]:t).rewrite_status==="requested",p=e&&e.length>1,r=s?`
    <div class="section-label">Nh\u1EADn x\xE9t t\u1ED5ng th\u1EC3</div>
    <div class="feedback-overall">${escapeHtml(s)}</div>`:"",m=buildVoiceNotesHtml(n.voice_notes),u=_annColorMap(i),g=_buildAnnSidebar(i,u),h=p?`
    <div class="version-selector">
      <span class="version-selector-label">Xem k\u1EBFt qu\u1EA3:</span>
      ${[...e].sort((f,_)=>(f.attempt_number||1)-(_.attempt_number||1)).map(f=>`
        <button class="version-btn${f.id===t.id?" active":""}"
          onclick="switchWritingVersion('${f.id}','${t.assignment_id}')">
          L\u1EA7n ${f.attempt_number}${f.overall_score!=null?` \xB7 ${f.overall_score}`:""}
        </button>`).join("")}
    </div>`:"",v=c?`
    <div class="rewrite-request-bar">
      <div class="rewrite-request-text">
        <span class="rewrite-request-icon">\u270F\uFE0F</span>
        <span>Gi\xE1o vi\xEAn y\xEAu c\u1EA7u b\u1EA1n vi\u1EBFt l\u1EA1i b\xE0i n\xE0y</span>
      </div>
      <button class="btn btn-danger" onclick="navigate('/assignment/${t.assignment_id}')">B\u1EAFt \u0111\u1EA7u vi\u1EBFt l\u1EA1i</button>
    </div>`:"";$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('${getResultBackHref()}')">${getResultBackLabel()}</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.assignment_title||"")}</div>
        <div class="score-chip ${c?"score-chip-rewrite":""}">
          <span class="score-chip-val">${a??"\u2014"}</span>
          <span class="score-chip-label">/9.0</span>
        </div>
      </div>
      ${v}
      ${h}
      <div class="assignment-content">
        <div class="content-pane" id="feedback-content-pane">
          ${r}
          ${m}
          <div class="section-label"${s?' style="margin-top:20px"':""}>B\xE0i l\xE0m c\u1EE7a b\u1EA1n
            ${i.length>0?'<span class="feedback-hint">M\xE0u highlight = nh\u1EADn x\xE9t \xB7 B\u1EA5m s\u1ED1 \u0111\u1EC3 xem</span>':""}
          </div>
          <div class="submitted-content feedback-essay">${buildAnnotatedHtml(t.writing_content||"",i)}</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:8px;text-align:right">${o} t\u1EEB</div>
        </div>
        <div class="answer-pane">
          ${g}
        </div>
      </div>
    </div>`}async function switchWritingVersion(t,e){setLoading("\u0110ang t\u1EA3i...");try{const[n,i]=await Promise.all([api.get(`/submissions/${t}/by-student`),api.get(`/assignments/${e}/my-submissions`)]);renderWritingFeedback(n,i)}catch(n){toast("L\u1ED7i: "+(n.error||n.message),"error")}}const ANN_COLORS=["ann-c0","ann-c1","ann-c2","ann-c3","ann-c4","ann-c5"];function _buildAnnSidebar(t,e){if(!t.length)return'<div style="color:var(--gray-400);font-size:13px;text-align:center;padding-top:48px">Kh\xF4ng c\xF3 nh\u1EADn x\xE9t theo \u0111o\u1EA1n</div>';let n=0;return`<div class="section-label">Nh\u1EADn x\xE9t theo \u0111o\u1EA1n</div><div class="feedback-annotations">${t.map((s,a)=>{const o=(s.type||"highlight")==="delete",l=o?'<span class="feedback-ann-delete-badge">\u2715 G\u1EA1ch x\xF3a</span>':`<span class="feedback-ann-number feedback-ann-num-c${e.get(s.id)}">${++n}</span>`;return`
      <div class="feedback-ann-card ${o?"feedback-ann-delete":`feedback-ann-c${e.get(s.id)}`} feedback-ann-clickable" onclick="scrollToFeedbackMark(${a})" title="B\u1EA5m \u0111\u1EC3 t\u1EDBi \u0111o\u1EA1n \u0111\u01B0\u1EE3c nh\u1EADn x\xE9t">
        <div class="feedback-ann-header">
          ${l}
          <span class="feedback-ann-quote"${o?' style="text-decoration:line-through;color:#991b1b"':""}>"${escapeHtml(s.text.slice(0,80))}${s.text.length>80?"\u2026":""}"</span>
        </div>
        <div class="feedback-ann-comment">${escapeHtml(s.comment)}</div>
      </div>`}).join("")}</div>`}function _annColorMap(t){if(!t||!t.length)return new Map;const e=t.filter(s=>(s.type||"highlight")==="highlight");if(!e.length)return new Map;const n=new Map(e.map(s=>[s.id,0])),i=[...e].sort((s,a)=>s.end-s.start-(a.end-a.start));for(const s of i)for(const a of e)a!==s&&a.start<=s.start&&a.end>=s.end&&n.set(a.id,Math.max(n.get(a.id),n.get(s.id)+1));return new Map(e.map(s=>[s.id,Math.min(n.get(s.id),ANN_COLORS.length-1)]))}function buildVoiceNotesHtml(t){return!Array.isArray(t)||t.length===0?"":`
    <div class="section-label" style="margin-top:20px">\u{1F399}\uFE0F Nh\u1EADn x\xE9t</div>
    <div class="voice-notes-list">
      ${t.map((e,n)=>`
        <div class="voice-note-item">
          <div class="voice-note-name">${escapeHtml(e.name||`part_${n+1}`)}</div>
          <audio controls src="${escapeHtml(e.url||"")}" style="width:100%;height:36px;outline:none"></audio>
        </div>`).join("")}
    </div>`}function buildAnnotatedHtml(t,e){if(!t)return'<span style="color:var(--gray-400)">(Tr\u1ED1ng)</span>';if(!e||e.length===0)return escapeHtml(t);const n=_annColorMap(e),i=[...e].sort((d,c)=>d.start-c.start),s=new Map(i.map((d,c)=>[d.id,c+1]));let a=0;const o=new Map(i.map(d=>(d.type||"highlight")==="highlight"?[d.id,++a]:[d.id,null]));function l(d,c,p){if(d>=c)return"";if(!p.length)return escapeHtml(t.slice(d,c));const r=[...p].sort((h,v)=>h.start-v.start||v.end-v.start-(h.end-h.start));let m="",u=d;const g=new Set;for(const h of r){if(g.has(h.id))continue;const v=Math.max(h.start,u);if(v>=h.end)continue;m+=escapeHtml(t.slice(u,v));const f=r.filter(S=>!g.has(S.id)&&S!==h&&S.start>=h.start&&S.end<=h.end);f.forEach(S=>g.add(S.id)),g.add(h.id);const _=s.get(h.id)-1;if((h.type||"highlight")==="delete")m+=`<span class="ann-delete" id="ann-mark-${_}" title="${escapeHtml(h.comment)}">`,m+=l(v,h.end,f),m+="</span>";else{const S=ANN_COLORS[n.get(h.id)];m+=`<mark class="ann-highlight ${S}" id="ann-mark-${_}" title="${escapeHtml(h.comment)}">`,m+=l(v,h.end,f),m+=`<sup class="ann-marker ann-marker-c${n.get(h.id)}">${o.get(h.id)}</sup>`,m+="</mark>"}u=h.end}return m+=escapeHtml(t.slice(u,c)),m}return l(0,t.length,e)}function scrollToFeedbackMark(t){const e=document.getElementById(`ann-mark-${t}`);if(!e)return;const n=document.getElementById("feedback-content-pane");if(n){const i=e.getBoundingClientRect().top-n.getBoundingClientRect().top;n.scrollTop+=i-n.clientHeight/3}else e.scrollIntoView({behavior:"smooth",block:"center"});e.classList.add("ann-flash"),setTimeout(()=>e.classList.remove("ann-flash"),1500)}function renderSpeakingResult(t,e=null){const n=t.teacher_feedback;t.overall_score!=null||n?.annotations?.length>0||n?.overall?renderSpeakingFeedback(t,e):renderSpeakingPending(t)}function renderSpeakingPending(t){$("#app").innerHTML=`
    <div class="container">
      <button class="btn-back" onclick="navigate('${getResultBackHref()}')">${getResultBackLabel()}</button>
      <div class="result-header">
        <div>${skillBadge(t.skill)}</div>
        <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${escapeHtml(t.assignment_title||"")}</div>
        <div style="margin-top:16px">
          <div style="font-size:32px">\u{1F3A4}</div>
          <div style="font-weight:700;font-size:15px;margin-top:8px">\u0110\xE3 n\u1ED9p b\xE0i</div>
        </div>
      </div>
      <div class="pending-feedback">
        <div class="pending-feedback-icon">\u23F3</div>
        <div class="pending-feedback-text">
          <h4>Ch\u1EDD gi\xE1o vi\xEAn ch\u1EA5m \u0111i\u1EC3m</h4>
          <p>File audio c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c ghi nh\u1EADn. Gi\xE1o vi\xEAn s\u1EBD nghe v\xE0 ch\u1EA5m \u0111i\u1EC3m s\u1EDBm.</p>
        </div>
      </div>
      ${(()=>{const e=Array.isArray(t.speaking_audio_urls)&&t.speaking_audio_urls.length>0?t.speaking_audio_urls:t.speaking_audio_url?[{url:t.speaking_audio_url}]:[];return e.length?`<div class="section-label">B\xE0i thu \xE2m c\u1EE7a b\u1EA1n</div>
          <div class="submitted-content" style="padding:16px">
            ${e.map((n,i)=>`
              ${e.length>1?`<div style="font-size:12px;color:var(--gray-400);margin-bottom:4px">${escapeHtml(n.name||"Ph\u1EA7n "+(i+1))}</div>`:""}
              <audio controls src="${escapeHtml(n.url||"")}" style="width:100%;margin-bottom:${i<e.length-1?"12px":"0"}"></audio>
            `).join("")}
          </div>`:""})()}
    </div>`}function renderSpeakingFeedback(t,e=null){const n=t.teacher_feedback||{},i=(n.annotations||[]).sort((v,f)=>v.start-f.start),s=n.overall||"",a=t.overall_score??n.score,o=e?[...e].sort((v,f)=>(f.attempt_number||1)-(v.attempt_number||1)):null,d=(o?o[0]:t).rewrite_status==="requested",c=e&&e.length>1,p=s?`
    <div class="section-label">Nh\u1EADn x\xE9t t\u1ED5ng th\u1EC3</div>
    <div class="feedback-overall">${escapeHtml(s)}</div>`:"",r=buildVoiceNotesHtml(n.voice_notes),m=_annColorMap(i),u=_buildAnnSidebar(i,m),g=c?`
    <div class="version-selector">
      <span class="version-selector-label">Xem k\u1EBFt qu\u1EA3:</span>
      ${[...e].sort((v,f)=>(v.attempt_number||1)-(f.attempt_number||1)).map(v=>`
        <button class="version-btn${v.id===t.id?" active":""}"
          onclick="switchSpeakingVersion('${v.id}','${t.assignment_id}')">
          L\u1EA7n ${v.attempt_number}${v.overall_score!=null?` \xB7 ${v.overall_score}`:""}
        </button>`).join("")}
    </div>`:"",h=d?`
    <div class="rewrite-request-bar">
      <div class="rewrite-request-text">
        <span class="rewrite-request-icon">\u270F\uFE0F</span>
        <span>Gi\xE1o vi\xEAn y\xEAu c\u1EA7u b\u1EA1n l\xE0m l\u1EA1i b\xE0i n\xE0y</span>
      </div>
      <button class="btn btn-danger" onclick="navigate('/assignment/${t.assignment_id}')">B\u1EAFt \u0111\u1EA7u l\xE0m l\u1EA1i</button>
    </div>`:"";$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('${getResultBackHref()}')">${getResultBackLabel()}</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.assignment_title||"")}</div>
        <div class="score-chip ${d?"score-chip-rewrite":""}">
          <span class="score-chip-val">${a??"\u2014"}</span>
          <span class="score-chip-label">/9.0</span>
        </div>
      </div>
      ${h}
      ${g}
      <div class="assignment-content">
        <div class="content-pane" id="feedback-content-pane">
          ${p}
          ${r}
          ${(()=>{const v=Array.isArray(t.speaking_audio_urls)&&t.speaking_audio_urls.length>0?t.speaking_audio_urls:t.speaking_audio_url?[{url:t.speaking_audio_url}]:[];return v.length?`<div class="section-label"${s?' style="margin-top:20px"':""}>Audio ghi \xE2m c\u1EE7a b\u1EA1n</div>
              <div style="margin-bottom:16px">
                ${v.map((f,_)=>`
                  ${v.length>1?`<div style="font-size:12px;color:var(--gray-400);margin-bottom:4px">${escapeHtml(f.name||"Ph\u1EA7n "+(_+1))}</div>`:""}
                  <audio controls src="${escapeHtml(f.url||"")}" style="width:100%;height:36px;outline:none;margin-bottom:${_<v.length-1?"10px":"0"}"></audio>
                `).join("")}
              </div>`:""})()}
          <div class="section-label">Transcript (AI Generated)
            ${i.length>0?'<span class="feedback-hint">M\xE0u highlight = nh\u1EADn x\xE9t \xB7 B\u1EA5m s\u1ED1 \u0111\u1EC3 xem</span>':""}
          </div>
          <div class="submitted-content feedback-essay">${buildAnnotatedHtml(t.speaking_script||"",i)}</div>
        </div>
        <div class="answer-pane">
          ${u}
        </div>
      </div>
    </div>`}async function switchSpeakingVersion(t,e){setLoading("\u0110ang t\u1EA3i...");try{const[n,i]=await Promise.all([api.get(`/submissions/${t}/by-student`),api.get(`/assignments/${e}/my-submissions`)]);renderSpeakingFeedback(n,i)}catch(n){toast("L\u1ED7i: "+(n.error||n.message),"error")}}const _vocabExpanded={};let _vocabSearch="";async function showVocabGames(){setLoading("\u0110ang t\u1EA3i t\u1EEB v\u1EF1ng...");const t=routeToken();try{const e=!window._cachedAssignments&&_student&&_selectedClass;if(await Promise.all([loadMyVocab(),e?getAssignments().then(n=>{window._cachedAssignments=n}).catch(()=>{}):Promise.resolve()]),routeChanged(t))return;_vocabSearch="",renderVocabGames()}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i t\u1EEB v\u1EF1ng: "+(e.error||e.message),"error"),renderRouteError("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c trang t\u1EEB v\u1EF1ng",e,"/vocab-games")}}function buildVocabTeacherHtml(t){const e=_vocabSearch.toLowerCase().trim(),n=e?t.filter(l=>l.title.toLowerCase().includes(e)||l.skill.toLowerCase().includes(e)):t,i=["reading","listening","writing","speaking"],s={};for(const l of i)s[l]=[];for(const l of n)s[l.skill]?s[l.skill].push(l):s[l.skill]=[l];if(n.length===0)return`<div class="vocab-empty-mini">
      <span class="vocab-empty-icon">\u{1F4ED}</span>
      <span>${e?"Kh\xF4ng t\xECm th\u1EA5y b\xE0i n\xE0o kh\u1EDBp":"Gi\xE1o vi\xEAn ch\u01B0a th\xEAm t\u1EEB v\u1EF1ng v\xE0o b\xE0i n\xE0o"}</span>
    </div>`;const a=3;let o="";for(const l of i){const d=s[l];if(!d||d.length===0)continue;const c=!!_vocabExpanded[l],p=c?d:d.slice(0,a),r=d.length-a,m=p.map(g=>`
      <a class="vocab-game-card" href="#/vocab-game/${g.id}">
        <div class="vocab-game-card-icon">${SKILL_ICONS[g.skill]}</div>
        <div class="vocab-game-card-body">
          <div class="vocab-game-card-title">${escapeHtml(g.title)}</div>
          <div class="vocab-game-card-meta">
            ${skillBadge(g.skill)}
            <span class="vocab-count-badge">${g.vocab_count} t\u1EEB</span>
          </div>
        </div>
        <div class="vocab-game-card-arrow">\u203A</div>
      </a>`).join(""),u=!c&&r>0?`<button class="vocab-show-more" onclick="vocabToggleSkill('${l}')">+ Xem th\xEAm ${r} b\xE0i</button>`:c&&d.length>a?`<button class="vocab-show-more" onclick="vocabToggleSkill('${l}')">\u2212 Thu g\u1ECDn</button>`:"";o+=`
      <div class="vocab-skill-group">
        <div class="vocab-skill-group-header">
          <span class="vocab-skill-group-icon">${SKILL_ICONS[l]}</span>
          <span class="vocab-skill-group-name">${SKILL_LABELS[l]||l}</span>
          <span class="vocab-skill-group-count">${d.length} b\xE0i</span>
        </div>
        <div class="vocab-game-list">${m}</div>
        ${u}
      </div>`}return o}function renderVocabGames(){const e=(window._cachedAssignments||[]).filter(a=>Number(a.vocab_count)>0),n=document.getElementById("vocab-teacher-list");if(n){n.innerHTML=buildVocabTeacherHtml(e);return}const i=_myVocabCache||[],s=i.length===0?`<div class="vocab-my-empty">
         <span>B\u1EA1n ch\u01B0a l\u01B0u t\u1EEB n\xE0o.</span>
         <span class="vocab-my-empty-hint">B\u1EA5m \u{1F4BE} L\u01B0u trong trang k\u1EBFt qu\u1EA3 b\xE0i l\xE0m \u0111\u1EC3 th\xEAm t\u1EEB.</span>
       </div>`:`<div class="vocab-my-info">
         <div class="vocab-my-count">${i.length} <span>t\u1EEB \u0111\xE3 l\u01B0u</span></div>
         <div class="vocab-my-preview">${i.slice(0,5).map(a=>`<span class="vocab-my-pill">${escapeHtml(a.word)}</span>`).join("")}${i.length>5?`<span class="vocab-my-pill muted">+${i.length-5}</span>`:""}</div>
       </div>
       <div class="vocab-my-actions">
         <button class="btn btn-primary" onclick="startMyFlashcard()">\u{1F0CF} Flashcard</button>
         <button class="btn btn-outline" onclick="navigate('/my-vocab')">\u{1F4D6} Xem danh s\xE1ch</button>
       </div>`;$("#app").innerHTML=`
    <div class="container vocab-hub-page">
      <div class="page-header">
        <div class="page-title">\u{1F0CF} T\u1EEB v\u1EF1ng</div>
        <div class="page-subtitle">Ch\u1ECDn ngu\u1ED3n t\u1EEB v\u1EF1ng \u0111\u1EC3 luy\u1EC7n t\u1EADp</div>
      </div>

      <div class="vocab-section">
        <div class="vocab-section-header">
          <span class="vocab-section-icon">\u{1F469}\u200D\u{1F3EB}</span>
          <div>
            <div class="vocab-section-title">T\u1EEB v\u1EF1ng b\xE0i h\u1ECDc</div>
            <div class="vocab-section-sub">Do gi\xE1o vi\xEAn bi\xEAn so\u1EA1n k\xE8m b\xE0i</div>
          </div>
        </div>
        ${e.length>3?`
        <div class="vocab-search-bar">
          <input class="form-input" aria-label="T\xECm b\xE0i theo t\xEAn ho\u1EB7c k\u1EF9 n\u0103ng" placeholder="\u{1F50D} T\xECm b\xE0i theo t\xEAn ho\u1EB7c k\u1EF9 n\u0103ng..."
            oninput="_vocabSearch=this.value; renderVocabGames()" />
        </div>`:""}
        <div id="vocab-teacher-list">${buildVocabTeacherHtml(e)}</div>
      </div>

      <div class="vocab-section">
        <div class="vocab-section-header">
          <span class="vocab-section-icon">\u{1F4D6}</span>
          <div>
            <div class="vocab-section-title">T\u1EEB v\u1EF1ng c\u1EE7a t\xF4i</div>
            <div class="vocab-section-sub">C\xE1c t\u1EEB b\u1EA1n \u0111\xE3 t\u1EF1 l\u01B0u t\u1EEB k\u1EBFt qu\u1EA3 b\xE0i l\xE0m</div>
          </div>
        </div>
        <div class="vocab-my-card">${s}</div>
      </div>
    </div>`}function vocabToggleSkill(t){_vocabExpanded[t]=!_vocabExpanded[t],renderVocabGames()}window.vocabToggleSkill=vocabToggleSkill,window.renderVocabGames=renderVocabGames;async function showVocabGame({id:t}){setLoading("\u0110ang t\u1EA3i t\u1EEB v\u1EF1ng...");const e=routeToken();try{const n=await api.get(`/assignments/${t}/vocabulary`);if(routeChanged(e))return;if(_vocabGameId=t,_vocabGameData=n,!n.vocabulary?.length){toast("B\xE0i n\xE0y ch\u01B0a c\xF3 t\u1EEB v\u1EF1ng","error"),navigate("/vocab-games");return}renderVocabGameMenu()}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i t\u1EEB v\u1EF1ng: "+(n.error||n.message),"error"),navigate("/vocab-games")}}function renderVocabGameMenu(){if(!_vocabGameData)return;const t=_vocabGameData.vocabulary.length,e=Math.min(t,10);$("#app").innerHTML=`
    <div class="container">
      <div class="page-header">
        <button class="btn-back" onclick="navigate('/vocab-games')">\u2190 Danh s\xE1ch</button>
        <div class="page-title">\u{1F0CF} ${escapeHtml(_vocabGameData.assignment_title)}</div>
        <div class="page-subtitle">${t} t\u1EEB v\u1EF1ng</div>
      </div>
      <div class="vocab-mode-grid">
        <div class="vocab-mode-card" onclick="startFlashcard()">
          <div class="vocab-mode-icon">\u{1F4D6}</div>
          <div class="vocab-mode-title">\xD4n t\u1EADp</div>
          <div class="vocab-mode-desc">L\u1EADt th\u1EBB h\u1ECDc t\u1EEBng t\u1EEB m\u1ED9t<br><span class="vocab-mode-tip">Space / b\u1EA5m th\u1EBB \u0111\u1EC3 l\u1EADt \xB7 \u2190 \u2192 \u0111\u1EC3 chuy\u1EC3n</span></div>
          <div class="vocab-mode-count">${t} th\u1EBB</div>
        </div>
        <div class="vocab-mode-card" onclick="startMatchingGame(10)">
          <div class="vocab-mode-icon">\u{1F3AE}</div>
          <div class="vocab-mode-title">Test nhanh</div>
          <div class="vocab-mode-desc">N\u1ED1i t\u1EEB ti\u1EBFng Anh v\u1EDBi ngh\u0129a<br><span class="vocab-mode-tip">B\u1EA5m gi\u1EDD \xB7 \u0111\u1EBFm s\u1ED1 l\u1EA7n sai</span></div>
          <div class="vocab-mode-count">${e} c\u1EB7p \xB7 ${e*2} th\u1EBB</div>
        </div>
        <div class="vocab-mode-card" onclick="startMatchingGame(${t}, true)">
          <div class="vocab-mode-icon">\u{1F3C6}</div>
          <div class="vocab-mode-title">Test \u0111\u1EA7y \u0111\u1EE7</div>
          <div class="vocab-mode-desc">N\u1ED1i t\u1EA5t c\u1EA3 t\u1EEB trong b\xE0i<br><span class="vocab-mode-tip">Ho\xE0n th\xE0nh \u0111\u1EC3 t\xEDnh v\xE0o streak</span></div>
          <div class="vocab-mode-count">${t} c\u1EB7p \xB7 ${t*2} th\u1EBB</div>
        </div>
      </div>
    </div>`}function startFlashcard(){_vocabGameData&&(_fc={cards:[..._vocabGameData.vocabulary],idx:0,flipped:!1},renderFlashcard())}function renderFlashcard(){const{cards:t,idx:e,flipped:n}=_fc,i=t[e],s=t.length;$("#app").innerHTML=`
    <div class="container">
      <div class="page-header" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn-back" onclick="exitFlashcard()">\u2190 Ch\u1ECDn ch\u1EBF \u0111\u1ED9</button>
        <div style="flex:1">
          <div class="page-title">\u{1F4D6} \xD4n t\u1EADp</div>
        </div>
        <div class="fc-counter">${e+1} / ${s}</div>
      </div>

      <div class="flashcard-scene" onclick="flipFlashcard()">
        <div class="flashcard ${n?"flipped":""}">
          <div class="flashcard-face flashcard-front">
            <div class="flashcard-lang">Ti\u1EBFng Anh</div>
            <div class="flashcard-word">${escapeHtml(i.word)}</div>
            <div class="flashcard-hint-text">B\u1EA5m th\u1EBB ho\u1EB7c nh\u1EA5n Space \u0111\u1EC3 xem ngh\u0129a</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-lang">Ngh\u0129a ti\u1EBFng Vi\u1EC7t</div>
            <div class="flashcard-word">${escapeHtml(i.definition)}</div>
            ${i.pronunciation?`<div class="flashcard-pronunciation">${escapeHtml(i.pronunciation)}</div>`:""}
            ${i.collocation?`<div class="flashcard-collocation">Collocation: ${escapeHtml(i.collocation)}</div>`:""}
            ${i.example?`<div class="flashcard-example">"${escapeHtml(i.example)}"</div>`:""}
          </div>
        </div>
      </div>

      <div class="fc-nav">
        <button class="btn-fc-nav" onclick="fcPrev()" ${e===0?"disabled":""}>\u2190 Tr\u01B0\u1EDBc</button>
        <div class="fc-progress">
          <div class="fc-progress-bar" style="width:${((e+1)/s*100).toFixed(0)}%"></div>
        </div>
        <button class="btn-fc-nav" onclick="fcNext()" ${e===s-1?"disabled":""}>Ti\u1EBFp \u2192</button>
      </div>

      ${e===s-1?`
        <div style="text-align:center;margin-top:20px">
          <div style="font-size:32px;margin-bottom:8px">\u{1F389}</div>
          <div style="font-weight:700;margin-bottom:12px">B\u1EA1n \u0111\xE3 xem h\u1EBFt ${s} t\u1EEB!</div>
          <button class="btn btn-primary" onclick="exitFlashcard()">V\u1EC1 menu</button>
        </div>`:""}
    </div>`}function flipFlashcard(){_fc&&(_fc.flipped=!_fc.flipped,document.querySelector(".flashcard")?.classList.toggle("flipped"))}function fcPrev(){!_fc||_fc.idx<=0||(_fc.idx--,_fc.flipped=!1,renderFlashcard())}function fcNext(){!_fc||_fc.idx>=_fc.cards.length-1||(_fc.idx++,_fc.flipped=!1,renderFlashcard())}function exitFlashcard(){_fc=null,renderVocabGameMenu()}function startMatchingGame(t=10,e=!1){if(!_vocabGameData)return;_match?.timerInterval&&clearInterval(_match.timerInterval);const i=[..._vocabGameData.vocabulary].sort(()=>Math.random()-.5),s=i.slice(0,Math.min(t,i.length)),a=[];s.forEach((o,l)=>{a.push({id:`en-${l}`,pairId:l,text:o.word,type:"en",matched:!1,selected:!1}),a.push({id:`vi-${l}`,pairId:l,text:o.definition,type:"vi",matched:!1,selected:!1})}),a.sort(()=>Math.random()-.5),_match={cards:a,firstSelected:null,wrongCount:0,startTime:Date.now(),timerInterval:null,done:!1,limit:t,fullGame:e},_match.timerInterval=setInterval(()=>{const o=document.getElementById("match-timer");if(!o){clearInterval(_match.timerInterval);return}const l=Math.floor((Date.now()-_match.startTime)/1e3);o.textContent=`\u23F1 ${Math.floor(l/60)}:${(l%60).toString().padStart(2,"0")}`},1e3),renderMatchGame()}function renderMatchGame(){const{cards:t,wrongCount:e}=_match,n=t.filter(i=>!i.matched).length/2;$("#app").innerHTML=`
    <div class="container">
      <div class="page-header" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button class="btn-back" onclick="exitMatchGame()">\u2190 Tho\xE1t</button>
        <div style="flex:1"><div class="page-title">\u{1F3AE} Test t\u1EEB v\u1EF1ng</div></div>
        <div class="match-stat-bar">
          <span id="match-timer">\u23F1 0:00</span>
          <span class="match-stat-wrong">\u274C <strong id="match-wrong-count">${e}</strong> sai</span>
          <span class="match-stat-left">C\xF2n <strong id="match-remaining">${n}</strong> c\u1EB7p</span>
        </div>
      </div>
      <div class="match-grid" id="match-grid">
        ${t.map(i=>`
          <div class="match-card${i.matched?" matched":""}${i.selected?" selected":""}"
               data-id="${i.id}" onclick="selectMatchCard('${i.id}')">
            <span class="match-card-text">${escapeHtml(i.text)}</span>
          </div>`).join("")}
      </div>
    </div>`}function selectMatchCard(t){if(!_match||_match.done)return;const e=_match.cards.find(n=>n.id===t);if(!(!e||e.matched)){if(_match.firstSelected?.id===t){e.selected=!1,_match.firstSelected=null,_updateMatchCardEl(e);return}if(!_match.firstSelected)e.selected=!0,_match.firstSelected=e,_updateMatchCardEl(e);else{const n=_match.firstSelected;if(e.selected=!0,_updateMatchCardEl(e),n.pairId===e.pairId){n.matched=e.matched=!0,n.selected=e.selected=!1,_match.firstSelected=null,_updateMatchCardEl(n),_updateMatchCardEl(e);const i=_match.cards.filter(a=>!a.matched).length/2,s=document.getElementById("match-remaining");s&&(s.textContent=i),i===0&&(_match.done=!0,clearInterval(_match.timerInterval),_showMatchFinish())}else{_match.wrongCount++;const i=document.getElementById("match-wrong-count");i&&(i.textContent=_match.wrongCount);const s=document.querySelector(`.match-card[data-id="${n.id}"]`),a=document.querySelector(`.match-card[data-id="${e.id}"]`);s?.classList.add("wrong"),a?.classList.add("wrong"),setTimeout(()=>{n.selected=e.selected=!1,_match.firstSelected=null,s?.classList.remove("wrong","selected"),a?.classList.remove("wrong","selected")},650)}}}}function _updateMatchCardEl(t){const e=document.querySelector(`.match-card[data-id="${t.id}"]`);e&&(e.className=`match-card${t.matched?" matched":""}${t.selected?" selected":""}`)}function _showMatchFinish(){const t=Math.floor((Date.now()-_match.startTime)/1e3),e=`${Math.floor(t/60)}:${(t%60).toString().padStart(2,"0")}`,n=_match.wrongCount,i=!!_match.fullGame;i&&api.post("/student/vocab/sessions",{}).catch(()=>{});const s=document.getElementById("match-grid");s&&(s.outerHTML=`
    <div class="match-finish">
      <div class="match-finish-icon">\u{1F389}</div>
      <div class="match-finish-title">Ho\xE0n th\xE0nh!</div>
      ${i?'<div class="match-finish-streak">\u{1F525} +1 streak \xB7 Ch\xFAc m\u1EEBng b\u1EA1n \u0111\xE3 ho\xE0n th\xE0nh luy\u1EC7n t\u1EEB v\u1EF1ng h\xF4m nay!</div>':""}
      <div class="match-finish-stats">
        <div class="match-finish-stat">
          <div class="mfs-val">\u23F1 ${e}</div>
          <div class="mfs-label">Th\u1EDDi gian</div>
        </div>
        <div class="match-finish-stat">
          <div class="mfs-val">\u274C ${n}</div>
          <div class="mfs-label">L\u1EA7n ch\u1ECDn sai</div>
        </div>
      </div>
      <div class="match-finish-actions">
        <button class="btn btn-outline" onclick="startMatchingGame(${_match?.limit??10}, ${!!_match?.fullGame})">Ch\u01A1i l\u1EA1i</button>
        <button class="btn btn-primary" onclick="exitMatchGame()">V\u1EC1 menu</button>
      </div>
    </div>`)}function exitMatchGame(){_match?.timerInterval&&clearInterval(_match.timerInterval),_match=null,renderVocabGameMenu()}function removeHighlight(t){const e=t.parentNode;for(;t.firstChild;)e.insertBefore(t.firstChild,t);e.removeChild(t),e.normalize()}function initDarkMode(){const t=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",t);const e=document.getElementById("dark-mode-toggle");e&&(e.textContent=t==="dark"?"\u2600\uFE0F":"\u{1F319}")}function toggleDarkMode(){const e=(document.documentElement.getAttribute("data-theme")||"light")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",e),localStorage.setItem("theme",e);const n=document.getElementById("dark-mode-toggle");n&&(n.textContent=e==="dark"?"\u2600\uFE0F":"\u{1F319}")}window.toggleDarkMode=toggleDarkMode,window.togglePasswordVisibility=togglePasswordVisibility,window.openChangePasswordModal=openChangePasswordModal,window.submitChangePassword=submitChangePassword;const _origNavigate=navigate;function isExamActive(){return _examBeforeUnloadHandler!==null}async function _confirmLeaveExam(){return confirmSubmit({title:"\u26A0\uFE0F B\u1EA1n \u0111ang trong b\xE0i ki\u1EC3m tra",message:`<div style="line-height:1.6">
      Th\u1EDDi gian v\u1EABn <b>ti\u1EBFp t\u1EE5c ch\u1EA1y</b> khi b\u1EA1n r\u1EDDi trang.<br>
      N\u1EBFu h\u1EBFt gi\u1EDD, b\xE0i s\u1EBD t\u1EF1 \u0111\u1ED9ng n\u1ED9p v\u1EDBi nh\u1EEFng g\xEC b\u1EA1n \u0111\xE3 l\xE0m.
    </div>`,confirmText:"V\u1EABn r\u1EDDi trang",cancelText:"Ti\u1EBFp t\u1EE5c l\xE0m b\xE0i"})}function navigateWithTransition(t){if(isExamActive()){_confirmLeaveExam().then(n=>{if(!n)return;const i=document.getElementById("app");_skipExamLeaveGuardOnce=!0,setTimeout(()=>{_skipExamLeaveGuardOnce=!1},400),i?(i.classList.add("page-exit"),setTimeout(()=>{i.classList.remove("page-exit"),_origNavigate(t)},120)):_origNavigate(t)});return}const e=document.getElementById("app");e?(e.classList.add("page-exit"),setTimeout(()=>{e.classList.remove("page-exit"),_origNavigate(t)},120)):_origNavigate(t)}document.addEventListener("keydown",t=>{const e=t.target?.closest?.('[role="button"][tabindex="0"]');if(e&&(t.key==="Enter"||t.key===" ")){t.preventDefault(),e.click();return}if(_fc&&document.querySelector(".flashcard-scene")){if(t.code==="Space"){t.preventDefault(),flipFlashcard();return}if(t.key==="ArrowLeft"){fcPrev();return}if(t.key==="ArrowRight"){fcNext();return}}if(t.key==="Escape"){if(document.getElementById("mobile-nav")?.classList.contains("open")){closeMobileNav();return}if(_notifPanelOpen){closeNotifPanel();return}const i=document.querySelector(".modal-overlay:not(.hidden)");i&&i.querySelector(".modal-close")?.click()}}),initDarkMode(),window.navigate=navigateWithTransition,window.openModal=openModal,window.closeModal=closeModal,window.logout=logout,window.openSkillProgressModal=openSkillProgressModal,window.setProgressRange=setProgressRange,window.scrollProfileSection=scrollProfileSection,window.showProgressPointTooltip=showProgressPointTooltip,window.moveProgressTooltip=moveProgressTooltip,window.hideProgressTooltip=hideProgressTooltip,window.renderVocabGameMenu=renderVocabGameMenu,window.startFlashcard=startFlashcard,window.flipFlashcard=flipFlashcard,window.fcPrev=fcPrev,window.fcNext=fcNext,window.exitFlashcard=exitFlashcard,window.startMatchingGame=startMatchingGame,window.selectMatchCard=selectMatchCard,window.exitMatchGame=exitMatchGame,window.switchClass=switchClass,window.chooseClass=chooseClass,window.submitLogin=submitLogin,window.openForgotPasswordModal=openForgotPasswordModal,window.submitForgotPassword=submitForgotPassword,window.submitResetPassword=submitResetPassword,window.submitAnswers=submitAnswers,window.submitWriting=submitWriting,window.updateWordCount=updateWordCount,window.submitSpeaking=submitSpeaking,window.toggleRecording=toggleRecording,window.onFileUploaded=onFileUploaded,window.toggleFlag=toggleFlag,window.jumpToQuestion=jumpToQuestion,window.updateNavigatorState=updateNavigatorState,window.audioSeek=audioSeek,window.scheduleAnswerDraftSave=scheduleAnswerDraftSave,window.scheduleWritingDraftSave=scheduleWritingDraftSave,window.resetRecording=resetRecording,window.setHistoryFilter=setHistoryFilter,window.changeCalMonth=changeCalMonth,window.selectCalDay=selectCalDay,window.toggleExplanation=toggleExplanation,window.toggleVocabItem=toggleVocabItem,window.locateInText=locateInText,window.scrollToFeedbackMark=scrollToFeedbackMark,window.switchWritingVersion=switchWritingVersion,window.submitPractice=submitPractice,window.togglePracticeExp=togglePracticeExp;let _practiceData=null;async function showPractice({id:t}){setLoading("\u0110ang t\u1EA3i...");const e=t.indexOf("?"),n=e>=0?t.slice(0,e):t,s=new URLSearchParams(e>=0?t.slice(e+1):"").get("type")==="retry_full"?"retry_full":"retry_wrong",a=routeToken();try{const o=await api.get(`/submissions?assignment_id=${n}&student_id=${_student.id}`);if(routeChanged(a))return;if(o.skill!=="reading"&&o.skill!=="listening"){toast("Ch\u1EBF \u0111\u1ED9 luy\u1EC7n t\u1EADp ch\u1EC9 h\u1ED7 tr\u1EE3 Reading v\xE0 Listening.","warning"),navigate(`/result/${n}`);return}const l={id:o.assignment_id||n,title:o.assignment_title||"",skill:o.skill,content_text:o.content_text||"",content_blocks:o.content_blocks||[],content_url:o.content_url||"",content_urls:o.content_urls||[],questions_data:o.questions_data||[]};let d=l.questions_data;const c=o.student_answers||[];if(s==="retry_wrong"&&(d=d.filter(p=>{const m=(c.find(u=>u.q_no===p.q_no)?.answer||"").trim().toLowerCase();return!p.answers?.some(u=>u.toLowerCase().trim()===m)}),d.length===0)){toast("Kh\xF4ng c\xF3 c\xE2u sai n\xE0o \u0111\u1EC3 l\xE0m l\u1EA1i! \u{1F389}","success"),navigate(`/result/${n}`);return}_practiceData={assignment:l,questionsToShow:d,attemptType:s,origAnswers:c},renderPractice()}catch(o){if(routeChanged(a))return;toast("L\u1ED7i t\u1EA3i b\xE0i: "+(o.error||o.message),"error"),navigate("/assignments")}}async function showCompositePractice({id:t}){setLoading("\u0110ang t\u1EA3i...");const e=t.indexOf("?"),n=e>=0?t.slice(0,e):t,s=new URLSearchParams(e>=0?t.slice(e+1):"").get("type")==="retry_full"?"retry_full":"retry_wrong",a=routeToken();try{const o=await api.get(`/student/composite-section-submissions/${n}`);if(routeChanged(a))return;if(o.skill!=="reading"&&o.skill!=="listening"){toast("Ch\u1EBF \u0111\u1ED9 luy\u1EC7n t\u1EADp ch\u1EC9 h\u1ED7 tr\u1EE3 Reading v\xE0 Listening.","warning"),navigate(`/composite-result/${o.composite_assignment_id}/section/${n}`);return}const l={id:n,title:o.assignment_title||"",skill:o.skill,content_text:o.content_text||"",content_blocks:o.content_blocks||[],content_url:o.content_url||"",content_urls:o.content_urls||[],questions_data:o.questions_data||[]};let d=l.questions_data;const c=o.student_answers||[];if(s==="retry_wrong"&&(d=d.filter(p=>{const m=(c.find(u=>u.q_no===p.q_no)?.answer||"").trim().toLowerCase();return!p.answers?.some(u=>u.toLowerCase().trim()===m)}),d.length===0)){toast("Kh\xF4ng c\xF3 c\xE2u sai n\xE0o \u0111\u1EC3 l\xE0m l\u1EA1i! \u{1F389}","success"),navigate(`/composite-result/${o.composite_assignment_id}/section/${n}`);return}_practiceData={assignment:l,questionsToShow:d,attemptType:s,origAnswers:c,localComposite:!0,backHref:`/composite-result/${o.composite_assignment_id}/section/${n}`,backLabel:"\u2190 K\u1EBFt qu\u1EA3 ph\u1EA7n n\xE0y"},renderPractice()}catch(o){if(routeChanged(a))return;toast("L\u1ED7i t\u1EA3i b\xE0i: "+(o.error||o.message),"error"),navigate("/assignments")}}function renderPractice(){const{assignment:t,questionsToShow:e,attemptType:n}=_practiceData,i=n==="retry_wrong"?`L\xE0m l\u1EA1i c\xE2u sai (${e.length} c\xE2u)`:"L\xE0m l\u1EA1i to\xE0n b\xE0i";let s="";for(const o of e)s+=`
      <div class="answer-row">
        <span class="q-label">Q${o.q_no}</span>
        <input class="answer-input" id="pans-${o.q_no}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${o.q_no}" />
      </div>`;const a=e.map(o=>o.q_no).join(",");$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('${_practiceData?.backHref||`/result/${t.id}`}')">${_practiceData?.backLabel||"\u2190 K\u1EBFt qu\u1EA3"}</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)} \u2014 ${i}</div>
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="submitPractice('${t.id}', this)">Ki\u1EC3m tra</button>
      </div>
      <div style="background:#fef3c7;border-bottom:1px solid #fbbf24;padding:8px 16px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:6px">
        \u{1F504} Ch\u1EBF \u0111\u1ED9 luy\u1EC7n t\u1EADp \u2014 k\u1EBFt qu\u1EA3 <strong>kh\xF4ng ghi \u0111i\u1EC3m</strong> v\xE0o h\u1ED3 s\u01A1 ch\xEDnh
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="practice-content-pane">
          ${t.skill==="listening"?renderListeningAudioHtml(t):""}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">${t.skill==="listening"?"C\xE2u h\u1ECFi":"B\xE0i \u0111\u1ECDc & C\xE2u h\u1ECFi"}</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="practice-reading-text">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div style="font-size:12px;color:var(--gray-400);margin-bottom:12px">\u0110i\u1EC1n \u0111\xE1p \xE1n cho ${e.length} c\xE2u v\xE0 b\u1EA5m <strong>Ki\u1EC3m tra</strong>.</div>
          <input type="hidden" id="practice-q-nos" value="${a}" />
          ${s||'<div class="empty-hint">Kh\xF4ng c\xF3 c\xE2u n\xE0o.</div>'}
        </div>
      </div>
    </div>`,bindReadingTextInteractions("practice-reading-text")}async function submitPractice(t,e){const{assignment:n,questionsToShow:i,attemptType:s}=_practiceData||{};if(!i)return;const a=i.map(o=>({q_no:o.q_no,answer:($(`#pans-${o.q_no}`)?.value||"").trim()}));btnLoading(e);try{if(_practiceData?.localComposite){const l=n.questions_data||[];let d=0;for(const c of i){const p=(a.find(r=>r.q_no===c.q_no)?.answer||"").trim().toLowerCase();c.answers?.some(r=>r.toLowerCase().trim()===p)&&d++}renderPracticeResult({assignment_id:t,correct_count:d,total_count:i.length,questions_data:l},i,a);return}const o=await api.post("/practice/submit",{student_id:_student.id,assignment_id:t,attempt_type:s,student_answers:a});renderPracticeResult(o,i,a)}catch(o){btnReset(e),toast("L\u1ED7i: "+(o.error||o.message),"error")}}function renderPracticeResult(t,e,n){_practiceResultData={result:t,questionsToShow:e,answers:n};const i=t.questions_data||[],s=e.map(d=>{const c=i.find(u=>u.q_no===d.q_no)||d,r=(n.find(u=>u.q_no===d.q_no)?.answer||"").trim(),m=c.answers?.some(u=>u.toLowerCase().trim()===r.toLowerCase())||!1;return{...c,_given:r,_correct:m}});_practiceResultSortCol==="result"?s.sort((d,c)=>{const p=d._correct?1:0,r=c._correct?1:0;return _practiceResultSortDir==="asc"?p-r:r-p}):_practiceResultSortCol==="q_no"&&s.sort((d,c)=>_practiceResultSortDir==="asc"?d.q_no-c.q_no:c.q_no-d.q_no);const a=s.map(d=>{const c=d._given,p=d._correct,r=d.explanation?`
      <tr class="explanation-row hidden" id="pexp-q${d.q_no}">
        <td colspan="5">
          <div class="explanation-content"><span class="explanation-label">\u{1F4A1} Gi\u1EA3i th\xEDch:</span>${escapeHtml(d.explanation)}</div>
        </td>
      </tr>`:"";return`
      <tr>
        <td style="font-weight:700;color:var(--gray-400)">Q${d.q_no}</td>
        <td>${escapeHtml(c)||'<em style="color:var(--gray-400)">B\u1ECF tr\u1ED1ng</em>'}</td>
        <td>${escapeHtml((d.answers||[]).join(" / "))}</td>
        <td class="${p?"result-correct":"result-wrong"}">${p?"\u2713":"\u2717"}</td>
        <td class="result-actions">${d.explanation?`<button class="btn-result-action btn-result-explain" onclick="togglePracticeExp('pexp-q${d.q_no}')">Explain</button>`:""}${d.location?`<button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(d.location)}" data-locate-meta="${escapeAttrJson(d.location_meta)}" onclick="locatePracticeText(this.dataset.locate, this.dataset.locateMeta)">Locate</button>`:""}</td>
      </tr>${r}`}).join(""),o=t.correct_count,l=t.total_count||e.length;$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('${_practiceData?.backHref||`/result/${t.assignment_id||""}`}')">${_practiceData?.backLabel||"\u2190 K\u1EBFt qu\u1EA3 ch\xEDnh"}</button>
        <div class="assignment-toolbar-title">K\u1EBFt qu\u1EA3 luy\u1EC7n t\u1EADp</div>
        <button class="btn btn-outline btn-sm" onclick="renderPractice()">\u{1F504} L\xE0m l\u1EA1i</button>
      </div>
      <div style="background:#fef3c7;border-bottom:1px solid #fbbf24;padding:8px 16px;font-size:12px;color:#92400e">
        \u{1F504} Ch\u1EBF \u0111\u1ED9 luy\u1EC7n t\u1EADp \u2014 kh\xF4ng ghi \u0111i\u1EC3m ch\xEDnh th\u1EE9c
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="practice-content-pane">
          ${_practiceData?.assignment?.skill==="listening"?renderListeningAudioHtml(_practiceData.assignment):""}
          <div class="reading-text" id="practice-reading-text">${renderQuestionContentHTML(_practiceData?.assignment?.content_blocks,_practiceData?.assignment?.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="result-header" style="margin-bottom:16px">
            <div class="score-display" style="margin-top:0">
              <div class="score-number">${o}</div>
              <div class="score-band">/ ${l} \u0111\xFAng</div>
            </div>
            <div class="result-stats">
              <div class="stat-item"><div class="stat-value" style="color:var(--success)">${o}</div><div class="stat-label">\u0110\xFAng</div></div>
              <div class="stat-item"><div class="stat-value" style="color:var(--danger)">${l-o}</div><div class="stat-label">Sai</div></div>
            </div>
          </div>
          <div class="section-label">Chi ti\u1EBFt \u0111\xE1p \xE1n</div>
          <div class="result-answers">
            <table class="result-table">
              <thead><tr>
                <th class="sortable" onclick="sortPracticeResult('q_no')">C\xE2u ${makeSortIcon("q_no",_practiceResultSortCol,_practiceResultSortDir)}</th>
                <th>B\u1EA1n tr\u1EA3 l\u1EDDi</th><th>\u0110\xE1p \xE1n \u0111\xFAng</th>
                <th class="sortable" onclick="sortPracticeResult('result')">K\u1EBFt qu\u1EA3 ${makeSortIcon("result",_practiceResultSortCol,_practiceResultSortDir)}</th>
                <th></th>
              </tr></thead>
              <tbody>${a}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`}function togglePracticeExp(t){const e=document.getElementById(t);e&&e.classList.toggle("hidden")}function sortPracticeResult(t){_practiceResultSortCol===t?_practiceResultSortDir=_practiceResultSortDir==="asc"?"desc":"asc":(_practiceResultSortCol=t,_practiceResultSortDir="asc");const e=_practiceResultData;e&&renderPracticeResult(e.result,e.questionsToShow,e.answers)}window.sortPracticeResult=sortPracticeResult;function locatePracticeText(t,e=""){if(!t)return;const n=document.getElementById("practice-reading-text");if(!n){locateInText(t,e);return}if(locateByMeta(n,e))return;const i=document.createTreeWalker(n,NodeFilter.SHOW_TEXT,null);let s;for(;s=i.nextNode();){const a=s.textContent.toLowerCase().indexOf(t.toLowerCase());if(a<0)continue;const o=document.createRange();o.setStart(s,a),o.setEnd(s,a+t.length);const l=document.createElement("mark");l.className="locate-flash";try{o.surroundContents(l)}catch{continue}l.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const d=l.parentNode;if(d){const c=document.createTextNode(l.textContent);d.replaceChild(c,l)}},2e3);return}toast("Kh\xF4ng t\xECm th\u1EA5y \u0111o\u1EA1n tham chi\u1EBFu.","warning")}window.locatePracticeText=locatePracticeText;let _sharedCtx=null,_sharedCountdownInterval=null,_sharedSecsLeft=0,_speakingIsShared=!1,_sharedSkillFilter="all",_sharedSearchQuery="";async function showSharedPool(){setLoading("\u0110ang t\u1EA3i kho \u0111\u1EC1 luy\u1EC7n t\u1EADp...");const t=routeToken();try{const e=await api.get("/student/shared-pool");if(routeChanged(t))return;_renderSharedPoolList(e)}catch(e){if(routeChanged(t))return;toast("L\u1ED7i t\u1EA3i kho \u0111\u1EC1: "+(e.error||e.message),"error"),navigate("/home")}}function _renderSharedPoolList(t){_sharedSearchQuery="";const e=["all","reading","listening","writing","speaking"],n={all:"T\u1EA5t c\u1EA3",reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking"},i=t.filter(o=>{const l=_sharedSkillFilter==="all"||o.skill===_sharedSkillFilter,d=!_sharedSearchQuery||o.title.toLowerCase().includes(_sharedSearchQuery)||(o.tags||[]).some(c=>c.toLowerCase().includes(_sharedSearchQuery));return l&&d}),s=e.map(o=>`
    <button class="tab-btn${_sharedSkillFilter===o?" active":""}" onclick="setSharedSkillFilter('${o}',${JSON.stringify(t)})">${n[o]}</button>
  `).join(""),a=i.length===0?`<div class="empty-hint">Kh\xF4ng c\xF3 \u0111\u1EC1 n\xE0o${_sharedSkillFilter!=="all"?" cho k\u1EF9 n\u0103ng n\xE0y":""}.</div>`:i.map(o=>{const l=(o.tags||[]).map(p=>`<span class="tag-chip">${escapeHtml(p)}</span>`).join(""),d=o.real_test_count>0&&o.best_score!=null,c=o.real_test_count>0?`<div class="shared-card-stats">
               <span>\u{1F3AF} ${o.real_test_count} l\u1EA7n thi</span>
               ${d?`<span>\u{1F3C6} Best: ${o.best_score}</span>`:""}
             </div>`:'<div class="shared-card-stats" style="color:var(--gray-400)">Ch\u01B0a thi l\u1EA7n n\xE0o</div>';return`
        <div class="shared-card" onclick="navigate('/shared-pool/${o.id}')">
          <div class="shared-card-top">
            ${skillBadge(o.skill)}
            ${o.time_limit_minutes?`<span class="shared-card-timer">\u23F1 ${o.time_limit_minutes} ph\xFAt</span>`:""}
          </div>
          <div class="shared-card-title">${escapeHtml(o.title)}</div>
          ${l?`<div class="shared-card-tags">${l}</div>`:""}
          ${c}
        </div>`}).join("");$("#app").innerHTML=`
    <div class="container">
      <div class="page-header">
        <h2>\u{1F3AF} Kho \u0111\u1EC1 luy\u1EC7n t\u1EADp</h2>
      </div>
      <div class="shared-pool-toolbar">
        <div class="tab-row">${s}</div>
        <input class="form-input shared-pool-search" id="shared-pool-search" type="search"
          placeholder="T\xECm ki\u1EBFm t\xEAn, tag..."
          oninput="filterSharedPool(${JSON.stringify(t)})" />
      </div>
      <div class="shared-pool-grid" id="shared-pool-grid">${a}</div>
    </div>`}function setSharedSkillFilter(t,e){_sharedSkillFilter=t;const n=$("#shared-pool-search");_sharedSearchQuery=n?n.value.toLowerCase().trim():"",_renderSharedPoolList(e)}function filterSharedPool(t){const e=$("#shared-pool-search");_sharedSearchQuery=e?e.value.toLowerCase().trim():"";const n=["all","reading","listening","writing","speaking"],i={all:"T\u1EA5t c\u1EA3",reading:"Reading",listening:"Listening",writing:"Writing",speaking:"Speaking"},s=t.filter(o=>{const l=_sharedSkillFilter==="all"||o.skill===_sharedSkillFilter,d=!_sharedSearchQuery||o.title.toLowerCase().includes(_sharedSearchQuery)||(o.tags||[]).some(c=>c.toLowerCase().includes(_sharedSearchQuery));return l&&d}),a=$("#shared-pool-grid");if(a){if(s.length===0){a.innerHTML='<div class="empty-hint">Kh\xF4ng t\xECm th\u1EA5y \u0111\u1EC1 n\xE0o.</div>';return}a.innerHTML=s.map(o=>{const l=(o.tags||[]).map(p=>`<span class="tag-chip">${escapeHtml(p)}</span>`).join(""),d=o.real_test_count>0&&o.best_score!=null,c=o.real_test_count>0?`<div class="shared-card-stats"><span>\u{1F3AF} ${o.real_test_count} l\u1EA7n thi</span>${d?`<span>\u{1F3C6} Best: ${o.best_score}</span>`:""}</div>`:'<div class="shared-card-stats" style="color:var(--gray-400)">Ch\u01B0a thi l\u1EA7n n\xE0o</div>';return`
    <div class="shared-card" onclick="navigate('/shared-pool/${o.id}')">
      <div class="shared-card-top">${skillBadge(o.skill)}${o.time_limit_minutes?`<span class="shared-card-timer">\u23F1 ${o.time_limit_minutes} ph\xFAt</span>`:""}</div>
      <div class="shared-card-title">${escapeHtml(o.title)}</div>
      ${l?`<div class="shared-card-tags">${l}</div>`:""}
      ${c}
    </div>`}).join("")}}window.setSharedSkillFilter=setSharedSkillFilter,window.filterSharedPool=filterSharedPool;async function showSharedQuestion({id:t}){setLoading("\u0110ang t\u1EA3i \u0111\u1EC1...");const e=routeToken();try{const[n,i]=await Promise.all([api.get(`/student/shared-pool/${t}`),api.get(`/student/shared-pool/${t}/attempts`)]);if(routeChanged(e))return;_renderSharedDetail(n,i)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i \u0111\u1EC1: "+(n.error||n.message),"error"),navigate("/shared-pool")}}function _renderSharedDetail(t,e){const n=(t.tags||[]).map(l=>`<span class="tag-chip">${escapeHtml(l)}</span>`).join(""),i=e.filter(l=>l.mode==="real_test"),s=!!t.time_limit_minutes,a=e.length===0?'<div class="empty-hint" style="padding:12px 0">Ch\u01B0a c\xF3 l\u1EA7n th\u1EED n\xE0o.</div>':e.slice(0,5).map(l=>`
        <div class="shared-history-row" onclick="navigate('/shared-attempt/${l.id}')">
          <span class="shared-history-mode">${l.mode==="real_test"?"\u{1F3AF} Thi th\u1EADt":"\u{1F4DD} Luy\u1EC7n t\u1EADp"}</span>
          <span class="shared-history-score">${l.overall_score!=null?l.overall_score:l.has_feedback?"\u0110\xE3 ch\u1EA5m AI":"\u23F3"}</span>
          <span class="shared-history-date">${formatDateTime(l.submitted_at)}</span>
        </div>`).join(""),o=e.length>5?`<button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="showSharedAllHistory('${t.id}')">Xem t\u1EA5t c\u1EA3 (${e.length})</button>`:"";$("#app").innerHTML=`
    <div class="container">
      <button class="btn-back" onclick="navigate('/shared-pool')">\u2190 Kho \u0111\u1EC1</button>
      <div class="shared-detail-header">
        <div class="shared-detail-badges">
          ${skillBadge(t.skill)}
          ${t.time_limit_minutes?`<span class="shared-card-timer">\u23F1 ${t.time_limit_minutes} ph\xFAt</span>`:'<span class="tag-chip" style="background:var(--gray-100);color:var(--gray-500)">Kh\xF4ng gi\u1EDBi h\u1EA1n th\u1EDDi gian</span>'}
        </div>
        <h2 class="shared-detail-title">${escapeHtml(t.title)}</h2>
        ${n?`<div class="shared-card-tags">${n}</div>`:""}
      </div>

      <div class="shared-mode-cards">
        <div class="shared-mode-card shared-mode-practice" onclick="startSharedAttempt('${t.id}', 'practice')">
          <div class="shared-mode-icon">\u{1F4DD}</div>
          <div class="shared-mode-title">Luy\u1EC7n t\u1EADp</div>
          <div class="shared-mode-desc">T\u1EF1 do \xB7 Audio nghe tho\u1EA3i m\xE1i \xB7 Xem \u0111i\u1EC3m ngay \xB7 Kh\xF4ng ghi v\xE0o h\u1ED3 s\u01A1</div>
        </div>
        ${s?`
        <div class="shared-mode-card shared-mode-real" onclick="startSharedAttempt('${t.id}', 'real_test')">
          <div class="shared-mode-icon">\u{1F3AF}</div>
          <div class="shared-mode-title">Thi th\u1EADt</div>
          <div class="shared-mode-desc">\u0110\u1EBFm ng\u01B0\u1EE3c ${t.time_limit_minutes} ph\xFAt \xB7 Audio kh\xF3a \xB7 K\u1EBFt qu\u1EA3 ghi v\xE0o h\u1ED3 s\u01A1</div>
        </div>`:""}
      </div>

      <div class="shared-history-section">
        <div class="section-label">\u{1F4CB} L\u1ECBch s\u1EED l\xE0m b\xE0i</div>
        ${a}
        ${o}
      </div>
    </div>`}async function showSharedAllHistory(t){try{const e=await api.get(`/student/shared-pool/${t}/attempts`),n=e.length===0?'<div style="color:var(--gray-400);padding:16px 0">Ch\u01B0a c\xF3 l\u1EA7n th\u1EED n\xE0o.</div>':e.map(i=>`
          <div class="shared-history-row" style="cursor:pointer" onclick="closeModal();navigate('/shared-attempt/${i.id}')">
            <span class="shared-history-mode">${i.mode==="real_test"?"\u{1F3AF} Thi th\u1EADt":"\u{1F4DD} Luy\u1EC7n t\u1EADp"}</span>
            <span class="shared-history-score">${i.overall_score!=null?i.overall_score:i.has_feedback?"\u0110\xE3 ch\u1EA5m AI":"\u23F3"}</span>
            <span class="shared-history-date">${formatDateTime(i.submitted_at)}</span>
          </div>`).join("");openModal("L\u1ECBch s\u1EED l\xE0m b\xE0i",`<div class="shared-history-modal">${n}</div>`)}catch(e){toast("L\u1ED7i t\u1EA3i l\u1ECBch s\u1EED: "+(e.error||e.message),"error")}}window.showSharedAllHistory=showSharedAllHistory;async function startSharedAttempt(t,e){setLoading("\u0110ang t\u1EA3i \u0111\u1EC1...");try{const n=await api.get(`/student/shared-pool/${t}`);_sharedCtx={poolId:t,poolQ:n,mode:e,idempotencyKey:crypto.randomUUID()},_speakingIsShared=n.skill==="speaking",stopSharedCountdownTimer(),_removeExamBeforeUnload();let i=null;if(e==="real_test"&&n.time_limit_minutes)try{const s=await api.post("/exam-sessions",{ref_type:"shared_pool",ref_id:t}),a=(Date.now()-new Date(s.started_at).getTime())/1e3;i=Math.max(0,n.time_limit_minutes*60-a)}catch{i=n.time_limit_minutes*60}n.skill==="reading"?renderSharedReading(n,e):n.skill==="listening"?renderSharedListening(n,e):n.skill==="writing"?renderSharedWriting(n,e):n.skill==="speaking"?renderSharedSpeaking(n,e):(toast("K\u1EF9 n\u0103ng kh\xF4ng h\u1EE3p l\u1EC7","error"),navigate("/shared-pool")),e==="real_test"&&n.time_limit_minutes&&(_installExamBeforeUnload(),i<=0?autoSubmitSharedAttempt():startSharedCountdownTimer(i))}catch(n){toast("L\u1ED7i t\u1EA3i \u0111\u1EC1: "+(n.error||n.message),"error"),navigate(`/shared-pool/${t}`)}}window.startSharedAttempt=startSharedAttempt;let _sharedDeadlineTs=0;function startSharedCountdownTimer(t){stopSharedCountdownTimer(),_sharedDeadlineTs=Date.now()+Math.floor(t)*1e3,_sharedSecsLeft=Math.floor(t),_updateSharedTimerDisplay(),_sharedCountdownInterval=setInterval(()=>{_sharedSecsLeft=Math.max(0,Math.round((_sharedDeadlineTs-Date.now())/1e3)),_updateSharedTimerDisplay(),_sharedSecsLeft<=0&&(stopSharedCountdownTimer(),autoSubmitSharedAttempt())},1e3)}function stopSharedCountdownTimer(){_sharedCountdownInterval&&(clearInterval(_sharedCountdownInterval),_sharedCountdownInterval=null)}function _updateSharedTimerDisplay(){const t=$("#shared-countdown");if(!t)return;const e=Math.floor(_sharedSecsLeft/60),n=_sharedSecsLeft%60,i=`${String(e).padStart(2,"0")}:${String(n).padStart(2,"0")}`;t.textContent=i,t.classList.toggle("timer-urgent",_sharedSecsLeft<=60)}function _sharedTimerHtml(t,e){return t!=="real_test"||!e?"":'<div class="shared-timer-wrap"><span class="shared-timer-label">\u23F1</span><span class="shared-countdown" id="shared-countdown">--:--</span></div>'}function renderSharedReading(t,e){_flaggedSet=new Set;const n=t.questions_data||[],i=n.length;let s="";for(const o of n)s+=`
      <div class="answer-row">
        <span class="q-label">Q${o.q_no}</span>
        <input class="answer-input" id="ans-${o.q_no}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${o.q_no}"
          oninput="updateNavigatorState()" />
        <button class="q-flag-btn" data-flag-q="${o.q_no}" onclick="toggleFlag(${o.q_no})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`;const a=e==="practice"?'<div class="shared-practice-banner">\u{1F4DD} Luy\u1EC7n t\u1EADp \u2014 k\u1EBFt qu\u1EA3 kh\xF4ng ghi v\xE0o h\u1ED3 s\u01A1</div>':'<div class="shared-realtest-banner">\u{1F3AF} Thi th\u1EADt \u2014 Th\u1EDDi gian c\xF3 h\u1EA1n, kh\xF4ng \u0111\u01B0\u1EE3c d\u1EEBng</div>';$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="confirmLeaveShared()">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${_sharedTimerHtml(e,t.time_limit_minutes)}
        <button class="btn btn-primary btn-sm" id="submit-btn" onclick="submitSharedReadingListening(this)">N\u1ED9p b\xE0i</button>
      </div>
      ${a}
      <div class="assignment-content">
        <div class="content-pane">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">B\xE0i \u0111\u1ECDc &amp; C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(i,t.id)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${i===0?'<div style="color:var(--gray-400);font-size:13px">B\xE0i kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${s}</div>`}
        </div>
      </div>
    </div>`,bindReadingTextInteractions(),updateNavigatorState(),e==="real_test"&&t.time_limit_minutes&&_updateSharedTimerDisplay()}function renderSharedListening(t,e){_flaggedSet=new Set;const n=t.questions_data||[],i=n.length;let s="";for(const l of n)s+=`
      <div class="answer-row">
        <span class="q-label">Q${l.q_no}</span>
        <input class="answer-input" id="ans-${l.q_no}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${l.q_no}"
          oninput="updateNavigatorState()" />
        <button class="q-flag-btn" data-flag-q="${l.q_no}" onclick="toggleFlag(${l.q_no})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`;const a=e==="practice"?renderListeningAudioHtml(t):renderLockedListeningAudioHtml(t),o=e==="practice"?'<div class="shared-practice-banner">\u{1F4DD} Luy\u1EC7n t\u1EADp \u2014 k\u1EBFt qu\u1EA3 kh\xF4ng ghi v\xE0o h\u1ED3 s\u01A1</div>':'<div class="shared-realtest-banner">\u{1F3AF} Thi th\u1EADt \u2014 Th\u1EDDi gian c\xF3 h\u1EA1n, kh\xF4ng \u0111\u01B0\u1EE3c d\u1EEBng</div>';$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="confirmLeaveShared()">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${_sharedTimerHtml(e,t.time_limit_minutes)}
        <button class="btn btn-primary btn-sm" id="submit-btn" onclick="submitSharedReadingListening(this)">N\u1ED9p b\xE0i</button>
      </div>
      ${o}
      <div class="assignment-content">
        <div class="content-pane">
          ${a}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(i,t.id)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${i===0?'<div style="color:var(--gray-400);font-size:13px">B\xE0i kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${s}</div>`}
        </div>
      </div>
    </div>`,e!=="practice"&&setupLockedListeningAudio(),bindReadingTextInteractions(),updateNavigatorState(),e==="real_test"&&t.time_limit_minutes&&_updateSharedTimerDisplay()}function renderSharedWriting(t,e){const n=e==="practice"?'<div class="shared-practice-banner">\u{1F4DD} Luy\u1EC7n t\u1EADp \u2014 k\u1EBFt qu\u1EA3 kh\xF4ng ghi v\xE0o h\u1ED3 s\u01A1</div>':'<div class="shared-realtest-banner">\u{1F3AF} Thi th\u1EADt \u2014 Th\u1EDDi gian c\xF3 h\u1EA1n, kh\xF4ng \u0111\u01B0\u1EE3c d\u1EEBng</div>';$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="confirmLeaveShared()">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${_sharedTimerHtml(e,t.time_limit_minutes)}
        <button class="btn btn-primary btn-sm" id="submit-btn" onclick="submitSharedWriting(this)">N\u1ED9p b\xE0i</button>
      </div>
      ${n}
      <div class="assignment-content">
        <div class="content-pane">
          <div class="section-title">\u0110\u1EC1 b\xE0i</div>
          <div class="writing-prompt-body">${renderQuestionContentHTML(t.content_blocks,t.content_text||"Kh\xF4ng c\xF3 \u0111\u1EC1 b\xE0i.")}</div>
        </div>
        <div class="answer-pane writing-answer-pane">
          <div class="section-title">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
          <textarea id="writing-answer" class="writing-textarea"
            placeholder="Vi\u1EBFt b\xE0i c\u1EE7a b\u1EA1n v\xE0o \u0111\xE2y..."
            oninput="updateWordCount(this)"></textarea>
          <div id="word-count" class="word-count word-count-extended">
            <span data-stat="words">0 t\u1EEB</span>
            <span data-stat="chars">0 k\xFD t\u1EF1</span>
            <span data-stat="sentences">0 c\xE2u</span>
            <span data-stat="paragraphs">0 \u0111o\u1EA1n</span>
          </div>
          <div class="form-hint">Task 1: ~150 t\u1EEB \u2014 Task 2: ~250 t\u1EEB</div>
        </div>
      </div>
    </div>`,e==="real_test"&&t.time_limit_minutes&&_updateSharedTimerDisplay()}function renderSharedSpeaking(t,e){_speakingSlots=[_newSpeakingSlot()],_speakingRecordIdx=-1,_speakingAssignId=t.id,_speakingIsShared=!0,_mediaRecorder=null,_audioChunks=[],_recordedBlob=null,_uploadedFile=null;const n=e==="practice"?'<div class="shared-practice-banner">\u{1F4DD} Luy\u1EC7n t\u1EADp \u2014 k\u1EBFt qu\u1EA3 kh\xF4ng ghi v\xE0o h\u1ED3 s\u01A1</div>':'<div class="shared-realtest-banner">\u{1F3AF} Thi th\u1EADt \u2014 Th\u1EDDi gian c\xF3 h\u1EA1n, kh\xF4ng \u0111\u01B0\u1EE3c d\u1EEBng</div>';$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="confirmLeaveShared()">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title)}</div>
        ${_sharedTimerHtml(e,t.time_limit_minutes)}
        <button class="btn btn-primary btn-sm" id="submit-btn" onclick="submitSharedSpeaking(this)" disabled>N\u1ED9p b\xE0i</button>
      </div>
      ${n}
      <div class="assignment-content single-col">
        <div class="content-pane">
          <div class="section-title">C\xE2u h\u1ECFi / Cue Card</div>
          <div class="cue-card">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="section-title">B\xE0i n\xF3i c\u1EE7a b\u1EA1n</div>
          <div id="recording-indicator" style="display:none;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:10px">
            <canvas id="waveform-canvas" class="waveform-canvas" width="600" height="60"></canvas>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
              <div id="record-timer" class="record-timer" style="font-size:18px">0:00</div>
              <button class="record-btn recording-active" style="padding:6px 18px;font-size:13px" onclick="stopSlotRecording()">\u23F9 D\u1EEBng thu \xE2m</button>
            </div>
          </div>
          <div id="speaking-slot-list"></div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addSpeakingSlot()">+ Th\xEAm ph\u1EA7n</button>
          <div id="audio-submit-status" class="audio-submit-status hidden" style="margin-top:12px"></div>
        </div>
      </div>
    </div>`,_renderSpeakingSlots(),e==="real_test"&&t.time_limit_minutes&&_updateSharedTimerDisplay()}async function confirmLeaveShared(){const t=_sharedCtx;if(!t){navigate("/shared-pool");return}if(await confirmSubmit({title:"Tho\xE1t b\xE0i?",message:"Ti\u1EBFn tr\xECnh l\xE0m b\xE0i s\u1EBD kh\xF4ng \u0111\u01B0\u1EE3c l\u01B0u. B\u1EA1n c\xF3 ch\u1EAFc mu\u1ED1n tho\xE1t?",confirmText:"Tho\xE1t",cancelText:"Ti\u1EBFp t\u1EE5c l\xE0m"})){stopSharedCountdownTimer(),_removeExamBeforeUnload(),_sharedCtx=null,_speakingIsShared=!1;const n=`#/shared-pool/${t.poolId}`;window.location.hash===n?showSharedQuestion({id:t.poolId}):navigate(`/shared-pool/${t.poolId}`)}}window.confirmLeaveShared=confirmLeaveShared;async function autoSubmitSharedAttempt(){const t=_sharedCtx;if(!t)return;const{poolQ:e,mode:n}=t;freezeExamInputs(),toast("\u23F0 H\u1EBFt gi\u1EDD! \u0110ang t\u1EF1 \u0111\u1ED9ng n\u1ED9p b\xE0i...","warning");const i=$("#submit-btn");e.skill==="reading"||e.skill==="listening"?await submitSharedReadingListening(null,!0):e.skill==="writing"?await submitSharedWriting(null,!0):e.skill==="speaking"&&await submitSharedSpeaking(null,!0)}async function submitSharedReadingListening(t,e=!1){const n=_sharedCtx;if(!n)return;const{poolQ:i,poolId:s,mode:a}=n,o=i.questions_data||[],l=o.map(c=>({q_no:c.q_no,answer:($(`#ans-${c.q_no}`)?.value||"").trim()})),d=l.filter(c=>c.answer).length;if(!(!e&&!await confirmSubmit({title:"X\xE1c nh\u1EADn n\u1ED9p b\xE0i",message:`<ul class="submit-confirm-stats">
        <li>\u2705 \u0110\xE3 tr\u1EA3 l\u1EDDi: <b>${d} / ${o.length}</b></li>
        ${d<o.length?`<li>\u274C C\xF2n <b>${o.length-d}</b> c\xE2u ch\u01B0a l\xE0m</li>`:""}
      </ul>
      <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi n\u1ED9p b\u1EA1n kh\xF4ng th\u1EC3 ch\u1EC9nh s\u1EEDa.</div>`}))){t&&btnLoading(t),stopSharedCountdownTimer();try{const c=await api.post(`/student/shared-pool/${s}/attempts`,{mode:a,student_answers:l,idempotency_key:n.idempotencyKey});_sharedCtx=null,toast("N\u1ED9p b\xE0i th\xE0nh c\xF4ng! \u{1F389}"),navigate(`/shared-attempt/${c.id}`)}catch(c){if(t)btnReset(t);else{const p=$("#submit-btn");p&&(p.disabled=!1)}toast("L\u1ED7i n\u1ED9p b\xE0i: "+(c.error||c.message),"error")}}}window.submitSharedReadingListening=submitSharedReadingListening;async function submitSharedWriting(t,e=!1){const n=_sharedCtx;if(!n)return;const{poolQ:i,poolId:s,mode:a}=n,o=($("#writing-answer")?.value||"").trim();if(!e){if(!o){toast("Vui l\xF2ng vi\u1EBFt b\xE0i tr\u01B0\u1EDBc khi n\u1ED9p","error");return}const l=countWords(o);if(!await confirmSubmit({title:"X\xE1c nh\u1EADn n\u1ED9p b\xE0i Writing",message:`<ul class="submit-confirm-stats"><li>\u{1F4DD} S\u1ED1 t\u1EEB: <b>${l}</b>${l<150?' <span style="color:var(--danger)">\u26A0 D\u01B0\u1EDBi m\u1EE9c t\u1ED1i thi\u1EC3u</span>':""}</li></ul>
      <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi n\u1ED9p b\u1EA1n kh\xF4ng th\u1EC3 ch\u1EC9nh s\u1EEDa.</div>`}))return}t&&btnLoading(t),stopSharedCountdownTimer();try{const l=await api.post(`/student/shared-pool/${s}/attempts`,{mode:a,writing_content:o||"",idempotency_key:n.idempotencyKey});_sharedCtx=null,toast("N\u1ED9p b\xE0i th\xE0nh c\xF4ng! \u{1F389}"),navigate(`/shared-attempt/${l.id}`)}catch(l){if(t)btnReset(t);else{const d=$("#submit-btn");d&&(d.disabled=!1)}toast("L\u1ED7i n\u1ED9p b\xE0i: "+(l.error||l.message),"error")}}window.submitSharedWriting=submitSharedWriting;async function submitSharedSpeaking(t,e=!1){const n=_sharedCtx;if(!n)return;const{poolId:i,mode:s}=n,a=_speakingSlots.filter(o=>o.status==="done");if(!e){if(a.length===0){toast("Vui l\xF2ng thu \xE2m ho\u1EB7c upload \xEDt nh\u1EA5t 1 file","error");return}if(!await confirmSubmit({title:"X\xE1c nh\u1EADn n\u1ED9p b\xE0i Speaking",message:`<div>B\u1EA1n \u0111\xE3 s\u1EB5n s\xE0ng n\u1ED9p b\xE0i thu \xE2m?</div>
        <div style="margin-top:8px;color:var(--gray-600);font-size:13px">Sau khi n\u1ED9p b\u1EA1n kh\xF4ng th\u1EC3 thu \xE2m l\u1EA1i.</div>`}))return}t&&btnLoading(t),stopSharedCountdownTimer();try{const o=a.map(d=>({key:d.key,name:d.displayName||d.name}));setSpeakingSubmitStatus("processing");const l=await api.post(`/student/shared-pool/${i}/attempts`,{mode:s,audio_upload_keys:o,idempotency_key:n.idempotencyKey});setSpeakingSubmitStatus(null),_sharedCtx=null,_speakingIsShared=!1,toast("N\u1ED9p b\xE0i th\xE0nh c\xF4ng! \u{1F389}"),navigate(`/shared-attempt/${l.id}`)}catch(o){if(setSpeakingSubmitStatus(null),t)btnReset(t);else{const l=$("#submit-btn");l&&(l.disabled=!1)}toast("L\u1ED7i n\u1ED9p b\xE0i: "+(o.error||o.message),"error")}}window.submitSharedSpeaking=submitSharedSpeaking;let _aiFeedbackPollTimer=null;function _stopAiFeedbackPoll(){_aiFeedbackPollTimer&&(clearInterval(_aiFeedbackPollTimer),_aiFeedbackPollTimer=null)}async function retryAiGrading(t){_stopAiFeedbackPoll(),document.querySelectorAll(".pending-feedback-text").forEach(e=>{e.innerHTML='<div class="spinner" style="width:24px;height:24px;border-width:2px;margin:0 auto 8px"></div><p>\u0110ang ch\u1EA5m AI... (c\xF3 th\u1EC3 m\u1EA5t 30\u201360 gi\xE2y)</p>'}),document.querySelectorAll(".btn-retry-ai").forEach(e=>{e.textContent="\u23F3 \u0110ang ch\u1EA5m AI...",e.disabled=!0});try{const e=await api.post(`/student/shared-attempts/${t}/retry-ai`,{});_renderSharedAttemptResult(e),toast("\u2705 AI \u0111\xE3 ch\u1EA5m xong b\xE0i c\u1EE7a b\u1EA1n!","success")}catch(e){const n=e.error||e.message||"L\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh";document.querySelectorAll(".pending-feedback-text").forEach(i=>{i.innerHTML=`<h4>Kh\xF4ng th\u1EC3 ch\u1EA5m AI</h4><p>${n}</p><button class="btn-primary" onclick="retryAiGrading('${t}')">Th\u1EED l\u1EA1i</button>`}),document.querySelectorAll(".btn-retry-ai").forEach(i=>{i.textContent="\u21BB Ch\u1EA5m l\u1EA1i AI",i.disabled=!1}),toast("L\u1ED7i ch\u1EA5m AI: "+n,"error")}}async function showSharedAttemptResult({id:t}){_stopAiFeedbackPoll(),setLoading("\u0110ang t\u1EA3i k\u1EBFt qu\u1EA3...");const e=routeToken();try{const n=await api.get(`/student/shared-attempts/${t}`);if(routeChanged(e))return;_renderSharedAttemptResult(n);const i=(n.skill==="writing"||n.skill==="speaking")&&!n.ai_feedback;if(i){let s=0;_aiFeedbackPollTimer=setInterval(async()=>{if(s++,s>30){_stopAiFeedbackPoll(),document.querySelectorAll(".pending-feedback-text").forEach(a=>{a.innerHTML=`<h4>AI ch\u01B0a ch\u1EA5m \u0111\u01B0\u1EE3c b\xE0i n\xE0y</h4><p>C\xF3 th\u1EC3 AI b\u1ECB b\u1EADn, h\xE3y th\u1EED l\u1EA1i.</p><button class="btn-primary" onclick="retryAiGrading('${t}')">Ch\u1EA5m l\u1EA1i ngay</button>`});return}try{const a=await api.get(`/student/shared-attempts/${t}`);a.ai_feedback&&(_stopAiFeedbackPoll(),_renderSharedAttemptResult(a),toast("\u2705 AI \u0111\xE3 ch\u1EA5m xong b\xE0i c\u1EE7a b\u1EA1n!","success"))}catch{_stopAiFeedbackPoll()}},4e3)}if(i){const s=n.submitted_at?new Date(n.submitted_at):null;s&&Date.now()-s.getTime()>5*60*1e3&&(_stopAiFeedbackPoll(),document.querySelectorAll(".pending-feedback-text").forEach(a=>{a.innerHTML=`<h4>AI ch\u01B0a ch\u1EA5m \u0111\u01B0\u1EE3c b\xE0i n\xE0y</h4><p>C\xF3 th\u1EC3 b\xE0i n\u1ED9p l\xFAc tr\u01B0\u1EDBc g\u1EB7p s\u1EF1 c\u1ED1. H\xE3y th\u1EED ch\u1EA5m l\u1EA1i.</p><button class="btn-primary" onclick="retryAiGrading('${t}')">Ch\u1EA5m l\u1EA1i ngay</button>`}))}}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i k\u1EBFt qu\u1EA3: "+(n.error||n.message),"error"),navigate("/shared-pool")}}function _renderSharedAttemptResult(t){const e=t.skill;e==="reading"||e==="listening"?_renderSharedGradedResult(t):e==="writing"?_renderSharedWritingResult(t):e==="speaking"&&_renderSharedSpeakingResult(t)}function _renderSharedGradedResult(t){const e=t.questions_data||[],n=t.student_answers||[],i=t.mode==="real_test"?"\u{1F3AF} Thi th\u1EADt":"\u{1F4DD} Luy\u1EC7n t\u1EADp";let s=0;const a=e.some(u=>u.explanation||u.location),o=e.map(u=>{const h=(n.find(S=>S.q_no===u.q_no)?.answer||"").trim(),v=u.answers.some(S=>S.toLowerCase().trim()===h.toLowerCase());v&&s++;const f=u.explanation||u.location?`
      <td class="result-actions">
        ${u.explanation?`<button class="btn-result-action btn-result-explain" onclick="toggleExplanation('exp-q${u.q_no}')">Explain</button>`:""}
        ${u.location?`<button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(u.location)}" data-locate-meta="${escapeAttrJson(u.location_meta)}" onclick="locateInText(this.dataset.locate, this.dataset.locateMeta)">Locate</button>`:""}
      </td>`:a?"<td></td>":"",_=u.explanation?`
      <tr class="explanation-row hidden" id="exp-q${u.q_no}">
        <td colspan="${a?5:4}">
          <div class="explanation-content"><span class="explanation-label">\u{1F4A1} Gi\u1EA3i th\xEDch:</span>${escapeHtml(u.explanation)}</div>
        </td>
      </tr>`:"";return`
      <tr>
        <td style="font-weight:700;color:var(--gray-400)">Q${u.q_no}</td>
        <td>${escapeHtml(h)||'<em style="color:var(--gray-400)">B\u1ECF tr\u1ED1ng</em>'}</td>
        <td>${escapeHtml(u.answers.join(" / "))}</td>
        <td class="${v?"result-correct":"result-wrong"}">${v?"\u2713":"\u2717"}</td>
        ${f}
      </tr>${_}`}).join(""),l=e.length,d=l===40,c=t.overall_score??(l>0?d?Math.round(s/l*9*10)/10:Math.round(s/l*10*10)/10:0),p=l-s,r=t.vocabulary||[],m=r.length===0?"":`
    <div class="section-label" style="margin-top:20px">\u{1F4DA} T\u1EEB v\u1EF1ng trong b\xE0i</div>
    <div class="vocab-result-list">
      ${r.map((u,g)=>{const h=isWordSaved(u.word);return`
        <div class="vocab-result-item">
          <div class="vocab-result-header" onclick="toggleVocabItem(${g})">
            <span class="vocab-result-word">${escapeHtml(u.word)}</span>
            <span class="vocab-result-toggle" id="vocab-toggle-${g}">\u25B6</span>
            <button class="btn-result-action btn-result-locate" data-locate="${escapeHtml(u.word)}" onclick="event.stopPropagation();locateInText(this.dataset.locate)">Locate</button>
            <button class="btn-save-word ${h?"saved":""}"
              data-word="${escapeHtml(u.word)}"
              data-def="${escapeHtml(u.definition)}"
              data-pron="${escapeHtml(u.pronunciation||"")}"
              data-ex="${escapeHtml(u.example||"")}"
              data-src="${escapeHtml(t.title||"")}"
              onclick="event.stopPropagation();toggleSaveWordBtn(this)"
            >${h?"\u2713 \u0110\xE3 l\u01B0u":"\u{1F4BE} L\u01B0u"}</button>
          </div>
          <div class="vocab-result-detail hidden" id="vocab-detail-${g}">
            <div class="vocab-result-def">${escapeHtml(u.definition)}</div>
            ${u.pronunciation?`<div class="vocab-result-pronunciation">${escapeHtml(u.pronunciation)}</div>`:""}
            ${u.collocation?`<div class="vocab-result-collocation">Collocation: ${escapeHtml(u.collocation)}</div>`:""}
            ${u.example?`<div class="vocab-result-example">"${escapeHtml(u.example)}"</div>`:""}
          </div>
        </div>`}).join("")}
    </div>`;$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/shared-pool/${t.shared_pool_id}')">\u2190 Kho \u0111\u1EC1</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title||"")}
          <span style="font-size:11px;color:var(--gray-400);font-weight:400">${i}</span>
        </div>
      </div>
      <div class="assignment-content">
        <div class="content-pane" id="result-content-pane">
          ${t.skill==="listening"?renderListeningAudioHtml(t):""}
          ${t.skill==="listening"&&t.script?`
            <div class="script-section" id="listening-script-section">
              <button class="script-toggle" onclick="toggleListeningScript()">
                <span id="script-toggle-icon">\u25B6</span> Script Listening
              </button>
              <div class="script-body hidden" id="listening-script-body">
                <div id="listening-script-text">${escapeHtml(t.script)}</div>
              </div>
            </div>`:""}
          <div class="section-title">${t.skill==="listening"?"C\xE2u h\u1ECFi":"B\xE0i \u0111\u1ECDc & C\xE2u h\u1ECFi"}</div>
          <div class="reading-text" id="result-reading-text">${renderQuestionContentHTML(t.content_blocks,t.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="result-header" style="margin-bottom:16px">
            <div class="score-display" style="margin-top:0">
              <div class="score-number">${c}</div>
              <div class="score-band">${d?"Band Score / 9.0":"\u0110i\u1EC3m / 10"}</div>
            </div>
            <div class="result-stats">
              <div class="stat-item"><div class="stat-value" style="color:var(--success)">${s}</div><div class="stat-label">\u0110\xFAng</div></div>
              <div class="stat-item"><div class="stat-value" style="color:var(--danger)">${p}</div><div class="stat-label">Sai</div></div>
              <div class="stat-item"><div class="stat-value">${l}</div><div class="stat-label">T\u1ED5ng s\u1ED1</div></div>
            </div>
          </div>
          ${p>0?`
          <div style="margin-bottom:16px">
            <button class="btn-practice btn-practice-wrong" style="width:100%;justify-content:center"
              onclick="navigate('/shared-practice/${t.shared_pool_id}?attempt_id=${t.id}')">
              \u{1F4DD} L\xE0m l\u1EA1i c\xE2u sai (${p} c\xE2u)
            </button>
          </div>`:""}
          <div class="section-label">Chi ti\u1EBFt \u0111\xE1p \xE1n</div>
          <div class="result-answers">
            <table class="result-table">
              <thead><tr><th>C\xE2u</th><th>B\u1EA1n tr\u1EA3 l\u1EDDi</th><th>\u0110\xE1p \xE1n \u0111\xFAng</th><th>K\u1EBFt qu\u1EA3</th>${a?"<th></th>":""}</tr></thead>
              <tbody>${o||`<tr><td colspan="${a?5:4}" style="text-align:center;padding:20px;color:var(--gray-400)">Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u</td></tr>`}</tbody>
            </table>
          </div>
          ${m}
        </div>
      </div>
    </div>`,bindReadingTextInteractions("result-reading-text")}function _renderSharedWritingResult(t){const e=t.ai_feedback,n=t.mode==="real_test"?"\u{1F3AF} Thi th\u1EADt":"\u{1F4DD} Luy\u1EC7n t\u1EADp",i=countWords(t.writing_content||"");if(!e){$("#app").innerHTML=`
      <div class="container">
        <button class="btn-back" onclick="navigate('/shared-pool/${t.shared_pool_id}')">\u2190 Kho \u0111\u1EC1</button>
        <div class="result-header">
          <div>${skillBadge(t.skill)} <span style="font-size:12px;color:var(--gray-400)">${n}</span></div>
          <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${escapeHtml(t.title||"")}</div>
          <div style="margin-top:16px"><div style="font-size:32px">\u270D\uFE0F</div>
            <div style="font-weight:700;font-size:15px;margin-top:8px">\u0110\xE3 n\u1ED9p b\xE0i</div>
            <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${i} t\u1EEB</div>
          </div>
        </div>
        <div class="pending-feedback">
          <div class="pending-feedback-icon"><span class="spinner" style="width:28px;height:28px;border-width:3px;display:inline-block"></span></div>
          <div class="pending-feedback-text"><h4>\u0110ang ch\u1EA5m AI...</h4><p>Trang s\u1EBD t\u1EF1 c\u1EADp nh\u1EADt khi c\xF3 k\u1EBFt qu\u1EA3.</p></div>
        </div>
        <div class="section-label">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
        <div class="submitted-content">${escapeHtml(t.writing_content||"")}</div>
      </div>`;return}if(!e.overall_score&&!e.tr_score&&!e.lr_score){$("#app").innerHTML=`
      <div class="container">
        <button class="btn-back" onclick="navigate('/shared-pool/${t.shared_pool_id}')">\u2190 Kho \u0111\u1EC1</button>
        <div class="pending-feedback" style="margin-top:32px">
          <div class="pending-feedback-icon">\u26A0\uFE0F</div>
          <div class="pending-feedback-text">
            <h4>AI ch\u01B0a ch\u1EA5m \u0111\u01B0\u1EE3c b\xE0i n\xE0y</h4>
            <p>K\u1EBFt qu\u1EA3 tr\u1EA3 v\u1EC1 tr\u1ED1ng. H\xE3y th\u1EED ch\u1EA5m l\u1EA1i.</p>
            <button class="btn-primary" onclick="retryAiGrading('${t.id}')">Ch\u1EA5m l\u1EA1i AI</button>
          </div>
        </div>
        <div class="section-label" style="margin-top:24px">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
        <div class="submitted-content">${escapeHtml(t.writing_content||"")}</div>
      </div>`;return}const a=e.overall_score??t.overall_score,o=[renderAiCriterionCard("\u{1F4DD}","Task Response / Task Achievement",e.tr_score,e.tr),renderAiCriterionCard("\u{1F517}","Coherence and Cohesion",e.cc_score,e.cc),renderAiCriterionCard("\u{1F4DA}","Lexical Resource",e.lr_score,e.lr),renderAiCriterionCard("\u{1F4D0}","Grammatical Range and Accuracy",e.gra_score,e.gra)].join(""),l=bandColor(a);$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/shared-pool/${t.shared_pool_id}')">\u2190 Kho \u0111\u1EC1</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title||"")} <small style="color:var(--gray-400)">${n}</small></div>
        <div class="score-chip" style="--chip-color:${l}"><span class="score-chip-val">${a??"\u2014"}</span><span class="score-chip-label">/9.0</span></div>
      </div>
      <div class="assignment-content">
        <div class="content-pane">
          <div class="section-label">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
          <div class="submitted-content">${escapeHtml(t.writing_content||"")}</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:8px;text-align:right">${i} t\u1EEB</div>
        </div>
        <div class="answer-pane">
          <div class="ai-overall-card" style="--chip-color:${l}">
            <div class="ai-overall-head">
              <span class="ai-overall-label">Overall</span>
              <span class="ai-band-chip" style="--chip-color:${l}">${a??"\u2014"}/9</span>
            </div>
            ${e.overall_comment?`<div class="ai-overall-comment">${renderSafeMarkdown(e.overall_comment)}</div>`:""}
          </div>
          ${o}
          <button class="btn-retry-ai" onclick="retryAiGrading('${t.id}')">\u21BB Ch\u1EA5m l\u1EA1i AI</button>
        </div>
      </div>
    </div>`}function _renderSharedSpeakingResult(t){const e=t.ai_feedback,n=t.mode==="real_test"?"\u{1F3AF} Thi th\u1EADt":"\u{1F4DD} Luy\u1EC7n t\u1EADp",i=t.speaking_audio_urls||[],s=i.map((d,c)=>`
    <div style="margin-bottom:8px">
      ${i.length>1?`<div style="font-size:12px;color:var(--gray-400);margin-bottom:4px">${escapeHtml(d.name||"Ph\u1EA7n "+(c+1))}</div>`:""}
      <audio controls src="${escapeHtml(d.url||"")}" style="width:100%;height:36px"></audio>
    </div>`).join("");if(!e){$("#app").innerHTML=`
      <div class="container">
        <button class="btn-back" onclick="navigate('/shared-pool/${t.shared_pool_id}')">\u2190 Kho \u0111\u1EC1</button>
        <div class="result-header">
          <div>${skillBadge(t.skill)} <span style="font-size:12px;color:var(--gray-400)">${n}</span></div>
          <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${escapeHtml(t.title||"")}</div>
          <div style="margin-top:16px"><div style="font-size:32px">\u{1F3A4}</div>
            <div style="font-weight:700;font-size:15px;margin-top:8px">\u0110\xE3 n\u1ED9p b\xE0i</div>
          </div>
        </div>
        <div class="pending-feedback">
          <div class="pending-feedback-icon"><span class="spinner" style="width:28px;height:28px;border-width:3px;display:inline-block"></span></div>
          <div class="pending-feedback-text"><h4>\u0110ang ch\u1EA5m AI...</h4><p>Trang s\u1EBD t\u1EF1 c\u1EADp nh\u1EADt khi c\xF3 k\u1EBFt qu\u1EA3.</p></div>
        </div>
        ${s?`<div class="section-label">B\xE0i thu \xE2m c\u1EE7a b\u1EA1n</div><div class="submitted-content" style="padding:16px">${s}</div>`:""}
      </div>`;return}if(!e.overall_score&&!e.lr_score&&!e.gra_score){$("#app").innerHTML=`
      <div class="container">
        <button class="btn-back" onclick="navigate('/shared-pool/${t.shared_pool_id}')">\u2190 Kho \u0111\u1EC1</button>
        <div class="pending-feedback" style="margin-top:32px">
          <div class="pending-feedback-icon">\u26A0\uFE0F</div>
          <div class="pending-feedback-text">
            <h4>AI ch\u01B0a ch\u1EA5m \u0111\u01B0\u1EE3c b\xE0i n\xE0y</h4>
            <p>K\u1EBFt qu\u1EA3 tr\u1EA3 v\u1EC1 tr\u1ED1ng. H\xE3y th\u1EED ch\u1EA5m l\u1EA1i.</p>
            <button class="btn-primary" onclick="retryAiGrading('${t.id}')">Ch\u1EA5m l\u1EA1i AI</button>
          </div>
        </div>
        ${s?`<div class="section-label" style="margin-top:24px">B\xE0i thu \xE2m</div><div class="submitted-content" style="padding:16px">${s}</div>`:""}
      </div>`;return}const o=e.overall_score??t.overall_score,l=bandColor(o);$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/shared-pool/${t.shared_pool_id}')">\u2190 Kho \u0111\u1EC1</button>
        <div class="assignment-toolbar-title">${skillBadge(t.skill)} ${escapeHtml(t.title||"")} <small style="color:var(--gray-400)">${n}</small></div>
        <div class="score-chip" style="--chip-color:${l}"><span class="score-chip-val">${o??"\u2014"}</span><span class="score-chip-label">/9.0</span></div>
      </div>
      <div class="assignment-content">
        <div class="content-pane">
          ${s?`<div class="section-label">B\xE0i thu \xE2m c\u1EE7a b\u1EA1n</div><div style="margin-bottom:16px">${s}</div>`:""}
          <div class="section-label">Transcript (AI Generated)</div>
          <div class="submitted-content">${escapeHtml(t.speaking_script||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="ai-overall-card" style="--chip-color:${l}">
            <div class="ai-overall-head">
              <span class="ai-overall-label">Overall (\u01B0\u1EDBc t\xEDnh)</span>
              <span class="ai-band-chip" style="--chip-color:${l}">${o??"\u2014"}/9</span>
            </div>
            ${e.overall_comment?`<div class="ai-overall-comment">${renderSafeMarkdown(e.overall_comment)}</div>`:""}
            <div class="ai-overall-note">\u26A0\uFE0F \u01AF\u1EDBc t\xEDnh d\u1EF1a tr\xEAn T\u1EEB v\u1EF1ng v\xE0 Ng\u1EEF ph\xE1p t\u1EEB transcript. Ch\u01B0a t\xEDnh Fluency v\xE0 Ph\xE1t \xE2m.</div>
          </div>
          ${renderAiCriterionCard("\u{1F4DA}","Lexical Resource",e.lr_score,e.lr)}
          ${renderAiCriterionCard("\u{1F4D0}","Grammatical Range and Accuracy",e.gra_score,e.gra)}
          ${e.fc_advice?renderAiAdviceCard("\u{1F5E3}\uFE0F","Fluency and Coherence",e.fc_advice):""}
          ${e.pron_advice?renderAiAdviceCard("\u{1F50A}","Pronunciation",e.pron_advice):""}
          <button class="btn-retry-ai" onclick="retryAiGrading('${t.id}')">\u21BB Ch\u1EA5m l\u1EA1i AI</button>
        </div>
      </div>
    </div>`}async function showSharedPractice({id:t}){setLoading("\u0110ang t\u1EA3i...");const e=t.indexOf("?"),n=e>=0?t.slice(0,e):t,s=new URLSearchParams(e>=0?t.slice(e+1):"").get("attempt_id"),a=routeToken();try{const[o,l]=await Promise.all([api.get(`/student/shared-pool/${n}`),s?api.get(`/student/shared-attempts/${s}`):Promise.resolve(null)]);if(routeChanged(a))return;if(o.skill!=="reading"&&o.skill!=="listening"){toast("Ch\u1EBF \u0111\u1ED9 luy\u1EC7n t\u1EADp ch\u1EC9 h\u1ED7 tr\u1EE3 Reading v\xE0 Listening.","warning"),navigate(s?`/shared-attempt/${s}`:`/shared-pool/${n}`);return}const d=l?.student_answers||[];let c=o.questions_data||[];if(l&&(c=c.filter(m=>{const g=(d.find(h=>h.q_no===m.q_no)?.answer||"").trim().toLowerCase();return!m.answers?.some(h=>h.toLowerCase().trim()===g)})),c.length===0){toast("Kh\xF4ng c\xF3 c\xE2u sai n\xE0o \u0111\u1EC3 l\xE0m l\u1EA1i! \u{1F389}","success"),navigate(s?`/shared-attempt/${s}`:`/shared-pool/${n}`);return}let p="";for(const m of c)p+=`
        <div class="answer-row">
          <span class="q-label">Q${m.q_no}</span>
          <input class="answer-input" id="sprac-${m.q_no}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${m.q_no}" />
        </div>`;const r=s?`/shared-attempt/${s}`:`/shared-pool/${n}`;$("#app").innerHTML=`
      <div class="assignment-page">
        <div class="assignment-toolbar">
          <button class="btn-back" onclick="navigate('${r}')">\u2190 K\u1EBFt qu\u1EA3</button>
          <div class="assignment-toolbar-title">${skillBadge(o.skill)} ${escapeHtml(o.title)} \u2014 L\xE0m l\u1EA1i c\xE2u sai (${c.length} c\xE2u)</div>
          <button class="btn btn-primary btn-sm" id="submit-btn"
            onclick="submitSharedPractice(${JSON.stringify(c.map(m=>m.q_no))}, '${r}', this)">Ki\u1EC3m tra</button>
        </div>
        <div style="background:#fef3c7;border-bottom:1px solid #fbbf24;padding:8px 16px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:6px">
          \u{1F504} Luy\u1EC7n t\u1EADp \u2014 k\u1EBFt qu\u1EA3 <strong>kh\xF4ng ghi \u0111i\u1EC3m</strong> v\xE0o h\u1ED3 s\u01A1
        </div>
        <div class="assignment-content">
          <div class="content-pane" id="practice-content-pane">
            ${o.skill==="listening"?renderListeningAudioHtml(o):""}
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
              <div class="section-title" style="margin-bottom:0">${o.skill==="listening"?"C\xE2u h\u1ECFi":"B\xE0i \u0111\u1ECDc &amp; C\xE2u h\u1ECFi"}</div>
              ${buildHighlightToolbar()}
            </div>
            <div class="reading-text" id="practice-reading-text">${renderQuestionContentHTML(o.content_blocks,o.content_text||"")}</div>
          </div>
          <div class="answer-pane">
            <div style="font-size:12px;color:var(--gray-400);margin-bottom:12px">\u0110i\u1EC1n \u0111\xE1p \xE1n cho ${c.length} c\xE2u v\xE0 b\u1EA5m <strong>Ki\u1EC3m tra</strong>.</div>
            <div class="answer-grid">${p}</div>
          </div>
        </div>
      </div>`,bindReadingTextInteractions("practice-reading-text")}catch(o){if(routeChanged(a))return;toast("L\u1ED7i t\u1EA3i b\xE0i: "+(o.error||o.message),"error"),navigate("/shared-pool")}}async function submitSharedPractice(t,e,n){const i=_sharedCtx?.poolQ,s=i?i.questions_data.filter(c=>t.includes(c.q_no)):t.map(c=>({q_no:c,answers:[]})),a=t.map(c=>({q_no:c,answer:($(`#sprac-${c}`)?.value||"").trim()}));btnLoading(n);let o=0;const l=t.map(c=>{const p=s.find(u=>u.q_no===c)||{q_no:c,answers:[]},r=(a.find(u=>u.q_no===c)?.answer||"").trim(),m=(p.answers||[]).some(u=>u.toLowerCase().trim()===r.toLowerCase());return m&&o++,`
      <tr>
        <td style="font-weight:700;color:var(--gray-400)">Q${c}</td>
        <td>${escapeHtml(r)||'<em style="color:var(--gray-400)">B\u1ECF tr\u1ED1ng</em>'}</td>
        <td>${escapeHtml((p.answers||[]).join(" / "))}</td>
        <td class="${m?"result-correct":"result-wrong"}">${m?"\u2713":"\u2717"}</td>
      </tr>`}).join(""),d=`
    <div style="margin-bottom:12px;font-size:15px;font-weight:600">K\u1EBFt qu\u1EA3: ${o}/${t.length} c\xE2u \u0111\xFAng</div>
    <table class="result-table">
      <thead><tr><th>C\xE2u</th><th>\u0110\xE1p \xE1n c\u1EE7a b\u1EA1n</th><th>\u0110\xE1p \xE1n \u0111\xFAng</th><th>K\u1EBFt qu\u1EA3</th></tr></thead>
      <tbody>${l}</tbody>
    </table>
    <div style="margin-top:16px;text-align:right">
      <button class="btn btn-outline btn-sm" onclick="closeModal();navigate('${e}')">\u2190 Quay l\u1EA1i k\u1EBFt qu\u1EA3</button>
    </div>`;btnReset(n),openModal("K\u1EBFt qu\u1EA3 luy\u1EC7n t\u1EADp",d)}window.submitSharedPractice=submitSharedPractice,loadAuth(),pruneStudentDrafts(),window.addEventListener("auth:expired",()=>{clearAuth(),navigate("/login")}),window.addEventListener("pagehide",flushAutoSave);function startEditProfileName(){const t=document.getElementById("profile-name-text");if(!t)return;const e=t.textContent.trim(),n=t.closest(".profile-name");n.innerHTML=`
    <input id="profile-name-input" class="profile-name-input" value="${escapeHtml(e)}" maxlength="100" />
    <button class="profile-name-save-btn" onclick="saveProfileName()">L\u01B0u</button>
    <button class="profile-name-cancel-btn" onclick="renderProfile(window._cachedAssignments||[],window._cachedProfileData)">Hu\u1EF7</button>
  `;const i=document.getElementById("profile-name-input");i?.focus(),i?.select(),i?.addEventListener("keydown",s=>{s.key==="Enter"&&saveProfileName(),s.key==="Escape"&&renderProfile(window._cachedAssignments||[],window._cachedProfileData)})}async function saveProfileName(){const t=document.getElementById("profile-name-input");if(!t)return;const e=t.value.trim();if(!e){t.focus();return}t.disabled=!0;let n=!1;try{await api.patch("/student/me",{full_name:e}),n=!0}catch(i){t.disabled=!1,t.focus(),toast(i?.error||"Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt t\xEAn","error")}if(n){updateStudentState({full_name:e});const i=document.getElementById("header-student-name");i&&(i.textContent=e),renderProfile(window._cachedAssignments||[],window._cachedProfileData)}}window.startEditProfileName=startEditProfileName,window.saveProfileName=saveProfileName;let _compositeExam=null,_activeSectionId=null,_sectionTimerInterval=null,_sectionTimerSecsLeft=0;function stopCompositeSectionTimer(){_sectionTimerInterval&&(clearInterval(_sectionTimerInterval),_sectionTimerInterval=null)}function _tickCompositeSectionTimer(){_sectionTimerSecsLeft=Math.max(0,_sectionTimerSecsLeft-1);const t=document.getElementById("csec-countdown");if(t){const e=Math.floor(_sectionTimerSecsLeft/60),n=_sectionTimerSecsLeft%60;t.textContent=`${String(e).padStart(2,"0")}:${String(n).padStart(2,"0")}`,t.className=`assign-countdown${_sectionTimerSecsLeft<60?" timer-urgent":""}`}_sectionTimerSecsLeft<=0&&(stopCompositeSectionTimer(),autoSubmitCurrentCompositeSection())}function startCompositeSectionTimer(t){stopCompositeSectionTimer(),_sectionTimerSecsLeft=Math.floor(t),_sectionTimerInterval=setInterval(_tickCompositeSectionTimer,1e3)}async function showCompositeExam({id:t}){setLoading("\u0110ang t\u1EA3i \u0111\u1EC1 t\u1ED5ng h\u1EE3p...");const e=routeToken();try{const n=await api.get(`/student/assignments/${t}`);if(routeChanged(e))return;n.sections&&(n.sections=n.sections.map(i=>({...i,question_count:Array.isArray(i.questions_data)?i.questions_data.length:0}))),_compositeExam=n,_activeSectionId=null,stopCompositeSectionTimer(),renderCompositeExam(n)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i t\u1EA3i \u0111\u1EC1: "+(n.error||n.message),"error"),navigate("/assignments")}}window.showCompositeExam=showCompositeExam;function renderCompositeExam(t){stopAssignmentCountdown();const e=t.sections||[],n=e.length>0&&e.every(o=>o.submission_id),i=!t.is_active,s=e.map(o=>{const l=!!o.submission_id,d=SKILL_ICONS[o.skill]||"\u{1F4DD}",c=o.question_count>0?`${o.question_count} c\xE2u`:"",p=o.time_limit_minutes?`\u23F1 ${o.time_limit_minutes} ph\xFAt`:"",r=[c,p].filter(Boolean).join(" \xB7 "),m=l?`<span class="badge badge-done" style="font-size:11px">\u2713 \u0110\xE3 n\u1ED9p${n&&o.score!=null?` \xB7 Band ${o.score}`:""}</span>`:i?'<span class="badge badge-closed" style="font-size:11px">\u{1F512} \u0110\xE3 \u0111\xF3ng</span>':'<span class="badge badge-pending" style="font-size:11px">Ch\u01B0a l\xE0m</span>',u=l?n:!i,g=l?n?`#/composite-result/${t.id}/section/${o.submission_id}`:"":i?"":`#/composite/${t.id}/section/${o.id}`,h=l&&!n?'<div style="font-size:12px;color:var(--gray-400);margin-top:6px">\u{1F512} Ho\xE0n th\xE0nh c\xE1c ph\u1EA7n c\xF2n l\u1EA1i \u0111\u1EC3 xem k\u1EBFt qu\u1EA3</div>':"",v=l&&!n?"\u{1F512}":"\u203A";return`
      <${u&&g?`a href="${g}"`:"div"} class="assignment-card${l?" done":""}${i&&!l?" assignment-card-closed":""}" style="margin-bottom:10px">
        <div class="assignment-card-icon" style="font-size:22px">${d}</div>
        <div class="assignment-card-body">
          <div class="assignment-card-title">${escapeHtml(o.label)}</div>
          <div class="assignment-card-meta">${skillBadge(o.skill)} ${m} ${r?`<span style="font-size:12px;color:var(--gray-400)">${r}</span>`:""}</div>
          ${h}
        </div>
        <div class="assignment-card-right"><span class="card-chevron">${v}</span></div>
      </${u&&g?"a":"div"}>`}).join(""),a=n?`<div style="margin-top:24px;text-align:center">
        <a href="#/composite-result/${t.id}" class="btn btn-primary">Xem k\u1EBFt qu\u1EA3 t\u1ED5ng h\u1EE3p \u2192</a>
       </div>`:"";$("#app").innerHTML=`
    <div class="assignment-page" style="max-width:700px;margin:0 auto">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/assignments')">\u2190 Quay l\u1EA1i</button>
        <div class="assignment-toolbar-title">\u{1F4CB} ${escapeHtml(t.title)}</div>
        ${t.deadline?`<span style="font-size:12px;color:var(--gray-400)">\u{1F4C5} ${formatDateTime(t.deadline)}</span>`:""}
      </div>
      <div style="padding:16px 0 32px">
        <div style="font-size:13px;color:var(--gray-500);margin-bottom:16px">
          ${e.filter(o=>o.submission_id).length}/${e.length} ph\u1EA7n \u0111\xE3 ho\xE0n th\xE0nh
          ${n?' \xB7 <span style="color:var(--success)">\u2713 Ho\xE0n th\xE0nh t\u1EA5t c\u1EA3</span>':""}
        </div>
        ${s}
        ${a}
      </div>
    </div>`}window.renderCompositeExam=renderCompositeExam;async function showCompositeSectionExam({id:t,sectionId:e}){setLoading("\u0110ang t\u1EA3i...");const n=routeToken();try{if(!_compositeExam||_compositeExam.id!==t){const o=await api.get(`/student/assignments/${t}`);o.sections&&(o.sections=o.sections.map(l=>({...l,question_count:Array.isArray(l.questions_data)?l.questions_data.length:0}))),_compositeExam=o}if(routeChanged(n))return;const i=_compositeExam.sections?.find(o=>o.id===e);if(!i){toast("Kh\xF4ng t\xECm th\u1EA5y ph\u1EA7n thi","error"),navigate(`/composite/${t}`);return}const s=(_compositeExam.sections||[]).length>0&&_compositeExam.sections.every(o=>o.submission_id);if(i.submission_id){if(!s){toast("Ho\xE0n th\xE0nh c\xE1c ph\u1EA7n c\xF2n l\u1EA1i \u0111\u1EC3 xem k\u1EBFt qu\u1EA3 c\u1EE7a ph\u1EA7n n\xE0y.","warning"),navigate(`/composite/${t}`);return}navigate(`/composite-result/${t}/section/${i.submission_id}`);return}if(!_compositeExam.is_active){toast("\u0110\u1EC1 \u0111\xE3 \u0111\xF3ng","error"),navigate(`/composite/${t}`);return}let a=i.time_limit_minutes?i.time_limit_minutes*60:null;if(_compositeExam.mode==="exam"&&i.time_limit_minutes){try{const o=await api.post("/exam-sessions",{ref_type:"composite_section",ref_id:e,assignment_id:t}),l=(Date.now()-new Date(o.started_at).getTime())/1e3;a=Math.max(0,i.time_limit_minutes*60-l)}catch{a=i.time_limit_minutes*60}if(a<=0){await _autoSubmitCompositeSectionAndBack(t,e);return}}if(routeChanged(n))return;_activeSectionId=e,_renderCompositeSectionFullScreen(t,i,a),a!==null&&(_installExamBeforeUnload(),startCompositeSectionTimer(a))}catch(i){if(routeChanged(n))return;toast("L\u1ED7i: "+(i.error||i.message),"error"),navigate(`/composite/${t}`)}}window.showCompositeSectionExam=showCompositeSectionExam;function _renderCompositeSectionFullScreen(t,e,n){const i=e.id,s=`${t}_${i}`;_activeAssignmentId=s;const a=loadDraft(s,"flags");_flaggedSet=new Set(Array.isArray(a?.data)?a.data:[]);const o=e.question_count||0,l=n!==null?'<div class="assign-countdown-wrap"><span class="assign-countdown-label">\u23F1 C\xF2n l\u1EA1i</span><span class="assign-countdown" id="assign-countdown">--:--</span></div>':"";let d="",c=null;if(e.skill==="reading"){let p="";for(let r=1;r<=o;r++){const m=_flaggedSet.has(r)?" flagged":"";p+=`<div class="answer-row">
        <span class="q-label">Q${r}</span>
        <input class="answer-input" id="ans-${r}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${r}"
          oninput="updateNavigatorState();scheduleAnswerDraftSave('${s}',${o})" />
        <button class="q-flag-btn${m}" data-flag-q="${r}" onclick="toggleFlag(${r})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`}d=`
      <div class="assignment-content">
        <div class="content-pane" id="reading-content-pane">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">B\xE0i \u0111\u1ECDc &amp; C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(o,i)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${o===0?'<div style="color:var(--gray-400);font-size:13px">Kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${p}</div>`}
        </div>
      </div>`,c=()=>{restoreAnswerDraft(s,o),bindReadingTextInteractions(),updateNavigatorState(),startAutoSave(()=>persistAnswerDraft(s,o))}}else if(e.skill==="listening"){let p="";for(let m=1;m<=o;m++){const u=_flaggedSet.has(m)?" flagged":"";p+=`<div class="answer-row">
        <span class="q-label">Q${m}</span>
        <input class="answer-input" id="ans-${m}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${m}"
          oninput="updateNavigatorState();scheduleAnswerDraftSave('${s}',${o})" />
        <button class="q-flag-btn${u}" data-flag-q="${m}" onclick="toggleFlag(${m})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`}d=`
      <div class="assignment-content">
        <div class="content-pane">
          ${_compositeExam.mode==="practice"?renderListeningAudioHtml(e):renderLockedListeningAudioHtml(e)}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(o,i)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${o===0?'<div style="color:var(--gray-400);font-size:13px">Kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${p}</div>`}
        </div>
      </div>`,c=()=>{restoreAnswerDraft(s,o),_compositeExam.mode!=="practice"&&setupLockedListeningAudio(),bindReadingTextInteractions(),updateNavigatorState(),startAutoSave(()=>persistAnswerDraft(s,o))}}else e.skill==="writing"?(d=`
      <div class="assignment-content">
        <div class="content-pane">
          <div class="section-title">\u0110\u1EC1 b\xE0i</div>
          <div class="writing-prompt-body">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane writing-answer-pane">
          <div class="section-title">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
          <textarea id="writing-answer" class="writing-textarea"
            placeholder="Vi\u1EBFt b\xE0i c\u1EE7a b\u1EA1n v\xE0o \u0111\xE2y..."
            oninput="updateWordCount(this);scheduleWritingDraftSave('${s}')"></textarea>
          <div id="word-count" class="word-count word-count-extended">
            <span data-stat="words">0 t\u1EEB</span>
            <span data-stat="chars">0 k\xFD t\u1EF1</span>
            <span data-stat="sentences">0 c\xE2u</span>
            <span data-stat="paragraphs">0 \u0111o\u1EA1n</span>
          </div>
          <div class="form-hint">Task 1: ~150 t\u1EEB \u2014 Task 2: ~250 t\u1EEB</div>
        </div>
      </div>`,c=()=>{const p=loadDraft(s,"writing");if(p?.data){const r=$("#writing-answer");r&&(r.value=p.data,updateWordCount(r))}startAutoSave(()=>persistWritingDraft(s))}):e.skill==="speaking"&&(_speakingSlots=[_newSpeakingSlot()],_speakingRecordIdx=-1,_speakingAssignId=i,_speakingIsShared=!1,_mediaRecorder=null,_audioChunks=[],_recordedBlob=null,_uploadedFile=null,d=`
      <div class="assignment-content single-col">
        <div class="content-pane">
          <div class="section-title">C\xE2u h\u1ECFi / Cue Card</div>
          <div class="cue-card">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="section-title">B\xE0i n\xF3i c\u1EE7a b\u1EA1n</div>
          <div id="recording-indicator" style="display:none;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:10px">
            <canvas id="waveform-canvas" class="waveform-canvas" width="600" height="60"></canvas>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
              <div id="record-timer" class="record-timer" style="font-size:18px">0:00</div>
              <button class="record-btn recording-active" style="padding:6px 18px;font-size:13px" onclick="stopSlotRecording()">\u23F9 D\u1EEBng thu \xE2m</button>
            </div>
          </div>
          <div id="speaking-slot-list"></div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addSpeakingSlot()">+ Th\xEAm ph\u1EA7n</button>
          <div id="audio-submit-status" class="audio-submit-status hidden" style="margin-top:12px"></div>
        </div>
      </div>`,c=()=>{_renderSpeakingSlots()});if($("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/composite/${t}')">\u2190 ${escapeHtml(_compositeExam.title)}</button>
        <div class="assignment-toolbar-title">${skillBadge(e.skill)} ${escapeHtml(e.label)}</div>
        ${modeBadgeHtml(_compositeExam.mode)}
        <div id="task-timer" class="task-timer"></div>
        <div id="save-indicator" class="save-indicator"></div>
        ${l}
        <button class="btn btn-primary btn-sm" id="submit-btn"
          onclick="_submitCompositeSectionAndBack('${t}','${i}',this,false)"
          ${e.skill==="speaking"?"disabled":""}>N\u1ED9p ph\u1EA7n n\xE0y</button>
      </div>
      ${d}
    </div>`,c&&c(),startTaskTimer(i),n!==null){const p=Math.floor(n/60),r=Math.floor(n%60),m=document.getElementById("assign-countdown");m&&(m.textContent=`${String(p).padStart(2,"0")}:${String(r).padStart(2,"0")}`),startAssignmentCountdown(n,{assignmentId:i,skill:e.skill,onExpire:()=>_autoSubmitCompositeSectionAndBack(t,i)})}}function _renderCompositeSectionFullReadOnly(t,e){const n=e.id,i=e.question_count||0;let s="";if(e.skill==="reading"||e.skill==="listening"){const a=e.answers||[];let o="";for(let d=1;d<=i;d++){const c=a.find(p=>p.q_no===d);o+=`<div class="answer-row">
        <span class="q-label">Q${d}</span>
        <span style="flex:1;padding:6px 10px;background:var(--surface);border-radius:6px;font-size:14px">${escapeHtml(c?.answer||"\u2014")}</span>
      </div>`}s=`
      <div class="assignment-content">
        <div class="content-pane">
          ${e.skill==="listening"?renderListeningAudioHtml(e):""}
          <div class="section-title">${e.skill==="reading"?"B\xE0i \u0111\u1ECDc":"C\xE2u h\u1ECFi"}</div>
          <div class="reading-text">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${e.score!=null?`<div class="result-score-badge" style="margin-bottom:12px">Band ${e.score}/9</div>`:""}
          <div class="section-title">\u0110\xE1p \xE1n c\u1EE7a b\u1EA1n</div>
          <div class="answer-grid">${o||'<div style="color:var(--gray-400)">Kh\xF4ng c\xF3 \u0111\xE1p \xE1n.</div>'}</div>
        </div>
      </div>`}else e.skill==="writing"?s=`
      <div class="assignment-content">
        <div class="content-pane">
          <div class="section-title">\u0110\u1EC1 b\xE0i</div>
          <div class="writing-prompt-body">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${e.score!=null?`<div class="result-score-badge" style="margin-bottom:12px">Band ${e.score}/9</div>`:'<span class="badge badge-waiting">\u23F3 Ch\u1EDD ch\u1EA5m</span>'}
          <div class="section-title" style="margin-top:12px">B\xE0i l\xE0m</div>
          <div style="white-space:pre-wrap;font-size:14px;line-height:1.7;padding:12px;background:var(--surface);border-radius:8px">${escapeHtml(e.content||"")}</div>
          ${e.feedback?`<div class="section-title" style="margin-top:12px">Nh\u1EADn x\xE9t</div><div class="writing-feedback-box">${escapeHtml(e.feedback)}</div>`:""}
        </div>
      </div>`:e.skill==="speaking"&&(s=`
      <div class="assignment-content single-col">
        <div class="content-pane">
          <div class="section-title">C\xE2u h\u1ECFi</div>
          <div class="cue-card">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${e.score!=null?`<div class="result-score-badge" style="margin-bottom:12px">Band ${e.score}/9</div>`:'<span class="badge badge-waiting">\u23F3 Ch\u1EDD ch\u1EA5m</span>'}
          ${e.audio_url?`<audio controls style="width:100%;margin-top:12px"><source src="${escapeHtml(e.audio_url)}" /></audio>`:""}
          ${e.feedback?`<div class="section-title" style="margin-top:12px">Nh\u1EADn x\xE9t</div><div class="writing-feedback-box">${escapeHtml(e.feedback)}</div>`:""}
        </div>
      </div>`);$("#app").innerHTML=`
    <div class="assignment-page">
      <div class="assignment-toolbar">
        <button class="btn-back" onclick="navigate('/composite/${t}')">\u2190 ${escapeHtml(_compositeExam?.title||"Quay l\u1EA1i")}</button>
        <div class="assignment-toolbar-title">${skillBadge(e.skill)} ${escapeHtml(e.label)}</div>
        <span class="badge badge-done" style="font-size:11px;margin-left:auto">\u2713 \u0110\xE3 n\u1ED9p \xB7 Ch\u1EC9 \u0111\u1ECDc</span>
      </div>
      ${s}
    </div>`}async function _submitCompositeSectionAndBack(t,e,n,i){const s=_compositeExam?.sections.find(a=>a.id===e);if(s&&!(!i&&!await _confirmCompositeSectionSubmit(s.label))){n&&(n.disabled=!0,n.textContent="\u0110ang n\u1ED9p..."),stopCompositeSectionTimer(),stopAutoSave(),stopTaskTimer(),stopAssignmentCountdown(),_removeExamBeforeUnload();try{const a={};if(s.skill==="reading"||s.skill==="listening"){const d=s.question_count||0,c=[];for(let p=1;p<=d;p++)c.push({q_no:p,answer:(document.getElementById(`ans-${p}`)?.value||"").trim()});a.answers=c}else if(s.skill==="writing")a.content=($("#writing-answer")?.value||"").trim();else if(s.skill==="speaking"){const d=_speakingSlots.filter(c=>c.status==="done"&&c.key);if(d.length===0&&!i){toast("Vui l\xF2ng thu \xE2m tr\u01B0\u1EDBc khi n\u1ED9p","error"),n&&(n.disabled=!1,n.textContent="N\u1ED9p ph\u1EA7n n\xE0y");return}d.length>0&&(a.audio_upload_keys=d.map(c=>({key:c.key,name:c.name||"audio"})))}a.assignment_id=_compositeExam.id;const o=await api.post(`/student/composite-sections/${e}/submit`,a);invalidateAssignmentsCache(!0),clearAllDrafts(`${t}_${e}`);const l=_compositeExam.sections.findIndex(d=>d.id===e);l>=0&&Object.assign(_compositeExam.sections[l],{submission_id:o.id,answers:o.answers,content:o.content,score:o.score,submitted_at:o.submitted_at}),_activeSectionId=null,toast(`\u0110\xE3 n\u1ED9p ph\u1EA7n "${s.label}"!`),navigate(`/composite/${t}`)}catch(a){toast("L\u1ED7i n\u1ED9p b\xE0i: "+(a.error||a.message),"error"),n&&(n.disabled=!1,n.textContent="N\u1ED9p ph\u1EA7n n\xE0y")}}}window._submitCompositeSectionAndBack=_submitCompositeSectionAndBack;async function _autoSubmitCompositeSectionAndBack(t,e){const n=document.getElementById("submit-btn");await _submitCompositeSectionAndBack(t,e,n,!0)}function _deadFunction_renderCompositeSectionContent(t,e,n){const i=document.getElementById(`csb-${t}`);if(!i)return;_activeAssignmentId=t;const s=loadDraft(t,"flags");_flaggedSet=new Set(Array.isArray(s?.data)?s.data:[]);const a=e.question_count||0,o=n!==null?`<div class="assign-countdown-wrap">
        <span class="assign-countdown-label">\u23F1 C\xF2n l\u1EA1i</span>
        <span class="assign-countdown" id="csec-countdown">--:--</span>
       </div>`:"",l=`
    <div class="assignment-toolbar" style="position:sticky;top:0;z-index:10;border-bottom:1px solid var(--border);border-top:2px solid var(--border)">
      <span style="font-weight:600;font-size:14px;color:var(--gray-700)">${escapeHtml(e.label)}</span>
      ${o}
      <div id="save-indicator" class="save-indicator" style="margin-left:auto"></div>
      <button class="btn btn-primary btn-sm" id="csec-submit-btn-${t}"
        onclick="submitCompositeSection('${t}',false)">N\u1ED9p ph\u1EA7n n\xE0y</button>
    </div>`;let d="",c=null;if(e.skill==="reading"){let p="";for(let r=1;r<=a;r++){const m=_flaggedSet.has(r)?" flagged":"";p+=`<div class="answer-row">
        <span class="q-label">Q${r}</span>
        <input class="answer-input" id="ans-${r}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${r}"
          oninput="updateNavigatorState();scheduleAnswerDraftSave('${t}',${a})" />
        <button class="q-flag-btn${m}" data-flag-q="${r}" onclick="toggleFlag(${r})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`}d=`
      <div class="assignment-content">
        <div class="content-pane" id="reading-content-pane">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">B\xE0i \u0111\u1ECDc &amp; C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(a,t)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${a===0?'<div style="color:var(--gray-400);font-size:13px">Kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${p}</div>`}
        </div>
      </div>`,c=()=>{restoreAnswerDraft(t,a),bindReadingTextInteractions(),updateNavigatorState(),startAutoSave(()=>persistAnswerDraft(t,a))}}else if(e.skill==="listening"){let p="";for(let m=1;m<=a;m++){const u=_flaggedSet.has(m)?" flagged":"";p+=`<div class="answer-row">
        <span class="q-label">Q${m}</span>
        <input class="answer-input" id="ans-${m}" type="text" placeholder="\u0110\xE1p \xE1n c\xE2u ${m}"
          oninput="updateNavigatorState();scheduleAnswerDraftSave('${t}',${a})" />
        <button class="q-flag-btn${u}" data-flag-q="${m}" onclick="toggleFlag(${m})" title="\u0110\xE1nh d\u1EA5u xem l\u1EA1i">\u{1F6A9}</button>
      </div>`}d=`
      <div class="assignment-content">
        <div class="content-pane">
          ${_compositeExam.mode==="practice"?renderListeningAudioHtml(e):renderLockedListeningAudioHtml(e)}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px">
            <div class="section-title" style="margin-bottom:0">C\xE2u h\u1ECFi</div>
            ${buildHighlightToolbar()}
          </div>
          <div class="reading-text" id="reading-text">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          ${buildQuestionNavigator(a,t)}
          <div class="section-title">\u0110i\u1EC1n \u0111\xE1p \xE1n</div>
          ${a===0?'<div style="color:var(--gray-400);font-size:13px">Kh\xF4ng c\xF3 c\xE2u h\u1ECFi.</div>':`<div class="answer-grid">${p}</div>`}
        </div>
      </div>`,c=()=>{restoreAnswerDraft(t,a),_compositeExam.mode!=="practice"&&setupLockedListeningAudio(),bindReadingTextInteractions(),updateNavigatorState(),startAutoSave(()=>persistAnswerDraft(t,a))}}else e.skill==="writing"?(d=`
      <div class="assignment-content">
        <div class="content-pane">
          <div class="section-title">\u0110\u1EC1 b\xE0i</div>
          <div class="writing-prompt-body">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane writing-answer-pane">
          <div class="section-title">B\xE0i l\xE0m c\u1EE7a b\u1EA1n</div>
          <textarea id="writing-answer" class="writing-textarea"
            placeholder="Vi\u1EBFt b\xE0i c\u1EE7a b\u1EA1n v\xE0o \u0111\xE2y..."
            oninput="updateWordCount(this);scheduleWritingDraftSave('${t}')"></textarea>
          <div id="word-count" class="word-count word-count-extended">
            <span data-stat="words">0 t\u1EEB</span>
            <span data-stat="chars">0 k\xFD t\u1EF1</span>
            <span data-stat="sentences">0 c\xE2u</span>
            <span data-stat="paragraphs">0 \u0111o\u1EA1n</span>
          </div>
          <div class="form-hint">Task 1: ~150 t\u1EEB \u2014 Task 2: ~250 t\u1EEB</div>
        </div>
      </div>`,c=()=>{const p=loadDraft(t,"writing");if(p?.data){const r=$("#writing-answer");r&&(r.value=p.data,updateWordCount(r))}startAutoSave(()=>persistWritingDraft(t))}):e.skill==="speaking"&&(_speakingSlots=[_newSpeakingSlot()],_speakingRecordIdx=-1,_speakingAssignId=t,_speakingIsShared=!1,_mediaRecorder=null,_audioChunks=[],_recordedBlob=null,_uploadedFile=null,d=`
      <div class="assignment-content single-col">
        <div class="content-pane">
          <div class="section-title">C\xE2u h\u1ECFi / Cue Card</div>
          <div class="cue-card">${renderQuestionContentHTML(e.content_blocks,e.content_text||"")}</div>
        </div>
        <div class="answer-pane">
          <div class="section-title">B\xE0i n\xF3i c\u1EE7a b\u1EA1n</div>
          <div id="recording-indicator" style="display:none;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:10px">
            <canvas id="waveform-canvas" class="waveform-canvas" width="600" height="60"></canvas>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
              <div id="record-timer" class="record-timer" style="font-size:18px">0:00</div>
              <button class="record-btn recording-active" style="padding:6px 18px;font-size:13px" onclick="stopSlotRecording()">\u23F9 D\u1EEBng thu \xE2m</button>
            </div>
          </div>
          <div id="speaking-slot-list"></div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addSpeakingSlot()">+ Th\xEAm ph\u1EA7n</button>
          <div id="audio-submit-status" class="audio-submit-status hidden" style="margin-top:12px"></div>
        </div>
      </div>`,c=()=>{_renderSpeakingSlots()});if(i.innerHTML=l+d,c&&c(),n!==null){const p=Math.floor(n/60),r=Math.floor(n%60),m=document.getElementById("csec-countdown");m&&(m.textContent=`${String(p).padStart(2,"0")}:${String(r).padStart(2,"0")}`)}}function _confirmCompositeSectionSubmit(t){return new Promise(e=>{const n=document.createElement("div");n.className="submit-confirm-overlay",n.innerHTML=`<div class="submit-confirm-modal">
      <div class="submit-confirm-title">N\u1ED9p ph\u1EA7n "${escapeHtml(t)}"?</div>
      <div class="submit-confirm-body">Sau khi n\u1ED9p b\u1EA1n kh\xF4ng th\u1EC3 ch\u1EC9nh s\u1EEDa ph\u1EA7n n\xE0y n\u1EEFa.</div>
      <div class="submit-confirm-actions">
        <button class="btn btn-outline" onclick="this.closest('.submit-confirm-overlay').remove();window._csecResolve(false)">Ti\u1EBFp t\u1EE5c l\xE0m</button>
        <button class="btn btn-primary" onclick="this.closest('.submit-confirm-overlay').remove();window._csecResolve(true)">N\u1ED9p ph\u1EA7n n\xE0y</button>
      </div>
    </div>`,document.body.appendChild(n),window._csecResolve=e})}async function showCompositeResult({id:t}){setLoading("\u0110ang t\u1EA3i k\u1EBFt qu\u1EA3...");const e=routeToken();try{const n=await api.get(`/student/assignments/${t}`);if(routeChanged(e))return;if(!((n.sections||[]).length>0&&n.sections.every(s=>s.submission_id))){toast("B\u1EA1n c\u1EA7n ho\xE0n th\xE0nh to\xE0n b\u1ED9 \u0111\u1EC1 t\u1ED5ng h\u1EE3p tr\u01B0\u1EDBc khi xem k\u1EBFt qu\u1EA3.","warning"),navigate(`/composite/${t}`);return}renderCompositeResult(n)}catch(n){if(routeChanged(e))return;toast("L\u1ED7i: "+(n.error||n.message),"error"),navigate("/assignments")}}window.showCompositeResult=showCompositeResult;async function showCompositeSectionResult({id:t,submissionId:e}){setLoading("\u0110ang t\u1EA3i k\u1EBFt qu\u1EA3...");const n=routeToken();try{const i=await api.get(`/student/assignments/${t}`);if(routeChanged(n))return;if(!((i.sections||[]).length>0&&i.sections.every(o=>o.submission_id))){toast("Ho\xE0n th\xE0nh to\xE0n b\u1ED9 \u0111\u1EC1 t\u1ED5ng h\u1EE3p tr\u01B0\u1EDBc khi xem k\u1EBFt qu\u1EA3 chi ti\u1EBFt.","warning"),navigate(`/composite/${t}`);return}const a=await api.get(`/student/composite-section-submissions/${e}`);if(routeChanged(n))return;setResultNavContext({backHref:`/composite-result/${t}`,backLabel:"\u2190 K\u1EBFt qu\u1EA3 t\u1ED5ng h\u1EE3p"}),renderResult(a)}catch(i){if(routeChanged(n))return;toast("L\u1ED7i t\u1EA3i k\u1EBFt qu\u1EA3: "+(i.error||i.message),"error"),navigate(`/composite-result/${t}`)}}window.showCompositeSectionResult=showCompositeSectionResult;function renderCompositeResult(t){const e={reading:"\u{1F4D6}",listening:"\u{1F3A7}",writing:"\u270D\uFE0F",speaking:"\u{1F3A4}"},n=t.scoring_scale||"10",i=t.sections.length,s=t.sections.filter(r=>r.submission_id).length,o=t.sections.filter(r=>r.submission_id&&r.score!=null).length,l=Math.max(s-o,0),d=s===i&&l===0?'<span class="badge badge-done">\u2713 \u0110\xE3 ch\u1EA5m xong</span>':l>0?`<span class="badge badge-waiting">\u23F3 ${l} ph\u1EA7n ch\u1EDD ch\u1EA5m</span>`:`<span class="badge badge-pending">${s}/${i} ph\u1EA7n \u0111\xE3 n\u1ED9p</span>`;function c(r){return r.score==null?null:r.skill==="writing"||r.skill==="speaking"||n==="ielts"?`Band ${Number(r.score).toFixed(1)}/9`:`${Number(r.score).toFixed(1)}/10`}const p=t.sections.map(r=>{const m=SKILL_LABELS[r.skill]||r.skill,u=!!r.submission_id;if(!r.submission_id)return`<div class="result-section-card composite-result-card composite-result-card-locked">
        <div class="composite-result-card-top">
          <div class="composite-result-card-title-wrap">
            <div class="composite-result-card-icon">${e[r.skill]||"\u{1F4DD}"}</div>
            <div>
              <div class="composite-result-card-title">${escapeHtml(r.label)}</div>
              <div class="composite-result-card-subtitle">${escapeHtml(m)} \xB7 Ch\u01B0a n\u1ED9p ph\u1EA7n n\xE0y</div>
            </div>
          </div>
          <span class="badge badge-closed">Ch\u01B0a n\u1ED9p</span>
        </div>
        <div class="composite-result-card-footer">
          <span>Ph\u1EA7n n\xE0y ch\u01B0a c\xF3 d\u1EEF li\u1EC7u k\u1EBFt qu\u1EA3.</span>
        </div>
      </div>`;const g=c(r),h=g?`<div class="result-score-badge">${g}</div>`:'<span class="badge badge-waiting">\u23F3 Ch\u1EDD ch\u1EA5m</span>';let v="";return r.skill==="writing"&&r.feedback?v=r.feedback:r.skill==="speaking"?v=r.feedback||(r.audio_url?"\u0110\xE3 n\u1ED9p file ghi \xE2m. B\u1EA5m \u0111\u1EC3 xem transcript v\xE0 nh\u1EADn x\xE9t chi ti\u1EBFt.":""):v=r.score!=null?"M\u1EDF \u0111\u1EC3 xem \u0111\xE1p \xE1n \u0111\xFAng/sai, Explain, Locate v\xE0 luy\u1EC7n l\u1EA1i ph\u1EA7n n\xE0y.":"Ph\u1EA7n n\xE0y \u0111\xE3 n\u1ED9p v\xE0 \u0111ang ch\u1EDD ch\u1EA5m \u0111i\u1EC3m.",`<a href="#/composite-result/${t.id}/section/${r.submission_id}" class="result-section-card composite-result-card composite-result-card-link">
      <div class="composite-result-card-top">
        <div class="composite-result-card-title-wrap">
          <div class="composite-result-card-icon">${e[r.skill]||"\u{1F4DD}"}</div>
          <div>
            <div class="composite-result-card-title">${escapeHtml(r.label)}</div>
            <div class="composite-result-card-subtitle">${escapeHtml(m)} \xB7 ${u?"\u0110\xE3 n\u1ED9p b\xE0i":"Ch\u01B0a n\u1ED9p"}</div>
          </div>
        </div>
        <div class="composite-result-card-status">
          ${h}
          ${r.is_overtime?'<span class="stats-overtime-pill">N\u1ED9p tr\u1EC5</span>':""}
        </div>
      </div>
      <div class="composite-result-card-footer">
        <span class="composite-result-card-preview">${escapeHtml(v)}</span>
        <span class="composite-result-card-cta">Xem chi ti\u1EBFt \u2192</span>
      </div>
    </a>`}).join("");$("#app").innerHTML=`
    <div class="result-page composite-result-page">
      <div class="composite-result-hero">
        <div class="composite-result-topbar">
          <button class="btn-back" onclick="navigate('/assignments')">\u2190 Quay l\u1EA1i</button>
          ${d}
        </div>
        <div class="composite-result-hero-main">
          <div class="composite-result-title-block">
            <div class="composite-result-kicker">B\xE0i t\u1ED5ng h\u1EE3p</div>
            <h2 class="composite-result-title">\u{1F4CB} ${escapeHtml(t.title)}</h2>
            <div class="composite-result-subtitle">
              ${s}/${i} ph\u1EA7n \u0111\xE3 n\u1ED9p
              ${l>0?` \xB7 ${l} ph\u1EA7n \u0111ang ch\u1EDD ch\u1EA5m`:""}
              ${s===i&&l===0?" \xB7 Ho\xE0n t\u1EA5t to\xE0n b\u1ED9":""}
            </div>
          </div>
          <div class="composite-result-skill-scores">
            ${t.sections.map(r=>{const m=c(r);return`<div class="composite-skill-score-chip">
                <span class="composite-skill-score-icon">${e[r.skill]||"\u{1F4DD}"}</span>
                <div class="composite-skill-score-info">
                  <span class="composite-skill-score-name">${escapeHtml(r.label)}</span>
                  <span class="composite-skill-score-val">${m??(r.submission_id?"\u23F3":"\u2014")}</span>
                </div>
              </div>`}).join("")}
          </div>
        </div>
      </div>
      <div class="composite-result-sections">
        <div class="composite-result-sections-head">
          <div>
            <div class="composite-result-sections-kicker">Chi ti\u1EBFt t\u1EEBng ph\u1EA7n</div>
            <div class="composite-result-sections-title">B\u1EA5m v\xE0o t\u1EEBng k\u1EF9 n\u0103ng \u0111\u1EC3 xem k\u1EBFt qu\u1EA3 \u0111\u1EA7y \u0111\u1EE7</div>
          </div>
        </div>
        ${p}
      </div>
    </div>`}window.renderCompositeResult=renderCompositeResult;const _resetTokenParam=new URLSearchParams(window.location.search).get("reset_token");_resetTokenParam?showResetPasswordPage(_resetTokenParam):(router(),syncStudentProfileSummary());
