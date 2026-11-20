'use strict';
const {groups,companies,links,articles,research}=replayMode?replayDataset():legacyMode?sampleDataset():indiaMarket?indiaDataset():liveDataset();
const symbolFromMode=modeParams.get('symbol')?.toUpperCase();
const homeCompany=companies.has(symbolFromMode)?symbolFromMode:legacyMode?'NOVA':indiaMarket?'RELIANCE':'NVDA';
const shockExample=replayMode?(indiaMarket?indiaStress:replayStress):exampleStress;
const $ = (id) => document.getElementById(id);
const stage = $('stage'), viewport = $('graph'), canvas = $('edges'), query = $('search');
const edgeColors = {funding:'#9acbff',spend:'#4c9bff',holding:'#7190ed',partner:'#6095ce',peer:'#739ab9'};
const lightEdgeColors = {funding:'#2454aa',spend:'#0573ae',holding:'#3956b9',partner:'#365e88',peer:'#536f91'};
const edgePatterns = {funding:[],spend:[7,3],holding:[3,3],partner:[2,3.8],peer:[9,4,2,4]};
const isLightTheme = () => document.documentElement.dataset.theme === 'light';
const edgeNames = {funding:'equity links', spend:'purchase links', holding:'fund holdings', partner:'partnerships',peer:'peer links'};
const isDirected = (link) => link.type !== 'partner' && link.type !== 'peer';
const impactLabels = {up:'Potential upside',down:'Potential downside',flat:'Mixed or unclear'};
const periodNames = ['1H','1D','1M','1Y'];
const {trigger:shockTrigger,chip:shockChip,cloud:shockCloud,fund:shockFund}=shockExample;
const pathNodes = new Set([shockTrigger,shockChip,shockCloud,shockFund]);
const paths = new Set([...(shockExample.marketLinks?.map(link=>link.join('/')) ??
  [shockTrigger+'/'+shockCloud+'/spend',shockCloud+'/'+shockChip+'/spend']),
  shockFund+'/'+shockChip+'/holding',shockFund+'/'+shockCloud+'/holding']);
const shockMoves = {[shockChip]:-5,[shockCloud]:-8,[shockFund]:-4.4};
const fmt = (n) => (usesRupees()?'₹':'$') + n.toLocaleString(usesRupees()?'en-IN':'en-US');
const signed = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%';
const glyph = (id) => id.slice(0,2);
const state = {selected:homeCompany, filter:'all', sector:'', isolate:false, zoom:1, tab:'overview', period:'1D', shock:false, results:[], activeResult:-1};
const positions = new Map();
const nodeButtons = new Map();
const pulseCanvas=$('edge-pulse');
let pulseFrame=0;
let pulsePaths=[];
let glow=true;
let pulseDpr=1;
const columnPositions = legacyMode ? [.13,.38,.63,.87] : groups.map((_,index)=>(index+.5)/groups.length);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motion = () => reducedMotion.matches ? 'instant' : 'smooth';

groups.forEach(([name], index) => {
  const lane = document.createElement('div');
  lane.className = 'lane';
  lane.style.left = (columnPositions[index] * 100) + '%';
  const label = document.createElement('span');
  label.textContent = name.toUpperCase();
  lane.append(label);
  $('columns').append(lane);
  $('map-sector').add(new Option(name,String(index)));
});
companies.forEach((c) => {
  const button = document.createElement('button');
  button.className = 'node';
  button.dataset.company = c.id;
  button.dataset.group = c.group;
  button.type = 'button';
  button.setAttribute('aria-label', c.name + ' (' + c.id + ')');
  button.setAttribute('aria-controls', 'node-popover');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span class="node-glyph" aria-hidden="true">' + companyMark(c.id) + '</span><span class="node-name">' + c.name + '</span>';
  $('nodes').append(button);
  nodeButtons.set(c.id, button);
});
$('map-count').textContent = companies.size + ' entities · ' + links.length + ' relationships';
if(legacyMode) {
  $('network-description').textContent = 'Trace who funds whom and how one shock can reach your portfolio.';
  $('filters').querySelector('[data-filter="peer"]').hidden = true;
}

