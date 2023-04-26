import Queue from 'bull';
import UrlModel, { CampaignUrlModel } from './../modules/campaign/Url.model';
import { ICampaignDoc, SearchType, UrlStatus } from './../modules/campaign/campaign.interfaces';
import { extractCompanySummaryFromTitleAndBody } from './../modules/langchain/summary';
import { cleanupAllAxiosInstances } from './../modules/limitedAxios';
import { extractTitleAndText } from './../modules/utils/url';
import scrape from './scraper';
import { searchWithDomain } from './../helpers/domain-search';
import { searchWithSerpAndDomain } from './../helpers/domain-with-serp-search';


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
    const { url, campaignJson, user } = job.data;
    const {
        id,
        searchType
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
        urlFromDatabase = await UrlModel.create({
            html,
            url,
            title: urlTitle,
            body: urlBody,
            status: UrlStatus.QUEUED
        });
    }


    if (status !== UrlStatus.SUMMARY_EXTRACTED) {
        const res = await extractCompanySummaryFromTitleAndBody(title, body)
        const companyInfo = JSON.parse(res);
        await UrlModel.findOneAndUpdate({ url }, {
            info: companyInfo,
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



export default scrapeQueue;
