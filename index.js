const transport = require('./junk/transport')
const tarkin = require('./junk/tarkin')
const schedule = require('node-schedule')
const dps = require('./junk/dps')()
const client = require('./junk/smsclient')
const mailsrv = require('./smtp/mailsrv')
const frontier = require('./junk/frontier')
const strftime = require('strftime')


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

function purgeJob() {
    frontier
        .deletePastEntries(new Date())
        .then(ds => {
            console.log(`Purge job at ${strftime('%H:%M:%S')}: ${ds} deletion${ds != 1 ? 's' : ''}`)
        })
        .catch(err => {
            console.log(`Error in purge job: ${err}`)
        })
}

function initAndStart() {
    const j = schedule.scheduleJob('10 18 * * *', balanceJob)
    const k = schedule.scheduleJob('*/15 * * * *', mainJob)
    // const l = schedule.scheduleJob('15 18 * * *', purgeJob)
    const l = schedule.scheduleJob('0 * * * *', purgeJob)
}

if (require.main === module) {
    initAndStart()
}
