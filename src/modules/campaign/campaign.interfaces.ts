import { Document, Model } from "mongoose";

export enum CampaignStatus {
    PROGRESS = "PROGRESS",
    FINISHED = "FINISHED",
    ERROR = "ERRORED",
}

export interface ICampaign {
    user: string;
    name: string;
    urls: string[];
    status: CampaignStatus
}

export interface ICampaignDoc extends ICampaign, Document {
}

export interface ICampaignModel extends Model<ICampaignDoc> {
    _id: string
}

export interface IUrl {
    campaign: string,
    url: string,
    html: string,
}

export interface IUrlDoc extends IUrl, Document {
}

export interface IUrlModel extends Model<ICampaignDoc> {
    _id: string
}
