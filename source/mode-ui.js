'use strict';

const modeParams = new URLSearchParams(location.search);
const requestedMode = modeParams.get('mode');
const activeMode = ['live','replay','sample'].includes(requestedMode) ? requestedMode : document.body.dataset.initialMode || '';
const sampleMode = activeMode !== 'live';
const replayMode = activeMode === 'replay';
const legacyMode = !replayMode && sampleMode;
const marketBackend = document.body.dataset.marketBackend !== 'static' && location.protocol !== 'file:';

const easternClock = new Intl.DateTimeFormat('en-US',{
  timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',
  hour:'numeric',minute:'2-digit',hourCycle:'h23'
});
const nyseCalendar = new Map([
  ['2026-01-01',0],['2026-01-19',0],['2026-02-16',0],['2026-04-03',0],['2026-05-25',0],
  ['2026-06-19',0],['2026-07-03',0],['2026-09-07',0],['2026-11-26',0],['2026-11-27',780],
  ['2026-12-24',780],['2026-12-25',0],
  ['2027-01-01',0],['2027-01-18',0],['2027-02-15',0],['2027-03-26',0],['2027-05-31',0],
  ['2027-06-18',0],['2027-07-05',0],['2027-09-06',0],['2027-11-25',0],['2027-11-26',780],['2027-12-24',0]
]);

function regularSession(at=Date.now()) {
  const {year,month,day,weekday,hour,minute}=Object.fromEntries(easternClock.formatToParts(at).map(({type,value})=>[type,value]));
  const date=year+'-'+month+'-'+day;
  const minuteOfDay=Number(hour)*60+Number(minute);
  const close=nyseCalendar.get(date) ?? (weekday==='Sat'||weekday==='Sun'?0:960);
  const open=close>0 && minuteOfDay>=570 && minuteOfDay<close;
  const state=open?'U.S. regular session open':close>0 && minuteOfDay<570?'Before the U.S. open':'U.S. regular session closed';
  const time=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(at);
  return {open,state,time,close};
}

function modeLink(mode, {page='', symbol=''}={}) {
  const params=new URLSearchParams({mode});
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
  if(activeMode)return;
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
