const priviCreditController = require('./priviCreditController');

const managePRIVIcredits = priviCreditController.managePRIVIcredits;


// all cron jobs goes here, server.ts will import all these functions and start them
module.exports = {
    managePRIVIcredits
}