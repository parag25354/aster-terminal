'use strict';

const market = {
  status:null, quotes:{}, quoteJob:null, received:0, quoteError:'', news:{}, histories:{},
  newsJobs:new Map(), historyJobs:new Map(), ticks:0, replay:null, stream:null, liveTransport:'snapshot'
};
const safeText = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const stateKey = name => 'aster:' + activeMode + ':' + name + ':v1';
const currency = () => legacyMode?'INR':'USD';
const money = amount => new Intl.NumberFormat(legacyMode?'en-IN':'en-US',{currency:currency(),style:'currency',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
const tone = value => value > 0 ? (value>=3?'up intense':'up') : value < 0 ? (value<=-3?'down intense':'down') : 'flat';
const timeLabel = value => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}) : String(value);
};
const feedLabel = value => ({iex:'Real-time IEX · single venue',sip:'Real-time SIP · US consolidated',delayed_sip:'Delayed SIP · view only',sample:'Sample replay',replay:'Simulated session'})[value] ?? 'Market feed';
const virtualAccount = () => replayMode?'Replay wallet':legacyMode?'Sample wallet':'Live-mode paper wallet';

async function requestMarket(op,symbol) {
  const p=new URLSearchParams({op});
  if(symbol)p.set('symbol',symbol);
  const response=await fetch('/api/market?'+p.toString(),{cache:'no-store',signal:AbortSignal.timeout(15_000)});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error || 'Market data is unavailable.');
  return data;
}

const tapeTime = (tick=market.ticks) => replayStart+tick*replayStep;

function replayPrice(c,tick) {
  const progress=Math.max(-1,tick/30);
  const phase=c.index*.94+c.group*.72;
  const wave=(Math.sin(tick*.18+phase)-Math.sin(phase))*.0035;
  const drift=progress<0 ? (c.change/100)*progress*.72 : .004*Math.tanh(progress/3)*Math.sin(phase+.5);
  const shock=state.shock && tick>=market.shockTick ? shockMoves[c.id] ?? 0 : 0;
  return c.price*(1+wave+drift)*(1+shock/100);
}

function mark(c) {
  if(!c)return null;
  if(sampleMode) {
    if(c.price===undefined)return null;
    const wiggle=c.price * Math.sin(market.ticks*.39+c.index+c.group) * .004 * (market.ticks ? 1 : 0);
    const shock=state.shock ? shockMoves[c.id] ?? 0 : 0;
    const mid=replayMode?replayPrice(c,market.ticks):(c.price+wiggle)*(1+shock/100);
    const spread=Math.max(.01,mid*.0008);
    return {bid:Math.max(.01,paper.cents(mid-spread)/100),ask:paper.cents(mid+spread)/100,mid,recent:true,tradable:true,
      at:new Date(replayMode?tapeTime():Date.now()).toISOString(),feed:replayMode?'replay':'sample'};
  }
  const quote = c.symbol && market.quotes[c.symbol];
  if(!quote || !(quote.bid>0) || !(quote.ask>=quote.bid))return null;
  const elapsed=performance.now()-market.received;
  const age=Date.parse(market.observedAt)-Date.parse(quote.at)+elapsed;
  const recent=quote.recent && age <= (market.status?.quoteAgeLimitMs ?? 45_000) && !market.quoteError;
  return {...quote,mid:(quote.ask+quote.bid)/2,recent,tradable:quote.tradable && recent && regularSession().open,feed:market.status.feed};
}

function sampleDayMove(company,quote=mark(company)) {
  if(!sampleMode || company.change===undefined || !quote || !(company.price>0))return null;
  const prior=company.price/(1+company.change/100);
  return (quote.mid/prior-1)*100;
}

