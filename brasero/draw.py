# -*- coding: utf-8 -*-
"""Moteur de tracé — planches A3 style dessin technique ISO."""
import html as _h
from math import cos, sin, pi, sqrt, atan2, degrees, radians

W, H = 1680.0, 1188.0          # A3 paysage : 420 x 297 mm, 4 unites / mm
FR = (36.0, 26.0, 1644.0, 1162.0)   # cadre exterieur
IN = (58.0, 48.0, 1622.0, 1140.0)   # cadre interieur (bande de zones)


def e(t):
    return _h.escape(str(t), quote=False)


class Sheet:
    def __init__(self, code, step, title, lead, notes=None, note_title=None,
                 nomen=None, tag=None):
        self.code = code
        self.step = step
        self.title = title
        self.lead = lead
        self.notes = notes or []
        self.note_title = note_title or "INSTRUCTIONS AU SOUDEUR"
        self.nomen = nomen or []      # (rep, designation, qte, matiere)
        self.tag = tag
        self.b = []

    # --- primitives (unites planche) -------------------------------------
    def raw(self, s):
        self.b.append(s)

    def ln(self, x1, y1, x2, y2, c="o"):
        self.b.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" class="{c}"/>')

    def rc(self, x, y, w, h, c="o", rx=0):
        self.b.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" class="{c}"/>')

    def cr(self, x, y, r, c="o"):
        self.b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" class="{c}"/>')

    def pg(self, pts, c="o"):
        d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.b.append(f'<polygon points="{d}" class="{c}"/>')

    def pl(self, pts, c="o"):
        d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.b.append(f'<polyline points="{d}" class="{c}"/>')

    def tx(self, x, y, s, c="lbl", a="middle", size=13, rot=None, w=None):
        tr = f' transform="rotate({rot} {x:.1f} {y:.1f})"' if rot else ""
        ww = f' font-weight="{w}"' if w else ""
        self.b.append(
            f'<text x="{x:.1f}" y="{y:.1f}" class="{c}" text-anchor="{a}" '
            f'font-size="{size}"{ww}{tr}>{e(s)}</text>')

    def arrow(self, x, y, ang, l=13.0, w=4.4, c="fill"):
        x2, y2 = x - l * cos(ang), y - l * sin(ang)
        px, py = w * sin(ang), -w * cos(ang)
        self.pg([(x, y), (x2 + px, y2 + py), (x2 - px, y2 - py)], c)

    # --- vues --------------------------------------------------------------
    def view(self, ox, oy, s, title=None, tsub=None, tx_off=0):
        v = View(self, ox, oy, s)
        if title:
            v.head = (title, tsub, tx_off)
        return v


