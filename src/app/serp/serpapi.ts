import { CACHE_TTL } from "./../../constants";
import { IntegrationOutputModel } from "./../../modules/integrations/integration.model";
import { BaseResponse, GoogleParameters, getJson } from "serpapi";

interface SerpResponse {
    integration: string,
    accessToken: string,
    domain: string;
    position?: string;
    title?: string;
    department?: string
}

const getSerpApiResponse = async ({ domain, position, title, department, accessToken }: SerpResponse) => {
    let query = `${domain} linkedin `;
    if (position) {
        query += position + " ";
    }
    if (title) {
        query += title + " ";
    }
    if (department) {
        query += department + " ";
    }
    const response = await getJson("google", { q: `${query}`, api_key: accessToken });
    return response;
}

export const cacheSerpApiResponse = async (params: SerpResponse) => {
    const key = `${params.domain} | ${params.department} | ${params.position} | ${params.title}`;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult && (Date.now() - cachedResult.updatedAt.getTime()) / 1000 < CACHE_TTL) {
        return cachedResult.result;
    }

    const result = await getSerpApiResponse(params);

    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, integration: params.integration, result },
        { upsert: true }
    );

    return result;
};

export const parseSerpResponse = async (serpResponse: BaseResponse<GoogleParameters>) => {
    const organicResults = serpResponse["organic_results"];
}