# -*- coding: utf-8 -*-
"""Planches F.06 a F.11"""
from draw import *
from sheets_a import corniere
from math import sqrt


# ===========================================================================
def f06():
    sh = Sheet("F.06", "ÉTAPE 5", "Ossature interne — traverses range-bûches",
               "Souder 3 plats 30×4 parallèles à l'axe X (gauche → droite), à Z = 25 (axe du plat). Ils surélèvent les bûches, favorisent le tirage et protègent le fond.",
               nomen=[("8", "Traverse range-bûches", "3", "Plat 30×4 — L 460")],
               tag="S235",
               note_title="POSE DES TRAVERSES",
               notes=[
                   "1. Le plat est posé À PLAT (30 mm à l'horizontale, 4 mm d'épaisseur). Axe du plat à Z = 25.",
                   "+2. ASTUCE : glisser une cale bois de 23 mm sous chaque traverse (25 − 4/2 = 23) → le Z est automatique.",
                   "3. Les 3 traverses sont centrées en X : 460 de long dans 496 d'intérieur, soit 18 mm de jeu par côté.",
                   "4. Entraxes en Y : 100 / 250 / 400 depuis la face avant. Espacement constant de 150 mm.",
                   "5. Souder aux 2 extrémités sur les parois G et D (cordon d'angle a4), rien au milieu.",
               ])
    # profil
    v = View(sh, 200, 300, 3.4)
    v.title(15, -104, "Section du plat", "plat 30×4")
    v.rect(0, 0, 30, 4, "hatchp")
    v.dimh(0, 30, 4, "30", off=28, up=False)
    v.dimv(0, 4, 30, "4", off=24, left=False, out=True)
    v.line(-20, 2, 50, 2, "cl")
    v.text(-26, 2, "Z = 25", "zt", "end", 12, dy=4, w=700)
    v.text(15, -13, "L 460", "dimt", size=13, w=700)

    # vue de dessus
    v2 = View(sh, 560, 250, 0.78)
    v2.title(250, -78, "Vue de dessus — traverses parallèles à X", "AR en haut, face avant en bas")
    v2.rect(0, 0, 500, 500, "part")
    for yv in (100, 250, 400):
        v2.rect(20, yv - 15, 460, 30, "hatchp")
    v2.line(0, 500, 500, 500, "openl")
    v2.text(250, 528, "FACE AVANT — OUVERTE  (Y = 0)", "warn", size=12.5, w=700)
    v2.text(250, -14, "PAROI AR", "vs", size=11.5)
    v2.cl_v(-14, 514, 250)
    v2.dimv(500, 400, 500, "100", off=32, left=False, out=True)
    v2.dimv(400, 250, 500, "150", off=32, left=False)
    v2.dimv(250, 100, 500, "150", off=32, left=False)
    v2.dimv(100, 0, 500, "100", off=32, left=False, out=True)
    v2.dimh(20, 480, 100, "460", off=26)
    v2.dimh(0, 20, 0, "18", off=26, out=True)
    v2.ball(-70, 250, "8", 20, 250)
    v2.text(250, 320, "Y = 250", "zt", size=11.5)

    # elevation / cale
    v3 = View(sh, 1150, 560, 2.5)
    sh.tx(1090, 420, "COUPE — MISE À HAUTEUR À LA CALE", "vt", "start", 16, w=700)
    sh.tx(1090, 440, "vue depuis l'avant du caisson", "vs", "start", 12.5)
    v3.rect(-20, 0, 168, 2, "hatchp2")
    v3.text(-20, 22, "fond A2", "ann", "start", 11.5)
    v3.rect(30, -25, 30, 4, "hatchp")
    v3.rect(30, -21, 30, 21, "jig")
    v3.text(45, -8, "23", "jigt", size=12, w=700)
    v3.line(-30, -23, 180, -23, "cl")
    v3.text(-36, -23, "Z = 25", "zt", "end", 12.5, dy=4, w=700)
    v3.line(-30, 0, 180, 0, "cl")
    v3.text(-36, 0, "Z = 0", "zt", "end", 12, dy=4)
    v3.note(120, -60, 55, -25, "traverse plat 30×4", "start", 11.5)
    v3.note(120, 34, 45, -10, "cale bois 23 mm (retirée après)", "start", 11.5)
    v3.dimv(-25, 0, 170, "25", off=22, left=False, out=True)

    # detail extremite
    v4 = View(sh, 300, 850, 2.6)
    sh.tx(180, 650, "DÉTAIL — EXTRÉMITÉ SUR PAROI", "sect", "start", 13, w=700)
    v4.rect(-18, -60, 18, 110, "hatchp2")
    v4.rect(0, 0, 130, 4, "hatchp")
    v4.poly([(0, 0), (10, 0), (0, -10)], "weldb")
    v4.poly([(0, 4), (10, 4), (0, 14)], "weldb")
    v4.text(-30, -40, "paroi G", "ann", "end", 11.5)
    v4.note(90, -34, 12, -2, "cordon a4 dessus + dessous", "start", 11.5)
    return sh


