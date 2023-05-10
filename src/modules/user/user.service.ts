import httpStatus from 'http-status';
import mongoose from 'mongoose';
import User from './user.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import {
  NewCreatedUser, UpdateUserBody, IUserDoc, NewRegisteredUser,
} from './user.interfaces';
import { checkIfSetupIntentSucceeded, createSetupIntentSecret, createStripeCustomer, enableSubscriptionForCustomer } from './../../app/stripe-payment';

/**
 * Create a user
 * @param {NewCreatedUser} userBody
 * @returns {Promise<IUserDoc>}
 */
export const createUser = async (userBody: NewCreatedUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const user = await User.create(userBody);
  const customer = await createStripeCustomer(user.email)
  user.stripeCustomerId = customer.id;
  await user.save();
  return user;
};

export const createUserStripeSetupIntentSecretKeyService = async (userId: string) => {
  const user = await User.findById(userId);
  const stripeSecretKey = await createSetupIntentSecret(user?.stripeCustomerId || "");
  return stripeSecretKey;
}

export const checkSetupIntentAndUpdate = async (userId: string, setupIntentId: string) => {
  const user = await User.findById(userId);
  const isSetupIntentSuccess = await checkIfSetupIntentSucceeded(setupIntentId);
  if (isSetupIntentSuccess && user && !user.hasPaymentMethodAdded) {
    user.hasPaymentMethodAdded = true;
    await user.save();
    await enableSubscriptionForCustomer(user.stripeCustomerId ?? "");
  }
  return true;
}

/**
 * Register a user
 * @param {NewRegisteredUser} userBody
 * @returns {Promise<IUserDoc>}
 */
export const registerUser = async (userBody: NewRegisteredUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const user = await User.create(userBody);
  if (!user?.stripeCustomerId) {
    const customer = await createStripeCustomer(user.email);
    user.stripeCustomerId = customer.id;
    await user.save();
  }
  return user;
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryUsers = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserById = async (id: mongoose.Types.ObjectId): Promise<IUserDoc | null> => User.findById(id);

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserByEmail = async (email: string): Promise<IUserDoc | null> => User.findOne({ email });

/**
 * Update user by id
 * @param {mongoose.Types.ObjectId} userId
 * @param {UpdateUserBody} updateBody
 * @returns {Promise<IUserDoc | null>}
 */
export const updateUserById = async (
  userId: mongoose.Types.ObjectId,
  updateBody: UpdateUserBody,
): Promise<IUserDoc | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<IUserDoc | null>}
 */
export const deleteUserById = async (userId: mongoose.Types.ObjectId): Promise<IUserDoc | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.deleteOne();
  return user;
};
