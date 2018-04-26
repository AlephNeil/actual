const transport = require('./junk/transport')
const tarkin = require('./junk/tarkin')
const schedule = require('node-schedule')
const dps = require('./junk/dps')()


function balanceJob() {
    client.checkBalance((err, res) => {
        const msg = err ? `Error: ${res}` : `Zensend balance: ${res}`
        transport.sendMail({
            to: '<admin@carpenterssolicitors.co.uk>',
            text: msg,
        }, (err, info) => {
            // Not sure what to do here
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

async function initAndStart() {
    const j = schedule.scheduleJob('10 18 * * *', balanceJob)
    const k = schedule.scheduleJob('*/5 * * * *', mainJob)
}

if (require.main === module) {
    initAndStart()
}
