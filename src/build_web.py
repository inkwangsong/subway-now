import re, json
B='/home/claude/subway/build/'
m=open(B+'markup4.html',encoding='utf-8').read()
body=m[m.index('<x-dc>')+6:m.index('</x-dc>')]
helmet=body[body.index('<helmet>'):body.index('</helmet>')+9]
body=body.replace(helmet,'')
css=re.search(r'<style>(.*?)</style>',helmet,re.S).group(1)
font=re.search(r'<link[^>]+>',helmet).group(0)
logic=(open(B+'helpers4.js',encoding='utf-8').read()+open(B+'class4.js',encoding='utf-8').read()).replace('__NET__',open(B+'net3.json',encoding='utf-8').read())
preact=open('node_modules/preact/dist/preact.min.umd.js',encoding='utf-8').read().split('//# sourceMappingURL')[0]
host=open('host.js',encoding='utf-8').read()
assert '</script' not in logic and '</script' not in host and '</template' not in body
html=f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="지금 어느 역">
<meta name="theme-color" content="#F7F1E1">
<title>지금 어느 역</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
{font}
<style>
html,body{{margin:0;height:100%;overflow:hidden;background:#F2E9D4;overscroll-behavior:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;-webkit-text-size-adjust:100%}}
#stage{{position:fixed;left:0;top:0;width:390px;transform-origin:0 0}}
#fatal{{position:fixed;left:16px;right:16px;bottom:16px;padding:12px 16px;border-radius:14px;background:#2B2118;color:#fff;font:500 13px/1.5 sans-serif;display:none;z-index:9}}
{css}
</style>
</head>
<body>
<div id="stage"></div>
<div id="fatal" role="alert"></div>
<template id="tpl">{body}</template>
<script>{preact}</script>
<script>
class DCLogic {{
constructor() {{ this.props = {{}}; this.state = {{}}; }}
setState(patch) {{ this.state = Object.assign({{}}, this.state, patch); if (DCLogic.onChange) DCLogic.onChange(); }}
forceUpdate() {{ if (DCLogic.onChange) DCLogic.onChange(); }}
}}
{logic}
</script>
<script>
{host}
</script>
</body>
</html>
'''
open('site/index.html','w',encoding='utf-8').write(html)
print(len(html.encode()))
