'use strict';

const investPages = ['overview','markets','watchlist','goals'];
const invest = {page:'', period:'1M', direction:'all', goal:null, overviewRequest:0};
const defaultGoals = [
  {id:'emergency',name:'Emergency fund',target:30000,saved:12000,monthly:3000},
  {id:'school',name:'Further education',target:60000,saved:18000,monthly:4000},
  {id:'car',name:'A car',target:100000,saved:25000,monthly:5000}
];
const goalStore = () => stateKey('goals');
const goalAmount = amount => money(amount).replace(/\.00$/, '');
const listedCompanies = () => [...companies.values()].filter(hasMarketSymbol);
function investMove(company,quote) {
  if (sampleMode) return sampleDayMove(company,quote);
  const prior = quote?.previousClose;
  return prior > 0 ? (quote.mid/prior-1)*100 : null;
}

function readGoals() {
  try {
    const data = JSON.parse(localStorage.getItem(goalStore()));
    if (Array.isArray(data)) return data;
  } catch {}
  return defaultGoals.map(goal => Object.fromEntries(Object.entries(goal).map(([key,value]) =>
    [key, typeof value === 'number' && !legacyMode ? value/100 : value])));
}

function renderGoals() {
  const goals = readGoals();
  const percent = goal => Math.floor(Math.min(100,goal.saved/goal.target*100));
  const eta = goal => {
    if (goal.saved >= goal.target) return 'Target reached';
    if (!goal.monthly) return 'Set a monthly contribution';
    const months = Math.ceil((paper.cents(goal.target)-paper.cents(goal.saved))/paper.cents(goal.monthly));
    return months + (months === 1 ? ' month to target' : ' months to target');
  };
  $('invest-goal-preview').innerHTML = goals.slice(0,3).map(goal =>
    '<button type="button" class="invest-goal-row" data-edit-goal="'+safeText(goal.id)+'">'+
    '<span class="invest-goal-symbol" aria-hidden="true">↗</span><span><strong>'+safeText(goal.name)+'</strong>'+
    '<small>'+goalAmount(goal.saved)+' of '+goalAmount(goal.target)+'</small></span><span>'+percent(goal)+'%</span></button>'
  ).join('');
  $('invest-goal-cards').innerHTML = goals.map(goal =>
    '<article class="invest-card goal-card"><div class="goal-card-head"><span class="invest-goal-symbol" aria-hidden="true">↗</span>'+
    '<button type="button" class="invest-text-button" data-edit-goal="'+safeText(goal.id)+'" aria-label="Edit '+safeText(goal.name)+'">Edit</button></div>'+
    '<h2>'+safeText(goal.name)+'</h2><strong>'+goalAmount(goal.saved)+'</strong><p>of '+goalAmount(goal.target)+'</p>'+
    '<div class="goal-track" role="progressbar" aria-label="'+safeText(goal.name)+' progress" aria-valuenow="'+percent(goal)+'"><i style="width:'+percent(goal)+'%"></i></div>'+
    '<p>'+eta(goal)+' · '+goalAmount(goal.monthly)+'/mo</p></article>'
  ).join('');
}

function editInvestGoal(id) {
  const existing = readGoals().find(goal => goal.id === id);
  invest.goal = existing?.id ?? null;
  $('invest-goal-title').textContent = existing ? 'Edit goal' : 'Add a goal';
  $('goal-label').value = existing?.name ?? '';
  $('goal-target').value = existing?.target ?? '';
  $('goal-saved').value = existing?.saved ?? 0;
  $('goal-monthly').value = existing?.monthly ?? 0;
  $('goal-feedback').textContent = '';
  $('invest-goal-dialog').showModal();
}

