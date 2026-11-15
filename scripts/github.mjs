// Reuse Git Credential Manager without writing credentials to disk or logging them.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const gh=path.join(process.env.TEMP,'ar-mvp-gh','bin','gh.exe');
const auth=spawnSync(gh,['auth','token'],{encoding:'utf8'});
let token=auth.status===0?auth.stdout.trim():'';
if(!token){
  const c=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GCM_INTERACTIVE:'never'}});
  if(c.status===0)token=c.stdout.split('\n').find(l=>l.startsWith('password='))?.slice(9).trim()??'';
}
const result=spawnSync(gh,process.argv.slice(2),{stdio:'inherit',env:{...process.env,...(token?{GH_TOKEN:token}:{})}});
process.exit(result.status??1);
