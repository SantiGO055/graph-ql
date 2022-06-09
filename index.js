const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError
} = require("apollo-server");
const { v1: uuid } = require("uuid");

const mongoose = require("mongoose");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const url_db = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.h6zdp.mongodb.net/book-app?retryWrites=true`;

const Book = require("./models/book");
const Author = require("./models/author");
const User = require("./models/user");

let authors = [
  {
    name: "Robert Martin",
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952
  },
  {
    name: "Martin Fowler",
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: "Fyodor Dostoevsky",
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  {
    name: "Joshua Kerievsky", // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e"
  },
  {
    name: "Sandi Metz", // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e"
  }
];
mongoose
  .connect(url_db)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error);
  });
/*
 * Suomi:
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
 *
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 */

let books = [
  {
    title: "Clean Code",
    published: 2008,
    author: "Robert Martin",
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring"]
  },
  {
    title: "Agile software development",
    published: 2002,
    author: "Robert Martin",
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ["agile", "patterns", "design"]
  },
  {
    title: "Refactoring, edition 2",
    published: 2018,
    author: "Martin Fowler",
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring"]
  },
  {
    title: "Refactoring to patterns",
    published: 2008,
    author: "Joshua Kerievsky",
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring", "patterns"]
  },
  {
    title: "Practical Object-Oriented Design, An Agile Primer Using Ruby",
    published: 2012,
    author: "Sandi Metz",
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ["refactoring", "design"]
  },
  {
    title: "Crime and punishment",
    published: 1866,
    author: "Fyodor Dostoevsky",
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ["classic", "crime"]
  },
  {
    title: "The Demon ",
    published: 1872,
    author: "Fyodor Dostoevsky",
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ["classic", "revolution"]
  }
];

const typeDefs = gql`
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }
  type Book {
    title: String!
    author: Author!
    published: Int
    genres: [String!]
    id: ID!
  }
  type Author {
    name: String!
    id: String
    born: Int
    bookCount: Int
  }
  type Mutation {
    addBook(
      title: String!
      author: Author!
      published: Int
      genres: [String!]
    ): [Book]
    editAuthor(name: String!, setBornTo: Int!): Author
    addAuthor(name: String!, born: Int): Author
  }
`;

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: (root, args) => {
      let a = books;
      if (args.author) {
        a = [];
        books.forEach((b) => {
          if (b.author === args.author) {
            a = [...a, b];
          }
        });
      }
      if (args.genre) {
        books.forEach((b) => {
          let as = b.genres.find((g) => g == args.genre);
          if (as) {
            a = [...a, b];
          }
        });
      }
      return a;
    },
    allAuthors: (root, args) => {
      // let auxArr = [];
      // let idAux = 0;
      // let autoresEncontradosEnLosLibros = undefined;
      //Busco autores con sus libros
      // authors.forEach((a) => {
      //   a.bookCount = 0;
      //   books.forEach((b) => {
      //     if (a.name == b.author) {
      //       a.bookCount += 1;
      //     }
      //   });
      //   auxArr = [...auxArr, a];
      // });
      // let personasMap = auxArr.map((item) => {
      //   return [item.name, item];
      // });
      // var personasMapArr = new Map(personasMap);
      // let unicos = [...personasMapArr.values()];
      // console.log(unicos);
      // auxArr = auxArr.filter((item,index)=>{
      //     return auxArr.indexOf(item) === index;
      //   })
      // return unicos;
      return Author.find({}).then((a) => a);
    }
  },
  Mutation: {
    addBook: async (root, args) => {
      const author = await Author.findOne({ name: args.author.name }).then(
        (a) => a
      );

      // authors.find((a) => {
      //   if (a.name !== args.author) {
      //     addAuthorFunc(args.author);
      //     return authors;
      //   }
      // });
      args.bookCount = 1;
      args.author = author;
      const book = new Book({ ...args });
      console.log(book);
      try {
        await book.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      }

      // const book = { ...args, id: uuid() };

      books = books.concat(book);
      return book;
    },
    editAuthor: (root, args) => {
      let aut = authors.find((a) => a.name === args.name);
      if (!aut) {
        return null;
      }
      console.log(aut);
      const updatedAuthor = { ...aut, born: args.setBornTo };
      authors = authors.map((p) => (p.name === args.name ? updatedAuthor : p));
      return updatedAuthor;
    },
    addAuthor: async (root, args) => {
      args.bookCount = 0;
      const author = new Author({ ...args });
      try {
        await author.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      }
      return author;
    }
  }
};
const addAuthorFunc = (name) => {
  authors = [...authors, { name, id: uuid() }];
};
const server = new ApolloServer({
  typeDefs,
  resolvers
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
