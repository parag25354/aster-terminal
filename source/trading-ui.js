'use strict';

const desk = {
  legs: [], multiplier: '1', instrumentFilter: 'all', orderFilter: 'all',
  reviewing: null, editingSymbol: null, submitting: false, chartSymbol: null, period:'1D', chart:[], chartMessage:'', chartRequest:0
};

function loadDeskDraft() {
  desk.legs=[];
  desk.multiplier='1';
  try {
    const raw = JSON.parse(localStorage.getItem(basketDraftKey()));
    if (!raw || !Array.isArray(raw.legs)) return;
    desk.legs = raw.legs.filter(leg => leg && companies.has(leg.symbol) && hasMarketSymbol(companies.get(leg.symbol)) &&
      ['buy','sell'].includes(leg.side) && typeof leg.quantity === 'string').slice(0, 16)
      .map(leg => ({symbol:leg.symbol,side:leg.side,quantity:leg.quantity,fixed:Boolean(leg.fixed)}));
    desk.multiplier = String(raw.multiplier ?? '1');
  } catch {}
}

function saveDeskDraft() {
  try {
    localStorage.setItem(basketDraftKey(),JSON.stringify({legs:desk.legs,multiplier:desk.multiplier}));
  } catch {}
}

function deskSymbols() {
  return [...companies.values()].filter(hasMarketSymbol).sort((a,b)=>a.id.localeCompare(b.id));
}

function quoteCell(c, quote) {
  if (!quote) return '—';
  const movement=investMove(c,quote);
  const extra = movement!==null
    ? '<small class="'+tone(movement)+'">'+signed(movement)+'</small>'
    : !quote.recent ? '<small>Last quote</small>' : '';
  return money(quote.mid)+extra;
}

function renderDeskInstruments() {
  const filter = $('desk-search').value.trim().toLowerCase();
  const watched = new Set(readWatch());
  const symbols = deskSymbols().filter(c => (desk.instrumentFilter==='all' || watched.has(c.id)) &&
    [c.id,c.name,c.sector].some(value=>value.toLowerCase().includes(filter)));
  $('desk-instrument-count').textContent = symbols.length+' available';
  const container = $('desk-instruments');
  const ids = symbols.map(c=>c.id).join(',');
  if (container.dataset.symbols !== ids) {
    container.dataset.symbols = ids;
    container.innerHTML = symbols.map(c =>
      '<div class="desk-symbol"><button class="desk-symbol-name" type="button" data-desk-symbol="'+c.id+'"><strong>'+c.id+'</strong><small>'+safeText(c.name)+'</small></button>'+
      '<span class="desk-quote" data-desk-mark="'+c.id+'"></span>'+
      '<button class="desk-add" type="button" data-basket-symbol="'+c.id+'" aria-label="Add '+safeText(c.name)+' to basket">+</button></div>'
    ).join('') || '<p class="desk-empty">No matching instruments.</p>';
  }
  for(const c of symbols) {
    const cell = container.querySelector('[data-desk-mark="'+c.id+'"]');
    const content = quoteCell(c,mark(c));
    if(cell.innerHTML!==content)cell.innerHTML=content;
  }
}

