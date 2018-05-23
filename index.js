require('dotenv').load()
const actualMin = process.env.MIN_INTERVAL / process.env.GROWTH_RATE

let failed = 0,
  errorInterval = actualMin,
  okInterval = actualMin
const DEVICE = `$(networksetup -listallhardwareports | awk '$3=="Wi-Fi" {getline; print $2}')`,
  WIFI = `networksetup -setairportpower ${DEVICE}`,
  SPOOF_MAC =
    // wifi needs to be turned on to change MAC address
    `${WIFI} on && ` +
    // disconnect from any connected network first WITHOUT shutting off the Wi-Fi
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -z && ' +
    `sudo ifconfig ${DEVICE} ether $(openssl rand -hex 6 | sed 's/\\(..\\)/\\1:/g; s/.$//')`,
  { lookup } = require('dns'),
  { execSync } = require('child_process'),
  { bgWhite, gray, underline } = require('chalk'),
  debug = require('debug'),
  info = debug('wifi:!'),
  error = debug('wifi:✗'),
  ok = debug('wifi:✓'),
  msg = err =>
    gray(
      err
        .toString()
        .trimRight()
        .split('\n')
        .pop()
    ),
  now = () => new Date().toLocaleString() + '\t',
  sleep = interval => setTimeout(check, interval * 1000),
  exponentiate = interval =>
    Math.min(interval * process.env.GROWTH_RATE, process.env.MAX_INTERVAL),
  restart = msg => {
    try {
      execSync(`${WIFI} off && ${WIFI} on`)
    } catch (err) {
      error(
        `Network restart failed: ${msg(err)} ${bgWhite('(Is this running on a Mac?)')}`
      )
      process.exit(3)
    }

    info(msg)
    sleep((errorInterval = exponentiate(errorInterval)))
  },
  check = () =>
    lookup(process.env.TEST_SITE, err => {
      if (err) {
        if (err.code != 'ENOTFOUND') {
          error(
            `Lookup failed: ${msg(err)} ${bgWhite('(Is the test site set up correctly?)')}`
          )
          process.exit(2)
        }

        error(now())
        okInterval = actualMin

        // fail too many times -> spoof MAC
        if (++failed >= process.env.FAIL_LIMIT) {
          let spoofErr

          try {
            execSync(SPOOF_MAC)
          } catch (err) {
            // this is the one error that is recoverable from, so don't exit
            spoofErr = err
            error(
              `MAC address spoofing failed: ${msg(err)} ${bgWhite('(Is the Wi-Fi on?)')}`
            )
          }

          if (spoofErr) {
            sleep((errorInterval = exponentiate(errorInterval)))
          } else restart('MAC address spoofed\t')
        } else restart('Network restarted\t')
      } else {
        ok(now())
        errorInterval = actualMin
        failed = 0
        sleep((okInterval = exponentiate(okInterval)))
      }
    })

if (process.getuid()) {
  error(`Startup failed. Please try again with ${underline('root')} privileges`)
  process.exit(1)
}

info(`Looking up ${process.env.TEST_SITE}\t`)
check()
