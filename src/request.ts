import { ClientRequest } from 'node:http';
import { RequestOptions, request } from 'node:https';
import { format } from 'node:util';

async function requestAPI(
  options: RequestOptions,
  data?: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const requestOptions: RequestOptions = {
      ...options,
      headers: {
        ...options.headers,
        accept: 'application/vnd.github.json',
        'user-agent': 'wranders/markdown-to-pages-action',
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
    if (requestOptions.method?.toUpperCase() === 'POST') req.write(data);
    req.end();
  });
}

function formatToken(token: string): string {
  return format('Bearer %s', token);
}

export async function apiGet(token: string, path: string): Promise<string> {
  const requestOptions: RequestOptions = {
    path: path,
    headers: {
      authorization: formatToken(token),
    },
  };
  return await requestAPI(requestOptions);
}

export async function apiPost(
  token: string,
  path: string,
  data: string,
): Promise<string> {
  const requestOptions: RequestOptions = {
    path: path,
    method: 'POST',
    headers: {
      authorization: formatToken(token),
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(data),
    },
  };
  return await requestAPI(requestOptions, data);
}
