# Fix Shitty Wifi (for macOS)
Fixes various troublesome wifi connections that show any of the following behaviour: 
- disconnect randomly (spotty/intermittently dropping connection)
- silently cuts you off from the rest of the internet even though the wifi is still connected (*cough* comcast *cough*)
- forces you to sign in every X minutes (think airport wifi)

## Sample Usage
`sudo node --expose-gc index.js` to start, `.env` for configuration.

<p align='center'>
  <img src='screenshot.png' width='65%'>
</p>

### Why do I need the `sudo`?
To fix troublesome behaviour #3, the program needs to spoof the computer's `MAC address`. To do that, it needs `sudo` access. Thus, you will need to start this program as a root user, but once it's running, you do not need to input password any more.
