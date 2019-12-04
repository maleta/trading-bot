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
    effectiveAmount: 0, // qty of BTC when buy position, qty of USD when sell position
    asset: asset,
    difference: 0, // + for gain, - for loss
  }
}

var checkOpenPositions = function() {
  return new Promise(function(resolve, reject) {
    data.PnL.forEach((item, index) => {
      if (item.status === 'open') { //optimize by having 2 different position maps, 1st for opened and 2nd for closed positions 
        if (item.type === 'buy') {
          console.log(`checking buy position (${index})..difference if we close(sell) now ${data.latestResult.bidPrice - item.priceStart}`)
          if ((data.latestResult.bidPrice - item.priceStart) >= config.buyGainStop) {
            sellFor(item.effectiveAmount, data.latestResult.bidPrice, index);
          }
        }
        else { // sell position
          console.log(`checking sell position (${index})..difference if we close(buy) now ${item.priceStart - data.latestResult.askPrice}`)
          if ((item.priceStart - data.latestResult.askPrice) >= config.sellGainStop) {
            buyFor(item.effectiveAmount, data.latestResult.askPrice, index);
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
        let extraFirstFunds = numberRounding(data.assets.first - data.assets.firstMustKeepToClosePositions)
        if (extraFirstFunds > 0) {
          sellFor(extraFirstFunds, data.latestResult.bidPrice)
        }

        let extraSecondFunds = numberRounding(data.assets.second - data.assets.secondMustKeepToClosePositions)
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
  let firstChange = numberRounding(amount / price);
  data.assets.first += firstChange // no exchange fee calculus
  data.assets.second -= amount

  if (positionId) {
    let pos = data.PnL.get(positionId);
    console.log('closing ' + positionId + ' BUYING - ' + config.second + ' ' + amount + ' price ' + config.second + ' ' + price + ' effective amount: ' + pos.effectiveAmount)
    pos.status = 'close'

    pos.amountEnd = amount
    pos.priceEnd = price

    pos.difference = numberRounding(pos.amountEnd / pos.priceEnd - pos.amountStart) // buy close is positive for gain, negative for loss
    pos.asset = config.first; // this is closing transaction for buy position. Difference is shown in second asset
    data.PnL.set(positionId, pos)
    data.assets.secondMustKeepToClosePositions -= pos.effectiveAmount
  }
  else {
    console.log('new position, BUYING - ' + config.second + ' ' + amount + ' price ' + config.second + ' ' + price + ' effective amount: ' + firstChange)
    let pos = new position('buy', amount, price, 0, 0, config.second ) //diff is shown in USD
    pos.effectiveAmount = firstChange
    data.PnL.set(Math.random().toString(36).substr(2, 9), pos)
    data.assets.firstMustKeepToClosePositions += firstChange
  }
}
var sellFor = function(amount, price, positionId) { // amount is in first asset (BTC)
  let secondChange = numberRounding(amount * price)
  data.assets.first -= amount // no exchange fee calculus
  data.assets.second += secondChange
  if (positionId) {
    let pos = data.PnL.get(positionId)
    console.log('closing ' + positionId + ' SELLING -'+ config.first + ' ' + amount + ' price ' + config.second + ' ' + price + ' effective amount: ' + pos.effectiveAmount)
    pos.status = 'close';

    pos.amountEnd = amount;
    pos.priceEnd = price;

    pos.difference = numberRounding(pos.amountEnd * pos.priceEnd - pos.amountStart) // 
    pos.asset = config.second; // this is closing transaction for buy position. Difference is shown in second asset
    data.PnL.set(positionId, pos)
    data.assets.firstMustKeepToClosePositions -= pos.effectiveAmount
  }
  else {
    console.log('new position, SELLING -'+ config.first + ' ' + amount + ' price ' + config.second + ' ' + price + ' effective amount: ' + secondChange)
    let pos = new position('sell', amount, price, 0, 0, config.first ) //diff is shown in BTC
    pos.effectiveAmount = secondChange;
    data.PnL.set(Math.random().toString(36).substr(2, 9), pos)
    data.assets.secondMustKeepToClosePositions += secondChange
  }
}

var getLatestOrders = function () {
  return axios.get('https://api-pub.bitfinex.com/v2/ticker/t' + config.tradingPair)
    .then(function(response) {
      setData(response.data)
    })
} 
var initSetup = function() {
  return axios.get('https://api-pub.bitfinex.com/v2/ticker/t' + config.tradingPair)
    .then(function(response) {
      //for half of initial amount buy BTC
      data.assets.first += numberRounding(config.startingBalance / 2 / response.data[2]);
      data.assets.second -= config.startingBalance / 2;
    })
}
exports.start = function() {
  initSetup()
    .then(function(result) {
      getPriceInterval = setInterval(getLatestOrders, 1000)
    });
}
exports.stop = function() {
  clearInterval(getPriceInterval)
}
