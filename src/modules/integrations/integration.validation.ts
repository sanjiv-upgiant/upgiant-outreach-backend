
import Joi from 'joi';
import { IntegrationTypes } from './integration.interfaces';

export const integrationValidation = {
    body: Joi.object().keys({
        type: Joi.string()
            .valid(IntegrationTypes)
            .required(),
        accessToken: Joi.string()
            .optional(),
        refreshToken: Joi.string()
            .optional(),
        clientId: Joi.string()
            .optional(),
        clientSecret: Joi.string()
            .optional(),
        meta: Joi.object()
            .optional()
    }),
};
