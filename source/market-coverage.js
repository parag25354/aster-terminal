'use strict';

// Replay starting prices and moves are illustrative. Exchange symbols are used independently.
const marketCoverage = {
  us: [
    ['Finance', [
      ['JPM','JPMorgan Chase','Banking and payments','NYSE:JPM',301,.76,'Runs consumer and commercial banking, markets and payments businesses. Chase issues Amazon’s co-branded Prime Visa card.'],
      ['BAC','Bank of America','Banking and wealth','NYSE:BAC',51,-.41,'Operates a U.S. retail and commercial bank alongside investment banking and Merrill wealth management.']
    ]],
    ['Consumer', [
      ['KO','Coca-Cola','Beverages','NYSE:KO',69,.47,'Develops and markets beverage brands and sells concentrates to a network of bottling partners.'],
      ['PEP','PepsiCo','Beverages and snacks','NASDAQ:PEP',153,-.28,'Sells drinks and packaged foods through brands including Pepsi, Gatorade and Lay’s.'],
      ['MNST','Monster Beverage','Energy drinks','NASDAQ:MNST',65,.53,'Develops and markets energy drinks. Coca-Cola disclosed an equity investment and distribution agreements with the company.']
    ]],
    ['Energy', [
      ['XOM','ExxonMobil','Oil, gas and chemicals','NYSE:XOM',119,1.19,'Produces oil and gas and operates refining, fuels and chemical businesses.'],
      ['CVX','Chevron','Oil, gas and refining','NYSE:CVX',156,.57,'Explores for and produces oil and gas, and refines and markets fuels.']
    ]],
    ['Healthcare', [
      ['JNJ','Johnson & Johnson','Medicines and medical devices','NYSE:JNJ',166,-.39,'Develops medicines and medical technology. Its medical devices business announced a cloud collaboration for digital surgery.'],
      ['PFE','Pfizer','Pharmaceuticals','NYSE:PFE',27,.63,'Develops and markets prescription medicines and vaccines.']
    ]],
    ['Industrials', [
      ['CAT','Caterpillar','Construction and mining equipment','NYSE:CAT',485,1.04,'Manufactures equipment for construction and mining, industrial engines and power systems.'],
      ['DE','Deere & Company','Agricultural and construction equipment','NYSE:DE',463,-.52,'Makes machinery and precision technology for agriculture, turf and construction.']
    ]]
  ],
  india: [
    ['Finance', [
      ['HDFCBANK','HDFC Bank','Banking','BSE:HDFCBANK',978,.52,'Provides retail, wholesale and business banking across India. It selected a treasury platform from Tata Consultancy Services.'],
      ['ICICIBANK','ICICI Bank','Banking','BSE:ICICIBANK',1352,-.42,'Provides retail and business banking in India and uses Finacle core banking technology from Infosys.']
    ]],
    ['Consumer', [
      ['HINDUNILVR','Hindustan Unilever','Household and personal care','BSE:HINDUNILVR',2310,.37,'Sells consumer staples in India across home care, beauty, personal care, foods and beverages.'],
      ['ITC','ITC','Consumer staples','BSE:ITC',420,-.55,'Operates consumer goods, cigarettes, agribusiness, packaging and paper businesses.'],
      ['NESTLEIND','Nestlé India','Packaged foods and beverages','BSE:NESTLEIND',1164,.34,'Sells packaged foods and beverages. It launched a nutrition joint venture with Dr. Reddy’s.']
    ]],
    ['Energy', [
      ['RELIANCE','Reliance Industries','Energy, retail and telecom','BSE:RELIANCE',1460,.94,'Reliance operates across energy, retail and digital services. Its telecom arm Jio is part of an announced AI infrastructure collaboration with NVIDIA.'],
      ['ONGC','Oil & Natural Gas Corp.','Oil and gas production','BSE:ONGC',249,1.16,'Explores for and produces oil and gas. It is a promoter of Petronet LNG alongside IndianOil.'],
      ['IOC','IndianOil','Refining and fuel distribution','BSE:IOC',151,.71,'Refines and distributes fuel and operates pipelines and petrochemical businesses.']
    ]],
    ['Healthcare', [
      ['SUNPHARMA','Sun Pharma','Pharmaceuticals','BSE:SUNPHARMA',1752,-.43,'Develops and sells branded and generic medicines, including specialty therapies.'],
      ['DRREDDY','Dr. Reddy’s','Pharmaceuticals and nutrition','BSE:DRREDDY',1241,.69,'Develops generic and branded medicines and participates in a nutrition joint venture with Nestlé India.']
    ]],
    ['Industrials', [
      ['LT','Larsen & Toubro','Engineering and construction','BSE:LT',4010,1.21,'Delivers engineering, procurement and construction projects, including offshore infrastructure for energy producers.'],
      ['SIEMENS','Siemens India','Industrial automation','BSE:SIEMENS',3372,-.31,'Supplies industrial automation, electrification and mobility technology.']
    ]]
  ]
};

