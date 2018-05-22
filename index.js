require('dotenv').load()

let failed = 0,
  interval = process.env.MIN_INTERVAL / process.env.GROWTH_RATE
const DEVICE = `$(networksetup -listallhardwareports | awk '$3=="Wi-Fi" {getline; print $2}')`,
  WIFI = `networksetup -setairportpower ${DEVICE}`,
  SPOOF_MAC =
    // disconnect from any connected network first WITHOUT shutting off the Wi-Fi
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -z;' +
    `ifconfig ${DEVICE} ether $(openssl rand -hex 6 | sed 's/\\(..\\)/\\1:/g; s/.$//')`,
  { lookup } = require('dns'),
  { execSync } = require('child_process'),
  { exec } = require('sudo-prompt'),
  debug = require('debug'),
  info = debug('wifi:!'),
  error = debug('wifi:✗'),
  ok = debug('wifi:✓'),
  now = () => new Date().toLocaleString(),
  sleep = () => setTimeout(check, interval * 1000),
  restart = msg => {
    execSync(`${WIFI} off`)
    execSync(`${WIFI} on`)
    info(msg)
    sleep()
  },
  check = () => {
    lookup(process.env.TEST_WEBSITE, err => {
      if (err && err.code == 'ENOTFOUND') {
        error(now())
        interval = process.env.MIN_INTERVAL

        // fail too many times -> spoof MAC
        if (++failed == process.env.FAIL_LIMIT)
          exec(SPOOF_MAC, { name: 'Fix Shitty Wifi' }, () =>
            restart('MAC address spoofed')
          )
        else restart('wifi restarted')
      } else {
        ok(now())

        failed = 0
        interval = Math.min(
          interval * process.env.GROWTH_RATE,
          process.env.MAX_INTERVAL
        )

        sleep()
      }
    })
  }

info(`looking up ${process.env.TEST_WEBSITE}`)
check()
