import { db, save, later, FEEDBACK } from './store.js';
const clone = v=> v === undefined ? v : JSON.parse(JSON.stringify(v));
export function getFirestore(){ return {}; }
export const doc = (_, col, id)=> ({ path:col + '/' + id, id });
export const collection = (_, col)=> ({ col });
export const where = (f, op, v)=> ({ f, op, v });
export const query = (c, ...w)=> ({ col:c.col, w });
export async function getDoc(ref){ const d = db().docs[ref.path]; return later({ id:ref.id, exists:()=> d !== undefined, data:()=> clone(d) }); }
export async function setDoc(ref, data){ if(window.__fbmockFailSave) throw new Error('fbmock: Speichern absichtlich fehlgeschlagen');
  const d = db(); d.docs[ref.path] = clone(data); save(d); return later(); }
export async function addDoc(c, data){
  if(window.__fbmockFailSave) { await new Promise(r=> setTimeout(r, 300)); throw new Error('fbmock: Speichern absichtlich fehlgeschlagen'); }
  const id = 'fb' + Math.random().toString(36).slice(2, 12);
  if(c.col === 'feedback') FEEDBACK.push({ id, ...clone(data) }); else { const d = db(); d.docs[c.col + '/' + id] = clone(data); save(d); }
  return later({ id }); }
export async function getDocs(q){ const d = db(), pre = q.col + '/';
  const docs = Object.entries(d.docs).filter(([k])=> k.startsWith(pre) && !k.slice(pre.length).includes('/'))
    .filter(([, v])=> (q.w || []).every(w=> w.op === '==' ? v[w.f] === w.v : true))
    .map(([k, v])=> ({ id:k.slice(pre.length), data:()=> clone(v) }));
  return later({ docs }); }
