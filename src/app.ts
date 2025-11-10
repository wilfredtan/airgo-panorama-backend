import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import serverlessExpress from '@vendia/serverless-express';
import cors from "cors";
import express from "express";
import * as http from "http";
import morgan from "morgan";
import { typeDefs, resolvers } from './gql';
import connectDB from './database';
import { routes } from './routes';
import { isLocal } from './utils/storage';

// Apollo Server setup
const server = new ApolloServer({
	typeDefs,
	resolvers,
});

// Start Apollo Server in background (handles startup errors by logging and failing all requests)
server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

// Create Express app
export const app = express();

// Middleware
app.use(morgan("tiny"));
app.use(express.json({ limit: "128mb" }));
app.use(express.urlencoded({ limit: "128mb", extended: true }));

// Database connection middleware - runs before all routes
app.use(async (req, res, next) => {
	await connectDB();
	next();
});

// GraphQL endpoint
app.use('/graphql', expressMiddleware(server));

// REST API routes
routes(app);

// Export the async Lambda handler
export const handler = serverlessExpress({ app });

// Only start server for local development
if (isLocal()) {
	const port = process.env.PORT || 3000;
	const httpServer = http.createServer(app);

	httpServer.on("error", (error: NodeJS.ErrnoException) => {
		if (error.syscall !== "listen") {
			throw error;
		} else {
			throw error;
		}
	});

	httpServer.on("listening", () => {
		console.log(`HTTP server listening at ${port}`);
	});

	httpServer.listen(port);
}
