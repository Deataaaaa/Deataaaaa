# -*- coding: utf-8 -*-
"""Planches F.12 a F.16"""
from draw import *
from sheets_a import corniere


def rond(v, x, y, l, d, horiz=True, cls="rod"):
    if horiz:
        v.rect(x, y - d / 2, l, d, cls)
        v.circle(x, y, d / 2, "rodend")
        v.circle(x + l, y, d / 2, "rodend")
    else:
        v.rect(x - d / 2, y, d, l, cls)


# ===========================================================================
def f12():
    sh = Sheet("F.12", "ÉTAPE 10 BIS", "Fabrication des poignées",
               "Les 3 poignées ne s'achètent pas : chacune se fabrique avec 3 tronçons de rond plein soudés bout à bout. AUCUN PLI — on coupe droit et on soude les angles à 90°.",
               nomen=[("18d", "Patte de poignée tiroir", "2", "Rond Ø14 — L 40"),
                      ("18c", "Barre de prise tiroir", "1", "Rond Ø14 — L 120"),
                      ("18b", "Patte de poignée transport", "4", "Rond Ø16 — L 50"),
                      ("18a", "Barre de prise transport", "2", "Rond Ø16 — L 150")],
               tag="Rond plein S235",
               note_title="MÉTHODE DE FABRICATION",
               notes=[
                   "1. Débiter les 3 tronçons bien droits (coupe d'équerre), ébavurer les 2 bouts de chaque patte.",
                   "2. Présenter en U sur un gabarit : une équerre magnétique par angle, les 2 pattes strictement parallèles.",
                   "3. Pointer les 2 angles, contrôler l'équerrage, puis cordon plein tout autour de chaque angle.",
                   "+4. Meuler les angles extérieurs en arrondi : la poignée sera chaude, elle doit être douce à la main.",
                   "5. Fabriquer les 3 poignées d'un coup, sur le même gabarit — elles seront identiques.",
               ])
    # debit
    sh.tx(90, 190, "DÉBIT — 9 TRONÇONS DE ROND PLEIN", "sect", "start", 13, w=700)
    v = View(sh, 120, 240, 1.5)
    items = [(150, 16, "Barre de prise transport — Ø16, L 150", "×2"),
             (50, 16, "Patte transport — Ø16, L 50", "×4"),
             (120, 14, "Barre de prise tiroir — Ø14, L 120", "×1"),
             (40, 14, "Patte tiroir — Ø14, L 40", "×2")]
    for i, (l, d, lab, q) in enumerate(items):
        y = i * 62
        rond(v, 0, y, l, d)
        v.dimh(0, l, y + d / 2, str(l), off=22, up=False)
        v.text(l + 14, y, lab, "ann", "start", 12, dy=4)
        v.text(l + 14, y + 16, "Ø%d   %s" % (d, q), "annb", "start", 12, dy=4)

    # poignee transport
    v2 = View(sh, 900, 300, 1.7)
    v2.title(75, -100, "Poignée de transport (×2)", "vue de dessus — 3 tronçons Ø16")
    v2.rect(-40, 48, 230, 10, "wall")
    v2.text(-40, 78, "paroi (face EXTÉRIEURE)", "ann", "start", 11.5)
    rond(v2, 0, 0, 150, 16)
    rond(v2, -8, 0, 50, 16, horiz=False)
    rond(v2, 158, 0, 50, 16, horiz=False)
    v2.dimh(0, 150, -8, "150   prise", off=30)
    v2.dimv(8, 48, 168, "50   déport", off=26, left=False)
    v2.poly([(-16, 44), (0, 44), (-16, 30)], "weldb")
    v2.poly([(166, 44), (150, 44), (166, 30)], "weldb")
    v2.note(230, -30, 75, 0, "2 soudures d'angle, cordon plein", "start", 11.5)
    v2.text(75, 104, "AUCUN PLI — 3 tronçons droits soudés", "corr", size=12.5, w=700)

    # poignee tiroir
    v3 = View(sh, 900, 620, 1.7)
    v3.title(60, -100, "Poignée de tiroir (×1)", "vue de dessus — 3 tronçons Ø14")
    v3.rect(-40, 38, 210, 10, "wall")
    v3.text(-40, 68, "façade du tiroir", "ann", "start", 11.5)
    rond(v3, 0, 0, 120, 14)
    rond(v3, -7, 0, 40, 14, horiz=False)
    rond(v3, 127, 0, 40, 14, horiz=False)
    v3.dimh(0, 120, -7, "120   prise", off=30)
    v3.dimv(7, 38, 134, "40   déport", off=26, left=False)
    v3.poly([(-14, 34), (0, 34), (-14, 22)], "weldb")
    v3.poly([(134, 34), (120, 34), (134, 22)], "weldb")

    # gabarit
    v4 = View(sh, 250, 800, 1.5)
    sh.tx(180, 632, "GABARIT DE SOUDAGE — LE MÊME POUR LES 3 POIGNÉES", "sect", "start", 13, w=700)
    v4.rect(0, 0, 320, 12, "jig")
    v4.rect(40, -70, 12, 70, "jig")
    v4.rect(268, -70, 12, 70, "jig")
    rond(v4, 52, -40, 216, 16)
    rond(v4, 46, -40, 40, 16, horiz=False)
    rond(v4, 274, -40, 40, 16, horiz=False)
    v4.text(160, 34, "2 cales bois + 1 équerre = les 3 poignées sortent identiques", "ann", size=11.5)
    v4.note(-30, -60, 46, -20, "cale", "end", 11)
    return sh


