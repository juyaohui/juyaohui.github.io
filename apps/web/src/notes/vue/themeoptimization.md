---
title: "主题优化"
date: 2020-07-11
---

![小弋の阅览室](https://lovelijunyi.gitee.io/blog/vuepress/avatar.gif)

--------------------------------------------------

## 优化config配置项

来源于一位朋友的需求

```bash
请问如何把config.js中的nav分离出去 ,现在config已经很大很长了很大很长了,谢谢你!!!!
```
好吧，其实我早就做了分离，来看一下我的`config.js`，

```bash
// 指定到别的文件下
const nav = require('./config/nav/')
const sidebar = require('./config/sidebar/')
const plugins = require('./config/plugins/')

module.exports = {
。。。。
  head: [
      省略。。。。。。
  ],
  theme: 'reco',
  themeConfig: {
    type: 'HomePage',
    // 页头
    nav,
    // 侧边栏
    sidebar,

  },
  // 插件
  plugins,
}
```
因为页头，侧边栏和插件内容很多，如果全部放在配置项里，会显得很冗余，这边以nav为例，说明怎么指定到别的文件里。

首先在配置文件首行写个js语句，意思很简单，都能看懂吧，`./config/nav/`的意思就是指定到当前目录下config文件夹下的nav文件夹中（没有这个目录结构就自己创建，位置可以自己指定的！）

```bash
const nav = require('./config/nav/')
```

然后再nav文件下创建一个`index.js`文件，来看看里面写的啥

```bash
module.exports = [
    { text: '主页', link: '/', icon: 'fa-home' },
    { text: '博客', icon: 'fa-book',
。。。。。
]
```

是的，只要在`module.exports`中书写内容就可以了，学会了吗？

本文转自 [https://lovelijunyi.gitee.io/blog/blogs/vuepress/vuepress-theme-reco%E4%B8%BB%E9%A2%98%E4%BC%98%E5%8C%96.html](https://lovelijunyi.gitee.io/blog/blogs/vuepress/vuepress-theme-reco%E4%B8%BB%E9%A2%98%E4%BC%98%E5%8C%96.html)，如有侵权，请联系删除。
