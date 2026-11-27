import { db, save, later } from './store.js';
const cbs = [];
const userOf = uid=>{ const d = db(); const e = Object.keys(d.users).find(k=> d.users[k].uid === uid); return e ? { uid, email:e, displayName:d.users[e].displayName || null } : null; };
const fire = auth=>{ auth.currentUser = userOf(db().cur); cbs.forEach(cb=> cb(auth.currentUser)); };
const err = code=> Object.assign(new Error(code), { code });
export function getAuth(){ return { currentUser:null, languageCode:'de' }; }
export function onAuthStateChanged(auth, cb){ cbs.push(cb); setTimeout(()=> fire(auth), 30); return ()=>{}; }
export async function signInWithEmailAndPassword(auth, e, p){ const d = db(), u = d.users[e];
  if(!u || u.pass !== p) throw err('auth/invalid-credential'); d.cur = u.uid; save(d); fire(auth); return later({ user:auth.currentUser }); }
export async function createUserWithEmailAndPassword(auth, e, p){ const d = db();
  if(d.users[e]) throw err('auth/email-already-in-use'); if((p||'').length < 6) throw err('auth/weak-password');
  const uid = 'mock' + Math.random().toString(36).slice(2, 10); d.users[e] = { uid, pass:p }; d.cur = uid; save(d); fire(auth); return later({ user:auth.currentUser }); }
export async function updateProfile(user, { displayName }){ const d = db(); d.users[user.email].displayName = displayName; save(d); user.displayName = displayName; return later(); }
export async function sendPasswordResetEmail(){ return later(); }
export async function signOut(auth){ const d = db(); d.cur = null; save(d); fire(auth); return later(); }
