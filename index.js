const transport = require('./junk/transport')
const tarkin = require('./junk/tarkin')
const schedule = require('node-schedule')
const dps = require('./junk/dps')()
const client = require('./junk/smsclient')
const mailsrv = require('./smtp/mailsrv')


function balanceJob() {
    client.checkBalance((err, res) => {
        const msg = err ? `Error: ${err}` : `Zensend balance: ${res}`
        transport.sendMail({
            to: '<admin@carpenterssolicitors.co.uk>',
            text: msg,
        }, (err, info) => {
            if (err) {
                console.log(`Error sending balance email: ${err}`)
            }
        })
    })
}

function mainJob() {
    innerJob()
}
async function innerJob() {
    await dps.ensurePool()
    var testMode = process.env['RUN_MODE'] === 'debug' 
    await tarkin(testMode)
}

function initAndStart() {
    const j = schedule.scheduleJob('10 18 * * *', balanceJob)
    const k = schedule.scheduleJob('*/5 * * * *', mainJob)
}

if (require.main === module) {
    initAndStart()
}
