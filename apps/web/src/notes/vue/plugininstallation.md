---
title: "Vuepress插件分享"
date: 2021-08-13
---

#  vuepress各种插件装饰

----------------------------------------

##  引入鼠标点击效果

在.vuepress\\public\\js文件夹下创建MouseClickEffect.js文件，填入以下代码

```bash
var a_idx = 0;

function getRandom(max, min) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
jQuery(document).ready(function ($) {
    $("body").click(function (e) {
        var a = new Array("富强", "民主", "文明", "和谐", "自由", "平等", "公正", "法治", "爱国", "敬业", "诚信", "友善");
        var $i = $("<span/>").text(a[a_idx]);
        a_idx = (a_idx + 1) % a.length;
        var x = e.pageX,
            y = e.pageY;
        $i.css({
            "z-index": 999999999999999999999999999999999999999999999999999999999999999999999,
            "top": y - 20,
            "left": x,
            "position": "absolute",
            "font-weight": "bold",
            "color": `rgb(${getRandom(255,0)},${getRandom(255,0)},${getRandom(255,0)})`,
            "user-select": 'none',
            "cursor": 'default'
        });
        $("body").append($i);
        $i.animate({
                "top": y - 180,
                "opacity": 0
            },
            1500,
            function () {
                $i.remove();
            });
    });
});
```

然后在主题配置文件config.js下的head引入以上js，这里的jquery必须引入，鼠标点击代码才能生效

```bash
head: [
  // 网页标签栏图标
  ['link', { rel: 'icon', href: '/vuepress/favicon.ico' }],
  // 移动栏优化
  ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,user-scalable=no' }],
  // 引入jquery
  ["script", {
    "language": "javascript",
    "type": "text/javascript",
    "src": "https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js"
  }],
  // 引入鼠标点击脚本
  ["script", {
    "language": "javascript",
    "type": "text/javascript",
    "src": "/js/MouseClickEffect.js"
  }]
],
```

##  音乐插件

[bgm-player (opens new window)](https://github.com/vuepress-reco/vuepress-plugin-bgm-player)，一款简洁易用的音乐插件，优势是好看（我用的这个）。

```bash
// 安装

yarn add @vuepress-reco/vuepress-plugin-bgm-player -D
# or use npm
npm i @vuepress-reco/vuepress-plugin-bgm-player -D
```

```bash
[
      '@vuepress-reco/vuepress-plugin-bgm-player',{
       audios: [
          // 本地文件示例
          {
            name: '장가갈 수 있을까',
            artist: '咖啡少年',
            url: '/bgm/1.mp3',
            cover: '/bgm/1.jpg'
          },
          // 网络文件示例
          {
            name: '강남역 4번 출구',
            artist: 'Plastic / Fallin` Dild',
            url: 'https://assets.smallsunnyfox.com/music/2.mp3',
            cover: 'https://assets.smallsunnyfox.com/music/2.jpg'
          },
          {
            name: '用胳膊当枕头',
            artist: '최낙타',
            url: 'https://assets.smallsunnyfox.com/music/3.mp3',
            cover: 'https://assets.smallsunnyfox.com/music/3.jpg'
          }
        ]
      }
    ]
```

[music-bar (opens new window)](https://www.npmjs.com/package/vuepress-plugin-music-bar)，一个程序猿自己开发的插件，除本地，网络音频之外还支持从平台歌单获取链接(目前仅支持网易云音乐)

[meting (opens new window)](https://links.jianshu.com/go?to=https%3A%2F%2Fgithub.com%2Fmoefyit%2Fvuepress-plugin-meting)，在hexo上就一直用的插件，功能强大，配置丰富，目前应该最大强大的音乐插件了。

```bash
npm i vuepress-plugin-meting -D
```

```bash
<Meting server="netease"
    type="playlist"
    mid="2539599584"
    :lrc-type="3"/>