function renderStatus() {
  const el=$('market-status');
  if(sampleMode) {
    el.dataset.state='sample';
    if(!$('replay-toggle')) {
      el.innerHTML='<span><strong>'+(replayMode?'Market Replay':'Sample session')+'</strong> · '+
        (replayMode?'Illustrative quotes · Virtual USD':'Offline prices · Virtual funds')+'</span>'+
        '<span class="replay-actions"><button type="button" id="replay-toggle" data-replay="toggle">Play replay</button>'+
        '<button type="button" id="replay-step" data-replay="step">Step</button>'+
        (replayMode?'<button type="button" data-replay="restart">Restart</button>':'')+
        '<span id="replay-clock"></span></span>';
    }
    $('replay-toggle').textContent=market.replay?'Pause replay':'Play replay';
    const ended=replayMode && market.ticks>=lastReplayTick;
    $('replay-toggle').disabled=ended;
    $('replay-step').disabled=ended;
    $('replay-clock').textContent=replayMode?regularSession(tapeTime()).time+(ended?' · Replay closed':''):'Tick '+market.ticks;
    return;
  }
  const session=regularSession();
  if(publicExchange()) {
    el.dataset.state='public';
    el.innerHTML='<span><strong>'+session.state+'</strong> · '+session.time+' · TradingView delayed quotes · Read-only</span>'+
      '<a class="replay-link" href="'+modeLink('replay',{page:'trading',symbol:state.selected})+'">Practice in Replay</a>';
    return;
  }
  if(market.quoteError) {
    el.dataset.state='unavailable';
    el.textContent=market.quoteError;
    return;
  }
  const quotes=Object.values(market.quotes);
  const anyRecent=quotes.some(q=>q.recent && Date.now()-Date.parse(q.at)<=market.status.quoteAgeLimitMs);
  const realtime=anyRecent && session.open && market.status.feed!=='delayed_sip';
  const latest=quotes.reduce((latest,q)=>Math.max(latest,Date.parse(q.at)||0),0);
  el.dataset.state=realtime?'live':'closed';
  el.textContent=session.state+' · '+feedLabel(market.status.feed)+(latest?' · Last quote '+timeLabel(latest):' · Waiting for quotes')+
    (realtime?(market.liveTransport==='stream'?' · Streaming':' · Refreshing every 10 seconds'):'')+' · Paper trading only';
}

function readWatch() {
  const defaults=legacyMode?['ATLS','GRID','INNO','LUMN']:['NVDA','CRWV','SPY','MSFT','ANT'];
  try {
    const list=JSON.parse(localStorage.getItem(stateKey('watch')));
    return Array.isArray(list)?list.filter(id=>companies.has(id)):defaults;
  } catch{return defaults;}
}

function updateTicker() {
  const list=readWatch();
  $('ticker-strip').innerHTML='<span class="ticker-title">WATCHLIST</span>'+(list.length?list.map(id=>{
    const c=companies.get(id),quote=mark(c);
    const movement=investMove(c,quote);
    const change=movement===null?'':'<span class="'+tone(movement)+'">'+signed(movement)+'</span>';
    return '<button class="quote-tile" aria-pressed="'+(state.selected===id)+'" data-company="'+id+'" aria-label="Open '+c.name+'"><strong>'+id+'</strong><small>'+(quote?money(quote.mid):'—')+'</small>'+change+'</button>';
  }).join(''):'<span class="empty">Use a company’s detail card to add it.</span>');
}

function updateEntityQuote() {
  const el=$('entity-quote');
  if(!el)return;
  const q=mark(companies.get(state.selected));
  el.textContent=q?money(q.mid):'';
  el.title=q?(q.recent?'Bid/ask midpoint':'Last available bid/ask midpoint'):'';
  const c=companies.get(state.selected);
  const quick=$('quick-price');
  const midpoint=q?money(q.mid)+(q.recent?'':' · last seen'):pricePlaceholder(c);
  if(quick)quick.textContent=midpoint;
  const delta=$('quick-move'),movement=sampleDayMove(c,q);
  if(delta && movement!==null){delta.className=tone(movement);delta.textContent=signed(movement);}
  if($('profile-price'))$('profile-price').textContent=midpoint;
  if($('profile-spread'))$('profile-spread').textContent=q?money(q.bid)+' / '+money(q.ask):'—';
  if($('profile-quote-time'))$('profile-quote-time').textContent=q&&!sampleMode?(q.recent?'Quote as of ':'Last quote · ')+timeLabel(q.at):'';
}

function reprice() {
  renderStatus();
  updateTicker();
  updateEntityQuote();
  renderWallet();
  refreshDesk();
  mountQuotesBoard();
  evaluateAlerts();
  if(state.tab==='trade')updateTicket();
}

async function refreshQuotes() {
  if(sampleMode || !market.status?.configured)return;
  if(market.quoteJob)return market.quoteJob;
  market.quoteJob=(async()=>{
    try {
      const result=await requestMarket('quotes');
      acceptQuotes(result);
    } catch(error) {
      market.quoteError=error.message;
    } finally {
      market.quoteJob=null;
      reprice();
    }
  })();
  return market.quoteJob;
}

