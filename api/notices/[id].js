import {noticeContext,parseBody,requireInstructor,sendJson} from '../../src/notices-service.mjs';
import {idFromPath,resourceId,safeContent} from '../../src/resource-zones.mjs';
export default async function handler(req,res){
 if(!['GET','PUT'].includes(req.method)){res.setHeader('Allow','GET, PUT');return sendJson(res,405,{error:'METHOD_NOT_ALLOWED'})}
 const id=idFromPath(req,'notices');if(!id)return sendJson(res,400,{error:'INVALID_NOTICE_ID'});
 const ctx=await noticeContext(req);if(ctx.error)return sendJson(res,ctx.status,{error:ctx.error});
 if(req.method==='GET'){const{data,error}=await ctx.db.schema('defense').from('notices').select('id,title,content').eq('id',id).maybeSingle();if(error)return sendJson(res,502,{error:'DATA_SOURCE_UNAVAILABLE'});if(!data)return sendJson(res,404,{error:'NOTICE_NOT_FOUND'});return sendJson(res,200,{id:data.id,resourceId:resourceId('notice',data.id),title:data.title,body:data.content})}
 const check=await requireInstructor(ctx);if(!check.allowed)return sendJson(res,check.status,{error:check.status===503?'ROLE_CHECK_UNAVAILABLE':'INSTRUCTOR_REQUIRED'});
 const content=safeContent(parseBody(req));if(!content)return sendJson(res,400,{error:'INVALID_NOTICE'});
 const{data,error}=await ctx.db.schema('defense').from('notices').update(content).eq('id',id).eq('owner_id',ctx.identity.userId).select('id').maybeSingle();
 if(error)return sendJson(res,502,{error:'DATA_SOURCE_UNAVAILABLE'});if(!data)return sendJson(res,404,{error:'NOTICE_NOT_FOUND'});
 return sendJson(res,200,{id,resourceId:resourceId('notice',id)});
}
