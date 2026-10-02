import { createClient } from '@supabase/supabase-js';
import { createHandler } from '../_shared/handler.ts';

const siteUrl=Deno.env.get('JOBSEARCH_SITE_URL')||'https://dolzhenkovital.github.io/JobSearch/';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler({admin,siteUrl,
  allowedOrigins:(Deno.env.get('JOBSEARCH_ALLOWED_ORIGINS')||new URL(siteUrl).origin).split(',').map(x=>x.trim()),
  fetch,
  resolveAddresses:async(host)=>{
    const results=await Promise.allSettled([Deno.resolveDns(host,'A'),Deno.resolveDns(host,'AAAA')]);
    return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  },
}));
