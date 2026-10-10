import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseNotes} from './release-notes.mjs';
test('Publication uses only the matching stable changelog section',()=>{
 const notes='# Changes\n\n## 2.4.0 — 10 October\n\nCurrent changes\n### Details\nMore\n\n## 2.3.1 — 9 October\nOld changes';
 assert.equal(releaseNotes(notes,'2.4.0'),'Current changes\n### Details\nMore');
 assert.equal(releaseNotes(notes,'2.3.1'),'Old changes');
 assert.throws(()=>releaseNotes(notes,'2.5.0'),/Missing stable/);
 assert.throws(()=>releaseNotes(notes,'../../file'),/Invalid/);
});
test('Draft or empty release notes cannot publish a stable update',()=>{
 assert.throws(()=>releaseNotes('## 2.4.0 — черновик\nUnpublished','2.4.0'),/Missing stable/);
 assert.throws(()=>releaseNotes('## 2.4.0 — 10 October\n\n','2.4.0'),/Empty/);
});
