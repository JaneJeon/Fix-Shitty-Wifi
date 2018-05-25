require('dotenv').load()
const actualMin = process.env.MIN_INTERVAL / process.env.GROWTH_RATE

let failed = 0,
  errorInterval = actualMin,
  okInterval = actualMin
const DEVICE = `$(networksetup -listallhardwareports | awk '$3=="Wi-Fi" {getline; print $2}')`,
  WIFI = `networksetup -setairportpower ${DEVICE}`,
  LID_CLOSED =
    "ioreg -r -k AppleClamshellState -d 4 | grep AppleClamshellState | awk '{print $4}'",
  SPOOF_MAC =
    // wifi needs to be turned on to change MAC address
    `${WIFI} on && ` +
    // disconnect from any connected network first WITHOUT shutting off the Wi-Fi
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -z && ' +
    `sudo ifconfig ${DEVICE} ether $(openssl rand -hex 6 | sed 's/\\(..\\)/\\1:/g; s/.$//')`,
  { lookup } = require('dns'),
  { execSync } = require('child_process'),
  exec = command =>
    execSync(command)
      .toString()
      .trimRight(),
  { bgWhite, gray, underline } = require('chalk'),
  debug = require('debug'),
  info = debug('wifi:!'),
  error = debug('wifi:✗'),
  ok = debug('wifi:✓'),
  fail = (action, err, msg) =>
    error(
      `${action} failed!\n\t${gray(
        err
          .toString()
          .trimRight()
          .split('\n')
          .pop()
      )}\n\t(${bgWhite(msg)})`
    ),
  now = () => new Date().toLocaleString() + '\t',
  sleep = interval => setTimeout(check, interval * 1000),
  sleepError = () => sleep((errorInterval = exponentiate(errorInterval))),
  exponentiate = interval =>
    Math.min(interval * process.env.GROWTH_RATE, process.env.MAX_INTERVAL),
  restart = msg => {
    try {
      exec(`${WIFI} off && ${WIFI} on`)
    } catch (err) {
      fail('Network restart', err, 'Is this running on a Mac?')
      process.exit(3)
    }

    info(msg + '\t')
    sleepError()
  },
  check = () =>
    lookup(process.env.TEST_SITE, err => {
      if (err) {
        if (err.code != 'ENOTFOUND') {
          fail('Lookup', err, 'Is this test site set up correctly?')
          process.exit(2)
        }

        error(now())
        okInterval = actualMin

        // if the lid is closed, don't do anything!
        try {
          if (exec(LID_CLOSED) == 'Yes') {
            info('Lid closed. Ignoring.\t')
            return sleepError()
          }
        } catch (err) {
          fail('Determining lid state', err, 'Is this running on a Mac?')
          process.exit(3)
        }

        // fail too many times -> spoof MAC
        if (++failed == process.env.MAX_TRIES)
          try {
            exec(SPOOF_MAC)
            restart('MAC address spoofed')
          } catch (err) {
            // this is the one error that is recoverable from, so don't exit
            fail('MAC address spoofing', err, 'Is the Wi-Fi on?')
            sleepError()
          }
        else if (failed > process.env.MAX_TRIES)
          // give up after max number of tries
          sleepError()
        else restart('Network restarted')
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
