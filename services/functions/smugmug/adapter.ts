import {
  useCookie,
  useDomainName,
  usePath,
  useQueryParams,
} from "@serverless-stack/node/api";
import { createAdapter } from "@serverless-stack/node/auth";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { authUrl, OAuthToken, SmugMugOAuth } from "./api";

export interface SmugMugUser {
  userId: string;
  fullName: string;
  uri: string;
  webUri: string;
  accessToken: OAuthToken;
}

export interface SmugMugConfig {
  /**
   * The clientId provided by SmugMug
   */
  clientId: string;
  /**
   * The clientSecret provided by SmugMug
   */
  clientSecret: string;

  onSuccess: (user: SmugMugUser) => Promise<APIGatewayProxyStructuredResultV2>;
}

export const SmugMugAdapter = createAdapter((config: SmugMugConfig) => {
  return async function () {
    const oauth = new SmugMugOAuth(config.clientId, config.clientSecret);

    const [step] = usePath().slice(-1);

    if (step === "authorize") {
      // Step 1: Obtain a request token

      const callback =
        "https://" +
        [useDomainName(), ...usePath().slice(0, -1), "callback"].join("/");

      const requestToken = await oauth.getOAuthRequestToken(callback);

      // Step 2: Redirect the user to the authorization URL
      const expires = new Date(Date.now() + 1000 * 30).toUTCString();

      return {
        statusCode: 302,
        cookies: [
          `req-token=${JSON.stringify(
            requestToken
          )}; HttpOnly; expires=${expires}`,
        ],
        headers: {
          location: `${authUrl}?oauth_token=${requestToken.token}&Access=Full&Permissions=Modify`,
        },
      };
    }

    // Step 3: The user logs in to SmugMug (on SmugMug side)
    // The user is presented with a request to authorize your app

    // Step 4: If the user accepts, they will be redirected back to your app, with a verification code embedded in the request
    // Use the verification code to obtain an access token

    if (step === "callback") {
      const params = useQueryParams();
      const reqToken: OAuthToken = JSON.parse(useCookie("req-token"));
      const accessToken = await oauth.getOAuthAccessToken(
        reqToken,
        params.oauth_verifier!
      );
      const response: any = await oauth.get(`/api/v2!authuser`, accessToken);
      const user: any = response.User;

      return config.onSuccess({
        userId: user.NickName,
        fullName: user.Name,
        uri: user.Uri,
        webUri: user.WebUri,
        accessToken,
      });
    }

    throw new Error("Invalid auth request");
  };
});
