// Node-only test resolution. No production bundle includes this loader.
export async function resolve(specifier,context,nextResolve){
 if(specifier==="cloudflare:workers")return {url:"data:text/javascript,export class WorkflowEntrypoint {}",shortCircuit:true};
 return nextResolve(specifier,context);
}
