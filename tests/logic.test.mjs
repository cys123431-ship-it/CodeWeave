import test from 'node:test';
import assert from 'node:assert/strict';
import {tracks,lessons} from '../src/catalog.js';
import {normalizeProgress,percentDone,scoreChoice,validateImport,escapeHtml} from '../src/logic.js';

test('all four requested study tracks exist',()=>assert.deepEqual(tracks.map(x=>x.id),['c','rust','ds','algo']));
test('lesson ids are unique and track references valid',()=>{const ids=lessons.map(x=>x.id);assert.equal(ids.length,new Set(ids).size);for(const lesson of lessons){assert.ok(tracks.some(t=>t.id===lesson.track));assert.ok(lesson.sections.length>=2);assert.ok(lesson.quiz.options[lesson.quiz.answer]);assert.ok(lesson.challenge.starter);}});
test('quiz grading uses exact choice index',()=>{const q={options:['one','two'],answer:1,explanation:'because'};assert.deepEqual(scoreChoice(q,1),{correct:true,explanation:'because'});assert.equal(scoreChoice(q,0).correct,false);});
test('progress never exceeds 100 percent',()=>{assert.equal(percentDone([{id:'a'},{id:'b'}],['a','a','b','unexpected']),100);assert.equal(percentDone([],['a']),0);});
test('progress parser removes duplicate records',()=>assert.deepEqual(normalizeProgress({completed:['a','a',null,'b']}),{completed:['a','b'],results:{}}));
test('backup format is validated and unknown lesson ids filtered',()=>{const r=validateImport({app:'CodeWeave',version:1,progress:{completed:['c-hello','fake']},drafts:{'c-hello':'hello','fake':'x'}},['c-hello']);assert.deepEqual(r.progress.completed,['c-hello']);assert.deepEqual(r.drafts,{'c-hello':'hello'});assert.throws(()=>validateImport({app:'unknown'},[]));});
test('code snippets are HTML-escaped',()=>assert.equal(escapeHtml('<stdio.h> & "q"'),'&lt;stdio.h&gt; &amp; &quot;q&quot;'));
