

import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IIntegrationDoc, IIntegrationModel, IIntegrationOutputDoc, IIntegrationOutputModel, IntegrationTypes } from './integration.interfaces';

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
        clientId: String,
        clientSecret: String,
        meta: {
            type: Object
        }
    },
    {
        timestamps: true,
    },
);

const integrationOutputSchema = new mongoose.Schema<IIntegrationOutputDoc, IIntegrationOutputModel>(
    {
        key: String,
        integration: String,
        result: Object
    },
    {
        timestamps: true,
    },
);



// add plugin that converts mongoose to json
integrationSchema.plugin(toJSON);
integrationSchema.plugin(paginate);

integrationOutputSchema.plugin(toJSON);
integrationOutputSchema.plugin(paginate);

const IntegrationModel = mongoose.model<IIntegrationDoc, IIntegrationModel>('Integration', integrationSchema);
export const IntegrationOutputModel = mongoose.model<IIntegrationOutputDoc, IIntegrationOutputModel>('IntegrationOutput', integrationOutputSchema);

export default IntegrationModel;
