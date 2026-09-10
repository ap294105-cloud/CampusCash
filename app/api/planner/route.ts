import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { nextDue, validDate } from '@/lib/student-planner';
const fail = (error: string, status = 400) => Response.json({ error }, { status });
export async function GET() {
 const user = await getChatGPTUser(); if (!user) return fail('Please sign in.', 401);
 try {
  const rows = await env.DB.prepare('SELECT id, kind, payload FROM student_planner_items WHERE user_id = ?').bind(user.userId).all<{id:string;kind:string;payload:string}>();
  return Response.json(rows.results.map(r => ({ ...JSON.parse(r.payload), id:r.id, kind:r.kind })), {headers:{'Cache-Control':'no-store'}});
 } catch { return fail('Your planner could not be loaded. Please retry.', 503); }
}
export async function POST(request: Request) {
 const user = await getChatGPTUser(); if (!user) return fail('Please sign in.',401);
 try {
  const b = await request.json() as Record<string, any>; const db = env.DB;
  if (b.action === 'create') {
   const amountPaise = Math.round(Number(b.amount) * 100), name = String(b.name || '').trim().slice(0,120);
   if (!name || !Number.isSafeInteger(amountPaise) || amountPaise <= 0 || amountPaise > 10000000000) return fail('Enter a name and a valid positive amount.');
   let payload;
   if (b.kind === 'bill') {
    if (!validDate(b.due) || !['monthly','weekly','yearly'].includes(b.frequency)) return fail('Choose a valid due date and frequency.');
    payload = {name,amountPaise,due:b.due,frequency:b.frequency,anchorDay:Number(b.due.slice(-2)),category:String(b.category||'Subscriptions').slice(0,80),account:String(b.account||'Bank account').slice(0,80)};
   } else if (b.kind === 'split') {
    const people = [...new Set(String(b.people || '').split(',').map((x:string)=>x.trim()).filter(Boolean))];
    const payer = String(b.payer||'').trim();
    if (people.length < 2 || people.length > 20 || people.some(x=>x.length>60) || !people.includes(payer)) return fail('Add 2–20 unique names and choose a payer from those names.');
    payload = {name,amountPaise,payer,people};
   } else return fail('Unknown planner item.');
   await db.prepare('INSERT INTO student_planner_items (id,user_id,kind,payload) VALUES (?,?,?,?)').bind(crypto.randomUUID(),user.userId,b.kind,JSON.stringify(payload)).run();
  } else {
   const row = await db.prepare('SELECT kind,payload FROM student_planner_items WHERE id=? AND user_id=?').bind(String(b.id),user.userId).first<{kind:string;payload:string}>();
   if (!row) return fail('Item no longer exists.',404);
   const item = JSON.parse(row.payload);
   if (b.action === 'delete') await db.prepare('DELETE FROM student_planner_items WHERE id=? AND user_id=?').bind(b.id,user.userId).run();
   else if (b.action === 'settle' && row.kind === 'split') {
    if (!item.people.includes(b.person) || b.person === item.payer) return fail('Choose a participant who owes money.');
    await db.prepare('UPDATE student_planner_items SET payload=json_set(payload, ?, 1) WHERE id=? AND user_id=?').bind('$.paid'+item.people.indexOf(b.person),b.id,user.userId).run();
   } else if (b.action === 'pay' && row.kind === 'bill') {
    if (b.due !== item.due) return fail('This bill was already updated. Refresh before paying.');
    const updated = {...item,due:nextDue(item.due,item.frequency,item.anchorDay)};
    await db.batch([
     db.prepare("INSERT OR IGNORE INTO student_transactions (id,user_id,description,amount_paise,type,category,occurred_on,account,payment_method,note,is_demo,created_at) VALUES (?,?,?,?,'expense',?,?,?,'Bank transfer',?,0,?)").bind('bill:'+b.id+':'+item.due,user.userId,item.name,item.amountPaise,item.category,new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()),item.account,'Recurring bill due '+item.due,new Date().toISOString()),
     db.prepare('UPDATE student_planner_items SET payload=? WHERE id=? AND user_id=? AND payload=?').bind(JSON.stringify(updated),b.id,user.userId,row.payload)
    ]);
   } else return fail('Unknown action.');
  }
  return Response.json({ok:true});
 } catch { return fail('Your change could not be saved. Please retry.',503); }
}
