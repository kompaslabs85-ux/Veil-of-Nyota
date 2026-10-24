import sys
from PIL import Image
from rembg import remove
A='/cursor/stores/store-dfa4e1cf-18d6-4020-86dd-1f110ab9f2f0/grok-bot/agents/05cee75d-226a-4a55-966f-3e4902e869c5/attachments'
src={'jabari':'63a00820ce9dc17e423f65ba0fc099909a4c04a5add7b3d94ee7e521a40bc26a','amanirenas':'6efbe8db9a137240dd41b17202f8538427d5101b308cc0df86bf1f64426b9710','meilin':'e1e26e92b5c73bd203718bc0a165ccb351745bbde2168d05211c9bcd4917b021','thandeka':'b517e767812b740ca653c344c4f15b8bafaeaa0db855ac007037132c66abc493','vael':'801eedf2afb9cb649710ae9824e9e9071a89c0b2dc09c92639e2dd3e2eb03158'}
only=__import__('sys').argv[1:]
for k,h in src.items():
    if only and k not in only: continue
    im=remove(Image.open(f'{A}/{h}.jpg').convert('RGB')).convert('RGBA')
    im=im.crop(im.getbbox())
    # 4 idle frames: subtle breathing squash/sway (geometry only, no colour change)
    frames=[(1,1,0),(1.01,0.99,0),(1,1.01,0),(0.99,1,0)]
    for i,(sx,sy,_) in enumerate(frames):
        w,h2=im.size; f=im.resize((int(w*sx),int(h2*sy)),Image.LANCZOS)
        for t in (1,2,3,4):
            H=64*t; W=round(f.width*H/f.height)
            f.resize((W,H),Image.LANCZOS).save(f'assets/v2/h_{k}{i}@{t}x.webp',quality=90)
        if i in (0,3):
            for t in (1,2,3,4):
                H=272*t if t>1 else 300; W=round(f.width*H/f.height)
                f.resize((W,H),Image.LANCZOS).save(f'assets/v2/hs_{k}{i}@{t}x.webp',quality=90)
    print(k,im.size)
