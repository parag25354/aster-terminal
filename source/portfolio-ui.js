'use strict';

const portfolioView={tab:'holdings',sort:'symbol',search:'',initialized:false};
const localAccounts=()=>{
  try {
    const list=JSON.parse(localStorage.getItem(stateKey('accounts')));
    return [{id:'default',name:replayMode?'Market Replay account':legacyMode?'Simulation account':'Live paper account'},...(Array.isArray(list)?list.filter(account=>
      account && /^[a-f0-9-]{36}$/i.test(account.id) && typeof account.name==='string').slice(0,11):[])];
  } catch {return [{id:'default',name:'Paper account'}];}
};
function activePaperAccount() {
  const available=localAccounts();
  try {
    const id=localStorage.getItem(stateKey('active-account'));
    return available.find(account=>account.id===id) ?? available[0];
  } catch {return available[0];}
}
function paperAccountKey() {
  const id=activePaperAccount().id;
  return stateKey(id==='default'?'paper':'paper:'+id);
}
function basketDraftKey() {
  const id=activePaperAccount().id;
  return stateKey(id==='default'?'basket':'basket:'+id);
}
function alertStoreKey() {return stateKey('alerts:'+activePaperAccount().id);}

function portfolioSnapshot(wallet) {
  const positions=Object.entries(wallet.positions).filter(([,p])=>p.quantity>0).map(([id,p])=>{
    const company=companies.get(id);
    const quote=company ? mark(company) : null;
    const value=quote?paper.cents(quote.mid)*p.quantity:null;
    const prior=sampleMode
      ? (company?.change!==undefined && company.price!==undefined ? company.price/(1+company.change/100) : null)
      : quote?.previousClose;
    const day=quote && prior ? (quote.mid/prior-1)*100 : null;
    const dayPnl=day===null?null:(paper.cents(quote.mid)-paper.cents(prior))*p.quantity;
    return {id,company,...p,value,day,dayPnl,pnl:value===null?null:value-p.cost,quote};
  });
  const invested=positions.reduce((sum,p)=>sum+p.cost,0);
  const value=positions.every(p=>p.value!==null)?positions.reduce((sum,p)=>sum+p.value,0):null;
  const dayPnl=positions.every(p=>p.dayPnl!==null)?positions.reduce((sum,p)=>sum+p.dayPnl,0):null;
  const realised=wallet.trades.reduce((sum,item)=>sum+Number(item.realised||0),0);
  return {positions,invested,value,dayPnl,realised,unrealised:value===null?null:value-invested,equity:value===null?null:value+wallet.cash};
}

function portfolioShell() {
  if(portfolioView.initialized)return;
  $('wallet').innerHTML = '<div class="wallet-header"><div><p class="eyebrow">PAPER PORTFOLIO</p>'+
    '<h2 id="wallet-title"></h2><p class="wallet-sub">Saved in this browser · Virtual funds</p></div>'+
    '<div class="wallet-cash" id="portfolio-cash"></div></div>'+
    '<div class="portfolio-controls"><label for="portfolio-account">Paper account</label><select class="desk-field" id="portfolio-account"></select>'+
    '<button type="button" class="btn secondary compact" id="portfolio-create">New account</button>'+
    '<button type="button" class="btn secondary compact" id="portfolio-trade">Open trading</button>'+
    '<button type="button" class="btn secondary compact" id="portfolio-export">Export CSV</button></div>'+
    '<div id="portfolio-notice" class="portfolio-notice" hidden></div><div id="portfolio-metrics" class="portfolio-metrics"></div>'+
    '<div class="research-tabs" id="portfolio-tabs" role="group" aria-label="Portfolio sections">'+
    [['holdings','Holdings'],['allocation','Allocation'],['alerts','Price alerts'],['receipts','Trade receipts']].map(([id,label])=>
      '<button type="button" data-portfolio-tab="'+id+'" aria-pressed="'+(portfolioView.tab===id)+'">'+label+'</button>'
    ).join('')+'</div>'+
    '<div class="portfolio-controls" id="portfolio-holdings-tools"><label class="sr-only" for="portfolio-filter">Find a holding</label>'+
    '<input class="desk-field" type="search" id="portfolio-filter" placeholder="Find a holding">'+
    '<label for="portfolio-sort">Sort by</label><select class="desk-field" id="portfolio-sort"><option value="symbol">Symbol</option><option value="value">Market value</option><option value="pnl">Unrealised P&amp;L</option></select></div>'+
    '<div id="portfolio-content"></div>';
  $('portfolio-filter').addEventListener('input',event=>{portfolioView.search=event.target.value;renderPortfolio();});
  $('portfolio-sort').addEventListener('change',event=>{portfolioView.sort=event.target.value;renderPortfolio();});
  $('portfolio-account').addEventListener('change',event=>switchPaperAccount(event.currentTarget.value));
  portfolioView.initialized=true;
}

