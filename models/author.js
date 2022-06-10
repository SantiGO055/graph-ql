const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      minlength: 4
    },
    born: {
      type: Number
    }
  },
  { versionKey: false }
);

module.exports = mongoose.model("Author", schema);
