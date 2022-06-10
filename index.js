const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError,
  ApolloError
} = require("apollo-server");
const { v1: uuid } = require("uuid");
const BSON = require("bson");
const mongoose = require("mongoose");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const url_db = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.h6zdp.mongodb.net/book-app?retryWrites=true`;

const Book = require("./models/book");
const Author = require("./models/author");
const User = require("./models/user");
const { argsToArgsConfig } = require("graphql/type/definition");

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
    me: User
  }
  type Book {
    title: String!
    author: Author!
    published: Int
    genres: [String!]
    _id: ID!
  }
  type Author {
    name: String!
    _id: String
    born: Int
    bookCount: Int
  }
  input AuthorInput {
    name: String!
    _id: String
    born: Int
    bookCount: Int
  }
  type Mutation {
    addBook(
      title: String!
      author: AuthorInput!
      published: Int
      genres: [String!]
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
    addAuthor(name: String!, born: Int): Author
    createUser(username: String!, favoriteGenre: String!): User
    login(username: String!, password: String!): Token
  }
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }
  type Token {
    value: String!
  }
`;
const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      // let a = books;

      const author = await Author.findOne({ name: args.author }).then((a) => a);
      // console.log(author);
      if (!author) {
        return null;
      }
      const books = await Book.find({ author: author });
      console.log(books);
      // const as = mongoose.Types.ObjectId(books.author);
      // const id = as.toString().replace(/ObjectId\("(.*)"\)/, "$1");
      // books.author = await Author.findById(id);
      // books.author = await Author.findById(books.author._id);
      return books;
      // if (args.genre) {
      //   books.forEach((b) => {
      //     let as = b.genres.find((g) => g === args.genre);
      //     if (as) {
      //       a = [...a, b];
      //     }
      //   });
      // }
      // return a;
    },
    allAuthors: (root, args) => {
      //#region codigo anterior

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
      //#endregion
      return Author.find({}).then((a) => a);
    },
    me: (root, args, context) => {
      return context.currentUser;
    }
  },
  Mutation: {
    addBook: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError("not authenticated");
      }
      const author = await Author.findOne({ name: args.author.name }).then(
        (a) => a
      );

      // authors.find((a) => {
      //   if (a.name !== args.author) {
      //     addAuthorFunc(args.author);
      //     return authors;
      //   }
      // });
      console.log(author);
      // args.bookCount = 1;

      if (author) {
        // name: String!
        // id: String
        // born: Int
        // bookCount: Int

        // JSON.parse(author);
        args.author = author;
        console.log(args.author);
        const book = new Book({ ...args });
        console.log(book);
        try {
          await book.save();
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args
          });
        }
        book.author = await Author.findById(author._id).then((a) => a);
        // console.log(asd);
        return book;
      } else {
        throw new ApolloError("No se encontro el autor!");
        // return null;
      }

      // const book = { ...args, id: uuid() };

      // books = books.concat(book);
    },
    editAuthor: async (root, args, { currentUser }) => {
      // let aut = authors.find((a) => a.name === args.name);
      const author = await Author.findOne({ name: args.name }).then((a) => a);
      if (!currentUser) {
        throw new AuthenticationError("not authenticated");
      }
      if (!author) {
        return null;
      }
      author.born = args.setBornTo;
      console.log(author);

      try {
        await author.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      }
      // authors = authors.map((p) => (p.name === args.name ? updatedAuthor : p));
      return author;
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
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre
      });
      return user.save().catch((error) => {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== "secred") {
        throw new UserInputError("Wrong credentials");
      }
      const userForToken = {
        username: user.username,
        id: user._id
      };
      return { value: jwt.sign(userForToken, JWT_SECRET) };
    }
  }
};
const addAuthorFunc = (name) => {
  authors = [...authors, { name, id: uuid() }];
};
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith("bearer")) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    } else {
      console.log("no esta autorizado");
    }
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
