import { debug, getInput, setFailed, setSecret } from '@actions/core';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import { ClientRequest } from 'http';
import { RequestOptions, request } from 'https';
import { join, resolve } from 'path';
import { LocalsObject, compile } from 'pug';
import { format } from 'util';
import css from './imports/css';
import html from './imports/html';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_REPOSITORY: string;
      GITHUB_SERVER_URL: string;
    }
  }
}

type RepositoryInfo = {
  name: string;
  full_name: string;
  description: string;
  owner: {
    login: string;
  };
};

type PagesInfo = {
  html_url: string;
};

type UserSocials = {
  provider: string;
  url: string;
}[];

async function requestApi(
  opts: RequestOptions,
  postData?: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const requestOptions: RequestOptions = {
      ...opts,
      headers: {
        ...opts.headers,
        'User-Agent': 'wranders/markdown-to-pages-action',
      },
      host: 'api.github.com',
    };
    let responseBody = '';
    const req: ClientRequest = request(requestOptions, (response) => {
      response.setEncoding('utf-8');
      response.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        resolve(responseBody);
      });
      response.on('error', (err) => {
        reject(err);
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
    });
    if (requestOptions.method?.toUpperCase() === 'POST') req.write(postData);
    req.end();
  });
}

async function getRenderedMarkdown(
  token: string,
  markdown: string,
): Promise<string> {
  const data = JSON.stringify({
    text: markdown,
  });
  const requestOptions: RequestOptions = {
    method: 'POST',
    path: '/markdown',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: format('Bearer %s', token),
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };
  const execRequest = await requestApi(requestOptions, data);
  return execRequest;
}

async function getRepositoryInfo(
  token: string,
  repo: string,
): Promise<RepositoryInfo> {
  const requestOptions: RequestOptions = {
    path: '/repos/' + repo,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: format('Bearer %s', token),
    },
  };
  const execRequest = await requestApi(requestOptions);
  return JSON.parse(execRequest);
}

async function getPagesInfo(token: string, repo: string): Promise<PagesInfo> {
  const requestOptions: RequestOptions = {
    path: '/repos/' + repo + '/pages',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: format('Bearer %s', token),
    },
  };
  const execRequest = await requestApi(requestOptions);
  return JSON.parse(execRequest);
}

async function getUserSocials(
  token: string,
  username: string,
): Promise<UserSocials> {
  const requestOptions: RequestOptions = {
    path: '/users/' + username + '/social_accounts',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: format('Bearer %s', token),
    },
  };
  const execRequest = await requestApi(requestOptions);
  return JSON.parse(execRequest);
}

function getTwitterHandle(socials: UserSocials): string | undefined {
  const obj = socials.find((social) => social.provider === 'twitter');
  if (obj === undefined) return undefined;
  const re = /^https?:\/\/(www.)?(twitter|x).com\/@?(?<handle>\w+)/;
  const match = re.exec(obj.url);
  return match?.groups?.handle;
}

function getTitle(repoName?: string): string {
  const actionInput = getInput('title');
  if (actionInput !== '') return actionInput;
  if (repoName !== undefined) return repoName;
  return 'README';
}

async function main(): Promise<void> {
  try {
    const token = getInput('token', { required: true });
    setSecret(token);
    const outPath = getInput('out-path');
    debug('out-path = ' + outPath);
    const outPathFull = resolve(outPath);
    debug('full out-path: ' + outPathFull);
    const outPathNotEmpty = getInput('out-path-not-empty') === 'true';
    debug('out-path-not-empty: ' + outPathNotEmpty);
    if (!outPathNotEmpty) {
      if (existsSync(outPathFull) && readdirSync(outPathFull).length !== 0) {
        // eslint-disable-next-line quotes
        throw new Error("out_path '" + outPath + "' exists and is not empty");
      }
      mkdirSync(outPathFull, { recursive: true });
      debug('out_path created');
    }

    const file = getInput('file');
    debug('input file: ' + file);
    const repoInfo: RepositoryInfo = await getRepositoryInfo(
      token,
      process.env.GITHUB_REPOSITORY,
    );
    const title = getTitle(repoInfo.full_name);
    const pagesInfo: PagesInfo = await getPagesInfo(
      token,
      process.env.GITHUB_REPOSITORY,
    );

    const userSocials = await getUserSocials(token, repoInfo.owner.login);
    const twitterHandle = getTwitterHandle(userSocials);

    // Render HTML
    const readmeContents = readFileSync(resolve(file), {
      encoding: 'utf-8',
    });
    const markdownContents = await getRenderedMarkdown(token, readmeContents);
    const htmlCompiler = compile(html);
    const compilerLocals: LocalsObject = {
      title: title,
      content: markdownContents,
      repositoryName: process.env.GITHUB_REPOSITORY,
      repositoryUrl:
        process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY,
      description: repoInfo.description,
      url: pagesInfo.html_url,
      twitter: { username: twitterHandle },
    };
    debug(
      'html compiler locals: ' +
        JSON.stringify({ ...compilerLocals, content: '[RENDERED HTML]' }),
    );
    const htmlRendered = htmlCompiler(compilerLocals);
    const htmlPath = join(outPathFull, 'index.html');
    writeFileSync(htmlPath, htmlRendered);
    debug(`html file written: ${htmlPath}`);

    // Write CSS
    const cssPath = join(outPathFull, 'index.css');
    writeFileSync(cssPath, css);
    debug(`css file written: ${cssPath}`);
  } catch (e) {
    if (e instanceof Error) setFailed(e.message);
  }
}

main();
