import Queue from 'bull';
import { searchWithDomain } from './../helpers/domain-search';
import { searchWithSerpAndDomain } from './../helpers/domain-with-serp-search';
import UrlModel, { CampaignUrlModel } from './../modules/campaign/Url.model';
import { CampaignStatus, ICampaignDoc, SearchType, UrlStatus } from './../modules/campaign/campaign.interfaces';
import CampaignModel from './../modules/campaign/campaign.model';
import IntegrationModel from './../modules/integrations/integration.model';
import { extractCompanySummaryFromTitleAndBody } from './../modules/langchain/summary';
import { cleanupAllAxiosInstances } from './../modules/limitedAxios';
import { extractTitleAndText } from './../modules/utils/url';
import scrape from './scraper';




const getCampaignQueue = (queueId: string) => {
    const scrapeQueue = new Queue(queueId, { redis: { port: 6379, host: '127.0.0.1' } });
    scrapeQueue.on('completed', (job) => {
        console.log(`Job ${job.id} completed with result`);
        cleanupAllAxiosInstances();
        CampaignModel.findByIdAndUpdate(queueId, {
            status: CampaignStatus.FINISHED
        })
    });

    scrapeQueue.on('failed', (job, err) => {
        console.log(`Job ${job.id} failed with error ${err}`);
        const { url } = job.data;

        CampaignUrlModel.findOne({ url, campaignId: queueId }, {
            error: true,
            errorReason: `${err?.message}. Something went wrong`
        })

    });

    scrapeQueue.process(async (job) => {
        const { url, campaignJson } = job.data;
        const {
            id,
            searchType,
            openAiIntegrationId
        } = campaignJson as ICampaignDoc

        await CampaignUrlModel.findOneAndUpdate({ campaignId: id, url }, {
            campaignId: id,
            url
        },
            { upsert: true }
        );


        let title = "";
        let body = "";
        let status = UrlStatus.QUEUED;
        let urlFromDatabase = await UrlModel.findOne({ url });
        if (urlFromDatabase?.title) {
            title = urlFromDatabase.title;
            body = urlFromDatabase.body;
            status = urlFromDatabase.status;
        }
        else {
            const html = await scrape(url);
            const { title: urlTitle, body: urlBody } = extractTitleAndText(html);
            title = urlTitle;
            body = urlBody;
            urlFromDatabase = await UrlModel.findOneAndUpdate({ url }, {
                html,
                url,
                title: urlTitle,
                body: urlBody,
                status: UrlStatus.SUMMARY_EXTRACTED
            }, {
                upsert: true,
                new: true
            });
        }

        if (!urlFromDatabase || !title || !body) {
            await CampaignUrlModel.findOneAndUpdate({ url, campaignId: campaignJson.id }, {
                error: true,
                errorReason: "Couldn't extract title and body"
            });
            return;
        }

        if (status !== UrlStatus.SUMMARY_EXTRACTED) {
            const openAi = await IntegrationModel.findById(openAiIntegrationId);
            if (!openAi) {
                return;
            }
            const info = await extractCompanySummaryFromTitleAndBody(title, body, openAi.accessToken)
            await UrlModel.findOneAndUpdate({ url }, {
                info,
                status: UrlStatus.SUMMARY_EXTRACTED
            }, { upsert: true });
        }

        if (searchType === SearchType.DOMAINS) {
            await searchWithDomain(campaignJson, urlFromDatabase);
        }
        else if (searchType === SearchType.DOMAINS_WITH_SERP) {
            await searchWithSerpAndDomain(campaignJson, urlFromDatabase);
        }

    });


    return scrapeQueue;
}




export default getCampaignQueue;