function portfolioHoldings({positions}) {
  const cursor=portfolioView.search.trim().toLowerCase();
  const entries=positions.filter(item=>!cursor || [item.id,item.company?.name].some(value=>value && value.toLowerCase().includes(cursor)));
  entries.sort((a,b)=>portfolioView.sort==='symbol'?a.id.localeCompare(b.id):(b[portfolioView.sort] ?? -Infinity)-(a[portfolioView.sort] ?? -Infinity) || a.id.localeCompare(b.id));
  if(!entries.length)return '<p class="wallet-sub">'+(positions.length?'No holdings match this search.':'Your positions appear after a paper order fills.')+'</p>';
  return '<div class="positions-wrap"><table class="wallet-table"><thead><tr>'+
    ['Instrument','Qty','Avg. cost','Invested','Midpoint','Day %','Day P&L','Current value','Unrealised','Unrealised %','Actions'].map(label=>'<th scope="col">'+safeText(label)+'</th>').join('')+
    '</tr></thead><tbody>'+entries.map(p=>{
      const pct=p.pnl!==null && p.cost ? p.pnl/p.cost*100 : null;
      const performance=(value,formatter)=>'<td class="num '+(value===null?'flat':tone(value))+'">'+(value===null?'—':formatter(value))+'</td>';
      return '<tr><td><button data-company="'+safeText(p.id)+'">'+safeText(p.id)+'</button></td><td class="num">'+p.quantity+'</td>'+
        '<td class="num">'+money(p.cost/p.quantity/100)+'</td><td class="num">'+money(p.cost/100)+'</td>'+
        '<td class="num">'+(p.quote?money(p.quote.mid)+(p.quote.recent?'':'*'):'—')+'</td>'+
        performance(p.day,signed)+performance(p.dayPnl,n=>money(n/100))+
        '<td class="num">'+(p.value===null?'—':money(p.value/100))+'</td>'+
        performance(p.pnl,n=>money(n/100))+performance(pct,signed)+
        '<td><button type="button" data-position-edit="'+safeText(p.id)+'">Adjust</button></td></tr>';
    }).join('')+'</tbody></table></div><p class="wallet-sub">* Last available quote. Day P&L estimates today’s price move on current shares.</p>';
}

