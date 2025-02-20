import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { compileString } from 'sass';

const srcDir = resolve('src');
const nodeModulesDir = resolve('node_modules');

async function main(): Promise<void> {
  // HTML
  const htmlContents = readFileSync(join(srcDir, 'index.pug'), {
    encoding: 'utf-8',
  })
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  const fileContents = `const html: string = \`${htmlContents}\`;
export default html;
`;
  const importsOutDir = join(srcDir, 'imports');
  if (!existsSync(importsOutDir)) mkdirSync(importsOutDir);
  writeFileSync(join(importsOutDir, 'html.ts'), fileContents);

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
  .gh-logo { fill: #fff; }
  .profile-color-modes-toggle-thumb { transform: translateX(18px); }
  --color-profile-color-modes-toggle-track-border: var(--color-scale-purple-8);
  --color-profile-color-modes-toggle-track-bg: var(--color-scale-purple-9);
  --color-profile-color-modes-toggle-thumb-bg: var(--color-scale-purple-6)
}
[data-color-mode=light][data-light-theme*=light] {
  ${githubSyntaxLightContents}
  .gh-logo { fill: #24292f; }
  --color-profile-color-modes-toggle-track-border: var(--color-scale-gray-3);
  --color-profile-color-modes-toggle-track-bg: var(--color-scale-white);
  --color-profile-color-modes-toggle-thumb-bg: var(--color-scale-gray-8)
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
.markdown-heading .anchor:hover { opacity: 1; }
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
