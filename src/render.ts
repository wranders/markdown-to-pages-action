import { readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

import { LocalsObject, compile } from 'pug';

import { PagesInfo, RepositoryInfo } from './repo';
import { apiPost } from './request';

import html from './imports/html';
import { debug } from '@actions/core';

export type FileToRender = {
  path: string;
  aboslutePath: string;
};

export type RenderedFile = {
  contents: string;
  outPath: string;
};

type HTML = {
  title: string;
  content: string;
  description: string;
  url: string;
  twitterUsername?: string;
  breadcrumbs: string;
};

async function getRenderedMarkdown(
  token: string,
  markdown: string,
): Promise<string> {
  const data = JSON.stringify({
    text: markdown,
  });
  return await apiPost(token, '/markdown', data);
}

function renderHTML(htmlConfig: HTML): string {
  const repoName: string = process.env.GITHUB_REPOSITORY;
  const repoUrl: string =
    process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY;
  const locals: LocalsObject = {
    title: htmlConfig.title,
    content: htmlConfig.content,
    repositoryName: repoName,
    repositoryUrl: repoUrl,
    description: htmlConfig.description,
    url: htmlConfig.url,
    twitter: {
      username: htmlConfig.twitterUsername,
    },
    breadcrumbs: htmlConfig.breadcrumbs,
    localDev: process.env.LOCAL_DEV,
  };
  const compiler = compile(html);
  return compiler(locals);
}

const reMarkdownLinkLocal: RegExp =
  /\[(?<title>.*)\]\((?<filepath>(?!(?:[a-z]+:)?\/\/).*)\)/gm;

function replaceMarkdownLinks(
  filesToRender: FileToRender[],
  markdown: string,
  markdownFilePath: string,
): string {
  debug(`replaceMarkdownLinks; markdownFilePath: ${markdownFilePath}`);
  let out: string = markdown;
  const root: string = resolve('.');
  debug(`replaceMarkdownLinks; root: ${root}`);
  const linkMatches: RegExpExecArray[] = [...out.matchAll(reMarkdownLinkLocal)];
  for (const match of linkMatches) {
    debug(`replaceMarkdownLinks; match: ${match[0]}`);
    if (match.groups === undefined) continue;
    const linkAbs: string = resolve(
      join(dirname(markdownFilePath), match.groups['filepath']),
    );
    debug(`replaceMarkdownLinks; linkAbs: ${linkAbs}`);
    if (!filesToRender.some((f) => f.aboslutePath === linkAbs)) continue;
    const linkTitle: string = match.groups['title'];
    const linkDir: string = dirname(linkAbs).replace(root, '');
    debug(`replaceMarkdownLinks; new link: [${linkTitle}](${linkDir})`);
    out = out.replaceAll(match[0], `[${linkTitle}](${linkDir})`);
  }
  return out;
}

function generateBreadcrumbs(path: string): string {
  let out: string = '';
  const pathElements: string[] = dirname(path)
    .split(sep)
    .filter((p) => p !== '.');
  if (pathElements.length > 0) {
    out = '<a href="/">home</a>';
    pathElements.forEach((value, index, array) => {
      if (index === array.length - 1) {
        out += ` > ${value}`;
      } else {
        out += ` > <a href="/${array.slice(0, index + 1).join(sep)}/">${value}</a>`;
      }
    });
  }
  return out;
}

export async function renderFiles(
  token: string,
  title: string,
  repoInfo: RepositoryInfo,
  pagesInfo: PagesInfo,
  filesToRender: FileToRender[],
  twitterHandle?: string,
): Promise<RenderedFile[]> {
  const renderedFiles: RenderedFile[] = [];

  for (const fileToRender of filesToRender) {
    let fileContents: string = readFileSync(fileToRender.aboslutePath, {
      encoding: 'utf-8',
    });
    fileContents = replaceMarkdownLinks(
      filesToRender,
      fileContents,
      fileToRender.aboslutePath,
    );
    const renderedMarkdown: string = await getRenderedMarkdown(
      token,
      fileContents,
    );
    const breadcrumbs: string = generateBreadcrumbs(fileToRender.path);
    let pageTitle: string = title.length > 0 ? title : repoInfo.full_name;
    const titleSuffix: string = dirname(fileToRender.path).replace(/^\.\//, '');
    if (titleSuffix !== '.') {
      pageTitle += `: ${titleSuffix}`;
    }
    const htmlConfig: HTML = {
      title: pageTitle,
      content: renderedMarkdown,
      description: repoInfo.description,
      url: pagesInfo.html_url,
      twitterUsername: twitterHandle,
      breadcrumbs: breadcrumbs,
    };
    const renderedHTML: string = renderHTML(htmlConfig);
    renderedFiles.push({
      contents: renderedHTML,
      outPath: titleSuffix,
    });
  }

  return renderedFiles;
}

export function renderNotFound(
  title: string,
  repoInfo: RepositoryInfo,
  pagesInfo: PagesInfo,
  twitterHandle?: string,
): RenderedFile {
  let pageTitle: string = title.length > 0 ? title : repoInfo.full_name;
  pageTitle += ': 404 Not Found';
  const htmlConfig: HTML = {
    title: pageTitle,
    content:
      '<div><h1>404</h1><p>Resource not found. <a href="javascript:history.back()">Go Back</a></p></div>',
    description: repoInfo.description,
    url: pagesInfo.html_url,
    twitterUsername: twitterHandle,
    breadcrumbs: '',
  };
  const renderedHTML: string = renderHTML(htmlConfig);
  return {
    contents: renderedHTML,
    outPath: '404.html',
  };
}