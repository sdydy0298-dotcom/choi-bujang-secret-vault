import {randomUUID} from 'node:crypto';
import {noticeContext,parseBody,requireInstructor,sendJson} from '../src/notices-service.mjs';
import {resourceId,safeContent} from '../src/resource-zones.mjs';
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'})}
 const url=new URL(req.url??'','https://resource.invalid');if(url.pathname!=='/api/notices'||url.search)return sendJson(res,404,{error:'RESOURCE_NOT_FOUND'});
 const ctx=await noticeContext(req);if(ctx.error)return sendJson(res,ctx.status,{error:ctx.error});
 if(req.method==='GET'){const{data,error}=await ctx.db.schema('defense').from('notices').select('id,title,content,created_at').order('created_at',{ascending:true});if(error)return sendJson(res,502,{error:'DATA_SOURCE_UNAVAILABLE'});return sendJson(res,200,{notices:(data??[]).map(x=>({id:x.id,resourceId:resourceId('notice',x.id),title:x.title,body:x.content}))})}
 const check=await requireInstructor(ctx);if(!check.allowed)return sendJson(res,check.status,{error:check.status===503?'ROLE_CHECK_UNAVAILABLE':'INSTRUCTOR_REQUIRED'});
 const content=safeContent(parseBody(req));if(!content)return sendJson(res,400,{error:'INVALID_NOTICE'});
 const id=randomUUID(),{error}=await ctx.db.schema('defense').from('notices').insert({id,owner_id:ctx.identity.userId,...content});if(error)return sendJson(res,502,{error:'DATA_SOURCE_UNAVAILABLE'});
 return sendJson(res,201,{id,resourceId:resourceId('notice',id)});
}
