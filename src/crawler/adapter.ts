
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { bullQueues } from './queue';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/v1/admin/queues');

const bullQueuesAdapters = bullQueues.map((queue) => new BullAdapter(queue, { readOnlyMode: true }))

createBullBoard({
    queues: bullQueuesAdapters,
    serverAdapter
})

