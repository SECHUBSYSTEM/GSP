import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { ROLES } from '../workflow/types.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ROLES, required: true },
    agentId: { type: String },
  },
  { timestamps: true }
);

export type IUser = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User = mongoose.model('User', userSchema);