# ===========================================================================
def f07():
    sh = Sheet("F.07", "ÉTAPE 6", "Préparation de la face avant à plat",
               "Poser A1.AV à PLAT sur l'établi, face INTÉRIEURE vers le haut, et souder les 4 pièces dans l'ordre 1→2→3→4. Beaucoup plus rapide et précis qu'une fois la paroi montée.",
               nomen=[("4b", "Tronçon de rail avant", "2", "Corn. 30×30×3 — L 60"),
                      ("7b", "Cornière A5b avant", "1", "Corn. 50×50×5 — L 376"),
                      ("6b", "Cornière A5 avant", "1", "Corn. 60×60×6 — L 492"),
                      ("9", "Renfort de pont", "1", "Plat 40×3 — L 460"),
                      ("3", "Paroi avant A1.AV", "1", "Tôle S235 ép.2 — 500×645")],
               tag="S235",
               note_title="ORDRE DE POSE — À RESPECTER",
               notes=[
                   "1. Renfort de pont (rep. 9) : à cheval sur le pont entre les 2 ouvertures, axe à Z = 409.",
                   "2. Cornière A5 avant (rep. 6b) : dessus de l'aile à Z = 591, aile horizontale vers l'intérieur.",
                   "3. Cornière A5b avant (rep. 7b) : plaquée par-dessus l'A5 AV, aile verticale en haut, à Y = 62.",
                   "4. 2 tronçons de rail (rep. 4b) : dessus à Z = 433, dans les angles gauche et droit.",
                   "!5. Z=591 et Z=433 doivent tomber EXACTEMENT sur ceux déjà soudés dans le caisson. Mesurer 2 fois.",
               ])
    # vue principale
    v = View(sh, 200, 238, 0.72)
    v.title(250, -62, "A1.AV — vue intérieure, à plat", "avant fermeture du caisson")
    v.rect(0, 0, 500, 645, "part")
    v.rect(20, 645 - 395, 380, 375, "openf")
    v.rect(20, 645 - 523, 460, 100, "openf")
    v.text(210, 645 - 200, "OUVERTURE", "opl", size=11.5, w=700)
    v.text(210, 645 - 182, "RANGE-BÛCHES", "opl", size=11.5, w=700)
    v.text(210, 645 - 162, "380 × 375", "opl", size=11.5)
    v.text(250, 645 - 468, "OUVERTURE TIROIR  460 × 100", "opl", size=11, w=700)
    # A5 + A5b avant
    v.rect(2, 645 - 591 - 6, 496, 6, "hatchp")
    v.rect(2, 645 - 591, 496, 60, "steelL")
    v.rect(62, 645 - 596, 376, 5, "hatchp")
    # renfort de pont
    v.rect(20, 645 - 429, 460, 40, "steel2")
    # troncons de rail
    v.rect(2, 645 - 433, 60, 8, "hatchp")
    v.rect(438, 645 - 433, 60, 8, "hatchp")
    v.dimh(0, 500, 645, "500", off=34, up=False)
    v.dimv(0, 645, 500, "645", off=34, left=False)
    v.dimv(645 - 591, 645, -1, "591", off=32)
    v.dimv(645 - 433, 645, -1, "433", off=70)
    v.dimv(645 - 409, 645, -1, "409", off=108)
    v.ball(560, 645 - 594, "6b", 300, 645 - 588)
    v.ball(560, 645 - 640, "7b", 250, 645 - 596)
    v.ball(600, 300, "9", 400, 236)
    v.ball(560, 645 - 437, "4b", 470, 645 - 431)
    v.ball(-70, 645 - 300, "3", 60, 645 - 300)

    # ordre de pose
    ox, oy = 800.0, 220.0
    sh.tx(ox, oy - 26, "ORDRE DE POSE SUR LA FACE INTÉRIEURE", "sect", "start", 13, w=700)
    items = [("1", "Renfort de pont — plat 40×3, L 460",
              "à cheval sur le pont, axe Z = 409"),
             ("2", "Cornière A5 AV — 60×60×6, L 492",
              "dessus de l'aile à Z = 591"),
             ("3", "Cornière A5b AV — 50×50×5, L 376",
              "par-dessus l'A5 AV, à Y = 62"),
             ("4", "2 tronçons de rail — 30×30×3, L 60",
              "dessus à Z = 433, dans les 2 angles")]
    for i, (n, t1, t2) in enumerate(items):
        y = oy + i * 62
        sh.rc(ox, y, 470, 52, "gbox")
        sh.cr(ox + 26, y + 26, 15, "ball")
        sh.tx(ox + 26, y + 31, n, "balt", "middle", 15, w=700)
        sh.tx(ox + 52, y + 22, t1, "glab", "start", 13, w=700)
        sh.tx(ox + 52, y + 40, t2, "gnote", "start", 11.5)

    # coupe sur renfort
    v2 = View(sh, 830, 600, 1.6)
    sh.tx(700, 452, "COUPE — RENFORT DE PONT (rep. 9)", "sect", "start", 13, w=700)
    v2.rect(0, -70, 2, 70, "hatchp2")
    v2.rect(0, 0, 2, 40, "hatchp2")
    v2.rect(0, 60, 2, 60, "hatchp2")
    v2.rect(2, -12, 3, 64, "hatchp")
    v2.note(48, -44, 2, -34, "ouverture tiroir", "start", 11.5)
    v2.note(48, 92, 2, 82, "ouverture range-bûches", "start", 11.5)
    v2.note(48, 22, 5, 22, "plat 40×3 soudé à plat sur le pont", "start", 11.5)
    v2.poly([(5, -12), (5, -20), (13, -12)], "weldb")
    v2.poly([(5, 52), (5, 60), (13, 52)], "weldb")

    # coupe A5 + A5b avant
    v3 = View(sh, 1300, 646, 1.6)
    sh.tx(1220, 500, "COUPE — A5 + A5b AVANT à plat", "sect", "start", 13, w=700)
    v3.rect(-2, -40, 2, 130, "hatchp2")
    corniere(v3, 60, 60, 6, 0, 0)
    corniere(v3, 50, 50, 5, 60, -5)
    v3.line(-40, 0, 130, 0, "cl")
    v3.text(-46, 0, "Z = 591", "zt", "end", 12.5, dy=4, w=700)
    v3.cl_v(-60, 80, 62)
    v3.text(62, 92, "Y = 62", "zt", size=11.5)
    v3.text(30, 30, "A5 AV", "pn", size=12, w=700)
    v3.text(95, -36, "A5b AV", "pn", size=12, w=700)
    return sh


