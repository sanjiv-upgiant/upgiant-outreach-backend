
import { Document, Model } from "mongoose";

export enum IntegrationTypes {
    SNOVIO = "SNOVIO",
    OPENAI = "OPENAI",
    HUNTER = "HUNTER",
    APOLLO = "APOLLO",
    LEMLIST = "LEMLIST"
}

export interface IIntegration {
    user: string;
    type: IntegrationTypes,
    accessToken: string;
    refreshToken: string;
    apiKey: string,
    meta: { [x: string]: any }
}

export interface IIntegrationDoc extends IIntegration, Document {
}

export interface IIntegrationModel extends Model<IIntegrationDoc> {
    _id: string
}
