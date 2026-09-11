# Sharing the family page with the grandparents

The `/family` section is a cut-down view of this dashboard: photos from
Milo's and Arlo's nurseries, photos and videos from their days with Tori,
and a short digest of news from Milo's school. It has its own header and
**no navigation into the rest of the app** — no Finance, no Resources, no
Learning.

Two independent things keep everything else private:

1. **The proxy only forwards `/family`.** Tailscale Serve is configured
   below to mount three specific paths. A request for `/finance` isn't
   proxied at all, so it never reaches the app.
2. **`FAMILY_PASSCODE`.** A separate code from the ones in `.env.local`
   that unlock Finance and the private galleries. This is the only code
   that leaves the house — never reuse one of the others for it.

---

## One-time setup

### 1. Set the family passcode

In `.env.local`:

```
FAMILY_PASSCODE=284613
```

Change it to whatever you like, but keep it different from
`FINANCE_PASSCODE` and the rest. Restart the app after editing.

### 2. Run the app as a real server, not `npm run dev`

`npm run dev` dies when you close the terminal, and it's slow. Build once
and start the production server:

```sh
cd ~/Documents/Claude/Finances/life-dashboard-app
npm run build
npm run start          # serves on http://localhost:3000
```

To have it survive a reboot, see "Keeping it running" at the bottom.

### 3. Mount the family paths on your tailnet

Tailscale Serve publishes a local port onto your tailnet over HTTPS.
Mount only the paths the family view needs:

```sh
# the pages themselves
tailscale serve --bg --set-path=/family http://127.0.0.1:3000/family

# the photo/video routes those pages call
tailscale serve --bg --set-path=/api/family http://127.0.0.1:3000/api/family

# Next.js's JS/CSS bundles — build output only, no data
tailscale serve --bg --set-path=/_next http://127.0.0.1:3000/_next
```

Then check what's published:

```sh
tailscale serve status
```

You should see the three mounts and nothing else. The URL will be
`https://<your-mac>.<your-tailnet>.ts.net/family`.

> **If `/family` gives a 404 or an unstyled page**, the likely cause is
> path rewriting: some Tailscale versions strip the mount prefix before
> forwarding, some don't. Try the other form for all three lines — e.g.
> `tailscale serve --bg --set-path=/family http://127.0.0.1:3000` — and
> re-check. `tailscale serve reset` clears the config if you want to start
> over.

### 4. Share your Mac with your parents

In the [Tailscale admin console](https://login.tailscale.com/admin/machines),
find your Mac → **Share…** → send each of them the share link. They install
Tailscale, sign in with their own account (Google/Microsoft/Apple is
fine — it's free for this), accept the share, and the machine appears on
their device.

They don't get access to anything else on your machine — sharing a node
only exposes what Serve publishes.

### 5. Send them the link and the code

Send `https://<your-mac>.<your-tailnet>.ts.net/family` and the
`FAMILY_PASSCODE`. Tell them to add it to their home screen — on iPhone,
Safari → Share → Add to Home Screen — so it opens like an app.

---

## What they can and can't see

| | |
|---|---|
| ✅ Milo's nursery photos | `/family/milo` |
| ✅ Arlo's nursery photos + the nursery's daily notes | `/family/arlo` |
| ✅ Photos and videos from Tori | `/family/tori` |
| ✅ School dates, this week's lunch menu, recent weekly notes | `/family/gatehouse` |
| ❌ Finance, Resources, Learning, News, Meals, Recipes | not proxied |

The school digest deliberately drops the source-message citations and
attachment links from your own `/gatehouse-comms` page — they'd lead
nowhere from here, and it's not what grandparents want anyway.

---

## Day to day

- **Nothing to do when you add photos.** The pages read the folders on
  every request, so new photos appear on their next refresh.
- **The Mac has to be awake and running the server.** If it's asleep or
  the server is stopped, they'll get a connection error.
- **To stop sharing:** `tailscale serve reset`, and/or revoke the share in
  the admin console.

## Keeping it running

To have the server start on login and restart if it crashes, create
`~/Library/LaunchAgents/com.linh.lifedashboard.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.linh.lifedashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd ~/Documents/Claude/Finances/life-dashboard-app &amp;&amp; npm run start</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/life-dashboard.log</string>
  <key>StandardErrorPath</key><string>/tmp/life-dashboard.err</string>
</dict>
</plist>
```

Then `launchctl load ~/Library/LaunchAgents/com.linh.lifedashboard.plist`.

Note that this serves whatever was last built — after changing the app,
re-run `npm run build` and
`launchctl kickstart -k gui/$(id -u)/com.linh.lifedashboard`.
