

import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IIntegrationDoc, IIntegrationModel, IntegrationTypes } from './integration.interfaces';

const integrationSchema = new mongoose.Schema<IIntegrationDoc, IIntegrationModel>(
    {
        user: {
            type: String,
            required: true,
        },

        type: {
            type: String,
            enum: IntegrationTypes
        },
        accessToken: String,
        refreshToken: String,
        apiKey: String,
        meta: {
            type: Object
        }
    },
    {
        timestamps: true,
    },
);

// add plugin that converts mongoose to json
integrationSchema.plugin(toJSON);
integrationSchema.plugin(paginate);

const IntegrationModel = mongoose.model<IIntegrationDoc, IIntegrationModel>('Integration', integrationSchema);

export default IntegrationModel;
