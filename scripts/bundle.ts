import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compileString } from 'sass';

const srcDir = resolve('src');
const nodeModulesDir = resolve('node_modules');

async function main(): Promise<void> {
  const importsOutDir = join(srcDir, 'imports');
  if (!existsSync(importsOutDir)) mkdirSync(importsOutDir);

  // CSS
  const githubSyntaxDarkContents = readFileSync(
    join(nodeModulesDir, 'github-syntax-dark/lib/github-dark.css'),
  );
  const githubSyntaxLightContents = readFileSync(
    join(nodeModulesDir, 'github-syntax-light/lib/github-light.css'),
  );
  // eslint-disable-next-line quotes
  const sassContents = `
@import '@primer/css/index.scss';
[data-color-mode=dark][data-dark-theme*=dark] {
  ${githubSyntaxDarkContents}
  .gh-logo { fill: #ffffff; }
  .profile-color-modes-toggle-thumb { transform: translateX(18px); }
  --color-profile-color-modes-toggle-track-border: #3c1e70;
  --color-profile-color-modes-toggle-track-bg: #271052;
  --color-profile-color-modes-toggle-thumb-bg: #6e40c9;
}
[data-color-mode=light][data-light-theme*=light] {
  ${githubSyntaxLightContents}
  .gh-logo { fill: #24292f; }
  --color-profile-color-modes-toggle-track-border: #afb8c1;
  --color-profile-color-modes-toggle-track-bg: #ffffff;
  --color-profile-color-modes-toggle-thumb-bg: #32383f;
}
.gh-logo { opacity: .5; }
.footer .footprint {
  span { opacity: .5; }
  a { opacity: 1; }
}
.profile-color-modes-toggle {
  position: absolute;
  top: 12px;
  right: 0;
  z-index: 1;
}
.profile-color-modes-toggle-track {
  width:42px;
  height:24px;
  border-radius:24px;
  border:3px solid var(--color-profile-color-modes-toggle-track-border);
  background-color:var(--color-profile-color-modes-toggle-track-bg)
}
.profile-color-modes-toggle-thumb {
  position: absolute;
  top: -2px;
  left: -2px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--color-profile-color-modes-toggle-thumb-bg);
  transition: transform .3s cubic-bezier(.4,.03,0,1);
  cursor: pointer;
}
.markdown-heading { position: relative; }
.markdown-heading .anchor {
  float: left;
  padding-right: 0.25rem;
  line-height: 1;
  position: absolute;
  top: 50%;
  left: -1.75rem;
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  margin: auto;
  opacity: 0;
  justify-content: center;
  align-items: center;
  transform: translateY(-50%);
  color: var(--color-fg-default)
}
.markdown-heading:hover {
  .anchor { opacity: 1; }
}
`;
  const sassRender = compileString(sassContents, {
    loadPaths: ['node_modules'],
  }).css;
  const cssContents = `${sassRender}`
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  const compressedCssContents = compileString(cssContents, {
    style: 'compressed',
  }).css;
  const cssTSContents = `const css: string = \`${compressedCssContents}\`;
export default css;
`;
  writeFileSync(join(importsOutDir, 'css.ts'), cssTSContents);
}

main().catch((msg) => {
  console.error(`\n${msg}\n`);
});
