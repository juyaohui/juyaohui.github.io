---
title: "Slidev"
date: 2022-06-02
category: "菜鸡成长日志"
tags: ["problem"]
excerpt: "Slidev官网 安装打开遇到问题，可以弹出网页，但是会卡在这里，不会进行下一步 今天先全局安装 npm i -g @slidev/cli ，接着安装了手动安装 npm install @slidev/cli @slidev/theme-default 然后启动项目 npm in…"
---

[Slidev官网](https://cn.sli.dev/guide/install.html)

安装打开遇到问题，可以弹出网页，但是会卡在这里，不会进行下一步

```bash
v-bind is missing expression.
22:03:36 [vite] Internal server error: v-bind is missing expression.
  Plugin: vite:vue
  File: /@slidev/slides/1.md
  57 |  <div class="pt-12">
  58 |    <span @click="$slidev.nav.next" class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
  59 |      Press Space for next page <carbon class="inline" :arrow-right=""></carbon>
     |                                             ^
  60 |    </span>
  61 |  </div>
      at createCompilerError (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:19:19)
      at transformBind (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:5209:25)
      at buildProps (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:4749:48)
      at Array.postTransformElement (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:4355:38)
      at traverseNode (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:2211:19)
      at traverseChildren (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:2153:9)
      at traverseNode (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:2204:13)
      at traverseChildren (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:2153:9)
      at traverseNode (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:2204:13)
      at traverseChildren (C:\Users\jyh\ppt\progress\node_modules\@vue\compiler-core\dist\compiler-core.cjs.js:2153:9)

```

##  **2022.06.11**

今天先全局安装`npm i -g @slidev/cli`，接着安装了手动安装`npm install @slidev/cli @slidev/theme-default`

然后启动项目`npm init slidev@latest`

最重要的一步，更换edge浏览器，<font color=#FF000 >QQ浏览器真垃圾</font>，这都给我摆了一道，浏览器攻击弱小的我

* 体验了一番之后。这插件太强了，以后汇报就用这个写了。演示，录屏，修改，笔记，涂鸦 一应俱全

**2022.06.12**

晚上回去的路上想起一件事，如果不能导出pdf，那就只能在个人pc上操作，有一些局限

slidev是有自带导出的，但是也遇到问题

```bash
  ■ rendering...page.goto: Timeout 3000ms exceeded.
=========================== logs ===========================
navigating to "http://localhost:12445/print?print", waiting until "networkidle"
============================================================
    at go (C:\Users\jyh\ppt\test1\node_modules\@slidev\cli\dist\export-LOKLMK66.js:80:16)
    at genPagePdf (C:\Users\jyh\ppt\test1\node_modules\@slidev\cli\dist\export-LOKLMK66.js:100:11)
    at exportSlides (C:\Users\jyh\ppt\test1\node_modules\@slidev\cli\dist\export-LOKLMK66.js:152:11)
    at async Object.handler (C:\Users\jyh\ppt\test1\node_modules\@slidev\cli\dist\cli.js:271:12) {
  name: 'TimeoutError'
}
```

看了github上的教程，还是没有解决掉

- 可能是网络连接问题，等待优化
