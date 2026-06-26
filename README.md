# YT Voice

Control YouTube with your voice. When your hands are busy — cooking, eating,
exercising, holding a baby, lying across the room — just **speak** to your laptop:

> "pause" · "skip forward 30 seconds" · "1.5x speed" · "turn on captions" · "louder"

It works only on YouTube video pages (`youtube.com/watch?v=...`) in the Chrome
web browser on a computer (not on phones or TVs).

---

# Setup guide (for everyone — no coding needed)

This is a one-time setup. It takes about **15 minutes**. You will:

- A) install a free helper tool called Node.js,
- B) create a **free** ElevenLabs account (the service that listens to your voice),
- C) run two short commands to build the extension and create your personal voice "agent",
- D) load the extension into Chrome and turn on the microphone.

You only do A–C once. After that, using it is just opening YouTube and talking.

> **What you'll need:** the Google Chrome browser, a working microphone, an email
> address, and about 15 minutes. Everything here is free.

---

## Step 1 — Install Node.js (the helper tool)

Node.js lets your computer run the small program that sets everything up.

1. Go to **https://nodejs.org**.
2. Click the big button that says **"LTS"** (it means the stable version).
3. Open the file you downloaded and click **Next / Continue / Install** until it finishes (the default options are fine).
4. That's it — you won't see an app open. Node.js works behind the scenes.

---

## Step 2 — Get this project onto your computer

If someone gave you a link to the project page (for example on GitHub):

1. On that page, click the green **"Code"** button → **"Download ZIP"**.
2. Find the downloaded **`.zip`** file (usually in your **Downloads** folder) and
   **double-click it** to unzip it. You'll get a folder named something like
   **`yt-voice-extension`**.
3. Move that folder somewhere easy to find, like your **Desktop**. Remember where it is — you'll need it in the next step.

---

## Step 3 — Get your ElevenLabs API key

The "API key" is a private password that lets the setup program create your
personal voice agent. You use it once; it is **never** saved into the extension.

1. Go to **https://elevenlabs.io** and click **Sign up**. Create a free account.
2. After logging in, look at the **bottom-left corner** and click your account
   name / icon, then choose **"API Keys"**.
3. Click **"Create API Key"**, give it any name (e.g. "yt-voice"), and click create.
4. A long code starting with **`sk_`** appears. Click **Copy**.
   - ⚠️ This code is shown **only once**. Paste it somewhere safe for the next
     step (a temporary note). Treat it like a password — don't share it.

---

## Step 4 — Open the Terminal inside the project folder

The "Terminal" is a window where you type commands. Here's the easy way to open it
already pointing at your project folder:

**On a Mac:**
1. Press **Cmd + Space**, type **Terminal**, press **Enter**. A window opens.
2. In that window type `cd ` (the letters c, d, then a **space**).
3. Now **drag the `yt-voice-extension` folder** from Finder and **drop it onto the
   Terminal window**. It pastes the location for you.
4. Press **Enter**. You are now "inside" the folder.

**On Windows:**
1. Open the **`yt-voice-extension`** folder in File Explorer.
2. Click the **address bar** at the top, type **`powershell`**, and press **Enter**.
   A blue window opens, already inside the folder.

> **Important:** all commands below must be run from the folder that contains the
> file named `package.json`. If a command later says
> *"Could not read package.json"*, you opened the Terminal one folder too high —
> see **Troubleshooting → "Could not read package.json"** at the bottom.

---

## Step 5 — Install and create your voice agent

In that same Terminal window, type these commands one at a time, pressing **Enter**
after each and waiting for it to finish.

**1. Install the pieces it needs** (this can take a minute or two):

```bash
npm install
```

**2. Build the extension *and* create your personal voice agent — in one command.**
Replace `sk_your_key_here` with the `sk_...` key you copied in Step 3:

- **On a Mac:**
  ```bash
  ELEVENLABS_API_KEY=sk_your_key_here npm run quickstart
  ```
- **On Windows (PowerShell):**
  ```powershell
  $env:ELEVENLABS_API_KEY="sk_your_key_here"; npm run quickstart
  ```

`quickstart` builds the `dist/` folder (Step 6) and creates your agent in one go,
so once it finishes you can skip straight to **Step 7**. (Prefer to do the two
parts separately? Run `npm run setup` to create the agent and `npm run build` to
build — in either order.)

When it finishes you'll see something like:

```
✓ created tool: tool_xxxxxxxx
✓ created agent: agent_xxxxxxxx
✓ verified PUBLIC — the agent accepts connections by ID.

Next steps:
  1. Open the YT Voice popup and paste this Agent ID:
       agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

👉 **Copy that `agent_...` line and keep it** — you'll paste it into the extension
in Step 8.

---

## Step 6 — Build the extension *(skip this if you ran `npm run quickstart` in Step 5)*

`npm run quickstart` already built the `dist/` folder, so you can go to Step 7.
Only if you ran `npm run setup` on its own, build it now in the Terminal:

```bash
npm run build
```

When it finishes, a new folder named **`dist`** appears inside your project folder.
That `dist` folder **is** the extension. Leave the Terminal open in case you need it.

---

## Step 7 — Load the extension into Chrome

1. Open **Google Chrome**.
2. In the address bar, type **`chrome://extensions`** and press **Enter**.
3. In the **top-right** of that page, turn **ON** the switch labelled **"Developer mode"**.
4. Three buttons appear at the top-left. Click **"Load unpacked"**.
5. A file picker opens. Navigate into your project folder, select the **`dist`**
   folder, and click **Select / Open**.
