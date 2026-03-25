import { setFailed } from '@actions/core';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RenderedFile, renderFiles, renderNotFound } from './render';
import {
  PagesInfo,
  RepositoryInfo,
  getPagesInfo,
  getRepositoryInfo,
} from './repo';
import { OwnerSocial, getOwnerSocials, getTwitterHandle } from './social';
import { Inputs, getInputs } from './inputs';

const css = process.env.BUNDLED_CSS as string;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_REPOSITORY: string;
      GITHUB_SERVER_URL: string;
      LOCAL_DEV: string;
      BUNDLED_CSS: string;
    }
  }
}

export async function main(): Promise<void> {
  // Gather inputs
  const inputs: Inputs = getInputs();

  // Gather repository info
  const repoInfo: RepositoryInfo = await getRepositoryInfo(
    inputs.token,
    process.env.GITHUB_REPOSITORY,
  );

  // Gather repository GitHub Pages info
  const pagesInfo: PagesInfo = await getPagesInfo(
    inputs.token,
    process.env.GITHUB_REPOSITORY,
  );

  // Check if the user or organization has a Twitter/X profile linked
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
    inputs.files,
    twitterHandle,
    inputs.customCSS,
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

  // Copy custom CSS file to output
  if (inputs.customCSS.length !== 0) {
    copyFileSync(
      join(resolve('.'), inputs.customCSS),
      join(inputs.outPath, 'custom.css'),
    );
  }
}

main().catch((e) => {
  if (e instanceof Error) setFailed(e.message);
});