# ===========================================================================
def f13():
    sh = Sheet("F.13", "ÉTAPE 11", "Tiroir cendrier, registre et poignée",
               "Plier le bac T1 (développé en croix, plis à 90°), souder les 4 angles, poser la poignée Ø14 sur la façade à Z = 510, puis engager le bac sur les rails de l'étape 3.",
               nomen=[("19", "Registre coulissant", "1", "Plat 280×200×3"),
                      ("20", "Glissière de registre", "2", "Corn. 20×20×3 — L 220"),
                      ("18c", "Poignée de tiroir (étape 10 bis)", "1", "Rond Ø14 — 120 / 40"),
                      ("17", "Bac de tiroir T1", "1", "Tôle S235 ép.3 — développé")],
               tag="S235 ép. 3",
               note_title="TIROIR — POINTS DE VIGILANCE",
               notes=[
                   "1. Plis à 90° vers le HAUT sur les 4 côtés, puis cordon d'angle dans les 4 coins (étanche aux cendres).",
                   "!2. JEU : l'ouverture de la face avant fait 460. Débiter le fond du bac à 452 (jeu 4 mm) sinon il ne rentre pas.",
                   "!3. La façade doit RECOUVRIR l'ouverture 460×100 : la porter à 480×130 pour 10 mm de recouvrement partout.",
                   "!4. Le guide d'origine annonce un développé de 620×300 : avec une façade de 120 et un dosseret de 80,",
                   "!   le développé réel fait 620×420. Recalculer selon les hauteurs de pliage que vous retenez.",
                   "+5. Contrôle : le bac doit coulisser d'une main, sans point dur, sur toute la course.",
               ])
    # developpe
    v = View(sh, 200, 250, 0.72)
    v.title(310, -88, "Bac T1 — développé en croix", "plis à 90° vers le haut")
    v.poly([(80, 0), (540, 0), (540, 120), (620, 120), (620, 340),
            (540, 340), (540, 420), (80, 420), (80, 340), (0, 340),
            (0, 120), (80, 120)], "steel")
    for a, b in (((80, 120), (540, 120)), ((80, 340), (540, 340)),
                 ((80, 120), (80, 340)), ((540, 120), (540, 340))):
        v.line(a[0], a[1], b[0], b[1], "fold")
    v.text(310, 240, "FOND  460 × 220", "opl", size=13, w=700)
    v.text(310, 62, "FAÇADE  h 120", "opl", size=11.5, w=700)
    v.text(310, 388, "DOS  h 80", "opl", size=11.5, w=700)
    v.text(40, 230, "CÔTÉ  h 80", "opl", size=11, w=700, rot=-90)
    v.text(580, 230, "CÔTÉ  h 80", "opl", size=11, w=700, rot=-90)
    v.dimh(0, 620, 420, "620", off=36, up=False)
    v.dimv(0, 420, 620, "420", off=36, left=False)
    v.dimh(80, 540, 0, "460", off=30)
    v.dimv(120, 340, 0, "220", off=30)
    v.dimv(0, 120, 80, "120", off=64, out=True)
    v.ball(-80, 60, "17", 40, 120)
    v.text(310, 536, "traits interrompus = lignes de pli à 90°", "ann", size=11.5)

    # facade
    v2 = View(sh, 830, 250, 0.72)
    v2.title(230, -88, "Façade du tiroir — vue de face", "poignée centrée en X")
    v2.rect(0, 0, 460, 120, "part")
    v2.cl_v(-16, 136, 230)
    rond(v2, 170, 60, 120, 14)
    v2.dimh(170, 290, 60, "120", off=54)
    v2.dimh(0, 460, 120, "460", off=32, up=False)
    v2.dimv(0, 120, 0, "120", off=30)
    v2.text(230, -48, "centré en X", "corr", size=11.5, w=700)
    v2.ball(360, 180, "18c", 290, 62)

    # coupe laterale  (y local = 553 - Z)
    v3 = View(sh, 900, 566, 0.92)
    sh.tx(800, 486, "COUPE LATÉRALE — LE BAC SUR SON RAIL", "vt", "start", 16, w=700)
    sh.tx(800, 506, "le tiroir sort vers la gauche", "vs", "start", 12.5)
    v3.rect(-2, -30, 2, 60, "hatchp2")          # paroi AV au-dessus de l'ouverture
    v3.rect(-2, 130, 2, 60, "hatchp2")          # paroi AV en dessous
    v3.rect(0, 0, 3, 120, "hatchp")             # facade du bac
    v3.rect(3, 117, 220, 3, "hatchp")           # fond du bac
    v3.rect(223, 37, 3, 80, "hatchp")           # dos du bac
    v3.rect(3, 120, 250, 3, "steelL")           # rail
    v3.rect(-43, 36, 43, 14, "rod")             # patte de poignee
    v3.circle(-43, 43, 7, "rodend")             # barre de prise vue en bout
    v3.line(-90, 43, 280, 43, "cl")
    v3.text(-96, 43, "Z = 510", "zt", "end", 12.5, dy=4, w=700)
    v3.line(-90, 120, 280, 120, "cl")
    v3.text(-96, 120, "Z = 433", "zt", "end", 12.5, dy=4, w=700)
    v3.line(-90, 0, 60, 0, "cl")
    v3.text(-96, 0, "Z = 553", "zt", "end", 12, dy=4)
    v3.dimh(-43, 0, 175, "40", off=26, up=False, out=True)
    v3.dimv(0, 120, 250, "120", off=26, left=False)
    v3.text(140, 145, "rail 30×30×3", "ann", size=11.5)
    v3.text(120, 90, "le bac glisse sur le rail", "annb", size=12, w=700)
    v3.note(-120, 150, -20, 128, "sens de sortie", "end", 11.5)
    v3.note(120, -34, 60, 120, "fond du bac posé sur le rail", "start", 11.5)

    # registre
    v4 = View(sh, 200, 776, 0.62)
    sh.tx(200, 716, "REGISTRE D'AIR (rep. 19 + 20) — INTERPRÉTATION À VALIDER", "sect", "start", 13, w=700)
    v4.rect(0, 0, 460, 220, "part")
    v4.rect(20, 20, 20, 180, "hatchp")
    v4.rect(420, 20, 20, 180, "hatchp")
    v4.rect(90, 30, 280, 160, "steelL")
    v4.text(230, 118, "REGISTRE 280 × 200 × 3", "opl", size=12, w=700)
    v4.dimh(90, 370, 30, "280", off=28)
    v4.dimv(20, 200, 0, "220", off=28)
    v4.text(230, 262, "il coulisse entre 2 glissières et règle l'arrivée d'air sous le foyer", "ann", size=11.5)
    v4.text(230, 284, "le guide d'origine ne précise pas son sens de coulissement — à arrêter en atelier", "corr", size=11.5, w=700)
    v4.ball(-80, 40, "20", 20, 60)
    v4.ball(520, 40, "19", 370, 60)
    return sh