function acceptQuotes(result) {
  if (!market.status || result.feed!==market.status.feed || !Number.isFinite(Date.parse(result.observedAt)) || !result.quotes) return;
  for (const [symbol,quote] of Object.entries(result.quotes)) {
    const prior=market.quotes[symbol];
    if(!prior || Date.parse(quote.at)>=Date.parse(prior.at)) {
      market.quotes[symbol]={...quote,previousClose:quote.previousClose ?? prior?.previousClose};
    } else if (quote.previousClose!=null) {
      market.quotes[symbol]={...prior,previousClose:quote.previousClose};
    }
  }
  if (!market.observedAt || Date.parse(result.observedAt)>=Date.parse(market.observedAt)) {
    market.observedAt=result.observedAt;
    market.received=performance.now();
  }
  market.quoteError='';
}

function connectQuoteStream() {
  if (!market.status?.streaming || !('EventSource' in window) || market.stream) return;
  const source=new EventSource('/api/quote-stream');
  market.stream=source;
  source.addEventListener('feed-state',event=>{
    const status=JSON.parse(event.data);
    market.liveTransport=status==="streaming"?'stream':'snapshot';
    renderStatus();
  });
  source.addEventListener('quotes',event=>{
    acceptQuotes(JSON.parse(event.data));
    reprice();
  });
  source.onerror = () => {
    market.liveTransport='snapshot';
    renderStatus();
  };
  window.addEventListener('pagehide',()=>{
    source.close();
    market.stream=null;
  },{once:true});
  window.addEventListener('pageshow',()=>{
    if(!market.stream)connectQuoteStream();
  },{once:true});
}

function updateReplayViews() {
  reprice();
  if(state.tab==='performance')renderPerformance(companies.get(state.selected));
  if(!$('trade-desk').hidden)loadDeskChart();
  if($('research-dialog').open && researchPanel.tab==='chart') {
    updateReplayResearchChart();
  }
}

function pauseReplay() {
  if(market.replay)clearInterval(market.replay);
  market.replay=null;
}

function nextSampleTick() {
  market.ticks++;
  if(replayMode && market.ticks>=lastReplayTick)pauseReplay();
  updateReplayViews();
}

async function startMarket() {
  if(sampleMode) {
    renderStatus();
    document.addEventListener('click',event=>{
      const replay=event.target.closest('[data-replay]')?.dataset.replay;
      if(replay==='step' && (!replayMode || market.ticks<lastReplayTick))nextSampleTick();
      if(replay==='toggle') {
        if(market.replay)pauseReplay();
        else market.replay=setInterval(nextSampleTick,1750);
        renderStatus();
      }
      if(replay==='restart') {
        pauseReplay();
        market.ticks=0;
        if(state.shock)toggleShock(false);
        updateReplayViews();
      }
    });
    return;
  }
  renderStatus();
  setInterval(()=>{if(!document.hidden)renderStatus();},30_000);
  if(!marketBackend)return;
  try {
    market.status=await requestMarket('status');
    if(!market.status.configured)return;
    connectQuoteStream();
    await refreshQuotes();
    selectMarketEntity();
    if(!$('trade-desk').hidden)loadDeskChart();
    setInterval(()=>{if(!document.hidden)refreshQuotes();},10_000);
    setInterval(()=>{
      if(document.hidden)return;
      if($('trade-desk').hidden)loadNews(companies.get(state.selected));
      else loadDeskChart();
    },60_000);
  } catch {
    // The delayed embedded charts remain available if the optional backend is unreachable.
  }
}

function companyNews(id) {
  const seeded=articles.filter(article=>article.impacts[id]);
  if(legacyMode)return seeded;
  const wire=sampleMode?[]:market.news[id]?.articles ?? [];
  return [...wire,...seeded].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
}

function tagHeadline(item) {
  const title=item.title.toLowerCase();
  if (item.symbols.length!==1) return ['flat','The provider associated this story with multiple symbols. Its effect on this company alone is unclear.'];
  const positive=/\b(raises? (full.year |annual |revenue |profit |earnings )?(guidance|outlook)|beats? (wall street |analyst )?(estimates|expectations))\b/.test(title);
  const negative=/\b(cuts? (full.year |annual |revenue |profit |earnings )?(guidance|outlook)|miss(?:es|ed)? (wall street |analyst )?(estimates|expectations)|lowers? (guidance|outlook)|recalls? \d+)\b/.test(title);
  if(positive && !negative)return ['up','The headline reports a beat or higher guidance. The price response can depend on expectations.'];
  if(negative && !positive)return ['down','The headline reports a miss, lower guidance or recall. It may weigh on expectations.'];
  return ['flat','The headline does not establish a clear directional financial effect.'];
}

