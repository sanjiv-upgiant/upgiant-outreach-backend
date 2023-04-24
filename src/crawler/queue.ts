import Queue from 'bull';
import UrlModel, { CampaignUrlModel } from './../modules/campaign/Url.model';
import { SearchType, UrlStatus } from './../modules/campaign/campaign.interfaces';
import { extractCompanySummaryFromTitleAndBody } from './../modules/langchain/summary';
import { extractTitleAndText } from './../modules/utils/url';
import scrape from './scraper';
import { cleanupAllAxiosInstances } from '@/modules/limitedAxios';


// Create the Bull queue
const scrapeQueue = new Queue('scrape', { redis: { port: 6379, host: '127.0.0.1' } });
scrapeQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed with result`);
    cleanupAllAxiosInstances();
});

scrapeQueue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error ${err}`);
});

// Process jobs in the queue
scrapeQueue.process(async (job) => {
    const { url, campaign, searchType } = job.data;

    // Scrape the URL using Puppeteer
    let title = "";
    let body = "";
    let status = UrlStatus.QUEUED;
    const urlFromDatabase = await UrlModel.findOne({ url });
    if (urlFromDatabase) {
        title = urlFromDatabase.title;
        body = urlFromDatabase.body;
        status = urlFromDatabase.status;
    }
    else {
        const html = await scrape(url);
        const { title: urlTitle, body: urlBody } = extractTitleAndText(html);
        title = urlTitle;
        body = urlBody;
        await UrlModel.create({
            html,
            url,
            title: urlTitle,
            body: urlBody,
            status: UrlStatus.QUEUED
        });
    }

    await CampaignUrlModel.findOneAndUpdate({ campaign, url }, {
        campaign,
        url
    },
        { upsert: true }
    );

    if (status !== UrlStatus.SUMMARY_EXTRACTED) {
        const res = await extractCompanySummaryFromTitleAndBody(title, body)
        const companyInfo = JSON.parse(res);

        await UrlModel.findOneAndUpdate({ url }, {
            info: companyInfo,
            status: UrlStatus.SUMMARY_EXTRACTED
        }, { upsert: true });
    }

    if (searchType === SearchType.DOMAINS) {
        // pass 
    }
    else if (searchType === SearchType.DOMAINS_WITH_SERP) {
        // pass 
    }

});

// (async () => {
//     const user = "644125a75daaa50147f25a88";
//     const campaignId = "cam_KdWhWv6pPRzWTuhex";
//     const email = "sanjiv@upgiant.com";
//     const integration = await IntegrationModel.findOne({ user, type: "LEMLIST" });
//     if (integration) {
//         const data = await addLeadToCampaign(integration.accessToken, campaignId, email, {
//             rightOEmail: "sanjiv@upgiant.com",
//             rightOFirstName: "Chris",
//             rightOLastName: "Jenkins",
//             rightODesignation: "CEO",
//             rightOCompanyName: "Righto"
//         });
//         console.log(data);
//     }
// });

export default scrapeQueue;
