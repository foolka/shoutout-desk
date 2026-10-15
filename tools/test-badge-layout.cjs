const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DEFAULT_STYLE,FONTS}=require('../core/badges/config.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/badge-layout');
fs.mkdirSync(out,{recursive:true});
const avatar='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/icon.png')).toString('base64');
const cases=[
  {id:'short',name:'Amy',description:''},
  {id:'blank-description',name:'Amy',description:'   '},
  {id:'descenders',name:'Sayrek_Liss',description:'gyp_jq',style:{fontSize:42}},
  {id:'normal',name:'Sayrek_Liss',description:'Игры готовка уютный чат и весёлые вечерние стримы'},
  {id:'long',name:'long_streamer_name_123456',description:'A longer description with descenders: gyp_jq. '.repeat(3)},
  {id:'maximum',name:'long_streamer_name_123456',description:'longdescriptionwithoutspaces_'.repeat(4),style:{paddingX:48,paddingY:32,borderWidth:12,fontSize:48,descriptionSize:26,avatarSize:120,gap:36}}
];
let browser;
(async()=>{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setContent('<!doctype html><html><body class="overlay"><div id="stage" class="badge-stage"></div></body></html>');
  await page.addStyleTag({path:path.join(root,'core/badges/web/badge.css')});
  await page.addScriptTag({path:path.join(root,'core/badges/web/render.js')});
  await page.evaluate(()=>{window.view=new BadgeView(document.querySelector('#stage'));});
  let count=0;
  for(const [width,height]of [[560,560],[320,480],[280,280],[720,240]]){
    await page.setViewportSize({width,height});
    for(const font of FONTS)for(const item of cases){
      const style={...DEFAULT_STYLE,...item.style,font};
      await page.evaluate(data=>window.view.render(data),{...item,login:item.name,style,avatar});
      await page.waitForFunction(()=>document.querySelector('.badge-avatar img').naturalWidth>0);
      const result=await page.evaluate(()=>{
        const card=document.querySelector('.shoutout-badge'),copy=document.querySelector('.badge-copy'),name=document.querySelector('.badge-name'),description=document.querySelector('.badge-description');
        const a=document.querySelector('.badge-avatar').getBoundingClientRect(),c=card.getBoundingClientRect(),t=copy.getBoundingClientRect(),n=name.getBoundingClientRect(),d=description.getBoundingClientRect();
        const s=getComputedStyle(card),ns=getComputedStyle(name),ds=getComputedStyle(description),scale=c.width/card.offsetWidth;
        const edge=(parseFloat(s.borderTopWidth)+parseFloat(s.paddingTop))*scale;
        const bottomEdge=(parseFloat(s.borderBottomWidth)+parseFloat(s.paddingBottom))*scale;
        const rows=new Map();
        for(const match of description.textContent.matchAll(/\S+/g)){
          const range=document.createRange();range.setStart(description.firstChild,match.index);range.setEnd(description.firstChild,match.index+match[0].length);
          const top=Math.round(range.getBoundingClientRect().top);rows.set(top,(rows.get(top)||0)+1);
        }
        return {
          centerError:Math.max(...[a,t,n].map(r=>Math.abs((r.left+r.right)/2-(c.left+c.right)/2))),
          fits:t.top>=c.top+edge-1&&t.bottom<=c.bottom-bottomEdge+1&&a.top>=c.top+edge-1&&a.bottom<=c.bottom-bottomEdge+1,
          nameFits:name.scrollWidth<=name.clientWidth+1&&n.bottom<=t.bottom+1,
          vertical:a.bottom<n.top&&(!d.height||n.bottom<=d.top),
          descriptionFits:!d.height||description.scrollWidth<=description.clientWidth+1&&description.scrollHeight<=description.clientHeight+1,
          descriptionHidden:ds.display==='none',descriptionSize:parseFloat(ds.fontSize),firstLineWords:rows.values().next().value,
          lineClamp:ds.webkitLineClamp,
          nameOverflow:ns.overflow,lineHeight:parseFloat(ns.lineHeight)/parseFloat(ns.fontSize),
          viewportFits:c.left>=0&&c.right<=innerWidth+1&&c.top>=0&&c.bottom<=innerHeight+1
        };
      });
      const label=`${width} ${font} ${item.id}`;
      assert.ok(result.centerError<1,label+' centers avatar, name and description');
      assert.ok(result.vertical,label+' stacks avatar above name and description');
      assert.ok(result.fits&&result.nameFits&&result.viewportFits,label+' fits');
      assert.ok(result.descriptionFits,label+' shows complete description');
      assert.equal(result.descriptionHidden,!item.description.trim(),label+' hides empty description');
      assert.equal(result.lineClamp,'none',label+' does not truncate description');
      assert.equal(result.nameOverflow,'visible',label+' does not clip glyph ink');
      assert.ok(result.lineHeight>=1.24,label+' leaves room for descenders');
      if(!['maximum','long'].includes(item.id))assert.equal(result.descriptionSize,style.descriptionSize*1.5,label+' enlarges description 1.5x');
      if(font==='Segoe UI'&&item.id==='normal')assert.ok(result.firstLineWords>=4,label+' fits at least four normal words per line');
      if(font==='Segoe UI'||width===560&&item.id==='descenders')await page.screenshot({path:path.join(out,`${width}-${font.replaceAll(' ','-')}-${item.id}.png`),omitBackground:true});
      count++;
    }
  }
  assert.deepEqual(errors,[]);
  console.log(`Badge column: ${count} cases passed across ${FONTS.length} fonts and 4 viewports.`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