// The endpoints represent the companies behind each dated announcement or filing.
const crossSectorLinks = {
  us: [
    ['JPM','AMZN','partner','Chase launched the Amazon Prime Rewards Visa','2017-01-11','https://press.aboutamazon.com/2017/1/amazon-and-chase-introduce-new-prime-rewards-visa-card-with-5-back-on-all-amazon-com-purchases-and-rewards-everywhere-else-you-shop'],
    ['KO','MSFT','spend','Five-year cloud services commitment','2024-04-23','https://www.coca-colacompany.com/media-center/the-coca-cola-company-and-microsoft-announce-five-year-strategic-partnership-to-accelerate-cloud-and-generative-ai-initiatives','$1.1B announced commitment'],
    ['KO','MNST','funding','Equity stake at the close of the 2015 deal','2015-06-12','https://investors.coca-colacompany.com/news-events/press-releases/detail/766/the-coca-cola-company-and-monster-beverage-corporation-close-on-previously-announced-strategic-partnership','16.7% at closing'],
    ['XOM','MSFT','partner','Cloud technology for Permian Basin oilfield operations','2019-02-22','https://corporate.exxonmobil.com/news/news-releases/2019/0222_exxonmobil-to-increase-permian-profitability-through-digital-partnership-with-microsoft'],
    ['JNJ','MSFT','partner','Microsoft named preferred cloud provider for digital surgery','2022-01-10','https://www.jnj.com/media-center/press-releases/johnson-johnson-medical-devices-companies-announces-strategic-partnership-with-microsoft-to-further-enable-its-digital-surgery-solutions']
  ],
  india: [
    ['ICICIBANK','INFY','partner','Finacle core banking platform modernization','2016','https://www.finacle.com/content/dam/infosys-finacle/finacleconnect/finacle-connect-magazine-final-2016.pdf'],
    ['HDFCBANK','TCS','partner','Treasury platform from TCS BaNCS','2011-05-30','https://www.tcs.com/who-we-are/newsroom/press-release/tcs-bancs-next-generation-treasury-solution-hdfc-bank-integrated-platform'],
    ['DRREDDY','NESTLEIND','partner','Joint venture in consumer nutrition','2024-04-25','https://www.nestle.in/sites/g/files/pydnoa451/files/2024-04/Press%20Release.pdf'],
    ['IOC','ONGC','partner','Co-promoters of Petronet LNG','','https://www.petronetlng.in/web/pertonetlng/equity-structure','12.5% each in Petronet LNG'],
    ['IOC','ICICIBANK','partner','Co-venturers in IndianOil LNG at Ennore','','https://www.iocl.com/pages/group-companies-overview'],
    ['IOC','RELIANCE','partner','Co-venturers in the Petronet VK fuel pipeline','','https://www.iocl.com/pages/group-companies-overview'],
    ['ONGC','LT','spend','Offshore pipeline replacement order','2024-07-01','https://www.larsentoubro.com/pressreleases/2024-07-01-lt-wins-significant-offshore-order-from-ongc']
  ]
};

function coverageSymbols(region) {
  return Object.fromEntries(marketCoverage[region].flatMap(([,rows])=>rows.map(([id,,,symbol])=>[id,symbol])));
}

function coverageReplayPrices(region) {
  return Object.fromEntries(marketCoverage[region].flatMap(([,rows])=>rows.map(([id,,,,price,move])=>[id,[price,move]])));
}

function extendMarketCoverage(baseGroups, baseLinks, baseArticles, research, region) {
  const sectorGroups = marketCoverage[region];
  const groups = [...baseGroups,...sectorGroups.map(([label,rows])=>[
    label,rows.map(([id,name,sector,,,,summary])=>[id,name,sector,'Listed',summary,id])
  ])];
  const companies = new Map(groups.flatMap(([,rows],group)=>rows.map(([id,name,sector,listing,summary,symbol],index)=>
    [id,{id,name,sector,listing,summary,symbol,group,index}])));
  const peerLinks = sectorGroups.flatMap(([sector,rows])=>
    rows.flatMap(([from],index)=>rows.slice(index+1).map(([to])=>({
      from,to,type:'peer',label:'Compare companies in '+sector.toLowerCase()
    }))));
  if(region==='india') {
    peerLinks.push({from:'TCS',to:'INFY',type:'peer',label:'Compare IT services providers'});
  }
  const disclosedLinks = crossSectorLinks[region].map(([from,to,type,label,date,url,value])=>({from,to,type,label,date,url,value}));
  const links = [...baseLinks,...disclosedLinks,...peerLinks].map((link,id)=>({...link,id}));
  const announcements = region==='india' ? [...baseLinks,...disclosedLinks] : disclosedLinks;
  const articles = [...baseArticles,...announcements.filter(link=>link.date.length===10).map(link=>{
    const {from,to,label,date,url} = link;
    return {
      id:'disclosure-'+from+'-'+to+'-'+date,title:label,time:date,source:'Company disclosure',
      topic:'Business relationship',url,body:companies.get(from).name+' · '+companies.get(to).name,
      impacts:Object.fromEntries([from,to].map(id=>[id,['flat','The source describes a business relationship. The share-price impact is unclear.']]))
    };
  })];
  return {groups,companies,links,articles,research};
}