function deskPositionRows(wallet) {
  const positions = Object.entries(wallet.positions).filter(([,p])=>p.quantity);
  $('desk-position-count').textContent = positions.length ? positions.length+' open · Whole shares' : 'No open positions';
  const marked = positions.map(([symbol,p])=>{
    const c = companies.get(symbol), quote = c && mark(c);
    const pnl = quote ? paper.cents(quote.mid)*p.quantity-p.cost : null;
    return {c,symbol,p,quote,pnl};
  });
  if (!positions.length) {
    $('desk-position-pnl').textContent='';
    return '<p class="desk-empty">Your paper holdings will appear here after a fill.</p>';
  }
  const allMarked = marked.every(row=>row.pnl!==null);
  const pnl=allMarked?marked.reduce((sum,row)=>sum+row.pnl,0):null;
  const pill=$('desk-position-pnl');
  pill.className = 'desk-pnl '+(pnl===null?'flat':tone(pnl/100));
  pill.textContent = pnl===null?'P&L unavailable':money(pnl/100)+' P&L';
  return '<div class="desk-table-scroll"><table class="desk-table"><thead><tr>'+
    '<th scope="col">Symbol</th><th scope="col">Qty</th><th scope="col">Avg. cost</th><th scope="col">Mark</th><th scope="col">Open P&L</th><th scope="col" aria-label="Actions"></th>'+
    '</tr></thead><tbody>'+marked.map(({c,symbol,p,quote,pnl})=>
      '<tr><td class="desk-symbol-label">'+safeText(symbol)+'</td><td>'+p.quantity+'</td>'+
      '<td>'+money(p.cost/p.quantity/100)+'</td><td>'+(quote?money(quote.mid)+(quote.recent?'':'*'):'—')+'</td>'+
      '<td class="'+(pnl===null?'flat':tone(pnl/100))+'">'+(pnl===null?'—':money(pnl/100))+'</td>'+
      '<td>'+(c?'<button class="desk-link" type="button" data-position-edit="'+symbol+'">Adjust</button>':'')+'</td></tr>'
    ).join('')+'</tbody></table></div>'+(marked.some(row=>row.quote && !row.quote.recent)?'<p class="desk-meta desk-mark-note">* Last available quote</p>':'');
}

function orderEntries(wallet) {
  const entries = new Map();
  for (const fill of wallet.trades) {
    const key = fill.basketId ?? fill.id;
    if (!entries.has(key)) entries.set(key,{key,at:fill.at,basket:Boolean(fill.basketId),fills:[]});
    entries.get(key).fills.push(fill);
  }
  return [...entries.values()];
}

function renderOrders(wallet) {
  const entries = orderEntries(wallet);
  const query = $('desk-order-search').value.trim().toLowerCase();
  const visible = entries.filter(entry=>{
    if (desk.orderFilter==='basket' && !entry.basket || desk.orderFilter==='single' && entry.basket) return false;
    return !query || [entry.key,entry.basket?'basket':'single',...entry.fills.flatMap(fill=>[fill.symbol,fill.side])].some(value=>String(value).toLowerCase().includes(query));
  });
  $('desk-order-count').textContent = wallet.trades.length+' fills · '+entries.length+' receipts';
  const markup = visible.map(entry=>{
    const top = entry.fills[0];
    const symbols = [...new Set(entry.fills.map(fill=>fill.symbol))].join(', ');
    const label = entry.basket ? 'Basket · '+entry.fills.length+' legs' : top.symbol+' · '+top.side.toUpperCase();
    const detail = entry.basket ? symbols : top.quantity+' shares at '+money(top.amount/100);
    return '<button class="desk-order" type="button" data-receipt="'+safeText(entry.key)+'">'+
      '<span class="desk-order-line"><strong>'+safeText(label)+'</strong><span class="fill-chip">Filled</span></span>'+
      '<span class="desk-order-detail">'+safeText(detail)+'</span><small>'+safeText(timeLabel(entry.at))+'</small></button>';
  }).join('') || '<p class="desk-empty">'+(entries.length?'No matching receipts.':'Filled paper orders appear here.')+'</p>';
  if($('desk-orders').innerHTML!==markup)$('desk-orders').innerHTML=markup;
}

function refreshDesk() {
  if ($('trade-desk').hidden) return;
  renderDeskInstruments();
  try {
    const wallet = readWallet();
    const positions = deskPositionRows(wallet);
    if ($('desk-positions').innerHTML!==positions) $('desk-positions').innerHTML = positions;
    renderOrders(wallet);
  } catch (error) {
    $('desk-positions').textContent = error.message;
  }
  refreshBasket();
}