# ===========================================================================
def f14():
    sh = Sheet("F.14", "ÉTAPE 12", "Pose des poignées de transport",
               "Souder une poignée étrier Ø16 sur la face EXTÉRIEURE de chaque paroi G et D, axe à Z = 420, centrée en profondeur (prise de Y = 175 à Y = 325).",
               nomen=[("18a", "Poignée de transport (étape 10 bis)", "2", "Rond Ø16 — 150 / 50")],
               tag="Rond Ø16",
               note_title="POSE DES POIGNÉES",
               notes=[
                   "!1. Tracer sur la face EXTÉRIEURE — c'est la seule pièce du montage qui se soude à l'extérieur.",
                   "2. Axe de la prise à Z = 420 (trait déjà tracé à l'étape 1). Prise centrée : de Y = 175 à Y = 325.",
                   "3. Contrôler la symétrie G/D avant de souder : les 2 poignées doivent être à la même hauteur au mm près.",
                   "4. Cordon d'angle plein tout autour de chaque patte, en 2 passes si nécessaire — c'est ce qui porte le brasero.",
                   "+5. Charge : un brasero complet est lourd. Ne pas se contenter d'un point de soudure par patte.",
               ])
    # elevation exterieure
    v = View(sh, 240, 230, 0.78)
    v.title(250, -50, "Paroi G — vue EXTÉRIEURE", "paroi D identique, en miroir")
    v.rect(0, 0, 500, 645, "part")
    y420 = 645 - 420
    v.line(0, y420, 500, y420, "trace")
    rond(v, 175, y420, 150, 16)
    v.dimh(175, 325, y420, "150   prise", off=34)
    v.dimh(0, 175, 645, "175", off=32, up=False)
    v.dimh(325, 500, 645, "175", off=32, up=False)
    v.dimv(y420, 645, -1, "420", off=34)
    v.dimh(0, 500, 645, "500", off=70, up=False)
    v.text(250, -18, "AXE Z = 420", "corr", size=12, w=700)
    v.cl_v(y420 - 60, y420 + 60, 250)
    v.ball(560, y420, "18a", 325, y420)
    v.text(250, 400, "FACE EXTÉRIEURE", "vghost", size=15, w=700)

    # vue de dessus
    v2 = View(sh, 900, 320, 1.9)
    v2.title(75, -80, "Vue de dessus — étrier", "déport perpendiculaire à la paroi")
    v2.rect(-40, 50, 230, 10, "wall")
    v2.text(-40, 82, "paroi G — épaisseur 2", "ann", "start", 11.5)
    rond(v2, 0, 0, 150, 16)
    rond(v2, -8, 0, 50, 16, horiz=False)
    rond(v2, 158, 0, 50, 16, horiz=False)
    v2.dimh(0, 150, -8, "150", off=28)
    v2.dimv(8, 50, 168, "50", off=26, left=False)
    v2.poly([(-16, 46), (0, 46), (-16, 32)], "weldb")
    v2.poly([(166, 46), (150, 46), (166, 32)], "weldb")
    v2.weld(166, 48, 250, 122, "a4", tail="pourtour")
    v2.note(220, 20, 166, 30, "cordon plein tout autour de la patte", "start", 11.5)

    # coupe verticale
    v3 = View(sh, 900, 700, 1.9)
    sh.tx(880, 556, "COUPE VERTICALE SUR UNE PATTE", "vt", "start", 16, w=700)
    v3.rect(0, -60, 10, 160, "hatchp2")
    v3.rect(10, 34, 50, 16, "rod")
    v3.line(-40, 42, 150, 42, "cl")
    v3.text(-46, 42, "Z = 420", "zt", "end", 12.5, dy=4, w=700)
    v3.poly([(10, 30), (10, 20), (20, 30)], "weldb")
    v3.poly([(10, 54), (10, 64), (20, 54)], "weldb")
    v3.text(-14, -40, "paroi", "ann", "end", 11.5)
    v3.note(110, 0, 40, 34, "rond Ø16", "start", 11.5)
    return sh


