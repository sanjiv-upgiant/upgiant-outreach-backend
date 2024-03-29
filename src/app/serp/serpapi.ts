import { BaseResponse, GoogleParameters, getJson } from "serpapi";
import { CACHE_TTL } from "./../../constants";
import { IntegrationOutputModel } from "./../../modules/integrations/integration.model";

interface SerpResponse {
    integration: string,
    accessToken: string,
    domain: string;
    positions?: string[];
    title?: string;
    department?: string
    seniority?: string
}

const getSerpQuery = (params: Omit<SerpResponse, "accessToken">) => {
    const { domain, positions, title, department, seniority } = params;
    let query = `${domain} linkedin `;
    if (positions?.length) {
        query += positions[0] + " ";
    }
    if (title) {
        query += title + " ";
    }
    if (department) {
        query += department + " ";
    }
    if (seniority) {
        query += seniority + " ";
    }
    if (!positions?.length && !title) {
        query += "CEO"
    }
    query = query.trim();
    return query;
}

const getQueryAndSerpApiResponse = async (params: SerpResponse) => {
    const { accessToken } = params;
    const query = getSerpQuery(params)
    const response = await getJson("google", { q: `${query}`, api_key: accessToken });
    return [query, response];
}

export const cacheSerpApiResponseWithQuery = async (params: SerpResponse) => {
    const domain = params.domain ? `${params.domain} | ` : '';
    const department = params.department ? `${params.department} | ` : '';
    const position = params.positions?.length ? `${params.positions[0]} | ` : '';
    const title = params.title ? params.title : '';
    const seniority = params.seniority ? params.seniority : '';

    const key = `${domain}-${department}-${position}-${title}-${seniority}`;

    const cachedResult = await IntegrationOutputModel.findOne({ key });
    if (cachedResult && (Date.now() - cachedResult.updatedAt.getTime()) / 1000 < CACHE_TTL) {
        const query = getSerpQuery(params);
        return [query, cachedResult.result];
    }

    const [query, result] = await getQueryAndSerpApiResponse(params);

    await IntegrationOutputModel.findOneAndUpdate(
        { key },
        { key, integration: params.integration, result },
        { upsert: true }
    );

    return [query, result];
};

export const parseSerpResponse = (serpResponse: BaseResponse<GoogleParameters>) => {
    const organicResults = serpResponse["organic_results"];
    let response = "";
    for (const organicResult of organicResults) {
        const title = organicResult["title"];
        const snippet = organicResult["snippet"];
        response += title + "\n";
        response += snippet + "\n";
        const siteLinkInlines = organicResult?.["sitelinks"]?.["inline"];
        const siteLinkExpanded = organicResult?.["sitelinks"]?.["expanded"];
        if (siteLinkInlines) {
            for (const sitelink of siteLinkInlines) {
                const title = sitelink["title"];
                response += title + '\n';
            }
        }
        if (siteLinkExpanded) {
            for (const sitelink of siteLinkExpanded) {
                const title = sitelink["title"];
                const snippet = sitelink["snippet"];
                response += title + '\n';
                response += snippet + '\n';
            }
        }
    }
    return response.trim();
}