'use strict';

// Illustrative seeds for a reproducible showcase. None are exchange observations.
const replaySeeds = {
  MSFT:[508,.81], AMZN:[233,-.63], NVDA:[191,2.40],
  AMD:[226,1.28], AVGO:[351,.75], CRWV:[93,-1.20], ORCL:[202,-.40],
  GOOGL:[287,1.05], META:[603,.44], ANT:[101,1.67], AIAI:[100,1.10]
};
const indiaReplaySeeds = {
  BHARTIARTL:[1920,-.38],TATACOMM:[1760,1.26],
  TCS:[3210,.52],INFY:[1620,-.77],WIPRO:[253,.32],AIAI:[100,1.10]
};
const replayOpen = Date.parse(indiaMarket?'2026-11-20T09:15:00+05:30':'2026-11-20T09:30:00-05:00');
const replayClose = Date.parse(indiaMarket?'2026-11-20T15:30:00+05:30':'2026-11-20T16:00:00-05:00');
const replayStart = replayOpen + 60*60_000;
const replayStep = 2*60_000;
const lastReplayTick = Math.ceil((replayClose-replayStart)/replayStep);
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
  }
];

const indiaReplayNews = [{
  id:indiaStress.story,title:'Scenario: GPU deliveries slow',time:'2026-11-20T09:51:00+05:30',
  source:'Showcase scenario',topic:'AI infrastructure',scenario:true,
  body:'Assume planned GPU deliveries slip. Tata Communications and Reliance have disclosed collaborations with NVIDIA. The delay and modeled price moves are illustrative.',
  impacts:{
    NVDA:['flat','The scenario assumes a supply delay. NVIDIA is shown as an external partner in this workspace.'],
    TATACOMM:['down','The stress test assumes Tata Communications declines 5%.'],
    RELIANCE:['down','The stress test assumes Reliance declines 8%.'],
    AIAI:['down','The demo basket has exposure to both companies.']
  }
}];

function replayDataset() {
  const live = indiaMarket?indiaDataset():liveDataset();
  const stress = indiaMarket?indiaStress:replayStress;
  const group = 0;
  const basket = [stress.fund,stress.fundName,'Demo allocation','Demo basket',
    'The illustrative basket holds 40% '+stress.chipName+', 30% '+stress.cloudName+', and 30% other assets.'];
  const groups = live.groups.map(([name,rows],index)=>[name,index===group?[...rows,basket]:rows]);
  const companies = new Map(live.companies);
  const [id,name,sector,listing,summary] = basket;
  companies.set(id,{id,name,sector,listing,summary,group,index:groups[group][1].length-1});
  const prices={...coverageReplayPrices(indiaMarket?'india':'us'),...(indiaMarket?indiaReplaySeeds:replaySeeds)};
  for(const [symbol,[price,change]] of Object.entries(prices)) {
    companies.set(symbol,{...companies.get(symbol),price,change});
  }
  const links = [
    ...live.links,
    ...[[stress.chip,'40% demo weight'],[stress.cloud,'30% demo weight']].map(([to,value],index)=>({
      id:live.links.length+index,from:id,to,type:'holding',label:'Showcase basket allocation',value,date:'Showcase assumption'
    }))
  ];
  return {groups,companies,links,articles:[...(indiaMarket?indiaReplayNews:replayNews),...live.articles],research:live.research};
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
