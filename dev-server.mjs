import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { openLearningFile, parseRequestPath } from './server/static-files.mjs';
import { gradingExercises } from './server/grading-exercises.mjs';
import { parseMultiFileSubmission } from './src/multi-file.js';
import { classifyCompilerDiagnostic } from './src/compiler-feedback.js';
import { runSubmission } from './server/run-submission.mjs';
import { MAX_CODE_LENGTH } from './src/iterations.js';

// IMPORTANT: trusted local development only. Compiled student programs are not sandboxed.
// This binds only to loopback and MUST NOT be put directly on a public network.
const HOST='127.0.0.1';
const PORT=Number(process.env.PORT || 4173);
const ROOT=process.cwd();
// Keep the existing UTF-16 code length contract; bound UTF-8 JSON bytes separately.
const MAX_REQUEST_BYTES = MAX_CODE_LENGTH * 4 + 4096;
const gradeToken = randomBytes(32);
const tokenMeta = '  <meta name="codeweave-token" content="' + gradeToken.toString('hex') + '">\n';
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
function headerCount(req, name) {
  let count = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (req.rawHeaders[i].toLowerCase() === name) count++;
  }
  return count;
}
function singleHeader(req, name) {
  return headerCount(req, name) === 1 ? req.headers[name] : undefined;
}
function localAuthorities() {
  const port = server.address().port;
  return ['127.0.0.1:' + port, 'localhost:' + port];
}
function hasLocalHost(req) {
  return localAuthorities().includes(singleHeader(req, 'host'));
}
function authorizeGrade(req, res) {
  if (singleHeader(req, 'content-type') !== 'application/json') {
    send(res, 415, { ok: false, message: 'Content-Type은 application/json이어야 합니다.' });
    return false;
  }
  if (!hasLocalHost(req)) {
    send(res, 403, { ok: false, message: '허용되지 않은 Host입니다.' });
    return false;
  }
  const origins = localAuthorities().map(host => 'http://' + host);
  if (headerCount(req, 'origin') > 0 && !origins.includes(singleHeader(req, 'origin'))) {
    send(res, 403, { ok: false, message: '허용되지 않은 Origin입니다.' });
    return false;
  }
  const token = singleHeader(req, 'x-codeweave-token');
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token) ||
      !timingSafeEqual(Buffer.from(token, 'hex'), gradeToken)) {
    send(res, 403, { ok: false, message: '채점 토큰이 없거나 만료되었습니다. 페이지를 새로고침하세요.' });
    return false;
  }
  return true;
}
let busy=false;
async function grade(req,res){
 if(!authorizeGrade(req,res))return;
 if(busy)return send(res,429,{ok:false,message:'다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.'});
 const chunks=[];let size=0,ownsSlot=false;
 try{for await(const chunk of req){size+=chunk.length;if(size>MAX_REQUEST_BYTES)return send(res,413,{ok:false,message:'요청 크기가 너무 큽니다.'});chunks.push(chunk)};
 let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{ok:false,message:'잘못된 JSON입니다.'});}
 const {code,exerciseId}=value??{};
 const exercise=gradingExercises.get(exerciseId);
 if(typeof code!=='string'||code.length>MAX_CODE_LENGTH||!exercise)return send(res,400,{ok:false,message:'지원하지 않는 문제 또는 코드 길이입니다.'});
 let submittedFiles=null;
 if(exercise.grader==='c-multi-file'){
   try{submittedFiles=parseMultiFileSubmission(code,{requiredNames:exercise.requiredFiles});}
   catch(error){return send(res,400,{ok:false,message:error.message});}
 }
 if(busy)return send(res,429,{ok:false,message:'다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.'});
 busy=true;ownsSlot=true;
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'codeweave-'));
 let result;
 try{
 const source=path.join(dir,'submission.c'),binary=path.join(dir,process.platform==='win32'?'submission.exe':'submission');
 const sources=[];
 if(exercise.grader==='c-multi-file'){
   for(const file of submittedFiles){const filename=path.join(dir,file.name);await fs.writeFile(filename,file.content,'utf8');if(file.name.endsWith('.c'))sources.push(filename);}
 }else{await fs.writeFile(source,code,'utf8');sources.push(source);}
 if(exercise.grader==='c-function'){
   const harness=path.join(dir,'harness.c');
   await fs.writeFile(harness,exercise.harness,'utf8');
   sources.push(harness);
 }
 const compile=spawnSync('gcc',['-std=c11','-Wall','-Wextra','-O0','-I',dir,...sources,...exercise.linkArgs,'-o',binary],{timeout:4500,maxBuffer:80_000,encoding:'utf8'});
 if(compile.error||compile.status!==0){const compileOutput=(compile.stderr||compile.error?.message||'').slice(0,3000);result={ok:false,message:'0/'+exercise.cases.length+'개 테스트 통과 · 컴파일 실패',compileOutput,compilerFeedback:classifyCompilerDiagnostic({output:compileOutput,error:compile.error}),tests:exercise.cases.map(()=>({passed:false,detail:'미실행'}))};}
 else{
 const tests=[];for(const tc of exercise.cases){
 const out=await runSubmission(binary,tc.args,{input:exercise.grader==='c-function'?'':tc.input,cwd:dir});
 const actual=(out.stdout||'').trim();const expected=tc.expected.trim();
 const fatal=Boolean(out.error)||out.status!==0;
 tests.push({passed:!fatal&&actual===expected,detail:out.error?.code==='ETIMEDOUT'?'시간 제한 초과':out.error?'실행 오류':out.status!==0?'비정상 종료 ('+(out.signal||out.status)+')':actual===expected?'출력 일치':'예상: '+expected+'; 실제: '+(actual.slice(0,100)||'(없음)')});
 // Keep the declared case set visible without executing after a fatal failure.
 if(fatal){tests.push(...exercise.cases.slice(tests.length).map(()=>({passed:false,detail:'미실행'})));break;}
 }
 result={ok:tests.every(x=>x.passed),message:tests.filter(x=>x.passed).length+'/'+exercise.cases.length+'개 테스트 통과',tests,compileOutput:compile.stderr?.slice(0,1000)};
 }
 }finally{await fs.rm(dir,{force:true,recursive:true});busy=false;ownsSlot=false;}
 // Release the grading slot and finish cleanup before the client can resubmit.
 return send(res,200,result);
 }catch(error){if(ownsSlot)busy=false;return send(res,500,{ok:false,message:'서버 오류: '+error.message});}
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 const pathname=parseRequestPath(req.url);
 if(pathname===null)return send(res,400,{ok:false,message:'잘못된 경로입니다.'});
 if(pathname==='/api/grade')return req.method==='POST'?grade(req,res):send(res,405,{ok:false,message:'POST 요청만 가능합니다.'});
 if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{ok:false,message:'허용되지 않은 요청입니다.'});
 if(!hasLocalHost(req))return send(res,403,{ok:false,message:'허용되지 않은 Host입니다.'});
 let file;
 try{
   file=await openLearningFile(ROOT,pathname);
   if(!file)throw Error('not public');
   if(res.destroyed){await file.handle.close();return;}
   if (file.contentType.startsWith('text/html')) {
     const html = await file.handle.readFile('utf8');
     await file.handle.close();
     const page = Buffer.from(html.replace('</head>', tokenMeta + '</head>'));
     res.writeHead(200, {
       'Content-Type': file.contentType,
       'Content-Length': page.length,
       'Cache-Control': 'no-store'
     });
     return res.end(req.method === 'HEAD' ? undefined : page);
   }
   if(req.method==='HEAD'){
     await file.handle.close();
     res.writeHead(200,{'Content-Type':file.contentType,'Content-Length':file.size});
     return res.end();
   }
   const stream=file.handle.createReadStream();
   stream.on('error',()=>res.destroy());
   res.on('close',()=>stream.destroy());
   res.writeHead(200,{'Content-Type':file.contentType,'Content-Length':file.size});
   stream.pipe(res);
 }catch{
   if(file)await file.handle.close().catch(()=>{});
   if(res.headersSent)return res.destroy();
   res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('File not found');
 }
});
server.listen(PORT,HOST,()=>console.log('CodeWeave local learning app: http://'+HOST+':'+server.address().port+'\n주의: C 코드 실행은 격리되지 않은 개인 PC용 개발 기능입니다. 공용 서버로 배포하지 마세요.'));
