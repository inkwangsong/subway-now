import json
d=json.load(open('/home/claude/data-src/metroscope/data/network.json'))
REN={('경의중앙선','신촌'):'신촌(경의중앙선)',('경의중앙선','양평'):'양평(경의중앙선)',('4호선','총신대입구'):'총신대입구(이수)',('7호선','이수'):'총신대입구(이수)'}
out=[]
for L in d['lines']:
    chains=[]
    for c in L['chains']:
        s=[];p=[]
        for n in c['stations']:
            lon,lat=L['stations'][n]
            nn=REN.get((L['name'],n),n)
            if nn=='서울': nn='서울역'
            s.append(nn); p+= [round(lon*1e4), round(lat*1e4)]
        o={'s':s,'p':p}
        if c.get('loop'):
            o['loop']=1
            if L['name']=='2호선': o['fw']='내선순환'; o['bw']='외선순환'
            if L['name']=='6호선': o['fw']='응암순환'; o['one']=1
        chains.append(o)
    out.append({'name':L['name'],'short':L['short'],'color':L['color'],'chains':chains})
js=json.dumps(out,ensure_ascii=False,separators=(',',':'))
assert "'" not in js
open('net3.json','w',encoding='utf-8').write(js); print(len(js.encode()), len(out))
print([l['color'] for l in out])