async function loadNews(c) {
  if(sampleMode || !c?.symbol || !market.status?.configured || market.newsJobs.has(c.id))return;
  if(market.news[c.id] && Date.now()-market.news[c.id].loaded<55_000)return;
  const job=requestMarket('news',c.symbol);
  market.newsJobs.set(c.id,job);
  try {
    const data=await job;
    market.news[c.id]={loaded:Date.now(),articles:data.articles.map(item=>({...item,id:'wire-'+item.id,wire:true,topic:'Market news',body:'Open the publisher’s article for the full report.',impacts:{[c.id]:tagHeadline(item)}}))};
  } catch {
    market.news[c.id]={loaded:Date.now(),articles:market.news[c.id]?.articles ?? [],error:true};
  } finally {
    market.newsJobs.delete(c.id);
    if(state.selected===c.id && state.tab!=='trade')renderInspector();
    if(state.selected===c.id && !$('node-popover').hidden)refreshQuickNews();
    if(!$('trade-desk').hidden && desk.chartSymbol===c.id)renderTimeline();
    refreshResearchIfSelected(c.id);
  }
}

function headline(article,id) {
  const impact=article.impacts[id][0];
  const stamp=legacyMode?article.time:timeLabel(article.time);
  return '<button class="news-row ' + impact + '" data-article="' + safeText(article.id) + '">' + safeText(article.title) + '<span class="news-meta">' + impactLabels[impact] + ' · ' + safeText(article.source?article.source+' · '+stamp:stamp) + '</span></button>';
}

function showArticle(id, context=state.selected) {
  const article=companyNews(context).find(a=>a.id===id) ?? articles.find(a=>a.id===id);
  if(!article)return;
  const entries=Object.entries(article.impacts).sort(([a],[b])=>(b===context)-(a===context));
  const stamp=legacyMode?article.time+' · Sample market session':timeLabel(article.time)+' · '+article.source;
  $('article').innerHTML='<p class="eyebrow">'+(legacyMode?'SAMPLE NEWS':article.scenario?'REPLAY SCENARIO':article.wire?'MARKET HEADLINE':'DATED DISCLOSURE')+' · '+safeText(article.topic)+'</p><h2 id="article-title">'+safeText(article.title)+'</h2><p class="dialog-copy">'+safeText(stamp)+'</p><p class="dialog-copy">'+safeText(article.body)+'</p><div class="impacts">'+entries.map(([symbol,[effect,reason]])=>'<div class="impact-row"><span class="impact-tag '+effect+'">'+impactLabels[effect]+'</span><strong>'+safeText(companies.get(symbol).name)+'</strong><p>'+safeText(reason)+'</p></div>').join('')+'</div>' +
    (article.url?'<p class="dialog-copy"><a href="'+safeText(article.url)+'" target="_blank" rel="noopener noreferrer">Read original source</a></p>':'')+
    (sampleMode && id===shockExample.story?'<p class="dialog-copy"><button class="btn primary" data-news-shock>Trace this shock</button></p>':'');
  closeQuickCard();
  $('article-dialog').showModal();
}

function getHistory(symbol,op) {
  const key=symbol+'/'+op;
  const cached=market.histories[key];
  if(cached && Date.now()-cached.loaded<60_000)return Promise.resolve(cached.bars);
  if(market.historyJobs.has(key))return market.historyJobs.get(key);
  const job=requestMarket(op,symbol).then(data=>{
    market.histories[key]={loaded:Date.now(),bars:data.bars};
    return data.bars;
  }).finally(()=>market.historyJobs.delete(key));
  market.historyJobs.set(key,job);
  return job;
}

function selectMarketEntity() {
  const c=companies.get(state.selected);
  loadNews(c);
  if(state.tab==='performance')renderPerformance(c);
}

function periodButtons() {
  return '<div class="periods" role="group" aria-label="Performance timeframe">'+periodNames.map(label=>'<button data-period="'+label+'" aria-pressed="'+(label===state.period)+'">'+label+'</button>').join('')+'</div>';
}

