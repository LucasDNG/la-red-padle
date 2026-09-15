import jwt from "jsonwebtoken";
export function sign(user){return jwt.sign({id:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:"30d"});}
export function auth(req,res,next){const h=req.headers.authorization||"";const token=h.startsWith("Bearer ")?h.slice(7):null;if(!token)return res.status(401).json({error:"No autenticado"});try{req.user=jwt.verify(token,process.env.JWT_SECRET);next();}catch{return res.status(401).json({error:"Sesión inválida"});}}
export function admin(req,res,next){if(req.user?.role!=="admin")return res.status(403).json({error:"Solo administrador"});next();}
