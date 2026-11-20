const liveGroups = [
  ['Funds & investors', [
    ['SPY','SPDR S&P 500 ETF','Benchmark fund','Fund','State Street ETF designed to track the S&P 500. The network shows selected disclosed holdings.','SPY'],
    ['MSFT','Microsoft','Azure and equity','Listed','Operates Azure and disclosed that it remains a major OpenAI shareholder.','MSFT'],
    ['AMZN','Amazon','AWS and equity','Listed','Provides cloud infrastructure through AWS and has invested in Anthropic.','AMZN']
  ]],
  ['Chips', [
    ['NVDA','NVIDIA','Accelerators','Listed','Designs accelerators, networking hardware and software for AI infrastructure.','NVDA'],
    ['AMD','AMD','Accelerators','Listed','Builds CPUs and GPU accelerators for enterprise and data centre customers.','AMD'],
    ['AVGO','Broadcom','Custom silicon','Listed','Supplies networking and custom silicon, including collaboration with OpenAI.','AVGO']
  ]],
  ['Cloud', [
    ['CRWV','CoreWeave','AI infrastructure','Listed','Runs cloud infrastructure and has disclosed equity and commercial ties to NVIDIA.','CRWV'],
    ['ORCL','Oracle','Oracle Cloud','Listed','Provides cloud infrastructure and participates in the Stargate project.','ORCL'],
    ['GOOGL','Alphabet','Google Cloud','Listed','Operates Google Cloud and Gemini. Google LLC entered a disclosed investment agreement with Anthropic.','GOOGL']
  ]],
  ['AI labs', [
    ['OPENAI','OpenAI','Foundation models','Private','Develops foundation models and has disclosed relationships with multiple infrastructure providers.'],
    ['ANT','Anthropic','Foundation models','Listed','Develops Claude models. Its IPO announcement identified ANT as the Nasdaq ticker.','ANT'],
    ['META','Meta Platforms','AI research','Listed','Develops AI models and operates the Meta AI product family.','META']
  ]]
];

const liveSources = {
  spy:'https://www.ssga.com/library-content/products/factsheets/etfs/us/factsheet-us-en-spy.pdf',
  nvidiaEquity:'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000044/crwv-20260123.htm',
  nvidiaSupply:'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000191/crwv-20260422.htm',
  nvidiaRisk:'https://www.sec.gov/Archives/edgar/data/1045810/000104581025000209/nvda-20250727.htm',
  msft:'https://openai.com/index/next-phase-of-microsoft-partnership/',
  amznAnt:'https://www.aboutamazon.com/news/aws/amazon-invests-additional-4-billion-anthropic-ai',
  googleAnt:'https://www.sec.gov/Archives/edgar/data/2130357/000162828026072484/exhibit1015-sx1ax2.htm',
  anthIpo:'https://www.anthropic.com/news/anthropic-prices-initial-public-offering',
  openCrwv:'https://www.coreweave.com/news/coreweave-expands-agreement-with-openai-by-up-to-6-5b',
  openAws:'https://www.aboutamazon.com/news/aws/aws-open-ai-workloads-compute-infrastructure',
  openOracle:'https://openai.com/index/stargate-advances-with-partnership-with-oracle/',
  openBroadcom:'https://openai.com/index/openai-and-broadcom-announce-strategic-collaboration/',
  network:'https://openai.com/index/mrc-supercomputer-networking/',
  antCrwv:'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000220/coreweave1q26earningspress.htm'
};
const liveLinks = [
  ['SPY','NVDA','holding','Disclosed constituent','','Mar 2026','spy'],
  ['SPY','MSFT','holding','Disclosed constituent','','Mar 2026','spy'],
  ['SPY','AMZN','holding','Disclosed constituent','','Mar 2026','spy'],
  ['SPY','AVGO','holding','Disclosed constituent','','Mar 2026','spy'],
  ['SPY','GOOGL','holding','Disclosed Class A constituent','','Mar 2026','spy'],
  ['SPY','META','holding','Disclosed constituent','','Mar 2026','spy'],
  ['NVDA','CRWV','funding','Completed equity purchase','$2 billion','23 Jan 2026','nvidiaEquity'],
  ['CRWV','NVDA','spend','Purchases from NVIDIA','17% of 2025 supplier purchases','2025 fiscal year','nvidiaSupply'],
  ['MSFT','OPENAI','funding','Disclosed existing shareholding','','27 Apr 2026','msft'],
  ['OPENAI','MSFT','spend','Primary cloud partnership','','27 Apr 2026','msft'],
  ['AMZN','ANT','funding','Additional investment announced','$4 billion announced','22 Nov 2024','amznAnt'],
  ['ANT','AMZN','spend','AWS primary training and cloud partner','','22 Nov 2024','amznAnt'],
  ['GOOGL','ANT','funding','Stock purchase agreement','$10 billion agreement','10 Nov 2026','googleAnt'],
  ['OPENAI','CRWV','spend','Cloud capacity contract expansion','Up to $6.5 billion','25 Sep 2025','openCrwv'],
  ['OPENAI','AMZN','spend','AWS infrastructure agreement','$38 billion announced','03 Nov 2025','openAws'],
  ['OPENAI','ORCL','spend','Additional data centre capacity','4.5 GW planned','22 Jul 2025','openOracle'],
  ['OPENAI','AVGO','partner','Custom accelerator collaboration','10 GW target','13 Oct 2025','openBroadcom'],
  ['OPENAI','AMD','partner','AI training-network protocol','','05 May 2026','network'],
  ['OPENAI','NVDA','partner','AI training-network protocol','','05 May 2026','network'],
  ['ANT','CRWV','spend','Multi-year cloud agreement','','Q1 2026 disclosure','antCrwv']
].map(([from,to,type,label,value,date,source], id)=>({id,from,to,type,label,value,date,url:liveSources[source]}));

