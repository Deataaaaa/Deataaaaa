# -*- coding: utf-8 -*-
"""Planches F.00 a F.05"""
from draw import *
from math import sqrt

# geometrie generale (Z depuis le fond du caisson, Z=0 = dessus du fond A2)
Z_TOP = 645.0        # dessus caisson
H_TOT = 909.0        # sol -> dessus plancha
# repere local vue de face : y=0 en haut (dessus plancha)
YP = {"plancha_t": 0, "plancha_b": 6, "pyr_t": 6, "pyr_b": 156,
      "cadre_t": 156, "cadre_b": 164, "cais_t": 164, "cais_b": 809,
      "pied_b": 909}


def caisson_face(v, x0=0.0, hatch=False):
    """Vue de face du caisson seul (500 x 645), y local 0 = haut du caisson."""
    v.rect(x0, 0, 500, 645, "part" if not hatch else "o")


# ===========================================================================
def f00():
    nom = [
        ("18", "Poignée étrier (transport ×2 / tiroir ×1)", "3", "Rond Ø16 et Ø14"),
        ("17", "Bac de tiroir T1 + registre", "1", "Tôle S235 ép.3"),
        ("16", "Jupe périmétrique sous plancha", "1", "INOX corn. 20×20×3"),
        ("15", "Nervure sous plancha", "2", "INOX plat 30×3 — L 223"),
        ("14", "Plancha PL1 — trou central 260×260", "1", "INOX 304 ép.6 — 706×706"),
        ("13", "Panneau de pyramide P1", "4", "Tôle S235 ép.4 — trapèze"),
        ("12", "Plat du cadre haut A4 (onglet 45°)", "4", "Plat 25×8 — L 504"),
        ("11", "Patin", "4", "Caoutchouc Ø45"),
        ("10", "Pied", "4", "Tube 40×40×3 — h 100"),
        ("9", "Renfort de pont (face avant)", "1", "Plat 40×3 — L 460"),
        ("8", "Traverse range-bûches", "3", "Plat 30×4 — L 460"),
        ("7", "Cornière réductrice A5b", "4", "Corn. 50×50×5 — L 376"),
        ("6", "Cornière porte-grille A5", "4", "Corn. 60×60×6 — L 496/492"),
        ("5", "Butée arrière de rail", "2", "Plat 30×4 — L 40"),
        ("4", "Rail de tiroir", "2", "Corn. 30×30×3 — L 486"),
        ("3", "Paroi avant A1.AV (2 ouvertures)", "1", "Tôle S235 ép.2 — 500×645"),
        ("2", "Paroi AR / G / D", "3", "Tôle S235 ép.2 — 500×645"),
        ("1", "Fond du caisson A2", "1", "Tôle S235 ép.2 — 500×500"),
    ]
    sh = Sheet("F.00", "ENSEMBLE", "Vue d'ensemble et nomenclature",
               "Toutes les cotes en mm. Z = 0 au dessus du fond A2. X = largeur (G→D). Y = profondeur (AV→AR).",
               nomen=nom, tag="S235 + INOX 304",
               note_title="À LIRE AVANT DE COMMENCER",
               notes=[
                   "1. Procédé : MIG/MAG ou TIG (141). Positions : toutes sauf verticale descendante.",
                   "2. Gorge des cordons d'angle : a = 3 mm sur tôle 2 mm, a = 4 mm sur cornières et plats.",
                   "3. Toutes les soudures ACIER ↔ INOX (plancha) se font au métal d'apport 309L UNIQUEMENT.",
                   "!4. La face avant (rep. 3) se soude EN DERNIER : le caisson reste ouvert jusqu'à l'étape 7.",
                   "+5. Repère de mesure unique : Z = 0 au dessus du fond A2. Fabriquer la réglette de l'étape 0.",
               ])

    # ---------------- vue de face ------------------
    v = View(sh, 230, 240, 0.46)
    v.title(250, -86, "Vue de face — ensemble", "(échelle réduite)")
    # pieds
    for px in (15, 445):
        v.rect(px, 809, 40, 100, "part")
    for px in (35, 465):
        v.rect(px - 22, 909, 44, 9, "rub")
    # caisson
    v.rect(0, 164, 500, 645, "part")
    # ouvertures face avant
    v.rect(20, 809 - 20 - 375, 380, 375, "openf")
    v.rect(20, 809 - 423 - 100, 460, 100, "openf")
    # cadre A4
    v.rect(-2, 156, 504, 8, "steel")
    # pyramide
    v.poly([(-100, 6), (600, 6), (475, 156), (25, 156)], "part")
    # plancha
    v.rect(-103, 0, 706, 6, "inox")
    # cotes
    v.dimh(-103, 603, 0, "706", off=44)
    v.dimh(0, 500, 909, "500", off=40, up=False)
    v.dimv(0, 909, 603, "909", off=52, left=False)
    v.dimv(164, 809, -103, "645", off=44)
    v.dimv(809, 909, -103, "100", off=44, out=True)
    v.dimv(6, 156, 603, "150", off=100, left=False)
    v.text(250, 480, "CAISSON", "vghost", size=17, w=700)
    v.ball(-150, 60, "14", -60, 3)
    v.ball(-150, 120, "13", 60, 100)
    v.ball(650, 160, "12", 480, 160)
    v.ball(650, 380, "2", 500, 380)
    v.ball(650, 700, "3", 400, 700)
    v.ball(-150, 860, "10", 40, 860)

    # ---------------- vue de dessus ------------------
    v2 = View(sh, 700, 312, 0.50)
    v2.title(250, -128, "Vue de dessus", "plancha + caisson (traits interrompus)")
    v2.rect(-103, -103, 706, 706, "inox")
    v2.rect(120, 120, 260, 260, "hole")
    v2.rect(0, 0, 500, 500, "hid")
    v2.rect(-2, -2, 504, 504, "hid")
    v2.cl_h(-135, 635, 250)
    v2.cl_v(-135, 635, 250)
    v2.dimh(-103, 603, -103, "706", off=40)
    v2.dimh(120, 380, 120, "260", off=30)
    v2.dimv(-103, 603, 603, "706", off=40, left=False)
    v2.note(700, 30, 380, 130, "trou 260×260 — passage du feu", "start", 11.5)
    v2.note(-150, 560, 0, 500, "caisson 500×500 (dessous)", "end", 11.5)
    v2.ball(660, 460, "14", 560, 460)

    # ---------------- gamme de montage ------------------
    steps = [("0", "Repérage,\nréglette"), ("1", "Traçage\ndes parois"), ("2", "Demi-caisson\nouvert"),
             ("3", "Rails de\ntiroir"), ("4", "Cornières\nA5"), ("4b", "Cadre\nA5b"),
             ("5", "Traverses"), ("6", "Face avant\nà plat"), ("7", "Fermeture\n+ pieds"),
             ("8", "Cadre top\nA4"), ("9", "Pyramide"), ("10", "Plancha\nINOX"),
             ("11", "Tiroir +\nregistre"), ("12", "Poignées"), ("13", "Finitions")]
    bx, by, bw, bh, gap = 66.0, 762.0, 104.0, 62.0, 6.0
    sh.tx(66, 744, "GAMME DE MONTAGE — ORDRE IMPOSÉ", "sect", "start", 13, w=700)
    for i, (n, lab) in enumerate(steps):
        col, row = i % 8, i // 8
        x = bx + col * (bw + gap)
        y = by + row * (bh + 22)
        cls = "gbox2" if n in ("2", "6", "13") else "gbox"
        sh.rc(x, y, bw, bh, cls)
        sh.tx(x + 9, y + 21, n, "gnum", "start", 17, w=700)
        for k, part in enumerate(lab.split("\n")):
            sh.tx(x + 9, y + 38 + k * 14, part, "glab", "start", 11.5)
        if col < 7 and i < len(steps) - 1:
            sh.ln(x + bw + 1, y + bh / 2, x + bw + gap - 1, y + bh / 2, "flow")
    sh.tx(66, 924, "Étapes encadrées en rouge : points de non-retour — une fois soudé, on ne revient pas en arrière.",
          "gnote", "start", 11.5)

    # ---------------- perspective ------------------
    iso = Iso(sh, 1332, 430, 0.235, mirror=(500, 500))
    sh.tx(1332, 186, "PERSPECTIVE D'ENSEMBLE", "vt", "middle", 16, w=700)
    sh.tx(1332, 206, "vue du coin avant-gauche", "vs", "middle", 12.5)
    _iso_brasero(iso, labels=True)
    return sh


