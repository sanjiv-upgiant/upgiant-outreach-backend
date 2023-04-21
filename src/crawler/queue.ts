import Queue from 'bull';
import scrape from './scraper';
import UrlModel from './../modules/campaign/Url.model';
import { extractTitleAndText } from './../modules/utils/url';
import { extractCompanySummaryFromTitleAndBody } from './../modules/langchain/info.langchain';

// Create the Bull queue
const scrapeQueue = new Queue('scrape', { redis: { port: 6379, host: '127.0.0.1' } });
scrapeQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed with result`);
});

scrapeQueue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error ${err}`);
});

// Process jobs in the queue
scrapeQueue.process(async (job) => {
    const { url, campaign } = job.data;

    // Scrape the URL using Puppeteer
    const html = await scrape(url);
    const { title, body } = extractTitleAndText(html);

    await UrlModel.findOneAndUpdate({ url }, {
        html,
        campaign,
        url,
        title,
        body
    }, { upsert: true });

    const res = await extractCompanySummaryFromTitleAndBody(title, body)
    const companyInfo = JSON.parse(res);

    await UrlModel.findOneAndUpdate({ url }, {
        info: companyInfo
    }, { upsert: true });

});

export default scrapeQueue;
