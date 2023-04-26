
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import scrapeQueue from './queue';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/v1/admin/queues');

createBullBoard({
    queues: [
        new BullAdapter(scrapeQueue, { readOnlyMode: true }), // only this queue will be in read only mode
    ],
    serverAdapter
})
