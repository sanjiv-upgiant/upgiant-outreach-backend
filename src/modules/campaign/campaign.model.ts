
import mongoose from 'mongoose';
import paginate from '../paginate/paginate';
import toJSON from '../toJSON/toJSON';
import { CampaignStatus, ICampaignDoc, ICampaignModel, SearchType } from './campaign.interfaces';

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
        urls: {
            type: [String],
        },
        status: {
            type: String,
            enum: CampaignStatus,
            default: CampaignStatus.PROGRESS
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
