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
                await findAndUpdateByType("emailsSent", campaignId)
                break;
            case "emailsOpened":
                await findAndUpdateByType("emailsOpened", campaignId)
                break;
            case "emailsClicked":
                await findAndUpdateByType("emailsClicked", campaignId)
                break;
            case "emailsReplied":
                await findAndUpdateByType("emailsReplied", campaignId)
                break;
            case "emailsBounced":
                await findAndUpdateByType("emailsBounced", campaignId)
                break;
            case "emailsInterested":
                await findAndUpdateByType("emailsInterested", campaignId)
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

const findAndUpdateByType = async (type: string, campaignId: string) => {
    console.log("updating type => ", type, " for campaign " + campaignId);
    await CampaignModel.updateMany({ emailSearchServiceCampaignId: campaignId }, {
        "$inc": {
            [type]: 1
        }
    })
}

export default router;

