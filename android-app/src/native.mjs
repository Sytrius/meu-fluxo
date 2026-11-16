/*
 * Meu Fluxo para Android: ponte local Capacitor ↔ ML Kit.
 * Nenhuma fotografia sai do dispositivo por este módulo.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { receiptText } from './receipt-layout.mjs';
import { deadline } from './deadline.mjs';
import { App } from '@capacitor/app';
import { DocumentScanner } from '@capacitor-mlkit/document-scanner';
import { TextRecognition, Script } from '@capacitor-mlkit/text-recognition';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

const available = Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android';
// This bridge is Android-only; do not bundle the plugin's Firebase Web adapter.
const FirebaseAuthentication = registerPlugin('FirebaseAuthentication');
const appCheck = registerPlugin('ReceiptAppCheck');
async function recognizePhoto(dataUrl, qr = false) {
  if (!available) throw new Error('OCR nativo exige Android.');
  const match = /^data:image\/(jpeg|png|webp);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error('Fotografia anexada inválida.');
  const path = `ocr-${crypto.randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  // Only a temporary copy is deleted. Never delete the attached original.
  const task = (async () => {
    try {
      const file = await Filesystem.writeFile({path, directory: Directory.Cache, data: match[2]});
      if(qr){const result=await BarcodeScanner.readBarcodesFromImage({path:file.uri,formats:[BarcodeFormat.QrCode]});return (result.barcodes||[]).map(b=>b.rawValue||b.displayValue||'')}
      const result = await TextRecognition.processImage({path: file.uri, script: Script.Latin});
      return receiptText(result).slice(0, 120000);
    } finally {
      await Filesystem.deleteFile({path, directory: Directory.Cache}).catch(() => {});
    }
  })();
  return deadline(task, 45000, 'A leitura excedeu 45 segundos. Suas fotos foram mantidas; tente novamente.');
}
const googleAuth = {
  async signIn() {
    try {
      return await FirebaseAuthentication.signInWithGoogle();
    } catch (error) {
      throw new Error('Não foi possível entrar com Google. Confira internet, Google Play Services e a configuração Android/SHA no Firebase. ' + (error.message || error));
    }
  },
  getCurrentUser: () => FirebaseAuthentication.getCurrentUser(),
  signOut: () => FirebaseAuthentication.signOut()
};
const asUri = item => typeof item === 'string' ? item : (item?.uri || item?.path || item?.filePath || '');
async function readPhotoAsDataURL(uri) {
  if (!uri) throw new Error('O scanner não retornou o arquivo de imagem.');
  if (/^data:image\//.test(uri)) return uri;
  const result = await Filesystem.readFile({ path: uri });
  if (typeof result.data !== 'string') throw new Error('Não foi possível ler o arquivo digitalizado.');
  return 'data:image/jpeg;base64,' + result.data;
}
async function scanReceipt() {
  if (!available) throw new Error('Digitalização nativa disponível apenas no Android.');
  const res=await DocumentScanner.scanDocument({
    galleryImportAllowed: true,
    pageLimit: 8,
    resultFormats: 'JPEG',
    scannerMode: 'FULL'
  });
  const paths=(res?.scannedImages||[]).map(asUri).filter(Boolean);
  if (!paths.length) return [];
  if (paths.length>8) throw new Error('A nota excede o limite de oito fotos.');
  const pages=[];
  for (const path of paths) {
    // O plugin OCR utiliza o caminho local original; a interface armazena uma cópia comprimida.
    const result=await TextRecognition.processImage({path,script:Script.Latin});
    const dataUrl=await readPhotoAsDataURL(path);
    pages.push({path,dataUrl,text:receiptText(result),blocks:result?.blocks||[]});
  }
  return pages;
}
async function capturePhoto(){
 const res=await DocumentScanner.scanDocument({galleryImportAllowed:false,pageLimit:1,resultFormats:'JPEG',scannerMode:'FULL'});
 const path=(res.scannedImages||[]).map(asUri).find(Boolean);
 return path?readPhotoAsDataURL(path):null;
}
async function scanQR() {
  if (!available) throw new Error('Leitura nativa do QR disponível apenas no Android.');
  const res=await BarcodeScanner.scan({formats:[BarcodeFormat.QrCode],autoZoom:true});
  const first=res?.barcodes?.find(x=>x.rawValue||x.displayValue);
  return first?.rawValue||first?.displayValue||'';
}
if (available) {
  // Em Android com pouca memória, o SO pode interromper a WebView durante o scanner.
  // Não salvar dados incompletos automaticamente em qualquer caso.
  App.addListener('appRestoredResult',event=>{
    if (event?.pluginId==='DocumentScanner' && !event?.success) {
      console.warn('A digitalização foi interrompida pelo Android.',event.error?.message||'');
    }
  }).catch(()=>{});
}
globalThis.MeuFluxoNative={available,scanReceipt,scanQR,recognizePhoto,googleAuth,capturePhoto,readPhotoQR:uri=>recognizePhoto(uri,true),appCheck,openGemini:()=>appCheck.openGemini()};
