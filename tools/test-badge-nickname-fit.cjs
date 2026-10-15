const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {Store}=require('../core/store.cjs');
const {Badges}=require('../core/badges/service.cjs');
const {style,FONTS}=require('../core/badges/config.cjs');
const out=path.resolve(__dirname,'../test-output/badge-nickname-fit');fs.mkdirSync(out,{recursive:true});
const store=new Store(':memory:');store.rememberAccount('123','test_channel');
const service=new Badges({store,account:()=> '123',port:0});
let browser;
(async()=>{
  await service.start();browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(service.info().url);await page.evaluate(()=>window.probe=new BadgeView(document.querySelector('.badge-stage')));
  let cases=0;
  for(const [width,height] of [[560,560],[280,280],[720,240]]){
    await page.setViewportSize({width,height});
    for(const design of ['air','pass','sticker'])for(const font of FONTS)for(const name of ['Nami_o_o','W'.repeat(40),'Long_Streamer_gyjp_'.repeat(2)]){
      const settings=style({design,font,fontSize:48,paddingX:48,borderWidth:12,radius:28,stampPosition:'top-left'});
      const result=await page.evaluate(data=>{
        const original=JSON.stringify(data.style);window.probe.render(data);
        const name=window.probe.name,text=window.probe.nameText,s=getComputedStyle(name),range=document.createRange();range.selectNodeContents(text);
        const available=name.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);
        const result={fits:text.scrollWidth<=available,oneLine:range.getClientRects().length===1,unchanged:JSON.stringify(data.style)===original,font:parseFloat(s.fontSize),handleVisible:getComputedStyle(window.probe.handle).display!=='none'};
        window.probe.render({...data,name:'Nami_o_o'});result.restored=parseFloat(getComputedStyle(name).fontSize)===data.style.fontSize;
        return result;
      },{login:'test_streamer',name,description:'',style:settings});
      assert(result.fits&&result.oneLine&&result.unchanged&&result.restored,JSON.stringify({width,height,design,font,name,result}));cases++;
      assert.equal(result.handleVisible,design!=='sticker','Only Sticker hides the address label');
    }
    const data={login:'nami_o_o',name:'Nami_o_o',description:'Short streamer description',style:style({design:'sticker',fontSize:40,borderWidth:5,radius:28,avatarSize:84,stampPosition:'top-left',stampSize:164})};
    const geometry=await page.evaluate(data=>{
      window.probe.render(data);
      const card=window.probe.card,name=window.probe.name,desc=window.probe.description,stamp=window.probe.stamp;
      const n=name.getBoundingClientRect(),d=desc.getBoundingClientRect(),s=stamp.getBoundingClientRect();
      const corner=window.probe.name.offsetTop+18+Math.sin(3*Math.PI/180)*name.offsetWidth/2;
      const overlap=parseFloat(window.probe.stampSlot.style.top)+window.probe.stampSlot.offsetHeight-corner;
      const scale=Math.min(innerWidth/560,innerHeight/560),join=[];
      for(let y=0;y<=14;y+=2){const hit=document.elementFromPoint(d.right-6*scale,d.top+y*scale);join.push(hit===name||hit===desc||name.contains(hit));}
      const result={overlap,join,inside:s.top>=0&&s.bottom<=innerHeight,descriptionVisible:d.bottom>n.bottom,stampTop:window.probe.stampSlot.style.top};
      window.probe.render({...data,style:{...data.style,design:'air'}});result.resetAir=window.probe.stampSlot.style.top==='';
      window.probe.render({...data,style:{...data.style,stampPosition:'bottom-left'}});result.resetBottom=window.probe.stampSlot.style.top==='';
      window.probe.render(data);return result;
    },data);
    assert(geometry.overlap>=15&&geometry.overlap<=17&&geometry.inside&&geometry.descriptionVisible&&geometry.resetAir&&geometry.resetBottom,JSON.stringify(geometry));
    assert(geometry.join.every(Boolean),'Gap at sticker panel join: '+JSON.stringify(geometry));
    await page.screenshot({path:path.join(out,'sticker-'+width+'x'+height+'.png'),omitBackground:true});
    await page.evaluate(data=>window.probe.render({...data,name:'Long_Streamer_gyjp_'.repeat(2)}),data);
    await page.screenshot({path:path.join(out,'long-name-'+width+'x'+height+'.png'),omitBackground:true});
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,nicknameCases:cases,viewports:3,cornerOverlap:true,noPanelGap:true,settingsUnchanged:true}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();service.close();store.close();});