# ===========================================================================
def f08():
    sh = Sheet("F.08", "ÉTAPE 7", "Fermeture du caisson et pieds",
               "Présenter la face avant déjà équipée et la souder. Aux 4 angles, les cornières A5, A5b et les rails doivent rejoindre exactement leurs homologues. Souder ensuite les 4 pieds.",
               nomen=[("11", "Patin", "4", "Caoutchouc Ø45"),
                      ("10", "Pied", "4", "Tube 40×40×3 — h 100"),
                      ("3", "Paroi avant équipée (étape 6)", "1", "Ensemble soudé")],
               tag="S235",
               note_title="FERMETURE ET MISE SUR PIEDS",
               notes=[
                   "1. Présenter la face avant, la maintenir serrée. Vérifier AVANT de souder la continuité des 4 angles :",
                   "   cornière A5 (Z=591) — cornière A5b — rail de tiroir (Z=433). Un décalage se rattrape encore à ce stade.",
                   "2. Pointer les 4 arêtes, contrôler l'équerrage et les diagonales du dessus, puis cordon continu.",
                   "3. Retourner le caisson. Souder les 4 pieds sous le fond A2, à 15 mm des bords (entraxe 470).",
                   "+4. Contrôle final : poser le caisson sur le marbre — il ne doit pas boiter. Emboîter les patins Ø45.",
               ])
    # vue de dessus
    v = View(sh, 190, 250, 0.72)
    v.title(250, -84, "Vue de dessus — implantation des pieds", "caisson retourné")
    v.rect(0, 0, 500, 500, "part")
    for (px, py) in ((15, 15), (445, 15), (15, 445), (445, 445)):
        v.rect(px, py, 40, 40, "hatchp")
    v.cl_h(-20, 520, 250)
    v.cl_v(-20, 520, 250)
    v.dimh(15, 55, 15, "40", off=28, out=True)
    v.dimh(35, 465, 250, "470  (entraxe)", off=0, up=False, tdy=-6)
    v.dimh(0, 15, 500, "15", off=30, up=False, out=True)
    v.dimh(0, 500, 500, "500", off=64, up=False)
    v.dimv(15, 55, 500, "40", off=28, left=False, out=True)
    v.text(250, -14, "PAROI AR", "vs", size=11.5)
    v.text(250, 528, "PAROI AV", "vs", size=11.5)
    v.ball(-70, 35, "10", 15, 35)

    # vue de face
    v2 = View(sh, 640, 210, 0.62)
    v2.title(250, -46, "Vue de face — caisson sur pieds", "cotes depuis le sol")
    v2.rect(0, 0, 500, 645, "part")
    v2.rect(20, 645 - 395, 380, 375, "openf")
    v2.rect(20, 645 - 523, 460, 100, "openf")
    for px in (15, 445):
        v2.rect(px, 645, 40, 100, "hatchp")
    for px in (35, 465):
        v2.rect(px - 22, 745, 44, 9, "rub")
    v2.dimv(0, 645, -1, "645", off=32)
    v2.dimv(645, 745, -1, "100", off=32, out=True)
    v2.dimv(0, 745, 500, "745", off=36, left=False)
    v2.dimh(0, 500, 754, "500", off=30, up=False)
    v2.dimh(35, 465, 745, "470", off=0, up=False, tdy=-8)
    v2.ball(560, 700, "10", 465, 700)
    v2.ball(560, 760, "11", 476, 750)
    v2.line(-30, 754, 530, 754, "ground")
    v2.text(250, 776, "SOL", "vs", size=11.5)

    # detail angle
    v3 = View(sh, 1130, 330, 1.35)
    sh.tx(1080, 210, "DÉTAIL C — RACCORD D'ANGLE À Z = 591", "vt", "start", 16, w=700)
    sh.tx(1080, 230, "vue de dessus, angle avant-gauche", "vs", "start", 12.5)
    v3.rect(0, 0, 2, 200, "hatchp2")
    v3.rect(0, 0, 200, 2, "hatchp2")
    v3.rect(2, 2, 60, 190, "steelL")
    v3.rect(2, 2, 190, 60, "steelL")
    v3.line(2, 62, 62, 2, "cutl")
    v3.text(96, 30, "A5 avant (étape 6)", "pn", "start", 11.5)
    v3.text(30, 120, "A5 caisson", "pn", "start", 11.5, rot=-90)
    v3.note(150, 150, 32, 32, "coupe d'onglet 45° — jonction sans jour", "start", 11.5)
    v3.text(100, -12, "paroi AV", "ann", size=11)
    v3.text(-12, 100, "paroi G", "ann", size=11, rot=-90)

    # detail pied
    v4 = View(sh, 330, 806, 1.7)
    sh.tx(210, 706, "DÉTAIL D — PIED SUR FOND", "sect", "start", 13, w=700)
    v4.rect(-30, 0, 160, 2, "hatchp2")
    v4.rect(0, 2, 40, 100, "hatchp")
    v4.rect(-2, 102, 44, 9, "rub")
    v4.poly([(0, 2), (-10, 2), (0, -8)], "weldb")
    v4.poly([(40, 2), (50, 2), (40, -8)], "weldb")
    v4.text(-30, -14, "fond A2", "ann", "start", 11.5)
    v4.note(90, 50, 40, 50, "tube 40×40×3, h 100", "start", 11.5)
    v4.note(90, 108, 30, 106, "patin caoutchouc Ø45", "start", 11.5)
    v4.dimv(2, 102, -22, "100", off=18)
    return sh


