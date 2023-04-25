
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { CampaignStatus, ICampaignDoc, ICampaignModel, SearchType, DomainEmailSearchTypes, OutreachAgent } from './campaign.interfaces';

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
            title: String,
            department: String,
        },
        searchType: {
            type: String,
            enum: SearchType,
            default: SearchType.DOMAINS
        },
        emailSearchService: {
            type: String,
            enum: DomainEmailSearchTypes,
        },
        outreachAgent: {
            type: String,
            enum: OutreachAgent,
        },
        includeDetails: {
            type: String
        },
        campaignId: {
            type: String
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