```

## 趣味标题插件

主要在标签栏当时选中和离开页面时会有变化

```bash
npm i vuepress-plugin-dynamic-title -D
```

```bash
module.exports = {
  plugins: [
    [
      "dynamic-title",
      {
        showIcon: "/favicon.ico",
        showText: "(/≧▽≦/)咦！又好了！",
        hideIcon: "/failure.ico",
        hideText: "(●—●)喔哟，崩溃啦！",
        recoverTime: 2000
      }
    ]
  ]
}
```

##  复制弹窗插件

```bash
npm install -D vuepress-plugin-nuggets-style-copy
```

```bash
["vuepress-plugin-nuggets-style-copy", {
  copyText: "复制代码",
  tip: {
      content: "复制成功!"
  }
}]
```

##  live2d

```bash
npm install -D vuepress-plugin-helper-live2d
```

```bash
[
      'vuepress-plugin-helper-live2d', {
        // 是否开启控制台日志打印(default: false)
        log: false,
        live2d: {
          // 是否启用(关闭请设置为false)(default: true)
          enable: true,
          // 模型名称(default: hibiki)>>>取值请参考：
          // https://github.com/JoeyBling/hexo-theme-yilia-plus/wiki/live2d%E6%A8%A1%E5%9E%8B%E5%8C%85%E5%B1%95%E7%A4%BA
          model: 'koharu',
          display: {
            position: "right", // 显示位置：left/right(default: 'right')
            width: 135, // 模型的长度(default: 135)
            height: 300, // 模型的高度(default: 300)
            hOffset: 65, //  水平偏移(default: 65)
            vOffset: 0, //  垂直偏移(default: 0)
          },
          mobile: {
            show: false // 是否在移动设备上显示(default: false)
          },
          react: {
            opacity: 0.8 // 模型透明度(default: 0.8)
          }
        }
      }
    ]
```

##  拼音路由插件

```bash
npm i vuepress-plugin-permalink-pinyin --save-dev
# or
yarn add vuepress-plugin-permalink-pinyin --dev
```

```bash
plugins: {
  'permalink-pinyin': {
    lowercase: true, // Converted into lowercase, default: true
    separator: '-' // Separator of the slug, default: '-'
  }
}
```

## 评论插件Valine

请先登录或注册[LeanCloud (opens new window)](https://www.leancloud.cn/), 进入控制台后点击左下角创建应用：

```bash
themeConfig: {
    valineConfig: {
      appId: '...',// your appId
      appKey: '...', // your appKey
    }
  }

```

##  Vssue

```bash
themeConfig: {
    vssueConfig: {
      platform: 'github',
      owner: 'OWNER_OF_REPO',
      repo: 'NAME_OF_REPO',
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
    }
  }

```

**options 详解：**

*   title: 在这里设置当前页面的 `Issue` 标题
*   platform: 支持的代码托管平台
*   owner: 对应 `repository` 的拥有者帐号或者团队
*   repo: 用来存储评论的 repository
*   clientId: `OAuth App` 的 `client id`
*   clientSecret: `OAuth App` 的 `client secret`（只有在使用某些平台时需要）

*   [引入鼠标点击效果](https://huabyte.com/blogs/others/2021/20210813.html#%E5%BC%95%E5%85%A5%E9%BC%A0%E6%A0%87%E7%82%B9%E5%87%BB%E6%95%88%E6%9E%9C)
*   [音乐插件](https://huabyte.com/blogs/others/2021/20210813.html#%E9%9F%B3%E4%B9%90%E6%8F%92%E4%BB%B6)
*   [趣味标题插件](https://huabyte.com/blogs/others/2021/20210813.html#%E8%B6%A3%E5%91%B3%E6%A0%87%E9%A2%98%E6%8F%92%E4%BB%B6)
*   [复制弹窗插件](https://huabyte.com/blogs/others/2021/20210813.html#%E5%A4%8D%E5%88%B6%E5%BC%B9%E7%AA%97%E6%8F%92%E4%BB%B6)
*   [live2d](https://huabyte.com/blogs/others/2021/20210813.html#live2d)
*   [拼音路由插件](https://huabyte.com/blogs/others/2021/20210813.html#%E6%8B%BC%E9%9F%B3%E8%B7%AF%E7%94%B1%E6%8F%92%E4%BB%B6)
*   [评论插件Valine](https://huabyte.com/blogs/others/2021/20210813.html#%E8%AF%84%E8%AE%BA%E6%8F%92%E4%BB%B6valine)
*   [Vssue](https://huabyte.com/blogs/others/2021/20210813.html#vssue)

![](https://assets.huabyte.com/blog/image/cover3.jpg)

本文转自 [https://huabyte.com/blogs/others/2021/20210813.html#%E5%BC%95%E5%85%A5%E9%BC%A0%E6%A0%87%E7%82%B9%E5%87%BB%E6%95%88%E6%9E%9C](https://huabyte.com/blogs/others/2021/20210813.html#%E5%BC%95%E5%85%A5%E9%BC%A0%E6%A0%87%E7%82%B9%E5%87%BB%E6%95%88%E6%9E%9C)，如有侵权，请联系删除。
