import pytest

from cuscan import calc


def test_exemple_du_brief():
    # 10 kg de câble, 40 % de cuivre, 10 €/kg, rachat 85 %, achat 20 €
    p = calc.point(10, 0.40, 10, 0.85, 20)
    assert p.masse_cuivre_kg == pytest.approx(4)
    assert p.valeur_brute == pytest.approx(34)
    assert p.valeur_nette == pytest.approx(34)
    assert p.marge == pytest.approx(14)
    assert p.ratio == pytest.approx(1.7)


def test_frais():
    p = calc.point(10, 0.40, 10, 0.85, 20, calc.Costs(frais_fixes=4, frais_pct=0.10))
    assert p.frais == pytest.approx(4 + 3.4)
    assert p.valeur_nette == pytest.approx(34 - 7.4)


def test_objet_gratuit_ratio_none():
    p = calc.point(10, 0.40, 10, 0.85, 0)
    assert p.ratio is None
    assert p.marge == pytest.approx(34)


def test_poids_nul():
    est = calc.estimate(0, 0.3, 0.5, 10, 0.8, 5)
    assert est.low.valeur_nette == 0
    assert est.high.marge == pytest.approx(-5)
    assert est.prix_seuil_min is None


def test_prix_seuil_donne_marge_nulle():
    costs = calc.Costs(frais_fixes=3, frais_pct=0.05)
    seuil = calc.prix_seuil(10, 0.4, 0.85, 20, costs)
    assert calc.point(10, 0.4, seuil, 0.85, 20, costs).marge == pytest.approx(0)


def test_estimate_fourchette_ordonnee():
    est = calc.estimate(10, 0.35, 0.6, 12, 0.8, 30)
    assert est.low.valeur_nette < est.high.valeur_nette
    assert est.prix_seuil_min < est.prix_seuil_max


@pytest.mark.parametrize(
    "kwargs",
    [
        dict(poids_kg=-1),
        dict(prix_cuivre=-1),
        dict(rachat_pct=1.5),
        dict(prix_achat=-1),
        dict(copper_pct=1.2),
    ],
)
def test_entrees_invalides(kwargs):
    args = dict(poids_kg=1, copper_pct=0.5, prix_cuivre=10, rachat_pct=0.8, prix_achat=1) | kwargs
    with pytest.raises(ValueError):
        calc.point(**args)


def test_fourchette_inversee():
    with pytest.raises(ValueError):
        calc.estimate(1, 0.6, 0.3, 10, 0.8, 1)


def test_upgrade_denudage():
    # 10 kg de câble à 50 %, cours 10 €/kg, rachat 80 % -> 90 %, 4 kg/h, 15 €/h
    u = calc.upgrade(10, 0.5, 0.5, 10, 0.80, 0.90, 4, 15)
    assert u.heures == pytest.approx(2.5)
    assert u.gain_brut_low == pytest.approx(5)
    assert u.cout_temps == pytest.approx(37.5)
    assert u.gain_net_low == pytest.approx(-32.5)


def test_upgrade_vitesse_nulle():
    with pytest.raises(ValueError):
        calc.upgrade(1, 0.5, 0.5, 10, 0.8, 0.9, 0, 15)
