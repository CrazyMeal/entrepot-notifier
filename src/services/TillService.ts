import * as https from 'https';
import { TillMessage } from '../domain/TillMessage';
import { TillResponse } from '../domain/TillResponse';

export class TillService {
  
  public async sendMessage(message: TillMessage): Promise<TillResponse> {
    const options: https.RequestOptions = {
      host: 'platform.tillmobile.com',
      path: '/api/send?username='+ encodeURIComponent(process.env.TILL_USERNAME!) + '&api_key=' + process.env.TILL_API_KEY,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=UTF-8'
      }
    };
    //return Promise.resolve(new TillResponse(200, {}, 'Ton SMS est envoye !'))
    return this.sendRequest(options, JSON.stringify(message));
  }

  private async sendRequest(urlOptions: https.RequestOptions, data: any): Promise<TillResponse> {
    return new Promise((resolve, reject) => {
      const req = https.request(urlOptions,
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk.toString()));
          res.on('error', reject);
          res.on('end', () => {
            if (res && res.statusCode! >= 200 && res.statusCode! <= 299) {
              resolve(new TillResponse(res.statusCode!, res.headers, body));
            } else {
              reject('Request failed. status: ' + res.statusCode + ', body: ' + body);
            }
          });
        });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}