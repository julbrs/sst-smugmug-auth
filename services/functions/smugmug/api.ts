import OAuth from "oauth";

const domain = "https://api.smugmug.com";
const baseUrl = `${domain}/api/v2`;

const requestUrl = `${domain}/services/oauth/1.0a/getRequestToken`;
export const authUrl = `${domain}/services/oauth/1.0a/authorize`;
const accessUrl = `${domain}/services/oauth/1.0a/getAccessToken`;
const signatureMethod = "HMAC-SHA1";

export interface OAuthToken {
  token: string;
  tokenSecret: string;
}
export const SmugMugOAuth = class {
  oauth: OAuth.OAuth;

  constructor(consumerKey: string, consumerSecret: string) {
    this.oauth = new OAuth.OAuth(
      requestUrl,
      accessUrl,
      consumerKey,
      consumerSecret,
      "1.0A",
      null,
      signatureMethod,
      undefined,
      // mandatory to get JSON result on GET and POST method (LIVE API Browser instead!)
      { Accept: "application/json" }
    );
  }

  getOAuthRequestToken = async (callback: string): Promise<OAuthToken> => {
    return new Promise((resolve, reject) => {
      this.oauth.getOAuthRequestToken(
        {
          oauth_callback: callback,
        },
        (error, oAuthToken, oAuthTokenSecret, results) => {
          if (error) {
            reject(error);
          }
          resolve({ token: oAuthToken, tokenSecret: oAuthTokenSecret });
        }
      );
    });
  };

  getOAuthAccessToken = async (
    requestToken: OAuthToken,
    oAuthVerifier: string
  ): Promise<OAuthToken> => {
    return new Promise((resolve, reject) => {
      this.oauth.getOAuthAccessToken(
        requestToken.token,
        requestToken.tokenSecret,
        oAuthVerifier,
        (error, oAuthAccessToken, oAuthAccessTokenSecret, results) => {
          if (error) {
            reject(error);
          }
          resolve({
            token: oAuthAccessToken,
            tokenSecret: oAuthAccessTokenSecret,
          });
        }
      );
    });
  };

  get = async (url: string, accessToken: OAuthToken) => {
    return new Promise((resolve, reject) => {
      this.oauth.get(
        `${domain}${url}`,
        accessToken.token,
        accessToken.tokenSecret,
        (error, responseData, result) => {
          if (error) {
            console.log(error);
            reject(error);
          }
          if (typeof responseData == "string") {
            resolve(JSON.parse(responseData).Response);
          } else {
            const err = Error("not a valid answer");
            console.log(err.message);
            reject(err);
          }
        }
      );
    });
  };
};