const disclosed = [
  {id:'ant-ipo',title:'Anthropic announces IPO pricing',time:'2026-11-18',source:'Anthropic',topic:'Listing',url:liveSources.anthIpo,body:'Anthropic announced its offering price and said its Class A shares would trade on Nasdaq as ANT.',impacts:{ANT:['flat','An offering price establishes a reference point. The announcement alone gives no directional signal.']}},
  {id:'ant-google',title:'Anthropic discloses Google stock purchase agreement',time:'2026-11-10',source:'SEC filing',topic:'Financing',url:liveSources.googleAnt,body:'The exhibit sets out a $10 billion stock purchase agreement between Anthropic and Google LLC. It is shown as a dated agreement.',impacts:{ANT:['flat','The agreement brings potential funding and also raises dilution considerations.'],GOOGL:['flat','The purchase creates exposure to Anthropic. The direction of the impact on Alphabet is unclear.']}},
  {id:'nvda-coreweave',title:'CoreWeave files NVIDIA equity purchase',time:'2026-01-26',source:'SEC filing',topic:'Financing',url:liveSources.nvidiaEquity,body:'CoreWeave reported selling $2 billion of Class A shares to NVIDIA and disclosed a separate collaboration framework.',impacts:{CRWV:['up','The cash investment can support infrastructure investment. Equity issuance also has a dilution effect.'],NVDA:['flat','The stake adds exposure to CoreWeave while also committing capital.']}},
  {id:'nvda-h20',title:'NVIDIA discloses H20 inventory and purchase charges',time:'2025-08-27',source:'SEC filing',topic:'Export controls',url:liveSources.nvidiaRisk,body:'NVIDIA reported a $4.5 billion fiscal first-quarter charge associated with H20 excess inventory and purchase obligations following new export requirements.',impacts:{NVDA:['down','The disclosed charge is an adverse earnings item for that quarter.']}},
  {id:'amd-network',title:'OpenAI announces collaboration on AI training networking',time:'2026-05-05',source:'OpenAI',topic:'Engineering',url:liveSources.network,body:'The collaboration involves AMD, Broadcom, Intel, Microsoft and NVIDIA and concerns a networking protocol for AI clusters.',impacts:{AMD:['flat','The protocol announcement gives no direct revenue or earnings estimate.'],AVGO:['flat','The protocol announcement gives no direct financial terms.'],MSFT:['flat','No earnings effect was quantified.'],OPENAI:['flat','No financial impact was quantified.']}},
  {id:'aws-openai',title:'AWS announces multi-year OpenAI agreement',time:'2025-11-03',source:'AWS',topic:'Cloud capacity',url:liveSources.openAws,body:'AWS announced a seven-year infrastructure agreement with OpenAI with a value of $38 billion.',impacts:{AMZN:['up','The agreement supports long-term cloud demand. The timing of revenue and build-out costs matter.'],OPENAI:['flat','The agreement adds capacity and financial commitments.']}},
  {id:'open-oracle',title:'OpenAI and Oracle announce additional data centre capacity',time:'2025-07-22',source:'OpenAI',topic:'Cloud capacity',url:liveSources.openOracle,body:'OpenAI and Oracle announced plans to develop 4.5 GW of additional data centre capacity.',impacts:{ORCL:['up','The plan could support cloud demand as sites are built. Timing and economics remain key.'],OPENAI:['flat','The announced capacity is a development plan.']}}
];

