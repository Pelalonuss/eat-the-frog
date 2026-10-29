// Trainer-Zugang freischalten: Eintrag admins/{uid} in Firestore (mit der angemeldeten Firebase-CLI)
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
const [uid, name, standort] = process.argv.slice(2);
(async ()=>{
  const acc = getGlobalDefaultAccount();
  await requireAuth({ project:'eat-the-frog-26dd1', user: acc.user, tokens: acc.tokens });
  const c = new Client({ urlPrefix:'https://firestore.googleapis.com', apiVersion:'v1', auth:true });
  const path = `/projects/eat-the-frog-26dd1/databases/(default)/documents/admins/${uid}`;
  const r = await c.request({ method:'PATCH', path, body:{ fields:{ name:{ stringValue:name }, standort:{ stringValue:standort } } } });
  console.log('gesetzt:', r.status, JSON.stringify(r.body.fields));
  const l = await c.request({ method:'GET', path:'/projects/eat-the-frog-26dd1/databases/(default)/documents/admins' });
  console.log('alle admins:', (l.body.documents||[]).map(d=> d.name.split('/').pop() + '=' + JSON.stringify(d.fields)).join(' | '));
})().catch(e=>{ console.error('FEHLER', e.message); process.exit(1); });
