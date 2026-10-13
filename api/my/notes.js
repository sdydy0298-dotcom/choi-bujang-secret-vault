// Explicitly scoped personal list for the stage-8 engine zone.
// Delegates to the existing owner-filtered notes GET handler; no new DB access.
import notesHandler from '../notes.js';

export default async function handler(request,response) {
  const url=new URL(request.url??'/api/my/notes','https://resource.invalid');
  response.setHeader('Cache-Control','no-store, max-age=0');
  response.setHeader('X-Content-Type-Options','nosniff');
  if(url.pathname!=='/api/my/notes'||url.search||url.hash) {
    return response.status(404).json({error:'RESOURCE_NOT_FOUND'});
  }
  if(request.method!=='GET') {
    response.setHeader('Allow','GET');
    return response.status(405).json({error:'METHOD_NOT_ALLOWED'});
  }
  return notesHandler(request,response);
}
