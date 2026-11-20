function sampleDataset() {
const groups = [
  ['Capital', [
    ['HBR', 'Harbor Capital', 'Fund manager', 'Private', 'Invests in infrastructure and early-stage companies.'],
    ['INNO', 'Innovation ETF', 'Equity fund', 'Fund', 'A fictional basket that holds Atlas Chips, GridCloud, and consumer stocks.', 100, 1.1],
    ['RDG', 'Ridgeline Partners', 'Venture fund', 'Private', 'Provides growth capital to cloud companies and model labs.'],
    ['MESA', 'Mesa Ventures', 'Venture fund', 'Private', 'Funds specialist AI labs and chip tooling companies.'],
    ['NDF', 'Northstar Digital', 'Infrastructure fund', 'Private', 'Invests in data centre builders and grid operators.']
  ]],
  ['Chips', [
    ['ATLS', 'Atlas Chips', 'Accelerators', 'Listed', 'Designs accelerators for AI training and inference.', 100, 2.4, 'Higher accelerator demand', 'Cloud customers cutting capex'],
    ['VCTR', 'Vector Foundry', 'Chip fabrication', 'Listed', 'Fabricates advanced chips for accelerator designers.', 182, 1.5, 'Higher fab utilisation', 'Advanced-node yield pressure'],
    ['EMBER', 'Ember Optics', 'Optical networking', 'Listed', 'Supplies high-speed optical modules to data centres.', 73.5, -1.9, 'Higher networking bandwidth', 'Component supply delays'],
    ['FLUX', 'Flux Silicon', 'Chip tooling', 'Private', 'Develops low-power silicon and design tools.']
  ]],
  ['Cloud', [
    ['GRID', 'GridCloud', 'AI cloud', 'Listed', 'Rents accelerator capacity to model labs and enterprises.', 120, -1.2, 'Long-term compute reservations', 'Dependence on large lab customers'],
    ['HALO', 'Halo Compute', 'Compute platform', 'Listed', 'Runs shared training and inference clusters.', 97, 0.8, 'Inference demand', 'Higher energy costs'],
    ['ORBT', 'Orbit Systems', 'Data centres', 'Listed', 'Builds and leases data centre capacity.', 139, -0.6, 'Capacity contracts', 'Construction delays'],
    ['PLSE', 'Pulse Hosting', 'AI cloud', 'Private', 'Provides on-demand access to accelerator clusters.'],
    ['VLT', 'Volt Grid', 'Power infrastructure', 'Listed', 'Supplies power and interconnection to data centres.', 86, 1.3, 'Data centre power demand', 'Grid connection delays']
  ]],
  ['AI labs', [
    ['NOVA', 'Nova Models', 'Foundation models', 'Private', 'Trains foundation models and rents compute from several cloud providers.'],
    ['LUMN', 'Lumen AI', 'AI inference', 'Listed', 'Sells inference services and developer tools.', 64, 1.7, 'More inference customers', 'Pricing pressure on API usage'],
    ['QUIL', 'Quill Labs', 'Language models', 'Private', 'Builds language models for enterprise workflows.'],
    ['MNTA', 'Manta Research', 'AI research', 'Private', 'Develops efficient multimodal systems.'],
    ['SGL', 'Signal Works', 'Enterprise AI', 'Listed', 'Adapts models for commercial analytics and search.', 44, -0.5, 'New enterprise contracts', 'Long sales cycles']
  ]]
];

const companies = new Map(groups.flatMap(([, rows], group) => rows.map((row, index) => {
  const [id, name, sector, listing, summary, price, change, upside, downside] = row;
  return [id, { id, name, sector, listing, summary, price, change, upside, downside, group, index }];
})));

const links = [
  ['HBR','ATLS','funding','Equity investment','₹160 cr','08 Sep'],
  ['HBR','GRID','funding','Equity investment','₹90 cr','12 Oct'],
  ['HBR','ORBT','funding','Equity investment','₹55 cr','05 Aug'],
  ['HBR','HALO','funding','Equity investment','₹48 cr','18 Sep'],
  ['RDG','NOVA','funding','Equity investment','₹140 cr','21 Oct'],
  ['RDG','GRID','funding','Equity investment','₹72 cr','23 Sep'],
  ['RDG','QUIL','funding','Equity investment','₹40 cr','11 Sep'],
  ['RDG','VCTR','funding','Equity investment','₹68 cr','14 Jul'],
  ['MESA','FLUX','funding','Equity investment','₹42 cr','02 Sep'],
  ['MESA','NOVA','funding','Equity investment','₹65 cr','28 Oct'],
  ['MESA','MNTA','funding','Equity investment','₹33 cr','19 Aug'],
  ['MESA','LUMN','funding','Equity investment','₹51 cr','22 Sep'],
  ['NDF','ORBT','funding','Equity investment','₹125 cr','04 Nov'],
  ['NDF','VLT','funding','Equity investment','₹84 cr','16 Oct'],
  ['NDF','PLSE','funding','Equity investment','₹27 cr','01 Oct'],
  ['ATLS','NOVA','funding','Equity investment','₹100 cr','02 Nov'],
  ['ATLS','GRID','funding','Equity investment','₹45 cr','17 Oct'],
  ['GRID','LUMN','funding','Equity investment','₹22 cr','09 Oct'],
  ['INNO','ATLS','holding','Fund weight','40%','20 Nov'],
  ['INNO','GRID','holding','Fund weight','30%','20 Nov'],
  ['NOVA','GRID','spend','Cloud capacity','₹60 cr','06 Nov'],
  ['NOVA','HALO','spend','Training capacity','₹17 cr','13 Nov'],
  ['GRID','ATLS','spend','Accelerator purchase','₹35 cr','10 Nov'],
  ['GRID','EMBER','spend','Optical networking','₹12 cr','07 Nov'],
  ['GRID','VLT','spend','Power supply','₹9 cr','12 Nov'],
  ['HALO','ATLS','spend','Accelerator purchase','₹24 cr','25 Oct'],
  ['HALO','VCTR','spend','Custom chips','₹13 cr','16 Sep'],
  ['ORBT','EMBER','spend','Optical networking','₹14 cr','05 Nov'],
  ['ORBT','VLT','spend','Power supply','₹27 cr','02 Oct'],
  ['PLSE','ATLS','spend','Accelerator purchase','₹16 cr','05 Nov'],
  ['PLSE','FLUX','spend','Chip tuning licences','₹6 cr','18 Oct'],
  ['LUMN','GRID','spend','Inference capacity','₹22 cr','07 Nov'],
  ['LUMN','PLSE','spend','Overflow compute','₹7 cr','11 Nov'],
  ['QUIL','HALO','spend','Training capacity','₹18 cr','04 Nov'],
  ['QUIL','ORBT','spend','Data centre lease','₹8 cr','09 Oct'],
  ['MNTA','ORBT','spend','Data centre lease','₹10 cr','05 Nov'],
  ['SGL','GRID','spend','Enterprise cloud','₹11 cr','28 Sep'],
  ['SGL','LUMN','spend','Inference API','₹4 cr','03 Nov'],
  ['ATLS','VCTR','spend','Chip fabrication','₹28 cr','17 Nov'],
  ['ATLS','FLUX','partner','Accelerator design','','12 Nov'],
  ['FLUX','MNTA','partner','Efficient inference pilot','','19 Nov'],
  ['EMBER','ORBT','partner','Optical efficiency trial','','31 Oct'],
  ['GRID','QUIL','partner','Model deployment pilot','','12 Nov'],
  ['PLSE','SGL','partner','Enterprise integration','','01 Nov'],
  ['HALO','LUMN','partner','Inference integration','','04 Nov'],
  ['VCTR','ORBT','partner','Cooling research','','13 Nov']
].map(([from,to,type,label,value,date], index) => ({id:index,from,to,type,label,value,date:`${date} 2026`}));

const articles = [
  ['nova-reduction','Nova reviews planned cloud reservations','20 Nov · 12:10','Demand',
    'In this fictional scenario, Nova delays an expansion after its expected enterprise demand falls. GridCloud could have fewer contracted compute hours; it may in turn defer accelerator orders.',
    {NOVA:['down','Slower expansion may defer delivery milestones.'],GRID:['down','Fewer reservations could leave more rented capacity idle.'],ATLS:['down','GridCloud may delay its accelerator orders.'],INNO:['down','Atlas and GridCloud together make up 70% of this demo fund.']}],
  ['atlas-order','Atlas wins a new accelerator order','20 Nov · 11:14','Contracts',
    'A fictional cloud customer signs a firm order for additional accelerators. Delivery is phased, so the timing of recognised revenue still matters.',
    {ATLS:['up','A firm order may improve near-term sales visibility.'],VCTR:['up','Higher accelerator production could raise foundry utilisation.'],HALO:['flat','The update names no change to Halo’s existing supply.'],INNO:['up','The fund has a 40% allocation to Atlas.']}],
  ['nova-board','Nova appoints a new board observer','20 Nov · 10:32','Governance',
    'The fictional announcement changes board representation and contains no revision to its commercial contracts, budget, or product roadmap.',
    {NOVA:['flat','The update leaves stated budgets and contracts unchanged.'],RDG:['flat','The announcement does not indicate a change in ownership or funding.'],MESA:['flat','The update does not name a new round of financing.']}],
  ['lumen-launch','Lumen signs three inference customers','19 Nov · 15:12','Growth',
    'This fictional announcement covers three enterprise trials. Upside depends on continued use after the trial period.',
    {LUMN:['up','New customers could increase revenue if the trials convert.'],PLSE:['up','More trial traffic may raise demand for overflow capacity.'],GRID:['up','Higher inference usage could raise utilisation.'],HBR:['flat','No change to Harbor’s funding commitments was announced.']}],
  ['optics-shipment','Ember delays optical module shipment','19 Nov · 14:02','Supply',
    'The fictional supplier has moved a shipment to next quarter while it verifies a new component.',
    {EMBER:['down','Delayed deliveries may push revenue into a later quarter.'],ORBT:['down','A late shipment may delay commissioning at one site.'],VCTR:['flat','No change to wafer orders is reported.']}],
  ['efficiency-pilot','Flux and Manta begin an efficiency pilot','19 Nov · 11:17','Partnership',
    'The companies are testing chips for a fictional low-power system. The agreement names no purchase commitment.',
    {FLUX:['flat','The research pilot has no contracted sales.'],MNTA:['flat','Measured gains and production costs are still unknown.'],NDF:['flat','The pilot does not change committed infrastructure funding.']}],
  ['power','Volt secures priority connection for new site','18 Nov · 13:24','Infrastructure',
    'A fictional infrastructure site has secured a power connection and is starting construction.',
    {VLT:['up','A confirmed connection may support future power sales.'],ORBT:['up','Secured power could bring capacity online sooner.'],NDF:['up','A reduced schedule risk may help its infrastructure investment.']}],
  ['quill-timing','Quill keeps launch date after a pilot review','18 Nov · 10:20','Product',
    'Quill reported that the pilot is on schedule and kept its previous usage and capacity estimates.',
    {QUIL:['flat','The release leaves its launch date and usage assumptions unchanged.'],HALO:['flat','The note gives no new capacity commitment.'],SGL:['flat','The update gives no direct change to enterprise demand.']}]
].map(([id,title,time,topic,body,impacts])=>({id,title,time,topic,body,impacts}));

const research = [
  ['IMF · Global Financial Stability Report, October 2026','How circular financing can spread a shock across AI firms.', 'https://www.imf.org/-/media/files/publications/gfsr/2026/october/english/ch1.pdf'],
  ['CoreWeave · Equity disclosure','NVIDIA’s disclosed January 2026 equity investment in CoreWeave.', 'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000044/crwv-20260123.htm'],
  ['CoreWeave · Supplier disclosure','CoreWeave reported NVIDIA accounted for 17% of its 2025 supplier purchases.', 'https://www.sec.gov/Archives/edgar/data/1769628/000176962826000191/crwv-20260422.htm'],
  ['Korinek and Vipra · Compute and market concentration','An economics working paper on scale and inputs in foundation model markets.', 'https://doi.org/10.3386/w33139'],
  ['Babina et al. · AI investment and firm growth','An empirical study of AI investment, growth, and product innovation.', 'https://doi.org/10.1016/j.jfineco.2023.103745'],
  ['Jane Street · Event-driven basket calculations','An example of updating a fund value from constituent price changes.', 'https://blog.janestreet.com/flex-model-an-event-driven-feature-engineering-system/']
];

return {groups,companies,links,articles,research};
}