def _iso_brasero(iso, labels=True):
    """Vue du coin avant-gauche : face AVANT à droite, paroi G à gauche."""
    C = 500.0
    # pieds — du plus lointain au plus proche
    for (px, py) in ((445, 445), (445, 15), (15, 445), (15, 15)):
        iso.quad([(px, py, 0), (px + 40, py, 0), (px + 40, py, -100), (px, py, -100)], "isod")
        iso.quad([(px, py, 0), (px, py + 40, 0), (px, py + 40, -100), (px, py, -100)], "isod2")
    # caisson : paroi G (x=0) à gauche, face AV (y=0) à droite
    iso.quad([(0, 0, 0), (0, C, 0), (0, C, 645), (0, 0, 645)], "isos")
    iso.quad([(0, 0, 0), (C, 0, 0), (C, 0, 645), (0, 0, 645)], "isof")
    # ouvertures de la face avant
    iso.quad([(20, 0, 20), (400, 0, 20), (400, 0, 395), (20, 0, 395)], "isoh")
    iso.quad([(20, 0, 423), (480, 0, 423), (480, 0, 523), (20, 0, 523)], "isoh")
    # cadre A4
    iso.quad([(-2, -2, 653), (502, -2, 653), (502, 502, 653), (-2, 502, 653)], "isot")
    iso.quad([(-2, -2, 645), (-2, 502, 645), (-2, 502, 653), (-2, -2, 653)], "isos")
    iso.quad([(-2, -2, 645), (502, -2, 645), (502, -2, 653), (-2, -2, 653)], "isof")
    # pyramide
    iso.quad([(25, 25, 653), (25, 475, 653), (-100, 600, 803), (-100, -100, 803)], "isos")
    iso.quad([(25, 25, 653), (475, 25, 653), (600, -100, 803), (-100, -100, 803)], "isof")
    # plancha
    iso.quad([(-103, -103, 809), (603, -103, 809), (603, 603, 809), (-103, 603, 809)], "isoinox")
    iso.quad([(120, 120, 809), (380, 120, 809), (380, 380, 809), (120, 380, 809)], "isohole")
    iso.quad([(-103, -103, 803), (-103, 603, 803), (-103, 603, 809), (-103, -103, 809)], "isos")
    iso.quad([(-103, -103, 803), (603, -103, 803), (603, -103, 809), (-103, -103, 809)], "isof")
    # poignee de transport sur la paroi G
    iso.quad([(-50, 175, 428), (-50, 325, 428), (0, 325, 428), (0, 175, 428)], "isod")
    if labels:
        iso.note3(250, 0, 473, 110, -30, "ouverture tiroir", "start")
        iso.note3(210, 0, 200, 120, 40, "range-bûches", "start")