function renderBasketRows() {
  const options = deskSymbols();
  $('basket-rows').innerHTML = desk.legs.length
    ? '<div class="basket-table-head" aria-hidden="true"><span>Instrument</span><span>Side</span><span>Shares</span><span>Est. fill</span><span></span></div>'+
      desk.legs.map((leg,index)=>{
        const row = index+1;
        const menu = options.map(c=>'<option value="'+c.id+'"'+(c.id===leg.symbol?' selected':'')+'>'+c.id+'</option>').join('');
        return '<div class="basket-leg" data-leg="'+index+'">'+
          '<label><span class="sr-only">Instrument for leg '+row+'</span><select class="desk-field" data-leg-field="symbol">'+menu+'</select></label>'+
          '<label><span class="sr-only">Side for leg '+row+'</span><select class="desk-field" data-leg-field="side"><option value="buy"'+(leg.side==='buy'?' selected':'')+'>Buy</option><option value="sell"'+(leg.side==='sell'?' selected':'')+'>Sell</option></select></label>'+
          '<label class="basket-qty"><span class="sr-only">Shares for leg '+row+'</span><input class="desk-field" data-leg-field="quantity" type="number" min="1" max="100000" step="1" inputmode="numeric" value="'+safeText(leg.quantity)+'">'+
          (leg.fixed?'<small title="This adjustment uses a target quantity">Fixed qty</small>':'')+'</label>'+
          '<span class="basket-price" data-basket-price="'+index+'"></span>'+
          '<button class="desk-remove" type="button" data-basket-remove="'+index+'" aria-label="Remove leg '+row+'">×</button></div>';
      }).join('')
    : '<p class="desk-empty">Add symbols from Instruments or stage an adjustment from a position.</p>';
  $('basket-multiplier').value = desk.multiplier;
  refreshBasket();
}

function basketPlan() {
  const legs = desk.legs.map(leg=>({
    ...leg, quantity:Number(leg.quantity), quote:mark(companies.get(leg.symbol))
  }));
  return paper.previewBasket(readWallet(),legs,Number(desk.multiplier));
}

