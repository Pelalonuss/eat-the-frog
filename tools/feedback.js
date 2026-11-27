// F2-Feedback abholen: neue Einträge aus Firestore «feedback» → <Ziel>/<Sitzung>_<Name>/
//   NN_bild.jpg, NN_bemalt.jpg, BERICHT.md (alle Notizen + Zustand + Fehlermeldungen), notizen.json (für spätere Läufe)
// node feedback.js [Zielordner] [--alle]
//   Zielordner: Standard /Users/patrikkadar/Downloads/Alpen-Tagesplan/feedback
//   --alle: auch schon abgeholte Einträge nochmals holen
// Abgeholte Einträge bekommen abgeholt:true (in Firestore), damit sie nicht doppelt kommen.
const fs = require('fs'), path = require('path');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
const P = 'eat-the-frog-26dd1', BASE = `/projects/${P}/databases/(default)/documents`;
const args = process.argv.slice(2), ALLE = args.includes('--alle');
const ZIEL = args.find(a=> !a.startsWith('--')) || '/Users/patrikkadar/Downloads/Alpen-Tagesplan/feedback';

const val = v=> v == null ? v : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue
  : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : 'arrayValue' in v ? (v.arrayValue.values || []).map(val)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x])=> [k, val(x)])) : Object.values(v)[0];
const slug = s=> (s || 'ohne-name').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
const nr2 = n=> String(n).padStart(2, '0');

function bericht(meta, notizen){
  const n0 = notizen[0] || meta;
  let t = `# Feedback ${meta.sitzung}\n\nVon **${n0.name || '?'}** (${n0.email || '–'}) · ${n0.rolle === 'trainer' ? 'Trainer-Zugang' : 'Teilnehmer/in'} · Standort ${n0.standort || '–'}\n`;
  t += `Status: ${meta.uebergeben ? `**übergeben** (${meta.anzahl} Notizen, ${meta.uebergebenAm})` : '**noch nicht übergeben** (es können noch Notizen dazukommen)'}\n`;
  for(const e of notizen){
    t += `\n## Notiz ${nr2(e.nr)}\n${e.notiz || '_(keine Notiz, nur Bild)_'}\n\n`;
    t += `- Bild: \`${nr2(e.nr)}_bemalt.jpg\` (ohne Striche: \`${nr2(e.nr)}_bild.jpg\`) · ${e.striche || 0} Striche\n`;
    t += `- Erstellt: ${new Date(e.erstellt).toLocaleString('de-CH')}\n`;
    if(e.zustand) t += `- Zustand:\n${e.zustand.split('\n').map(l=> '  - ' + l).join('\n')}\n`;
  }
  const fehler = [...new Set(notizen.flatMap(e=> e.fehler || []))].slice(-20);
  t += `\n## Fehlermeldungen der Seite (letzte)\n\`\`\`\n${fehler.length ? fehler.join('\n') : '(keine)'}\n\`\`\`\n`;
  return t;
}

(async ()=>{
  const acc = getGlobalDefaultAccount();
  await requireAuth({ project:P, user:acc.user, tokens:acc.tokens });
  const c = new Client({ urlPrefix:'https://firestore.googleapis.com', apiVersion:'v1', auth:true });
  const docs = []; let tok = '';
  do{ const r = await c.request({ method:'GET', path:BASE + '/feedback', queryParams:{ pageSize:'50', ...(tok ? { pageToken:tok } : {}) } });
    (r.body.documents || []).forEach(d=> docs.push({ id:d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v])=> [k, val(v)])) }));
    tok = r.body.nextPageToken; }while(tok);
  const neu = docs.filter(d=> ALLE || !d.abgeholt);
  if(!neu.length){ console.log(`Kein neues Feedback (insgesamt ${docs.length} Einträge in der Datenbank).`); return; }
  // nach Sitzung gruppieren (uid + sitzung)
  const gruppen = {};
  for(const d of neu){ const k = d.uid + '|' + d.sitzung; (gruppen[k] ||= []).push(d); }
  for(const [k, liste] of Object.entries(gruppen)){
    const erste = liste.find(d=> d.typ === 'notiz') || liste[0];
    const ordner = path.join(ZIEL, `${erste.sitzung}_${slug(erste.name)}`);
    fs.mkdirSync(ordner, { recursive:true });
    const metaPfad = path.join(ordner, 'notizen.json');
    const meta = fs.existsSync(metaPfad) ? JSON.parse(fs.readFileSync(metaPfad, 'utf8')) : { sitzung:erste.sitzung, uid:erste.uid, notizen:[] };
    let neueNotizen = 0;
    for(const d of liste.sort((a, b)=> (a.erstellt || '').localeCompare(b.erstellt || ''))){
      if(d.typ === 'uebergeben'){ Object.assign(meta, { uebergeben:true, anzahl:d.anzahl, uebergebenAm:new Date(d.erstellt).toLocaleString('de-CH') }); continue; }
      for(const [feld, datei] of [['bild', '_bild.jpg'], ['bemalt', '_bemalt.jpg']]){
        const m = /^data:image\/\w+;base64,(.*)$/.exec(d[feld] || '');
        if(m) fs.writeFileSync(path.join(ordner, nr2(d.nr) + datei), Buffer.from(m[1], 'base64'));
      }
      const { bild, bemalt, ...rest } = d;
      meta.notizen = meta.notizen.filter(n=> n.nr !== d.nr).concat(rest).sort((a, b)=> a.nr - b.nr);
      neueNotizen++;
    }
    fs.writeFileSync(metaPfad, JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(ordner, 'BERICHT.md'), bericht(meta, meta.notizen));
    console.log(`${ordner}\n   ${neueNotizen} neue Notiz(en), insgesamt ${meta.notizen.length} · ${meta.uebergeben ? 'ÜBERGEBEN' : 'noch offen'} · von ${erste.name} (${erste.rolle})`);
  }
  // als abgeholt markieren
  for(const d of neu) if(!d.abgeholt)
    await c.request({ method:'PATCH', path:`${BASE}/feedback/${d.id}`, queryParams:{ 'updateMask.fieldPaths':'abgeholt' }, body:{ fields:{ abgeholt:{ booleanValue:true } } } });
  console.log(`Fertig: ${neu.length} Einträge abgeholt.`);
})().catch(e=>{ console.error('FEHLER', e.message); process.exit(1); });