const liveResearch = [
  ['Disclosed NVIDIA equity purchase','CoreWeave Form 8-K, January 2026.',liveSources.nvidiaEquity],
  ['Disclosed NVIDIA supplier relationship','CoreWeave proxy statement, 2025 supplier purchases.',liveSources.nvidiaSupply],
  ['ETF disclosures','State Street issuer fact sheet, March 2026 snapshot. Holdings can change.',liveSources.spy],
  ['AI financing and spillovers','IMF Global Financial Stability Report, October 2026.','https://www.imf.org/-/media/files/publications/gfsr/2026/october/english/ch1.pdf'],
  ['Market data methods','Alpaca feed coverage and real-time entitlements.','https://docs.alpaca.markets/us/docs/about-market-data-api'],
  ['Public exchange charts','TradingView lists the delay and data provider by exchange.','https://www.tradingview.com/widget-docs/markets/north-america/']
];

function liveDataset() {
  const companies = new Map(liveGroups.flatMap(([,rows],group)=>rows.map(([id,name,sector,listing,summary,symbol],index)=>[id,{id,name,sector,listing,summary,symbol,group,index}])));
  return {groups:liveGroups,companies,links:liveLinks,articles:disclosed,research:liveResearch};
}

const liveProfileNotes = {
  SPY: 'The map shows selected fund constituents from a dated disclosure. A fund position can overlap with stocks you already hold directly.',
  MSFT: 'Azure capacity and Microsoft’s disclosed OpenAI shareholding are separate paths of exposure to the same company.',
  AMZN: 'AWS appears on both the Anthropic and OpenAI paths. Amazon also announced equity funding for Anthropic.',
  NVDA: 'NVIDIA appears twice in the CoreWeave relationship: as an equity investor and as a supplier.',
  AMD: 'The mapped OpenAI networking collaboration describes engineering work. The cited announcement did not quantify revenue.',
  AVGO: 'The OpenAI accelerator collaboration describes a deployment target. Completed shipments and sales are separate milestones.',
  CRWV: 'CoreWeave disclosed a $2 billion NVIDIA equity purchase in January 2026. It separately reported that NVIDIA accounted for 17% of its 2025 supplier purchases.',
  ORCL: 'The OpenAI–Oracle agreement describes development of additional data-centre capacity. The capacity figure is a planned project size.',
  GOOGL: 'The Google–Anthropic link is a dated stock purchase agreement. The displayed figure is the agreement amount.',
  OPENAI: 'The map separates capacity agreements, equity relationships, and engineering partnerships. Each link opens the original dated announcement.',
  ANT: 'The map separates Anthropic’s external capital and the cloud capacity it buys. Longer price windows depend on the available trading history.',
  META: 'The SPY link represents a disclosed holding in the fund. This selected map covers the documented links shown in the profile.'
};
