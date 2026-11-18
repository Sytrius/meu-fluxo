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
text=text.replace('versionCode 1','versionCode 9').replace('versionName "1.0"','versionName "0.9.0"');
text+='\nandroid { signingConfigs { debug { storeFile file("../../preview.keystore"); storePassword "android"; keyAlias "androiddebugkey"; keyPassword "android" } } }\n';
await fs.writeFile(gradle,text);

const javaDir=new URL('app/src/main/java/io/github/sytrius/meufluxo/',root);
await fs.mkdir(javaDir,{recursive:true});
await fs.copyFile(new URL('src/ReceiptAppCheckPlugin.java',base),new URL('ReceiptAppCheckPlugin.java',javaDir));
await fs.copyFile(new URL('src/HomeAdsPlugin.java',base),new URL('HomeAdsPlugin.java',javaDir));
const activity=new URL('MainActivity.java',javaDir);
await fs.writeFile(activity, 'package io.github.sytrius.meufluxo;\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity { @Override public void onCreate(Bundle savedInstanceState) { registerPlugin(ReceiptAppCheckPlugin.class); registerPlugin(HomeAdsPlugin.class); super.onCreate(savedInstanceState); } }\n');
await fs.appendFile(gradle, '\ndependencies { implementation "com.google.firebase:firebase-appcheck-playintegrity:19.0.1" }\n');
await fs.appendFile(gradle, '\ndependencies {\n    implementation "com.google.android.gms:play-services-ads:25.5.0"\n    implementation "com.google.android.ump:user-messaging-platform:4.0.0"\n}\n');

const demoAppId = 'ca-app-pub-3940256099942544~3347511713';
const demoBannerId = 'ca-app-pub-3940256099942544/6300978111';
const live = process.env.ADMOB_MODE === 'live';
const appId = live ? (process.env.ADMOB_ANDROID_APP_ID || '').trim() : demoAppId;
const bannerId = live ? (process.env.ADMOB_ANDROID_BANNER_ID || '').trim() : demoBannerId;
if (!/^ca-app-pub-\d{16}~\d{10}$/.test(appId) || !/^ca-app-pub-\d{16}\/\d{10}$/.test(bannerId) ||
    appId.split('~')[0] !== bannerId.split('/')[0] || (live && appId.startsWith('ca-app-pub-3940256099942544'))) {
  throw Error('Informe o ID de app e o ID de banner da mesma conta AdMob para ativar o modo live.');
}
const manifest = new URL('app/src/main/AndroidManifest.xml', root);
let xml = await fs.readFile(manifest, 'utf8');
if (!xml.includes('xmlns:tools=')) xml = xml.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ');
xml = xml.replace(/<application\b[^>]*>/, match => match + `
        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${appId}" />
        <meta-data android:name="io.github.sytrius.meufluxo.BANNER_AD_UNIT" android:value="${bannerId}" />
        <meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="true" />
`);
xml = xml.replace('</manifest>', '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />\n</manifest>');
await fs.writeFile(manifest, xml);
await fs.writeFile(new URL('admob-mode.txt',root),live?'live\n':'test\n');