let historyRenderId=0;
function renderPerformance(c) {
  if(sampleMode){renderSamplePerformance(c);return;}
  const generation=++historyRenderId;
  const period=state.period;
  if(!c.symbol) {
    $('detail').innerHTML='<p class="empty">No exchange quote available for this entity. View its disclosed connections instead.</p>';
    return;
  }
  if(publicExchange()) {
    $('detail').innerHTML='<p class="profile-note">See the exchange chart in company research.</p>'+
      '<button type="button" class="btn secondary" data-open-research="'+c.id+'" data-research-open-tab="chart">Open market chart</button>';
    return;
  }
  const project=period==='1H'||period==='1D'?'intraday':'daily';
  const quotesLook=mark(c);
  $('detail').innerHTML=periodButtons()+'<p class="empty">Loading price history…</p>';
  Promise.allSettled([getHistory(c.symbol,project),c.symbol==='SPY'?Promise.resolve([]):getHistory('SPY',project),period==='1D'?getHistory(c.symbol,'daily'):Promise.resolve([])]).then(results=>{
    if(generation!==historyRenderId || state.selected!==c.id || state.tab!=='performance')return;
    const [seriesResult,benchmarkResult,statsResult]=results;
    if(seriesResult.status==='rejected'){
      $('detail').innerHTML=periodButtons()+'<p class="empty">'+safeText(seriesResult.reason.message)+'</p>';
      return;
    }
    const series=seriesResult.value;
    const benchmark=benchmarkResult.status==='fulfilled'?benchmarkResult.value:[];
    const daily=statsResult.status==='fulfilled'?statsResult.value:[];
    renderRealChart(c,period,series,benchmark,daily,quotesLook);
  });
}

function selectPeriodBars(bars,period) {
  if(!bars.length)return [];
  const last=bars.at(-1);
  if(period==='1H') return bars.filter(bar=>bar.session===last.session && Date.parse(last.at)-Date.parse(bar.at)<=3_600_000);
  if(period==='1D')return bars.filter(bar=>bar.session===last.session);
  return bars.slice(period==='1M'?-22:-253);
}

