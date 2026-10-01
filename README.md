# Mini Games — 小游戏站

一个纯静态网站，不需要构建工具、不需要 npm、不需要服务器。
直接把这个文件夹推到 GitHub，连上 Cloudflare Pages 就能上线。

## 目录

```
index.html                     首页（游戏墙）
privacy.html                   隐私说明（面向家长，AdSense 以后也要用）
404.html                       找不到页面时显示
robots.txt / sitemap.xml       给搜索引擎看的
sw.js                          离线缓存（Service Worker）：访问过一次后，断网也能打开所有游戏
manifest.webmanifest           应用清单：手机上可以「添加到主屏幕」，像 App 一样打开
assets/favicon.png             网站图标
assets/og-cover.png            首页分享到社交平台时的预览图
games/crystal-sweeper/
  ├── index.html               扫雷游戏（自包含，单文件）
  └── cover.png                首页卡片 + 分享预览用的封面
games/sudoku/
  ├── index.html               数独游戏（自包含，单文件；四个难度，题目在浏览器里现生成）
  └── cover.png                首页卡片 + 分享预览用的封面
games/freecell/
  ├── index.html               空当接龙（自包含，单文件；随机发牌、整叠搬运、无限撤销）
  └── cover.png                首页卡片 + 分享预览用的封面
games/starfall-blocks/
  ├── index.html               俄罗斯方块（自包含，单文件；三档速度、暂存、影子落点、键盘/触屏/手势）
  └── cover.png                首页卡片 + 分享预览用的封面
games/potion-sort/
  ├── index.html               倒水排序（自包含，单文件；200 关按关卡号固定生成且保证有解、星级、提示、撤销、神秘关）
  └── cover.png                首页卡片 + 分享预览用的封面
games/pop-pals-2048/
  ├── index.html               2048（自包含，单文件；萌系小伙伴方块、合成特效/连击/彩带、小伙伴图鉴、无限撤销、自动存档）
  └── cover.png                首页卡片 + 分享预览用的封面
```

## 上线前必须替换的三处

用编辑器全局搜索替换（VS Code：Ctrl/Cmd + Shift + H）：

| 搜索 | 替换为 | 出现在 |
|---|---|---|
| `games.dearcharles.cn` | 你的真实域名 | index.html、games/、privacy.html、robots.txt、sitemap.xml |
| `dearcharles.liu@gmail.com` | 你要公开的邮箱 | index.html、privacy.html |
| `Mini Games` | 你想好的站名 | index.html、404.html、privacy.html、各游戏页 title、manifest.webmanifest |

改完在本地起个小服务器自测（别直接双击 index.html，绝对路径会失效）：

```bash
cd 这个文件夹
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 部署到 Cloudflare Pages

1. GitHub 新建仓库 → 把这个文件夹的内容推上去
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → 选中仓库
3. 构建设置：
   - Framework preset: **None**
   - Build command: **留空**
   - Build output directory: **/**
4. Deploy，拿到 `xxx.pages.dev` 先自测
5. Custom domains → 绑定你的域名（Cloudflare 自动签 HTTPS 证书）

以后更新：改文件 → `git add . && git commit -m "..." && git push`，一分钟后自动上线。

## 加一个新游戏

1. 新建 `games/游戏英文名/index.html`（把游戏 HTML 整个放进去，`<head>` 里照抄扫雷那份，改标题和描述）
2. 放一张 `cover.png`（16:9，直接截游戏画面就行）
3. 在 `index.html` 里复制一整块 `<a class="game" ...>...</a>` 卡片，改链接、标题、简介、标签
4. 在 `sitemap.xml` 里加一条 `<url>`
5. 在 `sw.js` 的 `PRECACHE` 里加上 `'/games/游戏英文名/'` 和它的 `cover.png`，并把 `VERSION` 加一（比如 `v1` → `v2`）
6. 新游戏的 `<head>` 和 `</body>` 前照抄其它游戏里的 manifest 链接和 Service Worker 注册那一行
7. push

## 离线游玩

- 联网访问过一次任意页面后，整站（所有游戏、封面、字体）都会存进浏览器，之后断网也能打开、能玩
- 页面优先走网络，有网时总是拿最新版；断网时才用存下来的那份
- **改了任何文件都要把 `sw.js` 里的 `VERSION` 加一**，老玩家下次联网打开时才会更新离线副本
- 手机浏览器菜单里选「添加到主屏幕」，就能像 App 一样从桌面启动
- 本地测试离线：用 `python3 -m http.server` 打开一次，再在浏览器开发者工具 Network 面板勾选 Offline 刷新

## 注意

- 游戏页里的最佳成绩用的是浏览器 localStorage，换设备不会同步，这是有意为之（不收集任何个人数据）
- 图片、字体不要热链别人的服务器；字体用的是 Google Fonts，免费可商用
- 想开访问统计：Cloudflare Pages 项目里一键打开 Web Analytics，无 cookie、不用弹隐私框