# ===========================================================================
def f01():
    sh = Sheet("F.01", "ÉTAPE 0 + 1", "Repérage et traçage des parois",
               "Tracer au feutre indélébile sur les FACES INTÉRIEURES, avant toute soudure. Paroi D = miroir exact de la paroi G.",
               nomen=[("2", "Paroi AR / G / D", "3", "Tôle S235 ép.2 — 500×645"),
                      ("3", "Paroi avant A1.AV", "1", "Tôle S235 ép.2 — 500×645"),
                      ("G", "Réglette gabarit (bois ou tôle)", "1", "Latte — L 645")],
               tag="S235 ép. 2",
               note_title="MÉTHODE DE TRAÇAGE",
               notes=[
                   "1. Poser les 4 parois à plat, face INTÉRIEURE vers le haut (sauf poignées : face EXTÉRIEURE).",
                   "2. Fabriquer d'abord la réglette de 645 mm et y reporter les 5 hauteurs Z ci-dessous.",
                   "3. Appliquer la réglette contre chaque paroi, bord à bord avec le BAS : tracer les 5 traits.",
                   "+4. La symétrie G/D est la condition n°1 pour que le tiroir coulisse : même gabarit, mêmes traits.",
                   "!5. Z se mesure toujours depuis le BAS de la paroi (= dessus du fond A2), jamais depuis le haut.",
               ])

    def paroi(ox, oy, s, name, sub):
        v = View(sh, ox, oy, s)
        v.title(250, -80, name, sub)
        v.rect(0, 0, 500, 645, "part")
        return v

    # ---- paroi G ----
    v = paroi(190, 250, 0.55, "Paroi G — vue intérieure", "(paroi D = miroir exact)")
    for z, lab, ldy in ((591, "Z=591  cornière A5", 4), (433, "Z=433  rail de tiroir", -4),
                        (420, "Z=420  poignée (face EXT.)", 16), (25, "Z=25  traverses", 4)):
        y = 645 - z
        v.line(0, y, 500, y, "trace")
        v.text(508, y, lab, "trl", "start", 11.5, dy=ldy)
    v.dimv(645 - 591, 645, -1, "591", off=30)
    v.dimv(645 - 433, 645, -1, "433", off=68)
    v.dimv(645 - 25, 645, -1, "25", off=106, out=True)
    v.dimh(0, 500, 645, "500", off=34, up=False)
    v.text(250, 300, "INTÉRIEUR", "vghost", size=15, w=700)
    v.text(250, 782, "BAS DE LA PAROI  —  Z = 0", "warn", size=12, w=700)

    # ---- paroi AV ----
    v = paroi(730, 250, 0.55, "Paroi AV — vue intérieure", "(déjà découpée au laser)")
    v.rect(20, 645 - 395, 380, 375, "openf")
    v.rect(20, 645 - 523, 460, 100, "openf")
    v.text(210, 645 - 210, "OUV. RANGE-BÛCHES", "opl", size=11, w=700)
    v.text(210, 645 - 190, "380 × 375", "opl", size=11)
    v.text(250, 645 - 466, "OUV. TIROIR  460 × 100", "opl", size=10.5, w=700)
    for z, lab in ((591, "Z=591  cornière A5 AV"), (433, "Z=433  tronçons de rail")):
        y = 645 - z
        v.line(0, y, 500, y, "trace")
        v.text(508, y, lab, "trl", "start", 11.5, dy=4)
    v.dimv(645 - 395, 645 - 20, -1, "375", off=30)
    v.dimv(645 - 523, 645 - 423, -1, "100", off=30, out=True)
    v.dimv(645 - 20, 645, -1, "20", off=68, out=True)
    v.dimv(645 - 423, 645, -1, "423", off=106)
    v.dimh(20, 400, 0, "380", off=62)
    v.dimh(0, 500, 645, "500", off=34, up=False)
    v.text(250, 782, "BAS DE LA PAROI  —  Z = 0", "warn", size=12, w=700)

    # ---- paroi AR ----
    v = paroi(1250, 280, 0.45, "Paroi AR — intérieure", "(la plus simple : 2 traits)")
    for z, lab in ((591, "Z=591  cornière A5"), (25, "Z=25  traverses")):
        y = 645 - z
        v.line(0, y, 500, y, "trace")
        v.text(508, y, lab, "trl", "start", 11.5, dy=4)
    v.dimv(645 - 591, 645, -1, "591", off=30)
    v.dimv(645 - 25, 645, -1, "25", off=68, out=True)
    v.dimh(0, 500, 645, "500", off=34, up=False)
    v.text(250, 800, "BAS  —  Z = 0", "warn", size=12, w=700)

    # ---- reglette ----
    v = View(sh, 130, 790, 1.30)
    sh.tx(130, 762, "GABARIT — RÉGLETTE DE TRAÇAGE (à fabriquer en premier)", "sect", "start", 13, w=700)
    v.rect(0, 0, 645, 34, "jig")
    for z, ldy in ((25, -10), (420, -26), (433, -10), (510, -10), (591, -10)):
        v.line(z, 0, z, 34, "trace")
        v.text(z, 0, str(z), "dimt", size=12, w=700, dy=ldy)
    v.text(2, 34, "Z = 0 — appuyer CE bout contre le BAS de la paroi", "warn", "start", 11.5, w=700, dy=64)
    v.dimh(0, 645, 34, "645", off=40, up=False)
    v.text(322, 17, "latte bois ou chute de tôle — 5 traits de scie", "ann", size=11.5, dy=4)
    return sh


