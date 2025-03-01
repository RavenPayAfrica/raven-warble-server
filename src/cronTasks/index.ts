import { SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import IncomingTransaction from '../models/IncomingTransaction';
import { subDays } from 'date-fns';

const CleanUpOldTransactionsTask = new AsyncTask(
    'clean up old transactions',
    async (id)=>{
        let date = subDays(new Date, 30);
        IncomingTransaction.query().where('created_at', '>', date).delete()
    },
    err=>{
        console.log(err)
    }
)

export const CleanUpOldTransactionsJob = new SimpleIntervalJob({hours: 23 }, CleanUpOldTransactionsTask)