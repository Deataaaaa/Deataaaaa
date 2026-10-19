import io
import json
from types import SimpleNamespace

import pytest
from PIL import Image

from cuscan import vision
from cuscan.materials import load_catalog


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (3000, 2000), (180, 90, 40)).save(buf, format="PNG")
    return buf.getvalue()


class _FakeMessages:
    def __init__(self, payload, stop_reason="end_turn"):
        self.payload = payload
        self.stop_reason = stop_reason
        self.kwargs = None

    def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            stop_reason=self.stop_reason,
            content=[SimpleNamespace(type="text", text=json.dumps(self.payload))],
        )


def _client(msgs):
    return SimpleNamespace(beta=SimpleNamespace(messages=msgs))


PAYLOAD = {
    "material_key": "cable_domestique",
    "description": "Rouleau de câble R2V 3G2,5",
    "confiance": 1.4,
    "poids_estime_kg": 3,
    "teneur_cuivre_estimee": 0.45,
    "conseils": "Dénudez-le.",
    "suspect_infrastructure": False,
    "raison_suspicion": "",
}


def test_identify_parse_et_borne():
    cat = load_catalog()
    msgs = _FakeMessages(PAYLOAD)
    res = vision.identify([_png()], cat, client=_client(msgs))
    assert res.material_key == "cable_domestique"
    assert res.confiance == 1.0  # borné à 1
    schema = msgs.kwargs["output_config"]["format"]["schema"]
    assert "inconnu" in schema["properties"]["material_key"]["enum"]
    img = msgs.kwargs["messages"][0]["content"][0]
    assert img["source"]["media_type"] == "image/jpeg"


def test_identify_refus():
    with pytest.raises(vision.VisionError):
        vision.identify([_png()], load_catalog(), client=_client(_FakeMessages(PAYLOAD, "refusal")))


def test_image_illisible():
    with pytest.raises(vision.VisionError):
        vision.identify([b"pas une image"], load_catalog(), client=_client(_FakeMessages(PAYLOAD)))


def test_redimensionnement():
    data = vision._prepare_image(_png())
    import base64
    img = Image.open(io.BytesIO(base64.b64decode(data)))
    assert max(img.size) <= vision.MAX_SIDE_PX
