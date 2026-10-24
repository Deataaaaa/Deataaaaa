# Render the videos on your PC

The cloud machine has no graphics card, so a video takes 3–6 hours there. Your PC's RX 6700 XT should do the same
in a few minutes. The PC is only on for that: one double-click, and it can switch itself off when the video is ready.

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

3. Double-click **`C:\DeatAnimation\Deataaaaa\pc\SETUP.bat`** and say yes when Windows asks for permission.
   It installs the tools, downloads the 3D people (about 2 GB) and renders one test frame on the graphics card.
   It is done when it says `SETUP DONE`. If it stops with an error, send a photo of the window in the chat.

## Every video

When I tell you a video is ready to render, double-click **`C:\DeatAnimation\Deataaaaa\pc\RENDER.bat`**.

- It asks whether to shut the PC down at the end (yes after 20 seconds), downloads my latest version, deletes the
  last run's videos and frames (so the folder never piles up), renders on the graphics card with a live progress bar
  (percent, frames per second, time left, GPU/CPU use), checks every frame, encodes, and opens the `videos` folder
  with the new `<name>_phone.mp4` selected.
- Copy that file to your phone the way you like. Play it from Photos with the volume up.
- If it says NO VIDEO or shows warnings, send me `studio\out\pc_render_log.txt` (or paste its end in the chat).
