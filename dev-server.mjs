import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

// IMPORTANT: trusted local development only. Compiled student programs are not sandboxed.
// This binds only to loopback and MUST NOT be put directly on a public network.
const HOST='127.0.0.1';
const PORT=Number(process.env.PORT || 4173);
const ROOT=process.cwd();
const extensions={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'};
const cases={
 'c-hello': [{input:'',expected:'Hello, CodeWeave!'}],
 'c-types': [{input:'4 7\n',expected:'11'},{input:'-5 2\n',expected:'-3'},{input:'0 0\n',expected:'0'}],
 'c-loops': [{input:'5\n',expected:'15'},{input:'0\n',expected:'0'},{input:'10\n',expected:'55'}],
 'c-array': [{input:'5\n2 9 -3 4 1\n',expected:'9'},{input:'1\n-12\n',expected:'-12'},{input:'4\n-9 -3 -5 -10\n',expected:'-3'}],
 'c-pointer': [{input:'7\n',expected:'8'},{input:'-4\n',expected:'-3'},{input:'0\n',expected:'1'}]
};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
let busy=false;
async function grade(req,res){
 if(busy)return send(res,429,{ok:false,message:'다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.'});
 const chunks=[];let size=0,ownsSlot=false;
 try{for await(const chunk of req){size+=chunk.length;if(size>40_000)return send(res,413,{ok:false,message:'요청 크기가 너무 큽니다.'});chunks.push(chunk)};
 let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{ok:false,message:'잘못된 JSON입니다.'});}
 const {code,exerciseId}=value??{};
 if(typeof code!=='string'||code.length>25_000||!Array.isArray(cases[exerciseId]))return send(res,400,{ok:false,message:'지원하지 않는 문제 또는 코드 길이입니다.'});
 if(busy)return send(res,429,{ok:false,message:'다른 코드를 채점하고 있어요. 잠시 후 다시 시도하세요.'});
 busy=true;ownsSlot=true;
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'codeweave-'));
 let result;
 try{
 const source=path.join(dir,'submission.c'),binary=path.join(dir,process.platform==='win32'?'submission.exe':'submission');await fs.writeFile(source,code,'utf8');
 const compile=spawnSync('gcc',['-std=c11','-Wall','-Wextra','-O0',source,'-o',binary],{timeout:4500,maxBuffer:80_000,encoding:'utf8'});
 if(compile.error||compile.status!==0){result={ok:false,message:'컴파일 실패',compileOutput:(compile.stderr||compile.error?.message||'').slice(0,3000),tests:[]};}
 else{
 const tests=[];for(const tc of cases[exerciseId]){
 const out=spawnSync(binary,[],{input:tc.input,encoding:'utf8',timeout:1300,maxBuffer:30_000,cwd:dir});
 const actual=(out.stdout||'').trim();const expected=tc.expected.trim();
 tests.push({passed:!out.error&&out.status===0&&actual===expected,detail:out.error?.code==='ETIMEDOUT'?'시간 제한 초과':out.error?'실행 오류':out.status!==0?'비정상 종료 ('+out.status+')':actual===expected?'출력 일치':'예상: '+expected+'; 실제: '+(actual.slice(0,100)||'(없음)')});
 }
 result={ok:tests.every(x=>x.passed),message:tests.filter(x=>x.passed).length+'/'+tests.length+'개 테스트 통과',tests,compileOutput:compile.stderr?.slice(0,1000)};
 }
 }finally{await fs.rm(dir,{force:true,recursive:true});busy=false;ownsSlot=false;}
 // Release the grading slot and finish cleanup before the client can resubmit.
 return send(res,200,result);
 }catch(error){if(ownsSlot)busy=false;return send(res,500,{ok:false,message:'서버 오류: '+error.message});}
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/grade')return req.method==='POST'?grade(req,res):send(res,405,{ok:false,message:'POST 요청만 가능합니다.'});
 if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{ok:false,message:'허용되지 않은 요청입니다.'});
 let clean;try{clean=decodeURIComponent(url.pathname);}catch{return send(res,400,{ok:false,message:'잘못된 경로입니다.'});}
 const localPath=path.resolve(ROOT,'.'+(clean==='/'?'/index.html':clean));
 if(!localPath.startsWith(ROOT+path.sep)&&localPath!==ROOT)return send(res,403,{ok:false,message:'허용되지 않은 경로입니다.'});
 try{const stat=await fs.stat(localPath);if(!stat.isFile())throw Error('not file');res.writeHead(200,{'Content-Type':extensions[path.extname(localPath)]||'application/octet-stream','Content-Length':stat.size});if(req.method==='HEAD')return res.end();createReadStream(localPath).pipe(res);}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('File not found');}
});
server.listen(PORT,HOST,()=>console.log('CodeWeave local learning app: http://'+HOST+':'+server.address().port+'\n주의: C 코드 실행은 격리되지 않은 개인 PC용 개발 기능입니다. 공용 서버로 배포하지 마세요.'));