# ===========================================================================
def f15():
    sh = Sheet("F.15", "ÉTAPE 13", "Finitions — peinture, isolation, bardage",
               "Contrôle des soudures, dégraissage, peinture HT 600 °C sur l'acier nu en masquant l'inox, puis isolation du foyer et bardage. La polymérisation au premier feu n'est pas optionnelle.",
               nomen=[("V", "Panneau de vermiculite", "4", "Vermiculite ép. 30"),
                      ("L", "Laine de roche haute température", "—", "Laine de roche HT"),
                      ("B", "Bardage", "—", "Douglas — fixé par l'intérieur"),
                      ("P", "Peinture haute température", "×2", "Résine silicone 600 °C — 2 couches")],
               tag="Finitions",
               note_title="ORDRE DES FINITIONS — ÉTAPE ESSENTIELLE",
               notes=[
                   "1. Meulage et ébavurage de tous les cordons.   2. Dégraissage complet à l'acétone.",
                   "3. Peinture HT 600 °C véritable (résine silicone) — 2 couches espacées de 12 h, sur acier nu, inox masqué.",
                   "4. Attendre 48 h après la 2e couche (évaporation des solvants).",
                   "!5. POLYMÉRISATION au premier feu : montée progressive à 300 °C pendant 1 h. C'est cette cuisson qui crée",
                   "!   la liaison céramique. Sans elle, la peinture s'écaille au bout de quelques mois.",
                   "6. Vermiculite + laine de roche dans le foyer.   7. Grilles fonte et inox.   8. Bardage fixé par l'intérieur.",
               ])
    # coupe habillage
    v = View(sh, 300, 352, 1.6)
    sh.tx(210, 210, "COUPE — HABILLAGE DU FOYER", "vt", "start", 16, w=700)
    sh.tx(210, 230, "partie haute du caisson, paroi gauche", "vs", "start", 12.5)
    v.rect(-2, -60, 2, 120, "hatchp2")
    corniere(v, 60, 60, 6, 0, 0)
    corniere(v, 50, 50, 5, 60, -5)
    v.rect(6, -54, 24, 54, "wool")
    v.rect(30, -54, 30, 54, "verm")
    v.rect(98, -25, 150, 20, "cast")
    v.line(-46, 0, 270, 0, "cl")
    v.text(-52, 0, "Z = 591", "zt", "end", 12.5, dy=4, w=700)
    v.line(-46, -54, 130, -54, "cl")
    v.text(-52, -54, "Z = 645", "zt", "end", 12, dy=4)
    v.text(172, -12, "GRILLE FONTE", "castt", size=11, w=700)
    v.note(146, -82, 45, -30, "vermiculite ép. 30", "start", 11.5)
    v.note(146, -108, 18, -44, "laine de roche HT", "start", 11.5)
    v.note(150, 58, 62, -26, "l'aile verticale du A5b retient les panneaux", "start", 11.5)
    v.text(170, 92, "FOYER", "vghost", size=16, w=700)

    # zones peinture
    v2 = View(sh, 830, 300, 0.44)
    v2.title(353, -88, "Zones de peinture", "vue de face — ce qui se peint / ce qui se masque")
    v2.rect(-103, 0, 706, 6, "inoxm")
    v2.poly([(-100, 6), (600, 6), (475, 156), (25, 156)], "paint")
    v2.rect(-2, 156, 504, 8, "paint")
    v2.rect(0, 164, 500, 645, "paint")
    for px in (15, 445):
        v2.rect(px, 809, 40, 100, "paint")
    v2.rect(120, 120 - 0, 0, 0, "hole")
    v2.note(180, -74, 60, 3, "INOX — NE PAS PEINDRE (masquer)", "middle", 11.5, c="corr")
    v2.text(250, 500, "ACIER PEINT", "vghost", size=15, w=700)

    # bardage
    v3 = View(sh, 1200, 250, 0.52)
    v3.title(250, -72, "Bardage — paroi G / D", "fixé par l'INTÉRIEUR")
    v3.rect(0, 0, 500, 645, "part")
    for i in range(6):
        v3.line(0, 20 + i * 100, 500, 20 + i * 100, "board")
    v3.rect(160, 195, 180, 60, "hole")
    v3.text(250, 232, "RÉSERVE POIGNÉE", "opl", size=11, w=700)
    v3.dimv(645 - 420, 645, -1, "420", off=30)
    v3.text(250, 690, "lames Douglas — vis depuis l'intérieur du caisson", "ann", size=11.5)

    # sequence polymerisation
    ox, oy = 200.0, 700.0
    sh.tx(ox, oy - 18, "COURBE DE POLYMÉRISATION — PREMIER FEU", "sect", "start", 13, w=700)
    v4 = View(sh, ox + 40, oy + 130, 1.0)
    v4.line(0, 0, 420, 0, "axis")
    v4.line(0, 0, 0, -110, "axis")
    v4.plyl([(0, 0), (60, -10), (150, -50), (260, -95), (400, -100)], "curve")
    v4.text(-10, -100, "300 °C", "dimt", "end", 11.5)
    v4.text(-10, 4, "ambiant", "dimt", "end", 11.5)
    v4.text(210, 26, "1 heure de montée progressive", "ann", size=11.5)
    v4.text(400, -112, "palier", "annb", size=11.5)
    sh.tx(ox, oy + 176, "Un feu vif dès le départ décolle la peinture : monter doucement.", "gnote", "start", 11.5)
    return sh