function renderRealChart(c,period,series,benchmark,statsDaily,q) {
  const selected=selectPeriodBars(series,period);
  const daily=period==='1D'?statsDaily:series;
  const returns=paper.returnWindows(daily,period,series);
  const counts=paper.countReturns(returns);
  const broad=new Map(benchmark.map(b=>[period==='1H'||period==='1D'?b.at:b.session,b.close]));
  const pair=selected.flatMap(bar=>{
    const key=period==='1H'||period==='1D'?bar.at:bar.session;
    return broad.has(key)?[[bar.close,broad.get(key)]]:[];
  });
  const hasBenchmark=pair.length>=2;
  const points=hasBenchmark?pair.map(p=>p[0]):selected.map(b=>b.close);
  const benchmarkPoints=hasBenchmark?pair.map(p=>p[1]):[];
  const move=points.length>=2?(points.at(-1)/points[0]-1)*100:null;
  const benchmarkMove=hasBenchmark?(benchmarkPoints.at(-1)/benchmarkPoints[0]-1)*100:null;
  let history='<p class="performance-notice">No completed windows for this timeframe yet.</p>';
  if(returns.length) {
    const names=['up','flat','down'];
    history='<div class="odds"><h3 class="eyebrow">OBSERVED HISTORICAL WINDOWS</h3><div class="odds-bar">'+counts.map(n=>'<span style="width:'+n/returns.length*100+'%"></span>').join('')+'</div><div class="odds-label">'+counts.map((n,i)=>'<span class="'+names[i]+'">'+(n/returns.length*100).toFixed(1)+'% '+names[i]+'</span>').join('')+'</div></div><p class="performance-notice">'+returns.length+' overlapping historical windows · flat within ±0.1%. Price changes omit dividends.</p>';
  }
  const comparison=benchmarkMove!==null?'<span class="spy">SPY '+signed(benchmarkMove)+'</span><span>vs SPY '+(move-benchmarkMove>=0?'+':'−')+Math.abs(move-benchmarkMove).toFixed(2)+' pp</span>':'';
  const current=q?money(q.mid):selected.length?money(selected.at(-1).close):'—';
  $('detail').innerHTML=periodButtons()+'<div class="performance-meta"><span class="price-num">'+current+'</span>'+(move===null?'':'<strong class="'+tone(move)+'">'+signed(move)+'</strong>')+'</div>'+
    (points.length>=2?'<canvas class="mini-chart" id="stock-chart" role="img" aria-label="'+safeText(c.name)+' market price history"></canvas><div class="chart-legend"><span>'+c.id+' · base 100</span>'+comparison+'</div>':'<p class="empty">No comparable price bars for this period.</p>')+
    (selected.length?'<p class="performance-notice">Latest completed bar: '+safeText(timeLabel(selected.at(-1).at))+'</p>':'')+history;
  if(points.length>=2)drawMarketChart(points,benchmarkPoints);
}
function drawMarketChart(points,broad,peer=[]) {
  const canvas=$('stock-chart');
  const width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=width*dpr;canvas.height=height*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const rebased=series=>series.map(value=>value/series[0]*100);
  const a=rebased(points), b=rebased(broad), related=rebased(peer);
  const lo=Math.min(...a,...b,...related)-.05,hi=Math.max(...a,...b,...related)+.05;
  ctx.strokeStyle=isLightTheme()?'#dce5e9':'#363640';
  for(let y=18;y<height;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  function draw(series,color) {
    ctx.lineWidth=1.8;ctx.strokeStyle=color;ctx.beginPath();
    series.forEach((value,i)=>{
      const x=7+i*(width-14)/(series.length-1),y=height-8-(value-lo)/(hi-lo)*(height-16);
      if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    });
    ctx.stroke();
  }
  if(b.length>1)draw(b,isLightTheme()?'#6550a0':'#bdabfb');
  if(related.length>1)draw(related,isLightTheme()?'#2468a2':'#8dc6ff');
  draw(a,a.at(-1)<100?(isLightTheme()?'#af2944':'#ff8999'):a.at(-1)>100?(isLightTheme()?'#087248':'#7ee0a8'):(isLightTheme()?'#536774':'#a4a4b6'));
}

function readWallet(key=paperAccountKey()) { return paper.decode(localStorage.getItem(key)); }
function renderWallet() { renderPortfolio(); refreshInvest(); }

function renderTicket(c) {
  if(!hasMarketSymbol(c)) {
    $('detail').innerHTML='<p class="empty">This node has no tradable quote. Select a listed company or fund.</p>';
    return;
  }
  if(publicExchange()) {
    $('detail').innerHTML='<p class="profile-note">Delayed exchange data is view-only. Use the replay session for paper fills.</p>'+replayAnchorLink(c.id);
    return;
  }
  $('detail').innerHTML='<form id="ticket" class="ticket"><p class="ticket-label">Paper market order · '+c.id+'</p><div class="trade-quote" id="trade-quote"></div><label>Side <select id="order-side"><option value="buy">Buy</option><option value="sell">Sell</option></select></label><label>Shares <input id="order-qty" type="number" value="1" min="1" max="100000" step="1" inputmode="numeric" required></label><p class="ticket-preview" id="ticket-preview"></p><button class="btn primary" id="place-order" type="submit">Place paper order</button><p class="ticket-status" id="ticket-status" aria-live="polite"></p></form>';
  $('ticket').addEventListener('input',updateTicket);
  $('ticket').addEventListener('submit',placeOrder);
  updateTicket();
}

function updateTicket() {
  const form=$('ticket');
  if(!form)return;
  const c=companies.get(state.selected), q=mark(c), side=$('order-side').value, qty=$('order-qty').valueAsNumber;
  const btn=$('place-order'), status=$('ticket-status');
  $('trade-quote').innerHTML=q?'<span>Bid '+money(q.bid)+'</span><span>Ask '+money(q.ask)+'</span>':'<span>Quote unavailable</span>';
  const amount=q && Number.isSafeInteger(qty) && qty>0 ? qty*paper.cents(side==='buy'?q.ask:q.bid) : null;
  $('ticket-preview').textContent=amount===null?'Order total —':(side==='buy'?'Estimated debit ':'Estimated credit ')+money(amount/100)+' · '+(q.recent?'current quote':'last available quote');
  btn.disabled=form.dataset.pending==='true' || !q?.tradable || amount===null;
  if(status.dataset.result!=='true')status.textContent=q?.tradable?'Simulated fill at bid or ask. No depth or fees.':sampleMode?'Choose a tradable instrument.':'A fresh regular-session quote from the real-time feed is required.';
}

async function placeOrder(event) {
  event.preventDefault();
  const form=event.currentTarget;
  if(form.dataset.pending==='true')return;
  const c=companies.get(state.selected),side=$('order-side').value,quantity=$('order-qty').valueAsNumber;
  const status=$('ticket-status');
  const walletKey=paperAccountKey();
  status.dataset.result='false';
  form.dataset.pending='true';
  updateTicket();
  const fill=async()=>{
    const q=mark(c);
    if(!q?.tradable)throw new Error('No fresh quote for this paper order.');
    const wallet=readWallet(walletKey);
    const price=side==='buy'?q.ask:q.bid;
    const next=paper.fill(wallet,{symbol:c.id,side,quantity,price,quoteAt:q.at,feed:q.feed,id:crypto.randomUUID(),at:new Date().toISOString()});
    localStorage.setItem(walletKey,JSON.stringify(next));
    return next.trades[0];
  };
  try {
    if(!sampleMode)await refreshQuotes();
    const receipt= navigator.locks ? await navigator.locks.request(walletKey+':lock', fill) : await fill();
    renderWallet();
    refreshDesk();
    status.dataset.result='true';
    status.classList.add('result');
    status.textContent='Filled · '+receipt.quantity+' '+receipt.symbol+' at '+money(receipt.amount/100);
    $('announcer').textContent=status.textContent;
  } catch(error) {
    status.dataset.result='true';
    status.classList.remove('result');
    status.textContent=error.message;
  } finally {
    form.dataset.pending='false';
    updateTicket();
  }
}

function refreshQuickNews() {
  const holder=$('quick-news');
  if(!holder)return;
  const news=companyNews(state.selected)[0];
  holder.innerHTML=news?'<button class="pop-news '+news.impacts[state.selected][0]+'" data-article="'+safeText(news.id)+'">'+safeText(news.title)+'</button>':'<span class="flat">No sourced headline available.</span>';
}

function relationshipCard(c, link) {
  const outgoing = c.id === link.from;
  const peer = companies.get(outgoing ? link.to : link.from);
  const directions = {
    partner: 'Partner',
    holding: outgoing ? 'Fund holds' : 'Held by fund',
    funding: outgoing ? 'Invests in' : 'Investor',
    spend: outgoing ? 'Supplier' : 'Customer'
  };
  const metadata = [link.value, link.date].filter(Boolean).join(' · ');
  const source = link.url
    ? '<a class="rel-source" href="'+safeText(link.url)+'" target="_blank" rel="noopener noreferrer" aria-label="Read source for '+safeText(peer.name)+'">Source</a>'
    : '';
  return '<div class="rel-wrap"><button class="relation" type="button" data-company="'+safeText(peer.id)+'">'+
    '<i class="dot '+link.type+'"></i><span class="content"><strong>'+safeText(peer.name)+'</strong>'+
    '<small>'+directions[link.type]+' · '+safeText(link.label)+(metadata?'<br>'+safeText(metadata):'')+'</small></span>'+
    '<span class="mark" aria-hidden="true">›</span></button>'+source+'</div>';
}

function companyHighlights(c) {
  const nearby = links.filter(link=>link.from===c.id || link.to===c.id);
  const picked = [];
  for(const type of ['funding','spend','holding','partner']) {
    const match = nearby.find(link=>link.type===type && link.value) ?? nearby.find(link=>link.type===type);
    if(match)picked.push(match);
  }
  for(const link of nearby) if(picked.length < 3 && !picked.includes(link))picked.push(link);
  return picked;
}

function hasMarketSymbol(c) {
  return sampleMode ? c.price!==undefined : Boolean(c.symbol);
}

function companyInstrument(c) {
  if(c.listing==='Fund') return 'Exchange-traded fund';
  if(c.listing==='Demo basket') return 'Demo basket';
  if(c.listing==='Private') return 'Private company';
  if(c.listing==='Research') return 'Research entity';
  return legacyMode ? 'Sample listed stock' : 'US equity';
}

function pricePlaceholder(c) {
  if(!hasMarketSymbol(c))return 'No exchange quote';
  if(publicExchange())return 'See exchange chart';
  return 'Quote unavailable';
}

function renderCompanyOverview(c) {
  let position = null;
  try { position = readWallet().positions[c.id] ?? null; } catch {}
  const links = companyHighlights(c);
  const news = companyNews(c.id);
  const note = legacyMode
    ? (c.downside ? '<p><strong>Growth driver:</strong> '+safeText(c.upside)+'.</p><p class="profile-note"><strong>What to watch:</strong> '+safeText(c.downside)+'.</p>' : '<p>Follow the investors and suppliers below to see how changes at this entity could reach the demo portfolio.</p>')
    : '<p>'+safeText(liveProfileNotes[c.id] ?? c.summary)+'</p>';

  $('detail').innerHTML =
    '<section class="profile-section"><h3>Market snapshot</h3><dl class="profile-facts">'+
    '<div><dt>Instrument</dt><dd>'+companyInstrument(c)+'</dd></div>'+
    '<div><dt>Quote midpoint</dt><dd id="profile-price">'+safeText(pricePlaceholder(c))+'</dd></div>'+
    '<div><dt>Bid / ask</dt><dd id="profile-spread">—</dd></div>'+
    '<div><dt>Paper position</dt><dd>'+(position?position.quantity+' shares':'No shares')+'</dd></div>'+
    '</dl><p id="profile-quote-time" class="performance-notice"></p></section>'+
    '<section class="profile-section"><h3>Why this company matters</h3>'+note+'</section>'+
    '<section class="profile-section"><h3>Key connections</h3>'+
    (links.length ? links.map(link=>relationshipCard(c,link)).join('') : '<p>No relationships are mapped for this entity.</p>')+'</section>'+
    (news.length ? '<section class="profile-section"><h3>News and disclosures</h3>'+news.slice(0,2).map(article=>headline(article,c.id)).join('')+'</section>' : '');
}

function openQuickCard() {
  const c = companies.get(state.selected);
  const panel = $('node-popover');
  const links = companyHighlights(c);
  const record = readWatch().includes(c.id);
  const movement=sampleDayMove(c);
  panel.innerHTML = '<button class="close" data-quick-close aria-label="Close company card">×</button>'+
    '<p class="eyebrow">'+safeText(c.id)+'</p><h2 id="popover-title" tabindex="-1">'+safeText(c.name)+'</h2>'+
    '<p class="node-type">'+safeText(c.sector)+' · '+companyInstrument(c)+'</p>'+
    '<p class="pop-summary">'+safeText(c.summary)+'</p>'+
    '<dl><div><dt>Quote midpoint</dt><dd id="quick-price">'+safeText(pricePlaceholder(c))+'</dd></div>'+
    '<div><dt>'+ (movement!==null ? 'Sample day move</dt><dd id="quick-move" class="'+tone(movement)+'">'+signed(movement) : 'Mapped relationships</dt><dd>'+linksCount(c)) +'</dd></div></dl>'+
    '<div class="pop-actions"><button class="btn primary compact" data-pop-tab="overview">Full profile</button><button class="btn secondary compact" data-open-research="'+c.id+'">Research</button>'+
    '<button class="btn secondary compact" data-pop-tab="connections">Connections</button>'+
    '<button class="btn secondary compact" data-pop-tab="performance">Chart</button>'+
    '<button class="btn secondary compact" data-pop-tab="news">News</button>'+
    (hasMarketSymbol(c)?'<button class="btn secondary compact" data-pop-tab="trade">Trade</button><button class="btn secondary compact" data-basket-symbol="'+c.id+'">Add to basket</button>':'')+'</div>'+
    (links.length?'<section class="peek-links"><h3>Key connections</h3>'+links.slice(0,2).map(link=>relationshipCard(c,link)).join('')+'</section>':'')+
    '<div id="quick-news" class="peek-links"></div>'+
    '<button class="watch-button" data-watch-toggle aria-pressed="'+record+'">'+(record?'Remove from watchlist':'Add to watchlist')+'</button>';
  panel.hidden = false;
  panel.scrollTop = 0;
  nodeButtons.get(c.id).setAttribute('aria-expanded','true');
  refreshQuickNews();
  updateEntityQuote();
  positionQuickCard();
  $('popover-title').focus({preventScroll:true});
}

function linksCount(c) {
  return links.filter(link=>link.from===c.id || link.to===c.id).length;
}
function positionQuickCard() {
  const panel=$('node-popover');
  if(panel.hidden||matchMedia('(max-width:780px)').matches)return;
  const anchor=nodeButtons.get(state.selected).getBoundingClientRect();
  const width=panel.offsetWidth,height=panel.offsetHeight;
  const right=anchor.right+9;
  panel.style.left=Math.max(12,Math.min(innerWidth-width-12,right+width < innerWidth ? right : anchor.left-width-9))+'px';
  panel.style.top=Math.max(10,Math.min(innerHeight-height-10,anchor.top+6))+'px';
}
function closeQuickCard(returnFocus=false) {
  const panel=$('node-popover');
  if(panel.hidden)return;
  panel.hidden=true;
  const node=nodeButtons.get(state.selected);
  node?.setAttribute('aria-expanded','false');
  if(returnFocus)node?.focus({preventScroll:true});
}
function toggleWatch(id) {
  const watch=readWatch();
  try{
    const saved=watch.includes(id)?watch.filter(value=>value!==id):[...watch,id];
    localStorage.setItem(stateKey('watch'),JSON.stringify(saved));
    updateTicker();
    openQuickCard();
  } catch(error){$('announcer').textContent=error.message;}
}
window.addEventListener('storage',event=>{
  if(event.key===paperAccountKey()){renderWallet();refreshDesk();}
  if(event.key===stateKey('watch'))updateTicker();
});
