require('dotenv').load()

let interval = process.env.MIN_INTERVAL / process.env.GROWTH_RATE
const WIFI = `networksetup -setairportpower \
  $(networksetup -listallhardwareports | awk '$3=="Wi-Fi" {getline; print $2}')`,
  { lookup } = require('dns'),
  { execSync } = require('child_process'),
  debug = require('debug'),
  info = debug('wifi:!'),
  error = debug('wifi:✗'),
  ok = debug('wifi:✓'),
  now = () => new Date().toLocaleString(),
  check = () => {
    lookup(process.env.TEST_WEBSITE, err => {
      if (err) {
        interval = process.env.MIN_INTERVAL

        if (err.code == 'ENOTFOUND') {
          error(now())
          execSync(`${WIFI} off`)
          execSync(`${WIFI} on`)

          info('restarted')
        } else error(`unexpected error: ${err}`)
      } else {
        interval = Math.min(
          interval * process.env.GROWTH_RATE,
          process.env.MAX_INTERVAL
        )

        ok(now())
      }

      setTimeout(check, interval * 1000)
    })
  }

info(`looking up ${process.env.TEST_WEBSITE}`)
check()
