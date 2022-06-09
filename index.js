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
const url_db = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.h6zdp.mongodb.net/person-app?retryWrites=true`;

const Person = require("./models/person");
const User = require("./models/user");

mongoose
  .connect(url_db)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connection to MongoDB:", error);
  });

let persons = [
  {
    name: "Arto Hellas",
    phone: "040-123543",
    street: "Tapiolankatu 5 A",
    city: "Espoo",
    id: "3d594650-3436-11e9-bc57-8b80ba54c431"
  },
  {
    name: "Matti Luukkainen",
    phone: "040-432342",
    street: "Malminkaari 10 A",
    city: "Helsinki",
    id: "3d599470-3436-11e9-bc57-8b80ba54c431"
  },
  {
    name: "Venla Ruuska",
    street: "Nallemäentie 22 C",
    city: "Helsinki",
    id: "3d599471-3436-11e9-bc57-8b80ba54c431"
  }
];

const typeDefs = gql`
  type User {
    username: String!
    friends: [Person!]!
    id: ID!
  }
  type Token {
    value: String!
  }

  enum YesNo {
    YES
    NO
  }
  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }

  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person!]!
    findPerson(name: String!): Person
    me: User
  }
  type Address {
    street: String!
    city: String!
  }
  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editNumber(name: String!, phone: String!): Person
    createUser(username: String!): User
    login(username: String!, password: String!): Token
    addAsFriend(name: String!): User
  }
`;
const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: (root, args) => {
      if (!args.phone) {
        return Person.find({}).then((person) => person);
      }

      // const byPhone = (person) =>
      //   args.phone === 'YES' ? person.phone : !person.phone
      // return persons.filter(byPhone)
      return Person.find({
        phone: { $exists: args.phone === "YES" }
      }).then((person) => person);
    },
    findPerson: (root, args) => {
      // return persons.find((p) => p.name === args.name);
      return Person.findOne({ name: args.name }).then((person) => person);
    },
    me: (root, args, context) => {
      return context.currentUser;
    }
  },
  Person: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city
      };
    }
  },

  Mutation: {
    addPerson: async (root, args, context) => {
      // if (persons.find((p) => p.name === args.name)) {
      //   throw new UserInputError("Name must be unique", {
      //     invalidArgs: args.name
      //   });
      // }
      // const person = { ...args, id: uuid() };
      // persons = persons.concat(person);
      // return person;
      const person = new Person({ ...args });
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new AuthenticationError("not authenticated");
      }
      console.log(person);
      try {
        await person.save();
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      }
      return person;
    },
    editNumber: async (root, args) => {
      // const person = persons.find((p) => p.name === args.name);
      const person = await Person.findOne({ name: args.name }).then((p) => p);

      person.phone = args.phone;
      try {
        await person.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        });
      }
      return person;
    },
    createUser: (root, args) => {
      const user = new User({ username: args.username });
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
    },
    addAsFriend: async (root, args, { currentUser }) => {
      const nonFriendAlready = (person) =>
        !currentUser.friends.map((f) => f._id).includes(person._id);
      if (!currentUser) {
        throw new AuthenticationError("not authenticated");
      }
      const person = await Person.findOne({ name: args.name });
      if (nonFriendAlready(person)) {
        currentUser.friends = currentUser.friends.concat(person);
      }
      await currentUser.save();
      return currentUser;
    }
  }
};
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith("bearer")) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id).populate(
        "friends"
      );
      return { currentUser };
    } else {
      console.log("no esta autorizado");
    }
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