class View:
    """Repere local en mm. ox,oy = position (unites planche) du point (0,0) mm."""

    def __init__(self, sh, ox, oy, s):
        self.sh, self.ox, self.oy, self.s = sh, ox, oy, s

    def X(self, x):
        return self.ox + x * self.s

    def Y(self, y):
        return self.oy + y * self.s

    def P(self, x, y):
        return (self.ox + x * self.s, self.oy + y * self.s)

    # --- geometrie en mm ---------------------------------------------------
    def line(self, x1, y1, x2, y2, c="o"):
        self.sh.ln(self.X(x1), self.Y(y1), self.X(x2), self.Y(y2), c)

    def rect(self, x, y, w, h, c="o"):
        self.sh.rc(self.X(x), self.Y(y), w * self.s, h * self.s, c)

    def circle(self, x, y, r, c="o"):
        self.sh.cr(self.X(x), self.Y(y), r * self.s, c)

    def poly(self, pts, c="o"):
        self.sh.pg([self.P(*p) for p in pts], c)

    def plyl(self, pts, c="o"):
        self.sh.pl([self.P(*p) for p in pts], c)

    def text(self, x, y, s, c="lbl", a="middle", size=13, rot=None, w=None, dx=0, dy=0):
        self.sh.tx(self.X(x) + dx, self.Y(y) + dy, s, c, a, size, rot, w)

    # --- cotation ----------------------------------------------------------
    def dimh(self, x1, x2, y, label, off=34, ext=6, out=False, up=True,
             c="d", size=13, tdy=None):
        """Cote horizontale. y = ligne de reference (mm), off = deport (unites)."""
        sg = -1 if up else 1
        X1, X2, Y0 = self.X(x1), self.X(x2), self.Y(y)
        Yd = Y0 + sg * off
        self.sh.ln(X1, Y0 + sg * 3, X1, Yd + sg * ext, "ext")
        self.sh.ln(X2, Y0 + sg * 3, X2, Yd + sg * ext, "ext")
        span = abs(X2 - X1)
        if out or span < 46:
            self.sh.ln(X1 - 30, Yd, X2 + 30, Yd, c)
            self.sh.arrow(X1, Yd, 0.0)
            self.sh.arrow(X2, Yd, pi)
        else:
            self.sh.ln(X1, Yd, X2, Yd, c)
            self.sh.arrow(X1, Yd, pi)
            self.sh.arrow(X2, Yd, 0.0)
        ty = Yd - 7 if up else Yd + 15
        if tdy is not None:
            ty = Yd + tdy
        self.sh.tx((X1 + X2) / 2, ty, label, "dimt", "middle", size)

    def dimv(self, y1, y2, x, label, off=34, ext=6, out=False, left=True,
             c="d", size=13):
        sg = -1 if left else 1
        Y1, Y2, X0 = self.Y(y1), self.Y(y2), self.X(x)
        Xd = X0 + sg * off
        self.sh.ln(X0 + sg * 3, Y1, Xd + sg * ext, Y1, "ext")
        self.sh.ln(X0 + sg * 3, Y2, Xd + sg * ext, Y2, "ext")
        span = abs(Y2 - Y1)
        if out or span < 46:
            self.sh.ln(Xd, Y1 - 30, Xd, Y2 + 30, c)
            self.sh.arrow(Xd, Y1, pi / 2)
            self.sh.arrow(Xd, Y2, -pi / 2)
        else:
            self.sh.ln(Xd, Y1, Xd, Y2, c)
            self.sh.arrow(Xd, Y1, -pi / 2)
            self.sh.arrow(Xd, Y2, pi / 2)
        self.sh.tx(Xd - 7, (Y1 + Y2) / 2, label, "dimt", "middle", size,
                   rot=-90)

    def dimr(self, x1, y1, x2, y2, label, off=26, size=12):
        """Cote alignee (oblique)."""
        X1, Y1 = self.P(x1, y1)
        X2, Y2 = self.P(x2, y2)
        a = atan2(Y2 - Y1, X2 - X1)
        nx, ny = sin(a), -cos(a)
        A = (X1 + nx * off, Y1 + ny * off)
        B = (X2 + nx * off, Y2 + ny * off)
        self.sh.ln(X1, Y1, A[0], A[1], "ext")
        self.sh.ln(X2, Y2, B[0], B[1], "ext")
        self.sh.ln(A[0], A[1], B[0], B[1], "d")
        self.sh.arrow(A[0], A[1], a + pi)
        self.sh.arrow(B[0], B[1], a)
        da = degrees(a)
        if da > 90 or da < -90:
            da += 180
        mx, my = (A[0] + B[0]) / 2 + nx * 9, (A[1] + B[1]) / 2 + ny * 9
        self.sh.tx(mx, my, label, "dimt", "middle", size, rot=round(da, 1))

    # --- reperes / annotations --------------------------------------------
    def ball(self, bx, by, label, tx_, ty_, r=17, c="ball"):
        BX, BY = self.P(bx, by)
        TX, TY = self.P(tx_, ty_)
        a = atan2(TY - BY, TX - BX)
        self.sh.ln(BX + r * cos(a), BY + r * sin(a), TX, TY, "lead")
        self.sh.cr(TX, TY, 3.4, "fill")
        self.sh.cr(BX, BY, r, c)
        self.sh.tx(BX, BY + 5.5, label, "balt", "middle", 15, w=700)

    def note(self, x, y, tx_, ty_, label, a="start", size=12.5, c="ann"):
        X, Y = self.P(x, y)
        TX, TY = self.P(tx_, ty_)
        self.sh.ln(X, Y, TX, TY, "lead")
        self.sh.cr(TX, TY, 3.2, "fill")
        dx = 6 if a == "start" else (-6 if a == "end" else 0)
        self.sh.tx(X + dx, Y + 4.5, label, c, a, size)

    def weld(self, x, y, ax, ay, size="a4", sym="fillet", side="up",
             around=False, tail="", flip=False):
        """Symbole de soudure ISO 2553 : fleche sur le joint, ligne de reference."""
        JX, JY = self.P(x, y)
        EX, EY = self.P(ax, ay)
        d = 118 if not flip else -118
        self.sh.ln(JX, JY, EX, EY, "wl")
        self.sh.arrow(JX, JY, atan2(JY - EY, JX - EX), 12, 4.2, "wf")
        self.sh.ln(EX, EY, EX + d, EY, "wl")
        # triangle de soudure d'angle
        sg = -1 if side == "up" else 1
        bx = EX + (34 if not flip else -34) * 1.0
        tw, th = 15.0, 15.0
        if sym == "fillet":
            self.sh.pg([(bx, EY), (bx + tw, EY), (bx, EY + sg * th)], "wf")
        elif sym == "square":
            self.sh.ln(bx + 4, EY + sg * 2, bx + 4, EY + sg * th, "wl")
            self.sh.ln(bx + 13, EY + sg * 2, bx + 13, EY + sg * th, "wl")
        if size:
            self.sh.tx(bx - 5, EY + (sg * 4 if sg < 0 else 15), size, "wt", "end", 13)
        if around:
            self.sh.cr(EX, EY, 7.5, "wc")
        if tail:
            tx0 = EX + d
            self.sh.ln(tx0, EY, tx0 - sg * 0, EY, "wl")
            self.sh.tx(tx0 + (5 if not flip else -5), EY - 6,
                       tail, "wt", "start" if not flip else "end", 12)

    def cl_h(self, x1, x2, y):
        self.sh.ln(self.X(x1), self.Y(y), self.X(x2), self.Y(y), "cl")

    def cl_v(self, y1, y2, x):
        self.sh.ln(self.X(x), self.Y(y1), self.X(x), self.Y(y2), "cl")

    def title(self, x, dy, t, sub=None):
        """x en mm, dy en unites planche au-dessus de l'origine de la vue."""
        X, Y = self.X(x), self.oy + dy
        self.sh.tx(X, Y, t.upper(), "vt", "middle", 16, w=700)
        if sub:
            self.sh.tx(X, Y + 17, sub, "vs", "middle", 12.5)


