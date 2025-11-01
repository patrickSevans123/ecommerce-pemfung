import mongoose, { Schema } from 'mongoose';

export interface UserDocument extends mongoose.Document {
  email: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserModel = mongoose.Model<UserDocument>;

const UserSchema = new Schema<UserDocument, UserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

export default (mongoose.models.User as UserModel) || mongoose.model<UserDocument>('User', UserSchema);
