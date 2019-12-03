const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const data = require('./data/');
const tradingService = require('./services/tradingService')
const cfg = require('./config/').config()

app.set('host', process.env.HOST || '0.0.0.0')
app.set('port', process.env.PORT || 8000)

app.use(bodyParser.json());

// starting service
tradingService.start();

app.use('/status', function(req, res) {
  let helper = {}
  helper[cfg.first] = data.assets.first
  helper[cfg.second] = data.assets.second
  console.log(data.PnL)
  res.status(200).send({
    pnl: JSON.stringify([...data.PnL]), 
    assets: helper
  });
})
app.use('/stop', function(req, res) {
  tradingService.stop()
  res.status(200).send({
    statusMessage: 'bot activites stopped',
    assets: data.assets,
    PnL: JSON.stringify([...data.PnL])
  })
})


app.use((error, req, res, next) => {
  console.error('Globla error catch:\n')
  console.error(error)
  console.error('\n\n')
});

app.listen(app.get('port'), () => {
  console.log(`App is running at ${app.get('host')}:${app.get('port')}`)
});

process.on('SIGINT', () => {
  console.log('gracefull shutdown..')
  process.exit()
});

module.exports = app
