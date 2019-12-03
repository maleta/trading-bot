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
  return new Promise(function(resolve, reject) {
    data.PnL.forEach((item) => {
      // if (item)
    })
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

      })

  }
  else {
    // ignore, no price changes in this check
  }
}

var buyFor = function(amount, price, positionId) {
  console.log('buying ' + config.first + ' ' + amount + ' price ' + config.second + ' ' + price)
  data.assets.first = numberRounding(amount /  data.latestResult.askPrice) // no exchange fee calculus
  data.assets.second = data.assets.second - amount
  if (positionId) {
    let pos = data.PnL.get(positionId);
    pos.status = 'close';
    pos.amountEnd = amount;
    pos.priceEnd = price;
    pos.difference = pos.amountStart * pos.amountEnd - pos.amountEnd * pos.priceEnd; // buy close is positive for gain, negative for loss
    data.PnL.set(positionId, pos)
  }
  else {
    let pos = new position('buy', amount, price, 0, 0, config.first );
    data.PnL.set(Math.random().toString(36).substr(2, 9), pos);
  }
}
var sellFor = function(amount, price, positionId) {
  console.log('selling '+ config.first + ' ' + amount + ' price ' + config.second + ' ' + price)
  data.assets.first = data.assets.first - amount // no exchange fee calculus
  data.assets.second = data.assets.second + numberRounding(amount * price)
  if (positionId) {
    let pos = data.PnL.get(positionId);
    pos.status = 'close';
    pos.amountEnd = amount;
    pos.priceEnd = price;
    pos.difference = pos.amountEnd * pos.priceEnd - pos.amountStart * pos.amountEnd; // sell close is positive for gain, negative for loss
    data.PnL.set(positionId, pos)
  }
  else {
    let pos = new position('sell', amount, price, 0, 0, config.first );
    data.PnL.set(Math.random().toString(36).substr(2, 9), pos);
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
