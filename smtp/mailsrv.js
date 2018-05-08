const concat = require('concat-stream')
const SMTPServer = require('smtp-server').SMTPServer
const { registerCalendar } = require('../junk/frontier')
const simpleParser = require('mailparser').simpleParser
const fs = require('fs')
const _ = require('underscore')


var logging = false
var logger = null
if (logging) {
    logger = fs.createWriteStream('log.txt', { flags: 'a' })
}
function logWrite(msg) {
    var logFn = logging ? logger.write : console.log
    var timeStr = require('strftime')('%H:%M:%S')
    logFn(`${timeStr}: ${msg}\n`)
}

const server = new SMTPServer({
    name: 'flasker',
    authMethods: ['PLAIN'],
    authOptional: true,
    onData(stream, session, callback) {
        logWrite('### onData starts')
        stream.on('error', err => {
            console.log(`Oh no! An error: ${err}`)
            callback(err)
        })
        stream.pipe(concat(data => theHandler(data, callback)))
        logWrite('### onData ends')
    },
})

server.listen(25)

async function theHandler(data, callback) {
    logWrite('#### Handler started')
    callback(null, 'OK')
    var { text } = await simpleParser(data)
    logWrite(`#### The text is: ${text}`)
    if (text) {
        var record = trans(text)
        if (record) {
            try {
                await registerCalendar(record)
            }
            catch (err) {
                logWrite(`#### Error registering calendar: ${err}`)
            }
        }
        else {
            logWrite('#### Received bad email')
        }
    }
    else {
        logWrite('#### Received terrible email')
    }
    logWrite('#### Handler finished')
}

function trans(text) {
    try {
        return _.mapObject({
            name(text) {
                return /.*?(?=\s*\()/.exec(text)[0]
            },
            email(text) {
                return /\((.*?)\)/.exec(text)[1]
            },
            url(text) {
                return /\bwebcal:\/\/.*?\.ics\b/.exec(text)[0]
            }
        }, val => val(text))
    }
    catch (err) {
        return null
    }
}
