'use strict';

const researchPanel = {symbol:null,tab:'overview',request:0,period:'1D',chartObserver:null};
const sampleFinancials={
  ATLS:['₹3,820 cr','+18.4%','24.6%'],
  GRID:['₹1,490 cr','+26.1%','12.8%'],
  LUMN:['₹355 cr','+32.4%','8.1%'],
  VCTR:['₹2,250 cr','+9.3%','17.5%'],
  EMBER:['₹540 cr','−4.1%','9.0%'],
  HALO:['₹830 cr','+15.6%','11.4%'],
  ORBT:['₹1,230 cr','+11.7%','13.1%'],
  VLT:['₹860 cr','+8.6%','14.5%'],
  SGL:['₹290 cr','+6.2%','5.4%']
};
const reportedFinancials={
  NVDA: {
    period:'Q3 FY2027 · quarter ended 25 Oct 2026',
    rows:[['Revenue','$115.8 billion'],['Revenue growth YoY','+103%'],['GAAP gross margin','74.8%'],['Operating income','$77.5 billion']],
    url:'https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Third-Quarter-Fiscal-2027/default.aspx'
  },
  MSFT: {
    period:'Q1 FY2027 · quarter ended 30 Sep 2026',
    rows:[['Revenue','$92.3 billion'],['Revenue growth YoY','+19%'],['Operating income','$45.9 billion'],['GAAP diluted EPS','$4.92']],
    url:'https://www.microsoft.com/en-us/investor/earnings/fy-2027-q1/press-release-webcast'
  }
};
const companyFilingLinks={
  NVDA:'https://www.sec.gov/edgar/browse/?CIK=1045810',
  MSFT:'https://www.sec.gov/edgar/browse/?CIK=789019',
  AMZN:'https://www.sec.gov/edgar/browse/?CIK=1018724',
  CRWV:'https://www.sec.gov/edgar/browse/?CIK=1769628',
  ANT:'https://investor.anthropic.com/sec-filings/default.aspx',
  SPY:liveSources.spy
};

function profileFacts(items) {
  return '<dl class="profile-facts research-facts">'+items.map(([label,value])=>'<div><dt>'+safeText(label)+'</dt><dd>'+safeText(value)+'</dd></div>').join('')+'</dl>';
}
function openResearch(symbol,tab='overview') {
  if(!companies.has(symbol))return;
  closeQuickCard();
  researchPanel.symbol=symbol;
  researchPanel.tab=tab;
  renderResearch();
  const dialog=$('research-dialog');
  if(!dialog.open)dialog.showModal();
  loadNews(companies.get(symbol));
}
function refreshResearchIfSelected(symbol) {
  if($('research-dialog').open && researchPanel.symbol===symbol && researchPanel.tab==='news')renderResearch();
}

