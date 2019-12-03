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
  let result = `
    <span> ${cfg.first} : ${data.assets.first} </span> </br>
    <span> ${cfg.second} : ${data.assets.second} </span> </br>
    <span> ${cfg.first} to keep : ${data.assets.firstMustKeepToClosePositions} </span> </br>
    <span> ${cfg.second} to keep: ${data.assets.secondMustKeepToClosePositions} </span> </br> </br>
    <table border='1' style='text-align: right'>
    <th>index</th>
    <th>status</th>
    <th>started as</th>
    <th>qty start</th>
    <th>price start</th>
    <th>qty end</th>
    <th>price end</th>
    <th>token</th>
    <th>difference</th>
    `
  data.PnL.forEach((item, index) => {
    result += `<tr>
    <td>${index} </td>
    <td>${item.status} </td>
    <td>${item.type} </td>
    <td>${item.amountStart} </td>
    <td>${item.priceStart} </td>
    <td>${item.amountEnd} </td>
    <td>${item.priceEnd} </td>
    <td>${item.asset} </td>
    <td>${item.difference} </td>
    </tr>
    `
  })
  result += `</table`;

  res.status(200).send(result);
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