function refreshBasket() {
  const qtyMultiple = Number(desk.multiplier);
  desk.legs.forEach((leg,index)=>{
    const quote = mark(companies.get(leg.symbol));
    const price = quote && (leg.side==='buy'?quote.ask:quote.bid);
    const quantity = Number(leg.quantity)*(leg.fixed?1:qtyMultiple);
    const tag = $('basket-rows').querySelector('[data-basket-price="'+index+'"]');
    if(!tag)return;
    const total = price && Number.isSafeInteger(quantity) && quantity>0 ? money(paper.cents(price)*quantity/100) : '';
    tag.innerHTML = price ? '<strong>'+money(price)+'</strong><small>'+(quote.tradable ? total : 'Last quote')+'</small>' : '<span>—</span>';
  });
  let result;
  try { result=basketPlan(); } catch(error) { result={errors:[error.message],next:null}; }
  const net = result.credit - result.debit;
  const metrics = [
    ['Est. buys',Number.isFinite(result.debit) && desk.legs.length?money(result.debit/100):'—'],
    ['Est. sells',Number.isFinite(result.credit) && desk.legs.length?money(result.credit/100):'—'],
    [net<0?'Net debit':'Net credit',result.next?money(Math.abs(net)/100):'—'],
    ['Cash after',result.next?money(result.next.cash/100):'—']
  ];
  $('basket-totals').innerHTML = metrics.map(([label,value])=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>').join('');
  const errors = desk.legs.length ? [...new Set(result.errors)] : [];
  $('basket-feedback').textContent = errors[0] ?? '';
  $('basket-review').disabled = !result.next;
  $('basket-clear').disabled = !desk.legs.length;
  $('basket-add').disabled = desk.legs.length>=16;
  $('practice-basket').hidden = !sampleMode;
  $('practice-basket').disabled = desk.legs.length>0;
}

function showTrading() {
  $('desk-account-label').textContent=activePaperAccount().name;
  refreshDesk();
  renderBasketRows();
  loadDeskChart();
}

function openBasket(symbol) {
  desk.chartSymbol=symbol;
  openWorkspace('trading',false);
  stageLeg(symbol);
  $('basket-title').scrollIntoView({behavior:motion(),block:'nearest'});
  $('basket-rows').querySelector('.basket-leg:last-child [data-leg-field="quantity"]')?.focus({preventScroll:true});
}

function stageLeg(symbol) {
  const c = companies.get(symbol);
  if (!c || !hasMarketSymbol(c) || desk.legs.length>=16) {
    $('announcer').textContent='A basket can contain up to 16 orders.';
    return;
  }
  desk.legs.push({symbol,side:'buy',quantity:'1',fixed:false});
  saveDeskDraft();
  renderBasketRows();
  $('announcer').textContent='Added '+symbol+' to the basket.';
}

function reviewKey(result) {
  return JSON.stringify([result.next.cash,result.orders.map(order=>{
    const nextQty=result.next.positions[order.symbol]?.quantity ?? 0;
    return [order.symbol,order.side,order.quantity,paper.cents(order.price),nextQty];
  })]);
}

function showReview(result, message='') {
  $('basket-review-details').innerHTML = '<p class="dialog-copy">Fills are simulated at the displayed bid or ask. Cash after: <strong>'+money(result.next.cash/100)+'</strong>.</p>'+
    '<div class="desk-table-scroll"><table class="desk-table"><thead><tr><th scope="col">Symbol</th><th scope="col">Side</th><th scope="col">Shares</th><th scope="col">Fill price</th></tr></thead><tbody>'+
    result.orders.map(order=>'<tr><td>'+safeText(order.symbol)+'</td><td>'+order.side.toUpperCase()+'</td><td>'+order.quantity+'</td><td>'+money(paper.cents(order.price)/100)+'</td></tr>').join('')+
    '</tbody></table></div>';
  desk.reviewing = reviewKey(result);
  $('basket-review-status').textContent = message;
}

function openReview() {
  try {
    if(sampleMode && market.replay) {
      pauseReplay();
      renderStatus();
    }
    const result = basketPlan();
    if(!result.next) { refreshBasket(); return; }
    showReview(result);
    $('basket-dialog').showModal();
  } catch(error) {
    $('basket-feedback').textContent=error.message;
  }
}

async function submitBasket() {
  if (desk.submitting || !$('basket-dialog').open) return;
  const button = $('basket-confirm');
  desk.submitting=true;
  button.disabled=true;
  $('basket-review-status').textContent='Checking latest quotes and positions…';
  const walletKey=paperAccountKey();
  const commit=()=>{
    if(paperAccountKey()!==walletKey)throw new Error('The active paper account changed.');
    const result=basketPlan();
    if(!result.next) throw new Error(result.errors[0]);
    if(reviewKey(result)!==desk.reviewing) {
      showReview(result,'Quotes or positions changed. Review the updated prices and confirm again.');
      return;
    }
    const basketId=crypto.randomUUID();
    const next=paper.executeBasket(readWallet(walletKey),result,{basketId,at:new Date().toISOString()});
    localStorage.setItem(walletKey,JSON.stringify(next));
    desk.legs=[];
    desk.multiplier='1';
    saveDeskDraft();
    $('basket-dialog').close();
    renderWallet();
    showTrading();
    showReceipt(basketId);
    $('announcer').textContent='Paper basket filled: '+result.orders.length+' orders.';
  };
  try {
    if(!sampleMode)await refreshQuotes();
    if (!$('basket-dialog').open) return;
    if(navigator.locks)await navigator.locks.request(walletKey+':lock',()=>{if($('basket-dialog').open)commit();});
    else commit();
  } catch(error) {
    $('basket-review-status').textContent=error.message+' The basket was left unchanged.';
    refreshBasket();
  } finally {
    desk.submitting=false;
    button.disabled=false;
  }
}

function openPositionEditor(symbol) {
  const wallet = readWallet();
  if(!wallet.positions[symbol])return;
  desk.editingSymbol=symbol;
  $('position-edit-title').textContent='Adjust '+symbol;
  $('position-target').value=wallet.positions[symbol].quantity;
  updatePositionEditor();
  $('position-dialog').showModal();
}

function updatePositionEditor() {
  const current = readWallet().positions[desk.editingSymbol]?.quantity ?? 0;
  const target = $('position-target').valueAsNumber;
  const diff = target-current;
  const valid = Number.isSafeInteger(target) && target>=0 && diff!==0 && Math.abs(diff)<=100000;
  const replacing = desk.legs.some(leg=>leg.symbol===desk.editingSymbol);
  $('position-edit-current').textContent='Currently holding '+current+' shares. Choose the quantity you want to hold after the paper trade.';
  $('position-edit-preview').textContent=(valid
    ? (diff>0?'Stage a buy for ':'Stage a sell for ')+Math.abs(diff)+' shares.'
    : 'Enter a different whole-share target within the order limit.')+
    (replacing?' This replaces the staged legs for '+desk.editingSymbol+'.':'');
  $('position-stage').disabled=!valid;
  return valid?diff:0;
}

function stageAdjustment(event) {
  event.preventDefault();
  const difference = updatePositionEditor();
  if(!difference)return;
  const symbol = desk.editingSymbol;
  const kept = desk.legs.filter(leg=>leg.symbol!==symbol);
  if(kept.length>=16) {
    $('position-edit-preview').textContent='Remove a leg before staging this adjustment.';
    return;
  }
  desk.legs=[...kept,{symbol,side:difference>0?'buy':'sell',quantity:String(Math.abs(difference)),fixed:true}];
  saveDeskDraft();
  $('position-dialog').close();
  openWorkspace('trading',false);
  renderBasketRows();
  $('basket-title').scrollIntoView({behavior:motion(),block:'nearest'});
}

function showReceipt(key) {
  const entry = orderEntries(readWallet()).find(item=>item.key===key);
  if(!entry)return;
  $('receipt-title').textContent=entry.basket?'Basket filled':'Order filled';
  $('receipt-details').innerHTML =
    '<p class="dialog-copy">'+safeText(timeLabel(entry.at))+' · '+entry.fills.length+(entry.fills.length===1?' paper fill':' paper fills')+'</p>'+
    '<div class="desk-table-scroll"><table class="desk-table"><thead><tr><th scope="col">Symbol</th><th scope="col">Side</th><th scope="col">Shares</th><th scope="col">Price</th><th scope="col">Feed</th></tr></thead><tbody>'+
    [...entry.fills].reverse().map(fill=>'<tr><td>'+safeText(fill.symbol)+'</td><td>'+safeText(fill.side.toUpperCase())+'</td><td>'+fill.quantity+'</td><td>'+money(fill.amount/100)+'</td><td>'+safeText(fill.feed)+'</td></tr>').join('')+
    '</tbody></table></div>';
  $('receipt-dialog').showModal();
}

function startDesk() {
  loadDeskDraft();
  startTimeline();
  $('desk-search').addEventListener('input',renderDeskInstruments);
  $('desk-order-search').addEventListener('input',()=>renderOrders(readWallet()));
  $('basket-multiplier').addEventListener('input',event=>{
    desk.multiplier=event.currentTarget.value;
    saveDeskDraft();
    refreshBasket();
  });
  $('basket-rows').addEventListener('input',event=>{
    const field=event.target.dataset.legField;
    if (!field) return;
    const leg=desk.legs[Number(event.target.closest('[data-leg]').dataset.leg)];
    if(field==='symbol' && event.target.value!==leg.symbol)leg.fixed=false;
    leg[field]=event.target.value;
    saveDeskDraft();
    if(field==='symbol')renderBasketRows(); else refreshBasket();
  });
  $('basket-add').addEventListener('click',()=>{
    const selected=companies.get(state.selected);
    stageLeg(hasMarketSymbol(selected)?selected.id:deskSymbols()[0]?.id);
  });
  $('practice-basket').addEventListener('click',()=>{
    if(!sampleMode || desk.legs.length)return;
    desk.legs=[{symbol:shockChip,side:'buy',quantity:'8'},{symbol:shockCloud,side:'buy',quantity:'6'}];
    desk.multiplier='1';
    saveDeskDraft();
    renderBasketRows();
  });
  $('basket-clear').addEventListener('click',()=>{
    desk.legs=[];
    desk.multiplier='1';
    saveDeskDraft();
    renderBasketRows();
  });
  $('basket-review').addEventListener('click',openReview);
  $('basket-confirm').addEventListener('click',submitBasket);
  $('position-target').addEventListener('input',updatePositionEditor);
  $('position-edit').addEventListener('submit',stageAdjustment);
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    const {basketSymbol,basketRemove,instrumentFilter,orderFilter,positionEdit,receipt}=button.dataset;
    if(basketSymbol)openBasket(basketSymbol);
    if(basketRemove!==undefined) {
      const index=Number(basketRemove);
      desk.legs.splice(index,1);
      saveDeskDraft();
      renderBasketRows();
      ($('basket-rows').querySelector('[data-basket-remove="'+index+'"]') ?? $('basket-add')).focus();
    }
    if(instrumentFilter) {
      desk.instrumentFilter=instrumentFilter;
      for(const item of document.querySelectorAll('[data-instrument-filter]'))item.setAttribute('aria-pressed',String(item.dataset.instrumentFilter===instrumentFilter));
      renderDeskInstruments();
    }
    if(orderFilter) {
      desk.orderFilter=orderFilter;
      for(const item of document.querySelectorAll('[data-order-filter]'))item.setAttribute('aria-pressed',String(item.dataset.orderFilter===orderFilter));
      renderOrders(readWallet());
    }
    if(positionEdit)openPositionEditor(positionEdit);
    if(receipt)showReceipt(receipt);
  });
}

