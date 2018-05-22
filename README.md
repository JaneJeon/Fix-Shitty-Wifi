# Fix Shitty Wifi (for macOS)
Fixes various troublesome wifi connections that show any of the following behaviour: 
- disconnect randomly (just bad connection)
- silently cuts you off from the rest of the internet even though the wifi is still connected (*cough* comcast *cough*)
- forces you to sign in every X minutes (think airport wifi)

### A word about spoofing MAC address
To fix troublesome behaviour #3, the program needs to run a command that needs `sudo` access. Thus, it will ask you for your password every time it is necessary to bypass that behaviour (most airports force you to reconnect after 30-45 minutes).