# ---------------------------------------------------------------------------
#  Cadre, zones, cartouche, nomenclature, bloc de notes
# ---------------------------------------------------------------------------
ZONE_N = ["1", "2", "3", "4", "5", "6"]
ZONE_L = ["A", "B", "C", "D"]


def frame(sh):
    x0, y0, x1, y1 = FR
    a0, b0, a1, b1 = IN
    sh.rc(x0, y0, x1 - x0, y1 - y0, "frm")
    sh.rc(a0, b0, a1 - a0, b1 - b0, "frmi")
    cw = (a1 - a0) / 6.0
    for i in range(6):
        cx = a0 + cw * (i + .5)
        sh.tx(cx, y0 + 15, ZONE_N[i], "zn", "middle", 13, w=600)
        sh.tx(cx, y1 - 6, ZONE_N[i], "zn", "middle", 13, w=600)
        if i:
            sh.ln(a0 + cw * i, y0, a0 + cw * i, b0, "frmi")
            sh.ln(a0 + cw * i, b1, a0 + cw * i, y1, "frmi")
    rh = (b1 - b0) / 4.0
    for j in range(4):
        cy = b0 + rh * (j + .5)
        sh.tx(x0 + 11, cy + 5, ZONE_L[j], "zn", "middle", 13, w=600)
        sh.tx(x1 - 11, cy + 5, ZONE_L[j], "zn", "middle", 13, w=600)
        if j:
            sh.ln(x0, b0 + rh * j, a0, b0 + rh * j, "frmi")
            sh.ln(a1, b0 + rh * j, x1, b0 + rh * j, "frmi")


CART_X, CART_W, CART_H = 1042.0, 580.0, 132.0


