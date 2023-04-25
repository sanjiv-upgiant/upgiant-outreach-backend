import { logger } from './../../modules/logger';
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
    try {
        const response = await axios.post(
            `https://api.lemlist.com/api/campaigns/${campaignId}/leads/${email}?access_token=${accessToken}`,
            data,
        );
        return response.data;
    } catch (error: any) {
        const errorMessage = `Campaign Id: ${campaignId} Lemlist Error: ${error?.message}`
        logger.error(errorMessage);
        return null
    }
};
