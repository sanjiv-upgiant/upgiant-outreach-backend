
import { ICampaign } from './campaign.interfaces';
import CampaignModel from './campaign.model';

export const createCampaign = async (campaign: ICampaign, user: string) => {
    return CampaignModel.create({ ...campaign, user });
}
