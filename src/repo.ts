import { apiGet } from './request';

export type RepositoryInfo = {
  name: string;
  full_name: string;
  description: string;
  owner: {
    login: string;
  };
};

export type PagesInfo = {
  html_url: string;
};

export async function getRepositoryInfo(
  token: string,
  repo: string,
): Promise<RepositoryInfo> {
  return JSON.parse(await apiGet(token, '/repos/' + repo));
}

export async function getPagesInfo(
  token: string,
  repo: string,
): Promise<PagesInfo> {
  return JSON.parse(await apiGet(token, '/repos/' + repo + '/pages'));
}
