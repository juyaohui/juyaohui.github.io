---
title: "JRE和JDK"
date: 2022-05-20
category: "技术栈"
tags: ["vuepress"]
excerpt: "Java Development Kit（简称JDK）= Java开发套件，Java开发工具包，面向Java语言开发者。 Java Runtime Environment（简称JRE）= Java运行库，Java运行环境，面向Java程序用户们。 JDK：Java核心，含Java…"
---

Java Development Kit（简称JDK）= Java开发套件，Java开发工具包，面向Java语言开发者。
Java Runtime Environment（简称JRE）= Java运行库，Java运行环境，面向Java程序用户们。
JDK：Java核心，含Java运行环境(JRE)、编译器（javac.exe）、开发工具（javadoc.exe、jar.exe、keytool.exe、jconsole.exe）和Java工具类库（如tools.jar）源代码等java语言编译所需的工具包。
JRE：Java语言开发的程序运行所需要的运行环境，包括JVM标准实现（java.exe等）及 Java核心类库（rt.jar等），它不包含开发工具(编译器、调试器等)

Maven 4.0 不支持 Java 1.8 版本。Maven 4.0 需要至少 Java 11 版本或更高版本的 Java 运行时环境。因此，如果您想使用 Maven 4.0，您需要确保您的系统已经安装了 Java 11 或更高版本。您可以使用 java -version 命令来检查您当前使用的 Java 版本。

如果您还在使用 Java 1.8，并且需要使用 Maven，则可以继续使用较早版本的 Maven（例如 Maven 3.x）。Maven 3.x 版本兼容 Java 1.8。

请注意，Maven 的最新版本是 3.8.1，这是一个稳定的版本，支持 Java 1.8。您可以从 Maven 官方网站（https://maven.apache.org/download.cgi）下载适合您的环境的版本。

总结起来，如果您想使用 Maven 4.0，请确保您的系统已经安装了 Java 11 或更高版本。如果您仍在使用 Java 1.8，则可以继续使用 Maven 3.x 版本。
