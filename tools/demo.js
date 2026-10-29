// Demo-Teilnehmende für die Trainer-Statistik (Doc-IDs beginnen mit «demo-», Feld demo:true)
// node demo.js add   → anlegen / neu erzeugen
// node demo.js del   → alle Demo-Teilnehmenden löschen
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
const BASE = '/projects/eat-the-frog-26dd1/databases/(default)/documents';

// ---- Firestore-Werte ----
function val(v){
  if(v === null || v === undefined) return { nullValue:null };
  if(typeof v === 'boolean') return { booleanValue:v };
  if(typeof v === 'number') return Number.isInteger(v) ? { integerValue:String(v) } : { doubleValue:v };
  if(typeof v === 'string') return { stringValue:v };
  if(Array.isArray(v)) return { arrayValue:{ values:v.map(val) } };
  return { mapValue:{ fields:Object.fromEntries(Object.entries(v).map(([k,x])=> [k, val(x)])) } };
}

// ---- Zufall mit festem Startwert (immer gleiche Demo-Daten) ----
let seed = 42; const rnd = ()=>{ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = a=> a[Math.floor(rnd() * a.length)];
const pad = n=> String(n).padStart(2,'0');
const isoOf = d=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const WD = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const today = new Date(); today.setHours(12,0,0,0);
const day = n=>{ const d = new Date(today); d.setDate(d.getDate() - n); return d; };

const POOL = [
  ['Bewerbung schreiben', 60, 1,1,1,0], ['Stelleninserate durchsehen', 30, 1,0,1,0], ['Lebenslauf aktualisieren', 45, 1,0,0,0],
  ['E-Mails beantworten', 20, 0,1,0,1], ['Telefonat mit RAV-Berater', 15, 1,1,0,0], ['Motivationsschreiben überarbeiten', 45, 1,0,1,0],
  ['Einkaufen', 30, 0,1,0,0], ['Wohnung aufräumen', 40, 0,0,0,0], ['Arzttermin vereinbaren', 10, 1,1,0,0],
  ['Deutsch-Hausaufgaben', 45, 1,0,0,0], ['Spazieren gehen', 30, 1,0,0,0], ['Wäsche machen', 30, 0,1,0,0],
  ['Social Media', 30, 0,0,0,1], ['Unterlagen sortieren', 30, 0,1,0,1], ['Zeugnisse kopieren', 20, 0,1,0,0],
  ['Online-Kurs Excel', 60, 1,0,1,0], ['Rechnungen bezahlen', 15, 1,1,0,0], ['Netflix', 60, 0,0,0,1]
];
const GOOD = ['🐸 Frosch zuerst erledigt','⏰ Pünktlich angefangen','☕ Pausen gemacht','🎯 Fokus gehalten','✅ Mehr geschafft als gedacht','📵 Weniger am Handy',
  'Bewerbung endlich abgeschickt!','Gutes Gespräch mit dem Berater','Früh aufgestanden','Ruhig geblieben, obwohl viel los war'];

// Personen: Standort, wie zuverlässig, Tage ohne Aktivität am Ende, Anzahl Tage, Dauerbrenner
const PEOPLE = [
  ['Anna Keller','olten',.88,0,24,null,.8],
  ['Marco Bianchi','olten',.62,0,22,'Steuererklärung ausfüllen',.4],
  ['Sara Meier','olten',.92,0,25,null,.95],
  ['Luca Rossi','olten',.34,1,16,'Bewerbung an Migros schicken',.15],
  ['Elif Yilmaz','olten',.7,8,18,null,.5],
  ['Jonas Frei','olten',.75,0,2,null,.5],
  ['Nina Huber','olten',.58,2,14,'Wohnung kündigen',.3],
  ['Tim Schneider','olten',.48,0,11,'Zahnarzt anrufen',.2],
  ['Laura Brunner','solothurn',.8,0,20,null,.7],
  ['David Steiner','solothurn',.45,5,12,'Lebenslauf übersetzen',.3],
  ['Mia Gerber','brugg',.85,0,19,null,.8],
  ['Kevin Baumann','brugg',.55,0,15,'Velo reparieren',.35],
  ['Lea Fischer','wohlen',.7,0,17,null,.6]
];

function person(i, [name, ort, rate, idle, n, stuck, abend]){
  const h = {}, active = [];
  let carry = [], plan = null, made = 0;
  for(let back = 40; back >= idle && made < n + 40; back--){
    const d = day(back); if([0,6].includes(d.getDay())) continue;
    if(back > idle + n * 1.45) continue;                     // erst später angefangen
    if(back > idle && rnd() < .12) continue;                 // ab und zu ein Tag ohne Plan
    const iso = isoOf(d);
    const tasks = carry.map(t=> ({ ...t, done:false, moved:(t.moved||0) + 1, tomorrow:'' }));
    if(stuck && !tasks.some(t=> t.text===stuck) && made === 1) tasks.push({ text:stuck, min:'45', w:true, d:false, lever:false, snail:false, decided:true, done:false, moved:0, at:'', tomorrow:'' });
    const want = 3 + Math.floor(rnd() * 3);
    while(tasks.length < want){
      const [text, min, w, dd, lever, snail] = pick(POOL);
      if(tasks.some(t=> t.text===text)) continue;
      tasks.push({ text, min:String(min), w:!!w, d:!!dd, lever:!!lever, snail:!!snail, decided:true, done:false, moved:0, at:'', tomorrow:'' });
    }
    const frogT = tasks.find(t=> t.text===stuck) || tasks.find(t=> t.w && t.lever) || tasks.find(t=> t.w);
    tasks.forEach(t=>{
      let p = rate; if(t===frogT) p = Math.min(.97, rate + .1); if(!t.w && !t.d) p = rate * .4;
      if(t.text===stuck) p = (t.moved||0) >= 5 ? .6 : .08;
      t.done = back === 0 && rnd() < .45 ? false : rnd() < p;   // heute: noch nicht alles fertig
    });
    const hours = pick([4,5,5.5,6,6,7,8]);
    const good = rnd() < abend ? pick(GOOD) + (rnd() < .3 ? '\n' + pick(GOOD) : '') : '';
    h[iso] = { iso, day:WD[d.getDay()], name, hours, frog: frogT ? frogT.text : '', tasks, good: back === 0 ? '' : good, take:'', updated: new Date(d.getTime() + 8*3600e3).toISOString() };
    active.push(iso); made++;
    carry = tasks.filter(t=> !t.done && (t.w || t.d));
    if(back === idle) plan = { iso, tasks, hours, frog: frogT ? frogT.text : '' };
  }
  const last = active[active.length-1];
  const p = plan || { iso:last, tasks:[], hours:6, frog:'' };
  return {
    app:'alpen-tagesplan', kind:'cloud', version:1, demo:true, role:'teilnehmer', standort:ort, name, owner:name,
    email: name.toLowerCase().replace(/ /g,'.').replace(/[^a-z.]/g,'') + '@demo.ch',
    saved: h[last].updated, written: h[last].updated, updatedAt: h[last].updated,
    prefs:{ prolog:true, tours:['planen','heute','abend'] },
    stats:{ logins: Math.round(active.length * (1.2 + rnd())), lastLogin: h[last].updated, activeDays: active },
    plan:{ v:2, iso:p.iso, abend:false, planned:true, tasks:p.tasks,
      f:{ nameIn:name, dateIn:'', dayIn:'', availIn:String(p.hours).replace('.',','), focusInput:p.frog, goodIn:'', takeIn:'', noteIn:'' } },
    history: h
  };
}

(async ()=>{
  const acc = getGlobalDefaultAccount();
  await requireAuth({ project:'eat-the-frog-26dd1', user:acc.user, tokens:acc.tokens });
  const c = new Client({ urlPrefix:'https://firestore.googleapis.com', apiVersion:'v1', auth:true });
  const mode = process.argv[2];
  if(mode === 'del'){
    const l = await c.request({ method:'GET', path:BASE + '/users', queryParams:{ pageSize:'300' } });
    const demo = (l.body.documents||[]).map(d=> d.name.split('/').pop()).filter(id=> id.startsWith('demo-'));
    for(const id of demo) await c.request({ method:'DELETE', path:BASE + '/users/' + id });
    console.log('gelöscht:', demo.length, 'Demo-Teilnehmende'); return;
  }
  for(let i=0; i<PEOPLE.length; i++){
    const doc = person(i, PEOPLE[i]);
    const id = 'demo-' + (i+1);
    await c.request({ method:'PATCH', path:BASE + '/users/' + id, body:{ fields:Object.fromEntries(Object.entries(doc).map(([k,v])=> [k, val(v)])) } });
    const days = Object.keys(doc.history).length, moved = Math.max(0, ...Object.values(doc.history).flatMap(r=> r.tasks.map(t=> t.moved||0)));
    console.log(`${id}  ${doc.name.padEnd(16)} ${doc.standort.padEnd(10)} ${String(days).padStart(2)} Tage, max. ${moved}× verschoben, zuletzt ${doc.updatedAt.slice(0,10)}`);
  }
})().catch(e=>{ console.error('FEHLER', e.message); process.exit(1); });
