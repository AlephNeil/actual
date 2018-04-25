const config = require('../conf/config')
const zensend = require('zensend')

const client = new zensend.Client(config.SMS.apiKey)
const origin = config.SMS.origin

function cleanTelNr(nr) {
    return nr.replace(/\s+/g, '').replace(/^0/, '+44')
}

function txtMsgOpts(msg, numbers) {
    return {
        originator: origin,
        body: msg,
        numbers: numbers.map(cleanTelNr),
    }
}

client.easySms = function(msg, phone, cb) {
    client.sendSms(txtMsgOpts(msg, [phone]), cb)
}

module.exports = client
