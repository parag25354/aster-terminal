'use strict';

const exchangeSymbols = {...(indiaMarket ? {
  BHARTIARTL:'BSE:BHARTIARTL',TATACOMM:'BSE:TATACOMM',
  TCS:'BSE:TCS',INFY:'BSE:INFY',WIPRO:'BSE:WIPRO'
} : {
  NVDA:'NASDAQ:NVDA', CRWV:'NASDAQ:CRWV', MSFT:'NASDAQ:MSFT',
  AMZN:'NASDAQ:AMZN', AMD:'NASDAQ:AMD', AVGO:'NASDAQ:AVGO', ORCL:'NYSE:ORCL',
  GOOGL:'NASDAQ:GOOGL', META:'NASDAQ:META', ANT:'NASDAQ:ANT'
}),...coverageSymbols(indiaMarket?'india':'us')};
const widgetOrigin = 'https://s3.tradingview.com/external-embedding/';
const exchangeDataLabel=indiaMarket?'TradingView BSE end-of-day':'TradingView delayed quotes';
const exchangeLoads=new WeakMap();
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
  host.dataset.widgetState='loading';
  exchangeLoads.get(host)?.();
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
  foot.append(link,indiaMarket?' · BSE end-of-day data':' · Delayed U.S. exchange data');
  const script=document.createElement('script');
  script.async=true;
  script.src=widgetOrigin+'embed-widget-'+widget+'.js';
  script.textContent=JSON.stringify({...options,colorTheme:theme,locale:'en'});
  const notice=document.createElement('p');
  notice.className='exchange-unavailable';
  notice.textContent='Loading TradingView market data…';
  script.addEventListener('error',()=>{
    host.dataset.widgetState='unavailable';
    notice.textContent='Chart unavailable here. Open the TradingView link below.';
    cleanup();
  });
  let installedFrame, frameFallback;
  const reveal=()=>{
    host.dataset.widgetState='ready';
    notice.hidden=true;
    cleanup();
  };
  const watcher=new MutationObserver(()=>{
    const iframe=wrapper.querySelector('iframe');
    if(!iframe || iframe===installedFrame)return;
    installedFrame=iframe;
    if(!iframe.title)iframe.title=label;
    iframe.addEventListener('load',reveal,{once:true});
    frameFallback=setTimeout(reveal,4000);
    watcher.disconnect();
  });
  const timeout=setTimeout(()=>{
    notice.textContent='Market data is taking longer than expected. Open the TradingView link below.';
  },10_000);
  function cleanup() {
    watcher.disconnect();
    installedFrame?.removeEventListener('load',reveal);
    clearTimeout(timeout);
    clearTimeout(frameFallback);
    exchangeLoads.delete(host);
  }
  exchangeLoads.set(host,cleanup);
  watcher.observe(wrapper,{childList:true,subtree:true});
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
    label:symbol+' chart',options:{symbol:exchange,interval:indiaMarket?'D':interval,range,autosize:true,timezone:marketTimeZone,
      style:'1',theme,withdateranges:true,allow_symbol_change:false,hide_side_toolbar:true,support_host:'https://www.tradingview.com'}
  });
}

function mountQuotesBoard() {
  const host=$('market-exchange-quotes');
  host.hidden=!publicExchange() || invest.page!=='markets';
  if(host.hidden)return;
  const theme=isLightTheme()?'light':'dark';
  const quoteGroups=groups.map(([name,rows])=>({
    name,symbols:rows.filter(([id])=>exchangeSymbols[id]).map(([id,displayName])=>({name:exchangeSymbols[id],displayName}))
  })).filter(group=>group.symbols.length);
  mountExchangeWidget(host,{
    widget:'market-quotes',theme,key:'quotes/'+theme,source:indiaMarket?'https://www.tradingview.com/markets/stocks-india/':'https://www.tradingview.com/markets/stocks-usa/',label:'Market quotes',
    options:{width:'100%',height:'100%',symbolsGroups:quoteGroups,showSymbolLogo:true,isTransparent:false}
  });
}