# ===========================================================================
def f02():
    sh = Sheet("F.02", "ÉTAPE 2", "Demi-caisson ouvert",
               "Souder UNIQUEMENT 3 parois (AR + G + D) sur le fond A2. La face avant reste OUVERTE pour permettre les soudures internes des étapes 3 à 5.",
               nomen=[("2", "Paroi AR / G / D", "3", "Tôle S235 ép.2 — 500×645"),
                      ("1", "Fond du caisson A2", "1", "Tôle S235 ép.2 — 500×500")],
               tag="S235 ép. 2",
               note_title="ÉQUERRAGE — MODE OPÉRATOIRE",
               notes=[
                   "1. Poser le fond A2 (rep.1) à plat. Présenter la paroi AR, la maintenir avec 2 équerres magnétiques.",
                   "2. POINTER seulement : 3 à 4 points par arête. Ne jamais faire un cordon continu avant contrôle.",
                   "3. Présenter G puis D. Contrôler les DEUX diagonales du fond : elles doivent être égales à ±1 mm.",
                   "4. Corriger au maillet tant que l'on est au point. Puis cordon continu, en pas de pèlerin (alterner AR/G/D).",
                   "!5. NE PAS SOUDER LA FACE AVANT. Rails, A5, A5b et traverses (étapes 3 à 5) passent par cette ouverture.",
               ])
    # --- developpes ---
    v = View(sh, 120, 230, 0.36)
    v.title(250, -74, "Fond A2 — développé", "à plat")
    v.rect(0, 0, 500, 500, "steel")
    v.dimh(0, 500, 0, "500", off=30)
    v.dimv(0, 500, 0, "500", off=30)
    v.ball(560, 250, "1", 400, 250)

    v2 = View(sh, 430, 230, 0.36)
    v2.title(250, -74, "Paroi AR / G / D — développé", "×3, identiques")
    v2.rect(0, 0, 500, 645, "steel")
    v2.dimh(0, 500, 0, "500", off=30)
    v2.dimv(0, 645, 500, "645", off=30, left=False)
    v2.ball(-60, 320, "2", 100, 320)

    # --- vue de dessus ---
    v3 = View(sh, 760, 250, 0.62)
    v3.title(250, -80, "Vue de dessus", "contrôle des diagonales")
    v3.rect(0, 0, 500, 500, "part")
    v3.line(0, 0, 500, 500, "diag")
    v3.line(500, 0, 0, 500, "diag")
    v3.text(250, 245, "diag. 1  =  diag. 2  (± 1 mm)", "diagt", size=12, w=700)
    v3.line(0, 500, 500, 500, "openl")
    v3.text(250, 528, "FACE AVANT — OUVERTE", "warn", size=12.5, w=700)
    v3.text(250, -14, "PAROI AR", "vs", size=11.5)
    v3.text(-14, 250, "PAROI G", "vs", size=11.5, rot=-90)
    v3.text(514, 250, "PAROI D", "vs", size=11.5, rot=90)
    v3.dimh(0, 500, 0, "500", off=32)

    # --- vue de face ---
    v4 = View(sh, 1180, 250, 0.55)
    v4.title(250, -80, "Vue de face", "face avant non posée")
    v4.rect(0, 0, 500, 645, "openl")
    v4.text(250, 320, "FACE AVANT", "warn", size=15, w=700)
    v4.text(250, 344, "NON POSÉE", "warn", size=15, w=700)
    v4.dimh(0, 500, 645, "500", off=32, up=False)
    v4.dimv(0, 645, 500, "645", off=32, left=False)
    v4.weld(250, 0, 330, -76, "a3", tail="pourtour")

    # --- detail soudure ---
    v5 = View(sh, 300, 780, 2.6)
    sh.tx(140, 552, "DÉTAIL A — PIED DE PAROI SUR FOND", "sect", "start", 13, w=700)
    v5.rect(-30, 0, 120, 2, "hatchp")     # fond A2
    v5.rect(0, -70, 2, 70, "hatchp")      # paroi
    v5.poly([(2, -8), (2, 0), (10, 0)], "weldb")
    v5.poly([(0, -8), (0, 0), (-8, 0)], "weldb")
    v5.text(-30, 16, "fond A2 ép.2", "ann", "start", 11.5)
    v5.text(10, -60, "paroi ép.2", "ann", "start", 11.5)
    v5.note(60, -46, 8, -3, "cordon d'angle a3 — les 2 faces", "start", 11.5)

    v6 = View(sh, 800, 760, 2.0)
    sh.tx(700, 690, "DÉTAIL B — ANGLE VERTICAL DE DEUX PAROIS (vue de dessus)", "sect", "start", 13, w=700)
    v6.rect(0, 0, 130, 2, "hatchp")
    v6.rect(0, 2, 2, 100, "hatchp")
    v6.poly([(2, 2), (10, 2), (2, 10)], "weldb")
    v6.text(70, -8, "paroi AR", "ann", size=11.5)
    v6.text(24, 60, "paroi G", "ann", "start", 11.5)
    v6.note(120, 70, 6, 6, "cordon continu intérieur a3", "start", 11.5)
    return sh


