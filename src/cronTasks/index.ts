import { SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import IncomingTransaction from '../models/IncomingTransaction';
import { subDays } from 'date-fns';
import config from '../config/app';

const CleanUpOldTransactionsTask = new AsyncTask(
    'clean up old transactions',
    async (id)=>{
        let date = subDays(new Date, config.maxInflowLifeTime,);
        await IncomingTransaction.query().where('created_at', '>', date).delete()
    },
    err=>{
        console.log(err)
    }
)

export const CleanUpOldTransactionsJob = new SimpleIntervalJob({hours: 4 }, CleanUpOldTransactionsTask)