# ===========================================================================
def f16():
    sh = Sheet("F.16", "SYNTHÈSE", "Toutes les cotes Z sur une seule vue",
               "Cette planche ne remplace aucune étape : c'est le récapitulatif à garder sous les yeux pendant tout le montage. Toutes les hauteurs partent du dessus du fond A2.",
               nomen=[("—", "Planche de synthèse (aucune pièce)", "—", "Référence de contrôle")],
               tag="Référence",
               note_title="CONTRÔLE FINAL AVANT PEINTURE",
               notes=[
                   "☐ Diagonales du fond et du dessus égales à ± 1 mm.   ☐ Le caisson ne boite pas sur le marbre.",
                   "☐ Les 2 rails à la même hauteur : une règle posée en travers porte sur les deux.",
                   "☐ Le tiroir coulisse d'une main sur toute sa course, sans point dur.",
                   "☐ La grille fonte 300 repose bien sur les 4 côtés du cadre A5b.   ☐ La plancha ne bascule pas.",
                   "☐ Tous les cordons meulés et ébavurés.   ☐ Aucune trace d'acier au carbone sur l'inox.",
               ])
    # elevation cotee
    v = View(sh, 330, 230, 0.86)
    v.title(250, -50, "Coupe verticale du caisson", "toutes les cotes Z, depuis Z = 0")
    v.rect(0, 0, 500, 645, "part")
    v.rect(20, 645 - 395, 380, 375, "openf")
    v.rect(20, 645 - 523, 460, 100, "openf")
    for px in (15, 445):
        v.rect(px, 645, 40, 100, "hatchp")
    levels = [(645, "645", "dessus du caisson"),
              (641, "641", "haut de l'aile verticale A5b"),
              (596, "596", "dessus A5b — appui de la grille"),
              (591, "591", "dessus cornière A5"),
              (523, "523", "haut de l'ouverture tiroir"),
              (510, "510", "axe poignée de tiroir"),
              (433, "433", "dessus des rails"),
              (423, "423", "bas de l'ouverture tiroir"),
              (420, "420", "axe poignée de transport"),
              (409, "409", "axe du renfort de pont"),
              (395, "395", "haut ouverture range-bûches"),
              (25, "25", "axe des traverses"),
              (20, "20", "bas ouverture range-bûches"),
              (0, "0", "dessus du fond A2  —  ORIGINE")]
    # etiquettes reparties : on ecarte celles qui se chevauchent
    Yt = [v.Y(645 - z) for z, _, _ in levels]
    lab_y, minp = [], 21.0
    for yy in Yt:
        lab_y.append(yy if not lab_y else max(yy, lab_y[-1] + minp))
    X0 = v.X(540)
    for k, (z, lab, desc) in enumerate(levels):
        y = 645 - z
        v.line(-30, y, 540, y, "lvl")
        yl = lab_y[k]
        sh.pl([(X0, Yt[k]), (X0 + 18, yl), (X0 + 34, yl)], "lead")
        bold = 700 if z in (0, 433, 591) else None
        sh.tx(X0 + 40, yl + 4, "Z = " + lab, "zt", "start", 12.5, w=bold)
        sh.tx(X0 + 122, yl + 4, desc, "trl", "start", 11.5)
    v.line(-30, 745, 540, 745, "ground")
    v.text(548, 745, "SOL", "zt", "start", 12, dy=4)
    v.dimv(645 - 645, 645, -40, "645", off=34)
    v.dimh(0, 500, 745, "500", off=34, up=False)

    # tableau des profiles
    ox, oy = 1090.0, 250.0
    sh.tx(ox, oy - 16, "PROFILÉS À DÉBITER — RÉCAPITULATIF", "sect", "start", 13, w=700)
    rows = [("Cornière 60×60×6", "A5", "3 × 496  +  1 × 492"),
            ("Cornière 50×50×5", "A5b", "4 × 376  (onglets 45°)"),
            ("Cornière 30×30×3", "rails", "2 × 486  +  2 × 60"),
            ("Cornière 20×20×3", "jupe INOX", "≈ 2824 (périmètre)"),
            ("Plat 30×4", "traverses / butées", "3 × 460  +  2 × 40"),
            ("Plat 40×3", "renfort de pont", "1 × 460"),
            ("Plat 25×8", "cadre A4", "4 × 504  (onglets 45°)"),
            ("Plat 30×3 INOX", "nervures", "2 × 223"),
            ("Tube 40×40×3", "pieds", "4 × 100"),
            ("Rond Ø16", "poignées transport", "2 × 150  +  4 × 50"),
            ("Rond Ø14", "poignée tiroir", "1 × 120  +  2 × 40")]
    rh = 27.0
    sh.rc(ox, oy, 470, rh * len(rows), "cart")
    for i, (a, b, c) in enumerate(rows):
        y = oy + rh * i
        if i:
            sh.ln(ox, y, ox + 470, y, "carth")
        sh.tx(ox + 9, y + 18, a, "nd", "start", 12.5, w=700)
        sh.tx(ox + 168, y + 18, b, "nm", "start", 11.5)
        sh.tx(ox + 462, y + 18, c, "nq", "end", 12.5)
    sh.ln(ox + 160, oy, ox + 160, oy + rh * len(rows), "cart")
    sh.ln(ox + 300, oy, ox + 300, oy + rh * len(rows), "cart")

    # --- les cotes a ne jamais rater ---
    oy2 = oy + rh * len(rows) + 56
    sh.tx(ox, oy2 - 16, "LES 5 COTES À NE JAMAIS RATER", "sect", "start", 13, w=700)
    keys = [("591", "dessus de la cornière A5", "elle porte la grille et la vermiculite"),
            ("433", "dessus des rails", "si G et D diffèrent, le tiroir coince"),
            ("276", "ouverture du cadre A5b", "sinon la grille fonte 300 ne pose pas"),
            ("195,4", "hauteur du panneau P1 à plat", "et non 232 — voir planche F.10"),
            ("452", "largeur du bac de tiroir", "pour passer dans l'ouverture de 460")]
    bh2 = 44.0
    for i, (val, t1, t2) in enumerate(keys):
        y = oy2 + i * (bh2 + 5)
        sh.rc(ox, y, 470, bh2, "gbox")
        sh.tx(ox + 12, y + 30, val, "gnum", "start", 21, w=700)
        sh.tx(ox + 96, y + 19, t1, "glab", "start", 12.5, w=700)
        sh.tx(ox + 96, y + 35, t2, "gnote", "start", 11.5)
    return sh