# ===========================================================================
def corniere(v, a, b, t, x0=0.0, y0=0.0, cls="hatchp", up=True):
    """Profil de cornière : aile verticale montante en x0, aile horizontale vers +x.
    Dessus de l'aile horizontale en y0. a = aile horizontale, b = aile verticale."""
    if up:
        pts = [(x0, y0 - (b - t)), (x0 + t, y0 - (b - t)), (x0 + t, y0),
               (x0 + a, y0), (x0 + a, y0 + t), (x0, y0 + t)]
    else:
        pts = [(x0, y0), (x0 + a, y0), (x0 + a, y0 + t), (x0 + t, y0 + t),
               (x0 + t, y0 + b), (x0, y0 + b)]
    v.poly(pts, cls)
    return pts


def f03():
    sh = Sheet("F.03", "ÉTAPE 3", "Ossature interne — rails de tiroir",
               "Souder 2 rails en cornière 30×30×3 sur les faces INTÉRIEURES des parois G et D. Le DESSUS du rail est à Z = 433. Le bac de tiroir glisse dessus.",
               nomen=[("5", "Butée arrière de rail", "2", "Plat 30×4 — L 40"),
                      ("4", "Rail de tiroir", "2", "Corn. 30×30×3 — L 486")],
               tag="S235",
               note_title="POSE DES RAILS",
               notes=[
                   "1. Reporter le trait Z=433 tracé à l'étape 1 : c'est le DESSUS de l'aile horizontale, pas le dessous.",
                   "2. Aile verticale plaquée contre la paroi, aile horizontale vers le CENTRE du caisson.",
                   "3. Pointer en 3 endroits (avant / milieu / arrière), vérifier au niveau à bulle, puis cordon continu.",
                   "+4. Contrôle : poser une règle en travers des 2 rails — elle doit porter sur les 2 sans bascule.",
                   "5. Le rail s'arrête à 10 mm de la paroi AR (L 486 pour 496 de profondeur intérieure).",
               ])
    # profil
    v = View(sh, 170, 300, 2.9)
    v.title(15, -118, "Profil du rail", "cornière 30×30×3")
    corniere(v, 30, 30, 3)
    v.dimh(0, 30, 3, "30", off=30, up=False)
    v.dimv(-27, 3, 30, "30", off=26, left=False)
    v.text(46, -14, "ép. 3", "ann", "start", 11.5)
    v.text(15, 30, "L 486 — longueur du rail", "dimt", size=13, w=700)

    # elevation paroi G
    v2 = View(sh, 470, 250, 0.60)
    v2.title(250, -72, "Paroi G — élévation intérieure", "vue depuis le centre du caisson")
    v2.rect(0, 0, 500, 645, "part")
    y433 = 645 - 433
    v2.rect(0, y433, 486, 8, "steel")
    v2.rect(486, y433 - 5, 10, 40, "steel2")
    v2.line(0, y433, 500, y433, "trace")
    v2.dimv(y433, 645, -1, "433", off=32)
    v2.dimh(0, 486, y433 + 8, "486", off=26, up=False)
    v2.dimh(0, 500, 645, "500", off=32, up=False)
    v2.note(300, y433 - 70, 240, y433, "Z = 433 — DESSUS du rail", "start", 12)
    v2.ball(560, y433 + 4, "4", 400, y433 + 4)
    v2.ball(560, y433 + 90, "5", 491, y433 + 20)
    v2.text(20, 620, "AVANT", "vs", "start", 11.5)
    v2.text(480, 620, "ARRIÈRE", "vs", "end", 11.5)

    # coupe horizontale
    v3 = View(sh, 900, 250, 0.60)
    v3.title(250, -76, "Coupe horizontale à Z = 433", "vue de dessus")
    v3.rect(0, 0, 500, 500, "part")
    v3.rect(2, 12, 30, 486, "hatchp")
    v3.rect(468, 12, 30, 486, "hatchp")
    v3.line(0, 500, 500, 500, "openl")
    v3.text(250, 528, "FACE AVANT — OUVERTE", "warn", size=12.5, w=700)
    v3.text(250, -14, "PAROI AR", "vs", size=11.5)
    v3.dimh(2, 32, 12, "30", off=26, out=True)
    v3.dimh(32, 468, 250, "436  (entre rails)", off=0, up=False, tdy=-6)
    v3.dimv(12, 498, 0, "486", off=34)
    v3.note(250, 90, 470, 120, "symétrie G / D obligatoire", "middle", 11.5)

    # detail orientation
    v4 = View(sh, 1250, 800, 2.3)
    sh.tx(1130, 596, "DÉTAIL — ORIENTATION DE LA CORNIÈRE", "sect", "start", 13, w=700)
    v4.rect(-14, -80, 14, 130, "hatchp2")
    corniere(v4, 30, 30, 3, 0, 0)
    v4.text(-40, -60, "paroi G", "ann", "end", 11.5)
    v4.note(70, -46, 20, 0, "le bac glisse ICI", "start", 11.5)
    v4.poly([(0, 3), (-7, 3), (0, 10)], "weldb")
    v4.poly([(0, -27), (-7, -27), (-7, -20)], "weldb")
    v4.text(60, 40, "vers le centre  →", "ann", "middle", 11.5)

    v5 = View(sh, 300, 830, 2.4)
    sh.tx(160, 660, "DÉTAIL — BUTÉE ARRIÈRE (rep. 5)", "sect", "start", 13, w=700)
    v5.rect(0, 0, 120, 4, "hatchp")
    v5.rect(120, -36, 4, 40, "hatchp")
    v5.text(60, -12, "rail 30×30×3", "ann", size=11.5)
    v5.note(150, -50, 122, -20, "plat 30×4 — L 40, soudé debout : il arrête le bac", "start", 11.5)
    return sh


