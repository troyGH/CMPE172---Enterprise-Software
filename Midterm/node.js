#!/usr/bin/env node
// ===============================
// AUTHOR       : Troy Nguyen
// CREATE DATE  : 10/22/2016
// PURPOSE      : SJSU CMPE172 Midterm
// ===============================

const repl = require('repl'); // for command line interface
var request = require('request'); // for http get command
var fs = require('fs'); //for file sync
var csv = require('fast-csv'); //for csv export, install by entering "npm install fast-csv"
var uu = require('underscore'); //for map, install by entering "npm install underscore"
var moment = require('moment'); //for time display, install by entering "npm install moment"

//Glboal variables
var exchange_rates = {}; //coinbase exchange rates
var order = []; //storing all orders of the current session
var currencyList = []; //storing all currencies user enters

initialize(); //get coinbase data to reduce lag

const r = repl.start({prompt: 'coinbase>', eval: myEval}); //repl server

function myEval(cmd, context, filename, callback) {

  cmd = cmd.replace(/(\r\n|\n|\r)/g,""); //remove newline character
  var arr = cmd.split(" "); //convert commands into an array

  switch(arr[0]){ //match command
    case (arr[0].match(/BUY/) || {}).input: buy(arr); break;
    case (arr[0].match(/SELL/) || {}).input: sell(arr); break;
    case (arr[0].match(/ORDERS/) || {}).input: orders(); break;
    case (arr[0].match(/HELP/) || {}).input: console.log("Available commands: \n1. BUY <amount> [currency] \n2. SELL <amount> [currency] \n3. ORDERS \n4. EXIT"); break;
    case (arr[0].match(/EXIT/) || {}).input: console.log("Bye");process.exit(0); break;
    default: console.log("Error..Try Again"); break;
  }
  this.displayPrompt(); // displaying >
}

//get currencies and exchange rates and store it inside objects
function initialize(){
  request('https://coinbase.com/api/v1/currencies/exchange_rates/', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      exchange_rates = JSON.parse(body);
    }
  });
}

/*
•	BUY <amount>[currency]
	Currency is optional. If a currency is provided (USD, EUR, etc.), the order will buy as many BTC as the <amount> provides at the current exchange rates. For example BUY 10 USD, display a message “Order to BUY 10 USD worth of BTC queued @ 613.45 BTC/USD (0.015897750831403948 BTC)”
	Otherwise it will place an order to buy as many BTC as the <amount> and display a message “Order to BUY 10 BTC queued”
	Currency is not valid. For example BUY 10 UCD. Display a message “No known exchange rate for BTC/UCD. Order failed”.
	If <amount> is invalid. Display a message “No amount specified”.
*/
function buy(cmd){
  try{

    if(cmd.length < 2){ //Check if BUY <amount> is entered or BUY <amount> [currency]
      console.log("No amount specified.");
      return;
    }

    var amountStr = cmd[1];
    var currency = "BTC";
    var amount = parseFloat(amountStr);

    if(amount <= 0 || isNaN(amount)){ //Check if <amount> is valid
      console.log("No valid amount specified.");
      return;
    }

    if(cmd[2]) { //check if [currency] is entered
      var currency = cmd[2];
      var key = "btc_to_"+currency.toLowerCase();

      if(isNaN(exchange_rates[key])){ //if rate is NaN, that means input currency is invalid
        console.log("No known exchange rate for BTC/%s. Order Failed.", currency);
        return;
      }
      else{
        if(currencyList.includes(key) == false){
          currencyList.push(key);
        }
        var rate = parseFloat(exchange_rates[key]);

        console.log("Order to %s %s %s worth of BTC queued @ %d BTC/%s (%d BTC)", cmd[0], cmd[1], currency, rate.toFixed(2), currency, amount/rate);
      }

    }
    else{
      console.log("Order of %s %s %s queued.", cmd[0], cmd[1], currency);
    }

    order.push({ //store info for saving later
      timestamp: moment().format('ddd MMM DD YYYY HH:mm:ss zz ZZ'),
      type: "BUY",
      amount: amount,
      currency: currency,
      rate: rate
    });
  }catch(err){
    //console.log("Error Executing. Try entering BUY <amount> [currency]");
    console.log(err.message);
  }
}

//Same rules apply as BUY
function sell(cmd){
  try{
    if(cmd.length < 2){ //Check if SELL <amount> is entered or BUY <amount> [currency]
      console.log("No amount specified.");
      return;
    }

    var amountStr = cmd[1];
    var currency = "BTC";

    var amount = parseFloat(amountStr);
    if(amount <= 0 || isNaN(amount)){ //Check if <amount> is valid
      console.log("No valid amount specified.");
      return;
    }

    if(cmd[2]) { //check if [currency] is entered
      var currency = cmd[2];
      var key = "btc_to_"+currency.toLowerCase();

      if(isNaN(exchange_rates[key])){ //if rate is NaN, that means input currency is invalid
        console.log("No known exchange rate for BTC/%s. Order Failed.", currency);
        return;
      }
      else{
        if(currencyList.includes(key) == false){
          currencyList.push(key);
        }
        var rate = parseFloat(exchange_rates[key]);

        console.log("Order to %s %s %s worth of BTC queued @ %d BTC/%s (%d BTC)", cmd[0], cmd[1], currency, rate.toFixed(2), currency, amount/rate);
      }
    }
    else{
      console.log("Order of %s %s %s queued.", cmd[0], cmd[1], currency);
    }

    order.push({ //store info for saving later
      timestamp: moment().format('ddd MMM DD YYYY HH:mm:ss zz ZZ'),
      type: "SELL",
      amount: amount,
      currency: currency,
      rate: rate,
    });

  }catch(err){
    console.log("Error Executing. Try entering SELL <amount> [currency]");
  }
}

/*
•	ORDERS – This command saves all current orders in a CSV format (use the same modules as market-research.js to generate CSV)
as well as displays the current orders on console as follows.
		 === CURRENT ORDERS ===
Wed Oct 05 2016 22:09:40 GMT+0000 (UTC) : BUY 10 : UNFILLED

*/
function orders(){
  try{
    uu.each(currencyList, function(currency){
      console.log("CURRENT %s: %d", currency.toUpperCase(), exchange_rates[currency]);
    });
    //transforming orders list to better format for csv
    var transformedOrders = uu.map(order, function(item){
      return { "timestamp": item.timestamp,
              "buy/sell type": item.type,
              "amount": item.amount,
              "currency": item.currency,
              "conversion rate to BTC": item.rate};
      });

    //create a writable stream
    var writableStream = fs.createWriteStream("my.csv");

    //use fast-csv write function to write the orders and pipe it to writable stream used to create a csv of unknown size
    csv.write(transformedOrders, {headers :true}).pipe(writableStream);

    console.log("\t\t=== CURRENT ORDERS ===");
    uu.each(order, function(item){
      console.log("%s (UTC) : %s %s %s: UNFILLED", item.timestamp, item.type, item.currency, item.amount);
    });

  }catch(err){
    console.log(err.message);
  }
}
