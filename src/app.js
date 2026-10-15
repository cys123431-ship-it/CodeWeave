import {tracks,lessons} from './catalog.js';
import {figureFor} from './figures.js';
import {PROGRESS_KEY,DRAFTS_KEY,safeRead,normalizeProgress,scoreChoice,escapeHtml} from './logic.js';
import {ITERATIONS_KEY,MAX_CODE_LENGTH,normalizeIterations} from './iterations.js';
import {lessonLearningStatus,setProgressFlag,trackLearningSummary} from './mastery.js';
import {recordGradedSubmission,submissionCode,formatGradingResult,attemptHistoryHtml,readExerciseDrafts,saveExerciseDraft} from './practice.js';
import {MAX_BACKUP_FILE_SIZE,createFullBackup,parseCodeWeaveBackup,restoreCodeWeaveBackup} from './backup.js';
import {exerciseById,isGradedExercise} from './exercises.js';
import {MAX_MULTI_FILE_LENGTH,parseMultiFileSubmission,serializeMultiFileSubmission} from './multi-file.js';

const $=(q)=>document.querySelector(q);
const safe=(x)=>escapeHtml(x ?? '');
const state={
  route:location.hash.slice(1)||'dashboard',
  progress:normalizeProgress(safeRead(localStorage,PROGRESS_KEY,{})),
  drafts:readExerciseDrafts(localStorage,lessons.map(l=>l.id)),
  iterations:normalizeIterations(safeRead(localStorage,ITERATIONS_KEY,{}),lessons.map(l=>l.id)),
  feedback:{},terminal:{},grading:false,storageMessage:''
};
if(!state.drafts||typeof state.drafts!=='object'||Array.isArray(state.drafts))state.drafts={};
const lessonById=(id)=>lessons.find(l=>l.id===id);
const trackById=(id)=>tracks.find(t=>t.id===id);
const done=(id)=>state.progress.completed.includes(id);
const ofTrack=(id)=>lessons.filter(l=>l.track===id);
const hasPractice=(lesson)=>isGradedExercise(lesson.challenge.id);
const learningStatus=(lesson)=>lessonLearningStatus(lesson.id,state.progress,state.iterations,hasPractice(lesson));
const button=(title,route,cls='primary')=>'<button class="'+cls+'" data-route="'+safe(route)+'">'+safe(title)+'</button>';
const tag=(text)=>'<span class="tag">'+safe(text)+'</span>';
function save(draftId=null,replaceDrafts=false,quizId=null){
 try{
  if(draftId)state.drafts=saveExerciseDraft(localStorage,lessons.map(l=>l.id),draftId,state.drafts[draftId]);
  else{
   if(quizId){
    const latest=normalizeProgress(safeRead(localStorage,PROGRESS_KEY,{}));
    latest.results[quizId]=state.progress.results[quizId];
    if(state.progress.completed.includes(quizId)&&!latest.completed.includes(quizId))latest.completed.push(quizId);
    state.progress=latest;
   }
   localStorage.setItem(PROGRESS_KEY,JSON.stringify(state.progress));
   if(replaceDrafts)localStorage.setItem(DRAFTS_KEY,JSON.stringify(state.drafts));
  }
  state.storageMessage='';return true;
 }catch{state.storageMessage='브라우저 저장에 실패했습니다. 현재 코드와 기록을 백업하세요.';return false;}
}
function updateProgressFlag(id,key,enabled){
 try{
  const latest=normalizeProgress(safeRead(localStorage,PROGRESS_KEY,{}));
  latest[key]=setProgressFlag(latest[key],id,enabled);
  localStorage.setItem(PROGRESS_KEY,JSON.stringify(latest));
  state.progress=latest;state.storageMessage='';return true;
 }catch{state.storageMessage='학습 상태를 저장하지 못했습니다. 현재 기록을 백업하세요.';return false;}
}
function navigate(route){location.hash=route;state.route=route;render();window.scrollTo(0,0);}
function trackCard(t){const list=ofTrack(t.id),summary=trackLearningSummary(list,state.progress,state.iterations,hasPractice),pct=summary.total?Math.round(summary.mastered/summary.total*100):0;return '<button class="track-card" data-route="track:'+safe(t.id)+'"><div class="track-top"><span class="track-icon '+safe(t.color)+'">'+safe(t.icon)+'</span><span><strong>'+safe(t.name)+'</strong><small>'+safe(t.tag)+'</small></span></div><p>'+safe(t.description)+'</p><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div><div class="progress-label">이론 '+summary.theory+' · 퀴즈 '+summary.quiz+' · 실습 '+summary.practice+' · 숙달 '+summary.mastered+'/'+summary.total+(summary.review?' · 복습 '+summary.review:'')+'</div></button>';}
function lessonCard(l,i){const status=learningStatus(l),practice=status.practiceAvailable?(status.practicePassed?'실습 ✓':'실습 ○'):'실습 준비 중';return '<button class="lesson-card" data-route="lesson:'+safe(l.id)+'"><span class="step-number">'+(status.mastered?'✓':String(i+1).padStart(2,'0'))+'</span><span><strong>'+safe(l.title)+'</strong><small>'+safe(l.level)+' · 약 '+l.minutes+'분 · 이론 '+(status.theoryRead?'✓':'○')+' · 퀴즈 '+(status.quizPassed?'✓':'○')+' · '+practice+(status.reviewNeeded?' · 복습 필요':status.mastered?' · 전체 숙달':'')+'</small></span><span class="arrow">→</span></button>';}
function header(title,subtitle,label){return '<div class="detail-head"><p class="eyebrow">'+safe(label)+'</p><h1>'+safe(title)+'</h1><p>'+safe(subtitle)+'</p></div>';}
function dashboard(){const statuses=lessons.map(learningStatus),next=lessons.find((l,i)=>!statuses[i].mastered)||lessons[0],mastered=statuses.filter(s=>s.mastered).length,review=statuses.filter(s=>s.reviewNeeded).length;return '<div class="hero"><div><p class="eyebrow">YOUR PERSONAL CODING ACADEMY</p><h1>읽고 이해하고,<br>직접 풀어 내 것으로.</h1><p>C언어부터 Rust·자료구조·알고리즘까지. 그림과 예제를 읽고, 개념 퀴즈와 코딩 실습으로 확인하세요.</p>'+button('이어서 학습하기 →','lesson:'+next.id)+'</div><div class="hero-mark">&lt;/&gt;</div></div><div class="section-head"><h2>나의 학습 트랙</h2><span>총 '+lessons.length+'개 시범 단원 · '+mastered+'개 숙달'+(review?' · '+review+'개 복습 필요':'')+'</span></div><div class="grid">'+tracks.map(trackCard).join('')+'</div><div class="section-head"><h2>추천 학습 순서</h2></div><div class="lesson-list">'+ofTrack('c').map(lessonCard).join('')+'</div><p class="notice">초기 시제품입니다. C 자동 채점은 개인 PC에서 Node.js·GCC를 설치하고 npm start로 실행한 경우만 지원합니다. Rust 등의 채점은 아직 구현 전입니다.</p>';}
function trackPage(id){const t=trackById(id);if(!t)return dashboard();const list=ofTrack(id),summary=trackLearningSummary(list,state.progress,state.iterations,hasPractice),pct=summary.total?Math.round(summary.mastered/summary.total*100):0;return header(t.name,t.description,t.tag)+'<div class="surface"><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div><p>이론 '+summary.theory+' · 퀴즈 '+summary.quiz+' · 실습 '+summary.practice+' · 전체 숙달 '+summary.mastered+'/'+summary.total+(summary.review?' · 복습 필요 '+summary.review:'')+'</p></div><div class="lesson-list">'+list.map(lessonCard).join('')+'</div><p class="notice">전체 교과서 및 Exercism형 문제 은행은 후속 단계에서 확장할 예정입니다.</p>';}
function codeBox(code){return '<div class="code"><button class="copy-btn" data-copy="'+encodeURIComponent(code)+'">복사</button><pre><code>'+safe(code)+'</code></pre></div>';}
export function section(s) {
  const note = s.advancedText ? '<details class="advanced"><summary>심화: ' + safe(s.heading) + '</summary><p>' + safe(s.advancedText) + '</p></details>' : '';
  const body = '<p>' + safe(s.text) + '</p>' + (s.code ? codeBox(s.code) : '') + note;
  if (s.advanced === true) {
    return '<details class="advanced"><summary>심화: ' + safe(s.heading) + '</summary>' + body + '</details>';
  }
  return '<section><h2>' + safe(s.heading) + '</h2>' + body + '</section>';
}
function learningPanel(l,status){const manualReview=state.progress.review.includes(l.id),row=(label,value,kind)=>'<li><span>'+label+'</span><strong class="status-'+kind+'">'+value+'</strong></li>';return '<div class="side-panel learning-status"><h3>학습 상태</h3><ul class="learning-status-list">'+row('이론 읽기',status.theoryRead?'✓ 완료':'○ 미완료',status.theoryRead?'ok':'pending')+row('개념 퀴즈',status.quizPassed?'✓ 통과':'○ 미통과',status.quizPassed?'ok':'pending')+row('코딩 실습',status.practiceAvailable?(status.practicePassed?'✓ 통과':'○ 미통과'):'— 준비 중',status.practicePassed?'ok':'pending')+row('복습',status.reviewNeeded?'! 필요':'✓ 현재 불필요',status.reviewNeeded?'review':'ok')+'</ul><p class="mastery-state status-'+(status.mastered?'ok':'pending')+'"><strong>'+(status.mastered?'✓ 전체 숙달':'○ 숙달 진행 중')+'</strong></p><div class="learning-actions"><button class="secondary" id="mark-theory">'+(status.theoryRead?'이론 미완료로 표시':'이론 읽음으로 표시')+'</button><button class="ghost" id="toggle-review">'+(manualReview?'수동 복습 표시 해제':'복습 필요로 표시')+'</button></div><p class="status-help">최신 퀴즈나 실습이 실패하면 자동으로 복습이 필요해집니다. 수동 복습 표시는 별도로 유지됩니다.</p></div>';}
function editorMarkup(lesson,exercise){const value=state.drafts[lesson.id]??lesson.challenge.starter;if(exercise?.grader!=='c-multi-file')return '<textarea id="code-input" class="code-editor" spellcheck="false" maxlength="'+MAX_CODE_LENGTH+'" aria-label="코드 작성 편집기">'+safe(value)+'</textarea>';let files;try{files=parseMultiFileSubmission(value,{requiredNames:exercise.requiredFiles});}catch{files=parseMultiFileSubmission(lesson.challenge.starter,{requiredNames:exercise.requiredFiles});}return '<div class="multi-file-editors" aria-label="다중 파일 코드 편집기">'+files.map((file,index)=>'<div class="multi-file-editor"><label for="code-file-'+index+'">'+safe(file.name)+'</label><textarea '+(index===0?'id="code-input" ':'id="code-file-'+index+'" ')+'class="code-editor" data-code-file="'+safe(file.name)+'" spellcheck="false" maxlength="'+MAX_MULTI_FILE_LENGTH+'" aria-label="'+safe(file.name)+' 코드 편집기">'+safe(file.content)+'</textarea></div>').join('')+'</div>';}
function lessonPage(id){const l=lessonById(id);if(!l)return dashboard();const q=l.quiz,result=state.feedback[id],status=learningStatus(l),exercise=exerciseById(l.challenge.id);const exerciseKind=exercise?.kind==='practice'?'Practice Exercise':'Concept Exercise',graderLabel=exercise?.grader==='c-function'?'함수 직접 호출형':exercise?.grader==='c-multi-file'?'다중 파일형':exercise?.grader==='stdin-output'?'입출력형':'자동 채점 준비 중',language=exercise?.language==='rust'?'Rust':'C',prerequisites=exercise?.prerequisites.map(prerequisite=>lessonById(prerequisite)?.title??prerequisite).join(' · ')||'없음';const idx=lessons.findIndex(x=>x.id===id),next=lessons[idx+1];return header(l.title,l.summary,l.track.toUpperCase()+' / TEXTBOOK + PRACTICE')+'<div class="tagline">'+tag(l.level)+tag('약 '+l.minutes+'분')+tag(status.mastered?'전체 숙달':status.reviewNeeded?'복습 필요':'학습 진행 중')+'</div><div class="reader"><article class="article"><div class="figure-box">'+figureFor(l.figure)+'<p class="figure-cap">원리를 쉽게 이해하도록 직접 제작한 학습용 그림</p></div>'+l.sections.map(section).join('')+'<p class="source">주제 참고: '+safe(l.source)+'<br>교재 본문·그림을 그대로 복제하지 않은 초기 학습 초안입니다.</p></article><aside>'+learningPanel(l,status)+'<div class="side-panel"><h3>이번 단원의 목표</h3><p>① 이론 읽기<br>② 개념 퀴즈<br>③ 코드 직접 작성<br>④ 테스트 및 복습</p></div><div class="side-panel"><h3>학습 안내</h3><p>읽고, 직접 답을 고르고, 틀린 곳을 다시 살펴보세요.</p>'+button('트랙으로 돌아가기','track:'+l.track,'ghost')+'</div></aside></div><div class="practice-zone"><div class="section-head"><h2>개념 확인 퀴즈</h2><span>즉시 채점</span></div><div class="practice-card"><h3>'+safe(q.question)+'</h3><div class="options">'+q.options.map((x,i)=>'<button class="option '+(result?(i===q.answer?'correct':i===result.selected?'wrong':''):'')+'" data-choice="'+i+'" data-quiz="'+safe(id)+'" '+(result?'disabled':'')+'>'+String.fromCharCode(65+i)+'. '+safe(x)+'</button>').join('')+'</div>'+(result?'<div class="feedback '+(result.correct?'good':'bad')+'"><strong>'+(result.correct?'정답입니다!':'다시 생각해 보세요.')+'</strong><p>'+safe(result.explanation)+'</p></div><button class="ghost" data-retry="'+safe(id)+'">다시 풀기</button>':'')+'</div><div class="section-head"><h2>코딩 실습</h2><span>'+exerciseKind+'</span></div><div class="practice-card"><h3>'+safe(l.challenge.title)+'</h3><p>'+safe(l.challenge.description)+'</p><div class="toolbar">'+tag(exerciseKind)+tag(language)+tag(graderLabel)+'<span>선수 단원: '+safe(prerequisites)+'</span></div><div class="io-samples"><div class="io-box"><strong>예시 입력</strong><pre>'+safe(l.challenge.input)+'</pre></div><div class="io-box"><strong>예상 출력</strong><pre>'+safe(l.challenge.expected)+'</pre></div></div><div class="toolbar">'+tag(language)+'<span>작성 코드 자동 저장 · Tab 들여쓰기 · Shift+Tab 이동</span></div>'+editorMarkup(l,exercise)+'<div class="toolbar"><button class="secondary" id="save-code">코드 저장</button><button class="primary" id="grade-code" '+(!status.practiceAvailable?'disabled title="채점 기능 개발 중"':state.grading?'disabled aria-busy="true"':'')+'>'+(state.grading?'채점 중…':'▶ 실제 컴파일·채점')+'</button><button class="ghost" id="reset-code">초기화</button></div>'+(state.terminal[id]?'<pre class="terminal" role="status">'+safe(state.terminal[id])+'</pre>':'')+'<p class="notice">'+(status.practiceAvailable?'C 코드 채점에는 개인 PC에서 실행하는 Node.js·GCC 로컬 서버가 필요합니다.':'이 문제 유형의 자동 채점은 아직 개발 중이며 코드 저장은 가능합니다.')+'</p>'+(status.practiceAvailable?'<div id="attempt-history-container">'+attemptHistoryHtml(state.iterations,id,state.grading)+'</div>':'')+'</div>'+(next?'<div class="next-action">'+button('다음 단원 →','lesson:'+next.id)+'</div>':'')+'</div>';}
function settings(){return header('학습 기록 관리','현재 학습 기록과 코드 초안은 이 브라우저에만 저장됩니다.','LOCAL DATA')+'<div class="settings-grid"><div class="setting-row"><div><strong>통합 백업</strong><p>학습 상태, 모든 트랙의 코드 초안과 반복 제출 기록을 JSON 파일 하나로 내려받습니다.</p></div><button id="export-progress">전체 백업 다운로드</button></div><div class="setting-row"><div><strong>통합 백업 복원</strong><p>통합 백업과 기존 진도 v1·제출 이력 v1 파일을 불러올 수 있습니다. 복원 전 현재 통합 백업을 보관하세요.</p></div><button id="import-progress">백업 파일 불러오기</button><input type="file" accept=".json,application/json" id="import-file" hidden></div><div class="setting-row"><div><strong>데이터 초기화</strong><p>진도, 퀴즈 결과, 작성한 코드와 제출 이력을 삭제합니다.</p></div><button id="clear-progress">전체 초기화</button></div></div>';}
function nav(){return '<aside class="sidebar"><div class="brand"><span class="brand-mark">W</span><div><strong>CodeWeave</strong><small>LEARN • PRACTICE • BUILD</small></div></div><nav><div class="nav-label">WORKSPACE</div>'+button('⌂  학습 대시보드','dashboard','nav-btn')+'<div class="nav-label">LEARNING TRACKS</div>'+tracks.map(t=>button(t.icon+'  '+t.name,'track:'+t.id,'nav-btn')).join('')+button('⚙  학습 기록 관리','settings','nav-btn')+'<a class="nav-btn" style="text-decoration:none" href="./workbench.html">⌨  반복 제출 연습장</a></nav><div class="side-footer">교과서처럼 깊게 배우고<br>Exercism처럼 직접 풀어 보세요.</div></aside>';}
function render(){const r=state.route;const page=r==='dashboard'?dashboard():r==='settings'?settings():r.startsWith('track:')?trackPage(r.slice(6)):r.startsWith('lesson:')?lessonPage(r.slice(7)):dashboard();$('#app').innerHTML='<div class="layout">'+nav()+'<main class="main"><header class="topbar">CodeWeave / 개인 학습 플랫폼 <span class="pill">MVP 0.1</span></header><div class="content">'+(state.storageMessage?'<p class="notice" role="status">'+safe(state.storageMessage)+'</p>':'')+page+'<footer class="footer">CodeWeave · 개인 학습용 초기 버전 · 상용 교재 원본 미포함</footer></div></main></div>';bind();}
function readVisibleSubmission(id){const exercise=exerciseById(id),editor=$('#code-input');if(!editor)return '';if(exercise?.grader!=='c-multi-file')return editor.value;return serializeMultiFileSubmission([...document.querySelectorAll('[data-code-file]')].map(item=>({name:item.dataset.codeFile,content:item.value})),{requiredNames:exercise.requiredFiles});}
function bind(){document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.route)));
document.querySelectorAll('[data-copy]').forEach(el=>el.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(decodeURIComponent(el.dataset.copy));el.textContent='복사됨';}catch{el.textContent='복사 불가';}}));
document.querySelectorAll('[data-quiz]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.quiz,q=lessonById(id)?.quiz;const selected=Number(el.dataset.choice),grade=scoreChoice(q,selected);state.feedback[id]={...grade,selected};state.progress.results[id]={...grade,selected,at:new Date().toISOString()};if(grade.correct&&!done(id))state.progress.completed.push(id);save(null,false,id);render();}));
document.querySelectorAll('[data-retry]').forEach(el=>el.addEventListener('click',()=>{delete state.feedback[el.dataset.retry];render();}));
const activeLesson=state.route.startsWith('lesson:')?lessonById(state.route.slice(7)):null;
if(activeLesson){
 const current=learningStatus(activeLesson);
 $('#mark-theory')?.addEventListener('click',()=>{updateProgressFlag(activeLesson.id,'theoryRead',!current.theoryRead);render();});
 $('#toggle-review')?.addEventListener('click',()=>{updateProgressFlag(activeLesson.id,'review',!state.progress.review.includes(activeLesson.id));render();});
}
const editor=$('#code-input');if(editor){const id=state.route.slice(7),l=lessonById(id),fileEditors=[...document.querySelectorAll('[data-code-file]')];
 const readSubmission=()=>readVisibleSubmission(id);
 const persistEditors=()=>{try{state.drafts[id]=readSubmission();save(id);}catch(err){state.storageMessage=err.message;}if(state.storageMessage)showStorageMessage();};
 const editors=fileEditors.length?fileEditors:[editor];
 editors.forEach(item=>{item.addEventListener('input',persistEditors);item.addEventListener('keydown',event=>{if(event.key==='Tab'&&!event.shiftKey){event.preventDefault();item.setRangeText('    ',item.selectionStart,item.selectionEnd,'end');item.dispatchEvent(new Event('input'));}});});
 $('#save-code').addEventListener('click',()=>{try{state.drafts[id]=readSubmission();const saved=save(id);state.terminal[id]=saved?'코드가 브라우저에 저장되었습니다. 채점 결과는 아닙니다.':'코드를 저장하지 못했습니다. 현재 코드를 복사하거나 백업하세요.';}catch(err){state.terminal[id]=err.message;}render();});
 $('#reset-code').addEventListener('click',()=>{if(confirm('현재 코드를 처음 상태로 되돌릴까요?')){state.drafts[id]=l.challenge.starter;save(id);delete state.terminal[id];render();}});
 $('#grade-code').addEventListener('click',()=>{try{return grade(l,readSubmission());}catch(err){state.terminal[id]=err.message;render();}});
 bindAttemptRestore(id,readSubmission);
}
$('#export-progress')?.addEventListener('click',()=>{const ids=lessons.map(l=>l.id);const data=createFullBackup({progress:normalizeProgress(safeRead(localStorage,PROGRESS_KEY,{})),drafts:readExerciseDrafts(localStorage,ids),iterations:normalizeIterations(safeRead(localStorage,ITERATIONS_KEY,{}),ids)},ids);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='codeweave-full-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import-progress')?.addEventListener('click',()=>$('#import-file').click());
$('#import-file')?.addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>MAX_BACKUP_FILE_SIZE){alert('백업 파일이 너무 큽니다(최대 5MB).');return;}try{const input=JSON.parse(await f.text()),ids=lessons.map(l=>l.id),attemptIds=lessons.filter(hasPractice).map(l=>l.id),parsed=parseCodeWeaveBackup(input,{knownIds:ids,attemptIds});const label=parsed.format==='full'?'통합 백업':parsed.format==='legacy-progress'?'기존 진도 백업':'기존 제출 이력 백업';if(!confirm(label+'을 복원하면 해당 범위의 현재 기록을 교체합니다. 계속할까요?'))return;const data=restoreCodeWeaveBackup(localStorage,input,{knownIds:ids,attemptIds});state.progress=data.progress;state.drafts=data.drafts;state.iterations=data.iterations;state.feedback={};state.terminal={};state.storageMessage='';render();alert(label+' 복원 완료');}catch(err){alert('백업 복원 실패: '+err.message);}});
$('#clear-progress')?.addEventListener('click',()=>{if(confirm('모든 학습 기록, 코드와 제출 이력을 삭제할까요?')){state.progress={completed:[],results:{},theoryRead:[],review:[]};state.drafts={};state.feedback={};state.terminal={};save(null,true);try{localStorage.removeItem(ITERATIONS_KEY);state.iterations={};}catch{state.storageMessage='제출 이력 삭제에 실패했습니다.';}render();}});
}
function bindAttemptRestore(id,readSubmission=()=>readVisibleSubmission(id)){
 document.querySelectorAll('[data-restore-attempt]').forEach(el=>el.addEventListener('click',()=>{
  if(state.grading)return;
  try{const code=submissionCode(state.iterations,id,Number(el.dataset.restoreAttempt));if(readSubmission()!==code&&!confirm('현재 작성 중인 코드를 이전 제출 코드로 교체할까요?'))return;state.drafts[id]=code;save(id);state.terminal[id]='이전 제출 코드를 복원했습니다. 다시 채점하면 새 제출 기록이 추가됩니다.';render();}catch(err){state.terminal[id]=err.message;render();}
 }));
}
function showStorageMessage(){
 const main=document.querySelector('.content');
 if(!main)return;
 let status=document.querySelector('#storage-status');
 if(!status){status=document.createElement('p');status.id='storage-status';status.className='notice';status.setAttribute('role','status');main.prepend(status);}
 status.textContent=state.storageMessage;
}
async function grade(lesson,code){
 if(state.grading)return;
 state.grading=true;
 const id=lesson.id;
 state.drafts[id]=code;save(id);
 state.terminal[id]='로컬 GCC 채점 서버에 연결하는 중...';render();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const token=document.querySelector('meta[name="codeweave-token"]')?.content ?? '';
  const response=await fetch('./api/grade',{method:'POST',headers:{'Content-Type':'application/json','X-CodeWeave-Token':token},body:JSON.stringify({exerciseId:id,code}),signal:controller.signal});
  if(!response.ok)throw Error('채점 요청 실패 '+response.status);
  const result=await response.json();
  // Keep the actual grading result visible even if browser persistence fails.
  try{state.iterations=recordGradedSubmission(localStorage,lessons.map(l=>l.id),id,code,result);}catch(err){
   if(err.name==='QuotaExceededError'||err.name==='SecurityError'){
    state.storageMessage='채점 결과를 제출 이력에 저장하지 못했습니다. 브라우저 저장 공간을 확인하고 코드를 백업하세요.';
   }else{throw err;}
  }
  state.terminal[id]=formatGradingResult(result);
 }catch(err){state.terminal[id]='채점을 완료하지 못했습니다. 제출 기록을 추가하지 않았습니다. 개인 PC의 Node.js·GCC 로컬 서버 연결을 확인하세요.\n'+err.message;}
 finally{clearTimeout(timer);state.grading=false;render();}
}
window.addEventListener('storage',event=>{
 if(event.key===PROGRESS_KEY||event.key===null)state.progress=normalizeProgress(safeRead(localStorage,PROGRESS_KEY,{}));
 if(event.key===DRAFTS_KEY||event.key===null){
  const editor=$('#code-input'),id=state.route.startsWith('lesson:')?state.route.slice(7):null;
  let activeCode;try{activeCode=id&&editor?readVisibleSubmission(id):undefined;}catch{activeCode=state.drafts[id];}
  state.drafts=readExerciseDrafts(localStorage,lessons.map(l=>l.id));
  if(id&&activeCode!==undefined)state.drafts[id]=activeCode;
 }

 if(event.key===ITERATIONS_KEY||event.key===null){
  state.iterations=normalizeIterations(safeRead(localStorage,ITERATIONS_KEY,{}),lessons.map(l=>l.id));
  const history=$('#attempt-history-container');
  if(history){const id=state.route.slice(7);history.innerHTML=attemptHistoryHtml(state.iterations,id,state.grading);bindAttemptRestore(id);}
 }
});
window.addEventListener('hashchange',()=>{const route=location.hash.slice(1)||'dashboard';if(route!==state.route){state.route=route;render();}});
render();
if('serviceWorker' in navigator&&(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname)))navigator.serviceWorker.register('./sw.js').catch(()=>{});