# ===========================================================================
def f04():
    sh = Sheet("F.04", "ÉTAPE 4", "Ossature interne — cornières A5",
               "Souder 3 cornières 60×60×6 sur les faces intérieures AR, G et D. DESSUS de l'aile horizontale à Z = 591, aile horizontale VERS LE CENTRE.",
               nomen=[("6", "Cornière A5 — AR / G / D", "3", "Corn. 60×60×6 — L 496")],
               tag="S235",
               note_title="POSE DES CORNIÈRES A5",
               notes=[
                   "1. Cette cornière est la plus lourde du montage : elle porte la grille de foyer et la vermiculite.",
                   "2. Aile VERTICALE contre la paroi (elle monte), aile HORIZONTALE vers le centre. Dessus à Z=591.",
                   "3. Traitement des angles : coupe d'onglet à 45° (propre) OU recouper les cornières G et D à 436 mm",
                   "   pour qu'elles viennent en about contre celle de l'arrière. Choisir AVANT de débiter.",
                   "+4. La 4e cornière (avant) se soude à plat sur la paroi avant à l'étape 6 — ne pas la poser maintenant.",
               ])
    # profil
    v = View(sh, 258, 330, 2.6)
    v.title(30, -130, "Profil A5", "cornière 60×60×6")
    corniere(v, 60, 60, 6)
    v.dimh(0, 60, 6, "60", off=30, up=False)
    v.dimv(-54, 6, 60, "60", off=28, left=False)
    v.text(76, -30, "ép. 6", "ann", "start", 11.5)
    v.line(-42, 0, 76, 0, "cl")
    v.text(-48, 0, "Z=591", "zt", "end", 12, dy=4, w=700)
    v.note(-30, 50, 30, 6, "L 496 (×3)", "start", 11.5)

    # vue de dessus
    v2 = View(sh, 560, 240, 0.74)
    v2.title(250, -82, "Vue de dessus — 3 cornières à Z = 591", "la 4e (avant) viendra à l'étape 6")
    v2.rect(0, 0, 500, 500, "part")
    v2.rect(2, 2, 496, 60, "hatchp")     # AR
    v2.rect(2, 2, 60, 496, "hatchp")     # G
    v2.rect(438, 2, 60, 496, "hatchp")   # D
    v2.rect(2, 438, 496, 60, "ghost")    # AV (a venir)
    v2.text(250, 472, "A5 AVANT — ÉTAPE 6", "ghostt", size=11.5, w=700)
    v2.line(0, 500, 500, 500, "openl")
    v2.text(250, 528, "FACE AVANT — OUVERTE", "warn", size=12.5, w=700)
    v2.text(250, -14, "PAROI AR", "vs", size=11.5)
    v2.dimh(2, 62, 2, "60", off=28, out=True)
    v2.dimh(62, 438, 250, "376", off=0, up=False, tdy=-6)
    v2.dimv(2, 498, 500, "496", off=30, left=False)
    v2.ball(-70, 250, "6", 32, 250)

    # coupe verticale
    v3 = View(sh, 1120, 470, 1.5)
    sh.tx(1140, 200, "COUPE VERTICALE SUR PAROI G", "vt", "start", 16, w=700)
    sh.tx(1140, 220, "cote au-dessus / au-dessous de Z=591", "vs", "start", 12.5)
    v3.rect(-2, -120, 2, 220, "hatchp2")
    corniere(v3, 60, 60, 6, 0, 0)
    v3.line(-40, 0, 140, 0, "cl")
    v3.text(-46, 0, "Z = 591", "zt", "end", 13, dy=4, w=700)
    v3.line(-40, 100, 140, 100, "cl")
    v3.text(-46, 100, "Z = 645", "zt", "end", 12, dy=4)
    v3.text(-46, -120, "dessus paroi", "zt", "end", 11)
    v3.poly([(6, 0), (16, 0), (6, -10)], "weldb")
    v3.poly([(0, 6), (0, 16), (-8, 16)], "weldb")
    v3.note(90, -60, 30, 0, "reçoit la grille + la vermiculite", "start", 11.5)
    v3.weld(0, -30, 100, -95, "a4", tail="continu")
    v3.dimv(-54, 6, 78, "60", off=20, left=False)

    # --- traitement des angles ---
    sh.tx(150, 668, "TRAITEMENT DES 4 ANGLES — À CHOISIR AVANT DE DÉBITER", "sect", "start", 13, w=700)
    for k, (bx, ttl, mitre, l1, l2) in enumerate([
            (240.0, "SOLUTION A — onglet à 45°", True,
             "4 coupes en biais, 4 soudures", "jonction sans jour — la plus propre"),
            (700.0, "SOLUTION B — en about", False,
             "coupes droites", "mais recouper G et D à 436 au lieu de 496")]):
        a = View(sh, bx, 726, 1.15)
        sh.tx(bx - 10, 706, ttl, "pn", "start", 13, w=700)
        if mitre:
            a.rect(0, 0, 60, 150, "steelL")
            a.rect(0, 0, 150, 60, "steelL")
            a.line(0, 60, 60, 0, "cutl")
            a.poly([(0, 60), (60, 0), (60, 60)], "hatchp")
        else:
            a.rect(0, 0, 150, 60, "steelL")
            a.rect(0, 60, 60, 90, "steelL")
            a.line(0, 60, 60, 60, "cutl")
        a.text(105, 30, "AR", "pn", size=12, w=700, dy=4)
        a.text(30, 110, "G", "pn", size=12, w=700, dy=4)
        sh.tx(bx - 10, 926, l1, "ann", "start", 11.5)
        sh.tx(bx - 10, 944, l2, "corr" if not mitre else "ann", "start", 11.5,
              w=700 if not mitre else None)
    return sh


