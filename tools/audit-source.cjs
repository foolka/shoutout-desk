const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const allowed=new Set(['assets','bridge','core','ui','docs','tools','tests','.github','main.cjs','preload.cjs','twitch-client.json','package.json','package-lock.json','README.md','README.ru.md','README.uk.md','LICENSE','THIRD_PARTY_NOTICES.md','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','UPDATE.txt','.gitignore','.gitattributes']);
const failures=[];
function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(dir===root&&!allowed.has(item.name))continue;const file=path.join(dir,item.name),rel=path.relative(root,file);
  if(item.isSymbolicLink()){failures.push(rel+': symlink');continue;}if(item.isDirectory()){scan(file);continue;}
  if(/\.(sqlite(?:-wal|-shm)?|dpapi|exe|dll|zip|pdb|pem|key)$/i.test(item.name)||/^(connection|twitch-auth|twitch-login)\.json$/i.test(item.name))failures.push(rel+': private/generated file');
  if(/\.(png|ico)$/i.test(item.name))continue;
  const text=fs.readFileSync(file,'utf8');
  if(/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/.test(text))failures.push(rel+': private key');
  if(/(?:accessToken|refreshToken|clientSecret|access_token|refresh_token)\s*["']?\s*:\s*["'][A-Za-z0-9_-]{24,}["']/.test(text))failures.push(rel+': possible literal credential');
  if(/C:\\\\Users\\\\darkg|F:\\\\Twich/.test(text))failures.push(rel+': private path');
}}
scan(root);if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('Public source audit passed.');
