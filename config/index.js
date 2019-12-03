exports.config = function() {
  let res = {
    tradingPair: 'BTCUSD',
    startingBalance: 50000,
    buyGainStop: 1,
    sellGainStop: 1,
  }
  // supporting only pairs in format 3 character for both assets 
  res.first = res.tradingPair.substr(0,3)
  res.second = res.tradingPair.substr(3,3)
  return res;
}
