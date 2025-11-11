import { gql } from 'graphql-tag';
import { listImagesResolver } from './controllers/listImages';
import { bookmarkImageResolver } from './controllers/bookmarkImage';
import { getImageDetailsResolver } from './controllers/getImageDetails';
import { deleteImageResolver } from './controllers/deleteImage';
import { analyticsResolver } from './controllers/analytics';
import { GraphQLScalarType, Kind } from 'graphql';

const dateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast: any) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const typeDefs = gql`
  scalar Date

  type Image {
    id: ID!
    name: String!
    size: Int!
    width: Int!
    height: Int!
    fileType: String!
    createdAt: Date!
    bookmarked: Boolean!
    previewUrl: String!
  }

  type ImageConnection {
    images: [Image!]!
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  type Analytics {
    totalImages: Int!
    bookmarkedCount: Int!
    unbookmarkedCount: Int!
    totalSizeBookmarked: Int!
    totalSizeUnbookmarked: Int!
  }

  type DeleteResult {
    success: Boolean!
    id: ID!
  }

  type Query {
    images(
      search: String
      bookmarkFilter: String
      page: Int
      limit: Int
    ): ImageConnection!
    image(id: ID!): Image!
    analytics: Analytics!
  }

  type Mutation {
    bookmarkImage(id: ID!, bookmarked: Boolean!): Image!
    deleteImage(id: ID!): DeleteResult!
  }

  scalar Upload
`;

export const resolvers = {
  Date: dateScalar,
  Query: {
    images: listImagesResolver,
    image: getImageDetailsResolver,
    analytics: analyticsResolver,
  },
  Mutation: {
    bookmarkImage: bookmarkImageResolver,
    deleteImage: deleteImageResolver,
  },
};
