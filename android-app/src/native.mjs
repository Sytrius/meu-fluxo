/*
 * Meu Fluxo para Android: ponte local Capacitor ↔ ML Kit.
 * Nenhuma fotografia sai do dispositivo por este módulo.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { App } from '@capacitor/app';
import { DocumentScanner } from '@capacitor-mlkit/document-scanner';
import { TextRecognition, Script } from '@capacitor-mlkit/text-recognition';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

const available = Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android';
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
    pages.push({path,dataUrl,text:String(result?.text||''),blocks:result?.blocks||[]});
  }
  return pages;
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
globalThis.MeuFluxoNative={available,scanReceipt,scanQR};
