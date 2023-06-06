import { IntegrationOutputModel } from "./../../modules/integrations/integration.model";
import axios from "axios";

export interface IEmailVerifierResponse {
    status: "deliverable" | "undeliverable" | "risky" | "unknown" | "undefined",
    email: string,
    firstName?: string
}

const CACHE_TIME_PERIOD_EMAILABLE = 30 * 24 * 60 * 60 * 1000;

export const getEmailableHealth = async (accessToken: string) => {

    const emailabeApiUrl = `https://api.emailable.com/v1/account?api_key=${accessToken}`;
    const res = await axios.get(emailabeApiUrl);
    return res.data;
}

export const getEmailVerificationFromEmailableAndUpdate = async (key: string, email: string, accessToken: string, integrationId: string) => {
    const emailabeApiUrl = `https://api.emailable.com/v1/verify?email=${email}&api_key=${accessToken}`;
    const response = await axios.get(emailabeApiUrl);
    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, result: response.data, integration: integrationId },
        { upsert: true }
    );
    return response.data;
}

export const getCachedVerifiedEmailResponseFromEmailable = async (email: string, accessToken: string, integrationId: string) => {
    const key = `emailable-${email}`;
    const cachedIntegration = await IntegrationOutputModel.findOne({ key });
    if (cachedIntegration) {
        const updatedDate = cachedIntegration.updatedAt;
        const currentDate = new Date();
        const timeDifference = currentDate.getTime() - updatedDate.getTime();
        if (timeDifference >= CACHE_TIME_PERIOD_EMAILABLE) {
            const freshResult = await getEmailVerificationFromEmailableAndUpdate(key, email, accessToken, integrationId);
            return freshResult;
        }

        return cachedIntegration.result;
    }
    const freshResult = await getEmailVerificationFromEmailableAndUpdate(key, email, accessToken, integrationId);
    return freshResult;
}


export const parseEmailableResponse = (data: { [x: string]: any }): IEmailVerifierResponse => {
    const firstName = data["first_name"];
    const state = data["deliverable"];
    const email = data["email"]
    return {
        firstName,
        status: state,
        email
    }
}