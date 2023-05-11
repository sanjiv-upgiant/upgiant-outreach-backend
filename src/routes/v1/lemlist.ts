import CampaignModel from './../../modules/campaign/campaign.model';
import { logger } from './../../modules/logger';
import express, { Router } from 'express';

const router: Router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { type = "", campaignId = "" } = req.body;
        console.log(req.body, 'from lemlist');
        switch (type) {
            case "emailsSent":
                findAndUpdateByType("emailsSent", campaignId)
                break;
            case "emailsOpened":
                findAndUpdateByType("emailsOpened", campaignId)
                break;
            case "emailsClicked":
                findAndUpdateByType("emailsClicked", campaignId)
                break;
            case "emailsReplied":
                findAndUpdateByType("emailsReplied", campaignId)
                break;
            case "emailsBounced":
                findAndUpdateByType("emailsBounced", campaignId)
                break;
            case "emailsInterested":
                findAndUpdateByType("emailsInterested", campaignId)
                break;


            default:
                break;
        }
    }
    catch (err: unknown) {
        logger.error("lemlist error", JSON.stringify(err));
    }

    return res.status(200).send({})
})

const findAndUpdateByType = async (campaignId: string, type: string) => {
    await CampaignModel.updateMany({ emailSearchServiceCampaignId: campaignId }, {
        "$inc": {
            [type]: 1
        }
    })
}

export default router;