function inFeaturedSector(id) {
  return state.sector === '' || companies.get(id).group === Number(state.sector);
}

function linkVisible(link) {
  return (state.filter === 'all' || link.type === state.filter) && (inFeaturedSector(link.from) || inFeaturedSector(link.to));
}
function related(link) {
  return link.from === state.selected || link.to === state.selected;
}
function traced(link) {
  return state.shock && paths.has(link.from + '/' + link.to + '/' + link.type);
}
function paintGraph() {
  const width = stage.clientWidth, height = stage.clientHeight;
  if (!width || !height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  pulseDpr=dpr;
  pulsePaths=[];
  if(pulseCanvas.width!==Math.round(width*dpr) || pulseCanvas.height!==Math.round(height*dpr)) {
    pulseCanvas.width=Math.round(width*dpr);pulseCanvas.height=Math.round(height*dpr);
  }
  if (canvas.width !== Math.round(width*dpr) || canvas.height !== Math.round(height*dpr)) {
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  const visible = links.filter(link => (linkVisible(link) && (!state.isolate || related(link))) || traced(link));
  const highlighted = new Set([state.selected]);
  for (const link of links) {
    if (traced(link) || (linkVisible(link) && related(link))) {
      highlighted.add(link.from);
      highlighted.add(link.to);
    }
  }
  for (const [id, button] of nodeButtons) {
    button.classList.toggle('selected', id === state.selected);
    button.classList.toggle('dim', !highlighted.has(id) && (state.isolate || !inFeaturedSector(id)));
    button.classList.toggle('shocked', state.shock && pathNodes.has(id));
    button.setAttribute('aria-pressed', String(id === state.selected));
  }
  const weight = (link) => traced(link) ? 2 : related(link) ? 1 : 0;
  visible.sort((a,b) => weight(a) - weight(b));
  for (const link of visible) {
    const start = positions.get(link.from), end = positions.get(link.to);
    if (!start || !end) continue;
    const emphasis = weight(link);
    const color = emphasis === 2 ? (isLightTheme()?'#0c5dcc':'#bee9ff') : (isLightTheme()?lightEdgeColors:edgeColors)[link.type];
    const sameLane = start.x === end.x;
    const dir = end.x >= start.x ? 1 : -1;
    const offset = ((link.id % 5)-2) * 4;
    const x1 = start.x + (sameLane ? 20 : 21*dir);
    const x2 = end.x + (sameLane ? 20 : -21*dir);
    const y1 = start.y - 10 + offset / 2;
    const y2 = end.y - 10 + offset / 2;
    const span = sameLane ? 52 : Math.abs(x2-x1)*.40;
    const t = link.type === 'spend' && dir < 0 ? -28 : 0;
    const control1 = {x:x1 + span*dir, y:y1 + t + offset};
    const control2 = {x:x2 + span*(sameLane ? 1 : -dir), y:y2 + t + offset};
    if (glow) {
      const braid = ctx.createLinearGradient(x1,y1,x2,y2);
      braid.addColorStop(0,color+'20');
      braid.addColorStop(.51,color+(emphasis?'66':'28'));
      braid.addColorStop(1,color+'29');
      ctx.strokeStyle = braid;
      for (const thread of (link.type==='peer' ? [] : [-4,4])) {
        ctx.lineWidth=emphasis?1.2:.65;
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.bezierCurveTo(control1.x,control1.y+thread*3,control2.x,control2.y-thread*3,x2,y2);
        ctx.stroke();
      }
      if(isDirected(link) && (emphasis || link.type==='funding' || link.type==='spend')) {
        pulsePaths.push({x1,y1,x2,y2,control1,control2,emphasis,id:link.id,color});
      }
    }
    ctx.strokeStyle = color + (emphasis === 2 ? 'ec' : emphasis === 1 ? 'ce' : (glow?'96':'68'));
    ctx.lineWidth = emphasis === 2 ? 3 : emphasis === 1 ? 1.72 : .96;
    ctx.shadowBlur = emphasis === 2 ? 11 : emphasis === 1 ? 5 : 0;
    ctx.shadowColor = color;
    ctx.setLineDash(edgePatterns[link.type]);
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.bezierCurveTo(control1.x,control1.y,control2.x,control2.y,x2,y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    if ((emphasis || state.filter !== 'all') && isDirected(link)) {
      const angle = Math.atan2(y2-control2.y,x2-control2.x);
      const length = emphasis === 2 ? 9 : 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2-length*Math.cos(angle-.53), y2-length*Math.sin(angle-.53));
      ctx.lineTo(x2-length*Math.cos(angle+.53), y2-length*Math.sin(angle+.53));
      ctx.closePath();
      ctx.fill();
    }
  }
  updatePulses();
  $('map-filter-note').textContent = visible.length + ' ' + (state.filter === 'all' || state.shock ? 'links shown' : edgeNames[state.filter]);
}

function updatePulses() {
  if(activeMode && glow && !reducedMotion.matches && !document.hidden && !$('network-view').hidden) {
    if(!pulseFrame)pulseFrame=requestAnimationFrame(drawPulses);
  } else {
    cancelAnimationFrame(pulseFrame);
    pulseFrame=0;
    pulseCanvas.getContext('2d').clearRect(0,0,pulseCanvas.width,pulseCanvas.height);
  }
}

function drawPulses(now) {
  pulseFrame=0;
  if(!glow || reducedMotion.matches || document.hidden || $('network-view').hidden)return;
  const ctx=pulseCanvas.getContext('2d');
  ctx.setTransform(pulseDpr,0,0,pulseDpr,0,0);
  ctx.clearRect(0,0,pulseCanvas.width/pulseDpr,pulseCanvas.height/pulseDpr);
  for(const path of pulsePaths) {
    const t=((now/2600+path.id*.637)%1);
    const u=1-t;
    const x=u*u*u*path.x1+3*u*u*t*path.control1.x+3*u*t*t*path.control2.x+t*t*t*path.x2;
    const y=u*u*u*path.y1+3*u*u*t*path.control1.y+3*u*t*t*path.control2.y+t*t*t*path.y2;
    ctx.globalAlpha=Math.sin(t*Math.PI)*(path.emphasis?.92:.64);
    ctx.fillStyle=path.emphasis && !isLightTheme()?'#d8edff':path.color;
    ctx.beginPath();
    ctx.arc(x,y,path.emphasis?2.2:1.35,0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha=1;
  pulseFrame=requestAnimationFrame(drawPulses);
}

function sizeGraph() {
  const handheld = viewport.clientWidth < 580;
  const minimumWidth = legacyMode ? (handheld ? 640 : 590) : groups.length * 108;
  const baseWidth = Math.max(minimumWidth, viewport.clientWidth);
  const baseHeight = handheld ? 444 : Math.min(700,Math.max(510,Math.round(innerHeight*.58)));
  stage.style.width = Math.round(baseWidth * state.zoom) + 'px';
  stage.style.height = Math.round(baseHeight * state.zoom) + 'px';
  const width = stage.clientWidth, height = stage.clientHeight;
  const top = 81, bottom = 57;
  const spacing = handheld ? 78 : 116;
  for (const [id,c] of companies) {
    const groupLength = groups[c.group][1].length;
    const span = Math.min(spacing * (groupLength-1),height-top-bottom);
    const offset = groupLength===1 ? 0 : span*(c.index/(groupLength-1)-.5);
    const point = {x:width * columnPositions[c.group], y:(height+top-bottom)/2+offset};
    positions.set(id, point);
    const button = nodeButtons.get(id);
    button.style.left = point.x + 'px';
    button.style.top = point.y + 'px';
  }
  $('zoom-out').disabled = state.zoom <= 1;
  $('zoom-in').disabled = state.zoom >= 1.6;
  paintGraph();
}

function centerNode(id) {
  const point = positions.get(id);
  if (!point) return;
  viewport.scrollTo({left: point.x-viewport.clientWidth/2, top: point.y-viewport.clientHeight/2, behavior:motion()});
}

function renderInspector() {
  const c = companies.get(state.selected);
  const news = companyNews(c.id);
  $('entity').innerHTML = '<div class="entity"><div class="entity-top"><span class="entity-glyph" aria-hidden="true">' + companyMark(c.id) + '</span><div><h2 id="entity-title" tabindex="-1">' + c.name + '</h2><small>' + c.id + ' · ' + c.sector + ' · ' + companyInstrument(c) + '</small></div><span class="live-entity-quote" id="entity-quote"></span></div><p>' + c.summary + '</p></div>';
  $('news-count').textContent = news.length;
  $('detail-tabs').querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tab === state.tab)));
  $('detail').scrollTop = 0;
  if (state.tab === 'overview') renderCompanyOverview(c);
  if (state.tab === 'connections') renderConnections(c);
  if (state.tab === 'performance') renderPerformance(c);
  if (state.tab === 'trade') renderTicket(c);
  if (state.tab === 'news') $('detail').innerHTML = '<div class="news-legend"><span class="up">● Upside</span><span class="down">● Downside</span><span class="flat">● Mixed / unclear</span></div>' + (publicExchange() ? '<p class="performance-notice">Showing dated company disclosures.</p>' : !sampleMode && market.news[c.id]?.error ? '<p class="performance-notice">News feed unavailable. Showing the latest known updates.</p>' : '') + (news.length ? news.map(article => headline(article,c.id)).join('') : '<p class="empty">' + (sampleMode?'No sample news for this company.':'No sourced updates available for this entity yet.') + '</p>');
  $('headlines').innerHTML = state.tab !== 'news' && news.length ? '<div class="headlines"><div class="headline-head"><h3>Latest news</h3><button data-tab="news">All news</button></div>' + headline(news[0],c.id) + '</div>' : '';
  updateEntityQuote();
}
function renderConnections(c) {
  const visible = links.filter(related);
  const categories = [
    ['Investors', (l) => l.type === 'funding' && l.to === c.id],
    ['Investments', (l) => l.type === 'funding' && l.from === c.id],
    ['Fund holdings', (l) => l.type === 'holding'],
    ['Commercial ties', (l) => l.type === 'spend' || l.type === 'partner'],
    ['Industry peers', (l) => l.type === 'peer']
  ];
  const groups = categories.map(([label,match]) => {
    const matches = visible.filter(match);
    if (!matches.length) return '';
    return '<section class="relation-group"><h3>' + label + '</h3>' + matches.map(link=>relationshipCard(c,link)).join('') + '</section>';
  }).join('');
  $('detail').innerHTML = groups || '<p class="empty">No relationships in this dataset.</p>';
}

function randomStream(seed) {
  return () => {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function companySeed(c) {
  return [...c.id].reduce((value,ch) => value*31+ch.charCodeAt(0),17) >>> 0;
}
function scenarioReturns(c, horizon) {
  const draw = randomStream(companySeed(c) + 7919 * (horizon + 1));
  const volatility = [32,110,330,670][horizon];
  return Array.from({length:100}, () => Math.round((draw()+draw()-1)*volatility + c.change*(horizon+1)*6));
}
function renderSamplePerformance(c) {
  const horizon = periodNames.indexOf(state.period);
  if (c.price === undefined) {
    $('detail').innerHTML = '<p class="empty"><strong>'+companyInstrument(c)+'</strong><br>Explore its documented relationships in the Connections tab.</p>';
    return;
  }
  const daily = state.shock ? (shockMoves[c.id] ?? c.change) : c.change;
  const tape = sampleTimeline(c,state.period);
  const move = (tape.at(-1).value/tape[0].value-1)*100;
  const displayPrice = mark(c).mid;
  const totals = [0,0,0];
  for (const value of scenarioReturns({...c,change:daily},horizon)) totals[value>10 ? 0 : value<-10 ? 2 : 1]++;
  const name = ['up','flat','down'];
  $('detail').innerHTML =
    '<div class="periods" role="group" aria-label="Performance timeframe">' + periodNames.map(label => '<button data-period="' + label + '" aria-pressed="' + (label === state.period) + '">' + label + '</button>').join('') + '</div><div class="performance-meta"><span class="price-num">' + money(displayPrice) + '</span><strong class="' + (move>=0?'up':'down') + '">' + signed(move) + '</strong></div><canvas class="mini-chart" id="stock-chart" role="img" aria-label="' + c.name + ' fictional ' + state.period + ' line chart, ' + signed(move) + '"></canvas><div class="odds"><h3 class="eyebrow">SIMULATED OUTCOMES</h3><div class="odds-bar" aria-hidden="true">' + totals.map(n => '<span style="width:' + n + '%"></span>').join('') + '</div><div class="odds-label">' + totals.map((n,i) => '<span class="' + name[i] + '">' + n + '% ' + name[i] + '</span>').join('') + '</div></div><p class="performance-notice">100 fictional outcomes for ' + state.period + '. Flat is within ±0.1%.</p>' +
    (c.upside ? '<p class="performance-notice"><strong class="up">Upside:</strong> ' + c.upside + '<br><strong class="down">Risk:</strong> ' + c.downside + '</p>' : '');
  const values=tape.map(point=>point.value);
  const peer=replayMode?chartPeer(c):null;
  const peerValues=peer?sampleTimeline(peer,state.period).map(point=>point.value):[];
  const peerSummary=peerValues.length?'<span class="chart-peer">'+peer.id+' '+signed(seriesMove(peerValues))+'</span>':'';
  $('stock-chart').insertAdjacentHTML('afterend','<div class="chart-legend"><span>'+c.id+' · Base 100</span>'+peerSummary+'</div>');
  drawMarketChart(values,peerValues);
}

function activateNav(name) {
  document.querySelectorAll('[data-nav]').forEach(button => {
    const selected = button.dataset.nav === name;
    button.classList.toggle('active',selected);
    if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  const network = $('network-view');
  const showNetwork = name === 'network' || name === 'overview';
  const slot = $(name==='overview'?'overview-network-slot':'network-route-slot');
  const moved = showNetwork && network.parentElement !== slot;
  if(moved)slot.append(network);
  network.hidden = !showNetwork;
  $('trade-desk').hidden = name !== 'trading';
  const showWallet = name === 'network' || name === 'portfolio';
  $('wallet').hidden = !showWallet;
  $('portfolio').hidden = !sampleMode || !showWallet;
  switchInvestPage(name);
  if(moved) {
    sizeGraph();
    centerNode(state.selected);
  }
  if(name==='trading')showTrading();
  updatePulses();
}
function openWorkspace(name,scroll=true) {
  activateNav(name);
  try{history.replaceState(null,'','#'+name);}catch{}
  if(scroll){
    (name==='portfolio' ? $('wallet') : $('main')).scrollIntoView({behavior:motion(),block:'start'});
  }
}
function workspaceFromLocation() {
  const page = location.hash.slice(1);
  if (page==='wallet') return 'portfolio';
  if (page==='main') return 'network';
  return [...investPages,'network','portfolio','trading'].includes(page) ? page : document.body.dataset.initialView;
}
function selectCompany(id, follow = true) {
  if (!companies.has(id)) return;
  closeQuickCard();
  state.selected = id;
  if (!inFeaturedSector(id)) state.sector = $('map-sector').value = '';
  state.tab = 'overview';
  closeSearch();
  query.value = '';
  if ($('network-view').hidden) openWorkspace('network',false);
  const company = companies.get(id);
  if (invest.page==='overview' && !legacyMode && hasMarketSymbol(company) && invest.ticker!==id) {
    invest.ticker = $('overview-ticker').value = id;
    renderInvestOverview();
  }
  renderInspector();
  paintGraph();
  updateTicker();
  selectMarketEntity();
  centerNode(id);
  if (follow && matchMedia('(max-width:780px)').matches) {
    $('company-panel').scrollIntoView({behavior:motion(),block:'nearest'});
  }
  $('announcer').textContent = 'Selected ' + company.name + '. Company details updated.';
}

function showSearch() {
  const value = query.value.trim().toLowerCase();
  const keys = value.split(/\s+/).filter(Boolean);
  const all = [...companies.values()];
  state.results = all.filter(company => keys.every(term => [company.name,company.id,company.sector,company.listing,groups[company.group][0]].join(' ').toLowerCase().includes(term)))
    .sort((a,b) => (b.id.toLowerCase() === value) - (a.id.toLowerCase() === value) || a.name.localeCompare(b.name));
  state.activeResult = state.results.length ? 0 : -1;
  $('search-results').innerHTML = state.results.length ? state.results.map((c,index) => '<li id="search-option-' + index + '" role="option" data-company="' + c.id + '" aria-selected="false"><span>' + c.name + '</span><small>' + c.id + ' · ' + groups[c.group][0] + '</small></li>').join('') : '<li class="empty-result" role="option" aria-disabled="true">No matches. Try a company name, ticker or sector.</li>';
  $('search-results').hidden = false;
  query.setAttribute('aria-expanded','true');
  highlightResult(false);
}
function closeSearch() {
  $('search-results').hidden = true;
  query.setAttribute('aria-expanded','false');
  query.removeAttribute('aria-activedescendant');
}
function highlightResult(scroll) {
  $('search-results').querySelectorAll('[data-company]').forEach((item,index) => item.setAttribute('aria-selected',String(index===state.activeResult)));
  const active = $('search-option-' + state.activeResult);
  if (active) {
    query.setAttribute('aria-activedescendant',active.id);
    if(scroll) active.scrollIntoView({block:'nearest'});
  } else {
    query.removeAttribute('aria-activedescendant');
  }
}
function chooseSearch(id) {
  selectCompany(id,false);
  openQuickCard();
  $('popover-title')?.focus({preventScroll:true});
}
query.addEventListener('focus',showSearch);
query.addEventListener('input',showSearch);
query.addEventListener('keydown',(event) => {
  if(event.key==='Escape'){closeSearch();event.preventDefault();return;}
  if(!['ArrowDown','ArrowUp','Enter'].includes(event.key)) return;
  if(query.getAttribute('aria-expanded')==='false')showSearch();
  if(!state.results.length)return;
  event.preventDefault();
  if(event.key==='Enter') {chooseSearch(state.results[state.activeResult].id);return;}
  const delta = event.key==='ArrowDown' ? 1 : -1;
  state.activeResult = (state.activeResult+delta+state.results.length) % state.results.length;
  highlightResult(true);
});
$('search-wrap').addEventListener('focusout',event=>{if(!$('search-wrap').contains(event.relatedTarget)) closeSearch();});
$('search-results').addEventListener('mousedown',event=>event.preventDefault());
document.addEventListener('keydown', event => {
  if(!activeMode)return;
  if(event.key==='Escape' && !$('node-popover').hidden && !document.querySelector('dialog[open]')) {closeQuickCard(true);return;}
  if ((event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) || (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !document.querySelector('dialog[open]'))) {
    event.preventDefault();
    if (invest.page === 'markets') { $('invest-market-search').focus(); return; }
    if ($('network-view').hidden) openWorkspace('network');
    query.focus();
    query.select();
  }
});

function setFilter(filter) {
  state.filter = filter;
  $('filters').querySelectorAll('[data-filter]').forEach(button=>{
    button.classList.toggle('active',button.dataset.filter===filter);
    button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
  });
  paintGraph();
}
$('map-sector').addEventListener('change',event=>{
  state.sector = event.target.value;
  if(inFeaturedSector(state.selected)) paintGraph();
  else selectCompany(groups[Number(state.sector)][1][0][0],false);
});
function renderLossLimit() {
  const chipExposure = 5000 - Number($('shock-transfer').value);
  const cloudLoss = 3000*.08;
  const chipLoss = chipExposure*.05;
  const {chipName,cloudName}=shockExample;
  const threshold = chipExposure ? ((500-cloudLoss)/chipExposure*100).toFixed(1)+'%' : 'No '+chipName+' exposure';
  $('shock-limit-result').innerHTML = '<div><span>'+chipName+' contribution (−5%)</span><strong class="down">−'+fmt(chipLoss)+'</strong></div>'+
    '<div><span>'+cloudName+' contribution (−8%)</span><strong class="down">−'+fmt(cloudLoss)+'</strong></div>'+
    '<div><span>Simulated loss</span><strong class="down">−'+fmt(chipLoss+cloudLoss)+'</strong></div>'+
    '<div><span>'+chipName+' decline at the '+fmt(500)+' limit</span><strong>'+threshold+'</strong></div>';
}
$('shock-transfer').addEventListener('change',renderLossLimit);
renderLossLimit();

function toggleShock(force) {
  state.shock = typeof force === 'boolean' ? force : !state.shock;
  $('run-shock').textContent = state.shock ? 'Reset shock' : 'Run shock';
  const result = $('shock-result');
  result.hidden = !state.shock;
  if (state.shock) {
    if (invest.page!=='network') openWorkspace('network',false);
    market.shockTick=market.ticks;
    state.isolate = false;
    $('isolate').setAttribute('aria-pressed','false');
    selectCompany(shockTrigger,false);
    setFilter('all');
    updateTicker();renderWallet();
    const {path,chipName,cloudName,fundName}=shockExample;
    const parts = [
      [chipName+' · direct holding', 4000, 500],
      [chipName+' · through '+fundName,1600,500],
      [cloudName+' · through '+fundName,1200,800]
    ].map(([label,exposure,basisPoints])=>[label,exposure*basisPoints/10000]);
    const loss = parts.reduce((sum,[,value])=>sum+value,0);
    result.innerHTML = '<div class="shock-results"><div><p class="path-label"><strong>'+path+'</strong></p><p>Scenario assumptions: '+chipName+' −5%, '+cloudName+' −8%, other holdings unchanged.</p><ul class="shock-list">' + parts.map(([label,amount])=>'<li><span>'+label+'</span><strong>−'+fmt(amount)+'</strong></li>').join('')+'</ul></div><div><span class="eyebrow">ESTIMATED LOSS</span><div class="loss-total">−'+fmt(loss)+'</div><p class="balance-after">'+fmt(10000-loss)+' remaining ('+(loss/100).toFixed(2)+'% down)</p><p>Bright blue lines trace the modeled exposure.</p></div></div>';
    $('announcer').textContent = 'Shock applied. Estimated loss ' + fmt(loss) + '.';
  } else {
    renderInspector();
    paintGraph();
    updateTicker();renderWallet();
    $('announcer').textContent = 'Shock reset.';
  }
}

document.addEventListener('click',event => {
  const el = event.target.closest('button, [data-company]');
  if(!$('node-popover').contains(event.target) && !event.target.closest('[data-company]'))closeQuickCard();
  if(!el){if(!$('search-wrap').contains(event.target))closeSearch();return;}
  const {company,filter,tab,nav,article,period,close} = el.dataset;
  if (company) {
    if(el.closest('#search-results'))chooseSearch(company);
    else {selectCompany(company,false);openQuickCard();}
  } else if (filter) setFilter(filter);
  else if (tab || el.dataset.popTab) {
    const fromOutside = Boolean(el.closest('#headlines, .profile-heading') || el.dataset.popTab);
    state.tab=tab || el.dataset.popTab;
    closeQuickCard();
    renderInspector();
    if(fromOutside) {
      $('company-panel').scrollIntoView({behavior:motion(),block:'nearest'});
      $('detail-tabs').querySelector('[data-tab="'+state.tab+'"]').focus({preventScroll:true});
    }
  }
  else if (article) showArticle(article);
  else if ('quickClose' in el.dataset) closeQuickCard(true);
  else if ('watchToggle' in el.dataset) toggleWatch(state.selected);
  else if (period) {state.period=period;renderInspector();$('detail').querySelector('[data-period="'+period+'"]')?.focus({preventScroll:true});}
  else if (close) $(close).close();
  else if (nav) {
    if(nav==='evidence') $('evidence-dialog').showModal();
    else openWorkspace(nav);
  } else if (el.id === 'pulse-toggle') {
    glow=!glow;
    el.setAttribute('aria-pressed',String(glow));
    paintGraph();
  } else if (el.id === 'isolate') {
    state.isolate = !state.isolate;
    el.setAttribute('aria-pressed',String(state.isolate));
    paintGraph();
  } else if (el.id.startsWith('zoom-')) {
    state.zoom = el.id === 'zoom-reset' ? 1 : Math.round(Math.max(1,Math.min(1.60,state.zoom+(el.id==='zoom-in'?.2:-.2)))*10)/10;
    sizeGraph();
    centerNode(state.selected);
  } else if (el.id === 'overview-risk') {
    if(sampleMode) {
      openWorkspace('network',false);
      $('portfolio').scrollIntoView({behavior:motion(),block:'start'});
    } else location.assign(modeLink('replay',{page:'network'}));
  } else if (el.id === 'run-shock') { toggleShock(); $('portfolio').scrollIntoView({behavior:motion(),block:'nearest'}); }
  else if ('newsShock' in el.dataset) {
    $('article-dialog').close();
    toggleShock(true);
    $('portfolio').scrollIntoView({behavior:motion(),block:'nearest'});
  }
});
$('evidence-list').innerHTML = research.map(([title,note,url])=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+title+'<small>'+note+'</small></a>').join('');
const resizer = new ResizeObserver(() => {
  if(!activeMode || $('network-view').hidden)return;
  sizeGraph();
  positionQuickCard();
  if(state.tab==='performance') renderPerformance(companies.get(state.selected));
});
resizer.observe(viewport);
setupModeScreen();
$('market-foot').textContent=legacyMode
  ?'CLASSIC SIMULATION · Fictional companies, prices and virtual funds.'
  :replayMode?'REPLAY · Real companies and dated disclosures. Illustrative prices and paper fills.'
  :'LIVE MARKET · Actual market data. Public quotes are delayed or end-of-day. Paper orders only.';
$('evidence-copy').textContent=legacyMode?'Research behind the fictional map and scenarios.':'Dated disclosures show selected company links. These relationships can change.';
if(replayMode) {
  $('scenario-title').textContent=shockExample.title;
  $('scenario-copy').textContent='Trace the scenario through a preset '+fmt(10000)+' virtual portfolio.';
  $('shock-limit-label').textContent='Explore a '+fmt(500)+' loss limit';
  $('shock-limit-copy').textContent='This separate demo starts with '+fmt(5000)+' in '+shockExample.chipName+', '+
    fmt(3000)+' in '+shockExample.cloudName+', and '+fmt(2000)+' in virtual cash.';
  $('shock-transfer-label').textContent='Move '+shockExample.chipName+' exposure to virtual cash';
  Array.from($('shock-transfer').options).forEach(option=>{option.textContent=fmt(Number(option.value));});
}
startInvest();
if(activeMode) {
  startDesk();
  startPortfolio();
  if(companies.has(symbolFromMode) && hasMarketSymbol(companies.get(symbolFromMode)))desk.chartSymbol=symbolFromMode;
  activateNav(workspaceFromLocation());
  window.addEventListener('hashchange',() => activateNav(workspaceFromLocation()));
  renderInspector();
  sizeGraph();
  if(!$('network-view').hidden)centerNode(state.selected);
  updateTicker();
  renderWallet();
  startMarket();
}
viewport.addEventListener('scroll',positionQuickCard,{passive:true});
window.addEventListener('scroll',positionQuickCard,{passive:true});
window.addEventListener('resize',positionQuickCard);

document.addEventListener('visibilitychange',updatePulses);
reducedMotion.addEventListener('change',updatePulses);
