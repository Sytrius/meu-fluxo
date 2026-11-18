(function (root) {
  'use strict';

  const kinds = ['auto', 'market', 'principal', 'reposicao', 'outside'];
  const labels = ['Automático', 'Incluir no Mercado', 'Compra principal', 'Reposição', 'Fora do Mercado'];
  const kindOf = value => kinds.includes(value) ? value : 'auto';
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function isMarket(entry) {
    if (entry.deletedAt || entry.type !== 'expense') return false;
    const kind = kindOf(entry.marketKind);
    if (kind !== 'auto') return kind !== 'outside';
    const text = fold(entry.title + ' ' + (entry.merchant || ''));
    if (/\b(restaurante|lanchonete|pizzaria|delivery|ifood|cafeteria)\b/.test(text)) return false;
    return /\b(mercados?|supermercados?|hipermercados?|feira|hortifruti|atacarejo|mercearia|acougue)\b/.test(text) ||
      (entry.category === 'Alimentação' && !!entry.items?.length);
  }

  function group(entries) {
    const groups = new Map();
    for (const entry of entries) {
      if (!isMarket(entry)) continue;
      const month = entry.date.slice(0, 7);
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month).push(entry);
    }
    for (const purchases of groups.values()) {
      purchases.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    }
    return groups;
  }

  function purchaseKinds(purchases) {
    const explicit = purchases.filter(entry => entry.marketKind === 'principal');
    const principal = explicit[0] || purchases.reduce((largest, entry) => {
      if (entry.marketKind === 'reposicao') return largest;
      return !largest || entry.cents > largest.cents ? entry : largest;
    }, null);
    const principalIndex = purchases.indexOf(principal);
    return purchases.map((entry, index) => {
      if (entry === principal || entry.marketKind === 'principal') return 'Compra principal';
      if (entry.marketKind === 'reposicao' || (principalIndex >= 0 && index > principalIndex)) return 'Reposição';
      return 'Compra de mercado';
    });
  }

  function weightedPrices(records) {
    const prices = new Map();
    for (const record of records) {
      const month = record.date.slice(0, 7);
      const quantity = ['g', 'ml'].includes(record.unit) ? record.qty / 1000 : record.qty;
      const price = prices.get(month) || { quantity: 0, cents: 0 };
      price.quantity += quantity;
      price.cents += record.totalCents;
      prices.set(month, price);
    }
    return new Map([...prices].map(([month, price]) => [month, Math.round(price.cents / price.quantity)]));
  }

  function priceHistory(catalog, months) {
    return catalog.map(product => {
      const prices = weightedPrices(product.records);
      const points = months.map(month => prices.get(month) ?? null);
      const current = points.at(-1);
      const previousIndex = points.slice(0, -1).findLastIndex(price => price !== null);
      const change = current !== null && previousIndex >= 0
        ? (current - points[previousIndex]) / points[previousIndex] * 100 : null;
      return { ...product, points, current, previousIndex, change };
    }).filter(product => product.current !== null)
      .sort((a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity) || a.name.localeCompare(b.name, 'pt-BR'));
  }

  const api = { kindOf, kinds, labels, group, purchaseKinds, priceHistory };
  root.MeuFluxoMarket = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
