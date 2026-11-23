---
title: "Vuepress接入Github"
date: 2021-12-20
tags: ["github"]
---

[操作流程](https://blog.csdn.net/qq_44922354/article/details/122047810)
===================================================================

[GitHub Pages](https://blog.csdn.net/qq_44922354/article/details/122047810)
---------------------------------------------------------------------------

1.  在 `docs/.vuepress/config.js` 中设置正确的 `base`。

    如果你打算发布到 `https://<USERNAME>.github.io/`，则可以省略这一步，因为 `base` 默认即是 `"/"`。

    如果你打算发布到 `https://<USERNAME>.github.io/<REPO>/`（也就是说你的仓库在 `https://github.com/<USERNAME>/<REPO>`），则将 `base` 设置为 `"/<REPO>/"`。

2.  在你的项目中，创建一个如下的 `deploy.sh` 文件（请自行判断去掉高亮行的注释）:

* * *

```bash
#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# 生成静态文件
npm run docs:build

# 进入生成的文件夹
cd docs/.vuepress/dist

# 如果是发布到自定义域名
# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'deploy'

# 如果发布到 https://<USERNAME>.github.io
# git push -f git@github.com:<USERNAME>/<USERNAME>.github.io.git master

# 如果发布到 https://<USERNAME>.github.io/<REPO>
git push -f git@github.com:taotock/fDocs.git master:gh-pages

cd -

```

[`deploy.sh` 文件（踩坑）](https://blog.csdn.net/qq_44922354/article/details/122047810)执行
------------------------------------------------------------------------------------

### 1、官网推荐部署命令：

* * *

```bash
"scripts": {
    "docs:dev": "vuepress dev docs",
    "docs:build": "vuepress build docs",
    "deploy": "bash deploy.sh"
  }

```

* * *

windows 没有bash 指令， 直接运行报错，

解决方案如下：

*   项目根文件夹右键 gitBash here , 而后输入bash deploy.sh（我用的这个）
*   直接双击deploy.sh文件

### 2、：

deploy.sh文件照官方配置没问题，最后push的时候有个坑，若是你的项目是用SSH 克隆下来的就没问题，若是你是用HTTPS 克隆下来的会要求你输入用户名和密码，不少新手图简单都习惯用https 克隆项目，不过，做为一个专业的coder,咱们最好配一下ssh ,配置完之后用ssh克隆下项目，重新部署了git（bash deploy.sh）

![外链图片转存失败,源站可能有防盗链机制,建议将图片保存下来直接上传(img-9FzixGpA-1639997847051)(C:\Users\20271\AppData\Roaming\Typora\typora-user-images\image-20211220103650865.png)](https://img-blog.csdnimg.cn/dd88819528b54db0b3f2a20a7994a3ee.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBAZHkuY29t,size_20,color_FFFFFF,t_70,g_se,x_16)

### 执行部署后下面有可能会产生新的问题，如下：

![img](https://img-blog.csdnimg.cn/20190611012953403.png)

第一句报错：

*   fatal: remote origin already exists. 远程起源已经存在。

第二句报错：

*   git@github.com: Permission denied (publickey). git@github.com：权限被拒绝（publickey）
*   fatal: Could not read from remote repository. 致命：无法从远程存储库读取。

第三句报错：

*   Please make sure you have the correct access rights and the repository exists.
*   请确保您拥有正确的访问权限并且存储库存在。

经过翻译可以得知我是在上传过程中没有权限所以被拒绝了，经过了对git的一番了解以后得知我好像做少了其中一个比较重要的一步，就是设置一个SSH KEY，即是密钥，（出于安全考虑，Github 服务器和我们本地的通讯要求使用 SSH Key 来验证）。这个时候只需设置一个密钥就行了。

## 解决方法

​ 从github主页点击设置进入SSH and GPG keys，随后点击创建一个新的密钥"New SSH key"
\[外链图片转存失败,源站可能有防盗链机
制,建议将图片保失败,源站可能有防盗链机制,建议将图片保存下来直接上传存失败,源站可能有防盗链机制,建议将图片保存下来直接mg-VAAGuZe-ohJz9997847053)(C:\\Users\\24)271\\AppData\\Roaming\\Typora\\typora-user-images\\image-20211220141219859.png(C:\\Users\\20271\\AppData\\Roaming\\Typora\\typora-user-images\\image-20211220141219859.png)(C:\\Users\\20271\\AppData\\Roaming\\Typora\\typora-user-images\\image-20211220141219859.png)\]\[外链图片转存失败,源站可能有防盗链机制,建议将图片保存下来直接上传(img-yfQjh7js-1639998385542)(C:\\Users\\20271\\AppData\\Roaming\\Typora\\typora-user-images\\image-20211220141219859.png)\]

​

其中，key值需要找到上传的项目文件夹的根目录，右键Git Base Here，输入命令：ssh-keygen -t rsa -C ["20271926@qq.com](mailto:%22876818551@qq.com)"

然后便一直猛击回车，有y/n的时候尽可能去翻译一下句子，而我下面这个y/n就是已经创有文件项目是否覆盖的意思。
接下来经过回车敲击后可以看到一个代码小图片，那就说明成功了。
接下来输入命令：cat ~/.ssh/id\_rsa.pub
这个时候他便会弹出你的密钥。这个时候直接复制粘贴到刚刚那个GitHub设置密钥SSH的key上面然后保存即可。

![img](https://img-blog.csdnimg.cn/20190611015442313.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NDM5NDc1Mw==,size_16,color_FFFFFF,t_70)

Github上面的key创建完成后就可以执行git push --set-upstream origin master这条指令了。

![img](https://img-blog.csdnimg.cn/20190611015514660.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3dlaXhpbl80NDM5NDc1Mw==,size_16,color_FFFFFF,t_70)

#为什么要用git push#
git push -u origin master 上面命令将本地的master分支推送到origin主机，同时指定origin为默认主机，后面就可以不加任何参数使用git push了。

#为什么要用git push#
git push -u origin master 上面命令将本地的master分支推送到origin主机，同时指定origin为默认主机，后面就可以不加任何参数使用git push了。

本文转自 [https://blog.csdn.net/qq\_44922354/article/details/122047810](https://blog.csdn.net/qq_44922354/article/details/122047810)，如有侵权，请联系删除。
