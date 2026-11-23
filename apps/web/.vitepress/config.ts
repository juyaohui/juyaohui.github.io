import { defineConfig } from "vitepress";
import { profile } from "./site";

const base = process.env.BASE_PATH ?? "/";

const styleBootstrap = `(function(){try{
  var q=new URLSearchParams(location.search);
  var ok=['aurora','paper','mono'];
  var s=q.get('style');
  var m=q.get('mode');
  var ls=window.localStorage;
  var st=ls.getItem('blog.style');
  var md=ls.getItem('blog.mode');
  if(ok.indexOf(s)<0){s=ok.indexOf(st)>=0?st:'aurora';}
  if(m!=='light'&&m!=='dark'){m=(md==='light'||md==='dark')?md:(s==='paper'?'light':'dark');}
  document.documentElement.dataset.style=s;
  document.documentElement.dataset.mode=m;
  document.documentElement.style.colorScheme=m;
}catch(e){document.documentElement.dataset.style='aurora';document.documentElement.dataset.mode='dark';}})()`;

export default defineConfig({
  lang: "zh-CN",
  title: profile.name,
  titleTemplate: `:title · ${profile.name}`,
  description: `${profile.name} 的个人主页：文章、笔记与手机同步。${profile.tagline}`,
  srcDir: "src",
  cleanUrls: true,
  base,
  appearance: false,
  lastUpdated: false,
  ignoreDeadLinks: true,
  sitemap: {
    hostname: process.env.SITE_ORIGIN ?? "https://juyaohui.github.io",
  },
  head: [
    ["meta", { name: "theme-color", content: "#080b12" }],
    ["meta", { name: "author", content: profile.name }],
    ["meta", { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" }],
    [
      "meta",
      {
        name: "description",
        content: `${profile.name} 的个人主页：文章、笔记与手机同步。${profile.tagline}`,
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: `${profile.name} · 个人主页` }],
    ["meta", { property: "og:description", content: profile.tagline }],
    ["meta", { property: "og:image", content: `${base}images/hero.png` }],
    ["link", { rel: "icon", href: `${base}favicon.ico`, sizes: "any" }],
    ["link", { rel: "apple-touch-icon", href: `${base}images/avatar01.png` }],
    ["link", { rel: "manifest", href: `${base}manifest.webmanifest` }],
    ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
    ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }],
    ["meta", { name: "apple-mobile-web-app-title", content: `${profile.name} · 同步` }],
    ["script", {}, styleBootstrap],
  ],
  markdown: {
    lineNumbers: true,
    image: { lazyLoading: true },
  },
  vue: {
    template: {
      compilerOptions: {
        // Images live in src/public and are referenced with root-absolute
        // paths (/images/...). Let the browser load them instead of turning
        // them into bundler imports.
        transformAssetUrls: false,
      },
    },
  },
  themeConfig: {
    logo: `${base}images/logo_ju.png`,
    siteTitle: profile.name,
  },
});
