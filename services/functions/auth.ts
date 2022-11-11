import { Session, AuthHandler } from "@serverless-stack/node/auth";
import { Table } from "@serverless-stack/node/table";
import { ViteStaticSite } from "@serverless-stack/node/site";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { SmugMugAdapter, SmugMugUser } from "./smugmug/adapter";

declare module "@serverless-stack/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string;
    };
  }
}

export const handler = AuthHandler({
  providers: {
    smugmug: SmugMugAdapter({
      clientId: process.env.SMUGMUG_CLIENT_ID!,
      clientSecret: process.env.SMUGMUG_CLIENT_SECRET!,
      onSuccess: async (user: SmugMugUser) => {
        const ddb = new DynamoDBClient({});
        await ddb.send(
          new PutItemCommand({
            TableName: Table.users.tableName,
            Item: marshall(user),
          })
        );

        return Session.parameter({
          redirect: process.env.IS_LOCAL
            ? "http://127.0.0.1:3000"
            : ViteStaticSite.site.url,
          type: "user",
          properties: {
            userID: user.userId,
          },
        });
      },
    }),
  },
});
