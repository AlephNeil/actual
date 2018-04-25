const config = require('../conf/config')
const nodemailer = require('nodemailer')

module.exports = nodemailer.createTransport(config.SMTP, config.SMTP_DEFAULTS)

// const testMessage = {
//     to: 'neil.dot.fitzgerald@gmail.com',
//     subject: 'I am a test message from nodejs',
//     text: 'Hello, sir!',
// }

// transporter.sendMail(testMessage, (err, info) => {
//     if (err) {
//         console.log('Error occurred')
//         console.log(err.message)
//         return process.exit(1)
//     }

//     console.log('Message sent successfully!')
//     console.log(nodemailer.getTestMessageUrl(info));
// })
