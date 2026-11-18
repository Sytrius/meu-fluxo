const test = require('node:test');
const assert = require('node:assert/strict');
const market = require('../market.js');
const receipts = require('../receipts-v14.js');
const backups = require('../backup-v2.js');

const entry = (id, date, data = {}) => ({ id, date, type: 'expense', title: 'Supermercado', category: 'Alimentação', cents: 1000, items: [], ...data });

test('conserva compras e reposições no mesmo mês e respeita a escolha explícita', () => {
  const entries = [
    entry('refill', '2026-11-23', { cents: 800 }),
    entry('main', '2026-11-05', { cents: 25000 }),
    entry('older', '2026-10-05'),
    entry('excluded', '2026-11-23', { marketKind: 'outside' }),
    entry('cashback', '2026-11-19', { marketKind: 'market', type: 'income' }),
    entry('restaurant', '2026-11-10', { title: 'Restaurante', items: [{ name: 'Almoço' }] }),
    entry('removed', '2026-11-25', { deletedAt: '2026-11-25T00:00:00Z' })
  ];
  const months = market.group(entries);
  const november = months.get('2026-11');
  assert.deepEqual(november.map(transaction => transaction.id), ['main', 'refill']);
  assert.equal(months.get('2026-10').length, 1);
  assert.deepEqual(market.purchaseKinds(november), ['Compra principal', 'Reposição']);
  november[1].marketKind = 'principal';
  assert.deepEqual(market.purchaseKinds(november), ['Compra de mercado', 'Compra principal']);
});

test('usa preço ponderado em kg, meses ausentes não viram zero e embalagens distintas não se misturam', () => {
  const entries = [
    entry('a', '2026-09-05', { items: [{ name: 'Café especial', unit: 'g', qty: 500, cents: 1200 }] }),
    entry('b', '2026-11-05', { items: [{ name: 'Café especial', unit: 'kg', qty: 2, cents: 6000 }] }),
    entry('c', '2026-11-23', { items: [
      { name: 'Café especial', unit: 'g', qty: 250, cents: 900 },
      { name: 'Café especial 250g', unit: 'un', qty: 3, cents: 1500 }
    ] })
  ];
  const groups = market.group(entries);
  const catalog = receipts.catalog([...groups.values()].flat());
  const history = market.priceHistory(catalog, ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(history[0].points, [2400, null, 3067]);
  assert.equal(history[0].previousIndex, 0);
  assert.ok(history[0].change > 27 && history[0].change < 28);
  assert.deepEqual(history[1].points, [null, null, 500]);
  assert.equal(history[1].change, null);
});

test('backup distingue uma mudança de classificação e aceita histórico anterior sem esse campo', () => {
  const original = entry('a','2026-11-06');
  const auto = { ...original, marketKind:'auto' };
  assert.equal(backups.signature(original), backups.signature(auto));
  assert.equal(backups.compare([auto],[{ ...auto, marketKind:'reposicao' }]).conflicts[0].id,'a');
});
