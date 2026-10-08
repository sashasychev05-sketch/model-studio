import {statisticsAdapter} from '../../lib/compute/adapters.js';
self.onmessage=async e=>{const {jobId,modelRevision,request}=e.data;try{const result=await statisticsAdapter.run(request);self.postMessage({jobId,modelRevision,status:'ok',result});}catch(error){self.postMessage({jobId,modelRevision,status:'error',error:error.message});}};
