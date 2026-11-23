---
title: "nginx常用指令"
date: 2022-05-20
category: "技术栈"
tags: ["vuepress"]
excerpt: "启动nginx 杀死所有Nginx进程 .\\nginx.exe -s reload 重新加载nginx配置 .\\nginx.exe -s quit 停止nginx服务 .\\nginx.exe -s stop 强制停止nginx服务"
---

启动nginx
```bash
start ./nginx.exe
```
杀死所有Nginx进程
```bash
taskkill /f /t /im nginx.exe
```
.\nginx.exe -s reload 重新加载nginx配置
.\nginx.exe -s quit 停止nginx服务
.\nginx.exe -s stop 强制停止nginx服务
