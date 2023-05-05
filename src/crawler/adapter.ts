
import { ExpressAdapter } from '@bull-board/express';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/v1/admin/queues');



