'use strict';

const indiaGroups = [
  ['Telecom', [
    ['BHARTIARTL','Bharti Airtel','Telecom and cloud','Listed','Bharti Airtel operates telecom and enterprise networks and announced a long-term cloud collaboration with Google Cloud.','BHARTIARTL'],
    ['TATACOMM','Tata Communications','Network and AI cloud','Listed','Tata Communications operates enterprise networks and announced an AI cloud deployment powered by NVIDIA GPUs.','TATACOMM']
  ]],
  ['Global tech', [
    ['NVDA','NVIDIA','Accelerated computing','Global partner','U.S. technology partner shown for its documented relationships with Indian companies. Trade NVIDIA in the U.S. workspace.'],
    ['GOOGL','Alphabet','Google Cloud','Global partner','Google Cloud is shown for its documented enterprise cloud collaborations. Trade Alphabet in the U.S. workspace.']
  ]],
  ['IT services', [
    ['TCS','Tata Consultancy Services','IT services','Listed','TCS provides global technology services and has announced AI-native telecom solutions developed with NVIDIA.','TCS'],
    ['INFY','Infosys','Digital services','Listed','Infosys integrates NVIDIA technologies with its Topaz enterprise AI services through a disclosed collaboration.','INFY'],
    ['WIPRO','Wipro','Technology consulting','Listed','Wipro offers consulting and engineering services, including sovereign AI services developed with NVIDIA technology.','WIPRO']
  ]]
];

const indiaSources = {
  reliance:'https://nvidianews.nvidia.com/news/reliance-and-nvidia-partner-to-advance-ai-in-india-for-india',
  tataComm:'https://www.tatacommunications.com/press-release/tata-communications-unveils-ai-infrastructure-with-nvidia',
  airtel:'https://www.airtel.in/press-release/05-2024/airtel-and-google-cloud-enter-into-a-long-term-strategic-collaboration-to-accelerate-cloud-adoption-and-deploy-generative-ai-solutions',
  infosys:'https://www.infosys.com/newsroom/press-releases/2023/collaborate-worlds-enterprises-boost-productivity.html',
  tcs:'https://www.tcs.com/who-we-are/newsroom/news-alert/tcs-nvidia-collaborate-design-ai-native-solutions-for-the-telecom-sector',
  tcsCloud:'https://www.tcs.com/investor-relations/quarterly-takeaways/tcs-fy25-year-end-debrief',
  wipro:'https://www.wipro.com/newsroom/press-releases/2025/wipro-brings-sovereign-ai-services-with-nvidia-ai-to-governments-and-enterprises-around-the-world/'
};
const indiaRelationships = [
  ['RELIANCE','NVDA','partner','AI infrastructure and foundation models','2023-09-08','reliance'],
  ['TATACOMM','NVDA','partner','AI cloud built with NVIDIA GPUs','2024-10-24','tataComm'],
  ['BHARTIARTL','GOOGL','partner','Enterprise cloud and AI collaboration','2024-05-13','airtel'],
  ['INFY','NVDA','partner','NVIDIA AI Enterprise integrated with Topaz','2023-09-20','infosys'],
  ['TCS','NVDA','partner','AI-native solutions for telecom','2025-06-12','tcs'],
  ['TCS','GOOGL','partner','Cloud and AI for communications and media','2025-04','tcsCloud'],
  ['WIPRO','NVDA','partner','Sovereign AI services','2025-03-19','wipro']
];
const indiaFilingLinks = {
  RELIANCE:'https://www.ril.com/investors',
  BHARTIARTL:'https://www.airtel.in/about-bharti/equity',
  TATACOMM:'https://www.tatacommunications.com/investors/',
  TCS:'https://www.tcs.com/investor-relations',
  INFY:'https://www.infosys.com/investors.html',
  WIPRO:'https://www.wipro.com/investors/'
};

function indiaDataset() {
  const links=indiaRelationships.map(([from,to,type,label,date,source],id)=>({
    id,from,to,type,label,value:'',date,url:indiaSources[source]
  }));
  const research=[
    ['Reliance and NVIDIA','AI infrastructure and foundation model announcement.',indiaSources.reliance],
    ['Tata Communications and NVIDIA','Announcement of the Indian AI cloud infrastructure project.',indiaSources.tataComm],
    ['Airtel and Google Cloud','Enterprise cloud collaboration announcement.',indiaSources.airtel],
    ['Indian exchange chart coverage','TradingView publishes BSE stock data at end of day.','https://www.tradingview.com/widget-docs/markets/asia-pacific/']
  ];
  return extendMarketCoverage(indiaGroups,links,[],research,'india');
}

const indiaStress = {
  trigger:'NVDA',chip:'TATACOMM',cloud:'RELIANCE',fund:'AIAI',story:'replay-india-compute',
  title:'What if GPU deliveries slow?',
  path:'NVIDIA GPU delays could slow AI infrastructure at Tata Communications and Reliance.',
  chipName:'Tata Communications',cloudName:'Reliance',fundName:'Aster India AI Basket',
  marketLinks:[['TATACOMM','NVDA','partner'],['RELIANCE','NVDA','partner']]
};
