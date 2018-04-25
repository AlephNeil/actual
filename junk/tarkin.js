const fs = require('fs')
const util = require('util')
// const calendarFile = 'webdav\\Neil_Fitzgerald_Calendar.ics'
const _ = require('underscore')
const {filterAsync} = require('node-filter-async')

const ical = require('node-ical')
const {promisify} = require('util')
const parseFileAsync = promisify(ical.parseFile).bind(ical)

const {Reminder, dispatch} = require('./piett')
const frontier = require('./frontier')
const strftime = require('strftime')
const config = require('../conf/config')

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

const CALENDAR_DIR = '../webdav'

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

async function getCalendarPaths() {
    var p = new Promise((resolve, reject) => {
        fs.readdir(CALENDAR_DIR, (err, files) => {
            if (err) {
                reject(err)
            }
            else {
                files = files.filter(fn => fn.match(/\.ics$/))
                resolve(files.map(fn => `${CALENDAR_DIR}/${fn}`))
            }
        })
    })
    return await p
}

function nameFromIcal(ical) {
    return (ical.OWNER.params.CN).replace(/"/g, "")
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
        dDesc = `on ${strftime('%B %d')}`
    }

    return `${dDesc} at ${strftime('%-I:%M %p')}`
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
        var now = new Date()
        lb = now > lb ? now : lb
        // await frontier.commit()
    }

    console.log(`Handling reminders between ${lb} and ${ub}`)
    
    try {
        const calendarPaths = await getCalendarPaths()
        calendarPaths.forEach(async (path) => {
            console.log(`Working on: ${path}`)
            var contents = await parseFileAsync(path)
            var calName = nameFromIcal(contents)
            if (forceTest && calName !== 'Neil Fitzgerald') return

            // appts is an object sending EntryIDs to arrays of reminders
            var appts = getAppts(contents, lb, ub)
            console.log(`Found ${_.keys(appts).length} appts`)
            // var keys = _.keys(appts)
            var keys = await filterAsync(_.keys(appts), frontier.notAlreadyDone)
            console.log(`After eliminating those already handled, have ${keys.length} left`)
            keys.forEach(async (entryID) => {
                var appt = appts[entryID]
                var recips = appt.recips
                var message = populate(config.REMINDER_TEXT, {
                    person: calName,
                    time: dtFormat(appt.start, ub)
                })
                try {
                    for (var i = 0; i < recips.length; i++) {
                        var r = new Reminder(recip, message)
                        console.log(`Dispatching Reminder: ${util.inspect(r)}`)
                        await dispatch(r)
                    }
                    await frontier.markAsDone(entryID)
                }
                catch (err) {
                    console.log(`Tarkin Process: ${err}`)
                }
            })
        })

        await frontier.commit()
    }
    catch (err) {
        console.log(`Tarkin End: ${err}`)
    }
}

module.exports = grandMoffTarkin

if (require.main === module) {
    grandMoffTarkin(true)
}
