// gemeinsamer Speicher für den Test-Nachbau: { users:{email:{uid,pass,displayName}}, cur:uid|null, docs:{'col/id':{...}} }
const KEY = 'fbmock';
export const load = ()=>{ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } };
export function db(){ const d = load(); d.users ||= {}; d.docs ||= {}; return d; }
export function save(d){ try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){ console.warn('fbmock: Speicher voll', e); } }
export const later = v=> new Promise(ok=> setTimeout(()=> ok(v), 40));
// Feedback-Einträge nur im Speicher halten (Bilder sind gross) und zum Nachschauen bereitstellen
export const FEEDBACK = (window.__fbmockFeedback ||= []);