function paintInvestChart(canvas,points) {
  if (!canvas) return;
  const {width,height} = canvas.getBoundingClientRect();
  if (width < 1 || height < 1) return;
  const dpr = Math.min(devicePixelRatio || 1,2), ctx = canvas.getContext('2d');
  canvas.width = Math.round(width*dpr);
  canvas.height = Math.round(height*dpr);
  ctx.scale(dpr,dpr);
  if (points.length < 2) return;
  const values = points.map(point => point.value);
  const low = Math.min(...values), high = Math.max(...values);
  const pad = Math.max((high-low)*.13,.01), span = high-low+2*pad;
  const x = i => 2+i*(width-56)/(values.length-1);
  const y = value => height-9-(value-low+pad)/span*(height-18);
  const light = document.documentElement.dataset.theme === 'light';
  const rising = values.at(-1) >= values[0];
  const line = rising ? (light?'#0b806b':'#a7cf85') : (light?'#b52845':'#ffa0a7');
  ctx.font = '10px monospace';
  for (let i=0;i<4;i++) {
    const value = low+(high-low)*i/3, row = y(value);
    ctx.strokeStyle = light?'#dae4e8':'#ffffff26';
    ctx.beginPath();ctx.moveTo(2,row);ctx.lineTo(width-50,row);ctx.stroke();
    ctx.fillStyle = light?'#485667':'#c8d2c5';
    ctx.fillText(value.toFixed(2),width-47,row+3);
  }
  const trace = () => values.forEach((value,i) => i ? ctx.lineTo(x(i),y(value)) : ctx.moveTo(x(i),y(value)));
  const fill = ctx.createLinearGradient(0,0,0,height);
  fill.addColorStop(0,line+'45');fill.addColorStop(1,line+'04');
  ctx.beginPath();trace();ctx.lineTo(x(values.length-1),height);ctx.lineTo(x(0),height);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();
  ctx.beginPath();trace();ctx.strokeStyle=line;ctx.lineWidth=2;ctx.stroke();
}

function investPeriodButtons(attribute,active) {
  return periodNames.map(period => '<button type="button" '+attribute+'="'+period+'" aria-pressed="'+(period===active)+'">'+period+'</button>').join('');
}
function renderInvestOverview() {
  const period = invest.period;
  const request = ++invest.overviewRequest;
  const canvas = $('invest-market-chart');
  if ($('invest-periods').querySelector('[aria-pressed="true"]')?.dataset.investPeriod !== period) {
    $('invest-periods').innerHTML = investPeriodButtons('data-invest-period',period);
  }
  const exchange=publicExchange(), exchangeHost=$('overview-exchange-chart');
  exchangeHost.hidden=!exchange;
  canvas.parentElement.hidden=exchange;
  $('invest-chart-range').hidden=exchange;
  $('invest-periods').hidden=exchange;
  $('invest-chart-title').textContent = legacyMode ? 'Market 500' : 'SPY';
  $('invest-index-label').textContent = legacyMode ? 'FICTIONAL MARKET BENCHMARK' :
    replayMode ? 'BENCHMARK · SIMULATED PRICES' : exchange ? 'MARKET BENCHMARK · DELAYED' : 'MARKET BENCHMARK · ALPACA';
  const render = (points,message='') => {
    if (request !== invest.overviewRequest || invest.page !== 'overview') return;
    canvas.investPoints = points;
    paintInvestChart(canvas,points);
    const first = points[0], last = points.at(-1);
    const change = first ? (last.value/first.value-1)*100 : null;
    $('invest-index-value').textContent = last ? (sampleMode ? last.value.toFixed(2) : money(last.value)) : '—';
    $('invest-index-change').className = tone(change);
    $('invest-index-change').textContent = change === null ? '' : signed(change);
    const timeZone=legacyMode?'Asia/Kolkata':'America/New_York';
    const time = point => new Date(point.time).toLocaleString('en-US',period==='1D'||period==='1H'
      ? {hour:'2-digit',minute:'2-digit',timeZone,timeZoneName:'short'} : {month:'short',day:'numeric',year:'numeric',timeZone});
    $('invest-chart-range').innerHTML = first ? '<span>'+time(first)+'</span><span>'+time(last)+'</span>' : '';
    $('invest-chart-empty').hidden = Boolean(first);
    $('invest-chart-empty').textContent = message;
  };
  if (sampleMode) {
    const series = (replayMode?['SPY']:['ATLS','GRID','LUMN']).map(id => sampleTimeline(companies.get(id),period));
    render(series[0].map((point,i) => ({time:point.time,value:series.reduce((sum,points) => sum+points[i].value/points[0].value,0)*100/series.length})));
  } else if (exchange) {
    $('invest-index-value').textContent='';
    $('invest-index-change').textContent='';
    mountExchangeChart(exchangeHost,'SPY',period);
  } else {
    const kind = period === '1H' || period === '1D' ? 'intraday' : 'daily';
    getHistory('SPY',kind).then(bars => {
      render(selectPeriodBars(bars,period).map(bar => ({time:Date.parse(bar.at),value:bar.close})), 'Price history is unavailable.');
    }).catch(() => render([], 'Price history is unavailable.'));
  }
  const wallet = readWallet(), snapshot = portfolioSnapshot(wallet);
  $('invest-metrics').innerHTML = [['Paper account value',snapshot.equity],['Virtual cash',wallet.cash],['Unrealised P&L',snapshot.unrealised]].map(([label,value],i) =>
    '<div class="invest-stat"><span>'+label+'</span><strong class="'+(i===2?tone(value):'')+'">'+(value===null?'—':money(value/100))+'</strong></div>'
  ).join('');
  const movers = listedCompanies().map(company => ({company,move:investMove(company,mark(company))}))
    .filter(({move}) => move !== null).sort((a,b) => Math.abs(b.move)-Math.abs(a.move)).slice(0,4);
  $('invest-movers').innerHTML = movers.length ? movers.map(({company,move}) =>
    '<button type="button" class="invest-mover" data-open-research="'+company.id+'"><span class="invest-mover-symbol">'+company.id+'</span>'+
    '<span><strong>'+safeText(company.name)+'</strong><small>'+safeText(company.sector)+'</small></span>'+
    '<strong class="'+tone(move)+'">'+signed(move)+'</strong></button>'
  ).join('') : '<p class="invest-empty">'+(exchange?'Open Markets for the delayed quote board.':'Day moves will appear when a quote and previous close are available.')+'</p>';
}

