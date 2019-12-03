const axios = require('axios')
const data = require('../data')
const config = require('../config').config()
var getPriceInterval

// 6 decimal places precision
var numberRounding = function(num) {
  return Math.trunc(num * 1000000) / 1000000 
}
var position = function(type, amountStart, priceStart, amountEnd, priceEnd, asset) {
  return {
    status: 'open', // or close
    type: type, // buy when started by buying asset, sell when started by selling asset
    amountStart: amountStart,
    priceStart: priceStart,
    amountEnd: amountEnd,
    priceEnd: priceEnd,
    asset: asset,
    difference: 0, // + for gain, - for loss
  }
}

var checkOpenPositions = function() {
  console.log('checking new posiotions')
  return new Promise(function(resolve, reject) {
    data.PnL.forEach((item, index) => {
      if (item.status === 'open') { //optimize by having 2 different position maps, 1st for opened and 2nd for closed positions 
        if (item.type === 'buy') {
          if ((data.latestResult.askPrice - item.priceStart) >= config.buyGainStop) {
            sellFor(data.latestResult.askPrice, item.amountStart, index);
          }
        }
        else { // sell position
          if ((data.latestResult.bidPrice - item.priceStart) >= config.sellGainStop) {
            buyFor(data.latestResult.bidPrice, item.amountStart, index);
          }
        }
      }
    });
    resolve(); // Promise would be needed if we actually call AJAX and create orders in this function(or in sellFor, buyFor functions)
  })
}

var setData = function(result) {
  let resultFormatted = {}
  resultFormatted.bP = numberRounding(result[0])
  resultFormatted.bQ = numberRounding(result[1])
  resultFormatted.aP = numberRounding(result[2])
  resultFormatted.aQ = numberRounding(result[3])

  if (data.latestResult.bidPrice != resultFormatted.bP ||
    data.latestResult.bidQty != resultFormatted.bQ ||
    data.latestResult.askPrice != resultFormatted.aP ||
    data.latestResult.askQty != resultFormatted.aQ) {

    data.latestResult.bidPrice = resultFormatted.bP
    data.latestResult.bidQty = resultFormatted.bQ
    data.latestResult.askPrice = resultFormatted.aP
    data.latestResult.askQty = resultFormatted.aQ

    checkOpenPositions()
      .then(function() {
        let extraFirstFunds = data.assets.first - data.firstMustKeepToClosePositions;

        if (extraFirstFunds > 0) {
          sellFor(extraFirstFunds, data.latestResult.bidPrice)
        }

        let extraSecondFunds = data.assets.second - data.secondMustKeepToClosePositions;
        if (extraSecondFunds > 0) {
          buyFor(extraSecondFunds, data.latestResult.askPrice)
        }
      })

  }
  else {
    // no price changes in this check, ignore
  }
}

var buyFor = function(amount, price, positionId) { //amount is in second asset (USD)
  console.log('buying ' + config.first + ' ' + amount + ' price ' + config.second + ' ' + price)
  let firstChange = numberRounding(amount / data.latestResult.askPrice);
  data.assets.first += firstChange // no exchange fee calculus
  data.assets.second -= amount
  if (positionId) {
    let pos = data.PnL.get(positionId);
    pos.status = 'close';
    pos.amountEnd = amount;
    pos.priceEnd = price;
    pos.difference = pos.amountStart * pos.priceStart - pos.amountEnd * pos.priceEnd; // buy close is positive for gain, negative for loss
    data.PnL.set(positionId, pos)
    data.assets.firstMustKeepToClosePositions -= firstChange
  }
  else {
    let pos = new position('buy', amount, price, 0, 0, config.first )
    data.PnL.set(Math.random().toString(36).substr(2, 9), pos)
    console.log('seeting new pnl')
    console.log(data.PnL);
    data.assets.firstMustKeepToClosePositions += firstChange
  }
}
var sellFor = function(amount, price, positionId) { // amount is in first asset (BTC)
  console.log('selling '+ config.first + ' ' + amount + ' price ' + config.second + ' ' + price)
  let secondChange = numberRounding(amount * price)
  data.assets.first -= amount // no exchange fee calculus
  data.assets.second += secondChange
  if (positionId) {
    let pos = data.PnL.get(positionId)
    pos.status = 'close';
    pos.amountEnd = amount;
    pos.priceEnd = price;
    pos.difference = pos.amountEnd * pos.priceEnd - pos.amountStart * pos.priceStart; // sell close is positive for gain, negative for loss
    data.PnL.set(positionId, pos)
    data.assets.secondMustKeepToClosePositions -= secondChange
  }
  else {
    let pos = new position('sell', amount, price, 0, 0, config.first )
    data.PnL.set(Math.random().toString(36).substr(2, 9), pos)
    console.log('seeting new pnl')
    console.log(data.PnL);
    data.assets.secondMustKeepToClosePositions += secondChange
  }
}

var getLatestOrders = function () {
  return axios.get('https://api-pub.bitfinex.com/v2/ticker/t' + config.tradingPair)
    .then(function(response) {
      setData(response.data)
    })
} 
var initBuy = function() {
  getLatestOrders() //calling latestorders to be sure to have prices before buy
    .then(function(response) {
      buyFor(config.startingBalance / 2, data.latestResult.askPrice) // assume no price change between last order check and this callback (~50ms)
    })
}
exports.start = function() {
  initBuy();
  getPriceInterval = setInterval(getLatestOrders, 1000)
}
exports.stop = function() {
  clearInterval(getPriceInterval)
}
