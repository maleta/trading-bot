const cfg = require('../config').config()

exports.assets = {
  first: 0,
  second: cfg.startingBalance
}
exports.latestResult = {
  bidPrice: 0,
  bidQty: 0,
  askPrice: 0,
  askQty: 0
}
exports.PnL = new Map()
