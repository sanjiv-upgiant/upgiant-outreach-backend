import axios from 'axios';
import { PROD_BACKEND_URL } from './../../constants';
import { logger } from './../../modules/logger';

interface LeadData {
    [x: string]: string
}

export const addLeadToCampaignUsingLemlist = async (accessToken: string, campaignId: string, email: string, data: LeadData): Promise<any> => {
    const response = await axios.post(
        `https://api.lemlist.com/api/campaigns/${campaignId}/leads/${email}?access_token=${accessToken}`,
        data,
    );
    return response.data;
};

export const getLemlistTeam = async (accessToken: string): Promise<any> => {
    const response = await axios.get(
        `https://api.lemlist.com/api/team?access_token=${accessToken}`,
    );
    return response.data;
}

export const getCampaignsFromLemlist = async (accessToken: string, offset = "") => {
    const url = `https://api.lemlist.com/api/campaigns?access_token=${accessToken}&offset=${offset}`;
    const response = await axios.get(url);
    return response.data
}

export const addLemlistWebHookForGivenCampaign = async (accessToken: string) => {
    try {
        const url = `https://api.lemlist.com/api/hooks?access_token=${accessToken}`;
        const response = await axios.post(url, {
            targetUrl: PROD_BACKEND_URL + "/lemlist-hook",
            isFirst: true
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        return response.data
    }
    catch (err) {
        logger.error("lemlist adding webhook error", err);
        return null;
    }
}
