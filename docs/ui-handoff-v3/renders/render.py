import asyncio, json, os, re
from playwright.async_api import async_playwright
ROOT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'design')
OUT=os.path.dirname(os.path.abspath(__file__))
idx=json.load(open(os.path.join(ROOT,'canvas.json')))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,board in idx['boards'].items():
            html=open(os.path.join(ROOT,name)).read()
            # strip the runtime script tag and the dc script; keep helmet styles
            html=html.replace('<script src="./support.js"></script>','')
            html=re.sub(r'<script data-dc-script.*?</script>','',html,flags=re.S)
            html=html.replace('<helmet>','<div>').replace('</helmet>','</div>')
            pg=await b.new_page(viewport={'width':board['w'],'height':board['h']}, device_scale_factor=2)
            await pg.set_content(html, wait_until='networkidle')
            await pg.wait_for_timeout(600)
            await pg.screenshot(path=os.path.join(OUT, name.replace('.dc.html','.png')))
            await pg.close()
        await b.close()
asyncio.run(main())
print(sorted(os.listdir(OUT)))
