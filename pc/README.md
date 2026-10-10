# Render the videos on your PC

The cloud machine has no graphics card, so a video takes 3–6 hours there. Your PC's RX 6700 XT should do the same
in tens of minutes. The PC is only on for that: one double-click, and it switches itself off when the video is in
Google Drive.

## Once (about 30–40 minutes, mostly downloads)

1. Open **PowerShell** (Start menu, type `PowerShell`) and paste this line, then press Enter:

   ```
   winget install --id Git.Git -e
   ```

2. Close PowerShell, open a new one, and paste these two lines:

   ```
   mkdir C:\DeatAnimation; cd C:\DeatAnimation
   git clone -b claude/whatif-reels https://github.com/Deataaaaa/Deataaaaa.git
   ```

   The first time, a browser window asks you to sign in to GitHub: accept.
   (Keep it in `C:\DeatAnimation`, not in Documents or Desktop: those folders may sync to OneDrive.)

3. Check that **Google Drive for desktop** is running and signed in (it shows a "Google Drive" drive in File Explorer).

4. Double-click **`C:\DeatAnimation\Deataaaaa\pc\SETUP.bat`** and say yes when Windows asks for permission.
   It installs the tools, downloads the 3D people (about 2 GB) and renders one test frame on the graphics card.
   It is done when it says `SETUP DONE`. If it stops with an error, send a photo of the window in the chat.

## Every video

When I tell you a video is ready to render, double-click **`C:\DeatAnimation\Deataaaaa\pc\RENDER.bat`**.

- It asks whether to shut the PC down at the end (yes after 20 seconds), downloads my latest version, renders the
  video on the graphics card, checks it, and puts it in **Google Drive › DeatAnimation**.
- On your iPhone, open the Google Drive app › DeatAnimation › the video › ⋯ › Send a copy › Save video.
- The same folder gets a contact sheet, the checks and the log, so I can review everything from here.