const sampleAnchor=Date.parse('2026-11-20T12:15:00+05:30');
const timelineSpan={'1H':3_600_000,'1D':10_800_000,'1M':31*86_400_000,'1Y':365*86_400_000};

function articleTime(article) {
  if(!legacyMode)return Date.parse(article.time);
  const [,day,month,hour,minute]=article.time.match(/^(\d+) ([A-Za-z]{3}) · (\d\d):(\d\d)$/) ?? [];
  if(!day)return NaN;
  return Date.parse(day+' '+month+' 2026 '+hour+':'+minute+' GMT+0530');
}

function timelineWindow() {
  if(!desk.chart.length)return null;
  const short=desk.period==='1H'||desk.period==='1D';
  return {start:desk.chart[0].time, end:desk.chart.at(-1).time+(short?0:86_400_000-1)};
}

function timelineArticles() {
  const range=timelineWindow();
  const news=companyNews(desk.chartSymbol);
  return range?news.filter(article=>{
    const t=articleTime(article);
    return t>=range.start && t<=range.end;
  }):news;
}

function renderTimeline() {
  if($('trade-desk').hidden || !desk.chartSymbol)return;
  const list=timelineArticles();
  const scope=timelineWindow() ? desk.period+' · '+list.length+' in view' : 'Available company updates';
  $('desk-news-period').textContent=scope;
  $('desk-news-list').innerHTML=list.length ? list.map(article=>{
    const effect=article.impacts[desk.chartSymbol][0];
    const time=legacyMode?article.time:timeLabel(article.time);
    return '<button class="desk-order timeline-story" type="button" data-timeline-article="'+safeText(article.id)+'"><small>'+
      safeText(time)+'</small><strong class="'+effect+'">'+safeText(article.title)+'</strong><span class="desk-order-detail">'+impactLabels[effect]+'</span></button>';
  }).join('') : '<p class="desk-empty">No company headlines in this timeframe.</p>';
  drawDeskChart();
}

