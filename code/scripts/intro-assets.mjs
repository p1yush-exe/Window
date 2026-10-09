/** Regenerates the intro images in public/intro from assets/open.png and assets/door.png. */
import { execFileSync } from 'node:child_process'
const py = `
from PIL import Image
import os
src='../assets/'
im=Image.open(src+'open.png').convert('RGB')
im.save('public/intro/storefront.jpg', quality=82, optimize=True, progressive=True)
d=Image.open(src+'door.png').convert('RGBA')
print('door canvas', d.size, 'panel bbox', d.split()[-1].getbbox())
d.save('public/intro/door.webp', quality=88, method=6)
for f in ('storefront.jpg','door.webp'): print(f, os.path.getsize('public/intro/'+f)//1024, 'KB')
`
console.log(execFileSync('python3', ['-c', py]).toString())
