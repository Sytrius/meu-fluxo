import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=path.join(mobile,'android/app/src/main/AndroidManifest.xml');
let xml=await fs.readFile(manifestPath,'utf8');
if(!xml.includes('android.permission.CAMERA')){
  xml=xml.replace(/(<manifest\b[^>]*>)/,'$1\n    <uses-permission android:name="android.permission.CAMERA" />');
}
if(xml.includes('android:allowBackup="true"'))xml=xml.replace('android:allowBackup="true"','android:allowBackup="false"');
else if(!xml.includes('android:allowBackup='))xml=xml.replace('<application ','<application android:allowBackup="false" ');
if(!xml.includes('android:usesCleartextTraffic='))xml=xml.replace('<application ','<application android:usesCleartextTraffic="false" ');
await fs.writeFile(manifestPath,xml);
console.log('Manifest: câmera autorizada apenas para ML Kit; backup Android automático desligado.');
