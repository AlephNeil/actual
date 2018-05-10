const config = require('../conf/config')
const dps = require('./dps')()
const client = require('./smsclient')
const transport = require('./transport')

async function main() {
    var alpha = await dps.resolve('MOU008')
    dispatch(alpha, "The rain in Spain")
    //  console.log(alpha)
}

classify_tests = [
    {
        regex: /^()$/,
        type: 'null',
    },
    {
        regex: /^([A-Z'.]{3}[0-9]{3,4})/i,
        type: 'dps',
    },
    {
        regex: /<(?:mailto:)?([^<>@]+\@(?:[a-z0-9]+[.-])*[a-z]+)>/i,
        type: 'email',
    },
    {
        regex: /^(?:mailto:)?([a-z0-9+=.-]+\@(?:[a-z0-9]+[.-])*[a-z]+)/i,
        type: 'email',
    },
    {
        regex: /^([0-9]+[0-9 ]+[0-9])/,
        type: 'phone',
    },
]

// Argument assumed to be a string
function cleanAndClassify(recipient) {
    recipient = recipient.trim()

    for (var t of classify_tests) {
        var m = recipient.match(t.regex)
        if (m) return {
            type: t.type,
            recipient: m[1]
        }
    }

    // throw new Error(`Invalid Recipient: ${recipient}`)
    // if (recipient === "") return {
    //     type: 'null',
    //     recipient
    // }

    // // Check for DPS:
    // var m = recipient.match(/^([A-Z'.]{3}[0-9]{3,})/i)
    // if (m) return {
    //     type: 'dps',
    //     recipient: m[1]
    // }

    // // Check for email address:
    // m = recipient.match(/^(?:[a-z]+:)?(\S+\@\S+)/)
    // if (m) return {
    //     type: 'email',
    //     recipient: m[1]
    // }
        
    // // Check for telephone:
    // m = recipient.match(/^([0-9+][0-9 ]+[0-9])/)
    // if (m) return {
    //     type: 'phone',
    //     recipient: m[1]
    // }

    throw new Error(`Invalid Recipient: ${recipient}`)
}

// Record should look like this:
//  * type = email | phone | dps
//  * message
//  * recipient = phone number or email addres
function Reminder(recipient, message) {
    if (typeof recipient !== 'string' || typeof message !== 'string') {
        throw new Error('new Reminder: arguments not strings')
    }
    var alpha = cleanAndClassify(recipient)
    alpha.message = message
    return alpha
}

async function dispatch(reminder) {
    if (reminder.type === 'null') return;

    if (reminder.type === 'dps') {
        try {
            var alpha = await dps.resolve(reminder.recipient)
        }
        catch (err) {
            console.log(`DPS error resolving ${reminder.recipient}`)
        }
        await dispatch(new Reminder(alpha.email, reminder.message))
        await dispatch(new Reminder(alpha.tel, reminder.message))
    }
    else if (reminder.type === 'email') {
        transport.sendMail({
            to: `<${reminder.recipient}>`,
            text: reminder.message
        }, (err, res) => {
            if (err) {
                console.log(err)
            }
        })
    }
    else if (reminder.type === 'phone') {
        client.easySms(reminder.message, reminder.recipient, (err, res) => {
            if (err) {
                console.log(err)
            }
        })
    }
    else {
        throw new Error('Unknown reminder type')
    }
}

module.exports = {
    Reminder,
    dispatch
}

if (require.main === module) {
    // main()
}
