# Sharing the family page with the grandparents

The `/family` section is a cut-down view of this dashboard: photos from
Milo's and Arlo's nurseries, photos and videos from their days with Tori,
and a short digest of news from Milo's school. It has its own header and
**no navigation into the rest of the app** — no Finance, no Resources, no
Learning.

Two independent things keep everything else private:

1. **It's a second, separate server process, on its own port.** The
   family view runs as its own instance of the app on port 3001, started
   with `FAMILY_ONLY=1`. That flag makes `middleware.ts` return a plain
   404 for every request that isn't `/family`, `/api/family`, or a Next.js
   build asset — before the request ever reaches a page or API route. So
   even if something on that instance ever linked to `/finance`, there's
   nothing there to follow it to. Your own instance, on port 3000, never
   sets that flag and is unaffected — same app, same data, same
   `npm run build`, just two processes.
2. **Tailscale Serve only ever points at port 3001.** It proxies the
   whole port to your tailnet, but since the family-only process is
   *itself* incapable of serving anything outside `/family`, there's
   nothing to mount or exclude — no per-path proxy rules to get subtly
   wrong (the previous version of this setup mounted just `/family` on
   port 3000 via `--set-path`, which depends on Tailscale Serve's prefix-
   stripping behaviour and varies by version; this replaces that).
3. **`FAMILY_PASSCODE`.** A separate code from the ones in `.env.local`
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
`FINANCE_PASSCODE` and the rest. Restart both servers after editing (see
below).

### 2. Run the app as two real servers, not `npm run dev`

`npm run dev` dies when you close the terminal, and it's slow. Build once,
then start **both** the normal server and the family-only one — they're
the same build, running as two processes on two ports:

```sh
cd ~/Documents/Claude/Finances/life-dashboard-app
npm run build
npm run start           # your own instance — http://localhost:3000, everything
npm run start:family    # grandparents' instance — http://localhost:3001, /family only
```

Run each in its own terminal tab (or see "Keeping it running" below to
have both survive a reboot). `start:family` just runs `next start` with
`FAMILY_ONLY=1` and `-p 3001` — the restriction lives in `middleware.ts`,
not in anything Tailscale does.

### 3. Publish port 3001 on your tailnet

```sh
tailscale serve --bg http://127.0.0.1:3001
```

That's the whole config — no path mounting, because the process on 3001
already can't serve anything but `/family`. Check it with:

```sh
tailscale serve status
```

The URL will be `https://<your-mac>.<your-tailnet>.ts.net/` — visiting
the bare root redirects to `/family` automatically. Port 3000 (your own
instance) is never given to `tailscale serve`, so it isn't reachable over
the tailnet at all — only from the Mac itself (or however you normally
reach `localhost:3000`).

### 4. Share your Mac with your parents

In the [Tailscale admin console](https://login.tailscale.com/admin/machines),
find your Mac → **Share…** → send each of them the share link. They install
Tailscale, sign in with their own account (Google/Microsoft/Apple is
fine — it's free for this), accept the share, and the machine appears on
their device.

They don't get access to anything else on your machine — sharing a node
only exposes what Serve publishes.

### 5. Send them the link and the code

Send `https://<your-mac>.<your-tailnet>.ts.net/` (the bare address —
it redirects to `/family` for them) and the `FAMILY_PASSCODE`. Tell them
to add it to their home screen — on iPhone, Safari → Share → Add to Home
Screen — so it opens like an app.

---

## What they can and can't see

| | |
|---|---|
| ✅ Milo's nursery photos | `/family/milo` |
| ✅ Arlo's nursery photos + the nursery's daily notes | `/family/arlo` |
| ✅ Photos and videos from Tori | `/family/tori` |
| ✅ School dates, this week's lunch menu, recent weekly notes | `/family/gatehouse` |
| ❌ Finance, Resources, Learning, News, Meals, Recipes | 404 on this instance |

That 404 isn't a proxy rule that could be misconfigured — it's the
family-only process itself refusing the request in `middleware.ts`
before any page or data is touched. Try it yourself:
`curl -I http://localhost:3001/finance` should come back 404 once
`start:family` is running.

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

Two processes now, so two LaunchAgents. First,
`~/Library/LaunchAgents/com.linh.lifedashboard.plist` (your own instance,
port 3000 — unchanged from before):

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

Second, `~/Library/LaunchAgents/com.linh.lifedashboard-family.plist` (the
grandparents' instance, port 3001):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.linh.lifedashboard-family</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd ~/Documents/Claude/Finances/life-dashboard-app &amp;&amp; npm run start:family</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/life-dashboard-family.log</string>
  <key>StandardErrorPath</key><string>/tmp/life-dashboard-family.err</string>
</dict>
</plist>
```

Load both:

```sh
launchctl load ~/Library/LaunchAgents/com.linh.lifedashboard.plist
launchctl load ~/Library/LaunchAgents/com.linh.lifedashboard-family.plist
```

Both serve whatever was last built, from the same `.next` build output —
after changing the app, `npm run build` once, then kick-start both:

```sh
launchctl kickstart -k gui/$(id -u)/com.linh.lifedashboard
launchctl kickstart -k gui/$(id -u)/com.linh.lifedashboard-family
```
