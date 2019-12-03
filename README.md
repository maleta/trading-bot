## trading bot
Start bot by running following command
````
npm install
npm run dev
````
Available routes:
````
/status - PnL status print
/stop - Stop pulling data and bot activities
````

TODO
1. Add logic to determine what loss to accept and close position before catastrophic loss
2. Put fee calculus in formulas
3. Add live info on frontend using socketIO
4. Implement stop custom position and stop all positions functionallity
5. Add more tactics for trading
