require('dotenv').config({path:'.env'});
const actualMin = process.env.MIN_INTERVAL / process.env.GROWTH_RATE

let failed = 0,
  errorInterval = actualMin,
  okInterval = actualMin

const TIMEZONE = "sudo systemsetup -gettimezone | awk '{print $3}'",
  DEVICE = `$(networksetup -listallhardwareports | awk '$3=="Wi-Fi" {getline; print $2}')`,
  WIFI = `networksetup -setairportpower ${DEVICE}`,
  LID_CLOSED =
    "ioreg -r -k AppleClamshellState -d 4 | grep AppleClamshellState | awk '{print $4}'",
  SPOOF_MAC =
    // wifi needs to be turned on to change MAC address
    `${WIFI} on && ` +
    // disconnect from any connected network first WITHOUT shutting off the Wi-Fi
    "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -z && " +
    `sudo ifconfig ${DEVICE} ether $(openssl rand -hex 6 | sed 's/\\(..\\)/\\1:/g; s/.$//')`,
  http = require("http"),
  { execSync } = require("child_process"),
  exec = command =>
    execSync(command)
      .toString()
      .trimRight(),
  { bgWhite, gray, underline } = require("chalk"),
  debug = require("debug"),
  info = debug("wifi:!"),
  error = debug("wifi:✗"),
  ok = debug("wifi:✓"),
  fail = (action, err, msg, code) => {
    error(
      `${action} failed!\n${gray(
        err
          .toString()
          .trimRight()
          .split("\n")
          .pop()
      )}`
    )

    if (msg) error(bgWhite(msg))

    if (code) process.exit(code)
  },
  moment = require("moment-timezone"),
  now = () => {
    try {
      return (
        moment()
          .tz(exec(TIMEZONE))
          .format("MMM Do, h:mm:ss A") + "\t"
      )
    } catch (err) {
      fail("Fetching timezone", err, "Is this running on a Mac?", 3)
    }
  },
  exponentiate = interval =>
    Math.min(interval * process.env.GROWTH_RATE, process.env.MAX_INTERVAL),
  sleep = interval => setTimeout(check, interval * 1000),
  sleepOk = () => sleep((okInterval = exponentiate(okInterval))),
  sleepError = () => sleep((errorInterval = exponentiate(errorInterval))),
  restart = msg => {
    try {
      exec(`${WIFI} off && ${WIFI} on`)
    } catch (err) {
      fail("Network restart", err, "Is this running on a Mac?", 3)
    }

    info(msg + "\t")
    sleepError()
  },
  connected = res => {
    // prevent memory leak
    res.resume()
    res.destroy()

    ok(now())
    errorInterval = actualMin
    failed = 0
    sleepOk()
  },
  disconnected = () => {
    error(now())
    okInterval = actualMin

    // if the lid is closed, don't do anything!
    try {
      if (exec(LID_CLOSED) == "Yes") {
        info("Lid closed. Ignoring\t")
        return sleepError()
      }
    } catch (err) {
      fail("Determining lid state", err, "Is this running on a Mac?", 3)
    }

    // fail too many times -> spoof MAC
    if (++failed == process.env.MAX_TRIES && !process.env.NO_SPOOF)
      try {
        exec(SPOOF_MAC)
        restart("MAC address spoofed")
      } catch (err) {
        // this is the one error that is recoverable from, so don't exit
        fail("MAC address spoofing", err, "Is the Wi-Fi on?")
        sleepError()
      }
    else if (failed > process.env.MAX_TRIES)
      // give up after max number of tries
      sleepError()
    else restart("Network restarted")
  },
  check = () => {
    const req = http.get(process.env.TEST_SITE, connected)

    req.on("error", disconnected)

    setTimeout(() => {
      // the timeout option of http.get() isn't worth a damn when it comes to
      // connections that allow DNS resolve but don't allow any actual connection
      if (!req.finished) disconnected()

      req.abort()
    }, process.env.TIMEOUT * 1000)
  }

if (process.getuid())
  fail("Startup", `${underline("root")} privilege required.`, "", 1)

check()
