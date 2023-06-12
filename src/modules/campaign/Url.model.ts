

import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ICampaignUrlDoc, ICampaignUrlModel, IUrlDoc, IUrlModel, IVoteStatus, UrlStatus } from './campaign.interfaces';

const campaignUrlSchema = new mongoose.Schema<ICampaignUrlDoc, ICampaignUrlModel>({
    url: {
        type: String,
        required: true,
        trim: true
    },
    campaignId: {
        type: String,
        required: true,
        trim: true
    },
    emailSubject: {
        type: String,
    },
    emailBody: {
        type: String,
    },
    emailSubjects: {
        type: [String],
    },
    emailBodies: {
        type: [String],
    },
    emailExtracted: {
        type: Boolean,
        default: false
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    addedToOutreachAgent: {
        type: Boolean,
        default: false
    },
    error: {
        type: Boolean,
        default: false
    },
    errorReason: {
        type: String,
    },
    contactEmails: {
        type: mongoose.Schema.Types.Mixed
    },
    vote: {
        type: String,
        enum: IVoteStatus,
        default: IVoteStatus.NEUTRAL
    }
})

const urlSchema = new mongoose.Schema<IUrlDoc, IUrlModel>(
    {
        url: {
            type: String,
            required: true,
            trim: true
        },
        html: {
            type: String,
        },
        title: {
            type: String,
        },
        body: {
            type: String,
        },
        info: {
            type: String,
        },
        status: {
            type: Number,
            enum: UrlStatus
        }

    },
    {
        timestamps: true,
    },
);


// add plugin that converts mongoose to json
urlSchema.plugin(toJSON);
urlSchema.plugin(paginate);

campaignUrlSchema.plugin(toJSON);
campaignUrlSchema.plugin(paginate);

const UrlModel = mongoose.model<IUrlDoc, IUrlModel>('Url', urlSchema);
export const CampaignUrlModel = mongoose.model<ICampaignUrlDoc, ICampaignUrlModel>('CampaignUrl', campaignUrlSchema);

export default UrlModel;
