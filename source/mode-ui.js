'use strict';

const modeParams = new URLSearchParams(location.search);
const requestedMode = modeParams.get('mode');
const activeMode = ['live','replay','sample'].includes(requestedMode) ? requestedMode : document.body.dataset.initialMode || '';
const sampleMode = activeMode !== 'live';
const replayMode = activeMode === 'replay';
const legacyMode = !replayMode && sampleMode;
const marketRegion = activeMode!=='sample' && modeParams.get('region')==='india'?'india':'us';
const indiaMarket = marketRegion==='india';
const marketTimeZone = indiaMarket?'Asia/Kolkata':'America/New_York';
const marketBackend = !indiaMarket && document.body.dataset.marketBackend !== 'static' && location.protocol !== 'file:';

const easternClock = new Intl.DateTimeFormat('en-US',{
  timeZone:marketTimeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',
  hour:'numeric',minute:'2-digit',hourCycle:'h23'
});
const nyseCalendar = new Map([
  ['2026-01-01',0],['2026-01-19',0],['2026-02-16',0],['2026-04-03',0],['2026-05-25',0],
  ['2026-06-19',0],['2026-07-03',0],['2026-09-07',0],['2026-11-26',0],['2026-11-27',780],
  ['2026-12-24',780],['2026-12-25',0],
  ['2027-01-01',0],['2027-01-18',0],['2027-02-15',0],['2027-03-26',0],['2027-05-31',0],
  ['2027-06-18',0],['2027-07-05',0],['2027-09-06',0],['2027-11-25',0],['2027-11-26',780],['2027-12-24',0]
]);

const indiaHolidays=new Set([
  '2026-01-26','2026-03-03','2026-03-26','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-28',
  '2026-06-26','2026-09-14','2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25'
]);

function regularSession(at=Date.now()) {
  const {year,month,day,weekday,hour,minute}=Object.fromEntries(easternClock.formatToParts(at).map(({type,value})=>[type,value]));
  const date=year+'-'+month+'-'+day;
  const minuteOfDay=Number(hour)*60+Number(minute);
  const weekend=weekday==='Sat'||weekday==='Sun';
  const start=indiaMarket?555:570;
  const close=indiaMarket?(weekend || indiaHolidays.has(date)?0:930):nyseCalendar.get(date) ?? (weekend?0:960);
  const open=close>0 && minuteOfDay>=start && minuteOfDay<close;
  const place=indiaMarket?'Indian':'U.S.';
  const state=open?place+' regular session open':close>0 && minuteOfDay<start?'Before the '+place+' open':place+' regular session closed';
  const time=new Intl.DateTimeFormat(indiaMarket?'en-IN':'en-US',{timeZone:marketTimeZone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(at);
  return {open,state,time,close};
}

function modeLink(mode='', {page='', symbol='', region=marketRegion}={}) {
  const params=new URLSearchParams();
  if(mode)params.set('mode',mode);
  if(region==='india')params.set('region','india');
  if(symbol)params.set('symbol',symbol);
  return '?'+params.toString()+(page?'#'+page:'');
}

function setupModeScreen() {
  document.body.dataset.mode=activeMode||'choose';
  $('main').hidden=!activeMode;
  $('session-gate').hidden=Boolean(activeMode);
  $('workspace-controls').hidden=!activeMode;
  const title=$('mode-current');
  title.textContent=replayMode?'Market Replay':legacyMode?'Classic Simulation':'Live Market';
  title.href=modeLink();
  const headerRegion=$('workspace-region');
  headerRegion.value=marketRegion;
  $('workspace-region-control').hidden=!activeMode || legacyMode;
  headerRegion.addEventListener('change',()=>location.assign(modeLink(activeMode,{region:headerRegion.value,page:workspaceFromLocation()})));
  if(activeMode)return;
  document.querySelectorAll('[data-gate-region]').forEach(link=>{
    const region=link.dataset.gateRegion;
    link.href=modeLink('',{region});
    if(region===marketRegion)link.setAttribute('aria-current','true');
  });
  const startPicker=$('gate-start');
  try {
    const saved=localStorage.getItem('aster:start-page');
    if([...startPicker.options].some(option=>option.value===saved))startPicker.value=saved;
  } catch {}
  const updateLinks=()=>{
    const page=startPicker.value==='overview'?'':startPicker.value;
    $('gate-live-action').href=modeLink('live',{page});
    $('gate-replay-action').href=modeLink('replay',{page});
  };
  startPicker.addEventListener('change',()=>{
    try {localStorage.setItem('aster:start-page',startPicker.value);} catch {}
    updateLinks();
  });
  updateLinks();
  if(indiaMarket) {
    $('gate-live-badge').textContent='INDIAN EQUITIES';
    $('gate-hours').href='https://www.nseindia.com/static/market-data/market-timings';
    $('gate-hours').textContent='Indian market hours';
    $('gate-live-description').textContent='Browse Indian companies, their BSE closing-price charts, and the disclosures behind their relationships.';
    $('gate-replay-description').textContent='Run an illustrative Indian market session. Step through prices, trade in virtual rupees, and trace a GPU supply shock.';
    const diagram=$('gate-network');
    diagram.setAttribute('aria-label','ONGC and IndianOil are co-promoters of Petronet LNG. IndianOil and ICICI Bank are co-venturers in IndianOil LNG at Ennore.');
    diagram.querySelectorAll('.gate-node').forEach((node,index)=>{node.textContent=['ONGC','IndianOil','ICICI Bank'][index];});
  }
  const update=()=>{
    const session=regularSession();
    $('gate-session-label').textContent=session.state;
    $('gate-market-clock').textContent=session.time;
    $('gate-session').dataset.state=session.open?'open':'closed';
    $('gate-replay-badge').textContent=session.open?'PAPER PRACTICE':'AFTER-HOURS DEMO';
  };
  update();
  setInterval(update,30_000);
}
