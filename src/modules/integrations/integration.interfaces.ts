
import { Document, Model } from "mongoose";

export enum IntegrationTypes {
    SNOVIO = "SNOVIO",
    OPENAI = "OPENAI",
    HUNTER = "HUNTER",
    APOLLO = "APOLLO",
    LEMLIST = "LEMLIST",
    SERPAPI = "SERPAPI"
}

export interface IIntegration {
    user: string;
    type: IntegrationTypes,
    clientId: string;
    clientSecret: string;
    accessToken: string,
    refreshToken: string,
    meta: { [x: string]: any }
}

export interface IIntegrationDoc extends IIntegration, Document {
}

export interface IIntegrationModel extends Model<IIntegrationDoc> {
    _id: string
}

export interface IIntegrationOutput {
    integration: string;
    key: string;
    result: any
}

export interface IIntegrationOutputDoc extends IIntegrationOutput, Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IIntegrationOutputModel extends Model<IIntegrationOutputDoc> {
    _id: string
}