function renderInvestTable() {
  const watchlist = invest.page === 'watchlist';
  const saved = readWatch();
  const exchange=publicExchange();
  $('invest-market-filters').hidden=exchange;
  const rows = listedCompanies().map(company => {
    const quote = mark(company);
    return {company,quote,move:investMove(company,quote)};
  }).filter(({company,move}) => {
    if (watchlist) return saved.includes(company.id);
    const search = $('invest-market-search').value.trim().toLowerCase();
    const sector = $('invest-market-sector').value;
    return (company.id+' '+company.name).toLowerCase().includes(search) &&
      (!sector || company.sector === sector) &&
      (invest.direction === 'all' || (invest.direction === 'gainers' ? move > 0 : move < 0));
  }).sort((a,b) => a.company.name.localeCompare(b.company.name));
  const outlet = $(watchlist?'invest-watch-results':'invest-market-results');
  if (!rows.length) {
    outlet.innerHTML = '<p class="invest-empty">'+(watchlist?'Your watchlist is empty. Pin a stock from Markets.':'No instruments match these filters.')+'</p>';
    return;
  }
  outlet.innerHTML = '<p class="invest-result-count">'+rows.length+(rows.length===1?' instrument':' instruments')+'</p>'+
    '<div class="invest-table-wrap"><table class="invest-table"><thead><tr><th scope="col">Instrument</th><th scope="col">Sector</th>'+
    (exchange?'<th scope="col">Exchange chart</th>':'<th scope="col">Midpoint</th><th scope="col">Day change</th>')+
    '<th scope="col">Watch</th><th scope="col">Order</th></tr></thead><tbody>'+
    rows.map(({company,quote,move}) => {
      const {id,name,sector} = company, pinned = saved.includes(id);
      return '<tr><td><button type="button" class="invest-company-button" data-open-research="'+id+'">'+safeText(name)+'<small>'+id+'</small></button></td>'+
        '<td>'+safeText(sector)+'</td>'+
        (exchange?'<td><button type="button" class="invest-text-button" data-open-research="'+id+'" data-research-open-tab="chart">View chart</button></td>':
          '<td>'+(quote?money(quote.mid):'—')+'</td><td class="'+tone(move)+'">'+(move===null?'—':signed(move))+'</td>')+
        '<td><button type="button" class="invest-watch-toggle" data-invest-watch="'+id+'" aria-pressed="'+pinned+'" aria-label="'+
        (pinned?'Remove '+safeText(name)+' from watchlist':'Add '+safeText(name)+' to watchlist')+'">'+(pinned?'★':'☆')+'</button></td>'+
        '<td>'+(exchange?replayAnchorLink(id):'<button type="button" class="invest-trade" data-invest-trade="'+id+'">Trade</button>')+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}

function refreshInvest() {
  if (invest.page === 'overview') renderInvestOverview();
  if (invest.page === 'markets' || invest.page === 'watchlist') renderInvestTable();
}

function switchInvestPage(name) {
  invest.page = name;
  const website = investPages.includes(name);
  document.body.dataset.website = String(website);
  for (const page of investPages) $('invest-'+page).hidden = name !== page;
  for (const id of ['ticker-strip','account-metrics']) $(id).hidden = website;
  $('market-status').hidden=legacyMode && website;
  if (name === 'goals' || name === 'overview') renderGoals();
  refreshInvest();
  mountQuotesBoard();
}

function applyAsterTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = $('theme-toggle');
  button.textContent = theme === 'light' ? '☾ Dark' : '☀ Light';
  button.setAttribute('aria-pressed',String(theme==='light'));
  document.querySelector('meta[name="theme-color"]').content = theme==='light'?'#f4f7f7':'#111315';
  document.querySelectorAll('canvas').forEach(canvas => {
    if (canvas.investPoints) paintInvestChart(canvas,canvas.investPoints);
  });
  paintGraph();
  drawDeskChart();
  if (activeMode && !sampleMode) {
    refreshInvest();
    mountQuotesBoard();
    if (!$('trade-desk').hidden)loadDeskChart();
  }
  if (state.tab === 'performance') renderPerformance(companies.get(state.selected));
}

function startInvest() {
  applyAsterTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  $('theme-toggle').addEventListener('click',() => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('aster:theme',theme); } catch {}
    applyAsterTheme(theme);
  });
  new ResizeObserver(() => {
    const chart = $('invest-market-chart');
    paintInvestChart(chart,chart.investPoints ?? []);
  }).observe($('invest-market-chart'));
  document.querySelector('[data-home-link]').addEventListener('click',event => {
    event.preventDefault();
    if(activeMode)openWorkspace('overview');
  });
  $('invest-market-sector').innerHTML = '<option value="">All sectors</option>'+
    [...new Set(listedCompanies().map(company => company.sector))].sort().map(sector => '<option>'+safeText(sector)+'</option>').join('');
  $('invest-market-search').addEventListener('input',renderInvestTable);
  $('invest-market-sector').addEventListener('change',renderInvestTable);
  $('invest-add-goal').addEventListener('click',() => editInvestGoal());
  $('invest-goal-form').addEventListener('submit',event => {
    event.preventDefault();
    const name = $('goal-label').value.trim();
    if (!name) { $('goal-feedback').textContent = 'Enter a goal name.'; return; }
    const goal = {id:invest.goal ?? crypto.randomUUID(),name,target:$('goal-target').valueAsNumber,
      saved:$('goal-saved').valueAsNumber,monthly:$('goal-monthly').valueAsNumber};
    const goals = readGoals(), index = goals.findIndex(item => item.id === goal.id);
    if (index === -1) goals.push(goal);
    else goals[index] = goal;
    try { localStorage.setItem(goalStore(),JSON.stringify(goals)); }
    catch { $('goal-feedback').textContent = 'Browser storage is unavailable.'; return; }
    renderGoals();
    $('invest-goal-dialog').close();
  });
  document.addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button) return;
    const data = button.dataset;
    if (data.investPeriod) {
      invest.period = data.investPeriod;
      renderInvestOverview();
      $('invest-periods').querySelector('[aria-pressed="true"]').focus();
    }
    if (data.investFilter) {
      invest.direction = data.investFilter;
      $('invest-market-filters').querySelectorAll('button').forEach(item =>
        item.setAttribute('aria-pressed',String(item===button)));
      renderInvestTable();
    }
    if (data.investWatch) {
      const id = data.investWatch, list = readWatch();
      try { localStorage.setItem(stateKey('watch'),JSON.stringify(list.includes(id)?list.filter(item => item!==id):[...list,id])); }
      catch { $('announcer').textContent = 'Watchlist storage is unavailable.'; return; }
      updateTicker();
      renderInvestTable();
      document.querySelector('[data-invest-watch="'+id+'"]')?.focus({preventScroll:true});
    }
    if (data.editGoal) editInvestGoal(data.editGoal);
    if (data.investTrade) {
      if ($('research-dialog').open) $('research-dialog').close();
      selectCompany(data.investTrade,false);
      state.tab = 'trade';
      renderInspector();
      $('company-panel').scrollIntoView({behavior:motion(),block:'nearest'});
      $('detail-tabs').querySelector('[data-tab="trade"]').focus({preventScroll:true});
    }
  });
}
