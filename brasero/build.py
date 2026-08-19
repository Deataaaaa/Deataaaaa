# -*- coding: utf-8 -*-
import sys
from draw import Sheet, View, Iso, render, e, W, H
import sheets_a as A
import sheets_b as B
import sheets_c as C

SVG_CSS = """
text{font-family:'Archivo Narrow','Arial Narrow',Arial,sans-serif;fill:#5D666E}
line,polyline,polygon,rect,circle,path{vector-effect:non-scaling-stroke}
line,polyline{fill:none}
.o{fill:none;stroke:#15181C;stroke-width:2.2}
.frm{fill:none;stroke:#15181C;stroke-width:2.6}
.frmi{fill:none;stroke:#15181C;stroke-width:1.2}
.cart{fill:none;stroke:#15181C;stroke-width:1.5}
.carth{fill:none;stroke:#AEB6BC;stroke-width:1}
.nb{fill:#F7F8F9;stroke:#15181C;stroke-width:1.4}
.sym{fill:none;stroke:#15181C;stroke-width:1.5}
.clsym{stroke:#8C959C;stroke-width:1;stroke-dasharray:9 4 2 4}
.hr{stroke:#15181C;stroke-width:1.5}
.ext{stroke:#8C959C;stroke-width:1}
.d{stroke:#1B4F8F;stroke-width:1.4;fill:none}
.fill{fill:#1B4F8F;stroke:none}
.lead{stroke:#8C959C;stroke-width:1}
.cl{stroke:#7C93AE;stroke-width:1.1;stroke-dasharray:18 5 4 5}
.trace{stroke:#B02A1E;stroke-width:1.7;stroke-dasharray:14 5;fill:none}
.lvl{stroke:#AEB6BC;stroke-width:1;stroke-dasharray:8 5}
.diag{stroke:#1B6B45;stroke-width:1.3;stroke-dasharray:10 5;fill:none}
.fold{stroke:#1B4F8F;stroke-width:1.4;stroke-dasharray:12 4 3 4;fill:none}
.cutl{stroke:#5D666E;stroke-width:1.2;stroke-dasharray:7 4}
.openl{stroke:#B02A1E;stroke-width:2.4;stroke-dasharray:12 6;fill:none}
.ground{stroke:#15181C;stroke-width:2.6}
.axis{stroke:#15181C;stroke-width:1.8;fill:none}
.curve{fill:none;stroke:#B02A1E;stroke-width:2.4;stroke-linejoin:round}
.flow{stroke:#8C959C;stroke-width:1.6}
.wl{stroke:#15181C;stroke-width:1.5;fill:none}
.wf{fill:#15181C;stroke:none}
.wc{fill:none;stroke:#15181C;stroke-width:1.5}
.board{stroke:#9C8A63;stroke-width:1.2}
.ridge{stroke:#8C959C;stroke-width:1.3;fill:none}
.hid{fill:none;stroke:#8C959C;stroke-width:1.4;stroke-dasharray:11 5}
.ghost{fill:none;stroke:#AEB6BC;stroke-width:1.3;stroke-dasharray:7 4}
.ghost2{fill:none;stroke:#C3CACF;stroke-width:1.2;stroke-dasharray:5 4}
.ghost3{fill:#F0F2F4;stroke:#AEB6BC;stroke-width:1.4}
.part{fill:#F4F6F7;stroke:#15181C;stroke-width:2.2}
.steel{fill:#E3E7EA;stroke:#15181C;stroke-width:2}
.steel2{fill:#D3DADE;stroke:#15181C;stroke-width:1.8}
.steelL{fill:#EBEEF0;stroke:#5D666E;stroke-width:1.4}
.inox{fill:#E6EEF3;stroke:#2C4A5E;stroke-width:2.1}
.inoxm{fill:#FFFFFF;stroke:#B02A1E;stroke-width:2;stroke-dasharray:9 5}
.hole{fill:#FFFFFF;stroke:#15181C;stroke-width:1.6}
.openf{fill:#FFFFFF;stroke:#15181C;stroke-width:1.8}
.hatchp{fill:url(#hx);stroke:#15181C;stroke-width:2}
.hatchp2{fill:#D5DBDF;stroke:#5D666E;stroke-width:1.5}
.rub{fill:#33383C;stroke:none}
.cast{fill:#6E7378;stroke:#15181C;stroke-width:1.5}
.verm{fill:url(#vm);stroke:#8C959C;stroke-width:1.3}
.wool{fill:url(#wool);stroke:#8C959C;stroke-width:1.3}
.rod{fill:#C6CDD2;stroke:#15181C;stroke-width:1.8}
.rodend{fill:#EBEEF0;stroke:#15181C;stroke-width:1.5}
.wall{fill:#D5DBDF;stroke:#5D666E;stroke-width:1.4}
.jig{fill:#E9DFC6;stroke:#9C8A63;stroke-width:1.5}
.paint{fill:#DEE6EC;stroke:#15181C;stroke-width:1.8}
.weldb{fill:#B02A1E;stroke:none}
.ball{fill:#FFFFFF;stroke:#15181C;stroke-width:1.8}
.gbox{fill:#F2F4F5;stroke:#AEB6BC;stroke-width:1.2}
.gbox2{fill:#FCEDEB;stroke:#B02A1E;stroke-width:1.4}
.isof{fill:#E9EDEF;stroke:#15181C;stroke-width:1.8}
.isos{fill:#D3DADE;stroke:#15181C;stroke-width:1.8}
.isot{fill:#F4F6F7;stroke:#15181C;stroke-width:1.6}
.isod{fill:#CBD2D6;stroke:#15181C;stroke-width:1.4}
.isod2{fill:#B7C0C6;stroke:#15181C;stroke-width:1.4}
.isoh{fill:#454C52;stroke:#15181C;stroke-width:1.3}
.isoinox{fill:#E6EEF3;stroke:#2C4A5E;stroke-width:1.8}
.isohole{fill:#363C42;stroke:#15181C;stroke-width:1.3}
.iso{fill:#E9EDEF;stroke:#15181C;stroke-width:1.6}
.lbl,.ann,.trl,.opl,.vs,.vlab{fill:#5D666E}
.annb,.dimt,.zt{fill:#1B4F8F}
.vt,.pn,.balt,.sect,.htitle,.glab,.nd,.ct1,.cv,.cvb,.nrep{fill:#15181C}
.vt,.sect{letter-spacing:.07em}
.hstep{fill:#B02A1E;letter-spacing:.2em}
.hlead,.gnote,.nm,.nq,.ct2,.nbx,.zn,.ck{fill:#5D666E}
.ck{letter-spacing:.11em}
.warn,.corr,.nbw{fill:#B02A1E}
.diagt,.nbg{fill:#1B6B45}
.gnum{fill:#1B4F8F}
.vghost{fill:#CBD2D6}
.ghostt{fill:#AEB6BC}
.castt{fill:#FFFFFF}
.jigt{fill:#9C8A63}
.wt{fill:#15181C}
.nbt{fill:#15181C;letter-spacing:.09em}
.nrep,.cvb,.gnum,.balt{font-family:'IBM Plex Mono',ui-monospace,monospace}
"""

