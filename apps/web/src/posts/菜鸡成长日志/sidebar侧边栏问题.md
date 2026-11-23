---
title: "左侧侧边栏问题"
date: 2022-05-24
category: "菜鸡成长日志"
tags: ["problem"]
excerpt: "侧边栏仅识别第一个文件夹下的，其余文件夹仅识别其中的readme文档。 2022.5.27 侧边栏问题已解决 命令填写不可以改写"
---

侧边栏仅识别第一个文件夹下的，其余文件夹仅识别其中的readme文档。

```bash
'/notes/': [
         'guide.md',  //可以识别
        {
        title: 'git',
        path: '/notes/git/',
        collapsable: true,
        sidebarDepth: 1,
        children: [
            {
                title: '常用命令',
                path: 'git/README'
            },
            {
                title: '测试',
                path: 'git/test'
            }
            ]
        },     //不能识别
        {
        title: 'vuepress',
        path: '/notes/vue/',
        collapsable: true,
        sidebarDepth: 2,
        children:[
            '',
            'keystest.md'
            ]
        },
        //'keystest.md'
    ]
```
2022.5.27 侧边栏问题已解决

```bash
'/notes/': [
        'guide.md',
        'keystest.md',
        {
            title: 'Github',  //组名
            children: [
                ['git/','README.md'],
                ['git/test1.md','test1.md']
            ]   //该分组下要显示的文件的目录
        },
        {
            title: 'Vuepress',  //组名
            children: [
                ['vue/','README.md'],
                ['vue/test2.md','test2.md']
            ]   //该分组下要显示的文件的目录
        }
    ]
```
命令填写不可以改写
