const transport = require('./transport')
const client = require('./smsclient')
const knex = require('knex')(require('../knexfile'))
const schedule = require('node-schedule')


const j = schedule.scheduleJob('10 18 * * *', balanceJob)
const k = schedule.scheduleJob('*/5 * * * *', mainJob)

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
	// console.log('*** mainJob starts ***')
	const now = new Date()
	knex('reminder')
		.where('schedule', '<=', now)
		.andWhere('handled', 0)
		.select()
		.then((rems) => {
			// console.log(`Checkpoint: ${rems.length}`)
			rems.forEach(handleReminder)
		})
}

function populate(template, values) {
    return template.replace(/(?<!{){(\w+)}(?!})/g, (all, part) => {
        if (part in values) {
            return values[part].replace(/\b[A-Z]{3,}\b/g, m => m[0] + m.substr(1).toLowerCase())
        }
        else {
            return all
        }
    }).replace(/{{/g, '{').replace(/}}/g, '}')
}

function handleReminder(rem) {
	// console.log(`I am handling reminder: ${rem.id}`)
    knex('recipient')
        .where('reminder_id', rem.id)
        .andWhere('sms_flag', 1)
        .select()
        .then((recips) => {
            for (const recip of recips) {
				// console.log(`I am handling recipient: ${recip.name}`)
				// console.log(`The sms_flag is: ${recip.sms_flag}`)
                const msg = populate(rem.msg, recip)
                client.easySms(msg, recip.phone, (err, res) => {
                    if (err) {
                        knex('recipient')
                            .where('id', recip.id)
                            .update('sms_error_flag', 1)
                            .then(() => {})
                    }
                })
            }
        })

    knex('recipient')
        .where('reminder_id', rem.id)
        .andWhere('email_flag', 1)
        .select()
        .then((recips) => {
            for (const recip of recips) {
                transport.sendMail({
                    to: `<${recip.email}>`,
                    text: populate(rem.msg, recip),
                }, (err, info) => {
                    if (err) {
                        knex('recipient')
                            .where('id', recip.id)
                            .update('email_error_flag', 1)
                            .then(() => {})
                    }
                })
            }
        })

    knex('reminder').where('id', rem.id).update('handled', 1).then(() => {})
}

if (require.main === module) {
	mainJob()
	balanceJob()
}

module.exports = {
	reminderJob: j,
	balanceJob: k,
}
