'use strict';

// Illustrative seeds for a reproducible showcase. None are exchange observations.
const replaySeeds = {
  SPY:[670,.36], MSFT:[508,.81], AMZN:[233,-.63], NVDA:[191,2.40],
  AMD:[226,1.28], AVGO:[351,.75], CRWV:[93,-1.20], ORCL:[202,-.40],
  GOOGL:[287,1.05], META:[603,.44], ANT:[101,1.67], AIAI:[100,1.10]
};
const replayOpen = Date.parse('2026-11-20T09:30:00-05:00');
const replayStart = replayOpen + 60*60_000;
const replayStep = 2*60_000;
const lastReplayTick = 165;
const replayStoryId = 'replay-cloud-review';

const replayNews = [
  {
    id:replayStoryId, title:'Scenario: OpenAI reviews its planned cloud capacity', time:'2026-11-20T10:12:00-05:00',
    source:'Showcase scenario',topic:'Cloud demand',scenario:true,
    body:'Assume a slowdown in demand for AI infrastructure. Affected capacity orders and supplier spending could fall. The relationship map uses disclosed contracts and purchases. This event and its modeled price moves are illustrative.',
    impacts:{
      OPENAI:['flat','The scenario assumes a review of planned spending. OpenAI has no exchange quote.'],
      CRWV:['down','The stress test assumes a CoreWeave decline of 8%.'],
      NVDA:['down','The stress test assumes a NVIDIA decline of 5%.'],
      AIAI:['down','The demo basket has overlapping NVIDIA and CoreWeave exposure.']
    }
  },
  {
    id:'replay-benchmark-check',title:'Scenario: Broad market holds steady at the open',time:'2026-11-20T09:42:00-05:00',
    source:'Showcase scenario',topic:'Benchmark',scenario:true,
    body:'The hypothetical benchmark session keeps broad-market moves small while individual AI stocks react more strongly.',
    impacts:{
      SPY:['flat','This is the simulated benchmark tape for the showcase.'],
      NVDA:['flat','Benchmark resilience does not remove company-specific exposure.']
    }
  }
];

function replayDataset() {
  const live = liveDataset();
  const group = 0;
  const basket = ['AIAI','Aster AI Basket','Demo allocation','Demo basket','An illustrative basket used to demonstrate overlap. The stress-test weights are 40% NVIDIA, 30% CoreWeave, and 30% other assets. It is not a listed fund.'];
  const groups = live.groups.map(([name,rows],index)=>[name,index===group?[...rows,basket]:rows]);
  const companies = new Map(live.companies);
  const [id,name,sector,listing,summary] = basket;
  companies.set(id,{id,name,sector,listing,summary,group,index:groups[group][1].length-1});
  for(const [symbol,[price,change]] of Object.entries(replaySeeds)) {
    companies.set(symbol,{...companies.get(symbol),price,change});
  }
  const links = [
    ...live.links,
    ...[['NVDA','40% demo weight'],['CRWV','30% demo weight']].map(([to,value],index)=>({
      id:live.links.length+index,from:id,to,type:'holding',label:'Showcase basket allocation',value,date:'Showcase assumption'
    }))
  ];
  return {groups,companies,links,articles:[...replayNews,...live.articles],research:live.research};
}

const exampleStress = {
  trigger:'NOVA',chip:'ATLS',cloud:'GRID',fund:'INNO',
  story:'nova-reduction',title:'What if Nova cuts cloud spending?',
  path:'Nova cuts cloud orders → GridCloud spends less on chips → Atlas sales are exposed',
  chipName:'Atlas',cloudName:'GridCloud',fundName:'Innovation ETF'
};
const replayStress = {
  trigger:'OPENAI',chip:'NVDA',cloud:'CRWV',fund:'AIAI',
  story:replayStoryId,title:'What if OpenAI slows cloud spending?',
  path:'OpenAI cuts planned cloud demand → CoreWeave trims spending → NVIDIA sales are exposed',
  chipName:'NVIDIA',cloudName:'CoreWeave',fundName:'Aster AI Basket'
};
