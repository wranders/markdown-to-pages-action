import { debug, getInput, info, setSecret } from '@actions/core';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { FileToRender } from './render';

export type Inputs = {
  customCSS: string;
  files: FileToRender[];
  outPath: string;
  outPathNotEmpty: boolean;
  title: string;
  token: string;
};

/**
 * Process Action inputs, validate where necessary, and return them in a format
 *  directly usable by the rest of the Action.
 * @returns {Inputs} - validated and processed Action inputs
 */
export function getInputs(): Inputs {
  // Gather raw Action inputs
  const inputCustomCSS: string = getInput('custom_css');
  const inputFiles: string = getInput('files');
  const inputOutPathNotEmpty: boolean =
    getInput('out_path_not_empty') === 'true';
  const inputOutPath: string = getInput('out_path');
  const inputTitle: string = getInput('title');
  const inputToken: string = getInput('token', { required: true });

  // Mask the token
  setSecret(inputToken);

  // Validate use and ensure the existence of out_path
  const outPath: string = validateEnsureOutPath(
    inputOutPath,
    inputOutPathNotEmpty,
  );

  // Gather files to render
  const files: FileToRender[] = getFiles(inputFiles);

  // If a custom CSS file was specified, check if it exists
  getCustomCSS(inputCustomCSS);

  const inputs: Inputs = {
    customCSS: inputCustomCSS,
    files: files,
    outPath: outPath,
    outPathNotEmpty: inputOutPathNotEmpty,
    title: inputTitle,
    token: inputToken,
  };

  debug(`inputs: ${JSON.stringify(inputs)}`);

  return inputs;
}

/**
 * Check if 'path' exists and is empty if 'notEmpty' is not true.
 * If 'path' does not exist, create it.
 * Return the resolved path of 'path'.
 * @param {string} path - output directory path
 * @param {boolean} notEmpty - whether 'path' is allowed to be not empty
 * @returns {string} - resolved path of 'path'
 * @throws {Error} - if 'path' already exists and is not empty when 'notEmpty'
 *  is not true
 */
function validateEnsureOutPath(path: string, notEmpty: boolean): string {
  let outPath: string;
  // If out_path is not provided, use the default 'dist' directory
  if (path.length === 0) {
    outPath = resolve('dist');
    info('out_path is empty, using default dist directory');
  } else {
    outPath = resolve(path);
  }
  // Check if out_path exists
  // If it does exist, is not empty, and out_path_not_empty is not true,
  // throw an error
  const outExists: boolean = existsSync(outPath);
  if (outExists && !notEmpty && readdirSync(outPath).length !== 0) {
    const msg: string =
      `out_path '${outPath}' already exists, is not empty, and using this` +
      // eslint-disable-next-line quotes
      " directory is not explicitly allowed with 'out_path_not_empty=true'.";
    throw new Error(msg);
  }
  // If out_path does not exist and out_path_not_empty is true, notify the user
  // as this may be unexpected
  if (!outExists && notEmpty) {
    const msg: string =
      `out_path '${outPath}' does not exist and 'out_path_not_empty=true'.` +
      ' was the directory expected to exist?' +
      ` creating directory '${outPath}'...`;
    info(msg);
  }
  // Ensure out_path exists and return the resolved path
  mkdirSync(outPath, { recursive: true });
  debug(`out_path: ${outPath}`);
  return outPath;
}

/**
 * Get the list of files to render.
 * If no files are provided, search for a README file in the root directory.
 * Throw an error if no README file is found.
 * @param {string} inputFiles - newline delimited list of files to render
 * @returns {FileToRender[]} - list of files to render
 * @throws {Error} - if no README file is found
 * @throws {Error} - if a specified file does not exist
 */
function getFiles(inputFiles: string): FileToRender[] {
  // Input files are newline delimited, so split on newlines and filter out
  // empty lines.
  let files: string[] = inputFiles.split(/\r?\n/).filter((f) => f !== '');
  // If no files were provided, search for a README file in the root directory.
  // Throw an error if no README file is found.
  if (files.length === 0) {
    const readmes: string[] = readdirSync(resolve('.')).filter((f) =>
      /readme/i.exec(f),
    );
    if (readmes.length === 0) {
      throw new Error('no default readme file(s) found');
    }
    files = readmes;
  }
  // Create an array of files to render that contains the absolute path of the
  // source file and the absolute path of the destination file.
  const toRender: FileToRender[] = [];
  files.forEach((filename) => {
    const absolute: string = resolve(filename);
    if (!existsSync(absolute)) {
      throw new Error(`file '${absolute}' does not exist`);
    }
    toRender.push({
      path: filename,
      absolutePath: absolute,
    });
  });
  return toRender;
}

/**
 * Check if custom CSS file exists
 * @param {string} file - path to custom CSS file
 * @throws {Error} - if the custom CSS file does not exist
 */
function getCustomCSS(file: string): void {
  if (file.length === 0) return;
  const path: string = resolve(file);
  if (!existsSync(path)) {
    const msg: string = `custom css file '${path}' does not exist`;
    throw new Error(msg);
  }
}
