import { Document, Model } from "mongoose";

export enum CampaignStatus {
    PROGRESS = "PROGRESS",
    ERROR = "ERRORED",
    FINISHED = "FINISHED",
}

export enum CampaignRunningStatus {
    PAUSED = "PAUSED",
    RUNNING = "RUNNING",
}

export enum SearchType {
    DOMAINS = "DOMAINS",
    MANUAL_UPLOAD = "MANUAL_UPLOAD",
    DOMAINS_WITH_SERP = "DOMAINS_WITH_GOOGLE_SEARCH",
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
    runStatus: CampaignRunningStatus;
    urls: string[];
    status: CampaignStatus,
    modelName: string,
    objective: string;
    gptModelTemperature?: number,
    audienceFilters: {
        seniority: string,
        positions: string[],
        department: string,
    },
    searchType: SearchType,
    emailSearchServiceIds: string[],
    serpApiId: string,
    outreachAgentId: string,
    includeDetails: string,
    emailVerifierId: string,
    openAiIntegrationId: string,
    emailSearchServiceCampaignId: string,
    senderInformation: {
        sendersName: string,
        sendersEmail: string,
        sendersCompanyBusinessSummary: string,
        sendersCompanyDomainURL: string,
        sendersProductService?: string,
    },
    templates: { body: string, subject: string }[],
    emailsSent: number,
    emailsOpened: number,
    emailsClicked: number,
    emailsReplied: number,
    emailsBounced: number,
    emailsInterested: number,
    manualUpload: {
        file: string,
        selectedColumnNames: string[],
        mappedEmail: string
    },
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
    info: string,
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
    emailSubjects: string[],
    emailBodies: string[],
    emailExtracted: boolean,
    isCompleted: boolean,
    error: boolean,
    addedToOutreachAgent: boolean,
    errorReason: string,
    contactEmails: any
}

export interface ICampaignUrlDoc extends ICampaignUrl, Document {
}

export interface ICampaignUrlModel extends Model<ICampaignUrlDoc> {
    _id: string
}
