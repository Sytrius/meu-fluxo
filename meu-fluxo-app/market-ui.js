(function (root) {
  'use strict';

  const market = root.MeuFluxoMarket;
  const units = { un: 'unidade', kg: 'kg', g: 'g', l: 'litro', ml: 'mL' };
  const percentage = new Intl.NumberFormat('pt-BR', { signDisplay: 'exceptZero', maximumFractionDigits: 1 });
  const shortMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
  const monthLabel = month => shortMonth.format(new Date(month + '-01T12:00:00Z')).replace('.', '');

  function kindField(entry) {
    const kind = market.kindOf(entry.marketKind);
    return `<div class="field" id="entry-market-field" ${entry.type !== 'expense' ? 'hidden' : ''}>
      <label for="entry-market-kind">Aba Mercado</label>
      <select class="select" id="entry-market-kind">${market.kinds.map((value, index) =>
        `<option value="${value}" ${kind === value ? 'selected' : ''}>${market.labels[index]}</option>`).join('')}</select>
      <small>Escolha como esta compra aparece no histórico de mercado.</small>
    </div>`;
  }

  function viewModel() {
    const groups = market.group(state.entries);
    const sorted = [...groups.keys()].sort();
    const selected = state.marketMonth || sorted.at(-1) || monthNow();
    const min = sorted[0] || selected;
    const max = sorted.at(-1) || selected;
    const month = selected < min ? min : selected > max ? max : selected;
    return { groups, min, max, month, purchases: groups.get(month) || [] };
  }

  function purchaseHTML(entry, kind) {
    return `<article class="card market-purchase">
      <header class="market-row">
        <div><time datetime="${esc(entry.date)}">${formatDate(entry.date)}</time>
          <span class="market-label ${kind === 'Reposição' ? 'market-refill' : ''}">${kind}</span>
          <h3 class="panel-title">${esc(entry.title)}</h3>
          ${entry.merchant && entry.merchant !== entry.title ? `<span class="muted">${esc(entry.merchant)}</span>` : ''}
        </div>
        <button class="btn btn-outline" type="button" data-action="edit" data-id="${esc(entry.id)}" aria-label="Editar ${esc(entry.title)} de ${formatDate(entry.date)}">${ico('edit')} Editar</button>
      </header>
      ${entry.items?.length ? `<ul class="market-items">${entry.items.map(item =>
        `<li class="market-row"><span>${esc(item.name)} <small class="muted">· ${esc(item.qty)} ${esc(units[item.unit] || 'un')}</small></span>
          <strong>${fmt(item.cents)}</strong></li>`).join('')}</ul>` :
        '<p class="panel-sub">Sem itens cadastrados. Use Editar para adicionar a lista.</p>'}
      <footer class="market-row"><span class="muted">Total da compra</span><strong>${fmt(entry.cents)}</strong></footer>
    </article>`;
  }

  function graph(product, months) {
    const values = product.points.filter(value => value !== null);
    const min = Math.min(...values), max = Math.max(...values);
    const x = index => 30 + 300 * index / (months.length - 1);
    const y = value => max === min ? 54 : 92 - 75 * (value - min) / (max - min);
    const segments = product.points.map((value, index) => index && value !== null && product.points[index - 1] !== null
      ? `<line x1="${x(index - 1)}" y1="${y(product.points[index - 1])}" x2="${x(index)}" y2="${y(value)}" />` : '').join('');
    const dots = product.points.map((value, index) => value === null ? '' :
      `<circle cx="${x(index)}" cy="${y(value)}" r="4"><title>${niceMonth(months[index])} · ${fmt(value)}</title></circle>`).join('');
    return `<svg class="market-graph" viewBox="0 0 360 110" role="img" aria-label="Histórico de preço de ${esc(product.name)}">
        <line class="market-gridline" x1="30" y1="17" x2="330" y2="17"/>
        <line class="market-gridline" x1="30" y1="92" x2="330" y2="92"/>${segments}${dots}
      </svg>
      <ol class="market-points">${months.map((month, index) =>
        `<li aria-label="${niceMonth(month)}"><span>${monthLabel(month)}</span><strong>${product.points[index] === null ? '—' : fmt(product.points[index])}</strong></li>`).join('')}</ol>`;
  }

  function chartHTML(view) {
    const months = Array.from({ length: 6 }, (_, index) => moveMonth(view.month, index - 5));
    const catalog = root.MeuFluxoReceipts.catalog(months.flatMap(month => view.groups.get(month) || []));
    const products = market.priceHistory(catalog, months);
    if (!products.length) return '<p class="panel-sub">Adicione os itens de uma compra para acompanhar seus preços aqui.</p>';
    const product = products.find(item => item.key === state.marketProduct) || products[0];
    const options = items => items.map(item =>
      `<option value="${esc(item.key)}" ${item === product ? 'selected' : ''}>${esc(item.name)} · ${units[item.unit]}
        ${item.change > 0 ? ' · ' + percentage.format(item.change) + '%' : ''}</option>`).join('');
    const rises = products.filter(item => item.change > 0);
    const other = products.filter(item => !(item.change > 0));
    const change = product.change === null ? '' : `${percentage.format(product.change)}% em relação a ${niceMonth(months[product.previousIndex])}`;
    return `<label class="field market-product"><span>Produto</span><select class="select" id="market-product">
        ${rises.length ? `<optgroup label="Ficaram mais caros">${options(rises)}</optgroup>` : ''}
        ${other.length ? `<optgroup label="Outros produtos do mês">${options(other)}</optgroup>` : ''}
      </select></label>
      <div class="market-row market-price-summary"><strong>${fmt(product.current)} por ${units[product.unit]}</strong>
        ${change ? `<span class="${product.change > 0 ? 'negative' : 'muted'}">${change}</span>` : ''}
      </div>${graph(product, months)}
      <p class="panel-sub">${change ? 'Preço médio por mês, ponderado pela quantidade. Traços indicam mês sem compra deste item.' :
        'Ainda não há outro preço desse item nos últimos seis meses para comparar.'}</p>`;
  }

  function page() {
    const view = viewModel();
    const kinds = market.purchaseKinds(view.purchases);
    return `<div class="market-page">
      <div class="page-head"><h1 class="page-title">Compras de mercado</h1>
        <button type="button" class="btn btn-primary" data-action="market-new">${ico('plus')} Nova compra</button>
      </div>
      <section class="market-deck" aria-label="Compras do mês">
        <div class="market-period">
          <button type="button" class="btn btn-outline" data-action="market-month" data-step="-1" aria-label="Mês anterior" ${view.month === view.min ? 'disabled' : ''}>‹</button>
          <div><h2 class="panel-title" id="market-month-label" tabindex="-1">${niceMonth(view.month)}</h2><small class="muted mobile-only">Deslize para trocar de mês</small></div>
          <button type="button" class="btn btn-outline" data-action="market-month" data-step="1" aria-label="Próximo mês" ${view.month === view.max ? 'disabled' : ''}>›</button>
        </div>
        <div class="market-row market-total"><span>${view.purchases.length} ${view.purchases.length === 1 ? 'compra' : 'compras'}</span>
          <strong>${fmt(view.purchases.reduce((sum, entry) => sum + entry.cents, 0))}</strong></div>
        ${view.purchases.length ? view.purchases.map((entry, index) => purchaseHTML(entry, kinds[index])).join('') :
          '<p class="note">Nenhuma compra de mercado neste mês.</p>'}
      </section>
      <section class="card panel market-history">
        <h2 class="panel-title">Histórico por produto</h2><div id="market-chart">${chartHTML(view)}</div>
      </section>
      <button type="button" class="btn btn-outline" data-nav="prices">Histórico completo de preços</button>
    </div>`;
  }

  function move(step, focus) {
    const view = viewModel();
    const next = moveMonth(view.month, step);
    if (next < view.min || next > view.max) return;
    state.marketMonth = next;
    $('#page-content').innerHTML = page();
    bind();
    if (focus) {
      const button = $(`[data-action="market-month"][data-step="${step}"]`);
      (button.disabled ? $('#market-month-label') : button).focus({ preventScroll: true });
    }
  }

  function bind() {
    const deck = $('.market-deck');
    if (!deck) return;
    let start;
    deck.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary || event.target.closest('button')) return;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
      deck.setPointerCapture(event.pointerId);
    });
    deck.addEventListener('pointerup', event => {
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) >= 45 && Math.abs(dx) > 1.4 * Math.abs(dy)) move(dx < 0 ? 1 : -1, false);
    });
    deck.addEventListener('pointercancel', () => { start = null; });
  }

  function selectProduct(value) {
    state.marketProduct = value;
    $('#market-chart').innerHTML = chartHTML(viewModel());
    $('#market-product')?.focus({ preventScroll: true });
  }

  root.MeuFluxoMarketUI = { kindField, page, bind, move, selectProduct };
})(globalThis);