CAPTIONS = {
 "F.00": ("Le brasero en entier, et la liste de tout ce qu'il faut débiter.",
          "Commence par là. La vue de face donne les 3 hauteurs à retenir : 645 pour le caisson, "
          "+100 de pieds, +150 pour la pyramide. Le tableau en bas à droite est ta liste de courses : "
          "chaque numéro entouré sur les plans renvoie à une ligne de ce tableau. La bande du bas, "
          "c'est l'ordre de montage — il n'est pas négociable."),
 "F.01": ("Avant de sortir le poste : on trace tout au feutre.",
          "Toutes les hauteurs du brasero se mesurent depuis le BAS de la paroi, jamais depuis le haut. "
          "Fabrique la réglette de 645 mm en premier : tu y reportes les 5 hauteurs une seule fois, puis tu "
          "l'appliques contre chaque paroi. C'est ce qui garantit que le rail de gauche et celui de droite "
          "seront exactement à la même hauteur."),
 "F.02": ("On monte une boîte à 3 côtés — la face avant reste ouverte.",
          "C'est l'étape que le PDF appelle « clé », et c'est vrai : si tu fermes la boîte maintenant, tu ne "
          "pourras plus souder les rails, les cornières et les traverses à l'intérieur. Tu pointes, tu vérifies "
          "que les deux diagonales du fond sont égales, et seulement après tu fais les cordons."),
 "F.03": ("Les 2 rails sur lesquels le tiroir va glisser.",
          "Une cornière de chaque côté, aile verticale contre la paroi, aile horizontale vers l'intérieur : "
          "c'est cette aile qui porte le bac. Le trait Z=433 est le DESSUS du rail, pas le dessous — c'est "
          "l'erreur classique. Vérifie avec une règle posée en travers : elle doit porter sur les deux rails."),
 "F.04": ("La grosse cornière qui portera la grille du foyer.",
          "60×60×6, c'est du lourd, et c'est normal : elle encaisse la grille en fonte, les braises et la "
          "vermiculite. Trois côtés seulement pour l'instant (arrière, gauche, droite) — celle de l'avant "
          "sera soudée à plat sur la face avant à l'étape 6. Décide dès le débit comment tu traites les angles."),
 "F.05": ("Une deuxième cornière par-dessus, pour rétrécir le trou.",
          "Le trou laissé par les A5 fait 376×376, une grille fonte du commerce fait 300×300 : elle tomberait "
          "dedans. Le cadre A5b ramène l'ouverture à 276×276, la grille repose alors sur 12 mm tout autour. "
          "Bonne nouvelle : cette cornière se pose sans mesurer, on la plaque contre le bord de la première."),
 "F.06": ("Trois barreaux au fond, pour surélever les bûches.",
          "Rien de compliqué : 3 plats en travers, à 25 mm du fond. L'astuce qui fait gagner du temps est en "
          "note : une cale bois de 23 mm sous chaque plat et la hauteur est bonne toute seule, sans mesurer."),
 "F.07": ("On équipe la face avant à plat sur l'établi, avant de la poser.",
          "Souder à plat, c'est deux fois plus rapide et beaucoup plus propre que de souder en l'air une fois "
          "la paroi montée. Quatre pièces, dans l'ordre 1-2-3-4. Le seul vrai piège : les hauteurs Z=591 et "
          "Z=433 doivent tomber pile sur celles déjà soudées dans le caisson."),
 "F.08": ("On ferme la boîte, puis on la met sur pieds.",
          "Avant de souder la face avant, présente-la à blanc et regarde les 4 angles : la cornière A5, la A5b "
          "et le rail doivent rejoindre exactement leurs jumeaux. C'est le dernier moment où un décalage se "
          "rattrape. Ensuite, retourne le caisson pour souder les pieds."),
 "F.09": ("Un cadre plat sur le dessus : c'est lui qui tiendra la pyramide.",
          "Quatre plats coupés à 45° aux deux bouts. Extérieur 504, intérieur 454 — et la pyramide fait 450 "
          "à sa base : il reste 2 mm de jeu tout autour pour l'engager. Le cadre déborde de 2 mm du caisson, "
          "c'est voulu, le cordon sera caché par la pyramide."),
 "F.10": ("La hotte pyramidale — attention, il y a une erreur dans le PDF d'origine.",
          "Le PDF cote 232 comme la hauteur du panneau à plat. C'est faux : 232 est la longueur du côté "
          "OBLIQUE. La hauteur du trapèze à plat vaut 195,4 mm. Si tu débites à 232 de haut, tes 4 panneaux "
          "seront trop grands et la pyramide ne fermera pas. Une fois montée, elle ne fait que 150 mm de haut."),
 "F.11": ("La plancha inox et ce qui se soude dessous.",
          "Deux règles à ne pas négocier : métal d'apport 309L pour tout ce qui touche l'inox (le 308L fissure "
          "à chaud), et brosse inox dédiée. Les nervures font 223 mm parce que c'est exactement la distance "
          "entre le bord de la plancha et le trou central."),
 "F.12": ("Les 3 poignées se fabriquent — on ne les achète pas.",
          "Chaque poignée, c'est 3 bouts de rond plein soudés en U. Aucun pli, aucune cintreuse : on coupe "
          "droit et on soude les angles. Fais les 3 sur le même gabarit, elles sortiront identiques."),
 "F.13": ("Le tiroir à cendres, sa façade et son registre d'air.",
          "Attention aux jeux : l'ouverture fait 460 de large, donc le bac doit faire 452 pour rentrer, et la "
          "façade doit être plus grande que l'ouverture pour la recouvrir. Le développé annoncé dans le PDF "
          "(620×300) ne colle pas avec les hauteurs de pliage — recalcule-le avec tes propres hauteurs."),
 "F.14": ("On pose les 2 poignées de transport — la seule soudure extérieure.",
          "Tout le reste du montage se soude à l'intérieur ; là, c'est sur la face extérieure des parois "
          "gauche et droite. Hauteur d'axe Z=420, prise centrée en profondeur. Cordon plein tout autour de "
          "chaque patte : ces deux poignées portent tout le brasero."),
 "F.15": ("Peinture, isolation, bardage — et la cuisson qui fait tout tenir.",
          "L'étape que tout le monde rate : la polymérisation. Après les 2 couches et 48 h de séchage, il faut "
          "un premier feu doux, montée progressive jusqu'à 300 °C pendant une heure. C'est cette cuisson qui "
          "transforme la peinture en céramique. Sans elle, tout s'écaille en quelques mois."),
 "F.16": ("Toutes les hauteurs sur une seule feuille — à garder sous les yeux.",
          "Cette planche ne remplace aucune étape : c'est ton aide-mémoire d'atelier. Toutes les cotes Z du "
          "montage, de Z=0 à Z=645, avec ce qu'il y a à chaque niveau. Plus la liste complète des profilés à "
          "débiter, et la check-list de contrôle avant peinture."),
}

