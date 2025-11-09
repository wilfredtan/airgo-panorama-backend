import serverlessExpress from '@vendia/serverless-express';
import { app } from './app';

// Create the serverless express instance
const serverlessExpressInstance = serverlessExpress({ app });

// Export the async Lambda handler
export const handler = async (event: any, context: any) => {
  return new Promise((resolve, reject) => {
    serverlessExpressInstance(event, context, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};
