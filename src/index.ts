import { debug, getInput, info, setFailed, setSecret } from '@actions/core';

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  FileToRender,
  RenderedFile,
  renderFiles,
  renderNotFound,
} from './render';
import {
  PagesInfo,
  RepositoryInfo,
  getPagesInfo,
  getRepositoryInfo,
} from './repo';
import { OwnerSocial, getOwnerSocials, getTwitterHandle } from './social';

import css from './imports/css';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_REPOSITORY: string;
      GITHUB_SERVER_URL: string;
      LOCAL_DEV: string;
    }
  }
}

type Inputs = {
  files: string;
  outPath: string;
  outPathNotEmpty: boolean;
  title: string;
  token: string;
};

function getInputs(): Inputs {
  return {
    files: getInput('files'),
    outPath: getInput('out_path'),
    outPathNotEmpty: getInput('out_path_not_empty') === 'true',
    title: getInput('title'),
    token: getInput('token', { required: true }),
  };
}

export async function main(): Promise<void> {
  try {
    // Gather inputs
    const inputs = getInputs();
    setSecret(inputs.token);
    debug('inputs: ' + JSON.stringify(inputs));

    // Resolve out path and check if existing files is permitted
    inputs.outPath = resolve(inputs.outPath);
    const outExists: boolean = existsSync(inputs.outPath);
    if (!inputs.outPathNotEmpty) {
      if (outExists && readdirSync(inputs.outPath).length !== 0) {
        throw new Error(
          `out_path '${inputs.outPath}' exists and is not empty.` +
            // eslint-disable-next-line quotes
            " set 'out_path_not_empty' to 'true' if needed.",
        );
      }
    }
    if (!outExists && inputs.outPathNotEmpty) {
      info(
        `out_path (${inputs.outPath}) does not exist ` +
          'and out_path_not_empty is "true". ' +
          'was this expected to exist? ' +
          'creating out_path anyway...',
      );
    }
    mkdirSync(inputs.outPath, { recursive: true });
    debug(`out_path '${inputs.outPath}' created`);

    // Check if files are provided. If not, default to README.md in root of repo
    let files: string[] = inputs.files.split(/\r?\n/).filter((f) => f !== '');
    if (files.length === 0) {
      const root: string = resolve('.');
      const readmes: string[] = readdirSync(root).filter((file) =>
        // file.match(/readme/i),
        /readme/i.exec(file),
      );
      if (readmes.length === 0) {
        throw new Error('no files specified and no readme files found');
      }
      files = readmes;
    }

    // Resolve paths of files and check if they exist
    const filesToRender: FileToRender[] = [];
    files.forEach((filename) => {
      const absolute: string = resolve(filename);
      if (!existsSync(absolute)) {
        throw new Error(`file '${absolute}' does not exist`);
      }
      filesToRender.push({
        path: filename,
        aboslutePath: absolute,
      });
    });

    // Gather repository info
    const repoInfo: RepositoryInfo = await getRepositoryInfo(
      inputs.token,
      process.env.GITHUB_REPOSITORY,
    );

    // Gather repository Github Pages info
    const pagesInfo: PagesInfo = await getPagesInfo(
      inputs.token,
      process.env.GITHUB_REPOSITORY,
    );

    // Check if user or organization has a Twitter/X profile linked
    const ownerSocials: OwnerSocial[] = await getOwnerSocials(
      inputs.token,
      repoInfo.owner.login,
    );
    const twitterHandle: string | undefined = getTwitterHandle(ownerSocials);

    // Render each file
    const renderedFiles: RenderedFile[] = await renderFiles(
      inputs.token,
      inputs.title,
      repoInfo,
      pagesInfo,
      filesToRender,
      twitterHandle,
    );

    // Render custom 404
    const renderedNotFound: RenderedFile = renderNotFound(
      inputs.title,
      repoInfo,
      pagesInfo,
      twitterHandle,
    );

    // Write each file
    renderedFiles.forEach((file) => {
      const fileOutDir: string = join(inputs.outPath, file.outPath);
      if (!existsSync(fileOutDir)) {
        mkdirSync(fileOutDir, { recursive: true });
      }
      writeFileSync(join(fileOutDir, 'index.html'), file.contents);
    });
    writeFileSync(join(inputs.outPath, '404.html'), renderedNotFound.contents);

    // Render and write CSS
    writeFileSync(join(inputs.outPath, 'index.css'), css);
  } catch (e) {
    if (e instanceof Error) setFailed(e.message);
  }
}

main();
