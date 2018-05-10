const fs = require('fs')
const util = require('util')
// const calendarFile = 'webdav\\Neil_Fitzgerald_Calendar.ics'
const _ = require('underscore')
const {filterAsync} = require('node-filter-async')

const ical = require('../node-ical')
// const ical = require('node-ical')
const {promisify} = require('util')
const parseFileAsync = promisify(ical.parseFile).bind(ical)

const {Reminder, dispatch} = require('./piett')
const frontier = require('./frontier')
const strftime = require('strftime')
const config = require('../conf/config')

const rp = require('request-promise')

Promise.prototype.store = function(s) {
    return this.then(result => { global[s] = result })
}

// OWNER.params.CN = 'Neil Fitzgerald'
// Test for <EntryID>.type = 'VEVENT' for events that may have reminders
// Properties of interest:
//  * description
//  * location
//  * organizer.CN
//  * attendee.params.CN; attendee.val
//  * start
//  * end
//  * dtstamp = when was created
//  * rrule : if present then appt is recurring
//  * recurrenceid

// Properties we want:

// Read all appointments
// Find those with reminders (whether email, phone or DPS)

// Want to get a list of all appointment files in the directory, surely?
// Note: the problem we solved so ingeniously before -- picking up whose calendar the appt was left in
// ceases to be an obstacle.

const CALENDAR_DIR = 'webdav'

function remFromDesc(desc) {
    var match
    var ends = []
    var ptrn = /^#remind\b:?\s*(\S.*)$/igm
    while (match = ptrn.exec(desc)) {
        ends.push(match[1])
    }
    return ends
}

function getAppts(conts, lb, ub) {
    conts = _.pick(conts, v => v.type === 'VEVENT')
    conts = _.pick(conts, v => v.rrule === undefined && v.recurrenceid === undefined)
    // return _.pick(conts, v => v.start >= lb && v.start <= ub)
    conts = _.pick(conts, v => v.start >= lb && v.start <= ub)
    conts = _.mapObject(conts, v => ({
        start: v.start,
        recips: remFromDesc(v.description),
    }))
    return _.pick(conts, v => v.recips.length > 0)
}

function dtFormat(dtTo, dtFrom) {
    var dTo = new Date(dtTo).setHours(0, 0, 0, 0)
    var dFrom = new Date(dtFrom).setHours(0, 0, 0, 0)
    var dayDiff = Math.round((dTo - dFrom)/(1000*60*60*24))

    var dDesc
    if (dayDiff === 0) {
        dDesc = "today"
    }
    else if (dayDiff === 1) {
        dDesc = "tomorrow"
    }
    else {
        dDesc = `on ${strftime('%B %d', dtTo)}`
    }

    return `${dDesc} at ${strftime('%-I:%M %p', dtTo)}`
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

async function grandMoffTarkin(forceTest) {
    // Get the outer and inner time horizons
    // console.log(`## TARKIN STARTS: ${strftime('%H:%M:%S')} ##`)
    var lb, ub
    if (forceTest) {
        ub = new Date()
        ub.setDate(ub.getDate() + 14)
        lb = new Date()
        lb.setDate(lb.getDate() - 14)
    }
    else {
        ub = new Date()
        ub.setDate(ub.getDate() + 1)
        lb = await frontier.begin(ub)
        lb = new Date()
    }

    console.log(`Handling reminders between ${lb} and ${ub}`)
    var success = true
    
    try {
        const calendars = await frontier.getCalendars()

        await Promise.all(_.values(calendars).map(async (obj) => {
        // _.values(calendars).forEach(async (obj) => {
            var contents
            try {
                contents = await rp(obj.url.replace(/^webcal/i, 'http'))
            }
            catch (err) {
                return console.log(`Retrieving calendar of '${obj.name}' got error: ${err}`)
            } 
            preserve(obj.name, contents)

            var calName = obj.name
            // console.log(`${calName}: Parsing calendar`)
            if (forceTest && calName !== 'Neil Fitzgerald') return

            // appts is an object sending EntryIDs to arrays of reminders
            var parsed = ical.parseICS(contents)
            var appts = getAppts(parsed, lb, ub)
            var keys = await filterAsync(_.keys(appts), frontier.notAlreadyDone)
            console.log(`${calName}: of ${_.keys(appts).length} have ${keys.length} to send`)
            keys.forEach(async (entryID) => {
                var appt = appts[entryID]
                var recips = appt.recips
                var message = populate(config.REMINDER_TEXT, {
                    person: calName,
                    time: dtFormat(appt.start, new Date())
                })
                let sentFlag = false
                try {
                    for (var i = 0; i < recips.length; i++) {
                        var r = new Reminder(recips[i], message)
                        console.log(`Dispatching Reminder: ${util.inspect(r)}`)
                        await dispatch(r)
                        sentFlag = true
                    }
                }
                catch (err) {
                    console.log(`Tarkin Process: ${err}`)
                    success = false
                }
                finally {
                    if (sentFlag) await frontier.markAsDone(entryID)
                    // if (sentFlag) await frontier.markAsDone(JSON.stringify({
                    //     start: appt.start,
                    //     entryID: entryID,
                    // }))
                }
            })
        }))

        if (success) await frontier.commit()
    }
    catch (err) {
        console.log(`Tarkin Error: ${err}`)
    }
    // await frontier.purge()
    console.log(`## TARKIN ENDS: ${strftime('%H:%M:%S')} ##`)
}

function preserve(name, data) {
    var fname = name.replace(/\W/g, '_')
    fs.writeFile(`ics/${fname}.ics`, data, (err) => {
        if (err) {
            console.log('Error in function \'preserve\': ' + err.toString())
        }
    })
}

module.exports = grandMoffTarkin

if (require.main === module) {
    grandMoffTarkin(true)
}
