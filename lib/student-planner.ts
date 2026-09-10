export function validDate(value: unknown): value is string {
 return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
}
export function nextDue(value:string, frequency:string, anchorDay=Number(value.slice(-2))) {
 const d = new Date(value+'T12:00:00Z');
 if(frequency==='weekly') d.setUTCDate(d.getUTCDate()+7);
 else { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+(frequency==='yearly'?12:1)); const last = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate(); d.setUTCDate(Math.min(anchorDay,last)); }
 return d.toISOString().slice(0,10);
}
export type PlannerItem = {id:string;kind:'bill'|'split';name:string;amountPaise:number;due:string;frequency:string;anchorDay:number;category:string;account:string;people:string[];payer:string;[key:string]:any};
export function billReserve(items:PlannerItem[], today:string) {
 const end=today.slice(0,7)+'-31'; let total=0;
 for(const bill of items.filter(x=>x.kind==='bill')) { let due=bill.due; let n=0; while(due<=end && n++<600) {total+=bill.amountPaise;due=nextDue(due,bill.frequency,bill.anchorDay);} }
 return total;
}
export function splitShares(item:PlannerItem) { const base=Math.floor(item.amountPaise/item.people.length), extra=item.amountPaise%item.people.length; return item.people.map((person,i)=>({person,amountPaise:base+(i<extra?1:0),paid:Boolean(item['paid'+i])})); }
export function readCsv(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV has an unclosed quote.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
