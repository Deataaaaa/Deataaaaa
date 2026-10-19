"""Interface Streamlit de CuScan. Lancer avec : streamlit run app.py"""

from __future__ import annotations

import csv
import io
import os
import time

import streamlit as st

from cuscan import advice, calc, history, prices, vision
from cuscan.materials import load_catalog

st.set_page_config(page_title="CuScan", page_icon="🟠", layout="centered")


@st.cache_data
def _catalog():
    return load_catalog()


catalog = _catalog()


def num(x: float, d: int = 2) -> str:
    return f"{x:,.{d}f}".replace(",", " ").replace(".", ",")


def eur(x: float) -> str:
    return f"{num(x)} €"


# --- Barre latérale : cours et frais -------------------------------------------------

with st.sidebar:
    st.header("Cours du cuivre")
    quote = None
    try:
        quote = prices.get_quote(force=st.button("Actualiser le cours"))
    except Exception as e:
        st.warning(f"Cours en ligne indisponible ({e.__class__.__name__}). Saisissez-le à la main.")

    if quote:
        age_min = (time.time() - quote.fetched_at) / 60
        st.caption(
            f"{quote.usd_per_lb:.3f} \\$/lb × {quote.usd_eur:.4f} €/\\$ = **{num(quote.eur_per_kg)} €/kg**  \n"
            f"Source : {quote.source}, il y a {age_min:.0f} min."
        )
    manuel = st.checkbox("Saisir le cours à la main", value=quote is None)
    if manuel or quote is None:
        cours = st.number_input("Cours (€/kg de cuivre pur)", min_value=0.0, value=quote.eur_per_kg if quote else 12.0, step=0.1)
        source_cours = "saisie manuelle"
    else:
        cours = quote.eur_per_kg
        source_cours = quote.source

    st.header("Frais")
    frais_fixes = st.number_input("Frais fixes (transport, carburant) €", min_value=0.0, value=0.0, step=1.0)
    frais_pct = st.slider("Frais en % de la valeur", 0, 50, 0, help="Commission, décote de tri…") / 100
    taux_horaire = st.number_input("Valeur de votre heure de travail €/h", min_value=0.0, value=15.0, step=1.0)
    costs = calc.Costs(frais_fixes=frais_fixes, frais_pct=frais_pct)

st.title("CuScan")
st.caption("Estimation du cuivre contenu dans un objet et de sa rentabilité. Toutes les valeurs sont **indicatives**.")

tab_scan, tab_hist, tab_mat = st.tabs(["Scanner", "Historique", "Matériaux"])

# --- Onglet Scanner ------------------------------------------------------------------

