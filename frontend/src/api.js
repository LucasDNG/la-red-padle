import axios from 'axios';
export const api=axios.create({baseURL:(import.meta.env.VITE_API_URL||'/api').trim()});
api.interceptors.request.use(config=>{const token=localStorage.getItem('token');if(token)config.headers.Authorization=`Bearer ${token}`;return config;});
export function user(){try{return JSON.parse(localStorage.getItem('user')||'null');}catch{return null;}}
export function session(data){localStorage.setItem('token',data.token);localStorage.setItem('user',JSON.stringify(data.user));}
export function logout(){localStorage.removeItem('token');localStorage.removeItem('user');location.href='/';}
