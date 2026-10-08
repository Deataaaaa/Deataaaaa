#!/usr/bin/env bash
# Fetch Rocketbox avatars (Microsoft Rocketbox library, MIT licence) into engine/models/rocketbox/<Name>/:
# the FBX rig + textures converted from 2048² TGA to JPG/PNG (colour, normal, specular; opacity keeps alpha).
# Usage: tools/fetch_rocketbox.sh Female_Adult_12 Male_Adult_10 Sports_Male_04 ...
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=${ROCKETBOX_REPO:-/home/user/microsoft/microsoft-rocketbox}
if [ ! -d "$REPO/.git" ]; then
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --no-checkout https://github.com/microsoft/microsoft-rocketbox "$REPO"
fi
for n in "$@"; do
  src=$(git -C "$REPO" ls-tree -d --name-only HEAD Assets/Avatars/Adults/"$n" Assets/Avatars/Professions/"$n" Assets/Avatars/Children/"$n" | head -1)
  [ -n "$src" ] || { echo "unknown avatar $n" >&2; exit 1; }
  out=engine/models/rocketbox/$n; mkdir -p "$out/raw"
  git -C "$REPO" show "HEAD:$src/Export/$n.fbx" > "$out/$n.fbx"
  git -C "$REPO" show "HEAD:$src/Export/${n}_facial.fbx" > "$out/${n}_facial.fbx" || true
  git -C "$REPO" show "HEAD:$src/$n.png" > "$out/preview.png" || true
  for f in $(git -C "$REPO" ls-tree --name-only HEAD "$src/Textures/" | grep -i '\.tga$'); do
    git -C "$REPO" show "HEAD:$f" > "$out/raw/$(basename "$f")"
  done
  python3 -I - "$out" <<'PY'
import os, sys
from PIL import Image
out = sys.argv[1]; raw = os.path.join(out, 'raw')
for f in sorted(os.listdir(raw)):
    im = Image.open(os.path.join(raw, f)); base = os.path.splitext(f)[0]
    if 'opacity' in base:
        im.convert('RGBA').save(os.path.join(out, base + '.png'), optimize=True)
    elif 'normal' in base:
        im.convert('RGB').save(os.path.join(out, base + '.png'), optimize=True)
    else:
        im.convert('RGB').save(os.path.join(out, base + '.jpg'), quality=93)
    print(out, base, im.size, im.mode)
import json
files = sorted(f for f in os.listdir(out) if f.endswith(('.jpg', '.png')) and f != 'preview.png')
code = next(f.split('_')[0] for f in files if '_body_color' in f)
json.dump({'name': os.path.basename(out), 'code': code, 'files': files}, open(os.path.join(out, 'avatar.json'), 'w'), indent=1)
PY
  rm -r "$out/raw"
done
