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

export enum DomainEmailSearchTypes {
    SNOVIO = "SNOVIO",
    HUNTER = "HUNTER",
    APOLLO = "APOLLO",
}

export enum OutreachAgent {
    LEMLIST = "LEMLIST"
}



export interface ICampaign {
    user: string;
    name: string;
    urls: string[];
    status: CampaignStatus,
    modelName: string,
    objective: string;
    audienceFilters: {
        seniority: string,
        position: string,
        department: string,
    },
    searchType: SearchType,
    emailSearchServiceId: string,
    serpApiId: string,
    outreachAgentId: string,
    includeDetails: string,
    campaignId: string,
}

export enum UrlStatus {
    QUEUED,
    SUMMARY_EXTRACTED,
}

export interface ICampaignDoc extends ICampaign, Document {
}

export interface ICampaignModel extends Model<ICampaignDoc> {
    _id: string
}

export interface IUrl {
    url: string,
    html: string,
    title: string,
    body: string,
    info: { [x: string]: any },
    status: UrlStatus
}

export interface IUrlDoc extends IUrl, Document {
}

export interface IUrlModel extends Model<IUrlDoc> {
    _id: string
}
export interface ICampaignUrl {
    url: string,
    campaignId: string,
    emailSubject: string,
    emailBody: string,
    emailExtracted: boolean,
    isCompleted: boolean,
    error: boolean,
    errorReason: string
}

export interface ICampaignUrlDoc extends ICampaignUrl, Document {
}

export interface ICampaignUrlModel extends Model<ICampaignUrlDoc> {
    _id: string
}
