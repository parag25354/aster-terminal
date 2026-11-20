'use strict';

const exchangeSymbols = {
  SPY:'AMEX:SPY', NVDA:'NASDAQ:NVDA', CRWV:'NASDAQ:CRWV', MSFT:'NASDAQ:MSFT',
  AMZN:'NASDAQ:AMZN', AMD:'NASDAQ:AMD', AVGO:'NASDAQ:AVGO', ORCL:'NYSE:ORCL',
  GOOGL:'NASDAQ:GOOGL', META:'NASDAQ:META', ANT:'NASDAQ:ANT'
};
const widgetOrigin = 'https://s3.tradingview.com/external-embedding/';
const publicExchange = () => !sampleMode && !market.status?.configured;

function tradingViewUrl(symbol) {
  const exchange = exchangeSymbols[symbol];
  return exchange ? 'https://www.tradingview.com/symbols/'+exchange.replace(':','-')+'/' : 'https://www.tradingview.com/';
}

function replayAnchorLink(symbol) {
  return '<a class="replay-link" href="'+safeText(modeLink('replay',{page:'trading',symbol}))+'">Practice in Replay</a>';
}

function mountExchangeWidget(host,{widget,theme,options,source,key,label}) {
  if(host.dataset.widgetKey===key)return;
  host.dataset.widgetKey=key;
  const wrapper=document.createElement('div');
  wrapper.className='tradingview-widget-container';
  const target=document.createElement('div');
  target.className='tradingview-widget-container__widget';
  const foot=document.createElement('div');
  foot.className='tradingview-widget-copyright exchange-source';
  const link=document.createElement('a');
  link.href=source;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.textContent=label+' on TradingView';
  foot.append(link,' · Delayed U.S. exchange data');
  const script=document.createElement('script');
  script.async=true;
  script.src=widgetOrigin+'embed-widget-'+widget+'.js';
  script.textContent=JSON.stringify({...options,colorTheme:theme,locale:'en'});
  const notice=document.createElement('p');
  notice.className='exchange-unavailable';
  notice.textContent='Loading TradingView market data…';
  script.addEventListener('error',()=>{notice.textContent='Chart unavailable here. Open the TradingView link below.';});
  const watcher=new MutationObserver(()=>{
    if(target.querySelector('iframe')){
      notice.hidden=true;
      watcher.disconnect();
    }
  });
  watcher.observe(target,{childList:true,subtree:true});
  setTimeout(()=>{
    watcher.disconnect();
    if(!target.querySelector('iframe'))notice.textContent='Market data is taking longer than expected. Open the TradingView link below.';
  },10_000);
  wrapper.append(target,notice,foot,script);
  host.replaceChildren(wrapper);
}

function mountExchangeChart(host,symbol,period) {
  const exchange=exchangeSymbols[symbol];
  if(!exchange)return;
  const theme=isLightTheme()?'light':'dark';
  const {interval,range}={ '1H':{interval:'5',range:'1D'},'1D':{interval:'15',range:'1D'},
    '1M':{interval:'D',range:'1M'},'1Y':{interval:'D',range:'12M'} }[period];
  mountExchangeWidget(host,{
    widget:'advanced-chart',theme,source:tradingViewUrl(symbol),key:[symbol,period,theme].join('/'),
    label:symbol+' chart',options:{symbol:exchange,interval,range,autosize:true,timezone:'America/New_York',
      style:'1',theme,withdateranges:true,allow_symbol_change:false,hide_side_toolbar:true,support_host:'https://www.tradingview.com'}
  });
}

function mountQuotesBoard() {
  const host=$('market-exchange-quotes');
  host.hidden=!publicExchange() || invest.page!=='markets';
  if(host.hidden)return;
  const theme=isLightTheme()?'light':'dark';
  mountExchangeWidget(host,{
    widget:'market-quotes',theme,key:'quotes/'+theme,source:'https://www.tradingview.com/markets/stocks-usa/',label:'Market quotes',
    options:{width:'100%',height:'100%',symbolsGroups:[
      {name:'AI Leaders',symbols:['NVDA','CRWV','ANT','AVGO','AMD','MSFT','AMZN','GOOGL','META','ORCL','SPY'].map(id=>({name:exchangeSymbols[id],displayName:companies.get(id).name}))}
    ],showSymbolLogo:true,isTransparent:false}
  });
}
