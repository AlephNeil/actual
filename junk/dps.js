const config = require('../conf/config')

var thePool = new (require('mssql').ConnectionPool)(config.MSSQL)

async function ensurePool() {
    if (thePool.connected) {
        return thePool
    }
    else if (thePool.connecting) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        if (!thePool.connected) {
            throw new Error(`Timeout waiting for DPS connection`)
        }
    }
    else {
        return await thePool.connect()
    }
}

function logError(msg) {
    console.log(msg)
}

async function resolve(cliref) {
    try {
        // const pool = await sql.connect(CONN_STRING)
        const pool = await ensurePool()
        const result = await pool.query`select success=1, email=sal_inv_email, tel=sal_inv_telephonemobile
            from ReminderData
            where sal_account_ref=${cliref}`
        if (result.recordset.length == 0) {
            logError(`DPS reference "${cliref}" not found`)
            return {}
        }
        else if (result.recordset.length > 1) {
            logError(`Multiple DPS matches with cliref "${cliref}"`)
            return {}
        }
        else {
            return result.recordset[0]
        }
    }
    catch (err) {
        logError(err)
        return {}
    }
}

module.exports = function(err_cb) {
    if (err_cb) {
        logError = err_cb
    }
    return {
        resolve,
        ensurePool
    }
}

async function funStuff() {
    await ensurePool()
    var alpha = await resolve('MOU008')
    var beta = await resolve('TLW030')
    console.log(alpha)
    console.log(beta)
}

if (require.main === module) {
    funStuff()
}
