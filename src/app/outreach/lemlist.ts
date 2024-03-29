import axios from 'axios';
import { PROD_BACKEND_URL } from './../../constants';
import { logger } from './../../modules/logger';
import { IContactEmail } from 'src/helpers/domain-search';
import { removeSurroundingQuotes } from './../../modules/utils/text';

interface LeadData {
  [x: string]: string;
}

export const addLeadOfCampaignLemlist = async (
  accessToken: string,
  campaignId: string,
  email: string,
  data: LeadData
): Promise<any> => {
  const response = await axios.post(
    `https://api.lemlist.com/api/campaigns/${campaignId}/leads/${email}?access_token=${accessToken}&deduplicate=false`,
    data
  );
  return response.data;
};

export const deleteLeadOfCampaignLemlist = async (accessToken: string, campaignId: string, email: string): Promise<any> => {
  const response = await axios.delete(
    `https://api.lemlist.com/api/campaigns/${campaignId}/leads/${email}?access_token=${accessToken}&action=remove`
  );
  return response.data;
};

export const updateLeadOfCampaignLemlist = async (
  accessToken: string,
  campaignId: string,
  email: string,
  data: LeadData
): Promise<any> => {
  const response = await axios.patch(
    `https://api.lemlist.com/api/campaigns/${campaignId}/leads/${email}?access_token=${accessToken}`,
    data
  );
  return response.data;
};

export const getLemlistTeam = async (accessToken: string): Promise<any> => {
  const response = await axios.get(`https://api.lemlist.com/api/team?access_token=${accessToken}`);
  return response.data;
};

export const getCampaignsFromLemlist = async (accessToken: string, offset = '') => {
  const url = `https://api.lemlist.com/api/campaigns?access_token=${accessToken}&offset=${offset}`;
  const response = await axios.get(url);
  return response.data;
};

export const addLemlistWebHookForGivenCampaign = async (accessToken: string) => {
  try {
    const url = `https://api.lemlist.com/api/hooks?access_token=${accessToken}`;
    const response = await axios.post(
      url,
      {
        targetUrl: PROD_BACKEND_URL + '/lemlist-hook',
        isFirst: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    logger.error('lemlist adding webhook error', err);
    return null;
  }
};

export const getLemlistLeadBodyFromContactEmails = (
  emailBody: string,
  emailSubject: string,
  contactEmail: IContactEmail
) => {
  return {
    icebreaker: emailBody,
    upgiantEmailSubject: removeSurroundingQuotes(emailSubject),
    upgiantCompanyName: contactEmail?.['companyName'] ?? '',
    upgiantDesignation: contactEmail?.['position'] ?? '',
    upgiantFirstName: contactEmail?.['firstName'] ?? '',
    upgiantLastName: contactEmail?.['lastName'] ?? '',
  };
};
