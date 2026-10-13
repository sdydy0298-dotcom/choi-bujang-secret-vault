// Local, minimal Supabase Auth client for stage 11.
// No third-party script fetch, no cookies, no localStorage, no IndexedDB:
// all session tokens are private to this browser page's JavaScript memory.
export function createClient(baseUrl, publicKey, fetcher=fetch) {
  const origin = new URL(baseUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password ||
      origin.search || origin.hash || !publicKey || typeof publicKey!=='string')
    throw new Error('INVALID_AUTH_CONFIGURATION');
  const authUrl=origin.origin+origin.pathname.replace(/\/+$/u,'')+'/auth/v1';
  let session=null;
  const listeners=new Set();
  function inform(event) {
    for (const listener of listeners) {
      try { listener(event,session); } catch { /* UI listener must not break auth */ }
    }
  }
  async function request(path,options={}) {
    const response=await fetcher(authUrl+path,{
      method:options.method??'POST',
      mode:'cors',
      credentials:'omit',
      cache:'no-store',
      headers:{
        apikey:publicKey,
        'Content-Type':'application/json',
        ...(options.accessToken?{Authorization:'Bearer '+options.accessToken}:{})
      },
      ...(options.body?{body:JSON.stringify(options.body)}:{})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      const message=data?.error_description??data?.msg??data?.message??
        data?.error??('HTTP '+response.status);
      return { data:null, error:new Error(String(message)) };
    }
    return { data, error:null };
  }
  const auth={
    async signInWithPassword({email,password}={}){
      if(typeof email!=='string'||typeof password!=='string'||!email||!password)
        return {data:{user:null,session:null},error:new Error('이메일과 비밀번호를 확인하세요.')};
      try {
        const result=await request('/token?grant_type=password',{body:{email,password}});
        if(result.error)return {data:{user:null,session:null},error:result.error};
        if(!result.data?.access_token||!result.data?.user?.id)
          return {data:{user:null,session:null},error:new Error('인증 응답 형식이 맞지 않습니다.')};
        session=result.data;
        inform('SIGNED_IN');
        return {data:{user:session.user,session},error:null};
      } catch {
        return {data:{user:null,session:null},error:new Error('인증 서버에 연결할 수 없습니다.')};
      }
    },
    async signOut(){
      if(!session)return {error:null};
      try{
        const result=await request('/logout?scope=global',{accessToken:session.access_token});
        if(result.error)return {error:result.error};
        session=null;
        inform('SIGNED_OUT');
        return {error:null};
      }catch{return {error:new Error('로그아웃 요청을 완료할 수 없습니다.')}}
    },
    async getSession(){return {data:{session},error:null}},
    onAuthStateChange(callback) {
      if(typeof callback!=='function')throw new TypeError('CALLBACK_REQUIRED');
      listeners.add(callback);
      return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};
    }
  };
  return {auth};
}
