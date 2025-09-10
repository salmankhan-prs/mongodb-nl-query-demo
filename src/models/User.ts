import { Schema, model, type Document } from "mongoose";

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  age: number;
  city: string;
  country: string;
  joinedAt: Date;
  preferences: {
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
  isActive: boolean;
  totalOrders: number;
  totalSpent: number;
  membershipLevel: "bronze" | "silver" | "gold" | "platinum";
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 13,
      max: 120,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    preferences: {
      categories: {
        type: [String],
        default: [],
      },
      priceRange: {
        min: {
          type: Number,
          default: 0,
        },
        max: {
          type: Number,
          default: 10000,
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    membershipLevel: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum"],
      default: "bronze",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ city: 1, country: 1 });
UserSchema.index({ membershipLevel: 1 });
UserSchema.index({ totalSpent: -1 });
UserSchema.index({ joinedAt: -1 });

export const UserModel = model<IUser>("User", UserSchema);