def cartouche(sh):
    x, w, h = CART_X, CART_W, CART_H
    y = IN[3] - h
    sh.rc(x, y, w, h, "cart")
    # bandeau superieur : designation
    sh.ln(x, y + 46, x + w, y + 46, "cart")
    sh.tx(x + 10, y + 20, "BRASERO BIGORNEAU — V24", "ct1", "start", 15, w=700)
    sh.tx(x + 10, y + 38, sh.title.upper(), "ct2", "start", 12)
    # ligne 2 : proprietes
    sh.ln(x, y + 88, x + w, y + 88, "cart")
    cols = [0, 118, 236, 330, 424]
    for c in cols[1:]:
        sh.ln(x + c, y + 46, x + c, y + 88, "cart")
    cells = [("ÉCHELLE", "N.T.S."), ("MATIÈRE", sh.tag or "S235 / INOX 304"),
             ("FORMAT", "A3"), ("UNITÉ", "mm")]
    for i, (k, val) in enumerate(cells):
        cx = x + cols[i] + 8
        sh.tx(cx, y + 60, k, "ck", "start", 9.5)
        sh.tx(cx, y + 80, val, "cv", "start", 13)
    # symbole projection 1er diedre
    px, py = x + 424, y + 46
    sh.ln(px, py, px, y + h, "cart")
    proj(sh, px + (w - 424) / 2, py + 22)
    sh.tx(px + (w - 424) / 2, y + 84, "1er DIÈDRE", "ck", "middle", 9)
    # ligne 3 : reperes plan
    sh.ln(x + 236, y + 88, x + 236, y + h, "cart")
    sh.tx(x + 8, y + 104, "PLANCHE N°", "ck", "start", 9.5)
    sh.tx(x + 8, y + 124, sh.code, "cvb", "start", 19, w=700)
    sh.tx(x + 244, y + 104, "ÉTAPE", "ck", "start", 9.5)
    sh.tx(x + 244, y + 124, sh.step, "cvb", "start", 15, w=700)
    sh.tx(px + (w - 424) / 2, y + 122, "TOL. ISO 2768-m", "ck", "middle", 9.5)


def proj(sh, cx, cy):
    """Symbole de projection du 1er diedre (europeen)."""
    sh.pg([(cx - 30, cy - 9), (cx - 8, cy - 13), (cx - 8, cy + 13), (cx - 30, cy + 9)], "sym")
    sh.cr(cx + 14, cy, 13, "sym")
    sh.cr(cx + 14, cy, 5.5, "sym")
    sh.ln(cx - 2, cy, cx + 32, cy, "clsym")
    sh.ln(cx + 14, cy - 18, cx + 14, cy + 18, "clsym")


def nomenclature(sh):
    if not sh.nomen:
        return
    x, w = CART_X, CART_W
    ybase = IN[3] - CART_H
    rh = 21.0
    n = len(sh.nomen)
    top = ybase - rh * (n + 1)
    cols = [0, 46, 96, 400, w]
    sh.rc(x, top, w, rh * (n + 1), "cart")
    for c in cols[1:-1]:
        sh.ln(x + c, top, x + c, ybase, "cart")
    for i in range(n + 1):
        sh.ln(x, top + rh * i, x + w, top + rh * i, "carth")
    # en-tete en bas (style ISO)
    hy = ybase - rh
    for j, (k, al) in enumerate([("REP.", "m"), ("QTÉ", "m"), ("DÉSIGNATION", "s"), ("MATIÈRE / PROFIL", "s")]):
        cx = x + (cols[j] + cols[j + 1]) / 2 if al == "m" else x + cols[j] + 7
        sh.tx(cx, hy + 15, k, "ck", "middle" if al == "m" else "start", 9.5)
    for i, row in enumerate(sh.nomen):
        yy = hy - rh * (i + 1)
        rep, des, qte, mat = row
        sh.tx(x + 23, yy + 15, rep, "nrep", "middle", 12.5, w=700)
        sh.tx(x + 71, yy + 15, qte, "nq", "middle", 12.5)
        sh.tx(x + 103, yy + 15, des, "nd", "start", 12.5)
        sh.tx(x + 407, yy + 15, mat, "nm", "start", 11.5)


