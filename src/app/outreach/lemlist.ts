import axios from 'axios';

interface LeadData {
    rightOEmailBody: string,
    rightOEmailSubject: string,
    rightOFirstName: string,
    rightOLastName: string,
    rightODesignation: string,
    rightOCompanyName: string,
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
