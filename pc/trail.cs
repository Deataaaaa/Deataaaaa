// DeatAnimation Render Engine v3: the mouse trail (owner, 4 Nov 2026: "track my mouse so that when it moves in the cmd window a
// stream of random characters flows from it, changing colour like a rainbow, with gravity, very realistic and aesthetic").
// A background thread reads the console's input records (mouse moves and keys), throws characters from the pointer with its
// speed, lets them fall under gravity with air drag, bounce on the bottom of the window and settle, then fade into smaller
// glyphs and vanish. Characters are only drawn on blank cells (they pass behind the text, so the UI's colours are never
// touched) through the cell API, which does not move the cursor the main thread writes at. Keys pressed while it runs are
// queued for the script (KeyAvailable / ReadKey). C# 5 (Windows PowerShell 5.1's compiler), ASCII only.
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

namespace DA {
public static class Trail {
  [StructLayout(LayoutKind.Sequential)] struct COORD { public short X, Y; public COORD(int x, int y) { X = (short)x; Y = (short)y; } }
  [StructLayout(LayoutKind.Sequential)] struct SMALL_RECT { public short Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] struct CSBI { public COORD Size, Cursor; public ushort Attr; public SMALL_RECT Win; public COORD Max; }
  [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)] struct INPUT_RECORD {
    [FieldOffset(0)] public ushort EventType;
    // KEY_EVENT_RECORD
    [FieldOffset(4)] public int KeyDown; [FieldOffset(8)] public ushort Repeat; [FieldOffset(10)] public ushort VKey; [FieldOffset(12)] public ushort VScan;
    [FieldOffset(14)] public char Char; [FieldOffset(16)] public uint KeyState;
    // MOUSE_EVENT_RECORD
    [FieldOffset(4)] public COORD MousePos; [FieldOffset(8)] public uint Buttons; [FieldOffset(12)] public uint MState; [FieldOffset(16)] public uint MFlags;
  }
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int h);
  [DllImport("kernel32.dll")] static extern bool GetConsoleMode(IntPtr h, out uint m);
  [DllImport("kernel32.dll")] static extern bool SetConsoleMode(IntPtr h, uint m);
  [DllImport("kernel32.dll")] static extern bool GetNumberOfConsoleInputEvents(IntPtr h, out uint n);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool ReadConsoleInputW(IntPtr h, [Out] INPUT_RECORD[] b, uint len, out uint n);
  [DllImport("kernel32.dll")] static extern bool GetConsoleScreenBufferInfo(IntPtr h, out CSBI i);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool ReadConsoleOutputCharacterW(IntPtr h, [Out] char[] c, uint len, COORD at, out uint n);
  [DllImport("kernel32.dll")] static extern bool ReadConsoleOutputAttribute(IntPtr h, [Out] ushort[] a, uint len, COORD at, out uint n);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool WriteConsoleOutputCharacterW(IntPtr h, char[] c, uint len, COORD at, out uint n);
  [DllImport("kernel32.dll")] static extern bool WriteConsoleOutputAttribute(IntPtr h, ushort[] a, uint len, COORD at, out uint n);

  class P { public double x, y, vx, vy, age, life, hue; public char ch; public int bounces; public bool rest; }
  struct Cell { public char ch; public ushort attr; }

  static IntPtr hIn, hOut; static Thread th; static volatile bool run; static uint mode; static int tick;
  static readonly object keyLock = new object();
  static readonly Queue<ConsoleKeyInfo> keys = new Queue<ConsoleKeyInfo>();
  static readonly List<P> ps = new List<P>();
  static readonly Dictionary<int, Cell> drawn = new Dictionary<int, Cell>();   // cell key -> what we drew there
  static readonly Random rnd = new Random();
  static double lastX = -1, lastY = -1, lastT = 0, mvx = 0, mvy = 0;
  // the look, set from pc\theme.json by ui.ps1
  public static double Gravity = 38.0;      // cells per second squared (cells are ~2x taller than wide: x speeds are doubled)
  public static double Density = 2.2;       // characters thrown per cell the pointer travels
  public static double Life = 2.6;          // seconds before a character has faded out
  public static int Max = 420;
  public static string Glyphs = "01<>/\\|*+#%&$@?!~^=:;{}[]()ABCDEFXYZ";
  public static string Fade = "*+:.";
  public static bool Running { get { return run; } }

  // the 16 console colours, bright ones, in rainbow order: red, yellow, green, cyan, blue, magenta (+ white sparks)
  static readonly ushort[] RAINBOW = { 12, 14, 10, 11, 9, 13 };

  public static bool Start() {
    try {
      hIn = GetStdHandle(-10); hOut = GetStdHandle(-11);
      uint m; if (!GetConsoleMode(hIn, out m)) return false;
      // mouse input on, QuickEdit off (a click would freeze the render), extended flags on, VT input off (records, not escape codes)
      m = (m | 0x0010u | 0x0080u) & ~0x0040u & ~0x0200u; mode = m;
      if (!SetConsoleMode(hIn, m)) return false;
      run = true; th = new Thread(Loop); th.IsBackground = true; th.Start();
      return true;
    } catch { return false; }
  }
  public static void Stop() { run = false; if (th != null) th.Join(500); ClearAll(); }

  public static bool KeyAvailable() { lock (keyLock) return keys.Count > 0; }
  public static ConsoleKeyInfo ReadKey() {
    while (true) { lock (keyLock) { if (keys.Count > 0) return keys.Dequeue(); } Thread.Sleep(20); }
  }

  static int Key(int x, int y) { return y * 4096 + x; }

  static void Loop() {
    var buf = new INPUT_RECORD[64]; var sw = System.Diagnostics.Stopwatch.StartNew(); double prev = 0;
    while (run) {
      try {
        uint n;
        if (GetNumberOfConsoleInputEvents(hIn, out n) && n > 0 && ReadConsoleInputW(hIn, buf, (uint)buf.Length, out n)) {
          for (int i = 0; i < n; i++) {
            if (buf[i].EventType == 2) Mouse(buf[i].MousePos.X, buf[i].MousePos.Y, sw.Elapsed.TotalSeconds);
            else if (buf[i].EventType == 1 && buf[i].KeyDown != 0) {
              bool sh = (buf[i].KeyState & 0x10) != 0, alt = (buf[i].KeyState & 0x3) != 0, ctl = (buf[i].KeyState & 0xC) != 0;
              lock (keyLock) keys.Enqueue(new ConsoleKeyInfo(buf[i].Char, (ConsoleKey)buf[i].VKey, sh, alt, ctl));
            }
          }
        }
        // a child program (git, python, ffmpeg) may have changed the input mode: put mouse input back about once a second
        if (++tick % 60 == 0) { uint cur; if (GetConsoleMode(hIn, out cur) && cur != mode) SetConsoleMode(hIn, mode); }
        double t = sw.Elapsed.TotalSeconds, dt = Math.Min(0.05, t - prev); prev = t;
        Step(dt, t); Draw();
      } catch { }
      Thread.Sleep(16);
    }
  }

  static void Mouse(int x, int y, double t) {
    double fx = x + 0.5, fy = y + 0.5;
    if (lastX < 0) { lastX = fx; lastY = fy; lastT = t; return; }
    double dx = fx - lastX, dy = fy - lastY, d = Math.Sqrt(dx * dx * 0.25 + dy * dy), dtm = Math.Max(0.008, t - lastT);
    mvx = mvx * 0.5 + 0.5 * (dx / dtm); mvy = mvy * 0.5 + 0.5 * (dy / dtm);
    double want = d * Density; int k = (int)Math.Min(40, Math.Floor(want) + (rnd.NextDouble() < want - Math.Floor(want) ? 1 : 0));
    for (int i = 0; i < k && ps.Count < Max; i++) {
      double f = (i + rnd.NextDouble()) / Math.Max(1, k);
      var p = new P();
      p.x = lastX + dx * f; p.y = lastY + dy * f;
      // thrown with a share of the pointer's speed, a little sideways spray and a small upward kick
      p.vx = mvx * 0.18 + (rnd.NextDouble() - 0.5) * 9.0; p.vy = mvy * 0.18 - 3.0 - rnd.NextDouble() * 5.0;
      p.life = Life * (0.7 + 0.6 * rnd.NextDouble()); p.hue = t * 1.6 + f * 0.8;
      p.ch = Glyphs[rnd.Next(Glyphs.Length)];
      ps.Add(p);
    }
    lastX = fx; lastY = fy; lastT = t;
  }

  static void Step(double dt, double t) {
    CSBI ci; if (!GetConsoleScreenBufferInfo(hOut, out ci)) return;
    double left = ci.Win.Left, right = ci.Win.Right + 0.999, bottom = ci.Win.Bottom + 0.999, top = ci.Win.Top;
    for (int i = ps.Count - 1; i >= 0; i--) {
      var p = ps[i]; p.age += dt;
      if (p.age > p.life || p.y < top - 30) { ps.RemoveAt(i); continue; }
      if (!p.rest) {
        p.vy += Gravity * dt;
        double drag = Math.Exp(-1.1 * dt); p.vx *= drag; p.vy *= Math.Exp(-0.25 * dt);   // air: sideways speed dies faster
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < left) { p.x = left; p.vx = -p.vx * 0.5; }
        if (p.x > right) { p.x = right; p.vx = -p.vx * 0.5; }
        if (p.y > bottom) {
          p.y = bottom; p.bounces++;
          if (Math.Abs(p.vy) < 4 || p.bounces > 3) { p.vy = 0; p.rest = true; } else { p.vy = -p.vy * 0.42; p.vx *= 0.7; }
        }
      }
      // a character tumbles through the glyphs now and then while it falls
      if (!p.rest && rnd.NextDouble() < dt * 6) p.ch = Glyphs[rnd.Next(Glyphs.Length)];
    }
  }

  static void Draw() {
    var want = new Dictionary<int, Cell>(); var pos = new Dictionary<int, COORD>();
    foreach (var p in ps) {
      int x = (int)Math.Floor(p.x), y = (int)Math.Floor(p.y); int k = Key(x, y);
      double fade = p.age / p.life; char ch = p.ch;
      if (fade > 0.6) ch = Fade[Math.Min(Fade.Length - 1, (int)((fade - 0.6) / 0.4 * Fade.Length))];
      ushort a = RAINBOW[(int)Math.Floor((p.hue + p.age * 2.2) * 2.0) % RAINBOW.Length];
      if (p.age < 0.08) a = 15;                                       // a white spark as it leaves the pointer
      if (fade > 0.85) a = (ushort)(a & 0x07);                          // the last moments in the dim colour
      var c = new Cell(); c.ch = ch; c.attr = a; want[k] = c; pos[k] = new COORD(x, y);
    }
    var ch1 = new char[1]; var at1 = new ushort[1]; uint n;
    // cells we no longer want: blank them again, if they still hold what we drew (the script may have written there since)
    var gone = new List<int>();
    foreach (var kv in drawn) if (!want.ContainsKey(kv.Key)) gone.Add(kv.Key);
    foreach (int k in gone) {
      var at = new COORD(k % 4096, k / 4096);
      if (ReadConsoleOutputCharacterW(hOut, ch1, 1, at, out n) && ch1[0] == drawn[k].ch) {
        ch1[0] = ' '; WriteConsoleOutputCharacterW(hOut, ch1, 1, at, out n);
        at1[0] = 7; WriteConsoleOutputAttribute(hOut, at1, 1, at, out n);
      }
      drawn.Remove(k);
    }
    // new and moving cells: only blank ones (or ones that still hold our own character)
    foreach (var kv in want) {
      var at = pos[kv.Key];
      if (at.X < 0 || at.Y < 0) continue;
      if (!ReadConsoleOutputCharacterW(hOut, ch1, 1, at, out n) || n == 0) continue;
      Cell mine; bool ours = drawn.TryGetValue(kv.Key, out mine) && ch1[0] == mine.ch;
      if (ch1[0] != ' ' && !ours) { drawn.Remove(kv.Key); continue; }            // text there: the character passes behind it
      ReadConsoleOutputAttribute(hOut, at1, 1, at, out n);
      if (!ours && (at1[0] & 0xF0) != 0) continue;                                 // a coloured background (a bar, a tag): leave it
      ch1[0] = kv.Value.ch; WriteConsoleOutputCharacterW(hOut, ch1, 1, at, out n);
      at1[0] = kv.Value.attr; WriteConsoleOutputAttribute(hOut, at1, 1, at, out n);
      drawn[kv.Key] = kv.Value;
    }
  }

  static void ClearAll() {
    var ch1 = new char[1]; var at1 = new ushort[1]; uint n;
    foreach (var kv in drawn) {
      var at = new COORD(kv.Key % 4096, kv.Key / 4096);
      if (ReadConsoleOutputCharacterW(hOut, ch1, 1, at, out n) && ch1[0] == kv.Value.ch) { ch1[0] = ' '; WriteConsoleOutputCharacterW(hOut, ch1, 1, at, out n); at1[0] = 7; WriteConsoleOutputAttribute(hOut, at1, 1, at, out n); }
    }
    drawn.Clear(); ps.Clear();
  }
}
}
