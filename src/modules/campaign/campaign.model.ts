
import mongoose from 'mongoose';
import paginate from '../paginate/paginate';
import toJSON from '../toJSON/toJSON';
import { CampaignRunningStatus, CampaignStatus, ICampaignDoc, ICampaignModel, SearchType } from './campaign.interfaces';

const campaignSchema = new mongoose.Schema<ICampaignDoc, ICampaignModel>(
    {
        user: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        modelName: {
            type: String,
        },
        runStatus: {
            type: String,
            enum: CampaignRunningStatus,
            default: CampaignRunningStatus.RUNNING
        },
        urls: {
            type: [String],
        },
        status: {
            type: String,
            enum: CampaignStatus,
            default: CampaignStatus.PROGRESS
        },
        senderInformation: {
            sendersName: String,
            sendersCompanyBusinessSummary: String,
            sendersEmail: String,
            sendersCompanyDomainURL: String,
            sendersProductService: String,
        },
        objective: String,
        audienceFilters: {
            seniority: String,
            position: String,
            department: String,
        },
        searchType: {
            type: String,
            enum: SearchType,
            default: SearchType.DOMAINS
        },
        emailSearchServiceId: {
            type: String,
            required: true
        },
        emailSearchServiceCampaignId: {
            type: String,
            required: true
        },
        outreachAgentId: {
            type: String,
            required: true
        },

        serpApiId: {
            type: String,
        },
        includeDetails: {
            type: String
        },
        openAiIntegrationId: {
            type: String,
            required: true
        },
        templates: {
            type: [String],
            required: true
        }
    },
    {
        timestamps: true,
    },
);

// add plugin that converts mongoose to json
campaignSchema.plugin(toJSON);
campaignSchema.plugin(paginate);

const CampaignModel = mongoose.model<ICampaignDoc, ICampaignModel>('Campaign', campaignSchema);

export default CampaignModel;
