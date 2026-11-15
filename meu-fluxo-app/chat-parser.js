/* Meu Fluxo — parser offline de mensagens financeiras com múltiplos gastos.
   Nunca grava transações; retorna somente dados para revisão. */
(function(root){
  'use strict';
  const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const moneyToken = /R\$\s*\d(?:[\d.,]*\d)?|\b\d(?:[\d.,]*\d)?\s*(?:reais?|contos?)\b/gi;
  function centsOf(value){
    let s=String(value).replace(/R\$|reais?|contos?/gi,'').replace(/\s/g,'');
    if(!/^\d[\d.,]*$/.test(s))return null;
    let whole=s, fractional='';
    if(s.includes(',')){
      const parts=s.split(',');
      if(parts.length!==2||!/^\d{1,2}$/.test(parts[1])||!/^(\d+|\d{1,3}(?:\.\d{3})+)$/.test(parts[0]))return null;
      whole=parts[0].replace(/\./g,''); fractional=parts[1];
    }else if(s.includes('.')){
      if(/^\d{1,3}(?:\.\d{3})+$/.test(s))whole=s.replace(/\./g,'');
      else {const parts=s.split('.');if(parts.length!==2||!/^\d{1,2}$/.test(parts[1]))return null;whole=parts[0];fractional=parts[1];}
    }
    const n=Number(whole)*100+Number((fractional+'00').slice(0,2));
    return Number.isSafeInteger(n)&&n>0&&n<=999999999999?n:null;
  }
  function isoDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function parseDate(input,today){
    const base=today&&/^\d{4}-\d{2}-\d{2}$/.test(today)?new Date(today+'T12:00:00'):new Date();
    const normalized=fold(input);
    const relative=/\banteontem\b/.test(normalized)?-2:/\bontem\b/.test(normalized)?-1:0;
    const m=input.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    if(m){
      const y=Number(m[3]||base.getFullYear()),mo=Number(m[2]),day=Number(m[1]);
      const d=new Date(y,mo-1,day);
      if(d.getFullYear()!==y||d.getMonth()!==mo-1||d.getDate()!==day)return {error:'A data informada é inválida. Corrija antes de registrar.'};
      return {date:isoDate(d)};
    }
    base.setDate(base.getDate()+relative);
    return {date:isoDate(base)};
  }
  function unitPriceStatement(raw){
    const t=fold(raw);
    return /(?:\b(?:o\s+)?(?:quilo|kg|litro|preco|valor por)\b.{0,85}\b(?:e|era|custa|custou|sai|vale)\b)|(?:\b\d[\d.,]*\s*(?:reais?)?\s*(?:\/|\bpor\b|\bo\b)\s*(?:kg|quilo|litro|unidade)\b)|(?:\bpreco\s+(?:do|da|por)\b)/.test(t);
  }
  function splitSegments(input){
    return input.replace(/[;\n]+/g,', ')
      .split(/,\s+(?=(?:R\$\s*)?\d|(?:o\s+)?(?:quilo|kg|litro|preço|preco|valor)\b)|\s+e\s+(?=(?:R\$\s*)?\d[\d.,]*\b)/gi)
      .map(x=>x.trim()).filter(Boolean);
  }
  function readableTitle(piece,token){
    let d=(piece.slice(0,token.index)+piece.slice(token.index+token.text.length))
      .replace(/\b(gastei|paguei|recebi|ganhei|comprei|vendi|despesa|gasto|pagamento|hoje|ontem|anteontem)\b/gi,'')
      .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/g,'')
      .replace(/^\s*(?:e\s+)?(?:no|na|num|numa|em|com|de|do|da|por)\s+/i,'')
      .replace(/\b(?:por|com|em|no|na)\s*$/i,'')
      .replace(/\s+/g,' ').replace(/^[\s,.!?:;-]+|[\s,.!?:;-]+$/g,'').trim();
    if(!d||d.length<2)return null;
    return d[0].toUpperCase()+d.slice(1,120);
  }
  function parse(input, options={}){
    input=String(input||'').trim();
    if(!input)return {error:'Escreva sua despesa ou receita.'};
    const dateInfo=parseDate(input,options.today);
    if(dateInfo.error)return dateInfo;
    const normalized=fold(input);
    if(/\b\d+,\d{3}\b/.test(input))return {error:'Valor ambíguo: use R$ 1.234,56 ou R$ 12,34, com no máximo dois centavos decimais.'};
    const type=/\b(recebi|ganhei|salario|receita|entrou|vendi|faturei)\b/.test(normalized)?'income':'expense';
    const segments=splitSegments(input);
    const entries=[], notes=[];
    const explicitVerb=/\b(gastei|paguei|comprei|recebi|ganhei|vendi|despesa|gasto|salario|receita|faturei)\b/.test(normalized);
    for(const piece of segments){
      if(unitPriceStatement(piece)){
        notes.push('Preço de referência (não registrado como despesa): '+piece.replace(/[.!]\s*$/,'').trim());
        continue;
      }
      const tokens=[...piece.matchAll(moneyToken)].map(m=>({text:m[0],index:m.index}));
      let token=tokens[0];
      if(tokens.length>1)return {error:'Encontrei mais de um valor no mesmo trecho. Separe as despesas por vírgula e identifique cada item.'};
      if(!token){
        const raw=piece.match(/^\s*(?:(?:gastei|paguei|comprei|recebi|ganhei|vendi)\s+)?(\d[\d.,]*)\s+(?=(?:no|na|com|em|de|por)\b)/i);
        const loose=piece.match(/^\s*(?:gastei|paguei|comprei|recebi|ganhei|vendi)\s+(\d[\d.,]*)\s*$/i);
        const m=raw||loose;
        if(m)token={text:m[1],index:piece.indexOf(m[1])};
      }
      if(!token){
        return {error:'Não consegui identificar com segurança o valor de "'+piece.slice(0,65)+'". Informe valor e descrição para cada gasto.'};
      }
      const cents=centsOf(token.text);
      if(!cents)return {error:'O valor "'+token.text+'" é inválido ou ambíguo. Escreva em reais, como R$ 15,50.'};
      const title=readableTitle(piece,token);
      if(!title&&segments.length>1)return {error:'Encontrei mais de um valor, mas falta a descrição de cada compra. Exemplo: "R$ 30 no mercado e R$ 15 no café".'};
      if(!title&&!explicitVerb)return {error:'Entendi o valor, mas preciso saber se foi uma compra. Escreva, por exemplo: "gastei R$ 15 no café".'};
      entries.push({type,title:title||(type==='income'?'Receita':'Despesa'),cents,date:dateInfo.date});
    }
    if(!entries.length)return {error:notes.length?'Entendi o preço por unidade, mas não o valor total que você gastou. Informe a despesa para registrá-la.':'Descreva um gasto com valor, como "gastei 15 reais no café".'};
    if(entries.length>12)return {error:'Para conferir com segurança, envie no máximo 12 despesas por mensagem.'};
    return {entries,notes};
  }
  const api={parse};
  root.MeuFluxoChatParser=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
