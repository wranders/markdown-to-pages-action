import { apiGet } from './request';

export type OwnerSocial = {
  provider: string;
  url: string;
};

export async function getOwnerSocials(
  token: string,
  owner: string,
): Promise<OwnerSocial[]> {
  return JSON.parse(
    await apiGet(token, '/users/' + owner + '/social_accounts'),
  );
}

export function getTwitterHandle(socials: OwnerSocial[]): string | undefined {
  const obj = socials.find((social) => social.provider === 'twitter');
  if (obj === undefined) return undefined;
  const re = /^https?:\/\/(www.)?(twitter|x).com\/@?(?<handle>\w+)/;
  const match = re.exec(obj.url);
  return match?.groups?.handle;
}