function researchNews(c) {
  const news = companyNews(c.id);
  if (!news.length)return '<p class="desk-empty">There are no headlines linked to this company.</p>';
  return '<div class="research-news-grid">'+news.map(article=>{
    const effect=article.impacts[c.id][0];
    const timestamp=sampleMode?article.time:timeLabel(article.time);
    return '<article class="research-news-card"><small>'+safeText(timestamp)+(article.source?' · '+safeText(article.source):'')+'</small>'+
      '<button type="button" class="'+effect+'" data-research-story="'+safeText(article.id)+'">'+safeText(article.title)+'</button>'+
      '<p>'+safeText(article.impacts[c.id][1])+'</p><span class="impact-tag '+effect+'">'+impactLabels[effect]+'</span></article>';
  }).join('')+'</div>';
}
function marketFacts(c) {
  const quote=mark(c);
  return profileFacts([
    ['Instrument',companyInstrument(c)],['Sector',c.sector],
    ['Midpoint',quote?money(quote.mid):pricePlaceholder(c)],
    ['Bid / ask',quote?money(quote.bid)+' / '+money(quote.ask):'—'],
    ['Relationships',String(linksCount(c))],['Data source',sampleMode?'Offline simulation':quote?feedLabel(quote.feed):'Dated company disclosures']
  ]);
}
function financeDetails(c) {
  const sample=sampleFinancials[c.id];
  const filed=reportedFinancials[c.id];
  if(sampleMode && sample) {
    return '<p class="desk-meta">Illustrative quarter · Fictional company figures</p>'+
      profileFacts([['Revenue',sample[0]],['Revenue growth YoY',sample[1]],['Operating margin',sample[2]]]);
  }
  if(!sampleMode && filed) {
    return '<p class="desk-meta">'+safeText(filed.period)+'</p>'+profileFacts(filed.rows)+
      '<p class="profile-note"><a href="'+filed.url+'" target="_blank" rel="noopener noreferrer">Read the earnings release</a></p>';
  }
  const url=companyFilingLinks[c.id];
  return '<p class="desk-empty">A financial snapshot is unavailable for this entity.</p>'+
    (!sampleMode&&url?'<p><a href="'+url+'" target="_blank" rel="noopener noreferrer">Open the issuer’s documents</a></p>':'');
}
function researchPeers(c) {
  const peers=[...companies.values()].filter(item=>item.id!==c.id && item.group===c.group && hasMarketSymbol(item));
  if(!peers.length)return '<p class="desk-empty">There are no listed peers in this part of the network.</p>';
  return '<div class="desk-table-scroll"><table class="desk-table"><thead><tr><th scope="col">Company</th><th scope="col">Sector</th><th scope="col">Midpoint</th></tr></thead><tbody>'+
    peers.map(peer=>{
      const quote=mark(peer);
      return '<tr><td><button type="button" class="desk-link" data-open-research="'+peer.id+'">'+safeText(peer.name)+'</button></td><td>'+
        safeText(peer.sector)+'</td><td>'+(quote?money(quote.mid):'—')+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function researchTechnicals(c,request) {
  if(!hasMarketSymbol(c) || (!sampleMode && !market.status?.configured))return '<p class="desk-empty">Technical indicators require price history.</p>';
  if(sampleMode) {
    const series=sampleTimeline(c).map(point=>point.value);
    const average=series.slice(-20).reduce((sum,price)=>sum+price,0)/Math.min(20,series.length);
    return '<p class="desk-meta">Simulated intervals from the Trading workspace timeframe.</p>'+
      profileFacts([['Session range',money(Math.min(...series))+' – '+money(Math.max(...series))],['20-interval average',money(average)]]);
  }
  getHistory(c.symbol,'daily').then(bars=>{
    if(request!==researchPanel.request || !$('research-dialog').open)return;
    const close=bars.map(bar=>bar.close);
    const average=(n)=>close.length<n?'Insufficient bars':money(close.slice(-n).reduce((sum,p)=>sum+p,0)/n);
    const recent=close.slice(-252);
    $('research-body').innerHTML='<p class="desk-meta">Completed daily bars · Split adjusted</p>'+profileFacts([
      ['20-session average',average(20)],['50-session average',average(50)],['200-session average',average(200)],
      ['252-session range',recent.length===252?money(Math.min(...recent))+' – '+money(Math.max(...recent)):'Insufficient bars']
    ]);
  }).catch(error=>{
    if(request===researchPanel.request)$('research-body').innerHTML='<p class="desk-empty">'+safeText(error.message)+'</p>';
  });
  return '<p class="desk-empty">Loading daily market bars…</p>';
}

function renderResearch() {
  const c=companies.get(researchPanel.symbol);
  if(!c)return;
  researchPanel.chartObserver?.disconnect();
  const request=++researchPanel.request;
  const mapped=links.filter(link=>link.to===c.id || link.from===c.id);
  $('research-hero').innerHTML='<p class="eyebrow">'+safeText(c.id)+' · '+(sampleMode?'SIMULATION':'COMPANY RESEARCH')+'</p><h2 id="research-title">'+safeText(c.name)+'</h2><p class="dialog-copy">'+safeText(c.summary)+'</p>';
  $('research-tabs').querySelectorAll('[data-research-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.researchTab===researchPanel.tab)));
  let content='';
  switch(researchPanel.tab) {
    case 'overview': {
      const relationships=companyHighlights(c).slice(0,3);
      content=marketFacts(c)+'<div class="research-block"><h3>What to watch</h3><p class="dialog-copy">'+safeText(sampleMode?(c.downside||'Follow the company’s linked suppliers and investments to see how a shock could spread.'):liveProfileNotes[c.id])+'</p></div>'+
        '<div class="research-block"><h3>Key connections</h3>'+relationships.map(link=>relationshipCard(c,link)).join('')+'</div>';
      break;
    }
    case 'chart':
      content = hasMarketSymbol(c) ?
        '<div class="invest-pills" aria-label="Company chart timeframe">'+investPeriodButtons('data-research-period',researchPanel.period)+'</div>'+
        '<div class="invest-stock-chart"><canvas id="research-chart" aria-label="Company price history" role="img"></canvas><p id="research-chart-message" hidden></p></div>'+
        '<p class="desk-meta">'+(sampleMode?'Fictional price history':'Market price history')+'</p>'+
        '<button type="button" class="invest-trade" data-invest-trade="'+c.id+'">Open paper order</button>' :
        '<p class="desk-empty">'+safeText(companyInstrument(c))+' · No price series.</p>';
      if (hasMarketSymbol(c)) requestAnimationFrame(() => loadResearchChart(c,request));
      break;
    case 'financials': content=financeDetails(c); break;
    case 'peers': content=researchPeers(c); break;
    case 'technicals': content=researchTechnicals(c,request); break;
    case 'ownership': {
      const selected=mapped.filter(link=>link.type==='funding'||link.type==='holding');
      content='<p class="desk-meta">Selected disclosed investments and fund holdings.</p><div class="research-block">'+
        (selected.length?selected.map(link=>relationshipCard(c,link)).join(''):'<p class="desk-empty">No ownership links are mapped.</p>')+'</div>';
      break;
    }
    case 'news': content=researchNews(c); break;
    case 'filings': {
      const commercial=mapped.filter(link=>link.type==='spend'||link.type==='partner');
      const documents = [...new Map(mapped.filter(link=>link.url).map(link=>[link.url,link])).values()];
      const issuer=companyFilingLinks[c.id];
      content='<div class="research-block"><h3>Commercial deals</h3>'+
        (commercial.length?commercial.map(link=>relationshipCard(c,link)).join(''):'<p class="desk-empty">No commercial deals are mapped.</p>')+
        '</div><div class="research-block"><h3>Source documents</h3>'+
        (issuer&&!sampleMode?'<p><a href="'+issuer+'" target="_blank" rel="noopener noreferrer">Open issuer filings and disclosures</a></p>':'')+
        (documents.length?'<ul class="research-docs">'+documents.map(link=>'<li><a href="'+link.url+'" target="_blank" rel="noopener noreferrer">'+safeText(link.label)+'</a><small> '+safeText(link.date)+'</small></li>').join('')+'</ul>':'<p class="desk-meta">'+(sampleMode?'Simulation documents are represented by the dated events in this workspace.':'No further documents in this dataset.')+'</p>')+'</div>';
      break;
    }
  }
  $('research-body').innerHTML=content;
}

async function loadResearchChart(c, request) {
  const period = researchPanel.period;
  let points = [], message = '';
  try {
    if (sampleMode) points = sampleTimeline(c,period);
    else if (market.status?.configured) {
      const bars = await getHistory(c.symbol,period === '1H' || period === '1D' ? 'intraday' : 'daily');
      points = selectPeriodBars(bars,period).map(bar => ({time:Date.parse(bar.at),value:bar.close}));
    } else message = 'Connect a market feed to show price history.';
  } catch { message = 'Price history is unavailable.'; }
  if (request !== researchPanel.request || !$('research-dialog').open) return;
  const canvas = $('research-chart'), status = $('research-chart-message');
  canvas.investPoints = points;
  researchPanel.chartObserver = new ResizeObserver(() => paintInvestChart(canvas,points));
  researchPanel.chartObserver.observe(canvas);
  paintInvestChart(canvas,points);
  status.hidden = points.length > 1;
  status.textContent = message || 'Price history is unavailable.';
}

document.getElementById('research-dialog').addEventListener('close',() => researchPanel.chartObserver?.disconnect());
document.addEventListener('click',event=>{
  const el=event.target.closest('button');
  if(!el)return;
  const {openResearch:target,researchTab,researchStory,company}=el.dataset;
  if(target)openResearch(target);
  if(researchTab){researchPanel.tab=researchTab;renderResearch();}
  if(el.dataset.researchPeriod){
    researchPanel.period=el.dataset.researchPeriod;
    renderResearch();
    $('research-body').querySelector('[aria-pressed="true"]')?.focus();
  }
  if(researchStory)showArticle(researchStory,researchPanel.symbol);
  if(company && el.closest('#research-dialog')) {
    openResearch(company);
    event.stopImmediatePropagation();
  }
});