# ===========================================================================
def f09():
    sh = Sheet("F.09", "ÉTAPE 8", "Cadre haut A4 — porte-pyramide",
               "Assembler 4 plats 25×8 en cadre carré : extérieur 504, intérieur 454. Onglets à 45° aux 4 angles. Poser le cadre centré sur le dessus du caisson — il déborde de 2 mm par côté.",
               nomen=[("12", "Plat de cadre A4 (onglet 45°)", "4", "Plat 25×8 — L 504")],
               tag="S235",
               note_title="CADRE A4",
               notes=[
                   "1. Débit : 4 plats de 504 mm de longueur HORS TOUT, coupés à 45° aux deux bouts (pointes vers l'extérieur).",
                   "2. Variante sans onglet : 2 plats de 504 + 2 plats de 454, assemblés bout à bout — 8 soudures au lieu de 4.",
                   "3. Assembler le cadre à plat sur l'établi, contrôler les diagonales, souder les 4 angles, meuler à ras.",
                   "4. Poser le cadre centré sur le caisson : 2 mm de débord par côté (504 contre 500). Cordon extérieur continu.",
                   "+5. L'ouverture intérieure de 454 laisse 2 mm de jeu tout autour de la base 450 de la pyramide.",
               ])
    # cadre
    v = View(sh, 260, 250, 0.94)
    v.title(252, -82, "Cadre A4 — vue de dessus", "assemblé à plat")
    v.rect(0, 0, 504, 504, "part")
    v.rect(25, 25, 454, 454, "hole")
    for a, b in (((0, 0), (25, 25)), ((504, 0), (479, 25)),
                 ((0, 504), (25, 479)), ((504, 504), (479, 479))):
        v.line(a[0], a[1], b[0], b[1], "cutl")
    v.dimh(0, 504, 0, "504", off=34)
    v.dimh(25, 479, 25, "454", off=-30, up=False, tdy=-6)
    v.dimv(0, 504, 504, "504", off=34, left=False)
    v.dimh(0, 25, 504, "25", off=30, up=False, out=True)
    v.text(252, 252, "OUVERTURE 454", "opl", size=13, w=700)
    v.text(252, 274, "(passage de la pyramide)", "opl", size=11)
    v.ball(-96, 250, "12", 12, 250)
    v.note(-90, 70, 12, 60, "onglet 45°", "end", 11.5)

    # section plat
    v2 = View(sh, 830, 300, 3.2)
    v2.title(12, -80, "Section du plat", "plat 25×8")
    v2.rect(0, 0, 25, 8, "hatchp")
    v2.dimh(0, 25, 8, "25", off=26, up=False)
    v2.dimv(0, 8, 25, "8", off=22, left=False, out=True)

    # pose sur caisson
    v3 = View(sh, 900, 560, 1.9)
    sh.tx(880, 470, "COUPE — POSE DU CADRE SUR LE CAISSON", "vt", "start", 16, w=700)
    v3.rect(0, 0, 2, 130, "hatchp2")
    v3.rect(-4, -8, 25, 8, "hatchp")
    v3.line(-4, -30, -4, 30, "cl")
    v3.line(2, -30, 2, 40, "cl")
    v3.dimh(-4, 2, -8, "2", off=34, out=True)
    v3.text(60, -20, "débord 2 mm par côté", "ann", "start", 11.5)
    v3.text(30, 60, "paroi du caisson ép. 2", "ann", "start", 11.5)
    v3.poly([(-4, 0), (-12, 0), (-4, 10)], "weldb")
    v3.weld(-6, 8, 62, 96, "a4", tail="pourtour")
    v3.note(56, 146, 21, 4, "cordon extérieur — sera caché par la pyramide", "start", 11.5)

    # ordre
    v4 = View(sh, 1300, 300, 0.6)
    sh.tx(1230, 200, "CONTRÔLE AVANT SOUDURE", "sect", "start", 13, w=700)
    v4.rect(0, 0, 504, 504, "hid")
    v4.line(0, 0, 504, 504, "diag")
    v4.line(504, 0, 0, 504, "diag")
    v4.text(252, 560, "diagonales égales à ± 1 mm", "diagt", size=12.5, w=700)
    v4.text(252, 596, "712,8 en théorique", "diagt", size=11.5)
    return sh


