import fs from 'node:fs/promises';
const base=new URL('../',import.meta.url);
const root=new URL('android/',base);
const configPath=new URL('google-services.json',base);
let config;
try{config=JSON.parse(await fs.readFile(configPath,'utf8'))}catch(error){
 if(process.env.ANDROID_COMPILE_ONLY!=='true')throw Error('Falta android-app/google-services.json. Consulte android-app/README.md.');
 console.warn('COMPILE ONLY: sem Firebase Android; este build não pode ser publicado como correção do login.');
}
if(config){
 const client=config.client?.find(c=>c.client_info?.android_client_info?.package_name==='io.github.sytrius.meufluxo');
 if(config.project_info?.project_id!=='meu-fluxo-92550'||!client)throw Error('google-services.json não corresponde ao projeto/pacote Android esperado.');
 if(!client.oauth_client?.some(c=>c.client_type===3))throw Error('Falta cliente OAuth Web no google-services.json. Habilite Google no Authentication e baixe novamente.');
 await fs.copyFile(configPath,new URL('app/google-services.json',root));
}
const variables=new URL('variables.gradle',root);
let text=await fs.readFile(variables,'utf8');
text=text.replace('ext {',"ext {\n    rgcfaIncludeGoogle = true\n    androidxCredentialsVersion = '1.3.0'\n    androidxCredentialsPlayServicesAuthVersion = '1.3.0'");
await fs.writeFile(variables,text);
const gradle=new URL('app/build.gradle',root);
text=await fs.readFile(gradle,'utf8');
text=text.replace('versionCode 1','versionCode 2').replace('versionName "1.0"','versionName "0.2.0"');
text+='\nandroid { signingConfigs { debug { storeFile file("../../preview.keystore"); storePassword "android"; keyAlias "androiddebugkey"; keyPassword "android" } } }\n';
await fs.writeFile(gradle,text);
