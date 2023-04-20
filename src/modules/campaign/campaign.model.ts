
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { CampaignStatus, ICampaignDoc, ICampaignModel } from './campaign.interfaces';

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
        urls: {
            type: [String],
        },
        status: {
            type: String,
            enum: CampaignStatus,
            default: CampaignStatus.PROGRESS
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