6. **"YT Voice"** now appears in your list of extensions. ✅

**Pin it so you can find it:**
1. Click the **puzzle-piece icon** 🧩 near the top-right of Chrome.
2. Find **YT Voice** in the list and click the **pin** icon next to it.
3. A small **YT Voice** icon now sits in your toolbar.

---

## Step 8 — Tell the extension your Agent ID

1. Click the **YT Voice icon** in your toolbar. A small window (the "popup") opens.
2. Find the box labelled **"ElevenLabs Agent ID"**.
3. Paste the **`agent_...`** value from Step 5 into that box.
4. The yellow warning message disappears once the ID is valid. You can close the popup.

---

## Step 9 — Allow the microphone (read this carefully)

The extension needs permission to hear you. This is the step people most often get
wrong, so go slowly:

1. Click the **YT Voice icon** to open the popup again.
2. Click the **"Grant microphone"** button. A **new tab** opens.
3. Chrome shows a small permission box near the **top-left**, just under the
   address bar, asking to use your microphone.
4. Click **"Allow"**.
   - ⚠️ **Do not** press Escape, click somewhere else, or close that box. If you do,
     it counts as "dismissed" and the microphone stays off. You must click the
     actual **Allow** button.
5. The page turns green and says **"Microphone granted."** You can close that tab.

Once allowed, Chrome remembers it — you won't have to do this again.

---

## Step 10 — Use it!

1. Open any YouTube video page (a normal `youtube.com/watch?...` page).
2. Look at the **bottom-right corner** of the video page for a small round dot
   (the "orb"). It shows the status:
   - **`◌`** = connecting
   - **`◉`** = listening — ready for your voice ✅
   - **`!` (red)** = something's wrong (see Troubleshooting)
3. When you see the listening dot, just talk:

> "pause" · "play" · "skip forward 10 seconds" · "go back 30" · "jump to 2 minutes" ·
> "1.5x speed" · "normal speed" · "louder" · "quieter" · "mute" · "captions on" ·
> "captions off"

It won't talk back — it just does what you say, quietly.

---

# Troubleshooting

**Tip:** hover your mouse over the red **`!`** orb (don't click) — a little tooltip
shows the exact problem. Match it below.

### The orb is red and says "Set your ElevenLabs Agent ID"
You haven't pasted your Agent ID yet. Do **Step 8**. Make sure you pasted the whole
`agent_...` value with no extra spaces.

### The orb is red and says "failed to connect" (auth / unauthorized)
Your voice agent isn't set to public. Re-run the setup command from **Step 5** — it
now checks this automatically and prints **"✓ verified PUBLIC"**. Use the **new**
`agent_...` it gives you (paste it in Step 8). If it instead prints a warning that it
*couldn't* confirm public, open the agent at **elevenlabs.io → Conversational AI →
Agents → your agent → Security/Advanced** and turn **OFF "Enable authentication"**.

### The orb is red and says "permission dismissed" (or mentions the microphone)
The microphone wasn't allowed. Redo **Step 9** and be sure to click the **Allow**
button. If no permission box appears anymore (Chrome stopped asking because it was
dismissed before):
- In the permission tab, click the small **icon at the left of the address bar**
  (a camera or sliders icon) → set **Microphone → Allow** → reload that tab; **or**
- Open **`chrome://settings/content/microphone`** and remove the extension from the
  "Not allowed" list, then redo Step 9.

### I don't see any popup
The popup never opens on its own. You open it by **clicking the YT Voice icon** in
the toolbar (pin it first via the puzzle-piece 🧩 if you can't see it). See Step 7.

### "Could not read package.json"
Your Terminal is pointed at the wrong folder. The commands must run from the folder
that **contains `package.json`**. Redo **Step 4** (drag the correct
`yt-voice-extension` folder onto the Terminal after typing `cd `), then try again.

### Nothing happens / I changed something and want a fresh start
Re-run `npm run build`, then on the `chrome://extensions` page click the **circular
reload arrow** on the YT Voice card, and reload your YouTube tab.

---

# Privacy & cost

- **Your microphone audio** is sent to ElevenLabs only to understand your command.
  This extension does not record or store your audio.
- **Your API key** is used once, on your own computer, during Step 5. It is never
  put inside the extension and never leaves your machine.
- **Cost:** ElevenLabs has a free tier. Your voice agent is usable by anyone who
  knows its ID, so keep the `agent_...` value private and, to be safe, set a
  **monthly usage limit** on the agent in the ElevenLabs dashboard.

---

# Known limitations

- **Placeholder icons.** The extension's icon images are blank placeholders; this
  doesn't affect how it works.

---

# For developers

```bash
npm run dev      # live-reloading dev build (load the dist/ folder it creates)
npm run build    # production build into dist/
npm run package  # build + zip to dist/yt-voice.zip (Chrome Web Store upload)
npm test         # run the test suite
npm run setup    # create your ElevenLabs tool + public agent (needs ELEVENLABS_API_KEY)
```

See `docs/SETUP.md` for the manual (dashboard) way to create the agent and more
troubleshooting. The "bring your own public agent" setup above needs no server —
the extension is fully serverless. Architecture notes for contributors live in
`CLAUDE.md`.

Before any Chrome Web Store submission, run `docs/manual-e2e-checklist.md` against a
real YouTube watch page.
