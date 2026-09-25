import { estimateMelody } from './song'
self.onmessage=(event:MessageEvent<{samples:Float32Array;rate:number}>)=>{
  try {self.postMessage({result:estimateMelody(event.data.samples,event.data.rate)})}
  catch(error){self.postMessage({error:error instanceof Error?error.message:'Could not estimate this melody.'})}
}
