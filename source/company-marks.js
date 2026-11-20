'use strict';

const companyMarks = {
  "NVDA": "logos/nvda.svg",
  "MSFT": "logos/msft.svg",
  "AMZN": "logos/amzn.svg",
  "AMD": "logos/amd.svg",
  "AVGO": "logos/avgo.svg",
  "CRWV": "logos/crwv.svg",
  "ORCL": "logos/orcl.svg",
  "GOOGL": "logos/googl.svg",
  "META": "logos/meta.svg",
  "ANT": "logos/ant.svg",
  "RELIANCE": "logos/reliance.svg",
  "BHARTIARTL": "logos/bhartiartl.svg",
  "TATACOMM": "logos/tatacomm.svg",
  "TCS": "logos/tcs.svg",
  "INFY": "logos/infy.svg",
  "WIPRO": "logos/wipro.svg",
  "JPM": "logos/jpm.svg",
  "BAC": "logos/bac.svg",
  "KO": "logos/ko.svg",
  "PEP": "logos/pep.svg",
  "MNST": "logos/mnst.svg",
  "XOM": "logos/xom.svg",
  "CVX": "logos/cvx.svg",
  "JNJ": "logos/jnj.svg",
  "PFE": "logos/pfe.svg",
  "CAT": "logos/cat.svg",
  "DE": "logos/de.svg",
  "HDFCBANK": "logos/hdfcbank.svg",
  "ICICIBANK": "logos/icicibank.svg",
  "HINDUNILVR": "logos/hindunilvr.svg",
  "ITC": "logos/itc.svg",
  "NESTLEIND": "logos/nestleind.svg",
  "ONGC": "logos/ongc.svg",
  "IOC": "logos/ioc.svg",
  "SUNPHARMA": "logos/sunpharma.svg",
  "DRREDDY": "logos/drreddy.svg",
  "LT": "logos/lt.svg",
  "SIEMENS": "logos/siemens.svg"
};

function companyMark(id, extraClass='') {
  const asset=companyMarks[id];
  const contents=asset?'<img src="'+asset+'" width="42" height="42" alt="" decoding="async">':safeText(glyph(id));
  return '<span class="company-mark'+(asset?' has-mark':'')+(extraClass?' '+extraClass:'')+'" aria-hidden="true" data-fallback="'+safeText(glyph(id))+'">'+contents+'</span>';
}

document.addEventListener('error',event=>{
  const image=event.target;
  const mark=image.closest?.('.company-mark');
  if(mark && image.tagName==='IMG') {
    mark.textContent=mark.dataset.fallback || '';
    mark.classList.remove('has-mark');
  }
},true);
