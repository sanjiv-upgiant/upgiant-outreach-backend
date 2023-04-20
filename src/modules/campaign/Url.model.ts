

import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IUrlDoc, IUrlModel } from './campaign.interfaces';

const urlSchema = new mongoose.Schema<IUrlDoc, IUrlModel>(
    {
        campaign: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
            trim: true
        },
        html: {
            type: String,
        }
    },
    {
        timestamps: true,
    },
);

// add plugin that converts mongoose to json
urlSchema.plugin(toJSON);
urlSchema.plugin(paginate);

const UrlModel = mongoose.model<IUrlDoc, IUrlModel>('Url', urlSchema);

export default UrlModel;