function replayTimeline(c,period) {
  const currentTick=market.ticks, openTick=(replayOpen-replayStart)/replayStep;
  const startTick=period==='1H'?Math.max(openTick,currentTick-30):openTick;
  const session=Array.from({length:currentTick-startTick+1},(_,index)=>{
    const tick=startTick+index;
    return {time:tapeTime(tick),value:replayPrice(c,tick)};
  });
  if(period==='1H' || period==='1D')return session;
  const count=period==='1M'?31:90;
  const horizon=timelineSpan[period];
  const final=session[0].value;
  const opening=final/(1+(c.change*(period==='1M'?2.6:8.5))/100);
  const noise=randomStream(companySeed(c)+period.charCodeAt(1)*97);
  const history=Array.from({length:count},(_,i)=>{
    const ratio=i/count;
    return {time:replayOpen-horizon*(1-ratio),
      value:opening+(final-opening)*ratio+Math.sin(Math.PI*ratio)*(noise()-.5)*final*.025};
  });
  return [...history,...session];
}

function sampleTimeline(c, period = desk.period) {
  if(replayMode)return hasMarketSymbol(c)?replayTimeline(c,period):[];
  const end=sampleAnchor+market.ticks*30000;
  const start=end-timelineSpan[period];
  const quote=mark(c);
  if(!quote)return [];
  const expected=(c.change ?? 0)*({'1H':.32,'1D':1,'1M':2.6,'1Y':8.5}[period]);
  const opening=c.price/(1+expected/100);
  const noise=randomStream(companySeed(c)+period.charCodeAt(1)*97);
  return Array.from({length:61},(_,i)=>{
    const ratio=i/60;
    const disturbance=Math.sin(Math.PI*ratio)*(noise()-.5)*c.price*.006;
    return {time:start+ratio*(end-start), value:opening+(quote.mid-opening)*ratio+disturbance};
  });
}

