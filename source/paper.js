'use strict';

const paper = (() => {
  const initialCash = 1_000_000;
  const fresh = () => ({cash:initialCash,positions:{},trades:[]});
  const cents = value => Math.round((Number(value) + Number.EPSILON) * 100);
  const isNonnegative = value => Number.isSafeInteger(value) && value >= 0;

  function decode(raw) {
    if (!raw) return fresh();
    const saved = JSON.parse(raw);
    if (!saved || !isNonnegative(saved.cash) || !Array.isArray(saved.trades) || !saved.positions || typeof saved.positions !== 'object' || Array.isArray(saved.positions)) {
      throw new Error('The saved wallet could not be read.');
    }
    for(const [symbol,position] of Object.entries(saved.positions)) {
      if(!/^[A-Z0-9]{1,8}$/.test(symbol) || !position || !isNonnegative(position.quantity) || !isNonnegative(position.cost)) {
        throw new Error('The saved holdings could not be read.');
      }
    }
    return saved;
  }

  function fill(wallet,{symbol,side,quantity,price,quoteAt,feed,id,at,basketId}) {
    if (!/^[A-Z0-9]{1,8}$/.test(symbol) || !['buy','sell'].includes(side) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error('Enter a whole share quantity between 1 and 100,000.');
    const amount = cents(price);
    const gross = amount * quantity;
    if (!isNonnegative(gross) || gross === 0) throw new Error('A valid fill price is required.');
    const position = wallet.positions[symbol] ?? {quantity:0,cost:0};
    if (side==='buy' && gross>wallet.cash) throw new Error('Insufficient virtual cash.');
    if (side==='sell' && quantity>position.quantity) throw new Error('Insufficient virtual shares.');
    const positions = {...wallet.positions};
    const realised = side==='sell' ? gross-Math.round(position.cost*quantity/position.quantity) : 0;
    const next = side==='buy'
      ? {quantity:position.quantity+quantity,cost:position.cost+gross}
      : {quantity:position.quantity-quantity,cost:position.cost-gross+realised};
    if(next.quantity)positions[symbol]=next;else delete positions[symbol];
    const cash=wallet.cash+(side==='buy'?-gross:gross);
    if (!isNonnegative(cash) || !isNonnegative(next.cost) || !isNonnegative(next.quantity)) throw new Error('The order exceeds the simulator limits.');
    const trade = {symbol,side,quantity,amount,gross,quoteAt,feed,id,at,realised,...(basketId?{basketId}:{})};
    return {cash,positions,trades:[trade,...wallet.trades].slice(0,250)};
  }

  function previewBasket(wallet, legs, multiplier) {
    const errors = [];
    if (legs.length<1 || legs.length>16) errors.push('Add between 1 and 16 orders.');
    if (!Number.isInteger(multiplier) || multiplier<1 || multiplier>100) errors.push('Multiplier must be a whole number from 1 to 100.');
    let debit = 0;
    let credit = 0;
    const orders = [];
    if (errors.length) return {errors, orders, debit, credit, next:null};

    for (const leg of legs) {
      const quantity = leg.quantity * (leg.fixed ? 1 : multiplier);
      if (!Number.isSafeInteger(leg.quantity) || !Number.isSafeInteger(quantity) || quantity<1 || quantity>100000) {
        errors.push(leg.symbol+': quantity after multiplier must be 1–100,000 whole shares.');
        continue;
      }
      if (!leg.quote?.tradable) {
        errors.push(leg.symbol+': a fresh tradable quote is required.');
        continue;
      }
      const price = (leg.side==='buy'?leg.quote.ask:leg.quote.bid);
      const total = cents(price)*quantity;
      if (!Number.isSafeInteger(total) || total<=0) {
        errors.push(leg.symbol+': invalid fill price.');
        continue;
      }
      if (leg.side==='buy') debit+=total;
      else if (leg.side==='sell') credit+=total;
      else {
        errors.push(leg.symbol+': choose buy or sell.');
        continue;
      }
      orders.push({symbol:leg.symbol,side:leg.side,quantity,price,quoteAt:leg.quote.at,feed:leg.quote.feed});
    }
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)) errors.push('Basket total exceeds the simulator limits.');
    if (errors.length) return {errors,orders,debit,credit,next:null};

    const sequence = [...orders.filter(order=>order.side==='sell'), ...orders.filter(order=>order.side==='buy')];
    let next = wallet;
    for (const order of sequence) {
      try {
        next = fill(next,order);
      } catch (error) {
        return {errors:[order.symbol+': '+error.message],orders:sequence,debit,credit,next:null};
      }
    }
    return {errors,orders:sequence,debit,credit,next};
  }

  function executeBasket(wallet, preview, {basketId,at}) {
    if (!preview.next) throw new Error('Review the basket before placing it.');
    return preview.orders.reduce(
      (account,order,index)=>fill(account,{...order,basketId,at,id:basketId+'-'+(index+1)}),
      wallet
    );
  }

  function countReturns(values) {
    return values.reduce((counts,change)=>{
      counts[change > .100000001 ? 0 : change < -.100000001 ? 2 : 1]++;
      return counts;
    },[0,0,0]);
  }
  function returnWindows(bars,period,intradayData) {
    if(period==='1H') {
      const times=new Map(intradayData.map(bar=>[Date.parse(bar.at),bar]));
      return intradayData.flatMap(bar=>{
        const prior=times.get(Date.parse(bar.at)-3_600_000);
        return prior && prior.session===bar.session ? [(bar.close/prior.close-1)*100] : [];
      });
    }
    const step={ '1D':1,'1M':21,'1Y':252 }[period];
    return bars.slice(step).map((bar,i)=>(bar.close/bars[i].close-1)*100);
  }
  return {fresh,decode,fill,previewBasket,executeBasket,cents,countReturns,returnWindows};
})();

if (typeof module !== 'undefined') module.exports = paper;
