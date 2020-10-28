const priviCreditController = require('./priviCreditController');
const lendingController = require('./lendingController');
const podController = require("./podController");

const managePRIVIcredits = priviCreditController.managePRIVIcredits;
const payInterest = lendingController.payInterest;
const checkLiquidation = lendingController.checkLiquidation;
const podCheckLiquidation = podController.checkLiquidation;
const podPayInterest = podController.payInterest;


// all cron jobs goes here, server.ts will import all these functions and start them
module.exports = {
    managePRIVIcredits,
    payInterest,
    checkLiquidation,
    podCheckLiquidation,
    podPayInterest
}