function loadDeskChart() {
  if($('trade-desk').hidden)return;
  if(!desk.chartSymbol)desk.chartSymbol=legacyMode?deskSymbols()[0]?.id:'NVDA';
  const c=companies.get(desk.chartSymbol);
  if(!c)return;
  const request=++desk.chartRequest;
  $('desk-chart-name').textContent=c.name+' · '+c.id+' · '+(replayMode?'Simulated tape':sampleMode?'Simulation':'Market history');
  const quote=mark(c);
  $('desk-chart-cursor').textContent=quote?money(quote.mid):'';
  $('desk-chart-links').innerHTML=companyHighlights(c).slice(0,3).map(link=>{
    const other=companies.get(link.from===c.id?link.to:link.from);
    return '<button class="desk-chart-link" type="button" data-company="'+other.id+'"><i class="dot '+link.type+'"></i>'+safeText(other.name)+'</button>';
  }).join('');
  loadNews(c);
  const exchange=publicExchange(), exchangeHost=$('desk-exchange-chart');
  exchangeHost.hidden=!exchange;
  $('desk-price-area').hidden=exchange;
  $('desk-periods').hidden=exchange;
  $('desk-replay-cta').hidden=sampleMode || (regularSession().open && !exchange && market.status?.feed!=='delayed_sip');
  $('desk-replay-cta').href=modeLink('replay',{page:'trading',symbol:c.id});
  if(exchange) {
    desk.chart=[];
    desk.chartMessage='';
    mountExchangeChart(exchangeHost,c.id,desk.period);
    renderTimeline();
    return;
  }
  if(sampleMode){
    desk.chart=sampleTimeline(c);
    desk.chartMessage='';
    renderTimeline();
    return;
  }
  const period=desk.period;
  desk.chart=[];
  desk.chartMessage='Loading price history…';
  renderTimeline();
  getHistory(c.symbol,period==='1H'||period==='1D'?'intraday':'daily').then(bars=>{
    if(request!==desk.chartRequest)return;
    desk.chart=selectPeriodBars(bars,period).map(bar=>({time:Date.parse(bar.at),value:bar.close}));
    desk.chartMessage=desk.chart.length<2?'Price history is too short for this timeframe.':'';
    renderTimeline();
  }).catch(error=>{
    if(request!==desk.chartRequest)return;
    desk.chartMessage=error.message;
    renderTimeline();
  });
}