# ===========================================================================
def f05():
    sh = Sheet("F.05", "ÉTAPE 4 BIS", "Cadre réducteur A5b",
               "Souder 3 cornières 50×50×5 PAR-DESSUS les A5, aile verticale vers le HAUT, plaquée contre le bord intérieur de l'aile du A5 (Y = 62). L'ouverture passe à 276×276.",
               nomen=[("G", "Grille fonte du commerce (non fournie)", "1", "Fonte — 300×300"),
                      ("7", "Cornière A5b — AR / G / D", "3", "Corn. 50×50×5 — L 376")],
               tag="S235",
               note_title="POURQUOI CE CADRE ?",
               notes=[
                   "1. L'ouverture laissée par les A5 fait 376×376 : trop grande pour une grille fonte standard 300×300.",
                   "2. Le A5b la ramène à 276×276 → la grille 300 repose sur 12 mm de chaque côté. Elle ne peut pas tomber.",
                   "3. Pose SANS MESURE : on plaque l'aile verticale du A5b contre le bord de l'aile du A5, la position est unique.",
                   "4. Aile verticale vers le HAUT : elle sert aussi de butée aux panneaux de vermiculite.",
                   "!5. Repère retenu : DESSUS de l'aile du A5 = Z 591 (valeur de la réglette). Dessus A5b = Z 596.",
               ])
    # profil
    v = View(sh, 170, 300, 2.9)
    v.title(25, -120, "Profil A5b", "cornière 50×50×5")
    corniere(v, 50, 50, 5)
    v.dimh(0, 50, 5, "50", off=30, up=False)
    v.dimv(-45, 5, 50, "50", off=26, left=False)
    v.text(64, -24, "ép. 5", "ann", "start", 11.5)
    v.note(-10, 42, 25, 5, "L 376 (×3) — onglets 45°", "start", 11.5)

    # vue de dessus
    v2 = View(sh, 500, 240, 0.74)
    v2.title(250, -46, "Vue de dessus — A5 + A5b", "A5 en clair, A5b en foncé")
    v2.rect(0, 0, 500, 500, "part")
    for r in ((2, 2, 496, 60), (2, 2, 60, 496), (438, 2, 60, 496)):
        v2.rect(*r, "steelL")
    v2.rect(2, 438, 496, 60, "ghost")
    for r in ((62, 62, 376, 50), (62, 62, 50, 376), (388, 62, 50, 376)):
        v2.rect(*r, "hatchp")
    v2.rect(62, 388, 376, 50, "ghost2")
    v2.rect(112, 112, 276, 326, "hole")
    v2.text(250, 260, "OUVERTURE UTILE", "opl", size=12, w=700)
    v2.text(250, 280, "276 × 276", "opl", size=14, w=700)
    v2.line(0, 500, 500, 500, "openl")
    v2.text(250, 528, "FACE AVANT — OUVERTE", "warn", size=12.5, w=700)
    v2.text(250, -14, "PAROI AR", "vs", size=11.5)
    v2.dimh(62, 438, 62, "376", off=26)
    v2.dimh(112, 388, 112, "276", off=-30, up=False, tdy=-6)
    v2.dimh(2, 62, 500, "62", off=30, up=False, out=True)
    v2.ball(-70, 300, "7", 82, 300)

    # coupe
    v3 = View(sh, 1090, 560, 1.9)
    sh.tx(1030, 200, "COUPE TRANSVERSALE — JOINT A5 + A5b", "vt", "start", 16, w=700)
    sh.tx(1030, 220, "paroi G — cotes Z en absolu", "vs", "start", 12.5)
    v3.rect(-2, -140, 2, 240, "hatchp2")
    corniere(v3, 60, 60, 6, 0, 0)              # A5
    corniere(v3, 50, 50, 5, 60, -5)            # A5b : aile horiz. posee sur A5
    # grille fonte
    v3.rect(98, -25, 120, 20, "cast")
    v3.text(160, -12, "GRILLE FONTE 300", "castt", size=11, w=700)
    v3.line(-46, 0, 230, 0, "cl")
    v3.text(-52, 0, "Z = 591", "zt", "end", 13, dy=4, w=700)
    v3.line(-46, -5, 230, -5, "cl")
    v3.text(-52, -14, "Z = 596", "zt", "end", 12)
    v3.line(-46, -50, 120, -50, "cl")
    v3.text(-52, -50, "Z = 641", "zt", "end", 12, dy=4)
    v3.cl_v(-70, 90, 62)
    v3.text(62, 100, "Y = 62", "zt", size=12, dy=8, w=700)
    v3.poly([(60, -5), (60, -16), (70, -5)], "weldb")
    v3.poly([(110, -5), (110, 4), (119, 0)], "weldb")
    v3.weld(64, -10, 170, -104, "a4", tail="4 × 360")
    v3.dimh(98, 110, -25, "12", off=44, out=True)
    v3.note(150, 100, 112, 0, "appui de la grille : 12 mm par côté", "middle", 11.5)
    v3.text(30, 34, "A5", "pn", size=13, w=700)
    v3.text(88, -34, "A5b", "pn", size=13, w=700)

    # --- d'ou vient le 276 ---
    ox, oy = 100.0, 690.0
    sh.tx(ox, oy - 16, "D'OÙ VIENT L'OUVERTURE DE 276 ?", "sect", "start", 13, w=700)
    rows = [("Extérieur du caisson", "500", ""),
            ("− 2 parois de 2 mm", "− 4", "496  intérieur"),
            ("− 2 ailes de A5 (60)", "− 120", "376  entre les A5"),
            ("− 2 ailes de A5b (50)", "− 100", "276  ouverture utile"),
            ("Grille fonte du commerce", "300", "appui (300 − 276) / 2 = 12 par côté")]
    rh = 30.0
    sh.rc(ox, oy, 620, rh * len(rows), "cart")
    sh.ln(ox + 250, oy, ox + 250, oy + rh * len(rows), "cart")
    sh.ln(ox + 330, oy, ox + 330, oy + rh * len(rows), "cart")
    for i, (a, b, c) in enumerate(rows):
        y = oy + rh * i
        if i:
            sh.ln(ox, y, ox + 620, y, "carth")
        cls = "corr" if i == 3 else ("nd" if i < 4 else "nm")
        sh.tx(ox + 10, y + 20, a, "nd" if i != 4 else "nm", "start", 12.5)
        sh.tx(ox + 320, y + 20, b, "dimt", "end", 13, w=700)
        sh.tx(ox + 342, y + 20, c, cls, "start", 12.5, w=700 if i == 3 else None)
    sh.tx(ox, oy + rh * len(rows) + 22,
          "Aucune de ces cotes n'est à mesurer sur la pièce : elles découlent des profilés.",
          "gnote", "start", 11.5)
    return sh
