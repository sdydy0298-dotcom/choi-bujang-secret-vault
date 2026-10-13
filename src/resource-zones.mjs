export const RESOURCE_ZONES=Object.freeze({note:'my_notes',notice:'instructor_notices'});
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export function resourceId(kind,id){if(!Object.hasOwn(RESOURCE_ZONES,kind)||typeof id!=='string'||!UUID.test(id))throw new TypeError('invalid_resource_id');return kind+':'+id.toLowerCase()}
// Vercel injects ?id=<matched-path-id> into request.url for [id].js routes.
// Only tolerate that exact duplicate router parameter; never select a resource
// from query data or allow any other query, fragment, or extra segment.
export function idFromPath(req,collection){
  if(!['notes','notices'].includes(collection)||typeof req?.url!=='string')return null;
  let url;
  try{url=new URL(req.url,'https://resource.invalid')}catch{return null}
  if(url.hash)return null;
  const m=new RegExp('^/api/'+collection+'/([0-9a-f-]{36})
export function isVerifiedInstructor(identity,user){return identity?.kind==='student'&&typeof identity.userId==='string'&&identity.userId===user?.id&&user?.app_metadata?.aleph_role==='instructor'}
export function safeContent(body){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='body,title'||typeof body.title!=='string'||!body.title.trim()||body.title.length>200||typeof body.body!=='string'||body.body.length>5000)return null;return {title:body.title.trim(),content:body.body}}
,'iu').exec(url.pathname);
  if(!m||!UUID.test(m[1]))return null;
  if(url.search){
    const entries=[...url.searchParams.entries()];
    if(entries.length!==1||entries[0][0]!=='id'||
       entries[0][1].toLowerCase()!==m[1].toLowerCase())return null;
  }
  return m[1];
}
export function isVerifiedInstructor(identity,user){return identity?.kind==='student'&&typeof identity.userId==='string'&&identity.userId===user?.id&&user?.app_metadata?.aleph_role==='instructor'}
export function safeContent(body){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='body,title'||typeof body.title!=='string'||!body.title.trim()||body.title.length>200||typeof body.body!=='string'||body.body.length>5000)return null;return {title:body.title.trim(),content:body.body}}
