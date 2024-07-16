const mongoose = require("mongoose");
const { Schema } = mongoose;
const { isEmail } = require("validator");

const institutionSchema = new Schema({
  accountNumber: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  institutionUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Cambio: Asegurarse de usar "institutionUsers" para claridad
  resources: [{ type: mongoose.Schema.Types.ObjectId, ref: "InformationResource" }],
  _id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // El ID del usuario que es la institución
}, {
  timestamps: true // Habilita createdAt y updatedAt
});

const Institution = mongoose.model("Institution", institutionSchema);

module.exports = Institution;