with tab_scan:
    st.subheader("1. Photo de l'objet")
    photos = st.file_uploader("Photos (jusqu'à 5)", type=["jpg", "jpeg", "png", "webp"], accept_multiple_files=True)
    with st.expander("Prendre une photo avec la caméra"):
        cam = st.camera_input("Caméra")

    images = [f.getvalue() for f in (photos or [])]
    if cam:
        images.append(cam.getvalue())

    has_key = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
    if images and st.button("Identifier l'objet", type="primary", disabled=not has_key):
        with st.spinner("Analyse en cours…"):
            try:
                st.session_state["ident"] = vision.identify(images, catalog)
            except vision.VisionError as e:
                st.error(str(e))
    if images and not has_key:
        st.info("Définissez ANTHROPIC_API_KEY pour l'identification automatique. Vous pouvez aussi choisir le type d'objet à la main ci-dessous.")

    ident: vision.Identification | None = st.session_state.get("ident")
    if ident:
        st.success(f"**{ident.description}** (confiance {ident.confiance:.0%})")
        if ident.conseils:
            st.write(ident.conseils)
        if ident.suspect_infrastructure:
            st.error(
                "⚠️ Cet objet ressemble à du matériel de réseau public ou d'entreprise. "
                f"{ident.raison_suspicion} "
                "Ne l'achetez pas et ne le revendez pas sans preuve d'origine : le recel de métaux volés est un délit."
            )

    st.subheader("2. Type d'objet et poids")
    keys = list(catalog.materials)
    default_idx = keys.index(ident.material_key) if ident and ident.material_key in keys else 0
    if ident and ident.material_key == vision.UNKNOWN:
        st.warning("Objet non reconnu dans la base : choisissez la catégorie la plus proche et ajustez la teneur à la main.")
    key = st.selectbox("Catégorie", keys, index=default_idx, format_func=lambda k: catalog.materials[k].label)
    mat = catalog.materials[key]
    grade = catalog.grade_of(mat)

    c1, c2 = st.columns(2)
    poids_defaut = ident.poids_estime_kg if ident and ident.poids_estime_kg > 0 else 1.0
    poids = c1.number_input("Poids pesé (kg)", min_value=0.0, value=float(poids_defaut), step=0.1)
    prix_achat = c2.number_input("Prix d'achat (€)", min_value=0.0, value=0.0, step=1.0, help="0 si l'objet est gratuit")
    if ident and ident.poids_estime_kg > 0:
        st.caption(f"Poids estimé sur photo : {ident.poids_estime_kg:.1f} kg. Pesez pour un résultat fiable.")

    lo, hi = st.slider(
        "Teneur en cuivre (fourchette)",
        0,
        100,
        (round(mat.copper_pct_min * 100), round(mat.copper_pct_max * 100)),
        help="Valeurs par défaut issues de data/materials.json",
    )
    lo, hi = lo / 100, hi / 100
    if ident and ident.material_key == key:
        st.caption(f"Estimation du modèle d'après la photo : {ident.teneur_cuivre_estimee:.0%}.")
    rachat = st.slider(f"Rachat ferrailleur pour « {grade.label} » (% du cours)", 0, 100, round(grade.rachat_pct * 100)) / 100

    # --- Résultats ---
    st.subheader("3. Résultat")
    est = calc.estimate(poids, lo, hi, cours, rachat, prix_achat, costs)

    m1, m2, m3 = st.columns(3)
    m1.metric("Cuivre contenu", f"{num(est.low.masse_cuivre_kg)} – {num(est.high.masse_cuivre_kg)} kg")
    m2.metric("Valeur nette", f"{eur(est.low.valeur_nette)} – {eur(est.high.valeur_nette)}")
    if prix_achat > 0:
        m3.metric("Marge", f"{eur(est.low.marge)} – {eur(est.high.marge)}")
        st.write(
            f"**Ratio valeur / prix d'achat : {num(est.low.ratio)} – {num(est.high.ratio)}** "
            "(au-dessus de 1, l'achat est rentable)."
        )
        if est.prix_seuil_min is not None:
            st.write(
                f"**Cours seuil de rentabilité :** {num(est.prix_seuil_min)} à {num(est.prix_seuil_max)} €/kg "
                f"(cours actuel {num(cours)} €/kg)."
            )
    else:
        m3.metric("Marge", "objet gratuit")

    with st.expander("Détail du calcul"):
        st.write(
            f"masse de cuivre = {poids:g} kg × teneur ({lo:.0%}–{hi:.0%})  \n"
            f"valeur brute = masse × {cours:.2f} €/kg × rachat {rachat:.0%}  \n"
            f"frais = {frais_fixes:.2f} € + {frais_pct:.0%} de la valeur brute  \n"
            f"valeur nette = valeur brute − frais ; marge = valeur nette − prix d'achat  \n"
            f"Cours : {source_cours}."
        )

    upg = upg_grade = None
    if mat.valorisation:
        upg_grade = catalog.grades[mat.valorisation.grade]
        upg = calc.upgrade(
            poids, lo, hi, cours, rachat, upg_grade.rachat_pct, mat.valorisation.kg_objet_par_heure, taux_horaire, costs
        )

    st.subheader("4. Conseils pour revendre vite")
    for line in advice.advise(mat, grade, est, prix_achat, upg, upg_grade):
        st.markdown(f"- {line}")

    if st.button("Enregistrer dans l'historique"):
        history.save(
            {
                "objet": mat.label,
                "description": ident.description if ident else "",
                "poids_kg": poids,
                "teneur_min": lo,
                "teneur_max": hi,
                "cours_eur_kg": cours,
                "rachat_pct": rachat,
                "prix_achat": prix_achat,
                "valeur_nette_min": est.low.valeur_nette,
                "valeur_nette_max": est.high.valeur_nette,
                "marge_min": est.low.marge,
                "marge_max": est.high.marge,
            }
        )
        st.success("Estimation enregistrée.")

# --- Onglet Historique ---------------------------------------------------------------

with tab_hist:
    rows = history.load_all()
    if not rows:
        st.info("Aucune estimation enregistrée.")
    else:
        st.dataframe(rows, use_container_width=True, hide_index=True)
        total_lo = sum(r["valeur_nette_min"] for r in rows)
        total_hi = sum(r["valeur_nette_max"] for r in rows)
        st.write(f"**Valeur nette totale du stock : {eur(total_lo)} – {eur(total_hi)}**")

        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=history.COLUMNS, delimiter=";")
        w.writeheader()
        w.writerows(rows)
        st.download_button("Exporter en CSV", buf.getvalue(), "cuscan_historique.csv", "text/csv")

        to_del = st.selectbox("Supprimer une ligne", [None] + [r["id"] for r in rows],
                              format_func=lambda i: "—" if i is None else f"#{i}")
        if to_del is not None and st.button("Supprimer"):
            history.delete(to_del)
            st.rerun()

# --- Onglet Matériaux ----------------------------------------------------------------

with tab_mat:
    st.caption("Base éditable : data/materials.json. Calibrez-la avec vos pesées et les tickets de vos ferrailleurs.")
    st.dataframe(
        [
            {
                "Objet": m.label,
                "Teneur min": f"{m.copper_pct_min:.0%}",
                "Teneur max": f"{m.copper_pct_max:.0%}",
                "Grade": catalog.grades[m.grade].label,
                "Rachat": f"{catalog.grades[m.grade].rachat_pct:.0%}",
                "Valorisation": m.valorisation.action if m.valorisation else "",
            }
            for m in catalog.materials.values()
        ],
        use_container_width=True,
        hide_index=True,
    )
