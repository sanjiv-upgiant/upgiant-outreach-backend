import axios from 'axios';
import { PROD_BACKEND_URL } from './../../constants';

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

export const addLemlistWebHookForGivenCampaign = async (campaignId: string, accessToken: string) => {
    const url = `https://api.lemlist.com/api/hooks?access_token=${accessToken}`;
    const response = await axios.post(url, {
        campaignId,
        targetUrl: PROD_BACKEND_URL + "/lemlist-hooks",
        isFirst: true
    }, {
        headers: {
            "Content-Type": "application/json"
        }
    });
    return response.data
}
