require("dotenv").config();

const express = require("express");
const { buildSchema } = require("graphql");
const { graphqlHTTP } = require("express-graphql");

const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Post = require("./models/Post");
require("./mongoconnect");

const jwtSecret = process.env.JWT_SECRET;

/**
 * -  Download project
 * - npm i
 * - npm run debug
 *
 * Required:
 *  - implement User type
 *  - rewrite Mutations
 *  - rewrite Login function
 *  - Delete Post by Id (Authenticated) Bonus(user owner only can delete post)
 *  - Patch Post content by Id (Authenticated) Bonus(user owner only can patch post)
 *  - Get All posts (Array of posts, and each post include user)
 *  - Get Posts of specific user (by userId) (Authenticated)
 */

const schema = buildSchema(`
  type User {
  id:ID
  age:Int
  firstName:String
   lastName:String 

  }
  type RegistrationResult{
    id:ID
    username: String
    error: String
  }
  type LoginResult{
    token: String
    error: String
  }
  type deleteResult{
    status:String
    error:String
  }
 
  input UserRegisterInput{
    username: String!
    age: Int
    firstName: String
    lastName: String
    password: String!
  }

  input UserLoginInput{
    username: String!
    password: String!
  }
  input createPostUser{
    id:ID
    age:Int
    firstName:String
     lastName:String 
  
  }

  type Post{
    id: ID
    content: String
    user: User
    error: String
  }
  type Query {
    ping: String
    getPost(id: ID!, token:String!): Post
    getAllPosts:[Post]
  }
  type Mutation {
    createUser(input: UserRegisterInput!): RegistrationResult
    deletePostById(id: ID! , token:String!):deleteResult
    createPost(content: String! , token:String!):Post
    loginUser(input:UserLoginInput):LoginResult
    updateById(id:ID! , content:String! , token : String! ):deleteResult
    getPostById(id:ID!):[Post]
    getUserPostsById(id:ID! , token: String!):[Post]!
  }

`);


const deletePostById= async ({token , id}) =>{
  try {
    if(id !== getUserIdFromJWT(token)){
      
      throw Error("unauthorized user not an owner");
    }
    const user = await Post.deleteOne({ _id: id });
    if (user) {
      return { status: "done" };
    }
  } catch (err) {
    return { error: err.message };
  }
}




const updateById = async ({ id, content , token }) => {
  
  try {
    if(id !== getUserIdFromJWT(token)){
      
      throw Error("unauthorized user not an owner");
    }
    const status = await Post.findByIdAndUpdate(id, { content });
    return { status: "done" };
  } catch (err) {
    return { error: err.message };
  }
};
const getUserIdFromJWT=(token)=>{
  const {userId}=jwt.verify(token,jwtSecret);
  return userId;
}

const createJWT = (id) => {
  return jwt.sign({ userId: id }, JWT_SECRET);
};
const getPostById = async ({ id }) => {
  try {
    const Posts = await User.findById(id);
    return [...posts];
  } catch (err) {
    return { error: err.message };
  }
};
const getUserPostsById = async ({ id, token }) => {
  try {
    const posts = await Post.find({ UserId: id });
    return [...posts];
  } catch (err) {
    return { error: err.message };
  }
};

const verifyToken = (token) => {
  try {
    const { userId } = jwt.verify(token, jwtSecret);
    return User.findById(userId);
  } catch (error) {
    return null;
  }
};

const withAuthentication = (fn) => async ({ token, ...params }) => {
  const user = await verifyToken(token);
  if (!user) return { error: "Authentication error" };
  return fn({ ...params, user , token});
};

const createPost = async ({ content, user }) => {
  const post = new Post({ content, userId: user.id });
  await post.save();
  return { ...post.toJSON(), id: post.id, user };
};
const getPost = async ({ id }) => {
  const post = await Post.findById(id).populate("userId");
  return { ...post.toJSON(), user: post.userId };
};

const usersMutations = {
  async getAllPosts() {
    try {
      const posts = await Post.find();
      return [...posts];
    } catch (err) {
      return { error: err.message };
    }
  },
  deletePostById:withAuthentication(deletePostById),
  updateById: withAuthentication(updateById),
  async createUser({ input }) {
    try {
      const user = new User(input);
      await user.save();
      return user;
    } catch (error) {
      return { error: error.message };
    }
  },
  async loginUser({ input: { username, password } }) {
    const user = await User.findOne({ username });

    if (user) {
      return user.password == password
        ? { token: jwt.sign({ userId: user._id }, jwtSecret) }
        : { error: "unAuthorized User" };
    }
    return { error: "unAuthorized User" };
  },
  createPost: withAuthentication(createPost),
  getPost: withAuthentication(getPost),
  getPostById: withAuthentication(getPostById),
  getUserPostsById: withAuthentication(getUserPostsById),
};

const app = express();

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue: {
      ...usersMutations,
    },
    graphiql: true,
  })
);

app.listen(5000, () => {
  console.log("Server is runing");
});
