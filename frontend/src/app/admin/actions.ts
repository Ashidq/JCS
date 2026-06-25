"use server";

import {revalidatePath} from "next/cache";
import {cookies} from "next/headers";
import {createServerClient} from "@supabase/ssr";

async function getSupabase(){
  const cookieStore=await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies:{
        getAll(){
          return cookieStore.getAll();
        },
        setAll(cookiesToSet){
          try{
            cookiesToSet.forEach(({name,value,options})=>{
              cookieStore.set(name,value,options);
            });
          }catch{}
        }
      }
    }
  );
}

// ================= CACHE =================

export async function clearAppCache():Promise<{success:boolean;error?:string}>{
  try{
    revalidatePath("/","layout");
    return {success:true};
  }catch(err:unknown){
    return {
      success:false,
      error:err instanceof Error?err.message:"Gagal clear cache."
    };
  }
}

// ================= MAINTENANCE =================

export async function toggleMaintenanceMode(
  status:boolean
):Promise<{success:boolean;error?:string}>{
  try{
    const supabase=await getSupabase();

    const {error}=await supabase
      .from("global_settings")
      .update({is_maintenance:status})
      .eq("id",1);

    if(error)throw error;

    return {success:true};

  }catch(err:unknown){
    return {
      success:false,
      error:err instanceof Error?err.message:"Gagal update maintenance."
    };
  }
}


// ================= SESSION =================

export interface AdminSession{
  id:number;
  user_id:string;
  email:string;
  token:string;
  user_agent:string|null;
  created_at:string;
  last_active:string;
}


// CREATE SESSION

export async function createAdminSession(data:{
  user_id:string;
  email:string;
  token:string;
  userAgent:string;
}):Promise<{success:boolean;error?:string}>{

  try{
    const supabase=await getSupabase();

    const {error}=await supabase
      .from("admin_sessions")
      .insert({
        user_id:data.user_id,
        email:data.email,
        token:data.token,
        user_agent:data.userAgent,
        last_active:new Date().toISOString()
      });

    if(error)throw error;

    return {success:true};

  }catch(err:unknown){
    return {
      success:false,
      error:err instanceof Error?err.message:"Gagal membuat session."
    };
  }
}


// GET SESSION

export async function getAdminSessions(
  email:string
):Promise<{success:boolean;data?:AdminSession[];error?:string}>{

  try{
    const supabase=await getSupabase();

    const {data,error}=await supabase
      .from("admin_sessions")
      .select(`
        id,
        user_id,
        email,
        token,
        user_agent,
        created_at,
        last_active
      `)
      .eq("email",email)
      .order("last_active",{ascending:false});


    if(error)throw error;


    return {
      success:true,
      data:(data as AdminSession[])??[]
    };


  }catch(err:unknown){

    return {
      success:false,
      error:err instanceof Error?err.message:"Gagal mengambil session."
    };

  }
}


// DELETE SESSION

export async function deleteAdminSession(
  token:string
):Promise<{success:boolean;error?:string}>{

  try{

    const supabase=await getSupabase();

    const {error}=await supabase
      .from("admin_sessions")
      .delete()
      .eq("token",token);


    if(error)throw error;


    return {success:true};


  }catch(err:unknown){

    return {
      success:false,
      error:err instanceof Error?err.message:"Gagal menghapus session."
    };

  }
}