# ===========================================================================
def f10():
    hf = sqrt(232.0 ** 2 - 125.0 ** 2)      # 195,4 : hauteur du trapeze a plat
    sh = Sheet("F.10", "ÉTAPE 9", "Pyramide tronquée",
               "Assembler les 4 panneaux P1. Petite base 450 en bas (engagée dans le cadre A4), grande base 700 en haut (elle portera la plancha). 4 soudures droites sur les arêtes.",
               nomen=[("13", "Panneau de pyramide P1", "4", "Tôle S235 ép.4 — trapèze")],
               tag="S235 ép. 4",
               note_title="GÉOMÉTRIE — LIRE AVANT DE DÉBITER",
               notes=[
                   "!1. CORRECTION du guide d'origine : la cote 232 est la longueur du CÔTÉ OBLIQUE du trapèze,",
                   "!   PAS sa hauteur. La hauteur du trapèze à plat vaut 195,4 mm. Une pièce coupée à 232 de haut est fausse.",
                   "2. Décrochement isocèle : (700 − 450) / 2 = 125 mm de chaque côté.",
                   "3. Une fois monté, l'ensemble ne fait que 150 mm de haut : le panneau est très incliné (≈ 40° sur la verticale).",
                   "4. Arêtes : angle rentrant d'environ 114°. Chanfreiner les chants à ~33° ou souder en angle extérieur, cordon plein.",
                   "+5. Contrôle à plat : les 2 diagonales du trapèze doivent être égales (c'est ce qui garantit l'isocèle).",
               ])
    # panneau a plat
    v = View(sh, 230, 260, 0.62)
    v.title(350, -92, "Panneau P1 — développé à plat", "×4, identiques")
    v.poly([(0, 0), (700, 0), (575, hf), (125, hf)], "steel")
    v.dimh(0, 700, 0, "700   (grande base — en haut)", off=36)
    v.dimh(125, 575, hf, "450   (petite base — en bas)", off=36, up=False)
    v.dimv(0, hf, 0, "195,4", off=42)
    v.dimh(0, 125, hf, "125", off=78, up=False, out=True)
    v.dimr(575, hf, 700, 0, "232", off=-30)
    v.line(0, 0, 575, hf, "diag")
    v.line(700, 0, 125, hf, "diag")
    v.text(350, hf * 0.80, "diagonales égales", "diagt", size=11.5)
    v.ball(350, 42, "13", 350, 98)
    v.text(350, hf + 215, "hauteur du trapèze à plat : 195,4   —   côté oblique : 232", "corr", size=12.5, w=700)

    # vue de face montee
    v2 = View(sh, 800, 300, 0.62)
    v2.title(350, -90, "Vue de face — pyramide montée", "sur le cadre A4")
    v2.poly([(0, 0), (700, 0), (575, 150), (125, 150)], "part")
    v2.rect(98, 150, 504, 8, "steel2")
    v2.rect(100, 158, 500, 60, "hid")
    v2.dimh(0, 700, 0, "700", off=34)
    v2.dimh(125, 575, 158, "450", off=44, up=False)
    v2.dimv(0, 150, 700, "150", off=36, left=False)
    v2.text(350, 172, "cadre A4 — ouverture 454", "ann", size=11)
    v2.text(350, 200, "CAISSON", "vghost", size=14, w=700)
    v2.note(770, 62, 640, 78, "≈ 40° sur la verticale", "start", 11.5)

    # vue de dessus
    v3 = View(sh, 1230, 620, 0.46)
    sh.tx(1391, 560, "VUE DE DESSUS", "vt", "middle", 16, w=700)
    v3.rect(0, 0, 700, 700, "part")
    v3.rect(125, 125, 450, 450, "hid")
    for a, b in (((0, 0), (125, 125)), ((700, 0), (575, 125)),
                 ((0, 700), (125, 575)), ((700, 700), (575, 575))):
        v3.line(a[0], a[1], b[0], b[1], "ridge")
    v3.dimh(0, 700, 0, "700", off=30)
    v3.dimv(125, 575, 700, "450", off=30, left=False)
    v3.text(350, 360, "arêtes = 4 soudures droites", "ann", size=11.5)

    # detail arete
    v4 = View(sh, 330, 880, 2.4)
    sh.tx(200, 700, "DÉTAIL — ARÊTE ENTRE 2 PANNEAUX", "sect", "start", 13, w=700)
    v4.poly([(0, 0), (85, -55), (85, -51), (0, 4)], "hatchp")
    v4.poly([(0, 0), (-85, -55), (-85, -51), (0, 4)], "hatchp")
    v4.poly([(0, -2), (12, -8), (-12, -8)], "weldb")
    v4.text(0, 34, "angle rentrant ≈ 114°", "ann", size=11.5)
    v4.note(122, -44, 0, -6, "cordon plein continu, côté intérieur", "start", 11.5)
    return sh


