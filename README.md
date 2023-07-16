# markdown-to-pages-action

Turn your README in to a two-file static site.

Only an `index.html` and `index.css` file are rendered. The only JavaScript
included controls the dark-mode toggling feature.

## Inputs

### `token`

**Required:** A token is required to communicate with the Github API

### `file`

Markdown file to render (*default: ***ROOT `README.md`****)

### `out-path`

Path the rendered files will be output to (*default: ***`dist`****)

### `out-path-not-empty`

Sets whether any files are expected to be in the output directory
(*default: ***`'false'`****)

Unless set to `'true'`, this Action will error if the output directory has any
files or directories in it. This is to prevent unintended overwriting of any
files.

### `title`

Title of the page (*default: ***`username/repository`****)

## Example usage

In your repository, under `Settings`>`Pages`, ensure that `Source` is set to
`Github Actions`.

![Github Pages settings source Actions](images/setting_pages_actions.png)

```yaml
jobs:
  build:
    steps:
    - uses: actions/checkout@v3
    - uses: wranders/markdown-to-pages-action@v0.1
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
    - uses: actions/upload-pages-artifact@v2
      with:
        path: dist
    - run: cp ./images ./dist/images/

  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
    - uses: actions/deploy-pages@v1
      id: deployment
```

Only HTML and CSS are created. If your
README references seperate resources like images, those directories will have to
be copied to the `out-path` separately.

## Credits

This project is ***heavily*** inspired by
[aleen42/markdown-only](https://github.com/aleen42/markdown-only). In fact, all
of the rendered styling is based on their work. The motivation for this project
was to not have to include all of the Jekyll files in repositories I wanted to
use that Pages style for and leverage Actions.

An improvement made here over the original project is that Github CSS is pulled
from Github's published `npm` Node Packages instead of curated. The downsize is
a larger stylesheet, though this may be addressed in a later release.