def notebox(sh):
    if not sh.notes:
        return
    x, y1 = 58.0, IN[3]
    w = 946.0
    rh = 17.0
    h = 30 + rh * len(sh.notes)
    y = y1 - h
    sh.rc(x, y, w, h, "nb")
    sh.ln(x, y + 23, x + w, y + 23, "cart")
    sh.tx(x + 9, y + 16, sh.note_title, "nbt", "start", 11.5, w=700)
    for i, t in enumerate(sh.notes):
        cls = "nbx"
        if t.startswith("!"):
            cls, t = "nbw", t[1:]
        elif t.startswith("+"):
            cls, t = "nbg", t[1:]
        sh.tx(x + 9, y + 39 + rh * i, t, cls, "start", 12.3)


def head(sh):
    sh.tx(70, 76, sh.step.upper(), "hstep", "start", 13, w=700)
    sh.tx(70, 104, sh.title, "htitle", "start", 25, w=700)
    if sh.lead:
        sh.tx(70, 126, sh.lead, "hlead", "start", 13)
    sh.ln(70, 138, 1610, 138, "hr")


def render(sh):
    frame(sh)
    head(sh)
    cartouche(sh)
    nomenclature(sh)
    notebox(sh)
    return (f'<svg class="sheet" viewBox="0 0 {W:.0f} {H:.0f}" '
            f'xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="{e(sh.code)} {e(sh.title)}">'
            + DEFS + "".join(sh.b) + "</svg>")


DEFS = """<defs>
<pattern id="hx" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
<line x1="0" y1="0" x2="0" y2="10" stroke="#3b4046" stroke-width="1.1"/></pattern>
<pattern id="hx2" width="7" height="7" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
<line x1="0" y1="0" x2="0" y2="7" stroke="#1b4f8f" stroke-width="1"/></pattern>
<pattern id="vm" width="8" height="8" patternUnits="userSpaceOnUse">
<rect width="8" height="8" fill="#efe9dc"/><circle cx="2" cy="2" r="1.1" fill="#b9ac91"/>
<circle cx="6" cy="6" r="1.1" fill="#b9ac91"/></pattern>
<pattern id="wool" width="9" height="9" patternTransform="rotate(30)" patternUnits="userSpaceOnUse">
<rect width="9" height="9" fill="#f2f3f5"/><circle cx="4.5" cy="4.5" r="2.4" fill="none" stroke="#aab3bd" stroke-width="1"/></pattern>
</defs>"""


# ---------------------------------------------------------------------------
#  Vue isometrique : face AVANT a gauche, paroi G a droite
# ---------------------------------------------------------------------------
K, M = 0.866, 0.5


def ISO(x, y, z):
    return ((y - x) * K, (x + y) * M - z)


class Iso:
    def __init__(self, sh, ox, oy, s, mirror=None):
        self.sh, self.ox, self.oy, self.s = sh, ox, oy, s
        self.m = mirror        # (mx, my) : x' = mx - x, y' = my - y

    def p(self, x, y, z):
        if self.m:
            x, y = self.m[0] - x, self.m[1] - y
        X, Y = ISO(x, y, z)
        return (self.ox + X * self.s, self.oy + Y * self.s)

    def quad(self, pts, c="iso"):
        self.sh.pg([self.p(*q) for q in pts], c)

    def l3(self, a, b, c="o"):
        A, B = self.p(*a), self.p(*b)
        self.sh.ln(A[0], A[1], B[0], B[1], c)

    def t3(self, x, y, z, s, c="lbl", a="middle", size=12, dx=0, dy=0, w=None):
        X, Y = self.p(x, y, z)
        self.sh.tx(X + dx, Y + dy, s, c, a, size, w=w)

    def note3(self, x, y, z, dx, dy, label, a="start", size=12):
        X, Y = self.p(x, y, z)
        self.sh.ln(X, Y, X + dx, Y + dy, "lead")
        self.sh.cr(X, Y, 3.2, "fill")
        self.sh.tx(X + dx + (5 if a == "start" else -5), Y + dy + 4,
                   label, "ann", a, size)

    def ball3(self, x, y, z, dx, dy, label, r=16):
        X, Y = self.p(x, y, z)
        BX, BY = X + dx, Y + dy
        ang = atan2(Y - BY, X - BX)
        self.sh.ln(BX + r * cos(ang), BY + r * sin(ang), X, Y, "lead")
        self.sh.cr(X, Y, 3.2, "fill")
        self.sh.cr(BX, BY, r, "ball")
        self.sh.tx(BX, BY + 5.2, label, "balt", "middle", 14, w=700)