function renderPortfolio() {
  portfolioShell();
  const account=activePaperAccount();
  $('wallet-title').textContent=account.name;
  const choices=localAccounts().map(item=>'<option value="'+safeText(item.id)+'">'+safeText(item.name)+'</option>').join('');
  if($('portfolio-account').innerHTML!==choices)$('portfolio-account').innerHTML=choices;
  $('portfolio-account').value=account.id;
  let wallet;
  try {wallet=readWallet();}catch(error){$('portfolio-content').textContent=error.message;return;}
  const stats=portfolioSnapshot(wallet);
  const cash=money(wallet.cash/100);
  const valued=(cents)=>cents===null?'—':money(cents/100);
  const metric=(label,value,primary=false,style='')=>'<div class="metric'+(primary?' highlight':'')+'"><span>'+label+'</span><strong class="'+style+'">'+value+'</strong></div>';
  $('account-metrics').innerHTML=metric('Virtual buying power',cash,true)+metric('Estimated account value',valued(stats.equity))+
    metric('Open positions',stats.positions.length)+metric('Realised P&L · recent fills',valued(stats.realised),false,tone(stats.realised));
  $('portfolio-cash').innerHTML=cash+'<small>Available virtual cash</small>';
  $('portfolio-metrics').innerHTML=[
    ['Invested',valued(stats.invested),null],['Current positions value',valued(stats.value),null],
    ['Day P&L',valued(stats.dayPnl),stats.dayPnl],['Unrealised P&L',valued(stats.unrealised),stats.unrealised]
  ].map(([label,value,direction])=>metric(label,value,false,direction===null?'':tone(direction))).join('');
  $('portfolio-holdings-tools').hidden=portfolioView.tab!=='holdings';
  $('portfolio-tabs').querySelectorAll('[data-portfolio-tab]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.portfolioTab===portfolioView.tab)));
  let content;
  if(portfolioView.tab==='holdings')content=portfolioHoldings(stats);
  if(portfolioView.tab==='allocation')content=portfolioAllocation(wallet,stats);
  if(portfolioView.tab==='alerts')content=portfolioAlerts();
  if(portfolioView.tab==='receipts')content=portfolioReceipts(wallet);
  const box=$('portfolio-content');
  if(box.innerHTML!==content) {
    const left=box.querySelector('.positions-wrap')?.scrollLeft ?? 0;
    box.innerHTML=content;
    const scroller=box.querySelector('.positions-wrap');
    if(scroller)scroller.scrollLeft=left;
  }
  refreshAlertNotice();
}
function portfolioAllocation(wallet,stats) {
  if(stats.equity===null)return '<p class="wallet-sub">Some holdings have no quote. Allocation waits for those values.</p>';
  if(stats.equity<=0)return '<p class="wallet-sub">There is no account value to allocate.</p>';
  const rows=[...stats.positions.map(p=>[p.id,p.value]),['Cash',wallet.cash]].sort((a,b)=>b[1]-a[1]);
  return '<div class="allocation-list">'+rows.map(([label,value])=>{
    const share=value/stats.equity*100;
    return '<div><span>'+safeText(label)+'</span><div class="allocation-track"><i style="width:'+share+'%"></i></div><strong>'+share.toFixed(1)+'%</strong><span>'+money(value/100)+'</span></div>';
  }).join('')+'</div>';
}
function portfolioReceipts(wallet) {
  const entries=orderEntries(wallet);
  return entries.length ? '<div class="portfolio-receipts">'+entries.map(entry=>'<button type="button" class="desk-order" data-receipt="'+safeText(entry.key)+'"><span class="desk-order-line"><strong>'+
    (entry.basket?'Basket · '+entry.fills.length+' legs':safeText(entry.fills[0].symbol)+' · '+safeText(entry.fills[0].side.toUpperCase()))+'</strong><span class="fill-chip">Filled</span></span><small>'+
    safeText(timeLabel(entry.at))+'</small></button>').join('')+'</div>' : '<p class="wallet-sub">No paper trade receipts.</p>';
}
function switchPaperAccount(id) {
  if(!localAccounts().some(account=>account.id===id))return;
  localStorage.setItem(stateKey('active-account'),id);
  loadDeskDraft();
  renderPortfolio();
  if(!$('trade-desk').hidden)showTrading();
  $('announcer').textContent='Switched to '+activePaperAccount().name+'.';
}
function exportPortfolio() {
  const wallet=readWallet(), stats=portfolioSnapshot(wallet);
  const orders=portfolioView.tab==='receipts';
  const rows=orders?[['Symbol','Side','Quantity','Fill price','Total','Time','Feed','Basket ID'],
    ...wallet.trades.map(fill=>[fill.symbol,fill.side,fill.quantity,fill.amount/100,fill.gross/100,fill.at,fill.feed,fill.basketId??''])]
    : [['Symbol','Quantity','Average cost','Invested','Market value','Unrealised P&L'],
    ...stats.positions.map(item=>[item.id,item.quantity,item.cost/item.quantity/100,item.cost/100,item.value===null?'':item.value/100,item.pnl===null?'':item.pnl/100])];
  const escapeCell=value=>{
    let string=String(value);
    if(typeof value==='string' && /^[=+\-@\t\r]/.test(string))string="'"+string;
    return '"'+string.replace(/"/g,'""')+'"';
  };
  const file=new Blob([rows.map(row=>row.map(escapeCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(file);
  link.download=('aster-'+activeMode+'-')+(orders?'orders.csv':'holdings.csv');
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),5000);
}
function readAlerts() {
  try {
    const items=JSON.parse(localStorage.getItem(alertStoreKey()));
    return Array.isArray(items)?items.filter(alert=>alert && companies.has(alert.symbol) &&
      ['above','below'].includes(alert.side) && Number.isSafeInteger(alert.level) && alert.level>0).slice(0,30):[];
  }catch{return [];}
}
function evaluateAlerts() {
  const list=readAlerts();
  let count=0;
  for (const alert of list) {
    if(alert.hit)continue;
    const quote=mark(companies.get(alert.symbol));
    if(!quote?.recent)continue;
    const midpoint=paper.cents(quote.mid);
    if(alert.side==='above'?midpoint>=alert.level:midpoint<=alert.level) {
      alert.hit=new Date().toISOString();
      alert.hitPrice=midpoint;
      count++;
    }
  }
  if(count) {
    try {localStorage.setItem(alertStoreKey(),JSON.stringify(list));}catch{return;}
    $('announcer').textContent=count+' price alert'+(count===1?'':'s')+' triggered.';
    renderPortfolio();
  }
}
function refreshAlertNotice() {
  const count=readAlerts().filter(alert=>alert.hit).length;
  const value=$('portfolio-notice');
  value.hidden=!count;
  value.textContent=count?count+' triggered price alert'+(count===1?'':'s')+'.':'';
}
function portfolioAlerts() {
  const list=readAlerts();
  return '<button class="btn secondary compact" type="button" id="portfolio-new-alert">Set price alert</button>'+
    (list.length?'<div class="positions-wrap"><table class="wallet-table"><thead><tr><th scope="col">Symbol</th><th scope="col">Threshold</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>'+
      list.map(alert=>'<tr><td>'+safeText(alert.symbol)+'</td><td>'+safeText(alert.side)+' '+money(alert.level/100)+'</td><td>'+
        (alert.hit?'Triggered at '+money(alert.hitPrice/100)+' · '+safeText(timeLabel(alert.hit)):'Watching')+'</td><td><button type="button" data-remove-alert="'+safeText(alert.id)+'">Remove</button></td></tr>').join('')+
      '</tbody></table></div>':'<p class="wallet-sub">No alerts yet.</p>');
}
function startPortfolio() {
  portfolioShell();
  $('account-form').addEventListener('submit',event=>{
    event.preventDefault();
    const name=$('account-name').value.trim();
    const accounts=localAccounts();
    if(!name || accounts.some(account=>account.name.toLowerCase()===name.toLowerCase())) {
      $('account-message').textContent='Enter a distinct account name.';
      return;
    }
    if(accounts.length>=12) {$('account-message').textContent='The paper workspace supports up to 12 accounts.';return;}
    try {
      const id=crypto.randomUUID();
      localStorage.setItem(stateKey('accounts'),JSON.stringify([...accounts.filter(account=>account.id!=='default'),{id,name}]));
      switchPaperAccount(id);
      $('account-dialog').close();
    }catch(error){$('account-message').textContent=error.message;}
  });
  $('alert-form').addEventListener('submit',event=>{
    event.preventDefault();
    const list=readAlerts();
    const symbol=$('alert-symbol').value,side=$('alert-side').value,level=paper.cents($('alert-level').valueAsNumber);
    if(!companies.has(symbol) || !['above','below'].includes(side) || !Number.isSafeInteger(level) || level<=0 || list.length>=30) {
      $('alert-message').textContent='Check the symbol, target price, and alert limit (30).';
      return;
    }
    try{
      list.push({id:crypto.randomUUID(),symbol,side,level});
      localStorage.setItem(alertStoreKey(),JSON.stringify(list));
      $('alert-dialog').close();
      evaluateAlerts();
      renderPortfolio();
    }catch(error){$('alert-message').textContent=error.message;}
  });
  document.addEventListener('click',event=>{
    const el=event.target.closest('button');
    if(!el)return;
    if(el.dataset.portfolioTab) {portfolioView.tab=el.dataset.portfolioTab;renderPortfolio();}
    if(el.id==='portfolio-create') {
      $('account-name').value='';
      $('account-message').textContent='This account starts with '+money(10000)+' in virtual cash.';
      $('account-dialog').showModal();
    }
    if(el.id==='portfolio-trade') {openWorkspace('trading',false);$('trade-desk').scrollIntoView({behavior:motion()});}
    if(el.id==='portfolio-export')exportPortfolio();
    if(el.id==='portfolio-new-alert') {
      $('alert-symbol').innerHTML=deskSymbols().map(c=>'<option value="'+c.id+'">'+c.id+' · '+safeText(c.name)+'</option>').join('');
      if(hasMarketSymbol(companies.get(state.selected)))$('alert-symbol').value=state.selected;
      $('alert-level').value='';
      $('alert-message').textContent='';
      $('alert-dialog').showModal();
    }
    if(el.dataset.removeAlert) {
      localStorage.setItem(alertStoreKey(),JSON.stringify(readAlerts().filter(alert=>alert.id!==el.dataset.removeAlert)));
      renderPortfolio();
    }
  });
}
