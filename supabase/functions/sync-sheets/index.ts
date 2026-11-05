import { createClient } from 'npm:@supabase/supabase-js@2.81.1';
import { importPKCS8, SignJWT } from 'npm:jose@6.1.2';
import { ATTEMPT_TAB, DAILY_TAB, attemptHeaders, dailyHeaders, planWrites } from './planner.ts';
import { resumenDiario } from '../../../src/core/stats.ts';
import type { Annotation, Attempt } from '../../../src/core/types.ts';

// No credential, spreadsheet ID, tab name or target URL is accepted from the browser.
Deno.serve(async(req:Request)=>{
 const origin=Deno.env.get('ALLOWED_ORIGIN')||'';
 const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const respond=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(req.headers.get('origin')!==origin||!origin)return respond(403,{error:'Origen no autorizado.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond(405,{error:'Solo POST.'});
 const required=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','QUIZ_OWNER_ID','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_SHEET_ID'];
 if(required.some(k=>!Deno.env.get(k)))return respond(503,{error:'Servidor pendiente de configurar. No se ha escrito en Sheets.'});
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return respond(401,{error:'Se requiere sesión.'});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user)return respond(401,{error:'Sesión no válida.'});
 if(user.id!==Deno.env.get('QUIZ_OWNER_ID'))return respond(403,{error:'Usuario no autorizado.'});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const lock=crypto.randomUUID();const {data:locked,error:lockError}=await admin.rpc('quiz_acquire_sync',{p_user:user.id,p_token:lock});
 if(lockError)return respond(503,{error:'No se pudo adquirir el bloqueo.'});
 if(!locked)return respond(409,{error:'Hay otra sincronización en curso. Se reintentará.'});
 const deadline=Date.now()+110000;
 try{
  async function load<T>(table:string,selection:string){const result:T[]=[];for(let offset=0;;offset+=500){if(Date.now()>deadline)throw new Error('Tiempo de sincronización agotado.');const {data,error}=await admin.from(table).select(selection).eq('user_id',user!.id).order('id').range(offset,offset+499);if(error)throw error;result.push(...data as unknown as T[]);if(result.length>10000)throw new Error('Más de 10.000 registros. Amplía la estrategia de sincronización antes de continuar.');if(data.length<500)break;}return result;}
  const rows=await load<{sheet_row:number;payload:Attempt}>('quiz_attempts','id,sheet_row,payload');
  const annotations=(await load<{payload:Annotation}>('quiz_annotations','id,payload')).map(r=>r.payload);
  const days=resumenDiario(rows.map(r=>r.payload));
  if(days.length){const {error}=await admin.from('quiz_daily_keys').upsert(days.map(d=>({user_id:user!.id,day_key:d.key})),{onConflict:'user_id,day_key',ignoreDuplicates:true});if(error)throw error;}
  const keys=await load<{id:number;day_key:string}>('quiz_daily_keys','id,day_key');
  const privateKey=await importPKCS8(Deno.env.get('GOOGLE_PRIVATE_KEY')!.replace(/\\n/g,'\n'),'RS256');
  const now=Math.floor(Date.now()/1000);
  const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/spreadsheets'}).setProtectedHeader({alg:'RS256',typ:'JWT'}).setIssuer(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!).setAudience('https://oauth2.googleapis.com/token').setIssuedAt(now).setExpirationTime(now+300).sign(privateKey);
  const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
  if(!auth.ok)throw new Error('Google no aceptó la credencial de servidor.');
  const oauth=await auth.json();if(!oauth.access_token)throw new Error('Google no devolvió un token.');
  const sheetId=Deno.env.get('GOOGLE_SHEET_ID')!;if(!/^[\w-]+$/.test(sheetId))throw new Error('ID de hoja inválido.');
  const base=`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  async function google(path:string,method='GET',body?:unknown){if(Date.now()>deadline)throw new Error('Tiempo agotado. Reintentar es seguro.');const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${oauth.access_token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Google Sheets respondió ${response.status}. Comprueba permisos y API habilitada.`);return await response.json();}
  const meta=await google('?fields=sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))');
  const requests:unknown[]=[];
  const attemptRows=Math.max(1000,...rows.map(r=>r.sheet_row+1));
  const dailyRows=Math.max(1000,...keys.map(k=>k.id+1));
  for(const [title,rowCount,columns] of [[ATTEMPT_TAB,attemptRows,26],[DAILY_TAB,dailyRows,13]] as const){const existing=meta.sheets?.find((s:{properties:{title:string}})=>s.properties.title===title)?.properties;if(!existing)requests.push({addSheet:{properties:{title,gridProperties:{rowCount,columnCount:columns,frozenRowCount:1}}}});else if(existing.gridProperties.rowCount<rowCount||existing.gridProperties.columnCount<columns)requests.push({updateSheetProperties:{properties:{sheetId:existing.sheetId,gridProperties:{rowCount:Math.max(rowCount,existing.gridProperties.rowCount),columnCount:Math.max(columns,existing.gridProperties.columnCount)}},fields:'gridProperties.rowCount,gridProperties.columnCount'}});}
  if(requests.length)await google(':batchUpdate','POST',{requests});
  // A dedicated empty tab or one with OUR headers only. Never overwrite unknown existing content.
  for(const [title,expected] of [[ATTEMPT_TAB,attemptHeaders],[DAILY_TAB,dailyHeaders]] as const){const existing=await google(`/values/${encodeURIComponent("'"+title+"'!A1:Z2")}`);const values=existing.values||[];if(values.length&&(JSON.stringify(values[0])!==JSON.stringify(expected)))throw new Error(`La pestaña ${title} ya existe con otro contenido. No se sobrescribe.`);}
  const plan=planWrites(rows,annotations,keys);
  // Complete deterministic projection, including annotations. A retry writes the same UUID to the same row.
  // All rows are retained; nothing is cleared or appended to the master tabs.
  for(let i=0;i<plan.length;i+=200)await google('/values:batchUpdate','POST',{valueInputOption:'RAW',data:plan.slice(i,i+200)});
  return respond(200,{sheetsAt:new Date().toISOString(),attempts:rows.length,summaries:days.length});
 }catch(e){console.error('Quiz sync failed',e instanceof Error?e.name:'unknown');return respond(502,{error:e instanceof Error?e.message:'No se pudo sincronizar. Los intentos siguen guardados.'});}
 finally{await admin.rpc('quiz_release_sync',{p_user:user.id,p_token:lock});}
});