SHORT = {"F.00": "Ensemble", "F.01": "Traçage", "F.02": "Demi-caisson", "F.03": "Rails",
         "F.04": "Cornières A5", "F.05": "Cadre A5b", "F.06": "Traverses",
         "F.07": "Face avant", "F.08": "Fermeture + pieds", "F.09": "Cadre A4",
         "F.10": "Pyramide", "F.11": "Plancha", "F.12": "Poignées", "F.13": "Tiroir",
         "F.14": "Pose poignées", "F.15": "Finitions", "F.16": "Synthèse"}

BUILDERS = [A.f00, A.f01, A.f02, A.f03, A.f04, A.f05,
            B.f06, B.f07, B.f08, B.f09, B.f10, B.f11,
            C.f12, C.f13, C.f14, C.f15, C.f16]


def legend_svg():
    """Petite planche de lecture des symboles."""
    sh = Sheet("LEG", "", "Légende", "")
    sh.b = []
    items = []

    def cell(cx, cy, draw, t1, t2):
        sh.rc(cx, cy, 300, 116, "gbox")
        draw(cx, cy)
        sh.tx(cx + 14, cy + 92, t1, "glab", "start", 14, w=700)
        sh.tx(cx + 14, cy + 108, t2, "gnote", "start", 11.5)

    def d_dim(x, y):
        sh.ln(x + 70, y + 26, x + 70, y + 62, "ext")
        sh.ln(x + 230, y + 26, x + 230, y + 62, "ext")
        sh.ln(x + 70, y + 52, x + 230, y + 52, "d")
        sh.arrow(x + 70, y + 52, 3.14159)
        sh.arrow(x + 230, y + 52, 0.0)
        sh.tx(x + 150, y + 45, "460", "dimt", "middle", 14)

    def d_ball(x, y):
        sh.cr(x + 90, y + 44, 17, "ball")
        sh.tx(x + 90, y + 49, "8", "balt", "middle", 15, w=700)
        sh.ln(x + 107, y + 44, x + 200, y + 60, "lead")
        sh.cr(x + 200, y + 60, 3.4, "fill")
        sh.rc(x + 195, y + 50, 70, 20, "steel")

    def d_hatch(x, y):
        sh.rc(x + 90, y + 30, 120, 40, "hatchp")

    def d_hid(x, y):
        sh.rc(x + 70, y + 28, 100, 44, "part")
        sh.rc(x + 130, y + 34, 110, 44, "hid")

    def d_trace(x, y):
        sh.rc(x + 70, y + 26, 160, 50, "part")
        sh.ln(x + 70, y + 56, x + 230, y + 56, "trace")

    def d_weld(x, y):
        sh.rc(x + 80, y + 26, 90, 14, "hatchp")
        sh.rc(x + 80, y + 40, 14, 40, "hatchp")
        sh.pg([(x + 94, y + 40), (x + 116, y + 40), (x + 94, y + 62)], "weldb")

    def d_iso(x, y):
        sh.ln(x + 90, y + 40, x + 140, y + 62, "wl")
        sh.ln(x + 140, y + 62, x + 250, y + 62, "wl")
        sh.arrow(x + 90, y + 40, 2.72, c="wf")
        sh.pg([(x + 174, y + 62), (x + 189, y + 62), (x + 174, y + 47)], "wf")
        sh.tx(x + 169, y + 58, "a4", "wt", "end", 13)

    def d_open(x, y):
        sh.rc(x + 70, y + 26, 160, 50, "part")
        sh.ln(x + 70, y + 76, x + 230, y + 76, "openl")

    cells = [
        (d_dim, "Ligne de cote", "la distance entre les 2 flèches vaut 460 mm"),
        (d_ball, "Repère en bulle", "renvoie à la ligne 8 de la nomenclature"),
        (d_hatch, "Hachures", "la pièce est coupée : on voit sa section"),
        (d_hid, "Traits interrompus", "pièce cachée, derrière ou dessous"),
        (d_trace, "Trait rouge tireté", "un trait à faire au feutre sur la tôle"),
        (d_weld, "Triangle rouge", "emplacement d'un cordon de soudure"),
        (d_iso, "Symbole ISO 2553", "cordon d'angle de gorge 4 mm, du côté de la flèche"),
        (d_open, "Trait rouge épais", "bord volontairement laissé ouvert"),
    ]
    for i, (fn, t1, t2) in enumerate(cells):
        cx = 20 + (i % 4) * 316
        cy = 20 + (i // 4) * 132
        cell(cx, cy, fn, t1, t2)
    body = "".join(sh.b)
    from draw import DEFS
    return ('<svg class="legend" viewBox="0 0 1284 284" xmlns="http://www.w3.org/2000/svg" '
            'role="img" aria-label="Légende des symboles">' + DEFS + body + "</svg>")


PAGE_CSS = """
:root{
  --ground:#D8DCDF; --ground-2:#C9CFD3; --surface:#FFFFFF; --surface-2:#F1F3F5;
  --ink:#15181C; --ink-2:#4E565D; --ink-3:#79828A; --line:#B9C0C6;
  --blue:#1B4F8F; --red:#B02A1E; --green:#1B6B45;
  --shadow:0 1px 2px rgba(20,24,28,.14), 0 12px 32px -12px rgba(20,24,28,.35);
}
:root:not([data-theme="light"]) , :root[data-theme="light"]{}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#111417; --ground-2:#0B0D0F; --surface:#1A1E22; --surface-2:#22272B;
    --ink:#E9ECEE; --ink-2:#AFB7BE; --ink-3:#828C94; --line:#333A40;
    --blue:#7EA9DC; --red:#E8867A; --green:#6FBE95;
    --shadow:0 1px 2px rgba(0,0,0,.5), 0 14px 34px -14px rgba(0,0,0,.7);
  }
}
:root[data-theme="dark"]{
  --ground:#111417; --ground-2:#0B0D0F; --surface:#1A1E22; --surface-2:#22272B;
  --ink:#E9ECEE; --ink-2:#AFB7BE; --ink-3:#828C94; --line:#333A40;
  --blue:#7EA9DC; --red:#E8867A; --green:#6FBE95;
  --shadow:0 1px 2px rgba(0,0,0,.5), 0 14px 34px -14px rgba(0,0,0,.7);
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
  font-family:'IBM Plex Sans',system-ui,-apple-system,Segoe UI,sans-serif;
  font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1560px;margin:0 auto;padding:0 24px 96px}
h1,h2,h3{font-family:'Archivo Narrow','Arial Narrow',Arial,sans-serif;
  text-wrap:balance;margin:0;letter-spacing:.01em}

/* --- en-tete --- */
header.top{padding:56px 0 28px;border-bottom:1px solid var(--line)}
.eyebrow{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.22em;text-transform:uppercase;color:var(--red);margin:0 0 14px}
h1{font-size:clamp(34px,5.2vw,58px);font-weight:700;line-height:1.02;max-width:20ch}
header.top p{margin:16px 0 0;max-width:66ch;color:var(--ink-2);font-size:16.5px}
.meta{display:flex;flex-wrap:wrap;gap:10px 28px;margin-top:24px;
  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.06em;color:var(--ink-3);text-transform:uppercase}
.meta b{color:var(--ink-2);font-weight:500}

/* --- index colle --- */
nav.idx{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--ground) 88%,transparent);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--line);margin-bottom:40px}
nav.idx .in{max-width:1560px;margin:0 auto;padding:10px 24px;display:flex;gap:6px;
  overflow-x:auto;scrollbar-width:thin}
nav.idx a{flex:0 0 auto;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;
  letter-spacing:.05em;text-decoration:none;color:var(--ink-2);border:1px solid var(--line);
  padding:5px 10px;border-radius:2px;background:var(--surface-2);white-space:nowrap}
nav.idx a:hover{color:var(--ink);border-color:var(--ink-3)}
nav.idx a:focus-visible{outline:2px solid var(--blue);outline-offset:2px}

/* --- blocs de texte --- */
.panel{background:var(--surface);border:1px solid var(--line);border-radius:3px;
  padding:26px 30px;box-shadow:var(--shadow)}
.panel h2{font-size:22px;font-weight:700;margin-bottom:6px}
.lead{color:var(--ink-2);max-width:74ch}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px;margin:34px 0 44px}
.fix{border-left:3px solid var(--red);padding-left:16px}
.fix h3{font-size:15.5px;font-weight:700;margin-bottom:3px}
.fix p{margin:0;color:var(--ink-2);font-size:14.5px}
.fix code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;
  background:var(--surface-2);padding:1px 5px;border-radius:2px;color:var(--ink)}

/* --- legende --- */
.legwrap{margin:0 0 48px}
.legwrap h2{font-size:19px;margin-bottom:4px}
.legwrap .sub{color:var(--ink-2);font-size:14.5px;margin:0 0 18px}
svg.legend{display:block;width:100%;height:auto;background:#FFFFFF;border:1px solid var(--line);
  border-radius:3px;overflow-x:auto}

/* --- planches --- */
section.sh{margin:0 0 64px;scroll-margin-top:64px}
.cap{display:flex;gap:22px;align-items:flex-start;margin:0 0 14px;flex-wrap:wrap}
.cap .code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:26px;font-weight:600;
  color:var(--red);line-height:1;padding-top:3px;flex:0 0 auto}
.cap .txt{flex:1 1 420px;min-width:0}
.cap h2{font-size:21px;font-weight:700;line-height:1.25;margin-bottom:5px}
.cap p{margin:0;color:var(--ink-2);max-width:88ch;font-size:15px}
.paper{background:#FFFFFF;border:1px solid var(--line);border-radius:3px;
  box-shadow:var(--shadow);overflow:hidden}
svg.sheet{display:block;width:100%;height:auto}

footer{border-top:1px solid var(--line);padding-top:26px;margin-top:20px;
  color:var(--ink-3);font-size:13.5px;max-width:80ch}
footer b{color:var(--ink-2)}
@media print{
  body{background:#fff}
  nav.idx,header.top,.cols,.legwrap,footer{display:none}
  .wrap{max-width:none;padding:0}
  .cap{display:none}
  section.sh{margin:0}
  .paper{border:0;box-shadow:none;border-radius:0;page-break-after:always}
  @page{size:A3 landscape;margin:6mm}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
"""


def build(out):
    sheets = [b() for b in BUILDERS]
    parts = []
    parts.append("<title>Plans d'atelier Brasero V24</title>")
    parts.append('<link rel="preconnect" href="https://fonts.googleapis.com">')
    parts.append('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
    parts.append('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
                 'family=Archivo+Narrow:wght@400;500;600;700&'
                 'family=IBM+Plex+Mono:wght@400;500;600&'
                 'family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">')
    parts.append("<style>" + PAGE_CSS + "\nsvg{" + "" + "}\n" + "</style>")
    parts.append("<style>" + SVG_CSS.replace("\n", "") + "</style>")

    parts.append('<nav class="idx"><div class="in">')
    parts.append('<a href="#lire">Comment lire</a>')
    for s in sheets:
        parts.append(f'<a href="#{s.code}">{e(s.code)} · {e(SHORT.get(s.code, s.title))}</a>')
    parts.append("</div></nav>")

    parts.append('<div class="wrap">')
    parts.append("""<header class="top">
<p class="eyebrow">Jeu de plans · 17 planches A3</p>
<h1>Brasero Bigorneau V24</h1>
<p>Le guide d'origine redessiné en plans d'atelier : une planche par étape, au format A3,
avec cadre, cartouche, nomenclature à repères, cotes fléchées et symboles de soudure —
la même lecture qu'un plan de fabrication classique. Chaque planche est précédée d'une
explication en clair de ce qu'elle demande de faire.</p>
<div class="meta">
<span><b>Origine</b> Guide de montage Brasero V24</span>
<span><b>Cotes</b> mm · Z=0 au dessus du fond A2</span>
<span><b>Tolérances</b> ISO 2768-m</span>
<span><b>Impression</b> A3 paysage</span>
</div>
</header>""")

    parts.append("""<div class="cols">
<div class="panel">
<h2>Trois corrections par rapport au PDF d'origine</h2>
<p class="lead">Elles sont reportées sur les planches concernées, en rouge. Vérifie-les avant de débiter.</p>
<div class="cols" style="margin:20px 0 0;gap:18px;grid-template-columns:1fr">
<div class="fix"><h3>Pyramide — la cote 232 n'est pas la hauteur</h3>
<p>Le PDF cote <code>232</code> comme hauteur du panneau à plat. C'est la longueur du <b>côté oblique</b>.
La hauteur du trapèze à plat vaut <code>195,4 mm</code>. Débitée à 232, la pyramide ne ferme pas.
Planche F.10.</p></div>
<div class="fix"><h3>Tiroir — développé et jeux</h3>
<p>Le développé annoncé (<code>620×300</code>) ne correspond pas aux hauteurs de pliage décrites.
Et un bac de 460 ne passe pas dans une ouverture de 460 : prévoir <code>452</code> et une façade
qui recouvre. Planche F.13.</p></div>
<div class="fix"><h3>Cornière A5b — repère de hauteur</h3>
<p>La coupe d'origine porte deux cotes (<code>586</code> et <code>591</code>). Le repère retenu ici est
celui de toutes les autres étapes : <b>dessus de l'aile du A5 = Z 591</b>, dessus du A5b = Z 596.
Planche F.05.</p></div>
</div>
</div>
<div class="panel">
<h2>Comment ces planches sont organisées</h2>
<p class="lead">Chaque planche est autonome : elle contient tout ce qu'il faut pour faire l'étape, sans
avoir à revenir en arrière.</p>
<div class="cols" style="margin:20px 0 0;gap:18px;grid-template-columns:1fr">
<div class="fix" style="border-color:var(--blue)"><h3>En haut à gauche</h3>
<p>Le numéro de l'étape, ce qu'elle fait, et la consigne en une phrase.</p></div>
<div class="fix" style="border-color:var(--blue)"><h3>Au centre</h3>
<p>Les vues : de face, de dessus, en coupe, et les détails agrandis des points délicats.</p></div>
<div class="fix" style="border-color:var(--blue)"><h3>En bas à droite</h3>
<p>La nomenclature — les pièces de l'étape avec leur repère — et le cartouche.</p></div>
<div class="fix" style="border-color:var(--blue)"><h3>En bas à gauche</h3>
<p>Le mode opératoire numéroté. Les lignes rouges sont les pièges, les vertes les contrôles.</p></div>
</div>
</div>
</div>""")

    parts.append('<div class="legwrap" id="lire">')
    parts.append("<h2>Comment lire les plans</h2>")
    parts.append('<p class="sub">Les huit signes qui reviennent sur toutes les planches.</p>')
    parts.append(legend_svg())
    parts.append("</div>")

    for s in sheets:
        t1, t2 = CAPTIONS.get(s.code, ("", ""))
        parts.append(f'<section class="sh" id="{s.code}">')
        parts.append('<div class="cap">')
        parts.append(f'<div class="code">{e(s.code)}</div>')
        parts.append(f'<div class="txt"><h2>{e(t1)}</h2><p>{e(t2)}</p></div>')
        parts.append("</div>")
        parts.append('<div class="paper">' + render(s) + "</div>")
        parts.append("</section>")

    parts.append("""<footer>
<p><b>Ce document est un redessin</b> du guide de montage Brasero V24 : toutes les cotes en proviennent,
sauf les trois corrections signalées en rouge et les jeux d'assemblage ajoutés là où le guide n'en donnait
pas. En cas d'écart entre une planche et le guide d'origine, c'est la géométrie qui tranche — refais le
calcul avant de couper.</p>
</footer>""")
    parts.append("</div>")
    open(out, "w", encoding="utf-8").write("\n".join(parts))
    return len(sheets)


if __name__ == "__main__":
    n = build(sys.argv[1] if len(sys.argv) > 1 else "plans.html")
    print("planches :", n)