# ===========================================================================
def f11():
    sh = Sheet("F.11", "ÉTAPE 10", "Plancha, jupe et nervures — INOX",
               "Souder par DESSOUS les 2 nervures et la jupe périmétrique sur la plancha INOX, à plat sur l'établi. Puis poser la plancha sur le sommet de la pyramide (700) et souder au 309L.",
               nomen=[("16", "Jupe périmétrique", "1", "INOX corn. 20×20×3 — L 2824"),
                      ("15", "Nervure (interrompue par le trou)", "2", "INOX plat 30×3 — L 223"),
                      ("14", "Plancha PL1 — trou 260×260", "1", "INOX 304 ép.6 — 706×706")],
               tag="INOX 304",
               note_title="SOUDURE ACIER ↔ INOX",
               notes=[
                   "!1. Métal d'apport 309L UNIQUEMENT pour tout ce qui touche l'inox. Le 308L fissure à chaud sur cet assemblage.",
                   "2. Brosse inox DÉDIÉE et disque neuf : toute trace d'acier au carbone sur l'inox fera de la rouille.",
                   "3. Ordre : 1) nervures + jupe sous la plancha, à plat  →  2) plancha sur le sommet de la pyramide.",
                   "4. Les nervures tombent pile sur l'axe médian : 223 mm de bord à trou, de chaque côté ((706 − 260) / 2).",
                   "+5. Souder par petits cordons alternés (pas de pèlerin) : 6 mm d'inox se voile très vite sur 706 mm.",
               ])
    # sous-face
    v = View(sh, 230, 250, 0.62)
    v.title(353, -88, "Plancha — vue de la SOUS-FACE", "nervures et jupe apparentes")
    v.rect(0, 0, 706, 706, "inox")
    v.rect(223, 223, 260, 260, "hole")
    v.rect(0, 338, 223, 30, "hatchp")
    v.rect(483, 338, 223, 30, "hatchp")
    v.rect(0, 0, 706, 20, "steelL")
    v.rect(0, 686, 706, 20, "steelL")
    v.rect(0, 0, 20, 706, "steelL")
    v.rect(686, 0, 20, 706, "steelL")
    v.cl_h(-20, 726, 353)
    v.cl_v(-20, 726, 353)
    v.dimh(0, 706, 0, "706", off=36)
    v.dimh(223, 483, 223, "260", off=28)
    v.dimh(0, 223, 706, "223", off=32, up=False)
    v.dimv(0, 706, 706, "706", off=36, left=False)
    v.dimv(223, 483, 0, "260", off=36)
    v.text(353, 360, "TROU 260×260", "opl", size=12, w=700)
    v.text(353, 380, "passage du feu", "opl", size=11)
    v.ball(-80, 40, "16", 10, 40)
    v.ball(812, 353, "15", 600, 353)
    v.ball(770, 600, "14", 600, 600)

    # section nervure + jupe
    v2 = View(sh, 830, 300, 3.0)
    v2.title(25, -80, "Section nervure", "plat 30×3")
    v2.rect(0, 0, 30, 3, "hatchp")
    v2.dimh(0, 30, 3, "30", off=26, up=False)
    v3 = View(sh, 1080, 300, 3.0)
    v3.title(25, -80, "Section jupe", "cornière 20×20×3")
    corniere(v3, 20, 20, 3, 0, 0, up=False)
    v3.dimh(0, 20, 3, "20", off=26, up=False)

    # coupe
    v4 = View(sh, 830, 560, 0.60)
    sh.tx(830, 460, "COUPE TRANSVERSALE — PLANCHA SUR PYRAMIDE", "vt", "start", 16, w=700)
    v4.rect(0, 0, 706, 6, "inox")
    v4.rect(3, 6, 220, 30, "hatchp")
    v4.rect(483, 6, 220, 30, "hatchp")
    v4.rect(0, 6, 20, 20, "steelL")
    v4.rect(686, 6, 20, 20, "steelL")
    v4.poly([(3, 6), (128, 156), (578, 156), (703, 6)], "ghost3")
    v4.dimh(0, 706, 0, "706", off=32)
    v4.text(353, 100, "700 — sommet de la pyramide", "ann", size=11.5)
    v4.note(353, -124, 300, 6, "trou central : la nervure est interrompue", "middle", 11.5)
    v4.weld(120, 8, 60, 90, "a4", tail="309L", flip=True)
    v4.text(353, 200, "acier S235", "pn", size=12, w=700)
    v4.text(736, 4, "INOX 304 ép. 6", "pn", "start", 12, w=700)

    # --- detail cordon acier / inox ---
    v5 = View(sh, 370, 810, 1.5)
    sh.tx(180, 700, "DÉTAIL E — CORDON ACIER ↔ INOX (309L)", "sect", "start", 13, w=700)
    v5.rect(0, 0, 200, 12, "inox")
    v5.poly([(30, 12), (66, 100), (86, 100), (50, 12)], "hatchp")
    v5.poly([(30, 12), (44, 12), (34, 26)], "weldb")
    v5.text(110, 6, "PLANCHA INOX ép. 6", "pn", size=12, w=700)
    v5.text(120, 70, "sommet de la pyramide — acier ép. 4", "ann", "start", 11.5)
    v5.note(-70, 44, 32, 18, "cordon continu", "end", 11.5)
    v5.weld(36, 16, 150, -40, "a4", tail="309L")
    v5.text(90, 130, "brosse inox dédiée — jamais celle qui a touché l'acier", "corr", "start", 11.5, w=700)
    return sh