function drawDeskChart() {
  const canvas=$('desk-chart-canvas');
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width || !height)return;
  const pixelRatio=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(width*pixelRatio);
  canvas.height=Math.round(height*pixelRatio);
  const ctx=canvas.getContext('2d');
  ctx.scale(pixelRatio,pixelRatio);
  const wrap=$('desk-chart-markers');
  const message=$('desk-chart-message');
  message.textContent=desk.chartMessage;
  message.hidden=!desk.chartMessage;
  wrap.innerHTML='';
  $('desk-chart-time').textContent='';
  if(desk.chart.length<2)return;
  const first=desk.chart[0], last=desk.chart.at(-1);
  const min=Math.min(...desk.chart.map(point=>point.value)),max=Math.max(...desk.chart.map(point=>point.value));
  const pad=Math.max((max-min)*.12,.02), bottom=min-pad,top=max+pad;
  const x=(time)=>10+(time-first.time)/(last.time-first.time)*(width-77);
  const y=(price)=>12+(top-price)/(top-bottom)*(height-25);
  const trend=last.value>first.value?(isLightTheme()?'#087248':'#7ee0a8'):last.value<first.value?(isLightTheme()?'#af2944':'#ff8999'):(isLightTheme()?'#536774':'#a9bcdb');
  const gradient=ctx.createLinearGradient(0,0,0,height);
  gradient.addColorStop(0,trend+'35');
  gradient.addColorStop(1,trend+'00');
  for(let i=0;i<4;i++) {
    const price=top-(top-bottom)*i/3;
    ctx.strokeStyle=isLightTheme()?'#dce5e9':'#392a1f';
    ctx.beginPath();ctx.moveTo(0,y(price));ctx.lineTo(width-64,y(price));ctx.stroke();
    ctx.fillStyle=isLightTheme()?'#4e6170':'#b69c81';
    ctx.font='11px monospace';
    ctx.fillText(money(price),width-60,y(price)+4);
  }
  function trace() {
    ctx.beginPath();
    desk.chart.forEach((point,i)=>{if(i)ctx.lineTo(x(point.time),y(point.value));else ctx.moveTo(x(point.time),y(point.value));});
  }
  trace();
  ctx.lineTo(x(last.time),height);
  ctx.lineTo(x(first.time),height);
  ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
  trace();ctx.lineWidth=2;ctx.strokeStyle=trend;ctx.stroke();

  const markers=new Map();
  for(const article of timelineArticles()) {
    const timestamp=articleTime(article);
    const pos=Math.max(10,Math.min(width-67,x(timestamp)));
    const bucket=Math.round(pos/21);
    if(markers.has(bucket))continue;
    const previous=desk.chart.findLast(point=>point.time<=timestamp) ?? first;
    const impact=article.impacts[desk.chartSymbol][0];
    markers.set(bucket,'<button type="button" class="event-marker '+impact+'" data-timeline-article="'+safeText(article.id)+
      '" style="left:'+pos+'px;top:'+y(previous.value)+'px" aria-label="News event: '+safeText(article.title)+'" title="'+safeText(article.title)+'"></button>');
  }
  wrap.innerHTML=[...markers.values()].join('');
  $('desk-chart-time').innerHTML='<span>'+safeText(timeLabel(first.time))+'</span><span>'+safeText(timeLabel(last.time))+'</span>';
}

function startTimeline() {
  $('desk-price-area').addEventListener('pointermove',event=>{
    if(desk.chart.length<2)return;
    const area=event.currentTarget.getBoundingClientRect();
    const position=Math.min(1,Math.max(0,(event.clientX-area.left-10)/Math.max(1,area.width-77)));
    const first=desk.chart[0],last=desk.chart.at(-1);
    const time=first.time+position*(last.time-first.time);
    const closest=desk.chart.reduce((best,point)=>Math.abs(point.time-time)<Math.abs(best.time-time)?point:best,first);
    $('desk-chart-cursor').textContent=money(closest.value)+' · '+timeLabel(closest.time);
  });
  new ResizeObserver(drawDeskChart).observe($('desk-price-area'));
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    const {deskSymbol,deskPeriod,timelineArticle}=button.dataset;
    if(deskSymbol) {
      desk.chartSymbol=deskSymbol;
      loadDeskChart();
    }
    if(deskPeriod) {
      desk.period=deskPeriod;
      document.querySelectorAll('[data-desk-period]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.deskPeriod===desk.period)));
      loadDeskChart();
    }
    if(timelineArticle)showArticle(timelineArticle,desk.chartSymbol);
    if(button.id==='desk-research' && desk.chartSymbol)openResearch(desk.chartSymbol);
  });
}
