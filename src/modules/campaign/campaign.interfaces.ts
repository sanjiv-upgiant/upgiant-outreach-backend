import { Document, Model } from "mongoose";

export enum CampaignStatus {
    PROGRESS = "PROGRESS",
    FINISHED = "FINISHED",
    ERROR = "ERRORED",
}

export enum SearchType {
    CONTACTS = "CONTACTS",
    DOMAINS = "DOMAINS",
    DOMAINS_WITH_SERP = "DOMAINS_WITH_GOOGLE_SEARCh",
}

export interface ICampaign {
    user: string;
    name: string;
    urls: string[];
    status: CampaignStatus,
    objective: string;
    audienceFilters: {
        seniority: string,
        title: string,
        department: string,
    },
    searchType: SearchType
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
    title: string,
    body: string,
    info: { [x: string]: any },
}

export interface IUrlDoc extends IUrl, Document {
}

export interface IUrlModel extends Model<IUrlDoc> {
    _id: string
}
